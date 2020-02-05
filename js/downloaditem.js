
let template_str = `<div class="item"  id="item">
<div class="wrapper_top">
<img class="icon" src="icon38.png">

<div class="more" hidden>
    <span class="more-left">
    <div class="start-time1"></div>
    <div class="complete-size1"></div>
    </span>
    <a href="#" class="by-ext"><img /></a>
</div>

<div class="wrapper">
    <span class="file-url">
    <div class="file-url-head">
        <span class="removed"></span>
        <a href="#" class="open-filename"></a>
    </div>

    <div class="second">
        <span id="size" class="complete-size"></span>
        <span class="dash"> &nbsp;&nbsp; </span>
        <span class="ref"></span>
        <span class="dash"> </span>
        <span id="time" class="start-time"></span>
        <span class="in-progress">
        <span class="myprogress"></span>
        <span class="speed"></span>
        <span class="dash"> &nbsp; </span>
        <span class="time-left"></span>
        </span>
    </div>

    </span>
    <div class="info">
    <div class="r_info" hidden>
        <a href="#" class="referrer btn"></a>
        <span class="remove-file "></span>
        <span class="erase "></span>
        <span class="url " download=""></span>
    </div>
    </div>
</div>
</div>

<div class="progress1">
<div class="meter"><span /></div>
<div class="pro">
    <a href="#" class="cancel"><i class="fa fa-times"></i></a>
</div>
</div>

</div>`;




function DownloadItem(url) {
    console.log('DownloadItem', this);
    var item = this;

    sendAnimMsg('start');

    item.id = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    item.url = url;

    item.filename = url.substring(url.lastIndexOf('/') + 1),  // may be overwritten by content-dispositon header

    item.startTime = new Date();

    item.bytesReceived = 0;
    item.totalBytes = 0;

    item.state = 'new';  // new , downloading, in_progress, completed, finished, interrupted

    // Change this to div.childNodes to support multiple top-level nodes
    item.div = new DOMParser().parseFromString(template_str.trim(), 'text/html').getElementById("item");

    item.div.id = 'item' + item.id;
    item.div.item = item;
    
}


DownloadItem.prototype.getElement = function (name) {
    return this.div.querySelector('#item' + this.id + ' .' + name);
};

DownloadItem.prototype.render = function () {
    var item = this;

    let views = browser.extension.getViews({ type: "popup" });
    for (let i = 0; i < views.length; i++) {
        let items_div = views[i].document.getElementById('items');

        if ((items_div.childNodes.length == 0) || (item.startTime.getTime() < items_div.childNodes[items_div.childNodes.length - 1].item.startTime.getTime())) {
            items_div.appendChild(item.div);
        } else if (item.startTime.getTime() > items_div.childNodes[0].item.startTime.getTime()) {
            items_div.insertBefore(item.div, items_div.childNodes[0]);
        } else {
            var adjacent_div = items_div.childNodes[binarySearch(arrayFrom(items_div.childNodes),
                item.startTime.getTime(),
                function (target, other) {
                    return target - other.item.startTime.getTime();
                })];
            var adjacent_item = adjacent_div.item;
            if (adjacent_item.startTime.getTime() < item.startTime.getTime()) {
                items_div.insertBefore(item.div, adjacent_div);
            } else {
                items_div.insertBefore(item.div, adjacent_div.nextSibling);
            }
        }
    }

    var now = new Date();
    var in_progress = (item.state == 'in_progress' || item.state == 'downloading')
    var openable = (item.state != 'interrupted') && item.exists && !item.deleted;
   
    if (item.filename) {
        item.basename = item.filename.substring(Math.max(
            item.filename.lastIndexOf('\\'),
            item.filename.lastIndexOf('/')) + 1);
        if (item.basename.length > 40) {
            item.basename = item.basename.substr(0, 30) + "..." + item.basename.substr(item.basename.length - 7, item.basename.length);
        }
    }
    if (item.estimatedEndTime) {
        item.estimatedEndTime = new Date(item.estimatedEndTime);
    }
    if (item.endTime) {
        item.endTime = new Date(item.endTime);
    }

    if (item.filename && !item.icon_url) {
        /* TODO
        chrome.downloads.getFileIcon(
            item.id,
            { 'size': 32 },
            function (icon_url) {
                //item.getElement('icon').hidden = !icon_url;
                if (icon_url) {
                    item.icon_url = icon_url;
                    item.getElement('icon').src = icon_url;
                }
            });
        */
    }
    item.div.style.cursor = openable ? 'pointer' : '';
    item.getElement('removed').style.display = openable ? 'none' : 'inline';
    item.getElement('open-filename').style.display = (openable ? 'inline' : 'none');
    item.getElement('in-progress').hidden = !in_progress;
    item.getElement('cancel').style.display = (!in_progress ? 'none' : 'inline-block');
    item.getElement('remove-file').hidden = ( (item.state != 'complete') || !item.exists || item.deleted || !chrome.downloads.removeFile);
    item.getElement('erase').hidden = in_progress;
    item.getElement('complete-size').hidden = in_progress;
    item.getElement('start-time').hidden = in_progress;
    item.getElement('ref').hidden = in_progress;
    item.getElement('dash').hidden = in_progress;
    item.getElement('url').hidden = in_progress;

    item.getElement('myprogress').style.display = ( in_progress ? 'inline-block' : 'none');
    item.getElement('meter').hidden = !in_progress || !item.totalBytes;

    item.getElement('removed').innerText = item.basename;
    item.getElement('open-filename').innerText = item.basename;

    function setByExtension(show) {
        if (show) {
            item.getElement('by-ext').title = item.byExtensionName;
            item.getElement('by-ext').href = 'chrome://extensions#' + item.byExtensionId;
            item.getElement('by-ext img').src = 'chrome://extension-icon/' + item.byExtensionId + '/48/1';
        } else {
            item.getElement('by-ext').hidden = true;
        }
    }
    if (item.byExtensionId && item.byExtensionName) {
        browser.permissions.contains({ permissions: ['management'] }).then((result) => {
            if (result) {
                setByExtension(true);
            } else {
                setByExtension(false);
                if (!localStorage.managementPermissionDenied) {
                    document.getElementById('request-management-permission').hidden = false;
                    document.getElementById('grant-management-permission').onclick = () => {
                        browser.permissions.request({ permissions: ['management'] }).then((granted) => {
                            setByExtension(granted);
                            if (!granted) {
                                localStorage.managementPermissionDenied = true;
                            }
                        });
                        return false;
                    };
                }
            }
        });
    } else {
        setByExtension(false);
    }

    item.getElement('complete-size').innerText = formatBytes(item.bytesReceived);
    if (item.totalBytes && (item.state != 'complete')) {
        item.getElement('myprogress').innerText = (item.getElement('complete-size').innerText + ' of ' + formatBytes(item.totalBytes));
        item.getElement('meter').children[0].style.width = parseInt(100 * item.bytesReceived / item.totalBytes) + '%';
    }

    if (in_progress) {

        if (item.estimatedEndTime) {
            var openWhenComplete = false;
            try {
                openWhenComplete = JSON.parse(localStorage.openWhenComplete).indexOf( item.id) >= 0;
            } catch (e) {
            }
            var timeLeftInMS = item.estimatedEndTime.getTime() - now.getTime();
            var sizeLeftInBytes = item.totalBytes - item.bytesReceived;

            item.getElement('speed').innerText = formatSpeed(timeLeftInMS, sizeLeftInBytes);

            item.getElement('time-left').innerText = formatTimeLeft( openWhenComplete, item.estimatedEndTime.getTime() - now.getTime());
        } else {
            item.getElement('time-left').innerText = String.fromCharCode(160);
        }
    }

    if (item.startTime) {
        item.getElement('start-time').innerText = formatDateTime(item.startTime);
    }

    this.maybeAccept();
};

DownloadItem.prototype.onChanged = function (delta) {
    for (var key in delta) {
        if (key != 'id') {
            this[key] = delta[key].current;
        }
    }
    this.render();
    if (delta.state) {
        setLastOpened();
    }
    if (this.state == 'in_progress') {
        DownloadManager.startPollingProgress();
    }
    if (this.state == "interrupted" && this.filename == "") {
        this.erase();
    }
};

DownloadItem.prototype.onErased = function () {
    window.removeEventListener('mousemove', this.more_mousemove);
    document.getElementById('items').removeChild(this.div);
};

DownloadItem.prototype.removeFile = function () {
    browser.downloads.removeFile(this.id);
    this.deleted = true;
    this.render();
};

DownloadItem.prototype.erase = function () {
    browser.downloads.erase({ id: this.id });
};

DownloadItem.prototype.cancel = function () {
    browser.downloads.cancel(this.id);
};

DownloadItem.prototype.start_process = function () {
    let xhr = new XMLHttpRequest();
    xhr.downloadItem = this;
    xhr.downloadItem.state = 'downloading';
    xhr.open("GET", this.url);

    xhr.onreadystatechange = function () {
        if (xhr.readyState === 4) {
            if (xhr.status === 200 || xhr.status == 0) {
                
                // try {
                //     var disposition = xhr.getResponseHeader('Content-Disposition');
                // } catch (e) { }
                // if (disposition && disposition.indexOf('attachment') !== -1) {
                //     let filenameRegex = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/;
                //     let matches = filenameRegex.exec(disposition);
                //     if (matches != null && matches[1]) {
                //         xhr.downloadItem.filename = matches[1].replace(/['"]/g, '');
                //     };
                // };
                // let type = xhr.getResponseHeader('Content-Type');
                if (xhr.status == 200) {
                    console.log('file downloaded')
                    xhr.downloadItem.state = "in_progress";
                    xhr.downloadItem.render();
                    var filewall = new Filewall(xhr.downloadItem.filename, xhr.response, xhr.downloadItem );
                }
            };
        };
    };

    xhr.onprogress = function (e) {
        xhr.downloadItem.bytesReceived = e.loaded;
        xhr.downloadItem.totalBytes = e.total;
        xhr.downloadItem.render();
    };

    xhr.onerror = function (e) {
        xhr.downloadItem.state = "failed";
        xhr.downloadItem.render();
    };

    xhr.send(null);
    xhr.downloadItem.render();
};

DownloadItem.prototype.onFilewallStateChanged = function (filewallItem, new_state) {
  
};

DownloadItem.prototype.onFilewallSuccess = function (filewallItem, api_response) {
       
    sendAnimMsg('success');
   
    browser.downloads.download({
        url: api_response.links.download,
        filename: api_response.name
    });

    // remove item from active_downloads array
    let filterid = this.id
    window.active_downloads = window.active_downloads.filter(function(o){
        return o.id !== filterid;
    });

    // update icon
    let views = browser.extension.getViews({ type: "popup" });
    let has_active_downloads = window.active_downloads.length > 0;

    for (let i = 0; i < views.length; i++) {
        views[i].document.getElementById('items').removeChild(this.div);
        if(has_active_downloads === true){
            views[i].document.getElementById('head').style.display = "none";
        }else{
            views[i].document.getElementById('head').style.display = "block";
        }
    }

    update_icon();
};


DownloadItem.prototype.maybeAccept = function () {
    // This function is safe to call at any time for any item, and it will always
    // do the right thing, which is to display the danger prompt only if the item
    // is in_progress and dangerous, and if the prompt is not already displayed.
    if ((this.state != 'in_progress') || (this.danger == 'safe') || (this.danger == 'accepted') || DownloadItem.prototype.maybeAccept.accepting_danger) {
        return;
    }
    DownloadItem.prototype.maybeAccept.accepting_danger = true;
    var id = this.id;
    setTimeout(function () {
        /*chrome.downloads.acceptDanger(id, function () {
            chrome.tabs.create({ url: this.id });
            DownloadItem.prototype.maybeAccept.accepting_danger = false;
            arrayFrom(document.getElementById('items').childNodes).forEach(
                function (item_div) { 
                    item_div.item.maybeAccept();
                }
            );
        });
        */
    }, 500);
};
DownloadItem.prototype.maybeAccept.accepting_danger = false;






