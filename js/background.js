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
    console.log('downloads.onCreated', downloadItem)

    storage.appDataAsync().then(appData => {
        if (appData['catch-all-downloads']  === true) {

            if(downloader.wasConfirmedDirect(downloadItem.url)){
                return;
            }

            var baseurls = [
                "https://filewall.io"   ,
                "https://eu.filewall.io",
                "https://us.filewall.io",
                "http://127.0.0.1",
                "chrome-extension://",
            ];
            for (const baseUrl of baseurls) {
                if (downloadItem.url.startsWith(baseUrl)) {
                    return;
                }
            }

            // cancel existing download
            browser.downloads.cancel(downloadItem.id);
            if (downloadItem.state === "complete") {
                browser.downloads.removeFile(downloadItem.id);
            }
            browser.downloads.erase({id: downloadItem.id});

            // ask user
            downloader.addCatchedDownload(downloadItem.url);
        }
    });
});

// Get confirm messages from dialog iframe     // TODO xss?
browser.runtime.onMessage.addListener((request) => {
    if (request.download_id){
        downloader.confirmCatchedDownload(request.download_id, request.action)
    }
});

// DETERMINE FILENAME
browser.downloads.onDeterminingFilename.addListener(function (item, suggest) {
   console.log("onDeterminingFilename", item);
   storage.appDataAsync().then(appData => {
        if (appData['catch-all-downloads']  === true) {
            downloader.onDeterminingFilename(item.url, item.filename)
        }
   })
});
// CATCH COMPLETED DOWNLOAD
browser.downloads.onChanged.addListener(function (downloadDelta) { });
// CATCH ERASE
browser.downloads.onErased.addListener(function (downloadId) { });
