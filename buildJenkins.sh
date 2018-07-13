export PATH="${WORKSPACE}/node_modules/.bin:$PATH"

yarn install
yarn install --dev

npm rebuild node-sass
npm run build:prod

"${WORKSPACE}/buildDockerImage.sh"

ionic cordova prepare ios --release --prod
ionic cordova prepare android --release --prod


