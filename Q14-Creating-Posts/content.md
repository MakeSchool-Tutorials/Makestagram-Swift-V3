---
title: "Improving the Upload Code and Adding a Post Class"
slug: improving-photo-upload-firebase
---

Now it's time to move from a working solution to a good one. We need to store more information along with the `Post` that we're creating. Right now we are only storing the image file, but we also need to store the `User` to which the post belongs. 

This means that we'll need to create a `Post` class.

# Creating a Post Class

> [action]
Create a new class `Post.swift`:
>
    import UIKit
    import FirebaseDatabase.FIRDataSnapshot

    class Post {
        // properties and initializers
    }

Next let's add properties to store all the additional information we need. Add the following to your post class.

    class Post {
        var key: String?
        let imageURL: String
        let imageHeight: CGFloat
        let creationDate: Date
    }
    
You'll get some compiler errors for not having an initialiers or default values for certain properties. Let's go ahead and fix that:

    init(imageURL: String, imageHeight: CGFloat) {
        self.imageURL = imageURL
        self.imageHeight = imageHeight
        self.creationDate = Date()
    }
    
Here we create an initializer that creates a new `Post` from an image URL and image height.

# Create a New Post

After successfully uploading an image to `Firebase Storage`, we want to create a new `Post` object that gets stored in the database. 

First add a new service method in `PostService` called `create(forURLString:aspectHeight:)`. We'll use this method to write a new `Post` object to our database.

    private static func create(forURLString urlString: String, aspectHeight: CGFloat) {
        // create new post in database
    }

Note that our class method is private because we don't want to allow access to this class method from anywhere except our previous `PostService.create(for:)` method. We don't to be able to create a new post in the database without a image URL and aspect height. If we're working with other developers, this helps prevent them from using this method in ways other than which we originally intended.

Next let's setup the code to create a new `Post` JSON object in our database:

> [action]
Add the following code in `create(forURLString:aspectHeight:)`:

    private static func create(forURLString urlString: String, aspectHeight: CGFloat) {
        // 1
        let currentUser = User.current
        // 2
        let post = Post(imageURL: urlString, imageHeight: aspectHeight)
        // 3
        let dict = post.dictValue

        // 4
        let postRef = FIRDatabase.database().reference().child("posts").child(currentUser.uid).childByAutoId()
        //5
        postRef.updateChildValues(dict)
    }
    
This will create a JSON object in our database. Let's break down our steps:

1. Create a reference to the current user. We'll need the user's UID to construct the location of where we'll store our post data in our database.
2. Initialize a new `Post` using the data passed in by the parameters.
3. Convert the new post object into a dictionary so that it can be written as JSON in our database. We haven't added this computed variable to our `Post` object yet so the compiler will throw an error right now.
4. Construct the relative path to the location where we want to store the new post data. Notice that we're using the current user's UID as child nodes to keep track of which `Post` belongs to which user.
5. Write the data to the specified location.

To fix the compiler error, add the following computed variable to our `Post` class. This will be convenient for turning our `Post` objects into dictionaries of type `[String : Any]`:

    var dictValue: [String : Any] {
        let createdAgo = creationDate.timeIntervalSince1970
        
        return ["image_url" : imageURL,
                "image_height" : imageHeight,
                "created_at" : createdAgo]
    }
    
# Structuring Data

<!-- tough topic, probably needs to be revised again -->

Let's take another look at the relative path for which we stored our new `Post`:

    let postRef = FIRDatabase.database().reference().child("posts").child(currentUser.uid).childByAutoId()
    
Storing and structuring your data inside of your Firebase database requires forethought on the best way to structure your JSON tree. Another possible way of structuring our data would be to make each post a child node of a user. The relative path might look like this:

    let postRef = FIRDatabase.database().reference().child("users").child(currentUser.uid).child("posts").childByAutoId()
    
In this structure, it's also easy to navigate to and find a user's post. However, now whenever we read a `User` object from Firebase, all of the child nodes will be returned with it. This means whenever we read the `User` from Firebase, all of their posts will be returned as well. Imagine if each time you wanted to fetch a user's information, thousands of their posts were returned with it. This makes reading slower and unoptimal.

To fix this, we branch `Post` into it's own node within our JSON tree and use each user's UID as a child node to group posts by UID. This allows us to quickly retrieve all of the user's information without retrieving all of their posts with it – because a user's data and their posts are stored in two separate locations. In addition, if we wanted to retrieve all of a user's posts, there's still easy way for us to navigate and read them using JSON tree structure we built.

As you create apps with Firebase and practice structuring your data, you'll generally want to keep your JSON tree as flat as possible. Many times, this will involve a similar process as we're doing here by breaking out child nodes into thier own subtrees.

# Connecting our Image Upload to Creating a New Post

To use the service method we just created, we'll need to make some modifications to hook up `create(for:)` to `create(forURLString:aspectHeight:)`. 

> [action]
Modify the `create(for:)` method to the following:

    static func create(for image: UIImage) {
        let imageRef = FIRStorage.storage().reference().child("test_image.jpg")
        StorageService.uploadImage(image, at: imageRef) { (downloadURL) in
            guard let downloadURL = downloadURL else {
                return
            }
            
            let urlString = downloadURL.absoluteString
            create(forURLString: urlString, aspectHeight: 320)
        }
    }

You'll notice here that we hardcode the aspect height of the image. The reason we want to store the aspect height is because when we render our image, we'll need to know the height of the image to display. We do this by calculating what the height of the image should be based on the maximum width and height of an iPhone. 

We'll create a new image extension that calculates the aspect height based on the size of the iPhone 7 plus. 

> [action]
Create a new file under extensions called `UIImage+Size.swift`:
>
    import UIKit
>
    extension UIImage {
        var aspectHeight: CGFloat {
            let heightRatio = size.height / 736
            let widthRatio = size.width / 414
            let aspectRatio = fmax(heightRatio, widthRatio)

            return size.height / aspectRatio
        }
    }

We added a computed property to `UIImage` that will calculate the aspect height for the instance of a `UIImage` based on the size property of an image. Now we can update our `create(for:)` method in our `PostService`:

    static func create(for image: UIImage) {
        let imageRef = FIRStorage.storage().reference().child("test_image.jpg")
        StorageService.uploadImage(image, at: imageRef) { (downloadURL) in
            guard let downloadURL = downloadURL else {
                return
            }
            
            let urlString = downloadURL.absoluteString
            let aspectHeight = image.aspectHeight
            create(forURLString: urlString, aspectHeight: aspectHeight)
        }
    }
    
Last, we'll need to create a more suitable location for our post image files to be stored. Right now, since we're storing all of our images at the same path, they're being overwritten. Let's create a new extension for `FIRStorageReference` that generates a new storage location for each user's post:

> [action]
Create a new extension file called `FIRStorageReference+Post.swift` with the following content:
>
    import Foundation
    import FirebaseStorage
>
    extension FIRStorageReference {
        static let dateFormatter = ISO8601DateFormatter()

        static func newPostImageReference() -> FIRStorageReference {
            let uid = User.current.uid
            let timestamp = dateFormatter.string(from: Date())

            return FIRStorage.storage().reference().child("images/posts/\(uid)/\(timestamp).jpg")
        }
    }

Here we create an extension to FIRStorageReference with a class method that will generate a new location for each new post image that is created by the current ISO timestamp.

We can update our code to use the new location generation:

    static func create(for image: UIImage) {
        let imageRef = FIRStorageReference.newPostImageReference()
        StorageService.uploadImage(image, at: imageRef) { (downloadURL) in
            guard let downloadURL = downloadURL else {
                return
            }
            
            let urlString = downloadURL.absoluteString
            let aspectHeight = image.aspectHeight
            create(forURLString: urlString, aspectHeight: aspectHeight)
        }
    }

# Testing our Code

Before we move on, let's test our code. First let's delete any previous images we uploaded to `Firebase Storage`:

<!-- insert image, no internet right now -->

Also make sure that our database current doesn't have any previously incomplete posts. If there are, make sure to delete them as well:

<!-- insert image of delete posts from firebase -->

As we build and add new code, our database might contain incomplete or inconsistent data. We want to make sure that we delete this previous data, otherwise it might create bugs in our production code.

Run the app and create a new `Post`. If everything is working correctly, you'll see a new `Post` object created in our database and the accompanying image stored at the correct path in `Firebase Storage`.

# Conclusion

We've improved the photo upload mechanism a lot! We've created our own custom `Post` class and added a class method in our `PostService` to create a `Post` JSON object in our database.

In our next step we'll look at reading data from our database and displaying it to our users.
