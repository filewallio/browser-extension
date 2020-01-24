// let baseurl = "http://127.0.0.1:8000";
let baseurl = "https://filewall.io";


function registerListener() {
    $(".menuItem").click(function (o) {
        return $(this).hasClass("selected") ? (o.preventDefault(), void 0) : ($(".menuItem.selected").removeClass("selected"), $(this).addClass("selected"), $(".tab.activeTab").removeClass("activeTab"), $("#" + $(this).attr("data-tab")).addClass("activeTab"), "multiDownloadsTab" == $(this).attr("data-tab") && initMultiDownloader(), void 0)
    })
}

$(document).ready(function () {
    ga('send', 'pageview', '/chrome-extension/options');

	try{
        if(document.location.hash){
    		$(".menuItem.selected").removeClass("selected"); 
    		$(".tab.activeTab").removeClass("activeTab");
    		$(document.location.hash+"Menu").addClass("selected");
    		$("#"+$(document.location.hash+"Menu").attr("data-tab")).addClass("activeTab");
        }
	} catch(e){
		console.log(e);
	}
    
    show_must_login = function(lasterror){
        document.getElementById("is_logged_in").style.display = "none";
        document.getElementById("must_login").style.display   = "block";
        if(lasterror !== undefined){
            document.getElementById("lasterror").style.display = "block";
            document.getElementById("nolasterror").style.display = "none";
            document.getElementById("lasterror").innerHTML     = lasterror;
        }else{
            document.getElementById("lasterror").style.display = "none";
            document.getElementById("nolasterror").style.display = "block";
            document.getElementById("lasterror").innerHTML     = "";  
        }
    };
    show_is_logged_in = function(){
        document.getElementById("is_logged_in").style.display = "block";
        document.getElementById("must_login").style.display   = "none";
    };




    chrome.storage.sync.get(["username", "apikey", "enable_context_menu", "auto_secure_downloads", "auto_secure_urls", "auto_secure_exclude_urls"], function (data) {
        
        document.getElementById("username").innerHTML = data.username;
        if(data.apikey == "" || data.apikey === undefined){
            show_must_login();
        }else{
            show_is_logged_in();
        }

        $("#enable_context_menu").jqxSwitchButton({
            theme: "classic",
            width: "100",
            height: "30",
            checked: data.enable_context_menu
        }), $("#enable_context_menu").bind("checked", function () {
            chrome.storage.sync.set({enable_context_menu: true}, function() {});
            chrome.contextMenus.create({
                id: "secure_download",
                title: "Secure Download",
                type: 'normal',
                contexts: ['link'],
            });
        }), $("#enable_context_menu").bind("unchecked", function () {
            chrome.storage.sync.set({enable_context_menu: false}, function() {});
            chrome.contextMenus.remove("secure_download");
        });

        $("#auto_secure_downloads").jqxSwitchButton({
            theme: "classic",
            width: "100",
            height: "30",
            checked: data.auto_secure_downloads
        }), $("#auto_secure_downloads").bind("checked", function () {
            chrome.storage.sync.set({auto_secure_downloads: true}, function() {})
        }), $("#auto_secure_downloads").bind("unchecked", function () {
            chrome.storage.sync.set({auto_secure_downloads: false}, function() {})
        });
    

        let element = document.getElementById("auto_secure_urls_container")
        element.innerHTML = "";
        for (let i = 0; i < data.auto_secure_urls.length; i++) {
            let li =  document.createElement("li");
            let span = document.createElement("span");
            span.innerHTML = data.auto_secure_urls[i];
            let span1 = document.createElement("span");
            span1.innerHTML = "remove";
            span1.data_url = data.auto_secure_urls[i];
            span1.onclick = function(e){
                chrome.storage.sync.get("auto_secure_urls", function(data) {
                    var filtered = data.auto_secure_urls.filter(function(value, index, arr){
                        return value != e.target.data_url;
                    });
                    chrome.storage.sync.set({auto_secure_urls: filtered}, function() {})
                });
            }
            li.appendChild(span);
            li.appendChild(span1);

            element.appendChild(li);
        }


        element = document.getElementById("auto_secure_exclude_urls_container")
        element.innerHTML = "";
        for (let i = 0; i < data.auto_secure_exclude_urls.length; i++) {
            let li =  document.createElement("li");
            let span = document.createElement("span");
            span.innerHTML = data.auto_secure_exclude_urls[i];
            let span1 = document.createElement("span");
            span1.innerHTML = "remove";
            span1.data_url = data.auto_secure_exclude_urls[i];
            span1.onclick = function(e){
                chrome.storage.sync.get("auto_secure_exclude_urls", function(data) {
                    var filtered = data.auto_secure_exclude_urls.filter(function(value, index, arr){
                        return value != e.target.data_url;
                    });
                    chrome.storage.sync.set({auto_secure_exclude_urls: filtered}, function() {})
                });
            }
            li.appendChild(span);
            li.appendChild(span1);

            element.appendChild(li);
        }


    });


    let reset_username = document.getElementById("reset_username");
    reset_username.onclick = function(e){
        document.getElementById("input_password").value = "";
        document.getElementById("input_username").value = "";
        chrome.storage.sync.set({username: "",apikey:""}, function() {})
        show_must_login();
    }

    
    let signin = document.getElementById("submit_login");
    signin.onclick = function(e){
        let input_username = document.getElementById("input_username").value;
        let input_password = document.getElementById("input_password").value;
        document.getElementById("input_password").value = "";

        var authrequest = new XMLHttpRequest();
        authrequest.open("POST", baseurl + "/account/api/", true);
        authrequest.onload = function () {
            if (this.status >= 200 && this.status < 400) {
                var response_data = JSON.parse(this.responseText);
                if(response_data.error === undefined){
                    chrome.storage.sync.set({"apikey": response_data.apikey, "username": input_username}, function() {});
                    show_is_logged_in();
                    document.getElementById("username").innerHTML = input_username;
                    chrome.runtime.getBackgroundPage(function callback(page){
                         page.apikey = response_data.apikey;
                    });
                }else{
                    show_must_login("Incorrect email or password");
                }
            }
            else {
                show_must_login("Login failed");
            }
        };
    
        authrequest.onerror = function () {
            show_must_login("Login failed");
        };
    
        let formData = new FormData();
        formData.append("username", input_username);
        formData.append("password", input_password);

        authrequest.send(formData);
    }
    

    
}), window.onload = function () {

   
};


