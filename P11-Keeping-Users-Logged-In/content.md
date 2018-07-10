---
title: "Keeping Users Logged In"
slug: keeping-users-logged-in
---

When testing our code in the previous section, we were forced to re-authenticate ourselves every time we ran the app. The process of re-authenticating over and over again is tedious and makes us less likely to run our code often! We want to make it fast and easy to test new features.

From the perspective of a user who downloaded your app, it would be annoying to have to remember my email/password and type it out each time I open your app. Imagine if you had to login yourself every time you opened your favorite app?

For both reasons, once a user is authenticated into your app, we want their authentication to persist between app uses. They should stay logged in and authenticated until they delete the app or log out. To implement this functionality, we'll need to use local persistence to store some data on the user's device that tells us whether the user has previously authenticated.

Let's learn about `UserDefaults` and how it can help us do this!

# What is UserDefaults?

`UserDefaults` is a quick way to store small amounts of non-sensitive data on the user's phone. It is typically used to store flags such as whether the user has logged in.

- `UserDefaults` is **not** for storing large amounts of data on the user's device. Use _CoreData_ or _Realm_ instead.
- `UserDefaults` is **not** for storing important, sensitive information like passwords or auth tokens. Use _Keychain_ instead.

Using `UserDefaults` to store data is really easy. To write data, access the `UserDefaults` singleton and use the provided instance methods to store various types of information like so:

```
// write data
UserDefaults.standard.set(false, forKey: Constants.UserDefaults.isFirstTimeUser)
```

To read information from `UserDefaults`:

```
// read data
let isFirstTimeUser = UserDefaults.standard.bool(forKey: Constants.UserDefaults.isFirstTimeUser)
```

If a user removes your app from their phone, all content stored within `UserDefaults` will also be deleted.

# Persisting Our User

To persist authentication, we'll use `UserDefaults` to store our `User` singleton between sessions. Storing a custom class in `UserDefaults` requires a little additional setup. We'll need to use the `Codable` protocol to convert our class from type `User` to the `Data` type.

> [info]
>
`Codable` is an "automagical" protocol introduced with Swift 4. The old process of subclassing `NSObject` and implementing the `NSCoding` protocol is no longer needed. Lucky for us, `Codable` generates the encoding and decoding code for us. There are a few cases where you might want to write it yourself, read [this](https://medium.com/if-let-swift-programming/migrating-to-codable-from-nscoding-ddc2585f28a4) if you want to learn more about the edge cases and differences between the old way and this new way of doing things.

## Implementing the Codable protocol

We'll need to implement the `Codable` protocol so the user object can properly be encoded as `Data`. Add the following the `User` class definition in the `User.swift` source file:

```
class User: Codable {
   // ...
}
```

Great! Now we've successfully implemented the `Codable` protocol. Yes, it was that easy! Just nine characters! Now we can store our current user in `UserDefaults`.

# Storing Our Current User in User Defaults

We'll create an option in our `setCurrent(_:)` method to persist the current user to `UserDefaults`. In our user class, change the class method for `setCurrent(_:)` to the following:

```
// 1
static func setCurrent(_ user: User, writeToUserDefaults: Bool = false) {
    // 2
    if writeToUserDefaults {
        // 3
        if let data = try? JSONEncoder().encode(user) {
            // 4
            UserDefaults.standard.set(data, forKey: Constants.UserDefaults.currentUser)
        }
    }

    _current = user
}
```

Let's break this down:

1. We add another parameter that takes a `Bool` on whether the user should be written to `UserDefaults`. We give this value a default value of `false`.
1. We check if the boolean value for `writeToUserDefaults` is `true`. If so, we write the user object to `UserDefaults`.
1. We use `JSONEncoder` to turn our user object into `Data`. We needed to implement the `Codable` protocol to use `JSONEncoder`.
1. We store the data for our current user with the correct key in `UserDefaults`.

Great, now we can use this method to store our current user in `UserDefaults`.

## Update your constants

You'll notice that we're using our constants files to manage stringly-typed keys. This is the last time we'll bring up creating constants in this tutorial! Make sure to update your constants file with the following:

```
struct Constants {
    // ...

    struct UserDefaults {
        static let currentUser = "currentUser"
    }
}
```

Let's go to our `LoginViewController` to make use of this method when an existing user logs in.

## Update calls to User.setCurrent

> [action]
>
Open `LoginViewController` and modify the call to `User.setCurrent(user)` in `authUI(_:didSignInWith:error:)` to be `User.setCurrent(user, writeToUserDefaults: true)`.
>
Next, navigate to the `CreateUsernameViewController` and do the same in `nextButtonTapped(_:)`:

Now whenever a user signs up or logs in, the user will be stored in `UserDefaults`.

# Keeping Users Logged In on Launch

To finish up, we need to add some logic that checks `UserDefaults` for the `currentUser` key when the app first launches. If the the data exists, we'll know that the user has been previously authenticated and set the `rootViewController` accordingly.

> [action]
>
In our `AppDelegate` add the following code to the bottom of the file:
>
```
extension AppDelegate {
    func configureInitialRootViewController(for window: UIWindow?) {
        let defaults = UserDefaults.standard
        let initialViewController: UIViewController
>
        if let _ = Auth.auth().currentUser,
           let userData = defaults.object(forKey: Constants.UserDefaults.currentUser) as? Data,
           let user = try? JSONDecoder().decode(User.self, from: userData) {
            User.setCurrent(user)
            initialViewController = UIStoryboard.initialViewController(for: .main)
        } else {
            initialViewController = UIStoryboard.initialViewController(for: .login)
        }
>
        window?.rootViewController = initialViewController
        window?.makeKeyAndVisible()
    }
}
```

In our new method, we determine which storyboard's initial view controller should be set as the `rootViewController` of the window.

If the `FIRUser` singleton already exists and we unarchive data for the `currentUser` key from `UserDefaults`, we know the user has previously been authenticated on the current device. This allows us to skip the login flow.

Now we can change our `application(_:didFinishLaunchingWithOptions:)` method to look like this:

```
func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplicationLaunchOptionsKey: Any]?) -> Bool {
    FirebaseApp.configure()

    configureInitialRootViewController(for: window)

    return true
}
```

Run the app and go through the login flow. Terminate the app and run it again. You'll notice that we're now directed to the appropriate initial view controller based on whether we previously authenticated with Firebase.

Currently, we haven't implemented a way to log out, switch users, and get back to the `LoginViewController`. However, an easy hack around this is deleting the app and installing it again on your phone. Remember each user's `UserDefaults` will be cleared when the app is deleted from their phone.
