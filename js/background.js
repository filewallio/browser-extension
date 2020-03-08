// import { browser } from 'webextension-polyfill';
import { storage } from './storage.js';
import { downloader } from './downloader.js';
import { filewall } from './filewall.js'
const browser = require('webextension-polyfill');

// browser.tabs.create({url: browser.runtime.getURL('/popup/popup.html')})

//
// ON INSTALL
//
browser.runtime.onInstalled.addListener(() => {
    // ga('send', 'pageview', '/extension/install');
    console.log('onInstalled')

    storage.appDataAsync().then(appData => {
        if (appData['enable-context-menu'] === true) {
            browser.contextMenus.create({
                id: 'secure_download',
                title: 'Secure Download',
                type: 'normal',
                contexts: ['link'],
            });

            browser.contextMenus.onClicked.addListener((info, tab) => {
                if (info.menuItemId === 'secure_download') {
                    downloader.addDownload(info.linkUrl);
                    // download_to_memory(info.linkUrl);
                }
            });
        } else {
            browser.contextMenus.remove('secure_download');
        }
        // send user to options page if not logged in
        if (!appData.apiKey) {
            browser.runtime.openOptionsPage();
        }
    });

    // browser.browserAction.setBadgeBackgroundColor({ color: [0, 99, 255, 230] });
})



//
// INTERCEPT DOWNLOADS
//

// This will catch normal downloads
// CREATE
browser.downloads.onCreated.addListener( downloadItem => {
    console.log('downloads.onCreated')

    storage.appDataAsync().then(appData => {
        if (appData['catch-all-downloads']  === true) {
            var baseurls = [
                "https://filewall.io"   ,
                "https://eu.filewall.io",
                "https://us.filewall.io",
                "http://127.0.0.1:8000"
            ];
            for (const baseUrl of baseurls) {
                if (downloadItem.url.startsWith(baseUrl)) {
                    return;
                }
            }
            browser.downloads.cancel(downloadItem.id);
            if (downloadItem.state == "complete") {
                browser.downloads.removeFile(downloadItem.id);
            }
            browser.downloads.erase({id: downloadItem.id});

            // send msg to indicator to show "download intercepted" msg
            // msg asks user if direct or via filewall.io
            // on result:
            //  if via filewall:
            //    downloader.addDownload(downloadItem.url);
            //  if direct:
            //    browser.downloads.download({ url: downloadItem.url, });
            //

        }
    });
});

// DETERMINE FILENAME
// browser.downloads.onDeterminingFilename.addListener(function (item, suggest) { });
// CATCH COMPLETED DOWNLOAD
browser.downloads.onChanged.addListener(function (downloadDelta) { });
// CATCH ERASE
browser.downloads.onErased.addListener(function (downloadId) { });
