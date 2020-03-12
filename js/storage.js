import { Observable } from 'rxjs';
const browser = require('webextension-polyfill');

class Storage {
    constructor() {
        this.initInProgress = false;
        this.init = null;
        this.isDataInit = false;
        this.appData = {
            'schemaVersion': '1',
            'apiKey': '',
            'username': '',
            'baseUrl': '',
            'enable-context-menu': true,
            'catch-all-downloads': false,
            //'auto_secure_downloads': false,
            //'auto_cancel_insecure': false,
            //'auto_secure_urls': [],
            //'auto_secure_exclude_urls': [],
            'pollInterval': 3 * 1000, // 3 seconds
            'pollTimout': 220 // 3 seconds * 220 = 11 minute timeout
        }
        this.initDataItems();
        this.onChange().subscribe( store => this.appData = store )
    }

    appDataAsync() {
        return new Promise( resolve => {
            if (this.isDataInit) {
                resolve(this.appData)
            } else if (this.initInProgress) {
                return this.init.then( () => resolve(this.appData) );
            } else {
                this.initDataItems().then( () => resolve(this.appData) )
            }
        })
    }
    setAppData(newAppData) {
        return browser.storage.sync.set(newAppData).then()
    }

    getAppData() {
        const dataItems = Object.keys(this.appData);
        return browser.storage.sync.get(dataItems)
    }

    initDataItems() {
        this.initInProgress = true;
        this.init = new Promise( (resolve, reject) => {
            const dataItems = Object.keys(this.appData);
            browser.storage.sync.get(dataItems).then(data => {
                // restore settings synced to user account
                this.appData = {
                    ...this.appData,
                    ...data
                };
        
                browser.storage.sync.set(this.appData).catch(() => {
                    console.error('failed to save data to browser storage');
                    reject();
                    this.initInProgress = false;
                }).then(() => {
                    this.isDataInit = true;
                    resolve(this.appData);
                    this.initInProgress = false;
                    console.log('Storage: loaded appData with schema version:', this.appData.schemaVersion)
                });
            });
        });
        return this.init;
    }
    onChange() {
        return new Observable( observer => {
            // onChangeObserver = observer;
            // get().then( store => initSpeedInStorage(store) ).then( store => observer.next(store) );

            browser.storage.onChanged.addListener( (changes, areaName) => {
                if (areaName === 'sync') {
                    this.getAppData().then( store => observer.next(store) )
                }
            });
            this.getAppData().then( store => observer.next(store) )
        });
    }
}
export let storage = new Storage();