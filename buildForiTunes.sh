#!/bin/bash
set -e

export PATH="$HOME/.fastlane/bin:${WORKSPACE}/node_modules/.bin:$PATH"

# Will do both normal and dev dependencies
yarn install
npm rebuild node-sass

fastlane ios beta


