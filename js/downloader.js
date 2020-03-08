import { filewall } from './filewall.js'
import { BehaviorSubject } from 'rxjs';
import { storage } from './storage.js';

const browser = require('webextension-polyfill');

class Downloader {
    constructor() {
        this.activeDownloads = [];
        this.activeDownload$ = new BehaviorSubject([])
        // this.messages = []
        this.message$ = new BehaviorSubject()
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
            } else if (port.name === 'messages') {
                const subscription = this.message$.subscribe( message => {
                    if (!message) return
                    port.postMessage(message)
                    browser.browserAction.setBadgeText({text: '!'})
                })
    
                port.onDisconnect.addListener( port => {
                    subscription.unsubscribe();
                })
                port.onMessage.addListener( message => {
                    console.log('message recieced to downloader')
                    if (message === 'clear') {
                        this.message$.next('')
                    }
                    browser.browserAction.setBadgeText({text: ''})
                    // const [ message, ...rest ] = this.messages
                    // this.messages = rest
                })
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
        storage.onChange().subscribe( store => {
            const { apiKey, username } = store
            if (!apiKey) {
                browser.browserAction.setBadgeBackgroundColor({color:'DarkOrange'})
                browser.browserAction.setBadgeText({text: '?'})
            } else {
                browser.browserAction.setBadgeText({text: ''})
            }
        })
    }

    addDownload(downloadUrl) {
        // take text after last '/' as filename
        const filename = downloadUrl.substring(downloadUrl.lastIndexOf('/') + 1);

        let downloadItem = {
            downloadUrl,
            filename,
            id: this.lastId++
        }

        chrome.tabs.query({active: true}, function (tabs) {
            tabs.forEach(function (tab) {
                chrome.tabs.sendMessage(tab.id, ["animation", "start"]);
            })
        });

        const downloadItemSubscription = filewall.process(downloadItem).pipe(
                // tap( x => this.updateStatus(x) )
            ).subscribe( downloadItem => {
                this.updateStatus(downloadItem)
                const {status, filename, pollStatus} = downloadItem
                this.activeDownload$.next( this.activeDownloads.map(this.sanitizeItem) )
                
                if (status === 'finished') {
                    console.log('downloaded', downloadItem)
                    chrome.tabs.query({active: true}, function (tabs) {
                        tabs.forEach(function (tab) {
                            chrome.tabs.sendMessage(tab.id, ["animation", "success"]);
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
                if (error === 'too_many_requests') {
                    // tell user to slow down
                    this.message$.next('too_many_requests')

                } else if (error === 'auth_failed') {
                    // show error to user
                    this.message$.next('auth_failed')
                    // sent user to login screen
                } else if (error === 'payment_required') {
                    // send user to payment page
                    this.message$.next('payment_required')
                } else if (status === 'failed') {
                    // tell user it failed and to try again
                    this.message$.next('failed')
                }
                this.removeAciveDownload(downloadItem)
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
    removeDownload(downloadId) { }
    updateStatus(downloadItem) {
        const {id, status, progress} = downloadItem
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
        }
    }
    sanitizeItem(item) {
        const { downloadItemSubscription, ...rest } = item
        return rest
    }
}
export let downloader = new Downloader();