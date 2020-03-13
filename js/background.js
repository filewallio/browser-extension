// import { browser } from 'webextension-polyfill';
import { storage } from './storage.js';
import { downloader } from './downloader.js';
const browser = require('webextension-polyfill');

storage.onChange().subscribe(store => {

    if (store['enable-context-menu'] === true) {
        addContextMenuOption()
    } else {
        removeContextMenuOption()
    }
    // send user to options page if not logged in
    if (!store.apiKey) {
        //browser.runtime.openOptionsPage();
    }
});

//
// INTERCEPT DOWNLOADS
//

// This will catch normal downloads
// CREATE
browser.downloads.onCreated.addListener( downloadItem => {
    console.log('downloads.onCreated', downloadItem)

    storage.appDataAsync().then(store => {
        if (store['catch-all-downloads']  === true) {

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
    console.log('onDeterminingFilename', item);
    storage.appDataAsync().then(appData => {
        if (appData['catch-all-downloads']  === true) {
            downloader.onDeterminingFilename(item.url, item.filename)
        }
    })
    return true;
});
// CATCH COMPLETED DOWNLOAD
browser.downloads.onChanged.addListener(function (downloadDelta) { });
// CATCH ERASE
// browser.downloads.onErased.addListener(function (downloadId) { });

function addContextMenuOption() {
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
}
function removeContextMenuOption() {
    browser.contextMenus.remove('secure_download');
}