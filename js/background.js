// import { browser } from 'webextension-polyfill';
import { storage } from './storage.js';
import { downloader } from './downloader.js';
import { distinctUntilKeyChanged } from 'rxjs/operators';
const browser = require('webextension-polyfill');


browser.runtime.onInstalled.addListener( _ => {
    storage.onChange().pipe(
        distinctUntilKeyChanged('enable-context-menu')
    ).subscribe(store => {
        if (store['enable-context-menu'] ) {
            browser.contextMenus.create({
                id: 'secure_download',
                title: 'Secure Download',
                type: 'normal',
                contexts: ['link'],
            });
        } else {
            browser.contextMenus.remove('secure_download')
                .catch(e => console.log('error removingsecure_download', e.message))
        }
    });
})

// listen for clicks to contextMenu
browser.contextMenus.onClicked.addListener((info, tab) => {
    if (info.menuItemId === 'secure_download') {
        const { linkUrl } = info;
        downloader.addDownload(linkUrl);
    }
});

// Get confirm messages from dialog iframe     // TODO xss?
browser.runtime.onMessage.addListener((request) => {
    if (request.download_id) {
        downloader.confirmCatchedDownload(request.download_id, request.action);
    }
});


//
// INTERCEPT DOWNLOADS
//

// This will catch normal downloads
// CREATE
browser.downloads.onCreated.addListener( downloadItem => {
    console.log('downloads.onCreated', downloadItem.filename, downloadItem);
    storage.appDataAsync().then(store => {
        if (store['catch-all-downloads']  === true) {

            if (downloader.wasConfirmedDirect(downloadItem.url)){
                return;
            }

            var baseurls = [
                "https://filewall.io"   ,
                "https://eu.filewall.io",
                "https://us.filewall.io",
                "http://127.0.0.1",
                "chrome-extension://"
            ];
            const { origin } = new URL(downloadItem.url)
            for (const baseUrl of baseurls) {
                    if ( origin === baseUrl ) {
                        return;
                }
            }
            // cancel existing download
            removeDownload(downloadItem);

            // ask user
            downloader.addCatchedDownload(downloadItem.url);
        }
    });
});


// DETERMINE FILENAME

browser.downloads.onDeterminingFilename.addListener(function (downloadItem, suggest) {
    console.log('onDeterminingFilename', downloadItem.filename, downloadItem);
});

// CATCH COMPLETED DOWNLOAD
// browser.downloads.onChanged.addListener(function (downloadDelta) { });
// CATCH ERASE
// browser.downloads.onErased.addListener(function (downloadId) { });

async function removeDownload(downloadItem) {
    const { state, id } = downloadItem;
    // pause existing download
    console.log(id, 'trying to pause state: ' + state)
    await browser.downloads.pause(id);
    if (state === 'complete') {
         console.log(id, 'trying to removeFile state: ' + state)
         await browser.downloads.removeFile(id);
    }
    // erase download
    console.log(id, 'trying to erase state: ' + state)
    await browser.downloads.erase({id});
}