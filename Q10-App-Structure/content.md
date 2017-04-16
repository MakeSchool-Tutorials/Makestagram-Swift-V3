---
title: "App Structure"
slug: app-structure
---
Now that we've finished our login flow, let's take another look at our app outline:


![App Outline](assets/app_outline.png)

By referring back to our app outline, we can see which parts we've completed and which parts we still need to complete. After finishing our login flow, we now need to finish the main flow of our app. Let's go ahead and setup it's structure in storyboard.

#Another Container View Controller: The UITabBarController

In this section we're going to set up the basic structure of our app, starting with a *container view controller*, a view controller that can present other view controllers.

In **Make School Notes** we  used a `UINavigationController` as our container view controller, which allowed us to drill down on content by *pushing* and *popping* view controllers.

In **Makestagram**, we will be using another popular container view controller called the `UITabBarController`. The `UITabBarController` contains a *tab bar* and *tab bar items*. Each tab bar item is connected to a specifc view controller, tapping a tab bar item displays the appropriate view controller. You'll notice that many popular apps including Instagram, Facebook and Airbnb all make use of the tab bar.

![Tab Bar Example](assets/tab_bar_example.png)

By selecting the appropriate tab bar item, a user can switch between the Timeline Screen, Photo Capture Screen, and Friends Search Screen.

# Setting Up the UITabBarController

Since we've already setup our login screen, the next screen we need to setup is our Tab Bar Screen.

If you navigate to the Main storyboard, you'll see that it currently has one screen. A simple `UIViewController`. We don't need that screen, so let's go ahead and delete it.

> [action]
Open *Main.storyboard*. Select the existing view controller; after you have selected it you should see a blue border surrounding it:
![image](selected_vc.png)
>
Hit the *delete* key to remove this view controller. Now you should see a blank storyboard:
![image](blank_storyboard.png)

Let's also delete the screen's accompanying source file called *ViewController.swift*. When prompted, click the button that says `Move to Trash`.

> [action]
Delete the *ViewController.swift* file:
![image](delete_vc.png)
![image](delete_vc_trash.png)

Now we can add the `UITabBarController`.

> [action]
Drag the `UITabBarController` from the component library into the storyboard:
![image](add_tab_bar.png)

We have now set up the container view controller for our app - time to run it?

If you run the app now, after the splash image disappears, you will see a blank black screen. You will also see the following error in the console:

Makestagram[79956:42367980] [Application] Failed to instantiate the default view controller for UIMainStoryboardFile 'Main' - perhaps the designated entry point is not set?

**Why Are We Seeing This Error?**

When working with storyboards, we have to designate an entry point, or more simply, we have to tell UIKit (the Apple framwork which handles manipulating the user interface) what view controller should appear first (we call this view controller the *Initial View Controller*). When the compiler doesn't know which view controller to show first (a.k.a. when the entry point is not set), it defaults to showing an empty black screen.

We are seeing this error because the `UIViewController` that we initially deleted from the project was set as the Initial View Controller, and after deleting it, we never set another view controller to be the new Initial View Controller. Let's fix this error by assigning our tab bar controller as the Initial View Controller.

> [action]
Configure the tab bar controller to be our app's Initial View Controller. First select the *Attributes Inspector* in the right bar (1). Then check the *is Initial View Controller* checkbox (2). As a confirmation you should see an arrow pointing to the Tab Bar View Controller (3):
![image](initial_tab_bar.png)

Great! Now when you run the app now, you should see the initial Login screen again. When you sign up or log in with a user, you should see the tab bar with 2 items.

# Adding a Third View Controller to the Tab Bar

The default tab bar comes with two view controllers; however, we need three view controllers for **Makestagram**. Lets add the third view controller now.

> [action]
Add a third view controller. Note that the key you need to hold down is the *control* key which has the following symbol: ⌃

We now have all of the required view controllers set up!

#Decorating the Tab Bar Items

Currently the tab bar has three entries and looks like this:

![image](assets/three_tab_bar.png)

The empty tab bar looks pretty bad, so let's add an image to each tab bar item to make things look nicer. (Images will also have the benefit of making it easier to identify the different tabs.)

<!-- insert tab bar images pack -->

##Adding Assets to an App

Now it's time to add some of these assets you just downloaded to our app. All assets used within an iOS app are stored in *Asset catalogs*. Every iOS projects that you create with Xcode comes with one default asset catalog called *Images.xcassets*:

![image](assets/asset_catalog.png)

That asset catalog contains one resource for the App's icon. You add new resources to your app by creating new entries (called *Image Sets*) in this asset catalog. You can also create multiple asset catalogs which is useful for apps with huge amounts of images.

Let's add our first images to our app!

Unzip the downloaded art pack, then add all of the assets to the asset catalog.

![image](assets/asset_catalog.png)

Let's briefly discuss some important concepts about asset handling on iOS. You probably have realized that we're providing three different image files for each asset we wanted to use in our App (*@1x*, *@2x* and *@3x*). These different images have different resolutions, each suited to a specific type of iOS devices with a different screen resolution. The *@1x* assets are used for the oldest iOS devices, e.g. iPhone 3Gs, which don't have retina displays. The *@2x* images are used for the 3.5 and 4 inch retina screens of the iPhone 4(S) and iPhone 5(S). Finally, the *@3x* images are used by the iPhone 6 and iPhone 6 Plus. In most cases you won't have to spend too much time thinking about this, as long as you provide assets in all relevant resolutions.

You should also note that we don't reference images in asset catalogs by their file name, but instead by the name of their Image Set. In our example, our image sets are called *camera*, *people* and *home*.

##Assigning Images to Tab Bar Items

Now that we have added images to our app, we can assign them to our tab bar items.

When we're done, the tab bar should look like this:

![image](assets/tab_bar_order.png)

Let's set the images up!

> [action]
**Repeat the following steps for all three view controllers**:
>
1. Select a view controller in the left panel of the storyboard
2. Select the view controller's tab bar item
3. Open the *Attributes Inspector* in the right panel
4. Erase the Item *Title*
5. Set the Item *Image* to *home*, *camera* or *people*, depending on which view controller you are currently setting up
>

Now we have images on each tab bar item - but something doesn't look quite right. The images aren't vertically centered. That's because iOS reserves some space below the image for the *Title* of the tab bar item. For **Makestagram** we don't need titles, instead we want the images to be centered. We can accomplish that by adjusting the *Image Inset* for each tab bar item.

> [action]
**Repeat the following steps for all three view controllers**:
>
1. With the tab bar item selected, open the *Size Inspector* on the right panel
2. Set the *Image Insets* as following:
      - *Top*: 5
      - *Bottom*: -5
>

Now all of your tab bar items should have images that are nicely centered.

##Reordering Tab Bar Items

Just in case you didn't set up the view controllers in the correct order, I want to show you how you can reorder them. Select the tab bar view controller in your storyboard, then simply drag the tab bar items to rearrange them

Now we have a nice looking Tab Bar that connects to the three View Controllers of our App.

#Creating Classes for our View Controllers

To finish this section, let's create the source code files for all three view controllers that we will be working on throughout this tutorial. We'll add them to the  *ViewControllers* group to keep this project nicely structured.

##Configuring Custom Classes in Storyboard

The last setup step that remains is connecting the classes that we just created to our view controllers in our storyboard.

> [action]
**Repeat the following steps for all three View Controllers**:
>
1. Select the View Controller in Storyboard
2. Open the *Identity Inspector* in the right panel
3. Set the custom class to match the current View Controller
>

#Wrapping up

Congratulations! We have now set up the basic structure of **Makestagram**! You should have three tab bar items with icons, connected to three view controllers in your storyboard, each backed by a corresponding Swift file.

<!-- We're ready to implement our first Feature: **Uploading photos!** -->
<!-- next we need persistence to make sure we're always logged in.. then we can do uploading photos -->
