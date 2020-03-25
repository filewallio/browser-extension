import { storage } from './storage.js'
import { environment } from './environment'
import { Subject, interval, Observable, of, throwError } from 'rxjs'
import {
    tap,
    mergeMap,
    filter,
    take,
    retryWhen,
    delay,
    distinctUntilKeyChanged,
    repeatWhen,
    takeWhile,
    scan,
    concatMap
} from 'rxjs/operators'
import { parse } from 'content-disposition-attachment'
const axios = require('axios').default

class Filewall {
    constructor() { }
    process(downloadItem) {
        const subject = new Subject()
        downloadItem = {...downloadItem, status: 'downloading-unsafe'}
        subject.next({...downloadItem})
        this.downloadWithProgress(downloadItem).subscribe( next => {
            if (next.filename) {
                const { filename } = next
                downloadItem = {...downloadItem, filename}
                subject.next({...downloadItem})
            } else if (next.type === 'progress') {
                subject.next( this.buildProgress(next, downloadItem) )
            } else {
                console.log('authorizing', next)
                downloadItem = {...downloadItem, blob: next}
                downloadItem = {...downloadItem, status: 'authorizing'}
                subject.next({...downloadItem})
                this.authorize().pipe(
                    tap(uploadAuth => downloadItem = { ...downloadItem, uploadAuth }),
                    tap(_ => downloadItem = {...downloadItem, status: 'uploading'}),
                    tap(({error}) => downloadItem = {...downloadItem, error}),
                    tap(_ => subject.next({...downloadItem})),
                    retryWhen( errors => errors.pipe(
                        tap(({error}) => downloadItem = {...downloadItem, error}),
                        tap(_ => subject.next({...downloadItem})),
                        delay(10000),
                        tap(_=> console.log('error: after'))
                    ))
                ).subscribe( () => {
                    this.uploadWithProgress(downloadItem).subscribe( next => {
                        if (next.type === 'progress') {
                            subject.next( this.buildProgress(next, downloadItem) )
                        } else {
                            const intervalSubscription = this.statusCheck(downloadItem).pipe(
                                this.repeatNTimes(storage.appData.pollTimout, storage.appData.pollInterval),
                                this.retryNTimes(storage.appData.pollRetryErrorCount, storage.appData.pollInterval),
                                distinctUntilKeyChanged('status'),
                                tap( pollStatus => downloadItem = {...downloadItem, pollStatus} )
                            ).subscribe( pollStatus => {
                                console.log('pollStatus', pollStatus)
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
                            }, error => {
                                intervalSubscription.unsubscribe()
                                subject.error({...downloadItem, status, error})
                                subject.complete()
                            })
                        }
                    }, error => {
                        subject.error({...downloadItem, error})
                        subject.complete()
                    })
                }, response => {
                    subject.error(response)
                    subject.complete()
                })
            }
        },
        error => subject.error(error)
        )
        return subject
    }

    authorize() {
        return new Observable( async observer => {
            try {
                let response = await fetch(`${environment.baseUrl}/api/authorize`, {
                    method: 'POST',
                    headers: {
                        apiKey: storage.appData.apiKey
                    }
                })
                const json = await response.json()
                if (response.status === 429) {
                    throw json
                }
                observer.next(json);
                observer.complete();

            } catch(error) {
                observer.error(error);
                observer.complete();
            }
        })
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
        return new Observable( observer => {
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
                        observer.next(progress)
                    } else {
                        observer.next(progress)
                        firstProgress = progress
                    }
                }
            })
            .then( response => {
                try {
                    const { attachment, filename } = parse(response.headers['content-disposition'])
                    if (attachment)
                        observer.next({ filename })

                } catch (error) {
                    console.log('filewall.js:downloadWithProgress could not parse content-disposition', error)
                }
                return response
            })
            .then( response => new Blob([response.data], {type: response.headers['content-type']}))
            .then( data => {
                observer.next(data);
                observer.complete();
            } )
            .catch( error => {
                const { response } = error
                observer.error(response);
                observer.complete();
            } )
        })
    }
    statusCheck(downloadItem) {
        return new Observable( async observer => {
            try {
                let response = await fetch(`${downloadItem.uploadAuth.links.self}`, {
                    method: 'GET',
                    headers: {
                        apiKey: storage.appData.apiKey,
                    }
                })
                const json = await response.json()
                if (response.status === 400) {
                    throw {
                        error: 'bad_request',
                        ...json
                    }
                }
                console.log('statusCheck::next')
                observer.next(json);
                observer.complete();

            } catch(error) {
                console.log('statusCheck::error')
                observer.error(error);
                observer.complete();
            }
        })
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
    retryNTimes(retryCount, retryInterval) {
        let lastError;
        return retryWhen( errors =>
            errors.pipe(
                delay(retryInterval), // delay retry for x time
                tap(({error}) => lastError = error),
                scan((acc, _) => acc + 1, 0),
                concatMap( v => v < retryCount ? of('retry') : throwError(lastError) )
        ))
    }
    repeatNTimes(repeatCount, repeatInterval) {
        return repeatWhen( notifications =>
            notifications.pipe(
                tap(tap => console.log('repeat:', tap)),
                delay(repeatInterval),
                take(repeatCount - 1),
            ))
    }
}
export let filewall = new Filewall();
