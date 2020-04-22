// import { browser } from 'webextension-polyfill';
import { storage } from './storage.js';
import { downloader } from './downloader.js';
import { distinctUntilKeyChanged } from 'rxjs/operators';
const browser = require('webextension-polyfill');

let isFirefox = browser.downloads.onDeterminingFilename === undefined; // firefox does not have onDeterminingFilename


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
            browser.contextMenus.remove('secure_download').catch(e => console.log('error removingsecure_download', e.message))
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

        let url = downloadItem.finalUrl;
        if(url === undefined){ url = downloadItem.url}

        if (downloader.wasConfirmedDirect(url)){
            return;
        }

        var baseurls = [
            "https://filewall.io"   ,
            "https://eu.filewall.io",
            "https://us.filewall.io",
            "http://127.0.0.1",
            "chrome-extension://"
        ];
        const { origin } = new URL(url);
        for (const baseUrl of baseurls) {
            if ( origin === baseUrl ){ return; }
        }
        const { state, id,  } = downloadItem;

        let targetFilename = undefined;
        if(isFirefox) { // firefox does not have onDeterminingFilename, and also fires this event AFTER showing the "save as" file dialog, so we can get the filename anyway
            browser.downloads.cancel(id);
            if (state === 'complete') { browser.downloads.removeFile(id); }
            browser.downloads.erase({id});
            targetFilename = downloadItem.filename
        }else{
            browser.downloads.pause(id); // if in chrome, pause download for now so onDeterminingFilename does not produce an error msg.
            intercepted_dl_ids[id] = true;
        }

        // If a download opens in a new tab, we catch the pendingUrl in browser.tabs.onActivated. If the tabs pending url is the same as the download url,
        // the tab will be closed by the browser, so we have to inject the dialog window into the parent tab.
        let targetTab = current_tab;
        if(tab_data[current_tab].pendingUrl !== undefined && tab_data[current_tab].parent !== undefined){
            if(tab_data[current_tab].pendingUrl === downloadItem.url || tab_data[current_tab].pendingUrl === downloadItem.finalUrl ){
                targetTab = tab_data[current_tab].parent;
            }
        }

        downloader.addCatchedDownload(downloadItem.id, url, targetTab, targetFilename); // ask user
    }
});


// track tabs to we can determine where to display the "download intercepted" dialog

let current_tab = undefined;
let tab_data = {}; // { id : { parent: someiId, pendingUrl: maybePendingUrl } }

browser.tabs.onCreated.addListener(tab => {
    tab_data[tab.id] = { parent: current_tab, pendingUrl: tab.pendingUrl}
})
browser.tabs.onRemoved.addListener(tabId => {
    if(tabId === current_tab){ current_tab = undefined;}
    delete tab_data[tabId];
    for (const key of Object.keys(downloader.catchedDownloads)) {
        if(downloader.catchedDownloads[key].targetTab === tabId){
            delete downloader.catchedDownloads[key];
        }
    }
})
browser.tabs.onUpdated.addListener(tabId => {
    browser.tabs.get(tabId).then(  tab => {
        if(tab_data[tab.id] === undefined){ tab_data[tab.id] = {};}
        tab_data[tab.id] = { pendingUrl: tab.pendingUrl, parent: tab_data[tab.id].parent };
    });

})
browser.tabs.onActivated.addListener(data => {
    current_tab = data.tabId;
    browser.tabs.get(data.tabId).then( tab => {
        if(tab_data[tab.id] === undefined){ tab_data[tab.id] = {};}
        tab_data[tab.id] = { pendingUrl: tab.pendingUrl, parent: tab_data[tab.id].parent };
    });
})


// DETERMINE FILENAME
if(!isFirefox){ // firefox does not have onDeterminingFilename
    browser.downloads.onDeterminingFilename.addListener(function (downloadItem, suggest) {
        console.log('onDeterminingFilename', downloadItem.filename, downloadItem);

        const { state, id } = downloadItem;
        if(intercepted_dl_ids[id] === true){
            downloader.setFilenameForCatchedDownload(downloadItem.id, downloadItem.filename)

            delete intercepted_dl_ids[id];

            console.log('trying to erase download', downloadItem);

            // suggest dummy filename so "save as" file dialog is not triggered after this event and does not produce some internal error because the download will have been deleted
            suggest({filename: "dummy"});

            // Erase existing download
            if (state === 'complete') { browser.downloads.removeFile(id); }
            browser.downloads.erase({id});
        }
    });
}
// CATCH COMPLETED DOWNLOAD
// browser.downloads.onChanged.addListener(function (downloadDelta) { });

// CATCH ERASE
// browser.downloads.onErased.addListener(function (downloadId) { });
