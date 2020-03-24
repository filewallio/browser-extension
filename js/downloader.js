import { filewall } from './filewall.js'
import { BehaviorSubject } from 'rxjs';
import { storage } from './storage.js';
import { uuid } from 'uuidv4'
import { logout } from './authentication'
import { distinctUntilKeyChanged, filter, take } from 'rxjs/operators';

const browser = require('webextension-polyfill');

class Downloader {
    constructor() {
        this.activeDownloads = [];
        this.activeDownload$ = new BehaviorSubject([])
        this.catchedDownloads = {};
        this.wasConfirmedDirectUrls = {};
        // this.messages = []
        this.actions$ = new BehaviorSubject()
        this.lastId = 0;
        browser.runtime.onConnect.addListener( port => {
            if (port.name === 'active-downloads') {
                const subscription = this.activeDownload$.subscribe( activeDownloads => {
                    if (!activeDownloads) return
                    port.postMessage(activeDownloads)
                })
    
                port.onDisconnect.addListener( port => {
                    subscription.unsubscribe();
                })
            } else if (port.name === 'actions') {
                const subscription = this.actions$.subscribe( message => {
                    if (!message) return
                    port.postMessage(message)
                    // browser.browserAction.setBadgeText({text: '!'})
                })
    
                port.onDisconnect.addListener( port => {
                    subscription.unsubscribe();
                })
                port.onMessage.addListener( actions => {
                    console.log('actions to downloader', actions)
                    if (actions.find('clear')) {
                        this.actions$.next([])
                    }
                    browser.browserAction.setBadgeText({text: ''})
                })
            } else if (port.name === 'dialog') {
                // listen for messages from the dialog
            }

        })
        this.activeDownload$.subscribe( next => {
            const { length } = next
            if (length === 0) {
                browser.browserAction.setBadgeText({text: ''})
            } else {
                browser.browserAction.setBadgeBackgroundColor({color:'red'})
                browser.browserAction.setBadgeText({text: `${length}`})
            }
        })
        storage.onChange().pipe(
            distinctUntilKeyChanged('apiKey')
        ).subscribe( store => {
            const { apiKey, username } = store
            if (!apiKey) {
                browser.browserAction.setBadgeBackgroundColor({color:'DarkOrange'})
                browser.browserAction.setBadgeText({text: '?'})
            } else {
                browser.browserAction.setBadgeText({text: ''})
            }
        })
    }

    addCatchedDownload(downloadUrl) {
        console.log('addCatchedDownload', downloadUrl)
        var download_id = uuid();
        var dialogurl = browser.runtime.getURL("dialog/dialog.html") + "?download_id=" + download_id;
        this.catchedDownloads[download_id] = downloadUrl;
        this.sendMessageToActiveTab({target: "dialog", dialog_url: dialogurl, action: "show", dialog_id: download_id });
        setTimeout( () => {
            // todo this is not clever, whats the better way to close the dialog?
            chrome.tabs.query({}, function (tabs) {
                tabs.forEach(function (tab) {
                    chrome.tabs.sendMessage(tab.id, {target: "dialog", action: "hide", dialog_id: download_id });
                })
            });
            delete this.catchedDownloads[download_id];
        }, 60 * 1000); // hide or timeout after 60 sec.
    }

    wasConfirmedDirect(downloadUrl) {
        if (this.wasConfirmedDirectUrls[downloadUrl] === true) {
            delete this.wasConfirmedDirectUrls[downloadUrl];
            return true;
        }
        return false;
    }

    confirmCatchedDownload(download_id, action) {
        console.log("confirmCatchedDownload")
        if ( action === "direct") {
            this.wasConfirmedDirectUrls[this.catchedDownloads[download_id]] = true;
            browser.downloads.download({ url: this.catchedDownloads[download_id] });
            delete this.catchedDownloads[download_id];
        }
        if ( action === "filewall") {
            this.addDownload(this.catchedDownloads[download_id] );
            delete this.catchedDownloads[download_id];
        }
        this.sendMessageToActiveTab({target: "dialog", action: "hide", dialog_id: download_id});
    }

    onDeterminingFilename(url, filename) {
        console.log('onDeterminingFilename', url, filename)
        // todo use this filename if needed
    }

    addDownload(downloadUrl, filename) {
        // take text after last '/' as filename
        // TODO GET FILENAME FROM CONTENT DISPOSITION IN RESPONSE, if filename is not yet know via onDeterminingFilename
        if (!filename) {
            filename = downloadUrl.substring(downloadUrl.lastIndexOf('/') + 1);
        }

        let downloadItem = {
            downloadUrl,
            filename,
            id: this.lastId++
        }
        chrome.tabs.query({active: true}, function (tabs) {
            tabs.forEach(function (tab) {
                chrome.tabs.sendMessage(tab.id, { target: "animation", action: "start"});
            })
        });

        const downloadItemSubscription = filewall.process(downloadItem).subscribe( downloadItem => {
                this.updateStatus(downloadItem)
                const {status, filename, pollStatus} = downloadItem;
                this.activeDownload$.next( this.activeDownloads.map(this.sanitizeItem) )
                
                if (status === 'finished') {
                    console.log('downloaded', downloadItem)
                    chrome.tabs.query({active: true}, function (tabs) {
                        tabs.forEach(function (tab) {
                            chrome.tabs.sendMessage(tab.id, { target: "animation", action: "success"});
                        })
                    });

                    this.removeAciveDownload(downloadItem)
                    browser.downloads.download({
                        url: pollStatus.links.download,
                        filename: filename
                    });
                }
            }, response => {
                console.log('downloadItemSubscription error', response)
                const { error, status } = response
                this.updateStatus({
                    ...downloadItem,
                    error,
                    status
                })
                this.activeDownload$.next( this.activeDownloads.map(this.sanitizeItem) )
                console.log('errorMap', error);
                const errorMap = {
                    'auth_failed': async _ => {
                        // 304 Fobidden remove download-item
                        this.removeAciveDownload(downloadItem)
                        // show login menu in popup
                        this.actions$.next(['show-authentication'])
                        await logout()
                        storage.onChange().pipe(
                            distinctUntilKeyChanged('apiKey'),
                            filter( store => !!store.apiKey ),
                            take(1)
                        ).subscribe( _ => this.actions$.next([]) )
                    },
                    'default': _ => {
                    }
                };
                (errorMap[error] || errorMap['default'])()
            })
        downloadItem = {
            ...downloadItem,
            downloadItemSubscription
        }
        this.addActiveDownload(downloadItem)

    }
    addActiveDownload(downloadItem) {
        this.activeDownloads = [
            ...this.activeDownloads,
            downloadItem
        ]
        this.activeDownload$.next( this.activeDownloads.map(this.sanitizeItem) )
    }
    removeAciveDownload(downloadItem) {
        this.activeDownloads = this.activeDownloads.filter( x => x.id !== downloadItem.id )
        this.activeDownload$.next( this.activeDownloads.map(this.sanitizeItem) )
    }
    // removeDownload(downloadId) { }
    updateStatus(downloadItem) {
        const {id, status, progress, error} = downloadItem
        if (progress) {
            const { loaded, total, rate } = progress
            const percent = loaded && total && Math.round(100 * (loaded / total))
            // console.log(`item: ${id} statue: ${status} progress: ${percent} rate: ${rate}`)
        } else {
            console.log(`item: ${id} statue: ${status}`)
        }
        const item = this.activeDownloads.find( i => i.id === id)
        if (item) {
            item.status = status
            item.progress = progress
            item.error = error
        }
    }
    sanitizeItem(item) {
        const { downloadItemSubscription, ...rest } = item
        return rest
    }
    async sendMessageToActiveTab(message) {
        try {
            const [{id: activeTabId}] = await browser.tabs.query({ active: true, currentWindow: true });
            const response = await browser.tabs.sendMessage(activeTabId, message);
            return response;
        } catch {
            return false;
        }
    }
}
export let downloader = new Downloader();