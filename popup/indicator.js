chrome.runtime.onMessage.addListener(function (message) {
	console.log('msg received:'+message);
	showStartAnim(message);
});

function showStartAnim(msg){
	var src;
	var shadow;
	if(msg=='start'){
		src=chrome.runtime.getURL('/images/icon-128x128.png');
	} else if (msg=='success'){
		src=chrome.runtime.getURL('/images/icon-128x128.png');
	} else {
		return;
	}
	var img = document.createElement('img');
	img.src = src;
	img.style.cssText = 'position:fixed;opacity:1;z-index:999999;width:100px;height:100px;';
	document.body.appendChild(img);

	if(msg=='start'){
		img.style.left = '50%';
		img.style.top  = '30%';
		img.style.width = '128px';
		img.style.height = '128px';
	} else if (msg=='success'){
		img.style.left =  '95%';
		img.style.top  = '-5%';
		img.style.width = "20px";
		img.style.height = "20px";
	}

	setTimeout(function () {
		img.style.webkitTransition = 'all 1.5s';
		if(msg=='start'){
			img.style.left =  '95%';
			img.style.top  = '-5%';
			img.style.width = "20px";
			img.style.height = "20px";
		} else if (msg=='success'){
			img.style.left = '30%';
			img.style.top  = '99%';
			img.style.width = "128px";
			img.style.height = "128px";
		}

		img.style.opacity  = 1;
		//img.style.width  = 30 + 'px';
		//img.style.height = 30 + 'px';
		setTimeout(function () {
			document.body.removeChild(img);
		}, 1500);
	}, 100);
}