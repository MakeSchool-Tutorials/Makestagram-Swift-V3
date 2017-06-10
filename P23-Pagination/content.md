---
title: "Handling Pagination"
slug: handling-pagination
---

In this extension, we'll take another look at generics and how they can condense our code and make it more reusable. First we'll introduce generics and look at a simple real world use case.

Then, we'll explore a more complex use case by using generics to build a pagination helper for our timeline. Generics will allow us to reuse this helper for paginating data in Firebase.

# Review of Generics

Generics allow us to write reusable code that can work with any type that conforms to the requirements that you define.

Let's take a look:
```
func genericFunction<T>(x: T) -> T {
    return x
}
```

Above, is an example of a generic function. Notice that the type of our parameter `x` and return type are both of type `T`. When calling this function, `T` can be of type `Int`, `String`, `[Double]`, and so on.

Let's look at how to call our generic function:
```
let num = 4
let newNum = genericFunction(x: num)
```

In the code above, we pass a `Int` to our generic function. The compiler can than evaluate and determine that `T` of our generic function will also be of type `Int`.

We could also pass a `String`. Our generic function would just as easily know that `T` is of type `String`.

Starting out, it's might be hard to think of good use cases for generics. However, generics are especially powerful and allow us to write highly reusable, type-safe code.

# A Basic Use Case

A lot of table view data source code can be described as boilerplate code that is reused over and over again. In particular, in `tableView(_:cellForRowAt:)`, you'll notice that your code often contains explicit unwraps as you cast various custom `UITableViewCell`.

Although this is functional, there's a better solution that will allow us to get rid of extra boilerplate code, enforce type-safety and even get rid of the stringly-typed identifiers for each cell!

Let's review a current example in Makestagram.

> [action]
Open `HomeViewController` and find `tableView(_:cellForRowAt:)`:
>
```
func tableView(_ tableView: UITableView, cellForRowAt indexPath: IndexPath) -> UITableViewCell {
    let post = posts[indexPath.section]
>
    switch indexPath.row {
    case 0:
        let cell = tableView.dequeueReusableCell(withIdentifier: "PostHeaderCell") as! PostHeaderCell
        cell.usernameLabel.text = User.current.username
>
        return cell
>
    case 1:
        let cell = tableView.dequeueReusableCell(withIdentifier: "PostImageCell") as! PostImageCell
        let imageURL = URL(string: post.imageURL)
        cell.postImageView.kf.setImage(with: imageURL)
>
        return cell
>
    case 2:
        let cell = tableView.dequeueReusableCell(withIdentifier: "PostActionCell") as! PostActionCell
        cell.delegate = self
        configureCell(cell, with: post)
>
        return cell
>
    default:
        fatalError("Error: unexpected indexPath.")
    }
}
```

Notice the following:

- we use stringly-typed identifiers to identify our cells
- we force cast each table view

Both are signs of code-smell and make our development prone to errors. Let's look at how we can create a better solution for this code using generics!

> [action]
Create a new source file in your extensions folder named `UITableView+Utility.swift`:
>
```
import UIKit
>
extension UITableView {
    // ...
}
```

We'll start by creating a new protocol that allows us to convert a custom `UITableViewCell` into it's identifier:

> [action]
Add the follow protocol above your `UITableView` extension:
>
```
protocol CellIdentifiable {
    static var cellIdentifier: String { get }
}
>
extension UITableView {...}
```

This protocol defines a `cellIdentifier` property that will return the cell identifier of each cell. We'll create a protocol extension to implement a default value for each `UITableViewCell`.

> [action]
Add the follow extensions to `CellIdentifiable` and `UITableViewCell` respectively:
>
```
protocol CellIdentifiable {...}
>
// 1
extension CellIdentifiable where Self: UITableViewCell {
    // 2
    static var cellIdentifier: String {
        return String(describing: self)
    }
}
>
// 3
extension UITableViewCell: CellIdentifiable { }
>
extension UITableView {...}
```

Let's break down the code above:

1. We create an extension on our protocol `CellIdentifiable`. In our extension, we can define default values for our protocol properties and functions.
2. We define a default value for `cellIdentifier`. We return the name of the custom `UITableViewCell` class as a string using `String(describing:)`. This prevents us from making typos when typing out the cell identifier as a `String`.
3. We make sure that `UITableViewCell` implements the `CellIdentifiable` protocol. This will allow us to define constraints on our generic that we'll learn about next.

Now that we've set up some code, we'll write the generic code the replaces the following line of code in `tableView(_:cellForRowAt:)`:

```
let cell = tableView.dequeueReusableCell(withIdentifier: "PostHeaderCell") as! PostHeaderCell
```

> [action]
Add the following code within the `UITableView` extension:
>
```
protocol CellIdentifiable {...}
extension CellIdentifiable where Self: UITableViewCell {...}
extension UITableViewCell: CellIdentifiable { }
>
extension UITableView {
    // 1
    func dequeueReusableCell<T: UITableViewCell>() -> T where T: CellIdentifiable {
        // 2
        guard let cell = dequeueReusableCell(withIdentifier: T.cellIdentifier) as? T else {
            // 3
            fatalError("Error dequeuing cell for identifier \(T.cellIdentifier)")
        }
>
        return cell
    }
}
```

1. We define a generic function that extensions `UITableView`. Notice that we can add constraints to our generic type. In our function declaration we specific that `T` must be of type `UITableViewCell` and conform to `CellIdentifiable`. This allows us to guarentee that we can access the `cellIdentifier` that we added with our `CellIdentifiable` protocol.
2. We unwrap the custom `UITableViewCell` based on it's `cellIdentifier` and make sure the type conforms to `T`. In this line, we remove the need to type out the cell identifier as a `String` and force casting the type explicitly.
3. If the identifier or casting fails, we crash the app but print a nice error message so we'll know which cell caused the issue.

Let's look at what this would look like in practice.

> [action]
Open `HomeViewController` and modify `tableView(_:cellForRowAt:)` to the following:
>
```
// ...
>
case 0:
    let cell: PostHeaderCell = tableView.dequeueReusableCell()
    cell.usernameLabel.text = post.poster.username
>
    return cell
>
case 1:
    let cell: PostImageCell = tableView.dequeueReusableCell()
    let imageURL = URL(string: post.imageURL)
    cell.postImageView.kf.setImage(with: imageURL)
>
    return cell
>
case 2:
    let cell: PostActionCell = tableView.dequeueReusableCell()
    cell.delegate = self
    configureCell(cell, with: post)
>
    return cell
>
// ...
```

See how generics get rid of the problems we were facing earlier? No longer do we need to type out the cell identifier as a `String` or force unwrap each custom `UITableViewCell`. However, we do need to define the type of each cell when we dequeue it:

```
let cell: PostActionCell = tableView.dequeueReusableCell()
```

This is because our generic function `dequeueReusableCell()` uses the return type to figure out what type `T` should be. Since we don't have any parameters where the compiler can infer the type of `T`, we need to explicitly set the type we expect it to be to help the compiler out.

Next we'll look at a more complex use of generics to help us paginate our timeline!

# Handling Pagination with Generics

Currently on our `HomeViewController`, we're fetching all posts in our timeline in a single request and displaying it once we have the data. This can be terrible for performance. Imagine what would happen if your timeline had hundreds of millions of posts? Not only would it take a long time for the data to return from Firebase, but your app might crash because your phone can't hold all of that data in memory.

To fix this, we'll use a common solution called _pagination_, or breaking our timeline into chunks of data. Each chunk of data will only contain 3 posts and will be refered to as a _page_.

So page 1, will be the first 3 most recent posts in our timeline. Page 2 will be the next 3 most recent after page 1, etc.

Now, instead of fetching our entire timeline at a single time, we'll make multiple requests as we need to display the data. As we start building, you'll get a better idea of how pagination works!

## Generic Types

Functions aren't the only thing that can be generic in Swift. Classes, structs and enums can also be generic. We'll need to use this information to create a pagination helper.

> [action]
Create a new source file in `Helpers` called `MGPaginationHelper.swift`:
>
```
class MGPaginationHelper<T> {
    // ...
}
```

Notice in the type, we define a generic `T`. A new instance of `MGPaginationHelper` can be created like such:

```
let paginationHelper = MGPaginationHelper<Post>()
```

Next, we'll add an enum within our `MGPaginationHelper` to handle the pagination state. We'll have 4 states for our helper:

1. initial - no data has been loaded yet
2. ready - ready and waiting for next request to paginate and load the next page
3. loading - currently paginating and waiting for data from Firebase
4. end - all data has been paginated

> [action]
Add the following enum within your `MGPaginationHelper`:
>
```
class MGPaginationHelper<T> {
    enum MGPaginationState {
        case initial
        case ready
        case loading
        case end
    }
}
```

We'll be using this enum later to manage behavior for our helper in each state.

Next, we'll add some new properties and an initializer to our helper.

> [action]
Open `MGPaginationHelper` and add the following properties and init method below the `MGPaginationState` enum:
>
```
// MARK: - Properties
>
let pageSize: UInt
let serviceMethod: (UInt, String?, @escaping (([T]) -> Void)) -> Void
var state: MGPaginationState = .initial
var lastObjectKey: String?
>
// MARK: - Init
>
init(pageSize: UInt = 3, serviceMethod: @escaping (UInt, String?, @escaping (([T]) -> Void)) -> Void) {
    self.pageSize = pageSize
    self.serviceMethod = serviceMethod
}
```

Let's walk through each property we added to our helper:

1. `pageSize` - Determines the number of posts that will be on each page.
2. `serviceMethod` - The service method that will return paginated data.
3. `state` - The current pagination state of the helper.
4. `lastObjectKey` - Firebase uses object keys to determine the last position of the page. We'll need to use this as an offset for paginating.

In addition, we add a initializer. Our initializer allows for two things:

- we can change the default page size for our helper
- we set the service method that will be paginated and return data

Notice the parameters of our serviceMethod. We use the generic type `T` to guarantee that objects of the same type will be returned from the service method.

## Implementing Pagination

Now, we'll move onto the logic of implementing pagination. To do this, we'll create a new instance method that paginates our content.

> [action]
Add the following code under your initializer:
>
```
// 1
func paginate(completion: @escaping ([T]) -> Void) {
    // 2
    switch state {
    // 3
    case .initial:
        lastObjectKey = nil
        fallthrough
>
    // 4
    case .ready:
        state = .loading
        serviceMethod(pageSize, lastObjectKey) { [unowned self] (objects: [T]) in
            // 5
            defer {
                // 6
                if let lastObjectKey = objects.last?.key {
                    self.lastObjectKey = lastObjectKey
                }
>
                // 7
                self.state = objects.count < Int(self.pageSize) ? .end : .ready
            }
>
            // 8
            guard let _ = self.lastObjectKey else {
                return completion(objects)
            }
>
            // 9
            let newObjects = Array(objects.dropFirst())
            completion(newObjects)
        }
>
    // 10
    case .loading, .end:
        return
    }
}
```

Let's break down and walk through the code we just added:

1. Notice our `completion` parameter type. We use our generic type to enforce that we return type `T`.
2. We switch on our helper's state to determine the behavior of our helper when `paginate(completion:)` is called.
3. For our initial state, we make sure that the `lastObjectKey` is nil use the `fallthrough` keyword to execute the `ready` case below.
4. For our `ready` state, we make sure to change the state to `loading` and execute our service method to return the paginated data.
5. We use the `defer` keyword to make sure the following code is executed whenever the closure returns. This is helpful for removing duplicate code.
6. If the returned last returned object has a key value, we store that in `lastObjectKey` to use as a future offset for paginating. Right now the compiler will throw an error because it cannot infer that `T` has a property of key. We'll fix that next.
7. We determine if we've paginated through all content because if the number of objects returned is less than the page size, we know that we're only the last page of objects.
8. If `lastObjectKey` of the helper doesn't exist, we know that it's the first page of data so we return the data as is.
9. Due to implementation details of Firebase, whenever we page with the `lastObjectKey`, the previous object from the last page is returned. Here we need to drop the first object which will be a duplicate post in our timeline. This happens whenever we're no longer on the first page.
10. If the helper is currently paginating or has no more content, the helper returns and doesn't do anything.

Let's fix our compiler error. Right now, our compiler can't infer that type `T` will have a key property. We'll fix that by creating a new protocol that we'll constraint `T` to.

> [action]
Above the `MGPaginationHelper` class, add the following protocol and constrain the generic type `T` to `MGKeyed`
>
```
protocol MGKeyed {
    var key: String? { get set }
}
>
class MGPaginationHelper<T: MGKeyed> {...}
```

This will guarentee that `T` has a key property. Next, we'll need to implement our protocol on our `Post` model.

> [action]
Open `Post` and implement the `MGKeyed` protocol:
>
```
class Post: MGKeyed {...}
```

Before we move on, let's finish our `MGPaginationHelper` logic by adding a method that resets the pagination helper to it's initial state. We'll be able to use this with our `UIRefreshControl` to reset our timeline data.

> [action]
Add the following method to reset the pagination helper.
>
```
func reloadData(completion: @escaping ([T]) -> Void) {
    state = .initial
>
    paginate(completion: completion)
}
```

## Creating a Paginated Service Method

Currently, our `UserService.timeline(completion:)` method returns all posts within our timeline. To paginate our timeline, we'll need to change our service method to handle pagination.

Following the expected parameters of our `serviceMethod` closure in `MGPaginationHelper`, we'll change our service method to take arguments of `(UInt, String?, @escaping (([T]) -> Void)) -> Void`.

> [action]
Change our timeline service method to the following:
>
```
static func timeline(pageSize: UInt, lastPostKey: String? = nil, completion: @escaping ([Post]) -> Void) {
    let currentUser = User.current
>
    let ref = Database.database().reference().child("timeline").child(currentUser.uid)
    var query = ref.queryOrderedByKey().queryLimited(toLast: pageSize)
    if let lastPostKey = lastPostKey {
        query = query.queryEnding(atValue: lastPostKey)
    }
>
    query.observeSingleEvent(of: .value, with: {...})
}
```

We changed our service method to take a `pageSize` and `lastPostKey`. We then construct a query based on these parameters. Everything else remains the same.

## Configuring HomeViewController

We've finished the setup to implement functionality. Now we just need to implement our `MGPaginationHelper` in `HomeViewController`. We'll complete this extension by hooking our new helper to the UI.

> [action]
Add a new instance of `MGPaginationHelper` as a property to `HomeViewController`:
>
```
class HomeViewController: UIViewController {
    let paginationHelper = MGPaginationHelper<Post>(serviceMethod: UserService.timeline)
>
    // ...
}
```

We create a new instance of `MGPaginationHelper` and specific type `T` to be `Post`. We then pass the service method `UserService.timeline(pageSize:lastPostKey:completion:)` to the helper.

Next, we'll need to call `reloadData(completion:)` and `paginate(completion:)` from our `HomeViewController` respectively.

> [action]
Open `HomeViewController` and refactor `viewDidLoad` and `reloadTimeline` to the following:
>
```
override func viewDidLoad() {
    super.viewDidLoad()
>
    setupTableView()
    reloadTimeline()
}
>
func reloadTimeline() {
    self.paginationHelper.reloadData(completion: { [unowned self] (posts) in
        self.posts = posts
>
        if self.refreshControl.isRefreshing {
            self.refreshControl.endRefreshing()
        }
>
        self.tableView.reloadData()
    })
}
```

This will initially load our first page of posts when the view controller first loads.

Next, we'll need to implement pagination when the user scrolls to the end of their timeline. This will load more posts of the current user's timeline as they scroll down.

> [action]
Add the following in your `UITableViewDataSource`:
>
```
func tableView(_ tableView: UITableView, willDisplay cell: UITableViewCell, forRowAt indexPath: IndexPath) {
    if indexPath.section >= posts.count - 1 {
        paginationHelper.paginate(completion: { [unowned self] (posts) in
            self.posts.append(contentsOf: posts)
>
            DispatchQueue.main.async {
                self.tableView.reloadData()
            }
        })
    }
}
```

In the code above, we check if the user has scrolled to the end of the content in memory and make a request to paginate if they have. Then we append the new content to the `UITableView` and reload the data.

Run the app and test your code! You might need to add multiple new posts to have enough content to paginate but verify that our new pagination helper works!

# Where To Go From Here?

In this extension, we've learned about the powerful Swift language feature of generics. We've looked at two use cases to apply generics and implemented pagination for our timeline.

As you move forward, you can condense and reuse your code using generics!

<!-- TODO: create a better conclusion -->
