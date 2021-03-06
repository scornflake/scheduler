fastlane documentation
================
# Installation

Make sure you have the latest version of the Xcode command line tools installed:

```
xcode-select --install
```

Install _fastlane_ using
```
[sudo] gem install fastlane -NV
```
or alternatively using `brew cask install fastlane`

# Available Actions
## iOS
### ios build
```
fastlane ios build
```
Just build the thing
### ios beta
```
fastlane ios beta
```


----

## Android
### android test
```
fastlane android test
```
Runs all the tests
### android slackbuild
```
fastlane android slackbuild
```
Build production release
### android build
```
fastlane android build
```
Build production release
### android alpha
```
fastlane android alpha
```
Deploy new alpha
### android deploy
```
fastlane android deploy
```
Deploy a new version to the Google Play

----

This README.md is auto-generated and will be re-generated every time [fastlane](https://fastlane.tools) is run.
More information about fastlane can be found on [fastlane.tools](https://fastlane.tools).
The documentation of fastlane can be found on [docs.fastlane.tools](https://docs.fastlane.tools).
