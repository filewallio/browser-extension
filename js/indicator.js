chrome.runtime.onMessage.addListener(function (message) {
	console.log('msg received:'+ message);

	if(message[0] === "animation"){
		showStartAnim(message[1]);
	}
	if(message[0] === "download_intercepted"){
		showDownloadIntercepted(message[1])
	}
});


/*
* preparation for automatic download interception
* */
function showDownloadIntercepted(msg){

	var foo = `
			<style>
				.fwiodli_main {
					position: fixed;
					opacity : 1;
					z-index : 999999;
					width   : 300px;
					height  : 75px;
					top     : 0px;
					right   : 0px;
					padding : 10px;
					border  : 1px solid gray;
					background-color: white;
				}
				.fwiodli_header {	}
				.fwiodli_tofw {	}
				.fwiodli_tofw_btn {	}
				.fwiodli_direct {	}
					
			</style>
			<div class="filewallio_dl_intercepted_main">
				<div class="filewallio_dl_intercepted_header">
					Download intercepted!
				</div>
				<div class="filewallio_dl_intercepted_tofw">
					<button class="filewallio_dl_intercepted_tofw_btn">Send to Filewall.io</button>
				</div>
				<div class="filewallio_dl_intercepted_direct">
					<a>Direct download</a>
				</div>
			</div>
        `;
	var maindiv = document.createElement('div');
	maindiv.innerHTML = foo;
	document.body.appendChild(maindiv);

}

showDownloadIntercepted()

function showStartAnim(msg){
	var src;
	var shadow;
	src=chrome.runtime.getURL('/images/icon-128x128.png');

	var img = document.createElement('img');
	img.src = src;
	img.style.cssText = 'position:fixed;opacity:1;z-index:999999;width:100px;height:100px;';
	document.body.appendChild(img);

	if(msg==='start'){
		img.style.left = '50%';
		img.style.top  = '30%';
		img.style.width = '128px';
		img.style.height = '128px';
	} else if (msg==='success'){
		img.style.left =  '95%';
		img.style.top  = '-5%';
		img.style.width = "20px";
		img.style.height = "20px";
	}

	setTimeout(function () {
		img.style.webkitTransition = 'all 1.5s';
		if(msg==='start'){
			img.style.left =  '95%';
			img.style.top  = '-5%';
			img.style.width = "20px";
			img.style.height = "20px";
		} else if (msg==='success'){
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



