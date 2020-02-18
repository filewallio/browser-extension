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

        // build status
        const activeDownloadsHtml = activeDownloads.map(buildDownloadItemView).join('')

        $('#items').innerHTML = activeDownloadsHtml
        // $('#items').innerHTML = JSON.stringify(activeDownloads, null, 2)

    }

    function buildDownloadItemView(downloadItem) {
        const { downloadUrl, filename, id, status, progress } = downloadItem
        let percentLoaded = '~'
        if (progress) {
            const { loaded, total } = progress
            percentLoaded = Math.round(100 * (loaded / total))

        }

        return `
            <div>
                <span>icon</span>
                <span>filename: ${filename}</span>
                <span>status: ${status}</span>
                <span>progress: ${percentLoaded}</span>
                <span>close</span>
            </div>
        `

    }

});
