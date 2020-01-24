

function Filewall(filename, data, downloadItem) {

    var filewall = this;
    this.downloadItem = downloadItem;
    this.filename  = filename;
    this.data = data;


    this.state = "new"; // authorizing | uploading | waiting | processing | finished  | failed 

    this.error = null;

    this.upload_url = null;
    this.get_url  = null;
    this.poll_delay = 3000;
    this.authorize();
}

Filewall.prototype.setState = function (new_state) {
    console.log('Filewall state: ', new_state)
    if(new_state !== this.state){
        this.downloadItem.onFilewallStateChanged(this, new_state);
    }
    this.state = new_state;
}

Filewall.prototype.authorize = function () {
    console.log('authorize is called');

    this.setState("authorize");

    var authrequest = new XMLHttpRequest();
    authrequest.filewall = this;

    authrequest.open("POST", window.baseurl + "/api/authorize", true);
    authrequest.onload = function () {
        if (this.status >= 200 && this.status < 400) {
            var response_data = JSON.parse(this.responseText);
            this.filewall.upload_url = response_data.links.upload;
            this.filewall.self_url = response_data.links.self;
            this.filewall.upload();
        }else {
            this.filewall.error = "authorization_failed";
            this.filewall.setState("error")
        }
    };

    authrequest.onerror = function () {
        console.log(this.responseText); 
        this.filewall.error = "authorization_failed";
        this.filewall.setState("error");
    };

    authrequest.setRequestHeader("Content-Type", "application/json");
    authrequest.setRequestHeader("apikey", window.apikey);
    authrequest.send();
};

Filewall.prototype.upload = function () {
    this.setState("uploading")

    var uploadrequest = new XMLHttpRequest();
    uploadrequest.filewall = this;

    uploadrequest.open("POST", this.upload_url, true);

    uploadrequest.setRequestHeader("filename", this.filename);
    uploadrequest.onload = function () {
        if (this.status >= 200 && this.status < 400) {
            this.filewall.poll();
        } else {
            this.filewall.error = "uploading_failed";
            this.filewall.setState("error");
        }
    };

    uploadrequest.onerror = function () {
        console.log(this.responseText); 
        this.filewall.error = "uploading_failed";
        this.filewall.setState("error");
    };

    uploadrequest.send(this.data);
    
};

Filewall.prototype.poll = function () {

    this.setState("waiting");
    this.data = null;

    var getrequest = new XMLHttpRequest();
    getrequest.filewall = this;

    getrequest.open("GET", this.self_url, true);

    getrequest.onload = function () {
        if (this.status >= 200 && this.status < 400) {
            var response_data = JSON.parse(this.responseText);
            /*
            #           json : {
            #               "uid"       : task.uid,
            #               "status"    : "waiting | finished",
            #               "created"   : created date of task,
            #               "updated"   : updated date of task,
            #               "name"      : "name",       # Only exists if status==finished
            #               "type"      : "type",       # Only exists if status==finished
            #               "download"  : "download",   # Only exists if status==finished
            #
            #           }
            */
            this.filewall.setState(response_data["status"])

            if (response_data["status"] == "finished") {
                this.filewall.downloadItem.onFilewallSuccess(this.filewall, response_data);
            };

            if (response_data["status"] == "processing" || response_data["status"] == "waiting"  ) {
                let filewall = this.filewall;
                this.filewall.poll_delay += 1000;
                setTimeout(function(){
                    filewall.poll();
                }, this.filewall.poll_delay);
            };

        } else {
            console.log(this.responseText); 
            this.filewall.error = "processing_failed";
            this.filewall.setState("error");
        }
    };

    getrequest.onerror = function () {
        this.filewall.error = "processing_failed";
        this.filewall.setState("error");
    };

    getrequest.setRequestHeader("Content-Type", "application/json");
    getrequest.setRequestHeader("apikey", window.apikey)
    getrequest.send(null);
    
};
