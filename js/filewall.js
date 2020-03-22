import { storage } from './storage.js'
import { environment } from './environment'
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
                                const intervalSubscription = interval(storage.appData.pollInterval).pipe(
                                    take(storage.appData.pollTimout),
                                    mergeMap( () => this.statusCheck(downloadItem) ),
                                    filter( x => x.status !== lastStatus ),
                                    tap( x => lastStatus = x.status ),
                                    tap( pollStatus => downloadItem = {...downloadItem, pollStatus} )
                                ).subscribe( pollStatus => {
                                    const {status, error} = pollStatus
                                    if (status === 'finished') {
                                        intervalSubscription.unsubscribe()
                                        subject.next({...downloadItem, status: 'finished'})
                                        subject.complete()
                                    } else if (status === 'failed') {
                                        intervalSubscription.unsubscribe()
                                        subject.error({...downloadItem, status, error})
                                        subject.complete()
                                    } else {
                                        subject.next({...downloadItem, status})
                                    }
                                })
                            }
                        }, error => {
                            subject.error({...downloadItem, error})
                            subject.complete()
                        })
                    })
                    .catch( response => {
                        subject.error(response)
                        subject.complete()
                    })
            }
        },
        error => subject.error(error)
        )
        return subject
    }

    async authorize() {
        const response = await fetch(`${environment.baseUrl}/api/authorize`, {
            method: 'POST',
            headers: {
                apiKey: storage.appData.apiKey
            }
        })
        const responseJson = await response.json()
        const { error } = responseJson
        if (error) {
            console.log('authorize:error', {error})
            throw { error }
        }
        return responseJson;
    }
    uploadWithProgress(downloadItem) {
        return new Observable(async obs => {
            try {
                let firstProgress;
                const response = await axios({
                    method: 'POST',
                    baseURL: `${downloadItem.uploadAuth.links.upload}`,
                    data: downloadItem.blob,
                    headers: {
                        filename: downloadItem.filename,
                        'content-type': downloadItem.blob.type
                    },
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
                    }
                })
                console.log('uploadWithProgress::success ')
                obs.next(response);
                obs.complete();
            } catch (axiosError) {
                const { response: {data: {error}} } = axiosError
                console.log('uploadWithProgress::error ', error)
                obs.error(error);
                obs.complete();
            }
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
                obs.next(data);
                obs.complete();
            } )
            .catch( error => {
                const { response } = error
                obs.error(response);
                obs.complete();
            } )
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