export PATH="${WORKSPACE}/node_modules/.bin"

yarn install

npm rebuild node-sass
npm run build:prod

"${WORKSPACE}/buildDockerImage.sh"

ionic cordova prepare ios --release --prod
ionic cordova prepare android --release --prod


