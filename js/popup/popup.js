const $ = document.querySelector.bind(document)
const $s = document.querySelectorAll.bind(document)
const browser = require('webextension-polyfill');

window.addEventListener('load', function () {
    console.log('in popup/popup.js')

    browser.runtime.connect({ name: 'active-downloads' })
        .onMessage.addListener( activeDownloads => {
            console.log('active-downloads', activeDownloads)
            renderDownloadItems(activeDownloads)
        })
    const messagePort = browser.runtime.connect({ name: 'messages' })
    messagePort.onMessage.addListener( message => {
        console.log('message', message)
        showMessage(message)
    })

    $('#options-open').addEventListener('click', e => {
        e.preventDefault()
        browser.runtime.openOptionsPage();
    })
    $('#clear-message').addEventListener('click', e => {
        hideMessage()
    })

    function renderDownloadItems(activeDownloads) {
        if (!activeDownloads) return
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

    function showMessage(messageCode) {
        const messages = {
            'too_many_requests': {
                header: 'Error',
                message: 'Slow down, you have initiated too many downloads.'
            },
            'auth_failed': {
                header: 'Error',
                message: 'Authorization failed please login and try again.'
            },
            'payment_required': {
                header: 'Error',
                message: 'Payment required to contine.'
            },
            'failed': {
                header: 'Failure',
                message: 'We failed to process your request. Please try again later.'
            }
        }
        const { header, message } = messages[messageCode]
        writeSlug('messageHeaderSlug', header)
        writeSlug('messageSlug', message)
        $('#items').style.display = 'none'
        $('#message').style.display = 'block'

    }
    function hideMessage() {
        $('#items').style.display = 'block'
        $('#message').style.display = 'none'
        writeSlug('messageHeaderSlug', '')
        writeSlug('messageSlug', '')
        messagePort.postMessage('clear')
    }
    function writeSlug(slugId, text) {
        $s(`.${slugId}`).forEach( slug => slug.textContent = text)
    }

});
