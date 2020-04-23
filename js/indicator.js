chrome.runtime.onMessage.addListener(function (message) {
	console.log('msg received:', message);

	if(message.target === "animation"){
		showStartAnim(message);
	}
	if(message.target === "dialog"){
		showDialog(message)
	}
});


function showDialog(message){
	if(message.action === "hide"){
		var el = document.getElementById("filewallio_dialog_" + message.dialog_id);
		if(el !== null){el.remove()}
	}
	if(message.action === "show"){
		var content = `
				<style>
					.fwiodli_iframe {
						position: fixed;
						opacity : 1;
						z-index : 2147483647;
						width   : 400px;
						height  : 205px;
						top     : 0px;
						right   : 0px;
						padding : 0px;
						border-top    : 0px;
						border-right  : 0px;
						border-bottom : 1px solid #9dc800;
						border-left   : 2px solid lightgray;
						background-color: white;
					}					
				</style>
				<iframe class="fwiodli_iframe" src="`+message.dialog_url+`"></iframe>
			`;
		var maindiv = document.createElement('div');
		maindiv.id = "filewallio_dialog_" + message.dialog_id;
		maindiv.innerHTML = content;
		document.body.appendChild(maindiv);
	}
}

//showDialog({action:"show", dialog_url: "chrome-extension://fpbjhoognoncdhjinnnlghcpodnmgioa/dialog/dialog.html?download_id=4fe69d84-f21a-4260-b6e5-6b1769a2602f" })

function showStartAnim(msg){
	var src;
	var shadow;
	src=chrome.runtime.getURL('/images/icon-128x128.png');

	var img = document.createElement('img');
	img.src = src;
	img.style.cssText = 'position:fixed;opacity:1;z-index:999999;width:100px;height:100px;';
	document.body.appendChild(img);

	if(msg.action==='start'){
		img.style.left = '50%';
		img.style.top  = '30%';
		img.style.width = '128px';
		img.style.height = '128px';
	} else if (msg.action==='success'){
		img.style.left =  '95%';
		img.style.top  = '-5%';
		img.style.width = "20px";
		img.style.height = "20px";
	}

	setTimeout(function () {
		img.style.webkitTransition = 'all 1.5s';
		if(msg.action==='start'){
			img.style.left =  '95%';
			img.style.top  = '-5%';
			img.style.width = "20px";
			img.style.height = "20px";
		} else if (msg.action==='success'){
			img.style.left = '5%';
			img.style.top  = '99%';
			img.style.width = "128px";
			img.style.height = "128px";
		}

		img.style.opacity  = 1;
		setTimeout(function () {
			document.body.removeChild(img);
		}, 1500);
	}, 100);
}



