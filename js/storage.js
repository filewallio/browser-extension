class Storage {
    constructor() {
        this.initInProgress = false;
        this.init = null;
        this.isDataInit = false;
        this.appData = {
            schemaVersion: '0.0.1',
            apiKey: '577123ae-4821-4bc8-a8c2-a510b96f47d8',
            username: '',
            baseUrl: '',
            enable_context_menu: true,
            auto_secure_downloads: false,
            auto_cancel_insecure: false,
            auto_secure_urls: [],
            auto_secure_exclude_urls: []
        }
        this.initDataItems();
    }

    appDataAsync() {
        return new Promise( resolve => {
            if (this.isDataInit) {
                resolve(this.appData)
            } else if (this.initInProgress) {
                console.log('} else if (this.initIsProgress) {')
                return this.init.then( () => resolve(this.appData) );
            } else {
                this.initDataItems().then( () => resolve(this.appData) )
            }
        })
    }

    initDataItems() {
        this.initInProgress = true;
        this.init = new Promise( (resolve, reject) => {
            const dataItems = [
                'schemaVersion',
                'baseurl',
                'username',
                'apiKey',
                'enable_context_menu',
                'auto_secure_downloads',
                'auto_cancel_insecure',
                'auto_secure_urls',
                'auto_secure_exclude_urls'
            ];
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
}
export let storage = new Storage();