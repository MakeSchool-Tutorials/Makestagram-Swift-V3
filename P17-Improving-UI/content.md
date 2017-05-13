---
title: "Improving the UI"
slug: improving-the-ui
---

In this section, we'll focus on completing the UI elements for the `HomeViewController`. Let's review the design we'll implement for each post:

![Post Design](assets/post_design.png)

Adding to the existing `PostImageCell`, we'll create a header cell and an action cell for each post. The header cell will display the poster's username and give the current user the ability to flag inappropriate content. The action cell will display the number of likes for a given post and allow a user to like a post.

We'll start by creating a new cell for the post header.

# Creating a Post Header Cell

In this step we'll be focused on creating the header.

Create a new custom cell:

> [action]
>
1. Open `Home.storyboard` and find the `HomeViewController`
1. Drag a new prototype cell from the object library to the table view on `HomeViewController`
![Add Header Cell](assets/add_header_cell.png)
1. Open the attributes inspector and change the cell style, selection style, and set the `Identifier` to `PostHeaderCell`
![Post Header Properties](assets/header_properties.png)
1. Open the size inspector and set a custom `Row Height` of 54
![Header Row Height](assets/header_row_height.png)

## Adding Subviews

We've now created a new cell with some custom attributes. Let's move on to adding some subviews onto our prototype cell. In this step, we'll add a `UILabel` to display the username of the poster and a options button for users to report inappropriate content.

When you're finished, your prototype cell should look like:
![Post Header Prototype Cell](assets/fin_header_prototype.png)

> [action]
Drag a `UIButton` from the object library onto the prototype cell. Add the following constraints:
![Options Button Constraints](assets/options_constraints.png)
>
Next, we'll do the same with a `UILabel` and add the following constraints:
![Username Label Constraints](assets/username_constraints.png)

After setting up our subviews, we'll need to connect them to code. Create a new `PostHeaderCell.swift` that is a subclass of `UITableViewCell`. Make your file contains the following:

```
import UIKit

class PostHeaderCell: UITableViewCell {

    override func awakeFromNib() {
        super.awakeFromNib()
    }

}
```

Add an IBOutlet for the username label. Open your Home storyboard and `PostHeaderCell` side by side with the assistant navigator and ctrl-drag from the username label to right above the `awakeFromNib` method:

```
@IBOutlet weak var usernameLabel: UILabel!

override func awakeFromNib() {
    super.awakeFromNib()
}
```

Next, we'll add an IBAction for when the options button is tapped. Ctrl-drag from the options button right below `awakeFromNib`. This type, we'll change the connection type from an outlet to an action. Your `PostHeaderCell` should look like the following:

```
class PostHeaderCell: UITableViewCell {

    @IBOutlet weak var usernameLabel: UILabel!

    override func awakeFromNib() {
        super.awakeFromNib()
    }

    @IBAction func optionsButtonTapped(_ sender: UIButton) {
        print("options button tapped")
    }
}
```

Great! We've finished creating our `PostHeaderCell`. Now we'll move on to creating our `PostActionCell`.

# Creating a Post Action Cell

We'll repeat similar steps to do the same for creating a `PostActionCell` that will be displayed below each `PostImageCell`. Add another prototype cell in our `Home.storyboard` below the `PostImageCell`.

> [challenge]
Set the following properties in your _Attribute Inspector_ and _Size Inspector_:
>
- **Selection Style**: None
- **Cell Identifier**: PostActionCell
- **Custom Height**: 46
>
If you don't remember how to configure a custom table view review the last step to refresh your memory.

## Adding Cell Subviews

On our action cell, we'll add the following subviews:

- a button for users to like a post
- a label to display the number of likes a post has
- a second label for a timestamp
- a custom separator view

Let's start by adding the like button:

> [action]
1. Drag a `UIButton` from the object library to the action cell and set the following attributes:
>
- **Type**: Custom
- **Title**: _Leave Blank_
- **Image**: ic_unfilled_heart

<!-- don't delete -->

> [action]
2. Add the following constraints for the like button:
![Like Button Constraints](assets/like_btn_constraints.png)

Next we'll add a like count label to display the number of likes a post currently has:

> [action]
1. Drag a `UILabel` from the object library beside the like button and set the following attributes:
>
- **Text**: 5 Likes
- **Font:** System Semibold 14.0

<!-- don't delete -->

> [action]
2. Add the following constraints for the like count label:
![Like Label Constraints](assets/like_label_constraints.png)

We'll also need a label for the timestamp of when a post was first created:

> [action]
1. Drag a `UILabel` onto the far right side of the cell:
![Add Timestamp Label](assets/timestamp_label.png)

<!-- don't delete -->

> [action]
2. Set the following atttributes for the label:
>
- **Text**: 31 MINUTES AGO
- **Font**: System 11
- **Text Color**: `#9A9A9A`

<!-- don't delete -->

> [action]
3. Add the following constraints for the timestamp label:
![Timestamp Label Constraints](assets/timestamp_label_constraints.png)

Last, we'll add a custom separator at the bottom of our action cell to help visually separate posts:

> [action]
1. Drag a `UIView` onto the action cell and add the following constraints:
![Bottom Border Constraints](assets/border_constraints.png)
2. Set the color to `#DBDBDB`:
![Bottom Border Color](assets/border_color.png)

After adding the subviews, you prototype cell should look like the following:

![Finished Action Cell](assets/final_sb_action_cell.png)

## Hooking up the Source Code

Let's create our IBOutlets and IBAction methods. Create a new `PostActionCell.swift` class and add the following:

```
import UIKit

class PostActionCell: UITableViewCell {

    // MARK: - Subviews

    @IBOutlet weak var likeButton: UIButton!
    @IBOutlet weak var likeCountLabel: UILabel!
    @IBOutlet weak var timeAgoLabel: UILabel!

    // MARK: - Cell Lifecycle

    override func awakeFromNib() {
        super.awakeFromNib()
    }

    // MARK: - IBActions

    @IBAction func likeButtonTapped(_ sender: UIButton) {
        print("like button tapped")
    }
}
```

We've successfully created two more cells that will help display our cell. Next we'll look at configuring our `UITableViewDataSource` and `UITableViewDelegate` so that our two new cells display before and after our `PostImageCell`.

# Configuring our DataSource and Delegate

To display our newly added header and action cells, we'll need to reconfigure our table view data source and delegate. Instead of displaying a single cell, we now need to display 3 cells for each post: a header, image and action cell.

To do this, we'll group the table view into sections. Each `Post` will be it's own section with 3 rows for each respective cell.

Add the following to the `UITableViewDataSource` extension:

```
func numberOfSections(in tableView: UITableView) -> Int {
    return posts.count
}
```

Next, we'll reconfigure `tableView(_:numberOfRowsInSection)` to the following:

```
func tableView(_ tableView: UITableView, numberOfRowsInSection section: Int) -> Int {
    return 3
}
```

This method will now return 3 rows for each section to correspond with our header, image and action cells.

Now that we've set up the data source to display the correct number of sections and rows, we'll need to return the corresponding cell in `tableView(_:cellForRowAt:)`:

```
func tableView(_ tableView: UITableView, cellForRowAt indexPath: IndexPath) -> UITableViewCell {
    let post = posts[indexPath.section]

    switch indexPath.row {
    case 0:
        let cell = tableView.dequeueReusableCell(withIdentifier: "PostHeaderCell") as! PostHeaderCell
        cell.usernameLabel.text = User.current.username

        return cell

    case 1:
        let cell = tableView.dequeueReusableCell(withIdentifier: "PostImageCell") as! PostImageCell
        let imageURL = URL(string: post.imageURL)
        cell.postImageView.kf.setImage(with: imageURL)

        return cell

    case 2:
        let cell = tableView.dequeueReusableCell(withIdentifier: "PostActionCell") as! PostActionCell

        return cell

    default:
        fatalError("Error: unexpected indexPath.")
    }
}
```

We've successfully setup our data source and will move on to modifying our `UITableViewDelegate`. The main thing we'll need to make sure of is that the height of each cell is being displayed correctly. We'll need to add cell heights for the `PostHeaderCell` and `PostActionCell`.

> [action]
Add the following class method to `PostHeaderCell`:
>
```
class PostHeaderCell: UITableViewCell {
>
    static let height: CGFloat = 54
>
    // ...
}
```
>
Repeat the following for `PostActionCell`:
>
```
class PostActionCell: UITableViewCell {
>
    static let height: CGFloat = 46
>
    // ...
}
```

Next, change your `UITableViewDelegate` to the following:

```
// MARK: - UITableViewDelegate

extension HomeViewController: UITableViewDelegate {
    func tableView(_ tableView: UITableView, heightForRowAt indexPath: IndexPath) -> CGFloat {
        let post = posts[indexPath.section]

        switch indexPath.row {
        case 0:
            return PostHeaderCell.height

        case 1:
            let post = posts[indexPath.section]
            return post.imageHeight

        case 2:
            return PostActionCell.height

        default:
            fatalError()
        }
    }
}
```

Run the app and see if your post now displays. It should look like the image below:

![Home View Controller](assets/home_working.png)

# Configuring the Timestamp

Currently, our post have a timestamp of when it was created. To display this data, we'll need to configure `tableView(_:cellForRowAt:)`.

> [action]
Open `HomeViewController` and create a new `DateFormatter`:
>
```
let timestampFormatter: DateFormatter = {
    let dateFormatter = DateFormatter()
    dateFormatter.dateStyle = .short
>
    return dateFormatter
}()
```

A date formatter allows us to convert a `Date` into a formatted string. We'll use this to display the date our post was created.

> [action]
In `tableView(_:cellForRowAt:)` add the following:
>
```
func tableView(_ tableView: UITableView, cellForRowAt indexPath: IndexPath) -> UITableViewCell {
    // ...
>
    case 2:
        let cell = tableView.dequeueReusableCell(withIdentifier: "PostActionCell") as! PostActionCell
        cell.timeAgoLabel.text = timestampFormatter.string(from: post.creationDate)
>
        return cell
>
    // ...
}
```

# Adding a Navigation Bar Title

Before moving on, we'll set a title for our `HomeViewController` navigation bar.

> [action]
Open `Home.storyboard` and select the `HomeViewController`. Open the property inspector and change the `Title` property of `View Controller` to `Makestagram`.
![Set Nav Bar Title](assets/set_title.png)

Great, now we've successfully setup some more UI for our posts. Let's move on and add the ability to like posts.
