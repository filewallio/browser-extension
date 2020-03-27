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

// Get confirm messages from dialog iframe  
browser.runtime.onMessage.addListener((request) => {
    if (request.download_id) {
        downloader.confirmCatchedDownload(request.download_id, request.action);
    }
});


//
// INTERCEPT DOWNLOADS
//

let intercepted_dl_ids = [];

// This will catch normal downloads
// CREATE
browser.downloads.onCreated.addListener( downloadItem => {
    console.log('downloads.onCreated', downloadItem.filename, downloadItem);
    if ( storage.appData['catch-all-downloads']  === true) { // don't do async,  the code below must run right now because of browser.downloads.pause

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
        const { origin } = new URL(downloadItem.url);
        for (const baseUrl of baseurls) {
                if ( origin === baseUrl ) {
                    return;
            }
        }
        const { state, id } = downloadItem;
        browser.downloads.pause(id); // pause download for now to onDeterminingFilename does not produce an error msg
        intercepted_dl_ids[id] = true;

        // ask user
        downloader.addCatchedDownload(downloadItem.url);
    }
});


// DETERMINE FILENAME

browser.downloads.onDeterminingFilename.addListener(function (downloadItem, suggest) {
    console.log('onDeterminingFilename', downloadItem.filename, downloadItem);

    const { state, id } = downloadItem;
    if(intercepted_dl_ids[id] === true){

        delete intercepted_dl_ids[id];

        console.log('trying to erase download', downloadItem);

        // suggest dummy filename so "save as" file dialog is not triggered after this event and does not produce some internal error because the download will have been deleted
        suggest({filename: "dummy"});

        // Erase existing download
        if (state === 'complete') {
             browser.downloads.removeFile(id);
        }
        browser.downloads.erase({id});

    }
});

// CATCH COMPLETED DOWNLOAD
// browser.downloads.onChanged.addListener(function (downloadDelta) { });

// CATCH ERASE
// browser.downloads.onErased.addListener(function (downloadId) { });
