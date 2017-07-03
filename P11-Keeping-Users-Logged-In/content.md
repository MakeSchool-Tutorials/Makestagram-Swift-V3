---
title: "Keeping Users Logged In"
slug: keeping-users-logged-in
---

When testing our code in the previous section, we were forced to reauthenticate ourselves every time we ran the app. The process of reauthenticating over and over again is tedious and makes us less likely to run our code often! We want to make it fast and easy to test new features.

From the perspective of a user who downloaded your app, it would be annoying to have to remember my email/password and type it out each time I open your app. Imagine if you had to login yourself every time you opened your favorite app?

For both reasons, once a user is authenticated into your app, we want their authentication to persist between app uses. They should stay logged in and authenticated until they delete the app or log out. To implement this functionality, we'll need to use local persistance to store some data on the user's device that tells us whether the user has previously authenticated.

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

To persist authentication, we'll use `UserDefaults` to store our `User` singleton between sessions. Storing a custom class in `UserDefaults` requires a little additional setup. We'll need to use `NSKeyedArchiver` to convert our class from type `User` to the `Data` type.

To use `NSKeyedArchiver` to archive our `User`, we'll need for:

1. `User` must be a subclass `NSObject`
1. `User` must implement the `NSCoding` protocol

## Subclassing NSObject

Add the `NSObject` superclass to your `User` class. We'll also need to add `super.init()` to our initializers to be explicit about calling init from `NSObject`.

```
import UIKit
import FirebaseDatabase.FIRDataSnapshot

class User: NSObject {

    // ...

    init?(snapshot: DataSnapshot) {
        // ...

        super.init()
    }

    init(uid: String, username: String) {
        // ...

        super.init()
    }
}
```

## Implementing the NSCoding Protocol

Next we'll need to implementing the `NSCoding` protocol so the user object can properly be encoded as `Data`. Add the following extension to the bottom of the `User.swift` source file:

```
extension User: NSCoding {
    func encode(with aCoder: NSCoder) {
        aCoder.encode(uid, forKey: Constants.UserDefaults.uid)
        aCoder.encode(username, forKey: Constants.UserDefaults.username)
    }
}
```

You'll notice that we're using our constants files to manage stringly-typed keys. This is the last time we'll bring up creating constants in this tutorial! Make sure to update your constants file with the following:

```
struct Constants {
    // ...

    struct UserDefaults {
        static let currentUser = "currentUser"
        static let uid = "uid"
        static let username = "username"
    }
}
```

We're using the `uid` and `username` keys to store each respective property of the user object. We'll later use `currentUser` to store our current user.

If you try to build the app right now, the compiler with throw an error saying our user object doesn't conform to the `NSCoding` protocol. This is because we need to implement `init?(coder:)` in our `User` class. This allows users to be decoded from data. Add the following alongside our other initializers:

```
required init?(coder aDecoder: NSCoder) {
    guard let uid = aDecoder.decodeObject(forKey: Constants.UserDefaults.uid) as? String,
        let username = aDecoder.decodeObject(forKey: Constants.UserDefaults.username) as? String
        else { return nil }

    self.uid = uid
    self.username = username

    super.init()
}
```

Great! Now we've successfully implemented the `NSCoding` protocol. Now we can store our current user in `UserDefaults`.

# Storing Our Current User in User Defaults

We'll create an option in our `setCurrent(_:)` method to persist the current user to `UserDefaults`. In our user class, change the class method for `setCurrent(_:)` to the following:

```
// 1
class func setCurrent(_ user: User, writeToUserDefaults: Bool = false) {
    // 2
    if writeToUserDefaults {
        // 3
        let data = NSKeyedArchiver.archivedData(withRootObject: user)

        // 4
        UserDefaults.standard.set(data, forKey: Constants.UserDefaults.currentUser)
    }

    _current = user
}
```

Let's break this down:

1. We add another parameter that takes a `Bool` on whether the user should be written to `UserDefaults`. We give this value a default value of `false`.
1. We check if the boolean value for `writeToUserDefaults` is `true`. If so, we write the user object to `UserDefaults`.
1. We use `NSKeyedArchiver` to turn our user object into `Data`. We needed to implement the `NSCoding` protocol and inherit from `NSObject` to use `NSKeyedArchiver`.
1. We store the data for our current user with the correct key in `UserDefaults`.

Great, now we can use this method to store our current user in `UserDefaults`. Let's go to our `LoginViewController` to make use of this method when an existing user logs in.

> [action]
Open `LoginViewController` and modify `authUI(_:didSignInWith:error:)` to the following:
>
```
func authUI(_ authUI: FUIAuth, didSignInWith user: FIRUser?, error: Error?) {
    // ...
>
    UserService.show(forUID: user.uid) { (user) in
        if let user = user {
            // handle existing user
            User.setCurrent(user, writeToUserDefaults: true)
>
            let initialViewController = UIStoryboard.initialViewController(for: .main)
            self.view.window?.rootViewController = initialViewController
            self.view.window?.makeKeyAndVisible()
        } else {
            // handle new user
            self.performSegue(withIdentifier: Constants.Segue.toCreateUsername, sender: self)
        }
    }
}
```
>
Next, navigate to the `CreateUsernameViewController` and do the same in `nextButtonTapped(_:)`:
>
```
@IBAction func nextButtonTapped(_ sender: UIButton) {
    // ...
>
    UserService.create(firUser, username: username) { (user) in
        guard let user = user else {
            // handle error
            return
        }
>
        User.setCurrent(user, writeToUserDefaults: true)
>
        let initialViewController = UIStoryboard.initialViewController(for: .main)
        self.view.window?.rootViewController = initialViewController
        self.view.window?.makeKeyAndVisible()
    }
}
```

Now whenever a user signs up or logs in, the user will be stored in `UserDefaults`.

# Keeping Users Logged In on Launch

To finish up, we need to add some logic that checks `UserDefaults` for the `currentUser` key when the app first launches. If the the data exists, we'll know that the user has been previously authenticated and set the rootViewController accordingly.

> [action]
In our `AppDelegate` add the following code to the bottom of the file:
>
```
extension AppDelegate {
    func configureInitialRootViewController(for window: UIWindow?) {
        let defaults = UserDefaults.standard
        let initialViewController: UIViewController
>
        if Auth.auth().currentUser != nil,
            let userData = defaults.object(forKey: Constants.UserDefaults.currentUser) as? Data,
            let user = NSKeyedUnarchiver.unarchiveObject(with: userData) as? User {
>
            User.setCurrent(user)
>
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
