import { login } from '../authentication'
import { storage } from '../storage'
import { html, oneLine } from 'common-tags'
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
        
        const { filename, id, status, progress, error } = downloadItem;
        const { messageText, progressBarState, showCloseButton } = buildStateConfig({status, error, progress})
        const percentLoaded = calcPercentLoaded(progress) || 100

        return html`
            <div class="download-item" id="download-item-${id}">
                <div class="download-item__icon">
                    <i class="fa fa-file-o fa-2x" aria-hidden="true"></i>
                </div>
                <div class="download-item__info-section">
                    <div class="download-item__filename">${filename}</div>
                    <div class="download-item__status">${messageText}</div>
                    <div class="download-item__progress">
                        <div class="mdl-progress ${progressBarState} mdl-js-progress" style="width:${percentLoaded}%;"></div>
                    </div>
                </div>
                <div class="download-item__close">
                    ${showCloseButton && html`
                        <i class="fa fa-times fa-2x" aria-hidden="true"></i>
                    `}
                </div>
            </div>
        `
    }
    function buildStateConfig({status, error, progress}) {
        const stateMap = {
            'downloading-unsafe': _ => ({
                messageText: `Downloading ${buildProgressString(progress)}`,
                progressBarState: '',
                showCloseButton: true
            }),
            'uploading': _ => ({
                messageText: `Uploading ${buildProgressString(progress)}`,
                progressBarState: '',
                showCloseButton: true
            }),
            'processing': _ => ({
                messageText: `Processing at filewall.io`,
                progressBarState: 'mdl-progress__indeterminate',
                showCloseButton: false
            }),
            'waiting': _ => ({
                messageText: `Waiting - Upgrade your plan to process more files in parallel`,
                progressBarState: 'mdl-progress__indeterminate',
                showCloseButton: false
            }),
            'failed': _ => ({
                messageText: `File could not be converted into secure format, sorry`,
                progressBarState: '',
                showCloseButton: true
            }),
            'too_many_requests': _ => ({
                messageText: `Waiting - Upgrade your plan to process more files in parallel`,
                progressBarState: '',
                showCloseButton: true
            }),
            'auth_failed': _ => ({
                messageText: `Authorization failed please login and try again`,
                progressBarState: '',
                showCloseButton: true
            }),
            'payment_required': _ => ({
                messageText: `Plan limit reached! Visit <a href="https://filewall.io">filewall.io</a> to upgrade`,
                progressBarState: '',
                showCloseButton: true
            }),
            'failed': _ => ({
                messageText: `We failed to process your request. Please try again later`,
                progressBarState: '',
                showCloseButton: true
            }),
            'default': _ => ({
                messageText: `An error occured: ${error}, try again later`,
                progressBarState: '',
                showCloseButton: true
            })
        }
        // if error take error code otherwise take status code, fallback to 'default'
        return (stateMap[error || status] || stateMap['default'])();
    }
    function calcPercentLoaded(progress) {
        const { loaded, total } = progress || {}
        return Math.round(100 * (loaded / total))
    }
    function buildProgressString(progress) {
        const { loaded, total, rate } =  progress || {}
        let transferRate
        let loadedHumanReadable
        let totalHumanReadable
        if (rate) {
            transferRate = bytes(rate, {unitsSeparator: ' ', decimalPlaces: 0})
        }
        if (loaded) {
            loadedHumanReadable = bytes(loaded, {unitsSeparator: ' ', decimalPlaces: 1})
        }
        if (total) {
            totalHumanReadable = bytes(total, {unitsSeparator: ' ', decimalPlaces: 0})
        }
        return oneLine`
            ${transferRate ? ` - ${transferRate}/s` : ''}
             - ${loadedHumanReadable} of ${totalHumanReadable}
        `
    }
    function getErrorMessageText(errorCode) {
        const messageMap = {
            'too_many_requests': {
                header: 'Error',
                message: 'Waiting - Upgrade your plan to process more files in parallel'
            },
            'auth_failed': {
                header: 'Error',
                message: 'Authorization failed please login and try again.'
            },
            'payment_required': {
                header: 'Error',
                message: 'Plan limit reached! Visit <a href="https://filewall.io">filewall.io</a> to upgrade.'
            },
            'failed': {
                header: 'Failure',
                message: 'We failed to process your request. Please try again later.'
            }
        }
        if (messageMap[errorCode]) {
            return messageMap[errorCode].message;
        } else {
            return `An error occured: ${errorCode}, try again later`;
        }
    }
    function upgradeComponents() {

        $s('.mdl-progress').forEach( el => {
            componentHandler.upgradeElement(el)
        } )
    }

    function showMessage(messageCode) {
        const { header, message } = getErrorMessageText(messageCode)
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

});
