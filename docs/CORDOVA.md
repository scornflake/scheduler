To add iOS
===
ionic cordova platform add ios

If you 'remove', that'll blow away the platform/ios folder and project.

XCode
---
* You'll need to disable automatic signing and choose the 'match' profile for debug/prod.
* You need to reset the AssociatedDomains to applinks:cunningplanapp.shinywhitebox.com

Running the iPad simulator
---
By default it won't work because of some old version of ios-sim. It must be updated.
It sits as an npm module inside the platforms/ios/cordova folder.

To install the latest ios-sim:
   - cd platforms/ios/cordova
   - npm install --save ios-sim@latest


Prod Build
===
ionic cordova build ios --release --prod


Android
-------

If you blow away the android folder, the following needs to happen:
** do this from within platforms/android **




Not sure below is required?
Fastlane seems to build it just fine.

- add build-extras.gradle
    - this adds dependencies for screenshots
- Add a link from private repo scheduler-certs/google_play to the signing properties file. This will enable gradle to sign the build
    - ln -s ../../../scheduler-certs/google_play/release-signing.properties


Notes:
- Had to create a local keystore (its in the google_play of private repo scheduler-certs) to sign app first.
- Had to upload at least one APK before fastlane supply init would work.



Fastlane
========

ios
---

- We're using 'match' based signing.
- This requires the private repo scheduler-certs in order to work.

