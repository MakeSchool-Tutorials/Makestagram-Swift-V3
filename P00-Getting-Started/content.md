---
title: "Getting Started"
slug: getting-started
---

During this tutorial you will build a photo sharing app that is similar to the popular app [Instagram](https://instagram.com/). After finishing the _Make School Notes_ tutorial you should have a good understanding of the basics of iOS development.

In this tutorial we will touch many advanced iOS development topics including how to use [Firebase](https://firebase.google.com/) to build a backend for your app.

Here are the most important things you will learn:

- How to implement an email signup and login flow using Firebase Auth
- How to structure and store data using Firebase Realtime Database
- How to capture photos and upload them with Firebase Storage
- How to query and retrieve data from Firebase
- How to architect a complex iOS app
- How to use libraries built by other developers to speed up development

Before starting the tutorial, we'll take some time upfront and install `CocoaPods`.

# Installing CocoaPods

CocoaPods is a _dependency manager_ that allows you to easily install and manage third-party code.

We'll want to go ahead and start the installation process for CocoaPods because the first time running `pod install` may take a long time. 

> [action]
Open terminal and type:
>
```
sudo gem install cocoapods
```
>
Next run the following command:
```
pod setup --verbose
```

This step will take 10-15 minutes to complete the first time you run it. This is because it will clone the entire cocoapods master repo (~1GB) to `~/.cocoapods/repos`.

During the process of running `pod setup`, you can continue on as you wait for it to complete.

<!-- how to shallow clone: https://stackoverflow.com/questions/21022638/pod-install-is-staying-on-setting-up-cocoapods-master-repo/39904450#39904450 -->

We'll dive more in-depth about dependency management and what CocoaPods does when we setup our Xcode project.

# Conclusion

After finishing the tutorial you will have a good understanding of building complex iOS apps that tie into a backend - from there you will be able to move on and create your original iPhone app!

Let's get started by taking a look at how Firebase works and creating a new Firebase project.
