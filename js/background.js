// import { browser } from 'webextension-polyfill';
import { storage } from './storage.js';
import { downloader } from './downloader.js';
import { distinctUntilKeyChanged } from 'rxjs/operators';
const browser = require('webextension-polyfill');

let shouldCatchUrls = [];
// TODO only call on change of value instead of each time store is updated
storage.onChange().pipe(
    distinctUntilKeyChanged('enable-context-menu')
).subscribe(async store => {

    if (store['enable-context-menu'] ) {
        await browser.contextMenus.create({
            id: 'secure_download',
            title: 'Secure Download',
            type: 'normal',
            contexts: ['link'],
        });
    } else {
        await browser.contextMenus.remove('secure_download');
    }
});

// listen for clicks to contextMenu
browser.contextMenus.onClicked.addListener((info, tab) => {
    if (info.menuItemId === 'secure_download') {
        const { linkUrl } = info;
        // add url to shouldCatchUrls array
        shouldCatchUrls.push(linkUrl);

        browser.downloads.download({url: linkUrl});
    }
});

//
// INTERCEPT DOWNLOADS
//

// This will catch normal downloads
// CREATE
browser.downloads.onCreated.addListener( downloadItem => {
    console.log('downloads.onCreated', downloadItem.filename, downloadItem)
});

// Get confirm messages from dialog iframe     // TODO xss?
browser.runtime.onMessage.addListener((request) => {
    if (request.download_id) {
        downloader.confirmCatchedDownload(request.download_id, request.action);
    }
});

// DETERMINE FILENAME
browser.downloads.onDeterminingFilename.addListener(function (downloadItem, suggest) {
    console.log('onDeterminingFilename', downloadItem.filename, downloadItem);

    // is the url in shouldCatchUrls
    const shouldCatchDownload = !!shouldCatchUrls.find(url => url === downloadItem.url);
    if (shouldCatchDownload) {
        
        // remove downloadUrl for shouldCatchUrls
        shouldCatchUrls = shouldCatchUrls.filter(url => url !== downloadItem.url);
        
        // cancel download and init filewall upload
        removeDownload(downloadItem);
        downloader.addDownload(downloadItem.url, downloadItem.filename);
    } else {
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
                browser.downloads.cancel(downloadItem.id);
                if (downloadItem.state === "complete") {
                    browser.downloads.removeFile(downloadItem.id);
                }
                browser.downloads.erase({id: downloadItem.id});
    
                // ask user
                downloader.addCatchedDownload(downloadItem.url);
            }
        });
    }
    suggest();
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
    // if (state === 'complete') {
    //     console.log(id, 'trying to removeFile state: ' + state)
    //     await browser.downloads.removeFile(id);
    // }
    // erase download
    console.log(id, 'trying to erase state: ' + state)
    await browser.downloads.erase({id});
}