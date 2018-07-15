#!/bin/bash
set -e

export PATH="${WORKSPACE}/node_modules/.bin:$PATH"

# Will do both normal and dev dependencies
yarn install

npm rebuild node-sass

ionic cordova resources android
ionic cordova build android --prod --release
fastlane android alpha


