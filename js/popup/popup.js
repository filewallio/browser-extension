import { login } from '../authentication'
import { storage } from '../storage'
import { html } from 'common-tags'
// import { bytes } from 'bytes';
const bytes = require('bytes')

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
    storage.onChange().subscribe( store => {
        const { apiKey, username } = store
        if (apiKey) {
            writeSlug('usernameSlug', username)
        } else {
            showAuthentication()
        }
        Object.keys(store).forEach( key => {
            $s(`div.option input[id='${key}']`)
                .forEach( input => setInputValue(input, store[key]))
        })
    })

    $('#options-open').addEventListener('click', e => {
        e.preventDefault()
        //browser.runtime.openOptionsPage();
        if($('#popup__options').style.display === "block"){
            $('#popup__options').style.display = 'none';
            $('#popup__options_back').style.display = 'none';
            $('#popup__bottom').style.display = 'block';
        }else{
            $('#popup__options').style.display = 'block';
            $('#popup__options_back').style.display = 'block';
            $('#popup__bottom').style.display = 'none';
        }


    })

    $('#popup__options_back').addEventListener('click', e => {
        e.preventDefault()
        $('#popup__options').style.display = 'none';
        $('#popup__options_back').style.display = 'none';
        $('#popup__bottom').style.display = 'block';

    })

    $('#clear-message').addEventListener('click', e => {
        hideMessage()
    })
    $('#logout').addEventListener('click', () => {
        storage.setAppData({
            apiKey: null,
            username: null
        }).then()
    })
    $s('div.option input[type="checkbox"]').forEach( el => {
        el.addEventListener( 'change', (event) => {
            const { name, checked } = event.target;
            storage.setAppData({
                [name]: checked
            })
        })
    });


    $('#login').addEventListener('click', () => {
        const username = $('#username')
        const password = $('#password')
        const { value: usernameVal } = username
        const { value: passwordVal } = password

        clearElement(password)
        setError(); // clear error
        login(usernameVal, passwordVal).then( () => {
            hideAuthentication()
            // clear login inputs
            clearElement(username)
        }).catch( error => {
            console.log('in error catch', error)
            if (error && error.error === 'auth_failed') {
                setError('invalid-creds')
            } else {
                setError('technical-error')
            }
            clearElement(username)
        })
    })

    function renderDownloadItems(activeDownloads) {
        if (!activeDownloads) return
        // build status
        const activeDownloadsHtml = activeDownloads.map(buildDownloadItemView).join('')
        
        $('#items').innerHTML = activeDownloadsHtml
        upgradeComponents()

    }

    function buildDownloadItemView(downloadItem) {
        
        const { downloadUrl, filename, id, status, progress } = downloadItem;
        let percentLoaded = '~';
        let transferRate = '';
        let loadedHumanReadable = '';
        let totalHumanReadable = '';
        let status_class = '';
        if (progress) {
            const { loaded, total, rate } = progress
            percentLoaded = Math.round(100 * (loaded / total))
            if (rate) {
                transferRate = `${bytes(rate, {unitsSeparator: ' ', decimalPlaces: 0})}/s`
            }
            if (loaded) {
                loadedHumanReadable = bytes(loaded, {unitsSeparator: ' ', decimalPlaces: 1})
            }
            if (total) {
                totalHumanReadable = bytes(total, {unitsSeparator: ' ', decimalPlaces: 0})
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

        if(status === 'processing' || status === 'waiting'){
            status_class = 'mdl-progress__indeterminate'
        }

        return html`
            <div class="download-item-grid download-item" id="download-item-${id}">
                <div class="download-item__icon">
                    <i class="fa fa-file-o fa-2x" aria-hidden="true"></i>
                </div>
                <div class="download-item__info-section">
                    <div class="download-item__filename">${filename}</div>
                    <div class="download-item__status">${ getStatusText(status, transferRate, loadedHumanReadable, totalHumanReadable) }</div>
                    <div class="download-item__progress">
                        <div class="mdl-progress ${status_class} mdl-js-progress" style="width:${percentLoaded}%;"></div>
                    </div>
                </div>
                <div class="download-item__close">
                    <i class="fa fa-times fa-2x" aria-hidden="true"></i>
                </div>
            </div>
        `
    }
    function getStatusText(status, transferRate, loadedHumanReadable, totalHumanReadable) {
        if (status === 'downloading-unsafe') {
            console.log('transferRate', transferRate, transferRate.length)
            return `Downloading${
                transferRate && ` - ${transferRate}`
            } - ${loadedHumanReadable} of ${totalHumanReadable}`;
        } else if (status === 'uploading') {
            console.log('transferRate', transferRate, transferRate.length)
            return `Uploading${
                transferRate && ` - ${transferRate}`
            } - ${loadedHumanReadable} of ${totalHumanReadable}`;
        } else if (status === 'processing') {
            return `Processing at filewall.io`;
        } else if (status === 'waiting') {
            return `Waiting - Upgrade your plan to process more files in parallel`;
        } else if (status === 'error') {
            return getErrorMessageText()
        } else {
            return '';
        }
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
    function hideAuthentication() {
        $('#options-open').style.display = 'block';
        $('#popup__bottom').style.display = 'block';
        $('.authentication').style.display = 'none'
    }
    function showAuthentication() {
        $('#popup__options').style.display = 'none';
        $('#popup__options_back').style.display = 'none';
        $('#popup__bottom').style.display = 'none';
        $('#options-open').style.display = 'none';
        $('.authentication').style.display = 'block';
    }
    function writeSlug(slugId, text) {
        $s(`.${slugId}`).forEach( slug => slug.textContent = text)
    }

    function clearElement(el) {
        el.value = ''
        el.parentElement.classList.remove('is-dirty')
    }
    function setError(loginError) {
        $s(`.login-error:not(#${loginError})`).forEach( el => el.style.display = 'none');
        if (loginError) {
            $(`#${loginError}`).style.display = 'block';
        }
    }
    function setInputValue(input, value) {
        if (typeof value === 'boolean') {
            const mdlCheckbox = input.parentElement.MaterialSwitch
            if (value) {
                mdlCheckbox.on()
            } else {
                mdlCheckbox.off()
            }
        } else {
            if (input.attributes['type'].value === 'range') input.MaterialSlider && input.MaterialSlider.change(value);
            else input.value = value;
        }
    }
    function getErrorMessageText(errorCode) {
        const messageMap = {
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
                message: 'Plan limit reached! Visit filewall.io to upgrade.'
            },
            'failed': {
                header: 'Failure',
                message: 'We failed to process your request. Please try again later.'
            }
        }
    }

});
