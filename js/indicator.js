
const browser = require('webextension-polyfill');

browser.runtime.onMessage.addListener(function (message) {
	console.log('msg received:'+message);
	showStartAnim(message);
});

function showStartAnim(msg){
	var src;
	var shadow;
	if(msg=='start'){
		src=browser.runtime.getURL('images/animate_start.png');
		shadow='box-shadow:10px 10px 50px 20px rgb(147, 253, 147);';
	} else if (msg=='success'){
		src=browser.runtime.getURL('images/animate_success.png');
	} else {
		return;
	}
	var img = document.createElement('img');
	img.src = src;
	img.style.cssText = 'position:fixed;opacity:1;z-index:999999;width:100px;height:100px;';
	document.body.appendChild(img);
	
	if(msg=='start'){
		img.style.left = '70%';
		img.style.top  = '30%';
	} else if (msg=='success'){
		img.style.left =  '95%';
		img.style.top  = '-10%';
	}

	setTimeout(function () {
		img.style.webkitTransition = 'all 2s';
		if(msg=='start'){
			img.style.left =  '95%';
			img.style.top  = '-10%';
		} else if (msg=='success'){
			img.style.left = '30%';
			img.style.top  = '30%';
		}

		img.style.opacity  = .5;
		img.style.width  = 30 + 'px';
		img.style.height = 30 + 'px';
		setTimeout(function () {
			document.body.removeChild(img);
		}, 3000);
	}, 100);
}