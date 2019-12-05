'use strict';


//
// ON INSTALL
//
chrome.runtime.onInstalled.addListener(function () {
    ga('send', 'pageview', '/chrome-extension/install');

    let auto_secure_urls = [];
    let auto_secure_exclude_urls = [];

    chrome.storage.sync.get(["baseurl", "username", "apikey", "enable_context_menu", "auto_secure_downloads", "auto_cancel_insecure", "auto_secure_urls", "auto_secure_exclude_urls"], function (data) {
        if(data.baseurl  === undefined){ data.baseurl  = window.baseurl; }
        if(data.username === undefined){ data.username = ""; }
        if(data.apikey   === undefined){ data.apikey   = ""; }
        if(data.enable_context_menu      === undefined){ data.enable_context_menu      = true; }
        if(data.auto_secure_downloads    === undefined){ data.auto_secure_downloads    = false; }
        if(data.auto_cancel_insecure     === undefined){ data.auto_cancel_insecure     = false; }
        if(data.auto_secure_urls         === undefined){ data.auto_secure_urls         = auto_secure_urls; }
        if(data.auto_secure_exclude_urls === undefined){ data.auto_secure_exclude_urls = auto_secure_exclude_urls; }

        window.apikey  = data.apikey;
        window.baseurl = data.baseurl;

        if(data.enable_context_menu == true){
            chrome.contextMenus.create({
                id      : "secure_download",
                title   : "Secure Download",
                type    : 'normal',
                contexts: ['link'],
            });

            chrome.contextMenus.onClicked.addListener(function (info, tab) {

                switch (info.menuItemId) {
        
                    case "secure_download":
                        download_to_memory(info.linkUrl);
                        break;
                }
            });
        }else{
            chrome.contextMenus.remove("secure_download");
        }

        chrome.storage.sync.set(data, function () { });

    });

    chrome.browserAction.setBadgeBackgroundColor({ color: [0, 99, 255, 230] });


});


//
// INTERCEPT DOWNLOADS
//

// CREATE
chrome.downloads.onCreated.addListener(function (chromeDownloadItem) {

    chrome.storage.sync.get(["auto_secure_downloads", "auto_cancel_insecure", "auto_secure_urls", "auto_secure_exclude_urls" ], function (data) {
        if (data.auto_secure_downloads === true) {
            for (let index in window.baseurls){
                if (chromeDownloadItem.url.startsWith(window.baseurls[index])){ 
                    return 
                }
            }
            for (let index in data.auto_secure_exclude_urls) {
                if (chromeDownloadItem.url.startsWith(data.auto_secure_exclude_urls[index])){ // url is excluded
                    return 
                }
            }
            cancel_and_erase_downlad(chromeDownloadItem);
            download_to_memory(chromeDownloadItem.url);

        } else {
            let canceled = false;
            for (let index in data.auto_secure_urls) {
                if (chromeDownloadItem.url.startsWith(data.auto_secure_urls[index])){ // url is included
                    cancel_and_erase_downlad(chromeDownloadItem);
                    download_to_memory(chromeDownloadItem.url);
                    canceled = true;
                    break;
                }
            }
            if(canceled == false && data.auto_cancel_insecure === true){
                cancel_and_erase_downlad(chromeDownloadItem.url);
            }
        }
    });
});

// DETERMINE FILENAME
chrome.downloads.onDeterminingFilename.addListener(function (item, suggest) {});
// CATCH COMPLETED DOWNLOAD
chrome.downloads.onChanged.addListener(function (downloadDelta) {});
// CATCH ERASE
chrome.downloads.onErased.addListener(function (downloadId) {});



function download_to_memory(download_url) {
    let downloadItem = new DownloadItem(download_url);
    downloadItem.start_process();
    active_downloads.push(downloadItem);
    update_icon();
}














/*


//
// Do something to each page
//
chrome.tabs.onUpdated.addListener(function (tabId, changeInfo, tab) {
    if (tab.url.startsWith("##test")) {
         }
    if (tab.url.startsWith("https://www.heise.de")) {
        //alert("heise");
    }
    if (changeInfo.status == 'complete') {
    }
});

function update_icon(nr_of_downloads) {
    if (nr_of_downloads == 0) {
        chrome.browserAction.setBadgeText({ text: "" });
    } else {
        chrome.browserAction.setBadgeText({ text: "" + nr_of_downloads });
    }
}
*/




/*
 overwrite filename
    //suggest({filename: downloads[item.id].tmp_filename});// overwrite filename

    if(downloads[downloadDelta.id] !== undefined){           // intercepted download
        if(downloadDelta.state !== undefined){               // state change
            if(downloadDelta.state.current === "complete"){  // finished
                chrome.downloads.search( { "id": downloadDelta.id }, function(results) {
                    let downloadItem = results[0];
                    if(downloadItem !== undefined){          // download item still exists
                        if(downloadItem.state == "complete"){// download finished and ok
                            // TODO
                            read_file(downloadItem);
                        }
                    }
                });
            }
        }
    }

    let url = downloadItem.finalUrl;
    return;
        if(downloadItem.state == "complete"){
        chrome.downloads.removeFile(downloadItem.id);
    }
    chrome.downloads.cancel(downloadItem.id);




function updated_downloadItem(downloadItem) {

    return
    let exists = false;
    for (let index in active_downloads) {
        if (active_downloads[index].id == downloadItem.id) {
            active_downloads[index] = downloadItem;
            exists = true;
            break;
        }
    };
    if (exists == false) {
        active_downloads.push(downloadItem);
    }

    update_icon(active_downloads.length);
    return;
    let views = chrome.extension.getViews({ type: "popup" });
    for (let i = 0; i < views.length; i++) {
        views[i].document.getElementById('download_' + downloadItem.id + '_loaded').innerHTML = downloadItem.loaded;
        views[i].document.getElementById('download_' + downloadItem.id + '_total').innerHTML = downloadItem.total;
        views[i].document.getElementById('download_' + downloadItem.id + '_url').innerHTML = downloadItem.url;
        views[i].document.getElementById('download_' + downloadItem.id + '_state').innerHTML = downloadItem.state;
    }


}











*/



