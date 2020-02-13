import { filewall } from './filewallModule.js'
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
            tap( x => this.updateStatus(x) )
        ).subscribe( downloadItem => {
            const {status, filename, pollStatus} = downloadItem

            console.log(`item: ${filename} poll: ${status}`)
            // console.log('downloads', this.activeDownloads)

            this.activeDownload$.next(this.activeDownloads.map(
                ({id, downloadUrl, filename, status}) => ({id, downloadUrl, filename, status})
            ))

            if (status === 'finished') {
                this.removeAciveDownload(downloadItem)
                browser.downloads.download({
                    url: pollStatus.links.download,
                    filename: filename
                });
            }
            if (status === 'failed') {
                this.removeAciveDownload(downloadItem)
            }
        })
        downloadItem = {
            ...downloadItem,
            downloadItemSubscription
        }
        this.addActiveDownload(downloadItem)
        // fetch(downloadUrl)
        //     .then( response => response.blob() )
        //     .then( blob => {
        //         console.log('here is a blob', blob)
        //         downloadItem = {
        //             ...downloadItem,
        //             blob
        //         }
        //         // console.log(filewall.processBlob(downloadItem).then(console.log))
        //         filewall.process(downloadItem).subscribe( ({status, downloadItem}) => {
        //             console.log(`item: ${downloadItem.uploadAuth && downloadItem.uploadAuth.uid} poll: ${status}`)
        //         })

            // })
            // .then( downloadUrl => {
            //     console.log(downloadUrl, downloadItem)
            //     browser.downloads.download({
            //         url: downloadUrl,
            //         filename: downloadItem.filename
            //     });
            // })

    }
    addActiveDownload(downloadItem) {
        this.activeDownloads = [
            ...this.activeDownloads,
            downloadItem
        ]
        this.activeDownload$.next(this.activeDownloads.map(
            ({id, downloadUrl, filename, status}) => ({id, downloadUrl, filename, status})
        ))
    }
    removeAciveDownload(downloadItem) {
        this.activeDownloads = this.activeDownloads.filter( x => x.id !== downloadItem.id )
        this.activeDownload$.next(this.activeDownloads.map(
            ({id, downloadUrl, filename, status}) => ({id, downloadUrl, filename, status})
        ))
    }
    removeDownload(downloadId) {

    }
    updateStatus({id, status}) {
        const item = this.activeDownloads.find( i => i.id === id)
        if (item) {
            item.status = status
        }
    }
}
export let downloader = new Downloader();