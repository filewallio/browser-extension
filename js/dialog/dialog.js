const $ = document.querySelector.bind(document);
const $s = document.querySelectorAll.bind(document);
const browser = require('webextension-polyfill');

window.addEventListener('load', function () {

    const download_id = new URLSearchParams(window.location.search).get('download_id');
    const filename = new URLSearchParams(window.location.search).get('filename');

    $('#fwiodli_filename').textContent  = filename;

    $('#fwiodli_direct').addEventListener('click', e => {
        e.preventDefault();
        browser.runtime.sendMessage({download_id: download_id, action: "direct"});
    });

    $('#fwiodli_tofw_btn').addEventListener('click', e => {
        e.preventDefault();
        browser.runtime.sendMessage({download_id: download_id, action: "filewall"});
    });

    $('#fwiodli_header_close').addEventListener('click', e => {
        e.preventDefault();
        browser.runtime.sendMessage({download_id: download_id, action: "close"});
    });

});
