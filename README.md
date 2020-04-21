# filewall.io-browser-extension
filewall.io browser extension for Chrome and Firefox

Get latest version from Chrome Web Store

<a href="https://chrome.google.com/webstore/detail/filewallio/oedgekmkjhnaighbcondendhaadkcdmn">
   <img src="https://developer.chrome.com/webstore/images/ChromeWebStore_BadgeWBorder_v2_206x58.png"></img>
</a>



## Developer

### Install dependencies
This extension can be build on any recent linux system. Make sure you install [npm](https://www.npmjs.com/) version 5.2.0 or greater.
Then run `npm install`

### Make Chrome build
Run `npm run build-chrome` and after the build will be placed in `./web-ext-artifacts/chrome/filewallio-*.*.*-chrome.zip` along with a zip containing the latest source code `filewallio-*.*.*-chrome-source.zip`).

### Make Firefox build
Run `npm run build-firefox` and after the build will be placed in `./web-ext-artifacts/firefox/filewallio-*.*.*-firefox.zip` along with a zip containing the latest source code `filewallio-*.*.*-firefox-source.zip`).
