---
title: "Setting-Followers"
slug: setting-followers
---

Now we're onto building the timeline. Building the timeline is complicated because you need to think about how you want to structure your data. 


# Thinking about our JSON structure

We're going to build firebase with a different JSON structure.

<!-- insert image of json structure -->

Next, we're going to look at the steps for creating a timelime for this structure. First, whenever a user creates a post, we'll need to write the post in multiple locations, for every single follower's timeline. Also we'll need to add and remove each post from a user's timeline everytime that user follows and unfollows a user. Because of the way we've architected our code, we'll only need to change some of our service classes and most of our UI will stay exactly the same. Let's get started:

# Creating our Timeline

This first thing we'll need to do is make sure every time our use creates a post, it's added to all of our follower's timelines. Let's work on that first. Let's go to the `PostService` for our `create(forURLString:aspectHeight:)` method. Right now we take a post that we've created and write it to our database. We'll be changing this functionality to accommodate our timeline. The first thing we'll need to do fetch all of the current user's followers. We'll need to add a new method in our `UserService` to do this:

    static func followers(for user: User, completion: @escaping ([String]) -> Void) {
        let followersRef = FIRDatabase.database().reference().child("followers").child(user.uid)
        
        followersRef.observeSingleEvent(of: .value, with: { (snapshot) in
            guard let followersDict = snapshot.value as? [String : Bool] else {
                return completion([])
            }
            
            let followersKeys = Array(followersDict.keys)
            completion(followersKeys)
        })
    }
    
Here we grab all of the uids of the user's followers and return it as an array of uid strings. Now we can use this fetch the uid of all of our followers. Let's modify our `PostService` to use our new class. Right now our class method that writes our new post to the database looks like this:

    private static func create(forURLString urlString: String, aspectHeight: CGFloat) {
        let currentUser = User.current
        let post = Post(imageURL: urlString, imageHeight: aspectHeight)
        let postDict = post.dictValue

        let postRef = FIRDatabase.database().reference().child("posts").child(currentUser.uid).childByAutoId()
        postRef.updateChildValues(postDict)
    }
    
We'll change it to make a multi-location update to all of our follower's timelines:

    private static func create(forURLString urlString: String, aspectHeight: CGFloat) {
        let currentUser = User.current
        let post = Post(imageURL: urlString, imageHeight: aspectHeight)
        
        // 1
        let rootRef = FIRDatabase.database().reference()
        let newPostRef = rootRef.child("posts").child(currentUser.uid).childByAutoId()
        let newPostKey = newPostRef.key
        
        // 2
        UserService.followers(for: currentUser) { (followerUIDs) in
            // 3
            let timelinePostDict = ["poster_uid" : currentUser.uid]
            
            // 4
            var updatedData: [String : Any] = ["timeline/\(currentUser.uid)/\(newPostKey)" : timelinePostDict]
            
            // 5
            for uid in followerUIDs {
                updatedData["timeline/\(uid)/\(newPostKey)"] = timelinePostDict
            }
            
            // 6
            let postDict = post.dictValue
            updatedData["posts/\(currentUser.uid)/\(newPostKey)"] = postDict
            
            // 7
            rootRef.updateChildValues(updatedData)
        }
    }
    
Let's go over our steps in detail:

1. We create references to the important locations that we're planning to write data.
2. Use our class method to get an array of all of our follower UIDs
3. We construct a timeline JSON object where we store our current user's uid. We need to do this because when we fetch a timeline for a given user, we'll need the uid of the post in order to read the post from the `Post` subtree.
4. We create a mutable dictionary that will store all of the data we want to write to our database. We initialize it by writing the current timeline dictionary to our own timeline because our own uid will be excluded from our follower UIDs.
5. We add our post to each of our follower's timelines.
6. We make sure to write the post we are trying to create.
7. We write our multi-location update to our database.

Now, whenever the current user creates a new `Post`, it'll be written to all of our followers. The last steps we need to take to finish up are to add and remove all posts from our own timeline whenever we follow or unfollow a user.

Open our `FollowService`. We'll start by adding all posts of a user when the current user follows them:

    private static func followUser(_ user: User, forCurrentUserWithSuccess success: @escaping (Bool) -> Void) {
        let currentUID = User.current.uid
        let followData = ["followers/\(user.uid)/\(currentUID)" : true,
                          "following/\(currentUID)/\(user.uid)" : true]
        
        let ref = FIRDatabase.database().reference()
        ref.updateChildValues(followData) { (error, _) in
            if let error = error {
                assertionFailure(error.localizedDescription)
                success(false)
            }
            
            // 1
            UserService.posts(for: user) { (posts) in
                // 2
                let postKeys = posts.flatMap { $0.key }
                
                // 3
                var followData = [String : Any]()
                let timelinePostDict = ["poster_uid" : user.uid]
                postKeys.forEach { followData["timeline/\(currentUID)/\($0)"] = timelinePostDict }
                
                // 4
                ref.updateChildValues(followData, withCompletionBlock: { (error, ref) in
                    if let error = error {
                        assertionFailure(error.localizedDescription)
                    }
                    
                    // 5
                    success(error == nil)
                })
            }
        }
    }
    
Let's break this down:

1. First we get all posts for the user. We can reuse the service method that we previously used to display all of our posts. See how placing all our networking code leads to easy code reuse?
2. Next we get all of the post keys for that user's posts. This will allow us to write each post to our own timeline.
3. We build a multiple location update using a dictionary that adds each of the followee's post to our timeline.
4. We write the dictionary to our database.
5. We return success based on whether we received an error.

We'll do the same thing for unfollowing a user:

    private static func unfollowUser(_ user: User, forCurrentUserWithSuccess success: @escaping (Bool) -> Void) {
        let currentUID = User.current.uid
        // Use NSNull() object instead of nil because updateChildValues expects type [Hashable : Any]
        // http://stackoverflow.com/questions/38462074/using-updatechildvalues-to-delete-from-firebase
        let followData = ["followers/\(user.uid)/\(currentUID)" : NSNull(),
                          "following/\(currentUID)/\(user.uid)" : NSNull()]
        
        let ref = FIRDatabase.database().reference()
        ref.updateChildValues(followData) { (error, ref) in
            if let error = error {
                assertionFailure(error.localizedDescription)
                return success(false)
            }
            
            UserService.posts(for: user, completion: { (posts) in
                var unfollowData = [String : Any]()
                let postsKeys = posts.flatMap { $0.key }
                postsKeys.forEach {
                    // Use NSNull() object instead of nil because updateChildValues expects type [Hashable : Any]
                    unfollowData["timeline/\(currentUID)/\($0)"] = NSNull()
                }
                
                ref.updateChildValues(unfollowData, withCompletionBlock: { (error, ref) in
                    if let error = error {
                        assertionFailure(error.localizedDescription)
                    }
                    
                    success(error == nil)
                })
            })
        }
    }
    
Here we follow the same steps, except we write `NSNull()` to delete posts in our timeline of a followee that we're removing. See how easy that was?

# Updating the timeline

Now that we have all of the methods in our service layer working, let's replace our `HomeViewController` with the correct data. Instead of displaying our own posts, let's display our timeline. Before we do that, we'll have to make a few more service methods to display our timeline. The first will be to read the data for a single post. Navigate to our `PostService` and create the following class method:

    static func show(forKey postKey: String, posterUID: String, completion: @escaping (Post?) -> Void) {
        let ref = FIRDatabase.database().reference().child("posts").child(posterUID).child(postKey)
            
        ref.observeSingleEvent(of: .value, with: { (snapshot) in
            guard let post = Post(snapshot: snapshot) else {
                return completion(nil)
            }
            
            LikeService.isPostLiked(post) { (isLiked) in
                post.isLiked = isLiked
                completion(post)
            }
        })
    }
    
Here we'll read a single post from the database and returned the associated post. This will allow us to read each post from our timeline. Add the following to our `UserService`:

    static func timeline(completion: @escaping ([Post]) -> Void) {
        let currentUser = User.current
        
        let timelineRef = FIRDatabase.database().reference().child("timeline").child(currentUser.uid)
        timelineRef.observeSingleEvent(of: .value, with: { (snapshot) in
            guard let snapshot = snapshot.children.allObjects as? [FIRDataSnapshot]
                else { return completion([]) }
            
            let dispatchGroup = DispatchGroup()
            
            var posts = [Post]()
            
            for postSnap in snapshot {
                guard let postDict = postSnap.value as? [String : Any],
                    let posterUID = postDict["poster_uid"] as? String
                    else { continue }
                
                dispatchGroup.enter()
                
                PostService.show(forKey: postSnap.key, posterUID: posterUID) { (post) in
                    if let post = post {
                        posts.append(post)
                    }
                    
                    dispatchGroup.leave()
                }
            }
            
            dispatchGroup.notify(queue: .main, execute: {
                completion(posts.reversed())
            })
        })
    }
    
Here we grab our timeline and then join each post in our timeline with the actual post by reading each individual post from our `PostService`. You might be thinking this is suboptimal, but it's very common to do joins like this in NoSQL databases. We'll eventually clean this up by adding pagination. Let's hook up our new method to our UI and see if it works. You might have to delete all of your posts, create a few new user accounts, and have each follow each other to fully test the timeline capabilities.

You might notice, after adding followers or new photos and our timeline doesn't refresh. Also it's bad practice to grab all posts in our timeline. What if our timeline has 1 million posts in it? We'd probably crash our app by bringing all of that data into memory. In the next section we'll wrap things up with our last section: pagination and refresh our data.
