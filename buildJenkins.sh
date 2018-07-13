export PATH="${WORKSPACE}/node_modules/.bin:$PATH"

# Will do both normal and dev dependencies
yarn install

npm rebuild node-sass
npm run build:prod

ionic cordova prepare ios --release --prod
ionic cordova prepare android --release --prod

# Get ourselves a docker container of the /www code
"${WORKSPACE}/buildDockerImage.sh"

