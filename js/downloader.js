import { filewall } from './filewall.js'
import { BehaviorSubject } from 'rxjs';

const browser = require('webextension-polyfill');

class Downloader {
    constructor() {
        this.activeDownloads = [];
        this.activeDownload$ = new BehaviorSubject()
        this.lastId = 0;
        this.port
        browser.runtime.onConnect.addListener( port => {
            this.port = port

            const subscription = this.activeDownload$.subscribe( activeDownloads => {
                port.postMessage(activeDownloads)
            })

            port.onMessage.addListener((msg) => {
            })

            port.onDisconnect.addListener( port => {
                subscription.unsubscribe();
            })
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
        
        const downloadItemSubscription = filewall.process(downloadItem).pipe(
                // tap( x => this.updateStatus(x) )
            ).subscribe( downloadItem => {
                this.updateStatus(downloadItem)
                const {status, filename, pollStatus} = downloadItem
                this.activeDownload$.next( this.activeDownloads.map(this.sanitizeItem) )
                
                if (status === 'finished') {
                    console.log('downloaded', downloadItem)
                    this.removeAciveDownload(downloadItem)
                    browser.downloads.download({
                        url: pollStatus.links.download,
                        filename: filename
                    });
                }
            }, response => {
                console.log('downloadItemSubscription error', response)
                const { error } = response
                if (error === 'too_many_requests') {
                    // tell user to slow down

                } else if (error === 'auth_failed') {
                    // show error to user
                    // sent user to login screen
                } else if (error === 'payment_required') {
                    // send user to payment page
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