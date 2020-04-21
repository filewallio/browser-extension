import { storage } from '../storage'

const $ = document.querySelector.bind(document);
const $s = document.querySelectorAll.bind(document);
const browser = require('webextension-polyfill');

window.addEventListener('load', function () {
    console.log('in dialog/dialog.js')

    const download_id = new URLSearchParams(window.location.search).get('download_id');
    const filename = new URLSearchParams(window.location.search).get('filename');

    $('#fwiodli_filename').innerHTML  = filename;

    $('#fwiodli_direct').addEventListener('click', e => {
        e.preventDefault();
        chrome.runtime.sendMessage({download_id: download_id, action: "direct"});
    });

    $('#fwiodli_tofw_btn').addEventListener('click', e => {
        e.preventDefault();
        chrome.runtime.sendMessage({download_id: download_id, action: "filewall"});
    });

    $('#fwiodli_header_close').addEventListener('click', e => {
        e.preventDefault();
        chrome.runtime.sendMessage({download_id: download_id, action: "close"});
    });

});
