import { login } from '../authentication'
import { storage } from '../storage'

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
        if (!apiKey) {
            showAuthentication()
        }else{
            $('#bottom__username').innerHTML = store["username"]
            $('#usernameSlug').innerHTML = store["username"]
        }
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

    var el_ctxm = $('#enable-context-menu');
    storage.appDataAsync().then( store => el_ctxm.checked = store[el_ctxm.name] );
    el_ctxm.addEventListener( 'change', (event) => {
        const { name, checked } = event.target;
        storage.setAppData({
            [name]: checked
        })
    })

    var el_catchall = $('#catch-all-downloads');
    storage.appDataAsync().then( store => el_catchall.checked = store[el_catchall.name] );
    el_catchall.addEventListener( 'change', (event) => {
        const { name, checked } = event.target;
        storage.setAppData({
            [name]: checked
        })
    })

    storage.appDataAsync().then( store => {
        $('#bottom__username').innerHTML = store["username"];
        $('#usernameSlug').innerHTML = store["username"];
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
        let status_class = '';
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

        if(status === 'processing' || status === 'waiting'){
            status_class = 'mdl-progress__indeterminate'
        }

        return `
            <div class="download-item-grid download-item" id="download-item-${id}">
                <div class="download-item__icon">
                    <i class="fa fa-file-o fa-2x" aria-hidden="true"></i>
                </div>
                <div class="download-item__filename center">${filename}${transferRate}</div>
                <div class="download-item__progress center">
                    <div class="mdl-progress ${status_class} mdl-js-progress" style="width:${percentLoaded}%;"></div>
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

});
