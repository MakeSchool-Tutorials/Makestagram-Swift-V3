---
title: "Managing User Accounts"
slug: managing-user-accounts
---

FirebaseAuth & FIRUser are useful for authentication and capturing basic information about our user, but it doesn't allow us to store any data outside of the fixed set of default properties it provides.

The default fields include:

1. UID (unique identifier)
2. Display Name (full name)
3. Email
4. Photo URL

What if we want to store additional data such as an username? FirebaseAuth can't help us here. We'll need to use the Firebase Realtime Database to store additional information associated with each user's account.

# Introducing the Firebase Realtime Database

The Firebase Realtime Database is a NoSQL database. We use the database to store and retrieve information in our app. Data is stored as a JSON object. You can think of the Firebase database as a JSON tree or giant dictionary. You store information at specific paths (keys) and retrieve information using the same path. 

We'll be using FirebaseAuth in combination with the database to manage user accounts. 

![JSON Tree](assets/json_tree.png)

We'll store each user's additional information under the path users/{uid}/. We'll be able to tell if a user already exists by fetching information from this path. If the user exists already, there will already be a username stored in the database. Otherwise, if the user is new, fetching information for this path will return nil. To use our database we first need to import it by adding the following line at the top of our LoginViewController.

    import UIKit
    import FirebaseAuth
    import FirebaseAuthUI
    import FirebaseDatabase

Next we'll want to check if there's any data at the path of where our user JSON object would be if it existed:

    func authUI(_ authUI: FUIAuth, didSignInWith user: FIRUser?, error: Error?) {
        if let error = error {
            print("Error signing in: \(error.localizedDescription)")
        }
        
        // 1
        guard let user = user else { return }
        
        // 2
        let ref = FIRDatabase.database().reference().child("users").child(user.uid)
        
        // 3
        ref.observeSingleEvent(of: .value, with: { (snapshot) in
            // handle user data
        })
    }
    
Let's break down the code we just added:

1. First we check that the FIRUser returned from authentication is not nil by unwrapping it. We guard this statement, because we cannot proceed further if the user is nil.
2. We construct a relative path to the reference of the user's information in our database.
3. We read from the path we created and pass a closure to handle the data (snapshot) we get back from the database.

Now we'll need to handle the user data to check that the user exists.

# Retrieving Data

When we retrieve data from Firebase, we recieve a FIRSnapshot object that contains the data we retrieved. We can now access the data through it's value property:

    let data: Any? = snapshot.value

Data will be returned as one of the following native types:

- NSDictionary
- NSArray
- NSNumber (includes booleans)
- NSString

In the case of our user that we retrieved, we'll expect the data to be returned as a dictionary. Add the following code inside the closure:

    ref.observeSingleEvent(of: .value, with: { (snapshot) in
        // 1
        if let userDict = snapshot.value as? [String : Any] {
            // 2
            print("User already exists \(userDict).")
        } else {
            // 3
            print("New user!")
        }
    })

First we check that the snapshot exists, and that it is of the expected Dictionary type. Now we can appropriately handle whether a new user signed up or an existing user logged in.

# Refactoring Users

Fetching user information as a dictionary is very error prone because it forces us to retrieve values with keys that are stringly typed. Let's refactor this by creating our first data model: User.

Create a new file called `User.swift` and add it into a Models directory.

Create the User class be inserting the following code:

    import Foundation

    class User {
    
        // MARK: - Properties

        let uid: String
        let username: String

        // MARK: - Init

        init(uid: String, username: String) {
            self.uid = uid
            self.username = username
        }
    }

Here we've created a basic user class that has two properties, a UID and username. Next we're going to create a special initializer to take a FIRSnapshot to make things easier. First let's import FIRDataSnapshot into our model:

    import FirebaseDatabase.FIRDataSnapshot

Let's add our first failable initializer. 

## What is a failable initializer?

Failable initializers allow the initialization of an object to fail. If an initializer fails, it'll return nil instead. This is useful for requiring the initialization to have key information. In our case, if a user doesn't have a UID or a username, we'll fail the initialization and return nil.

    init?(snapshot: FIRDataSnapshot) {
        guard let dict = snapshot.value as? [String : Any],
            let username = dict["username"] as? String
            else { return nil }
        
        self.uid = snapshot.key
        self.username = username
    }

Here we guard by requiring the snapshot to be casted to a dictionary and checking the dictionary contains `username` key/value. If either of these requirements fail, we return nil. Note that we also store the key property of FIRDataSnapshot which is the uid that correlates with the user being initialized.

This cleans up our code by creating a reusable initializer that we can use to create user objects from snapshots. In addtion, we no longer have to fetch information directly from snapshots using stringly typed key/value pairs. Let's go ahead and finish by refactoring our original code to use our failable initializer.

    ref.observeSingleEvent(of: .value, with: { (snapshot) in
        if let user = User(snapshot: snapshot) {
            print("Welcome back, \(user.username).")
        } else {
            print("New user!")
        }
    })
    
Great! Let's move on to implementing the logic to handle new users.
