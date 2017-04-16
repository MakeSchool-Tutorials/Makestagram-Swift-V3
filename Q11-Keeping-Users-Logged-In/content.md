---
title: "Keeping Users Logged In"
slug: keeping-users-logged-in
---

When testing the previous step, you may have noticed that each time we ran the app, we were redirected back to the login screen. This makes it slow to test whenever we add new features. From a user's perspective, once they sign up or log in for an app, they don't want to have to enter thier credidentials to log in again every time they open the app.

In other words, once a user is authenticated, they should stay logged into the app until they delete the app or log out. To make this work, we'll need some sort of local persistence on the app that can tell us on app launch if the user is already logged in. A perfect job for UserDefaults.

# What is UserDefaults?

UserDefaults is an easy way to store a small amount of non-sensitive data locally on the user's phone. It should typically be used to store flags. If you're looking to persist large amounts of information, a solution like CoreData or Realm is much more suitable.

Using UserDefaults to store data is really easy. To write data, you access the UserDefaults singleton and use the provided instance methods to store various types of information like so:

    // write data
    UserDefaults.standard.set(false, forKey: Constants.UserDefaults.isFirstTimeUser)

To read information from UserDefaults:

    // read data
    let isFirstTimeUser = UserDefaults.standard.bool(forKey: Constants.UserDefaults.isFirstTimeUser)

Keep in mind that all contents of UserDefaults is deleted when an user deletes the app from their phone.

# Persisting our User

To manage whether the user is logged in, we'll be storing our current user object. In order to archive a custom class, we need to use `NSKeyedArchiver` to turn our user object into a `Data` type. In order to do so, we'll need to make sure `User` inherits from `NSObject`. Also we'll need to add `super.init()` to our initializers to make sure we're using NSObject's initializer.

    class User: NSObject {

        // ...

        init?(snapshot: FIRDataSnapshot) {
            // ...

            super.init()
        }

        init(uid: String, username: String) {
            // ...

            super.init()
        }
    }

## Implementing the NSCoding Protocol

Next we'll need to implementing the `NSCoding` protocol so the user object can properly be archived as Data. Add the following extension to the bottom of the `User.swift` file.

    extension User: NSCoding {
        func encode(with aCoder: NSCoder) {
            aCoder.encode(uid, forKey: Constants.UserDefaults.uid)
            aCoder.encode(username, forKey: Constants.UserDefaults.username)
        }
    }

You'll notice that we're using our constants files to manage stringly-typed keys. Make sure to update your constants file with the following:

    struct Constants {
        // ...

        struct UserDefaults {
            static let currentUser = "currentUser"
            static let uid = "uid"
            static let username = "username"
        }
    }

We're using the `uid` and `username` keys to store each respective property of the user object. We'll later use `currentUser` to store our current user.

If you try to build the app right now, the compiler with throw an error saying our using object doesn't conform to the `NSCoding` protocol. This is because we need to implement `init?(coder:)` in our `User` class. This allows users to be decoded from data. Add the following alongside our other initializers:

    required init?(coder aDecoder: NSCoder) {
        guard let uid = aDecoder.decodeObject(forKey: Constants.UserDefaults.uid) as? String,
            let username = aDecoder.decodeObject(forKey: Constants.UserDefaults.username) as? String
            else { return nil }
        
        self.uid = uid
        self.username = username
    }
    
Great! Now we've successfully implemented the `NSCoding` protocol. Now we can store our current user in UserDefaults.

# Storing our Current User in User Defaults

We'll create an option in our `setCurrent(_:)` method to persist the current user to `UserDefaults`. In our user class, change the class method for `setCurrent(_:)` to the following:

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
    
Let's break this down:

1. We add another parameter that takes a Bool on whether the user should be written to UserDefaults. We give this value a default value of false.
2. We check if the boolean value for `writeToUserDefaults` is true. If so, we write the user object to UserDefaults.
3. We use `NSKeyedArchiver` to turn our user object into `Data`. We needed to implement the `NSCoding` protocol and inherit from `NSObject` to use `NSKeyedArchiver`.
4. We store the data for our current user with the key for our current user in `UserDefaults`.

Great, now we can use this method to store our current user in UserDefaults. Let's go to our `LoginViewController` to make use of this method when an existing user logs in.

    UserService.show(forUID: user.uid) { (user) in
        if let user = user {
            // handle existing user
            User.setCurrent(user, writeToUserDefaults: true)

            let initialViewController = UIStoryboard.initialViewController(for: .main)
            self.view.window?.rootViewController = initialViewController
            self.view.window?.makeKeyAndVisible()
        } else {
            // handle new user
            self.performSegue(withIdentifier: Constants.Segue.toCreateUsername, sender: self)
        }
    }

Next, navigate to the `CreateUsernameViewController` and do the same:

    UserService.create(user, username: username) { (user) in
        guard let user = user else {
            // handle error
            return
        }

        User.setCurrent(user, writeToUserDefaults: true)

        let initialViewController = UIStoryboard.initialViewController(for: .main)
        self.view.window?.rootViewController = initialViewController
        self.view.window?.makeKeyAndVisible()
    }
    
Now whenever a user signs up or logs in, the user will be stored in UserDefaults.

# Keeping Users Logged In on Launch

To finish up, we need to add some logic that checks user defaults to see if data with the currentUser key exists and set the rootViewController accordingly. In our `AppDelegate` add the following code to the bottom of the file:

    extension AppDelegate {
        func configureInitialRootViewController(for window: UIWindow?) {
            let defaults = UserDefaults.standard
            let initialViewController: UIViewController

            if FIRAuth.auth()?.currentUser != nil,
                let userData = defaults.object(forKey: Constants.UserDefaults.currentUser) as? Data,
                let user = NSKeyedUnarchiver.unarchiveObject(with: userData) as? User {

                User.setCurrent(user)

                initialViewController = UIStoryboard.initialViewController(for: .main)
            } else {
                initialViewController = UIStoryboard.initialViewController(for: .login)
            }

            window?.rootViewController = initialViewController
            window?.makeKeyAndVisible()
        }
    }
    
Here we figure out which initial view controller from each respective storyboard users should use based on whether the FIRUser single exists and if we can successfully unarchive our current user from `UserDefaults`.

Now we can change our `application(_:didFinishLaunchingWithOptions:)` method to look like this:

    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplicationLaunchOptionsKey: Any]?) -> Bool {
        FIRApp.configure()
        
        configureInitialRootViewController(for: window)

        return true
    }
    
If we run the app and authenticate ourselves, we'll find that if we close the app and run it again that we're directed to the appropriate initial view controller. Try it out a few times. If want to get back to the authentication screen, simply delete the app and all the information stored in `UserDefaults` will be deleted.

<!-- next i need to do take picture, home screen, and follows -->
