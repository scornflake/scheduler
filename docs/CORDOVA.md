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
