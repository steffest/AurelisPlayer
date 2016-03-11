var AurelisPlayer = (function(){
	var self = {};

	var container;

	var isPlaying = false;
	var isStarted = false;
	var isReady = false;
	var preloadCount = 0;
	var preloadMax = 0;
	var slideShowIndex = 0;

	var settings,
		backgroundAudio,
		introAudio,
		sessionAudio,
		outroAudio,
		playButton,
		video,
		status,
		img1,
		img2,
		playState,
		slideShowTimer;

	var PLAYSTATE = {
		INTRO: 1,
		SESSION: 2,
		OUTRO:3
	};

	self.init = function(properties){

		settings = properties;
		container = document.getElementById(settings.container);

		settings.preferHTML5 = !Client.isMobileDevice();
		if (settings.audioEngine == "html5") settings.preferHTML5=true;
		if (settings.audioEngine == "webaudio") settings.preferHTML5=false;

		generate();
		status.innerHTML = "preloading audio ...";

		if (settings.backGroundAudioUrl){
			preloadMax ++;
			backgroundAudio = new Howl({
				src: [settings.backGroundAudioUrl],
				html5: settings.preferHTML5
			});

			backgroundAudio.on("load",function(){
				log("Background Audio loaded");
				onAudioPreload();
			});
		}

		if (settings.introAudioUrl){
			preloadMax ++;
			introAudio = new Howl({
				src: [settings.introAudioUrl],
				html5: settings.preferHTML5
			});

			introAudio.on("load",function(){
				log("Intro Audio loaded");
				onAudioPreload();
			});

			introAudio.on("end",function(){
				log("intro done, playing session");
				if (isPlaying) {
					sessionAudio.play();
					playState = PLAYSTATE.SESSION;
				}
			});
		}

		if (settings.sessionAudioUrl){
			preloadMax ++;
			sessionAudio = new Howl({
				src: [settings.sessionAudioUrl],
				html5: settings.preferHTML5
			});

			sessionAudio.on("load",function(){
				log("Session Audio loaded");
				onAudioPreload();
			});

			sessionAudio.on("end",function(){
				log("session done, playing outro");
				if (isPlaying) {
					outroAudio.play();
					playState = PLAYSTATE.OUTRO;
				}
			});
		}

		if (settings.outroAudioUrl){
			// don't add to preload, let's asume it's preloaded before the session is done playing
			outroAudio = new Howl({
				src: [settings.outroAudioUrl],
				html5: settings.preferHTML5
			});

			outroAudio.on("load",function(){
				log("Outro Audio loaded");
			});

			outroAudio.on("end",function(){
				log("outro done, fading out and stopping audio in 5 seconds");
				backgroundAudio.fade(1,0,4500);
				setTimeout(function(){
					self.stop();
				},5000);
			});
		}

		// skip foreced preloading for html5 audio
		if (settings.preferHTML5) isReady = true;

	};

	self.start = function(){

		isPlaying = true;
		isStarted = true;

		log("Start audio playback");
		startVisual();

		playButton.classList.add("hidden");

		backgroundAudio.play();
		setTimeout(function(){
			if (isPlaying){
				playState = PLAYSTATE.INTRO;
				introAudio.play();
			}
		},1000);
	};

	self.pause = function(){
		log("pausing");
		backgroundAudio.pause();
		if (playState == PLAYSTATE.INTRO) introAudio.pause();
		if (playState == PLAYSTATE.SESSION) sessionAudio.pause();
		if (playState == PLAYSTATE.OUTRO) outroAudio.pause();
		if (video) video.pause();
		playButton.classList.remove("hidden");
		isPlaying = false;
	};

	self.play = function(){
		if (!isReady) return;

		if (isPlaying){
			self.pause();
		}else{
			if (isStarted){
				log("playing");
				backgroundAudio.play();
				if (playState == PLAYSTATE.INTRO) introAudio.play();
				if (playState == PLAYSTATE.SESSION) sessionAudio.play();
				if (playState == PLAYSTATE.OUTRO) outroAudio.play();
				if (video) video.play();
				playButton.classList.add("hidden");
				isPlaying = true;
			}else{
				self.start();
			}
		}
	};

	self.stop = function(){
		isPlaying = false;
		isStarted = false;
		backgroundAudio.stop();
		if (video){
			video.pause();
			video.classList.add("hidden");
		}
		if (img1) img1.classList.remove("hidden");
		playButton.classList.remove("hidden");
	};

	var generate = function(){
		container.className = "aurelisplayer";
		var includeVideo = (Client.canEmbedVideo() && settings.videoUrl);

		if (includeVideo){
			video = document.createElement("video");
			video.className = "hidden";
			video.addEventListener("playing",function(){
				if (img1) img1.classList.add('hidden');
				if (img2) img2.classList.add('hidden');
			},false);
			video.onclick = self.play;
			container.appendChild(video);
		}

		if (settings.images && settings.images.length){
			img1 = document.createElement("div");
			img1.id = "img1";
			img1.className = "image";
			img1.style.backgroundImage = "url('"+ settings.images[0] +"')";
			img1.onclick = self.play;
			container.appendChild(img1);

			if (!includeVideo && settings.images.length > 1){
				img2 = document.createElement("div");
				img2.id = "img2";
				img2.className = "image";
				img2.style.backgroundImage = "url('"+ settings.images[1] +"')";
				container.appendChild(img2);
			}
		}

		playButton = document.createElement("div");
		playButton.className = "play";
		if (!settings.preferHTML5) playButton.className += " hidden";
		playButton.onclick = self.play;
		container.appendChild(playButton);

		status = document.createElement("div");
		status.className = "status";
		container.appendChild(status);


	};

	var onAudioPreload = function(){
		preloadCount++;
		if (preloadCount >= preloadMax){
			isReady = true;
			playButton.classList.remove("hidden");
			status.innerHTML = "";
		}
	};

	var startVisual = function(){
		if (video && settings.videoUrl){
			log("start video playback");
			video.src = settings.videoUrl;
			video.play();
			video.classList.remove("hidden");
		}else{
			// start Slideshow
			clearTimeout(slideShowTimer);
			log("start slideshow");
			nextSlide();
		}
	};

	var stopVisual = function(){
		log("stop video playback");
		var video = document.getElementById("video");
		if (video){
			video.pause();
		}
	};

	var nextSlide = function(){
		if (settings.images){
			var max = settings.images.length;
			if (max>1){
				if (isPlaying){
					var nextSlideUrl;
					var nextSlideTarget = img1;

					if (max>slideShowIndex+2){
						nextSlideUrl = settings.images[slideShowIndex+2];
					}

					if (slideShowIndex%2 == 0){
						img1.classList.add("transparent");
					}else{
						img1.classList.remove("transparent");
						nextSlideTarget = img2;
					}

					slideShowIndex++;
					if (slideShowIndex >= max-1){
						slideShowIndex = 0;
					}

					if (nextSlideUrl) {
						// load next image
						setTimeout(function(){
							nextSlideTarget.style.backgroundImage = "url('"+ nextSlideUrl +"')";
						},3100);
					}
				}

				slideShowTimer = setTimeout(function(){
					nextSlide();
				},5000);

			}
		}
	};

	self.isPlaying = function(){
		return isPlaying;
	};

	self.getSettings = function(){
		return settings;
	};

	return self

}());