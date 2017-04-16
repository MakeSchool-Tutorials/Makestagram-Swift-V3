---
title: "Uploading Photos to Firebase"
slug: uploading-photos-to-firebase
---

Up until now, we have interacted mainly with FirebaseAuth and the Firebase Realtime Database. Moving forward, we'll take our first look at Firebase Storage which is built on Google's cloud storage platform. Both Snapchat and Spotify use the same technologies in production. In this step you will learn how to store media using Firebase. Later on, you'll also learn how to retrieve and download your media.

In this step we will write the code that uploads our photo to Firebase!

# Writing Information to Firebase

Which steps are involved in writing media to Firebase? In most cases, it is a three step process. Here's the simplest example from the Firebase Storage docs:

    // Media Data in memory
    let data = Data()

    // Create a reference to the file you want to upload
    let riversRef = storageRef.child("images/rivers.jpg")

    // Upload the file to the path "images/rivers.jpg"
    let uploadTask = riversRef.put(data, metadata: nil) { (metadata, error) in
      guard let metadata = metadata else {
        // Uh-oh, an error occurred!
        return
      }
      // Metadata contains file metadata such as size, content-type, and download URL.
      let downloadURL = metadata.downloadURL
    }

The three steps in this code snippet are:

1. First we need to convert our media to type `Data`
2. We need to create a relative path for where we're going to store our media and what we'll name the data
3. Last we upload it to the specified location

After the last step completes, your data is stored in Firebase's cloud storage. If you go to your Firebase project overview and click on the Storage tab, you can see all your folders and media stored in Firebase.

#Adding the Upload Code

Why is our use case a little bit more complicated than the one shown above? Primarily because not only do we want to upload an image, but we also want to create an instance of a `Post` class.

Instead of storing the image data itself with our `Post`, we'll be storing the image URL to download the image. To do this, we'll first need to create some methods to help us upload our image to Firebase. Let's create a service layer as an interface between our app and Firebase Storage. Create a new file called `StorageService.swift` in the `Services` folder.

    import UIKit
    import FirebaseStorage

    struct StorageService {
        // provide methods for uploading images
    }

Next we'll create a class method that will help us upload images to Firebase Storage. Add the following code in `StorageService.swift`:

    static func uploadImage(_ image: UIImage, at reference: FIRStorageReference, completion: @escaping (URL?) -> Void) {
        // 1
        guard let imageData = UIImageJPEGRepresentation(image, 0.1) else {
            return completion(nil)
        }
        
        // 2
        reference.put(imageData, metadata: nil, completion: { (metadata, error) in
            // 3
            if let error = error {
                assertionFailure(error.localizedDescription)
                return completion(nil)
            }
            
            // 4
            completion(metadata?.downloadURL())
        })
    }

Let's break down the code:

1. First we change the image from an `UIImage` to `Data` and reduce the quality of the image. If we can't convert the image into `Data`, we return nil to the completion callback to signal something went wrong.
2. We upload our media data to the path provided as a parameter to the method.
3. After the upload completes, we check if there was an error. If there is an error, we return nil to our completion closure to signal there was an error. Our `assertFailure` will crash the app and print the error when we're running in debug mode.
4. If everything was successful, we return the download URL for the image.

## Creating a Post

We want to create a post whenever we upload a new image. Let's first start by create a `PostService.swift` file to keep our code clean. Add the follow to your `PostService.swift` file:

    import UIKit
    import FirebaseStorage

    struct PostService {

    }

Next let's create a class method for creating a `Post` from an image. 

    static func create(for image: UIImage) {
        let imageRef = FIRStorage.storage().reference().child("test_image.jpg")
        StorageService.uploadImage(image, at: imageRef) { (downloadURL) in
            guard let downloadURL = downloadURL else {
                return
            }
            
            let urlString = downloadURL.absoluteString
            print("image url: \(urlString)")
        }
    }

Last, to tie things together, let's use our new class method in our `PostService` in our `MainTabBarController`.

    photoHelper.completionHandler = { image in
        PostService.create(for: image)
    }

##Testing the Uploading Code

Now it's time to test our solution! Run the app and select an image. 

Let's see if our upload actually worked as expected.

The best way to do that is to go to our Firebase project and navigate to the storage tab. If everything went right, we should see the `test_image.jpg`. This page will give us a nice overview of all the objects that are created on our server.

To be 100% sure that everything worked correctly, you can double-click onto the file column, and Firebase will download the image that you have uploaded from the simulator.

#Conclusion

**Congratulations!** This means you have successfully uploaded data to Firebase! This is an important step towards building **Makestagram**.

Right now we are only uploading the image file, however we'll need to create a representation in of our new `PostService` in our database so we can store other information such as the user.

In the next step we will move from this very simple upload code to a more mature solution.
