const browser = require('webextension-polyfill');


this.active_downloads = [];

this.apiKey = "";
// this.baseurl = "http://127.0.0.1:8000";
this.baseurl = "https://filewall.io";

this.baseurls = [
    "https://filewall.io"   ,
    "https://eu.filewall.io",
    "https://us.filewall.io",
    "http://127.0.0.1:8000"
];


function update_icon() {
    let nr_of_downloads = active_downloads.length;
    if (nr_of_downloads == 0) {
        browser.browserAction.setBadgeText({ text: "" });
    } else {
        browser.browserAction.setBadgeText({ text: "" + nr_of_downloads });
    }
}

function cancel_and_erase_downlad(downloadItem) {
    browser.downloads.cancel(downloadItem.id);
    if (downloadItem.state == "complete") {
        browser.downloads.removeFile(downloadItem.id);
    }
    browser.downloads.erase({id: downloadItem.id});
}



function setLastOpened() {
    localStorage.popupLastOpened = (new Date()).getTime();
    browser.runtime.sendMessage('poll');
};

function loadI18nMessages() {
    function setProperty(selector, prop, msg) {
        document.querySelector(selector)[prop] = browser.i18n.getMessage(msg);
    }

    setProperty('title', 'innerText', 'tabTitle');
    setProperty('#q', 'placeholder', 'searchPlaceholder');
    setProperty('#all-downloads', 'title', 'AllDownloadsTitle');
    setProperty('#translation', 'title', 'translationTitle');
    setProperty('#options-open', 'title', 'optionsTitle');
    setProperty('#clear-all', 'title', 'clearAllTitle');
    setProperty('#clear-all-text', 'innerText', 'clearAllText');
    setProperty('#clear-completed', 'title', 'clearCompletedTitle');
    setProperty('#clear-completed-text', 'innerText', 'clearCompletedText');
    setProperty('#clear-failed', 'title', 'clearFailedTitle');
    setProperty('#clear-failed-text', 'innerText', 'clearFailedText');
    setProperty('#clear-deleted', 'title', 'clearDeletedTitle');
    setProperty('#clear-deleted-text', 'innerText', 'clearDeletedText');
    setProperty('#open-folder', 'title', 'openDownloadsFolderTitle');
    setProperty('#open-folder-text', 'innerText', 'openDownloadsFolderText');
    setProperty('#help', 'title', 'settingsTitle');
    setProperty('#help-text', 'innerText', 'settingsText');

    setProperty('#empty', 'innerText', 'zeroItems');
    setProperty('#searching', 'innerText', 'searching');
    setProperty('#search-zero', 'innerText', 'zeroSearchResults');
    setProperty('#management-permission-info', 'innerText', 'managementPermissionInfo');
    setProperty('#grant-management-permission', 'innerText', 'grantManagementPermission');
    setProperty('#older', 'innerText', 'showOlderDownloads');
    setProperty('#loading-older', 'innerText', 'loadingOlderDownloads');
    setProperty('.pause', 'title', 'pauseTitle');
    setProperty('.resume', 'title', 'resumeTitle');
    setProperty('.cancel', 'title', 'cancelTitle');
    setProperty('.show-folder', 'title', 'showInFolderTitle');
    setProperty('.erase', 'title', 'eraseTitle');
    setProperty('.url', 'title', 'retryTitle');
    setProperty('.referrer', 'title', 'referrerTitle');
    setProperty('.open-filename', 'title', 'openTitle');
    setProperty('#bad-chrome-version', 'innerText', 'badChromeVersion');
    setProperty('.remove-file', 'title', 'removeFileTitle');

    document.querySelector('.myprogress').style.minWidth = getTextWidth(formatBytes(1024 * 1024 * 1023.9) + '/' + formatBytes(1024 * 1024 * 1023.9)) + 'px';

    var max_time_left_width = 0;
    for (var i = 0; i < 4; ++i) {
        max_time_left_width = Math.max(max_time_left_width, getTextWidth( formatTimeLeft(0 == (i % 2), (i < 2) ? 0 : ((100 * 24) + 23) * 60 * 60 * 1000)));
    }
    document.querySelector('body div.item span.time-left').style.minWidth = max_time_left_width + 'px';

};

function getTextWidth(s) {
    var probe = document.getElementById('text-width-probe');
    probe.innerText = s;
    return probe.offsetWidth;
};

function formatDateTime(date) {
    var now = new Date();
    var zpad_mins = ':' + (date.getMinutes() < 10 ? '0' : '') + date.getMinutes();
    if (date.getYear() != now.getYear()) {
        return '' + (1900 + date.getYear());
    } else if ((date.getMonth() != now.getMonth()) ||
        (date.getDate() != now.getDate())) {
        return date.getDate() + ' ' + chrome.i18n.getMessage('month' + date.getMonth() + 'abbr');
    } else if (date.getHours() == 12) {
        return '12' + zpad_mins + 'pm';
    } else if (date.getHours() > 12) {
        return (date.getHours() - 12) + zpad_mins + 'pm';
    }
    return date.getHours() + zpad_mins + 'am';
}

function formatBytes(n) {
    if (n < 1024) {
        return n + 'B';
    }
    var prefixes = 'KMGTPEZY';
    var mul = 1024;
    for (var i = 0; i < prefixes.length; ++i) {
        if (n < (1024 * mul)) {
            return (parseInt(n / mul) + '.' + parseInt(10 * ((n / mul) % 1)) + prefixes[i] + 'B');
        }
        mul *= 1024;
    }
    return '!!!';
}

function formatSpeed(ms, bytes) {
    if (ms < 1000) {
        return '0KB/s';
    }
    var sec = ms / 1000;
    var speed = bytes / sec;

    if (speed < 1024) {
        return Math.round(speed * 10) / 10 + 'bytes/s';
    }
    if (speed < 1048576) {
        return Math.round((speed / (1024)) * 10) / 10 + 'KB/s';
    }
    else return Math.round((speed / (1024 * 1024)) * 10) / 10 + 'MB/s';
}

function formatTimeLeft(openWhenComplete, ms) {
    var prefix = openWhenComplete ? 'openWhenComplete' : 'timeLeft';
    if (ms < 1000) {
        return browser.i18n.getMessage(prefix + 'Finishing');
    }
    var days = parseInt(ms / (24 * 60 * 60 * 1000));
    var hours = parseInt(ms / (60 * 60 * 1000)) % 24;
    if (days) {
        return browser.i18n.getMessage(prefix + 'Days', [days, hours]);
    }
    var minutes = parseInt(ms / (60 * 1000)) % 60;
    if (hours) {
        return browser.i18n.getMessage(prefix + 'Hours', [hours, minutes]);
    }
    var seconds = parseInt(ms / 1000) % 60;
    if (minutes) {
        return browser.i18n.getMessage(prefix + 'Minutes', [minutes, seconds]);
    }
    return browser.i18n.getMessage(prefix + 'Seconds', [seconds]);
}


function binarySearch(array, target, cmp) {
    var low = 0, high = array.length - 1, i, comparison;
    while (low <= high) {
        i = (low + high) >> 1;
        comparison = cmp(target, array[i]);
        if (comparison < 0) {
            low = i + 1;
        } else if (comparison > 0) {
            high = i - 1;
        } else {
            return i;
        }
    }
    return i;
};

function arrayFrom(seq) {
    return Array.prototype.slice.apply(seq);
};


// TODO: what is this for?
function sendAnimMsg(msg) {
	browser.tabs.query({active: true}).then( tabs => {
		tabs.forEach(tab => {
			browser.tabs.sendMessage(tab.id, msg);
		})
	})
}
