import { storage } from './storage.js'
import { environment } from './environment.js'
import { Observable, interval } from 'rxjs'
import { tap, map, timeInterval, mergeMap, filter, take } from 'rxjs/operators'

class Filewall {
    constructor() { }

    // handles uploading to filewall
    // async processBlob(downloadItem) {
    //     // get upload url
    //     const uploadAuth = await this.authorize();

    //     downloadItem = {
    //         ...downloadItem,
    //         uploadAuth
    //     }

    //     // upload blob to filewall for processing
    //     const uploadBlob = await this.upload(downloadItem)

    //     let status = {}
    //     while (status.status !== 'finished' && status.status !== 'failed') {
    //         status = await this.statusCheck(downloadItem)
    //         downloadItem = {
    //             ...downloadItem,
    //             status
    //         }
    //         console.log('status', status)
    //         await new Promise( r => setTimeout(r, 1000) )
    //     }
    //     return new Observable( obs => {
    //         obs.next(downloadItem)
    //     })
    // }
    process(downloadItem) {
        return new Observable( obs => {
            obs.next({status: 'downloading-unsafe', downloadItem})
            fetch(downloadItem.downloadUrl)
                .then( response => response.blob() )
                .then( blob => downloadItem = {...downloadItem, blob})
                .then( () => obs.next({status: 'authorizing', downloadItem}))
                .then( () => this.authorize() )
                .then( uploadAuth => downloadItem = { ...downloadItem, uploadAuth } )
                .catch( error => {
                    //TODO failed to authorize
                    obs.error();
                    obs.complete()
                })
                .then( () => obs.next({status: 'uploading', downloadItem}))
                .then( () => this.upload(downloadItem) )
                .catch( error => {
                    //TODO file upload to filewall failed
                    obs.error();
                    obs.complete()
                })
                .then( () => {
                    let lastStatus = '';
                    const intervalSubscription = interval(storage.appData.pollInterval).pipe(
                        take(storage.appData.pollTimout),
                        mergeMap( () => this.statusCheck(downloadItem) ),
                        filter( x => x.status !== lastStatus ),
                        tap( x => lastStatus = x.status ),
                        tap( pollStatus => downloadItem = { ...downloadItem, pollStatus })
                    ).subscribe( result => {
                        if (result.status === 'finished') {
                            intervalSubscription.unsubscribe()
                            obs.next({status: 'finished', downloadItem})
                            obs.complete()
                        } else if (result.status === 'failed') {
                            intervalSubscription.unsubscribe()
                            obs.next({status: 'failed', downloadItem})
                            obs.complete()
                        } else {
                            obs.next({status: result.status, downloadItem})
                        }
                    })
                })
        })
    }

    authorize() {
        return fetch(`${environment.baseUrl}/api/authorize`, {
            method: 'POST',
            headers: {
                apiKey: storage.appData.apiKey
            }
        })
            .then( r => r.json() )
            .catch( response => {
                // TODO: catch the errors: not authorized, some tech error, etc.
            })
    }
    upload(downloadItem) {
        return fetch(`${downloadItem.uploadAuth.links.upload}`, {
            method: 'POST',
            headers: {
                filename: downloadItem.filename,
            },
            body: downloadItem.blob
        })
            .then( r => r.json() )
            .catch( response => {
                // TODO: catch the errors: not authorized, some tech error, etc.
            })
    }
    statusCheck(downloadItem) {
        return fetch(`${downloadItem.uploadAuth.links.self}`, {
            method: 'GET',
            headers: {
                apiKey: storage.appData.apiKey,
            }
        })
            .then( r => r.json() )
    }
}
export let filewall = new Filewall();