import { filewall } from './filewallModule.js'
class Downloader {
    constructor() {
        this.activeDownloads = [];
        this.lastId = 0;
    }

    addDownload(downloadUrl) {
        // take text after last '/' as filename
        const filename = downloadUrl.substring(downloadUrl.lastIndexOf('/') + 1);

        let downloadItem = {
            downloadUrl,
            filename,
            id: this.lastId++
        }
        
        const downloadItemSubscription = filewall.process(downloadItem).subscribe( ({status, downloadItem}) => {
            console.log(`item: ${downloadItem.filename} poll: ${status}`)
            console.log('downloads', this.activeDownloads)

            if (status === 'finished') {
                this.activeDownloads = this.activeDownloads.filter( x => x.id !== downloadItem.id )
                    browser.downloads.download({
                        url: downloadItem.pollStatus.links.download,
                        filename: downloadItem.filename
                    });
            }
            if (status === 'failed') {
                this.activeDownloads = this.activeDownloads.filter( x => x.id !== downloadItem.id )
            }
        })
        downloadItem = {
            ...downloadItem,
            downloadItemSubscription
        }
        this.activeDownloads = [
            ...this.activeDownloads,
            downloadItem
        ]
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
    removeDownload(downloadId) {

    }
}
export let downloader = new Downloader();