import { login } from '../authentication'
import { storage } from '../storage'
import { html } from 'common-tags'

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
        let transferRate_txt = '';
        let status_class = '';
        if (progress) {
            const { loaded, total, rate } = progress;
            percentLoaded = Math.round(100 * (loaded / total));
            if (rate) {
                transferRate = ` - ${Math.round( (rate * 1000) / 1024 )} KB/s`;
                if(rate > 1024){ transferRate = ` - ${Math.round( (rate * 1000) / 1024 / 1024 )} MB/s`;}
            }
            let loaded_str = "";
            if(loaded > 1024){ loaded_str = loaded/1024 + " KB";}
            if(loaded > 1024*1024){ loaded_str = (loaded/1024/1024) + " MB";}
            let total_str = "";
            if(total > 1024){ total_str = (total/1024) + " KB";}
            if(total > 1024*1024){ total_str = (total/1024/1024) + " MB";}
            transferRate_txt = loaded_str + " of " + total_str;
        }

        if(status === 'processing' || status === 'waiting'){
            status_class += ' mdl-progress__indeterminate ';
        }

        let status_string = '';
        let cancelclose_div = `
            <div class="download-item__close">
                <i class="fa fa-times fa-2x" aria-hidden="true"></i>
            </div>`;
        if(status === "downloading-unsafe"){ status_string = "Downloading - " + transferRate + " - " + transferRate_txt; }
        if(status === "authorizing")       { status_string = "Authorizing"; cancelclose_div = '';}
        if(status === "payment-required")  { status_string = "Plan limit reached! Visit <a href='https://filewall.io'>filewall.io</a> to upgrade"; status_class += " bufferbar_error ";} // TODO status payment-required does not exist yet
        if(status === "waiting-for-upload"){ status_string = "Waiting - Upgrade your plan to process more files in parallel";}  // TODO waiting-for-upload does not exist yet, catch in authorize
        if(status === "uploading")         { status_string = "Uploading to <a>filewall.io<a>";cancelclose_div = '';}
        if(status === "processing")        { status_string = "Processing to <a>filewall.io<a>";cancelclose_div = '';}
        if(status === "finished")          { status_string = "";} // finished download are automatically removed and dont need text
        if(status === "unconvertable")     { status_string = "File could not be converted into secure format, sorry";  status_class += " bufferbar_warning ";} // TODO status unconvertable does not exist yet
        if(status === "failed")            { status_string = "An error occured, try again later";  status_class += " bufferbar_error ";}

        return html`
          <div class="download-item-grid download-item" id="download-item-${id}">
              <div class="download-item__icon">
                  <i class="fa fa-file-o fa-2x" aria-hidden="true"></i>
              </div>
              <div class="download-item__filename "><a>${filename}</a></div>
              <div class="download-item__progress ">
                  <div>${status_string}</div>
                  <div class="mdl-progress ${status_class} mdl-js-progress" style="width:${percentLoaded}%;"></div>
              </div>
              ${cancelclose_div}
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
