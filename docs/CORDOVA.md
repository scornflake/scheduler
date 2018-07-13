To add ios
===
ionic cordova platform add ios

If you 'remove', that'll blow away the platform/ios folder and project.

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



Fastlane
========

ios
---

- We're using 'match' based signing.
- This requires the private repo scheduler-certs in order to work.
- Fastlane is setup in the fastlane folder of platforms/ios.

android
-------

If you blow away the android folder, the following needs to happen:
** do this from within platforms/android **

- add build-extras.gradle
    - this adds dependencies for screenshots
- add back in the fastlane folder
    - contains metadata/project setup for fastlane
- Add a link from private repo scheduler-certs/google_play to the signing properties file. This will enable gradle to sign the build
    - ln -s ../../../scheduler-certs/google_play/release-signing.properties


Notes:
- Had to create a local keystore (its in the google_play of private repo scheduler-certs) to sign app first.
- Had to upload at least one APK before fastlane supply init would work.
