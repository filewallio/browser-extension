import { filewall } from './filewall.js'
import { ReplaySubject } from 'rxjs';
import { tap } from 'rxjs/operators';

const browser = require('webextension-polyfill');

class Downloader {
    constructor() {
        this.activeDownloads = [];
        this.activeDownload$ = new ReplaySubject()
        // setInterval(_ => this.activeDownload$.next(['one', 'two', 'three']), 2000)
        this.lastId = 0;
        this.port
        console.log('Downloader is init')
        browser.runtime.onConnect.addListener( port => {
            this.port = port

            const subscription = this.activeDownload$.subscribe( activeDownloads => {
                console.log('Downloader activeDownloads', activeDownloads)
                port.postMessage(activeDownloads)
            })

            port.onMessage.addListener((msg) => {
                console.log('Downloader onMessage', msg);
                port.postMessage('message to Popup.js');
            })

            port.onDisconnect.addListener( port => {
                console.log('Downloader onDisconnect', port);
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
            }, error => {
                if (status === 'failed') {
                    this.removeAciveDownload(error)
                }
            }, () => { })
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
            const { loaded, total } = progress
            const percent = loaded && total && Math.round(100 * (loaded / total))
            console.log(`item: ${id} statue: ${status} progress: ${percent}`)
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