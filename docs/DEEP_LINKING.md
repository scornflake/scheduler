We want to be able to quickly load the app from the forgot password page.


Requires a few things
---------------------
 - Universal Links on the iOS side
 - Server side setup for apple-app-site-association and assetlinks.json (ios and android files, respectively)

Server Side
-----------
Need some files to very that the link is valid.
These are listed above. They are served directly by django so that I can also run it on development (without requiring nginx)

Client Side
-----------
Cordova Plugins

https://github.com/ionic-team/ionic-plugin-deeplinks

cordova plugin add ionic-plugin-deeplinks --variable URL_SCHEME=scheduler --variable DEEPLINK_SCHEME=https --variable DEEPLINK_HOST=scheduler.shinywhitebox.com --variable ANDROID_PATH_PREFIX=/
yarn install @ionic-native/deeplinks

and;

cordova plugin add cordova-plugin-inappbrowser
yarn install @ionic-native/in-app-browser

This later one is required in order to have the app open up the 'forgot pwd' link when running native.