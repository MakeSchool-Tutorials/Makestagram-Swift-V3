---
title: "Building the Timeline"
slug: building-the-timeline
---

Following other users isn't very useful if you can't interact with them or see their content. In this section, we'll work on using the previous following functionality we implemented to display a timeline of posts.

Similar to the previous two sections, this will require us to store new data in our database. We'll start by thinking about how to structure our new timeline data into our existing JSON tree.

# Structuring Timeline Data

In our database, we'll be adding a new node at the root level for storing each user's timeline. Within each timeline, we'll store a reference to each post in a user's timeline.

Our new database JSON tree structure will look like:

```
makestagram-b3260 : {
    timeline: {
        user1_uid: {
            post1_key: {
                poster_uid: user2_uid
            },
            post2_key: {
                poster_uid: user2_uid
            },
            post3_key: {
                poster_uid: user1_uid
            }
        },
        user2_uid: { ... }
    },
    followers: { ... },
    following: { ... },
    postLikes: { ... },
    posts: { ... },
    users: { ... }
}
```

Here we've added a new `timeline` node that contains each user's timeline. Within each user timeline, there are post keys of all posts within their timeline as well as the poster's uid.

Similar to how we implemented our likes functionality, we'll need the poster's uid to read each post from the `posts` node when we construct the timeline.

You might be wondering why we didn't use denormalization and store multiple copies of the post within each timeline. That's because each post has a `like_count` which we wouldn't be able to use transaction operations to update if they were in multiple locations.

To implement our new `timeline` node, we'll need to do the following:

- Whenever a user creates a new post, write the post to each of the user's follower's timelines
- Whenever a user is followed, add all of thier posts into the current user's timeline
- Whenever a user is unfollowed, remove all of thier posts from the current user's timeline

Let's get started on implementing the timeline!

# Writing Posts to Timelines

Let's start implementing our first subtask:

- Whenever a user creates a new post, write the post to each of the user's follower's timelines

To do this we'll need to add a new service that will fetch all of a user's followers.

> [action]
Open `UserService` and add the following new service method:
>
```
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

In the service method above, we fetch the UIDs of all of a given user's followers and return them as an `String` array. We'll use this for constructing a batch update to multiple user's timelines when posting a new post.

Next, we'll need to modify our logic when creating a new post. The new logic will need to add the post JSON object into all followers (including our own) timelines.

> [action]
Open `PostService` and modify `create(forURLString:aspectHeight:)` with the following logic:
>
```
private static func create(forURLString urlString: String, aspectHeight: CGFloat) {
    let currentUser = User.current
    let post = Post(imageURL: urlString, imageHeight: aspectHeight)
>
    // 1
    let rootRef = FIRDatabase.database().reference()
    let newPostRef = rootRef.child("posts").child(currentUser.uid).childByAutoId()
    let newPostKey = newPostRef.key
>
    // 2
    UserService.followers(for: currentUser) { (followerUIDs) in
        // 3
        let timelinePostDict = ["poster_uid" : currentUser.uid]
>
        // 4
        var updatedData: [String : Any] = ["timeline/\(currentUser.uid)/\(newPostKey)" : timelinePostDict]
>
        // 5
        for uid in followerUIDs {
            updatedData["timeline/\(uid)/\(newPostKey)"] = timelinePostDict
        }
>
        // 6
        let postDict = post.dictValue
        updatedData["posts/\(currentUser.uid)/\(newPostKey)"] = postDict
>
        // 7
        rootRef.updateChildValues(updatedData)
    }
}
```

Notice the multi-location update to all of our follower's timelines. Let's go over these steps in detail:

1. We create references to the important locations that we're planning to write data.
1. Use our class method to get an array of all of our follower UIDs
1. We construct a timeline JSON object where we store our current user's uid. We need to do this because when we fetch a timeline for a given user, we'll need the uid of the post in order to read the post from the `Post` subtree.
1. We create a mutable dictionary that will store all of the data we want to write to our database. We initialize it by writing the current timeline dictionary to our own timeline because our own uid will be excluded from our follower UIDs.
1. We add our post to each of our follower's timelines.
1. We make sure to write the post we are trying to create.
1. We write our multi-location update to our database.

We've now implemented the first subtask for our timeline. Whenever the current user creates a new `Post`, it'll be written to all of our followers. Let's implementing our timeline by finishing the final two subtasks:

- Whenever a user is followed, add all of thier posts into the current user's timeline
- Whenever a user is unfollowed, remove all of thier posts from the current user's timeline

You'll notice both subtasks are closely related in functionality.

# Following / Unfollowing a User

Let's take care of the new logic when following a user.

> [action]
Open `FollowService` and modify `followUser(_:forCurrentUserWithSuccess:)`:
>
```
private static func followUser(_ user: User, forCurrentUserWithSuccess success: @escaping (Bool) -> Void) {
    let currentUID = User.current.uid
    let followData = ["followers/\(user.uid)/\(currentUID)" : true,
                      "following/\(currentUID)/\(user.uid)" : true]
>
    let ref = FIRDatabase.database().reference()
    ref.updateChildValues(followData) { (error, _) in
        if let error = error {
            assertionFailure(error.localizedDescription)
            success(false)
        }
>
        // 1
        UserService.posts(for: user) { (posts) in
            // 2
            let postKeys = posts.flatMap { $0.key }
>
            // 3
            var followData = [String : Any]()
            let timelinePostDict = ["poster_uid" : user.uid]
            postKeys.forEach { followData["timeline/\(currentUID)/\($0)"] = timelinePostDict }
>
            // 4
            ref.updateChildValues(followData, withCompletionBlock: { (error, ref) in
                if let error = error {
                    assertionFailure(error.localizedDescription)
                }
>
                // 5
                success(error == nil)
            })
        }
    }
}
```

Let's break this down:

1. First we get all posts for the user. We can reuse the service method that we previously used to display all of our posts. See how placing all our networking code leads to easy code reuse?
1. Next we get all of the post keys for that user's posts. This will allow us to write each post to our own timeline.
1. We build a multiple location update using a dictionary that adds each of the followee's post to our timeline.
1. We write the dictionary to our database.
1. We return success based on whether we received an error.

> [challenge]
We've implemented the logic to handle following a new user. Can you implement the logic for unfollowing a user?

<!--  -->

> [solution]
Check your solution for unfollowing a user and removing their posts from our timeline:
>
```
private static func unfollowUser(_ user: User, forCurrentUserWithSuccess success: @escaping (Bool) -> Void) {
    let currentUID = User.current.uid
    // Use NSNull() object instead of nil because updateChildValues expects type [Hashable : Any]
    // http://stackoverflow.com/questions/38462074/using-updatechildvalues-to-delete-from-firebase
    let followData = ["followers/\(user.uid)/\(currentUID)" : NSNull(),
                      "following/\(currentUID)/\(user.uid)" : NSNull()]
>
    let ref = FIRDatabase.database().reference()
    ref.updateChildValues(followData) { (error, ref) in
        if let error = error {
            assertionFailure(error.localizedDescription)
            return success(false)
        }
>
        UserService.posts(for: user, completion: { (posts) in
            var unfollowData = [String : Any]()
            let postsKeys = posts.flatMap { $0.key }
            postsKeys.forEach {
                // Use NSNull() object instead of nil because updateChildValues expects type [Hashable : Any]
                unfollowData["timeline/\(currentUID)/\($0)"] = NSNull()
            }
>
            ref.updateChildValues(unfollowData, withCompletionBlock: { (error, ref) in
                if let error = error {
                    assertionFailure(error.localizedDescription)
                }
>
                success(error == nil)
            })
        })
    }
}
```
>
Here we follow the same steps, except we write `NSNull()` to delete posts in our timeline of a followee that we're removing.

# Reading Timeline Data

We've added some new logic to various service methods for constructing each user's timeline whenever:

- a user makes a new post
- a user follows a user
- a user unfollows a user

Last, we'll need to add a method for reading a user's timeline data from the database. To read and construct a user's timeline, we'll need to perform a _join_. A _join_ takes two different nodes that are connected by an identifier and joins them together. In our case, we don't store the entire post JSON object in our `timeline` node, only the post key and poster's uid.

We'll need to use these two component and perform a _join_ to construct our current user's timeline. To start, we'll need to create a new service method to fetch a individual post using a `postKey` and `posterUID`. Can you see where this is going?

> [challenge]
By now, you should be familiar with reading data from Firebase. Try constructing a new service method in `PostService` that will return a single post object from Firebase given `postKey` and `posterUID` as arguments.

<!--  -->

> [solution]
Your new `PostService` class method should look like:
>
```
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
```

Our new service method will help us construct an array of `Post` from our timeline. Next we'll need to create another service method in `UserService` for reading the current user's timeline data.

> [action]
Open `UserService.swift` and implementing the following:
>
```
static func timeline(completion: @escaping ([Post]) -> Void) {
    let currentUser = User.current
>
    let timelineRef = FIRDatabase.database().reference().child("timeline").child(currentUser.uid)
    timelineRef.observeSingleEvent(of: .value, with: { (snapshot) in
        guard let snapshot = snapshot.children.allObjects as? [FIRDataSnapshot]
            else { return completion([]) }
>
        let dispatchGroup = DispatchGroup()
>
        var posts = [Post]()
>
        for postSnap in snapshot {
            guard let postDict = postSnap.value as? [String : Any],
                let posterUID = postDict["poster_uid"] as? String
                else { continue }
>
            dispatchGroup.enter()
>
            PostService.show(forKey: postSnap.key, posterUID: posterUID) { (post) in
                if let post = post {
                    posts.append(post)
                }
>
                dispatchGroup.leave()
            }
        }
>
        dispatchGroup.notify(queue: .main, execute: {
            completion(posts.reversed())
        })
    })
}
```

The previous two service methods we implemented will allow user to read the current user's timeline and return an array of posts. We use our `UserService.timeline(completion:)` service method to read the `postKey` and `poster_uid` of each post in the current user's timeline. Next, we use `PostService.show(forKey:posterUID:completion:)` to fetch the individual data for each post.

_Joins_ like this are common in NoSQL databases, but come at the cost of performance. Usually it's best to use strategies like _denormalization_ to avoid having to _join_ relationships between objects. If possible, we'll want to duplicate data to increase read perfomance instead of making multiple requests and performing _joins_.

## Changing the HomeViewController Data Source

Let's use our new timeline service method to display our timeline!
> [action]
Open `HomeViewController` and replace `viewDidLoad` with the following:
>
```
override func viewDidLoad() {
    super.viewDidLoad()
>
    configureTableView()
>
    UserService.timeline { (posts) in
        self.posts = posts
        self.tableView.reloadData()
    }
}
```

Take this time to test your new timeline! Create a few different user accounts and add posts from each user. Have different users follow each other and make sure your timeline works!

# Adding Refresh Control

After testing, you might notice something annoying. Each time you follow / unfollow new users or create a new post, your timeline doesn't refresh and display new changes. It only display the changes the first time the view controller loads. In this last step, we'll add `UIRefreshControl` so that users can pull the refresh whenever they like.

`UIRefreshControl` is a premade UI component in UIKit that adds an activity indicator that is used to allow users to pull down on a table view and refresh their data. We'll implement this component to allow users to reload their timelines.

> [action]
Open `HomeViewController` and add the following property:
>
```
let refreshControl = UIRefreshControl()
```

Next, we'll need to set up method that reloads our timeline.

> [action]
Modify `HomeViewController` and `viewDidLoad` to the following:
>
```
override func viewDidLoad() {
    super.viewDidLoad()
>
    configureTableView()
    reloadTimeline()
}
>
func reloadTimeline() {
    UserService.timeline { (posts) in
        self.posts = posts
>
        if self.refreshControl.isRefreshing {
            self.refreshControl.endRefreshing()
        }
>
        self.tableView.reloadData()
    }
}
```

Here we create a new method to `reloadTimeline` to retrieve our timeline and refresh the table view. You'll notice the method also checks if the `refreshControl` is refreshing. This will stop and hide the acitivity indicator of the refresh control if it is currently being displayed to the user.

For everything to work together, we'll need to add our refresh control to our table view.

> [action]
Add the following code to `configureTableView`:
>
```
func configureTableView() {
    // ...
>
    // add pull to refresh
    refreshControl.addTarget(self, action: #selector(reloadTimeline), for: .valueChanged)
    tableView.addSubview(refreshControl)
}
```

Run the app and test out our new refresh control. Add a new post pull to refresh to see your new content!

Congratulations, you've complete the tutorial and complete a basic implementation of Instagram with Firebase!

# Conclusion

In this section, you learned two important concepts:

1. First, we implemented a timeline service method to display posts of users we've followed
1. We've have also used to implement a `UIRefreshControl`. This component is extremely useful for displaying a loading indicator when the table view is reloading data and letting the user refresh data on their own

If you decided to build other apps that contain timelines, both of these concepts will be very useful.

In the next step we will take a little step back and review all the things you have learned through this tutorial so far.
