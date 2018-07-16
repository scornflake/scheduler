#!/bin/bash
set -e

export PATH="$HOME/.fastlane/bin:${WORKSPACE}/node_modules/.bin:$PATH"
export ANDROID_HOME="$HOME/Library/Android/sdk"

# Will do both normal and dev dependencies
yarn install
npm rebuild node-sass

fastlane ios beta


