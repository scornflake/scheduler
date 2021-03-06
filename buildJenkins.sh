#!/bin/bash
set -e

export PATH="${WORKSPACE}/node_modules/.bin:$PATH"

# Will do both normal and dev dependencies
yarn install

npm rebuild node-sass
npm run test

npm run build:prod

# Get ourselves a docker container of the /www code
"${WORKSPACE}/buildDockerImage.sh"


