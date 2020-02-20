import { storage } from './storage.js'
import { environment } from './environment.js'
import { Subject, interval, Observable } from 'rxjs'
import { tap, mergeMap, filter, take } from 'rxjs/operators'

const axios = require('axios').default
class Filewall {
    constructor() { }
    process(downloadItem) {
        const subject = new Subject()
        downloadItem = {...downloadItem, status: 'downloading-unsafe'}
        subject.next({...downloadItem})
        this.downloadWithProgress(downloadItem).subscribe( next => {
            if (next.type === 'progress') {
                subject.next( this.buildProgress(next, downloadItem) )
            } else {
                console.log('authorizing', next)
                downloadItem = {...downloadItem, blob: next}
                downloadItem = {...downloadItem, status: 'authorizing'}
                subject.next({...downloadItem})
                this.authorize()
                    .then( uploadAuth => downloadItem = { ...downloadItem, uploadAuth } )
                    .catch( error => subject.error(error) ) // error handling
                    .then( () => {
                        downloadItem = {...downloadItem, status: 'uploading'}
                        subject.next({...downloadItem})
                    } )
                    .then( () => {
                        this.uploadWithProgress(downloadItem).subscribe( next => {
                            if (next.type === 'progress') {
                                subject.next( this.buildProgress(next, downloadItem) )
                            } else {
                                let lastStatus = '';
                                console.log('start polling', storage.appData.pollTimout)
                                const intervalSubscription = interval(storage.appData.pollInterval).pipe(
                                    take(storage.appData.pollTimout),
                                    mergeMap( () => this.statusCheck(downloadItem) ),
                                    filter( x => x.status !== lastStatus ),
                                    tap( x => lastStatus = x.status ),
                                    tap( pollStatus => downloadItem = {...downloadItem, pollStatus} )
                                ).subscribe( ({status}) => {
                                    if (status === 'finished') {
                                        intervalSubscription.unsubscribe()
                                        subject.next({...downloadItem, status: 'finished'})
                                        subject.complete()
                                    } else if (status === 'failed') {
                                        intervalSubscription.unsubscribe()
                                        subject.next({...downloadItem, status: 'failed'})
                                        subject.complete()
                                    } else {
                                        subject.next({...downloadItem, status})
                                    }
                                })
                            }
                        })
                    })
            }
        },
        error => subject.error(error)
        )
        return subject
    }

    authorize() {
        return fetch(`${environment.baseUrl}/api/authorize`, {
            method: 'POST',
            headers: {
                apiKey: storage.appData.apiKey
            }
        })
            .then( r => r.json() )
    }
    uploadWithProgress(downloadItem) {
        return new Observable( obs => {
            let firstProgress
            axios({
                method: 'POST',
                baseURL: `${downloadItem.uploadAuth.links.upload}`,
                data: downloadItem.blob,
                onUploadProgress: progress => {
                    if (firstProgress) {
                        const { timeStamp: firstTimeStamp } = firstProgress
                        const { loaded, total, timeStamp } = progress
                        const rate = loaded / (timeStamp - firstTimeStamp)
                        progress.rate = rate
                        obs.next(progress)
                    } else {
                        obs.next(progress)
                        firstProgress = progress
                    }
                },
                headers: {
                    filename: downloadItem.filename,
                    'content-type': downloadItem.blob.type
                }
            })
            .then( data => {
                obs.next(data)
                obs.complete()
            })
            .catch( data => obs.error(data) )
        })
    }
    downloadWithProgress(downloadItem) {
        return new Observable( obs => {
            let firstProgress
            return axios({
                method: 'GET',
                responseType: 'arraybuffer',
                baseURL: `${downloadItem.downloadUrl}`,
                onDownloadProgress: progress => {
                    if (firstProgress) {
                        const { timeStamp: firstTimeStamp } = firstProgress
                        const { loaded, total, timeStamp } = progress
                        const rate = loaded / (timeStamp - firstTimeStamp)
                        progress.rate = rate
                        obs.next(progress)
                    } else {
                        obs.next(progress)
                        firstProgress = progress
                    }
                }
            })
            .then( response => new Blob([response.data], {type: response.headers['content-type']}))
            .then( data => {
                obs.next(data)
                obs.complete()
            } )
            .catch( error => obs.error(error) )
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
    buildProgress(progressEvent, downloadItem) {
        const { loaded, total, timeStamp, rate } = progressEvent
        return {
            ...downloadItem,
            progress: {
                loaded,
                total,
                timeStamp,
                rate
            }
        }
    }
}
export let filewall = new Filewall();