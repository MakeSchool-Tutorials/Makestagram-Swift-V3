---
title: "Setting-Followers"
slug: setting-followers
---

In the previous section, we set up the functionality for followers. However, having followers isn't useful if you can't see a timeline of your follower's posts. In this section, we'll be focused on using the followers functionality to display a timeline of posts.

As always, we'll begin by thinking about how to structure new timeline data into our existing database.

# Timeline JSON structure

We're going to build a new timeline JSON tree that contains each user's timeline. Each timeline will contain post keys, along with additional information to fetch the post from the post JSON tree.

To create this JSON structure, we'll need to implement the following:

- Whenever a user creates a new post, write the post to each of the user's follower's timelines
- Whenever a user is followed, add all of thier posts into the current user's timeline
- Whenever a user is unfollowed, remove all of thier posts from the current user's timeline

Let's get started on implementing the timeline!

# Creating our Timeline

We'll begin by focusing on the first subtask: making sure that every new post created by the current user is added to all of their follower's timelines. To do this we'll need to be able to fetch all of a user's followers.

> [action]
Open `UserService` and add the following new service method:
>
    static func followers(for user: User, completion: @escaping ([String]) -> Void) {
        let followersRef = FIRDatabase.database().reference().child("followers").child(user.uid)
>
        followersRef.observeSingleEvent(of: .value, with: { (snapshot) in
            guard let followersDict = snapshot.value as? [String : Bool] else {
                return completion([])
            }
>
            let followersKeys = Array(followersDict.keys)
            completion(followersKeys)
        })
    }

Here we grab all of the uids of the user's followers and return it as an array of uid strings. Now we can use this fetch the uid of all of our followers.

Next, navigate to our `PostService`. We'll need to change the service method `create(forURLString:aspectHeight:)`. Currently the method only writes the new post to the `post` JSON tree in our database. We'll modify it to also add the post to all of our follower's timelines.

> [action]
Change `create(forURLString:aspectHeight:)` to the following:
    
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
    
Notice the multi-location update to all of our follower's timelines. Let's go over these steps in detail:

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

# Reading the Timeline

We've now added all of the service methods for writing and creating our timeline in our database. Next, we'll need to set up a few more service methods to read the timeline from our database.

First, since we don't store the entire post object in our timeline JSON tree, we'll need to perform a *join*. This means we'll need to use the information provided by the timeline data to fetch more data from our database. In our case, we'll use the `postKey` and `poster_uid` of each timeline post object to read the corresponding post.

We'll start by create a new service method in our `PostService` that fetches a single post based on the `postKey` and `posterUID`. 

> [action]
Add the following method to your `PostService`:
>
    static func show(forKey postKey: String, posterUID: String, completion: @escaping (Post?) -> Void) {
        let ref = FIRDatabase.database().reference().child("posts").child(posterUID).child(postKey)
>
        ref.observeSingleEvent(of: .value, with: { (snapshot) in
            guard let post = Post(snapshot: snapshot) else {
                return completion(nil)
            }
>
            LikeService.isPostLiked(post) { (isLiked) in
                post.isLiked = isLiked
                completion(post)
            }
        })
    }

This method reads a single post from the database and returns the associated post. This will help us read each post from our timeline. Next we'll need to create a service method in our `UserService` for fetching the current user's timeline. 

> [action]
Open `UserService.swift` and implementing the following:
    
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
    
Using these two previous service methods, we're able to read the current user's timeline and return an array of posts. First we read the timeline, and then we join each post timeline object with the corresponding post object. Creating joins like this are very common for NoSQL databases. Let's hook up our new service method in our `HomeViewController` so we can see our timeline!

> [action]
Open `HomeViewController` and replace `viewDidLoad` with the following:

    override func viewDidLoad() {
        super.viewDidLoad()
        
        configureTableView()
        
        UserService.timeline { (posts) in
            self.posts = posts
            self.tableView.reloadData()
        }
    }

Create a few new user accounts and have them follow each other. Create a couple of new posts with each account to make sure everything works!

# Adding Refresh Controller

You'll notice that if you follow and unfollow new users or create a new post, your timeline doesn't refresh and display new changes. It only display the changes the first time the view controller loads. In this last step, we'll add `UIRefreshController` so that users can pull the refresh whenever they like.

<!-- add refresh control -->

Congratulations, you've complete the tutorial and complete a basic implementation of Instagram with Firebase!

<!-- probably need conclusion section -->

<!-- make pagination into it's own tutorial -->
