import { storage } from './storage.js';


//
// ON INSTALL
//
browser.runtime.onInstalled.addListener(() => {
    ga('send', 'pageview', '/extension/install');
    console.log('on installed')

    storage.appDataAsync().then(data => {
        console.log('onInstalled', data)
        if (data.enable_context_menu === true) {
            browser.contextMenus.create({
                id: 'secure_download',
                title: 'Secure Download',
                type: 'normal',
                contexts: ['link'],
            });

            browser.contextMenus.onClicked.addListener((info, tab) => {
                if (info.menuItemId === 'secure_download') {
                    download_to_memory(info.linkUrl);
                }
            });
        } else {
            browser.contextMenus.remove('secure_download');
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
    console.log('on download')

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
browser.downloads.onDeterminingFilename.addListener(function (item, suggest) { });
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
