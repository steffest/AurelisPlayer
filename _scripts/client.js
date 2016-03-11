var Client = (function () {

	var self = {};

	var userAgent = navigator.userAgent;
	var userAgentLC = navigator.userAgent.toLowerCase();
	var platform = navigator.platform;

	// Check for retina display
	var mediaQuery = "(-webkit-min-device-pixel-ratio: 1.5),\
                  (min--moz-device-pixel-ratio: 1.5),\
                  (-o-min-device-pixel-ratio: 3/2),\
                  (min-resolution: 1.5dppx)";

	var isRetina = (window.devicePixelRatio && window.devicePixelRatio > 1)
		|| (window.matchMedia && window.matchMedia(mediaQuery).matches);



	self.isSafari = function(){
		return userAgent.indexOf('Safari') >= 0;
	};

	self.isChrome = function(){
		return userAgent.indexOf('Chrome') >= 0;
	};

	self.isIpad = function(){
		return platform.indexOf("iPad") >= 0;
	};

	self.isIpadFullScreen = function(){
		return self.isIpad() && !self.isSafari();
	};

	self.isIOSFullScreen = function(){
		return (osType == OS_TYPE.IOS) && !self.isSafari();
	};

	self.isIpadRetina = function(){
		return self.isIpad() && self.isRetina();
	};

	self.isIphone = function(){
		return platform.indexOf("iPhone") >= 0;
	};

	self.isIpod = function(){
		return platform.indexOf("iPod") >= 0;
	};

	self.isAndroid = function(){
		return userAgentLC.indexOf("android") >= 0;
	};

	self.isIOS = function(){
		return (self.isIpad() || self.isIphone() || self.isIpod());
	};

	self.isRetina = function(){
		return isRetina;
	};

	self.isMobileDevice = function(){
		return (self.isIOS() || self.isAndroid());
	};

	self.canEmbedVideo = function(){
		return !(Client.isIphone() || Client.isIpod());
	};

	return self;

})();



