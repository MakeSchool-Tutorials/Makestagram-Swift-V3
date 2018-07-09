---
title: "Firebase Router"
slug: firebase-router
---

In the base Makestagram tutorial, we built a service layer to interface between our app and Firebase. Within many of our service methods, we define relative paths to different locations our database. Let's take a look at one now:

> [action]
Open `UserService` and navigate to `posts(for:completion:)`. Look at the first line within the method, setting a constant `ref` to a `DatabaseReference`:
>
```
static func posts(for user: User, completion: @escaping ([Post]) -> Void) {
    let ref = Database.database().reference().child("posts").child(user.uid)
>
    // ...
}
```

Let's examine this line of code more closely:

```
let ref = Database.database().reference().child("posts").child(user.uid)
```

You can see here we're constructing a relative path to a location within our database:

1. `Database.database().reference()` is a single to the root node of our database JSON tree.
2. `.child("posts")` adds the relative path of the post node within the database. This node contains a JSON tree of all posts in our database, grouped by user UIDs.
3. Last, `.child(user.uid)` finds the child node an individual user's posts and gives us access to a single user's posts.

In this extension we'll look at using some of the advanced language features of Swift to make our code easier to read and reuse!

# Review of Enums

In Swift, we use enums to declare _a common type for a group of related values_. This is especially useful because our code becomes type-safe.

Let's look at an example we've already used in our Makestagram project:

```
enum StoryboardType: String {
    case main
    case login
    case findFriends

    var filename: String {
        return rawValue.capitalized
    }
}
```

In the example above, you'll see that we're able to convert the names of all our storyboards into a group of values within the `StoryboardType` enum. Instead of referring to each storyboard name by `String`, we're able to use the `filename` property on our enum.

Now that we've reviewed the basic use of enums, let's look at _associated values_.

# Enums with Associated Values

_Associated values_ allow us to attaching additional data to a specific enum case. Let's look at an example:

<!-- TODO: better example of enum with associated values -->

```
enum ExampleAssociation {
    case name(String)
    case nums(Int, Int, Int)
}
```

As you see, we've created an enum where additional info can be attached to each case. To use this enum we'd simple create a new case:

<!-- TODO: update with enum above -->

```
let exampleCase = ExampleAssociation.name("Joe")
```

Using this knowledge, let's build a enum router for different `DatabaseReference` for our service layer.

# What is a Router?

A router can mean many different things depending on the context. In our case, we'll be directing network requests to the correct database location in Firebase. We'll use our router to store an enum that will help us construct `DatabaseReference` to read or write data.

Using a router will help us keep our code modular and organized. It'll make it easier for us to create, reuse and modify as we build our service method.

## Building our Router

We'll start by creating a new extension called `DatabaseReference+Location.swift`.

> [action]
Create a new source file called `DatabaseReference+Location.swift` in the `Extensions` folder:
>
```
import Foundation
import FirebaseDatabase
>
extension DatabaseReference {
    enum MGLocation {
        // insert cases to read/write to locations in Firebase
    }
}
```

Next we'll start adding cases for each location we use in our different services. Let's begin by adding the root location of our database.

> [action]
Add the following case to `MGLocation`:
>
```
enum MGLocation {
    case root
}
```

Our root case won't need any associated values, so we don't have to worry about for this case. However, if we want to access the root location, we'll need to be able to convert the case into a `DatabaseReference`. We'll add a function within our `MGLocation` enum that returns a `DatabaseReference` for each specific case.

> [action]
Add the following function right below the root case:
>
```
enum MGLocation {
    case root
>
    func asDatabaseReference() -> DatabaseReference {
        let root = Database.database().reference()
>
        switch self {
        case .root:
            return root
        }
    }
}
```

We'll now be able to access the root location of our database with the following:

```
let rootRef = DatabaseReference.MGLocation.root.asDatabaseReference()
```

## Using Associated Values

Next, let's move on to creating another case for reading to a user's posts. To navigate the `posts` node to a given user's posts, we'll need the user's uid. We'll store this value by creating our first enum case with an associated value:

> [action]
Add the following case to `MGLocation`:
>
```
enum MGLocation {
    case root
    case posts(uid: String)
>
    // ...
}
```

Our new `posts` case can store an `String` as `uid`.

Also, we'll need to handle the new case in our `switch` statement in `asDatabaseReference()`:

```
func asDatabaseReference() -> DatabaseReference {
    let root = Database.database().reference()

    switch self {
    case .root:
        return root
    case .posts(let uid):
        return root.child("posts").child(uid)
    }
}
```

You can see how we're able to extract the associated value of the enum value and construct a new value for our `posts` case. Whenever we want to construct a `DatabaseReference` that will return all of a given user's post, we can now use the following code:

```
let uid = ...
let postsRef = DatabaseReference.MGLocation.posts(uid: uid).asDatabaseReference()
```

Last, to make our API easier to access, we'll create a static method for constructing a `DatabaseReference` given a `MGLocation` case.

> [action]
Add the follow static method right below your enum, within the `DatabaseReference` extension:
>
```
extension DatabaseReference {
    // ...
>
    static func toLocation(_ location: MGLocation) -> DatabaseReference {
        return location.asDatabaseReference()
    }
}
```

Using our new static method, we'll be able to access the location for a user's post with the following:

```
let uid = ...
let postsRef = DatabaseReference.toLocation(.posts(uid: uid))
```

Let's make a change to our `UserService` to use our new enum router.

> [action]
Open `UserService` and modify `posts(for:completion:)` to the following:
>
```
static func posts(for user: User, completion: @escaping ([Post]) -> Void) {
    let ref = DatabaseReference.toLocation(.posts(uid: user.uid))
>
    // ...
}
```

Let's go through the process one more time for another service method. This time we'll refactor the `DatabaseReference` for `PostService.show(forKey:posterUID:completion:)`.

> [action]
Open `PostService` and take a look at `show(forKey:posterUID:completion:)`:
>
```
static func show(forKey postKey: String, posterUID: String, completion: @escaping (Post?) -> Void) {
    let ref = Database.database().reference().child("posts").child(posterUID).child(postKey)
>
    // ...
}
```

Before we walk through the solution, try to challenge yourself and see if you can solve this by yourself. Feel free to look over the previous step if you get stuck.

> [challenge]
Try implementing a new case for `MGLocation` called `showPost` for for reading a single post. Use the process we used in the last example. Make sure you also handle adding the new case to `asDatabaseReference()`!

<!--  -->

> [solution]
The relative path for reading a single post contains both a `uid` and a `postKey`. We'll need to add both of these to our `showPost` case as associated values:
>
```
extension DatabaseReference {
    enum MGLocation {
        case root
        case posts(uid: String)
        case showPost(uid: String, postKey: String)
    }
}
```
>
We'll also need to update the `asDatabaseReference` to return the corresponding `DatabaseReference`:
>
```
func asDatabaseReference() -> DatabaseReference {
    let root = Database.database().reference()
>
    switch self {
    case .root:
        return root
    case .posts(let uid):
        return root.child("posts").child(uid)
    case let .showPost(uid, postKey):
        return root.child("posts").child(uid).child(postKey)
    }
}
```

# Refactoring our Services

Now that we've created our router, let's take another look at what it would look like to refactor one of our service methods using our new `MGLocation` enum.

Open `PostService`. Using our new code we can change our `show(forKey:posterUID:completion:)` to the following:

```
static func show(forKey postKey: String, posterUID: String, completion: @escaping (Post?) -> Void) {
    let ref = DatabaseReference.toLocation(.showPost(uid: posterUID, postKey: postKey))

    // ...
}
```

Notice that we now have a type-safe, reusable way to reference and construct `DatabaseReference` in our services!

Now that we've gone through the process of creating enum cases with associated values twice, and refactored our `PostService.show(forKey:posterUID:completion:)` with our new code, try implementing the remaining cases in `MGLocation` for all the remaining locations used in our services.

> [challenge]
Create cases in `MGLocation` for the remaining locations used in our services. Then refactor your service layer to construct `DatabaseReference` with your new router!

<!--  -->

> [solution]
When you're finished, your code should extension file should look closely to the following:
>
```
import Foundation
import FirebaseDatabase
>
extension DatabaseReference {
    enum MGLocation {
        case root
>
        case posts(uid: String)
        case showPost(uid: String, postKey: String)
        case newPost(currentUID: String)
>
        case users
        case showUser(uid: String)
        case timeline(uid: String)
>
        case followers(uid: String)
>
        case likes(postKey: String, currentUID: String)
        case isLiked(postKey: String)
        case likesCount(posterUID: String, postKey: String)
>
        func asDatabaseReference() -> DatabaseReference {
            let root = Database.database().reference()
>
            switch self {
            case .root:
                return root
>
            case .posts(let uid):
                return root.child("posts").child(uid)
>
            case let .showPost(uid, postKey):
                return root.child("posts").child(uid).child(postKey)
>
            case .newPost(let currentUID):
                return root.child("posts").child(currentUID).childByAutoId()
>
            case .users:
                return root.child("users")
>
            case .showUser(let uid):
                return root.child("users").child(uid)
>
            case .timeline(let uid):
                return root.child("timeline").child(uid)
>
            case .followers(let uid):
                return root.child("followers").child(uid)
>
            case let .likes(postKey, currentUID):
                return root.child("postLikes").child(postKey).child(currentUID)
>
            case .isLiked(let postKey):
                return root.child("postLikes/\(postKey)")
>
            case let .likesCount(posterUID, postKey):
                return root.child("posts").child(posterUID).child(postKey).child("likes_count")
            }
        }
    }
>
    static func toLocation(_ location: MGLocation) -> DatabaseReference {
        return location.asDatabaseReference()
    }
}
```

# Conclusion

In this extension, we learned about using `associated types` on enums to build an enum router for our Firebase database. Using our router, we're able to make APIs to easily add, reuse and modify for future locations in our database. As part of good architecture, we're able to make our code modular and reusable!

Moving forward, you can apply the same principles used with associated types to other problems you might run into with Swift!
