const $ = document.querySelector.bind(document)
const $s = document.querySelectorAll.bind(document)
const browser = require('webextension-polyfill');

window.addEventListener('load', function () {
    console.log('in popup/popup.js')
    const port = browser.runtime.connect({ name: 'active-downloads' });
    port.onMessage.addListener( activeDownloads => {
        console.log('Popup message recieved', activeDownloads);
        renderDownloadItems(activeDownloads)
    });
    port.onDisconnect.addListener( port => {
        console.log('Popup onDisconnect', port);
    })

    $('#options-open').addEventListener('click', e => {
        e.preventDefault()
        browser.runtime.openOptionsPage();
    })

    function renderDownloadItems(activeDownloads) {
        // build status
        const activeDownloadsHtml = activeDownloads.map(buildDownloadItemView).join('')
        
        $('#items').innerHTML = activeDownloadsHtml
        upgradeComponents()

    }

    function buildDownloadItemView(downloadItem) {
        
        const { downloadUrl, filename, id, status, progress } = downloadItem
        let percentLoaded = '~'
        let transferRate = ''
        if (progress) {
            const { loaded, total, rate } = progress
            percentLoaded = Math.round(100 * (loaded / total))
            if (rate) {
                transferRate = ` - ${Math.round( (rate * 1000) / 1024 )} KB/s`
            }
        }
        const stateOrder = {
            'downloading-unsafe': 10,
            'progress': 20,
            'authorizing': 30,
            'uploading': 50,
            'processing': 75,
            'waiting': 75,
            'finished': 100
        }

        return `
            <div class="download-item-grid download-item" id="download-item-${id}">
                <div class="download-item__icon">
                    <i class="fa fa-file-o fa-2x" aria-hidden="true"></i>
                </div>
                <div class="download-item__filename center">${filename}${transferRate}</div>
                <div class="download-item__progress center">
                    <div class="mdl-progress mdl-js-progress" style="width:${stateOrder[status]}%;"></div>
                </div>
                <div class="download-item__close">
                    <i class="fa fa-times-circle-o fa-2x" aria-hidden="true"></i>
                </div>
            </div>
        `
    }
    function upgradeComponents() {

        $s('.mdl-progress').forEach( el => {
            componentHandler.upgradeElement(el)
        } )
    }

});
