---
title: "Refactoring Stringly Typed Code"
slug: refactoring-stringly-typed-code
---

In the last sections, we successfully setup our authentication system. Now let's take a second to go back and refactor some of our code so it'll be easier to build and debug later.

# Refactoring Show User

We refactored create user to our UserService but we didn't refactor our `LoginViewController` to remove the networking logic as well. Let's go ahead and do this. We'll create a new method in our service class to read a user from the database.

    struct UserService {
        static func show(forUID uid: String, completion: @escaping (User?) -> Void) {
            let ref = FIRDatabase.database().reference().child("users").child(uid)
            ref.observeSingleEvent(of: .value, with: { (snapshot) in
                guard let user = User(snapshot: snapshot) else {
                    return completion(nil)
                }

                completion(user)
            })
        }

        // ...
    }

Now we can remove the networking code in Login View Controller like the following:

    UserService.show(forUID: user.uid) { (user) in
        if let user = user {
            // handle existing user
            User.setCurrent(user)

            let storyboard = UIStoryboard(name: "Main", bundle: .main)
            if let initialViewController = storyboard.instantiateInitialViewController() {
                self.view.window?.rootViewController = initialViewController
                self.view.window?.makeKeyAndVisible()
            }
        } else {
            // handle new user
            self.performSegue(withIdentifier: "toCreateUsername", sender: self)
        }
    }

# Stringly Typed Constants

You may have noticed, several times within our code we use strings as identifiers for storyboards, segues, dictionary keys, etc. Although it clearly works, it's bad practice to have what's referred to as "stringly-typed" code because it's very error-prone to misspelling and the compiler can't help us catch these bugs. The two most common ways to remedy this are creating static constants and/or using enums.

Let's start with the easier of the two and create a Constants.swift file. We'll put this in the Supporting subdirectory. In here, we'll create static constants that we can use throughout our code.

    import Foundation

    struct Constants {

    }

Let's add a constant to get rid of our stringly typed segue identifier in our LoginViewController. Let's add the following to our constants file:

    struct Constants {
        struct Segue {
            static let toCreateUsername = "toCreateUsername"
        }
    }

Now back in our LoginViewController file we can change the following:

    ref.observeSingleEvent(of: .value, with: { [unowned self] (snapshot) in
        if let user = User(snapshot: snapshot) {
            User.setCurrent(user)

            let storyboard = UIStoryboard(name: "Main", bundle: .main)
            if let initialViewController = storyboard.instantiateInitialViewController() {
                self.view.window?.rootViewController = initialViewController
            }
        } else {
            // 1
            self.performSegue(withIdentifier: Constants.Segue.toCreateUsername, sender: self)
        }
    })

As you can see, we've removed the string identifier for `toCreateUsername` and replaced it with a Constant. Now we can reuse in other view controllers if needed, use autocomplete and the compiler will throw an error if we make any spelling mistakes.

# Using Enums

The other method we can use is enums. Let's use enums to clean up our references initialize storyboards. First we'll create a new extension file to extend UIStoryboard. We'll name it `Storyboard+Utility.swift`. 

Inside let's extend UIStoryboard with the following enum:

    import UIKit

    extension UIStoryboard {
        enum MGType: String {
            case main
            case login

            var filename: String {
                return rawValue.capitalized
            }
        }
    }

We need to add a filename computed variable so we can create a convenience initializer that will initialize the correct storyboard based on filename. Let's now create a convenience initializer in UIStoryboard:

    extension UIStoryboard {
        // ...

        convenience init(type: MGType, bundle: Bundle? = nil) {
            self.init(name: type.filename, bundle: bundle)
        }
    }

Now whenever we want to access a storyboard we can use the following initializer:

    let loginStoryboard = UIStoryboard(type: .login)

Wait! But we can do even better. If you notice all the times we use storyboard, there's other boilerplate code that we use that we can get rid of with our extension.

Inside our extension, we can add the following:

    extension UIStoryboard {
        // ...
    
        static func initialViewController(for type: MGType) -> UIViewController {
            let storyboard = UIStoryboard(type: type)
            guard let initialViewController = storyboard.instantiateInitialViewController() else {
                fatalError("Couldn't instantiate initial view controller for \(type.filename) storyboard.")
            }

            return initialViewController
        }
    }

Now we can reduce our original code from:

    let storyboard = UIStoryboard(type: .main)
    if let initialViewController = storyboard.instantiateInitialViewController() {
        self.view.window?.rootViewController = initialViewController
        self.view.window?.makeKeyAndVisible()
    }

And change it to the following:

    let initialViewController = UIStoryboard.initialViewController(for: .main)
    self.view.window?.rootViewController = initialViewController
    self.view.window?.makeKeyAndVisible()

Not only do we no longer need to create a instance of the storyboard, we also don't need to optionally unwrap the initial view controller for our storyboard. In addition, if our storyboard doesn't have a initial view controller, our app will crash with an error message that directly points us to the problem of what we need to fix.

Let's go back through our code and change all cases where we're initializing storyboards with a string identifier to use our new initializer. Don't forget about the AppDelegate!

<!-- should we abstract away? hard to, make just explain what makeKeyAndVisible does -->
