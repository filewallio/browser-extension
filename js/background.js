// import { browser } from 'webextension-polyfill';
import { storage } from './storage.js';
import { downloader } from './downloader.js';
import { filewall } from './filewall.js'
const browser = require('webextension-polyfill');

// filewall.downloadWithProgress({downloadUrl: 'https://www.ferc.gov/docs-filing/elibrary/larg-file.pdf'}).subscribe(
//     next => console.log('next', next),
//     err => console.log('err', err),
//     complete => console.log('complete')
// )

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

    storage.appDataAsync().then(data => {
        console.log('downloadItem', data)
        if (data.auto_secure_downloads === true) {
            for (const baseUrl of window.baseurls) {
                if (downloadItem.url.startsWith(baseUrl)) {
                    return;
                }
            }
            for (const autoSecureExcludeUrl of data.auto_secure_exclude_urls) {
                if (downloadItem.url.startsWith(autoSecureExcludeUrl)) { // url is excluded
                    return
                }
            }
            cancel_and_erase_downlad(downloadItem);
            download_to_memory(downloadItem.url);

        } else {
            console.log('data.auto_secure_downloads === false')
            let canceled = false;
            for (const autoSecureUrl of data.auto_secure_urls) {
                if (downloadItem.url.startsWith(autoSecureUrl)) { // url is included
                    cancel_and_erase_downlad(downloadItem);
                    download_to_memory(downloadItem.url);
                    canceled = true;
                    break;
                }
            }
            if (canceled == false && data.auto_cancel_insecure === true) {
                cancel_and_erase_downlad(downloadItem);
            }
        }
    });
});

// DETERMINE FILENAME
// browser.downloads.onDeterminingFilename.addListener(function (item, suggest) { });
// CATCH COMPLETED DOWNLOAD
browser.downloads.onChanged.addListener(function (downloadDelta) { });
// CATCH ERASE
browser.downloads.onErased.addListener(function (downloadId) { });



function download_to_memory(download_url) {
    let downloadItem = new DownloadItem(download_url);
    downloadItem.start_process();
    active_downloads.push(downloadItem);
    update_icon();
}
