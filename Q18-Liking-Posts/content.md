we need to make sure our data is fanned out so we'll do the following:


Previous we setup our `HomeViewController` to fetch our own posts from the Firebase database. Now we're going to setup the functionality to like a post. The first thing we'll do is think about our JSON tree structure in our database. We're going to use denormalization to separate our post likes with the action post data.

<!-- insert image of json tree -->

In addition, we're going to store a likes count with each post to determine the number of likes for each post. That we we don't need to fetch all of the likes for a given post and count the children to display the number of likes a post has.

Following this let's setup a new `LikeService.swift` class. In this class we'll place the ability to like a post, remove a like from a post, and determine if a post is currently liked by a user. Next let's add code to create a like.

    static func create(for post: Post, success: @escaping (Bool) -> Void) {
        guard let key = post.key
            else { return }
        
        let currentUID = User.current.uid
        
        let likesRef = FIRDatabase.database().reference().child("postLikes").child(key).child(currentUID)
        likesRef.setValue(true) { (error, _) in
            if let error = error {
                assertionFailure(error.localizedDescription)
                return success(false)
            }
            
            return success(true)
        }
    }

You'll notice in this case, we're not returning a completion closure for the `Post`, only a bool of whether there was an error or not. So far we've created a `Like`, let's go ahead and add the opposite code for removing a `Like`.

    static func delete(for post: Post, success: @escaping (Bool) -> Void) {
        guard let key = post.key
            else { return }
        
        let currentUID = User.current.uid
        
        let likesRef = FIRDatabase.database().reference().child("postLikes").child(key).child(currentUID)
        likesRef.setValue(nil) { (error, _) in
            if let error = error {
                assertionFailure(error.localizedDescription)
                return success(false)
            }
            
            return success(true)
        }
    }
    
So far we've created code that will create a new Like JSON tree that will store all uids that have liked a given post. In response, a success closure will be returned indicating whether or not the closure was successful. The next thing we want to do is add the code for incrementing and decrementing a likes count for each post. This way we don't have to read all likes for a given posts to tell how many likes a post has. Let's revise our code to add that functionality.

To do this, we'll need the reference to the uid that posted each post. This is because we'll need their uid to traverse down and find the right post. We'll add this by denormalizing our data and adding our user object to each post that is posted. To start, let's add a `poster` property in our `Post` model.

    let poster: User
    
Next, we'll update our initializers to set the `poster` property on initialization:

    // MARK: - Init
    
    init?(snapshot: FIRDataSnapshot) {
        guard let dict = snapshot.value as? [String : Any],
            let imageURL = dict["image_url"] as? String,
            let imageHeight = dict["image_height"] as? CGFloat,
            let createdAgo = dict["created_at"] as? TimeInterval,
            let userDict = dict["poster"] as? [String : Any],
            let uid = userDict["uid"] as? String,
            let username = userDict["username"] as? String
            else { return nil }
        
        self.key = snapshot.key
        self.imageURL = imageURL
        self.imageHeight = imageHeight
        self.creationDate = Date(timeIntervalSince1970: createdAgo)
        self.poster = User(uid: uid, username: username)
    }

    init(imageURL: String, imageHeight: CGFloat) {
        self.imageURL = imageURL
        self.imageHeight = imageHeight
        self.creationDate = Date()
        self.poster = User.current
    }

Now whenever we read or write a `Post` to Firebase, we expect it to have a user associated with it. Now we'll update our computed variable that turns a post into a dictionary with the following:

    var dictValue: [String : Any] {
        let createdAgo = creationDate.timeIntervalSince1970
        let userDict = ["uid" : poster.uid,
                        "username" : poster.username]
        
        return ["image_url" : imageURL,
                "image_height" : imageHeight,
                "created_at" : createdAgo,
                "poster" : userDict]
    }

Now whenever we user each post, we can access the poster's uid and username as well. Next, to continue adding the increment, decrement functionality, we'll need to create new service methods in `PostService` for incrementing and decrementing a `Post`'s like count.
    
    
In your `PostService`, update the following:

    static func create(for post: Post, success: @escaping (Bool) -> Void) {
        guard let key = post.key
            else { return }
        
        let currentUID = User.current.uid
        
        let likesRef = FIRDatabase.database().reference().child("postLikes").child(key).child(currentUID)
        likesRef.setValue(true) { (error, _) in
            if let error = error {
                assertionFailure(error.localizedDescription)
                return success(false)
            }
            
            let likesCountRef = FIRDatabase.database().reference().child("posts").child(post.poster.uid).child(key).child("likes_count")
            likesCountRef.runTransactionBlock({ (mutableData) -> FIRTransactionResult in
                let currentCount = mutableData.value as? Int ?? 0
                
                mutableData.value = currentCount + 1
                
                return FIRTransactionResult.success(withValue: mutableData)
            }, andCompletionBlock: { (error, _, _) in
                if let error = error {
                    assertionFailure(error.localizedDescription)
                    success(false)
                } else {
                    success(true)
                }
            })
        }
    }
    
    static func delete(for post: Post, success: @escaping (Bool) -> Void) {
        guard let key = post.key
            else { return }
        
        let currentUID = User.current.uid
        
        let likesRef = FIRDatabase.database().reference().child("postLikes").child(key).child(currentUID)
        likesRef.setValue(nil) { (error, _) in
            if let error = error {
                assertionFailure(error.localizedDescription)
                return success(false)
            }
            
            let likesCountRef = FIRDatabase.database().reference().child("posts").child(post.poster.uid).child(key).child("likes_count")
            likesCountRef.runTransactionBlock({ (mutableData) -> FIRTransactionResult in
                let currentCount = mutableData.value as? Int ?? 0
                
                mutableData.value = currentCount - 1
                
                return FIRTransactionResult.success(withValue: mutableData)
            }, andCompletionBlock: { (error, _, _) in
                if let error = error {
                    assertionFailure(error.localizedDescription)
                    success(false)
                } else {
                    success(true)
                }
            })
        }
    }
    
The last thing we need to do is add a likes count in our `Post` class so we can store and write to this property. Add the following:

    var likesCount: Int

Update the rest of the `Post` class to add this new property.

Great, we've now connected and added the new functionality to support our likes feature. We'll need to update the UI to make it work. Add the following for your datasource in your `HomeViewController`:

    case 2:
        let cell = tableView.dequeueReusableCell(withIdentifier: "PostActionCell") as! PostActionsCell
        cell.likesCountLabel.text = "\(post.likesCount) likes"

        return cell
        
We'll also need to connect our likes button to use our service class to create and delete likes.

We need to return whether the post is already liked so we know which state the post is currently in. This will require us to re-do some of the code we've already done to factor in likes.

First, let's add an `isLiked` property to our post. This will tell us whether the current user has liked the current post:

    var isLiked = false

We'll give this a default value of `false` because initially when we first read the post from the database, we won't know the initial value. In addition, we'll make this a variable instead of a constant because we want to be able to change the state of this property later to match whether the current user has actually liked the post. Next we'll need to add a class method to our `LikeService` to tell whether a post is liked by the current user. Let's create it now:

    static func isPost(_ post: Post, likedByUser user: User, completion: @escaping (Bool) -> Void) {
        guard let postKey = post.key else {
            assertionFailure("Error: post must have key.")
            return completion(false)
        }
        
        let likesRef = FIRDatabase.database().reference().child("postLikes").child(postKey)
        likesRef.queryEqual(toValue: nil, childKey: user.uid).observeSingleEvent(of: .value, with: { (snapshot) in
            if let _ = snapshot.value as? [String : Bool] {
                completion(true)
            } else {
                completion(false)
            }
        })
    }
    
First we make sure that the post has a key. Then we create a relative path to the location of where we store the data of our uid for the current user if there is a like. Then we use a special query that checks whether anything exists at the value that we're reading from. If there is, we know that the current user has liked the post. Otherwise, we know that the user hasn't.

We'll need to update our reading from posts to check if each post returned is liked by the current user. Let's do that now:

    static func posts(for user: User, completion: @escaping ([Post]) -> Void) {
        let ref = FIRDatabase.database().reference().child("posts").child(user.uid)
        ref.observeSingleEvent(of: .value, with: { (snapshot) in
            guard let snapshot = snapshot.children.allObjects as? [FIRDataSnapshot] else {
                return completion([])
            }
            
            let dispatchGroup = DispatchGroup()
            
            let posts: [Post] =
                snapshot
                    .reversed()
                    .flatMap {
                        guard let post = Post(snapshot: $0)
                            else { return nil }
                        
                        dispatchGroup.enter()
                        
                        LikeService.isPost(post, likedByUser: User.current, completion: { (isLiked) in
                            post.isLiked = isLiked
                            
                            dispatchGroup.leave()

                        })
                        
                        return post
                    }
            

            dispatchGroup.notify(queue: .main, execute: {
                completion(posts)
            })
        })
    }

Here we rewrite our code to check whether each of our posts is liked by the current user. We use dispatch groups to wait for all of the asychronous code to return. Once all of our requests have returned, we send our posts to the completion handler on the main thread. Now each post that is returned with our `posts(for:completion:)` service method will have whether the user has liked it or not.

Now we can move on to the UI part. Let's go to our home view controller and add the following when we are configuring our cell:

    case 2:
        let cell = tableView.dequeueReusableCell(withIdentifier: "PostActionCell") as! PostActionCell
        cell.delegate = self
        cell.likeButton.isSelected = post.isLiked
        cell.likesCountLabel.text = "\(post.likesCount) likes"

        return cell

Then let's go to our storyboard to set the image of the selected button.

![Selected Like Properties](assets/selected_like_button_properties.png)

Next we'll add the logic for handling setting and removing the like. Let's create another service class in our `LikeService` to interface with liking and unliking posts:

    static func setIsLiked(_ isLiked: Bool, for post: Post, success: @escaping (Bool) -> Void) {
        if isLiked {
            create(for: post, success: success)
        } else {
            delete(for: post, success: success)
        }
    }
    
And to wrap things up, we'll need to handle the logic of when the button is pressed by the user:

    func didTapLikeButton(_ likeButton: UIButton, on cell: PostActionCell) {
        guard let indexPath = tableView.indexPath(for: cell)
            else { return }
        
        likeButton.isUserInteractionEnabled = false
        let post = posts[indexPath.section]
        
        LikeService.setIsLiked(!post.isLiked, for: post) { (success) in
            defer {
                likeButton.isUserInteractionEnabled = true
            }
            
            guard success
                else { return }
            
            post.likesCount += !post.isLiked ? 1 : -1
            post.isLiked = !post.isLiked
            
            guard let cell = self.tableView.cellForRow(at: indexPath) as? PostActionCell
                else { return }
            
            DispatchQueue.main.async {
                self.configureCell(cell, with: post)
            }

        }
    }
    
Great, we're now done with liking and unliking posts! Congrats!
