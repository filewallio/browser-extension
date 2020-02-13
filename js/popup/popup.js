const $ = document.querySelector.bind(document)
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

    let optionsButton = document.getElementById('options-open');

    optionsButton.onclick = () => {
        browser.runtime.openOptionsPage();
    };

    function renderDownloadItems(activeDownloads) {
        if (!activeDownloads) {
            $('#head').style.display = 'block';
        } else {
            $('#head').style.display = 'none';
        }

        $('#items').innerHTML = JSON.stringify(activeDownloads, null, 2)

    }

});
