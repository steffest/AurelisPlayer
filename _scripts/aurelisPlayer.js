var AurelisPlayer = (function(){
	var self = {};

	var container;

	var isPlaying = false;
	var isStarted = false;
	var isReady = false;
	var preloadCount = 0;
	var preloadMax = 0;
	var slideShowIndex = 0;
	var bufferCount;
	var logger;


	// --- Aurelis Audio Playlist Model ---
	var AurelisAudioPlaylist = function(properties){
		this.index = 0;
		this.segmentIndex = 1;
		this.lastIndex = -1;
		this.lastSegmentIndex = 0;
		this.howlerIndex = 0;
		this.howlers = [];
		this.playList = properties.playList;
		this.name = properties.name;
		this.loop = properties.loop;
		this.isPreloaded = false;
		this.parent= properties.parent;
		this.onEnd = properties.onEnd;

		if (settings.preferHTML5 && !this.loop) this.lastIndex = this.playList.length;

		this.loadNextBuffer();
	};

	AurelisAudioPlaylist.prototype.play = function(){
		var howler = this.howlers[this.howlerIndex];
		if (howler) {
			if (logger) logger("Playing audio " + howler._src);
			howler.play();
		}
	};

	AurelisAudioPlaylist.prototype.pause = function(){
		var howler = this.howlers[this.howlerIndex];
		if (howler) {
			if (logger) logger("Pausing audio " + howler._src);
			howler.pause();
		}
	};

	AurelisAudioPlaylist.prototype.stop = function(){
		var howler = this.howlers[this.howlerIndex];
		if (howler) {
			if (logger) logger("fadeing out audio " + howler._src);
			howler.fade(1,0,3500);
			setTimeout(function(){
				howler.stop();
				if (logger) logger("audio " + howler._src + " stopped");
			},4000);
		}
	};

	AurelisAudioPlaylist.prototype.loadNextBuffer = function(){
		var howler,url;

		if (this.howlers.length == 0){
			// initial preloading
			for (var i = 0; i<bufferCount;i++){
				url = this.getNextSegmentUrl();
				if (url){
					if (logger) logger("creating audio object - preloading " + this.name + " url " + url);
					howler = this.createHowler(url);
					this.howlers.push(howler);
				}
			}
		}else{
			url = this.getNextSegmentUrl();
			if (url){
				var index = this.howlerIndex + bufferCount;
				if (index >= this.howlers.length) index -= this.howlers.length;
				howler = this.howlers[index];
				howler.unload();
				this.howlers[index] = this.createHowler(url);
				if (logger) logger("reusing " + this.name + " audio object " + index + " - preloading " + url);
			}

		}
	};

	AurelisAudioPlaylist.prototype.playNextSegment = function(){
		if (this.parent.isPlaying()){
			this.howlerIndex++;
			if (this.howlerIndex == this.howlers.length) this.howlerIndex=0;
			var howler = this.howlers[this.howlerIndex];
			if (howler) {
				if (logger) logger("Playing audio " + howler._src);
				howler.play();
			}
		}
	};

	AurelisAudioPlaylist.prototype.getNextSegmentUrl = function(){
		// get next audio url;
		var url;

		if (settings.preferHTML5){
			// direct url to full mp3
			if (this.index < this.playList.length) {
				url = this.playList[this.index].url;
				this.index++;
			}else{
				if (this.loop){
					this.index = 0;
					url = this.playList[this.index].url;
				}else{
					this.lastIndex = this.index;
					if (logger) logger("setting lastindex to " + this.lastIndex)  ;
					return false;
				}
			}
		}else{
			var audioUrl = this.playList[this.index];
			if (this.segmentIndex > audioUrl.parts){
				// this audiofile is done, moving to the next one.
				this.index++;
				if (this.index >= this.playList.length){
					// playlist is Done.
					if (logger) logger("Playlist for " + this.name + " is done, looping: " + this.loop);
					if (this.loop){
						this.index = 0;
						audioUrl = this.playList[this.index];
						this.segmentIndex = 1;
					}else{
						this.lastSegmentIndex = this.segmentIndex;
						return false;
					}
				}else{
					audioUrl = this.playList[this.index];
					this.segmentIndex = 1;
				}
			}
			// get path to folder
			url = audioUrl.url.substr(0,audioUrl.url.length-4) + "/";
			var s_index = "" + this.segmentIndex;
			if (s_index.length<3) s_index = "0" + s_index;
			if (s_index.length<3) s_index = "0" + s_index;

			url += s_index + ".mp3";

			url = url.replace('mp3files/hi_speed', 'chunks');
			url = url.replace('musicfiles', 'music_chunks');

			this.segmentIndex++;
		}
		return url;
	};

	AurelisAudioPlaylist.prototype.createHowler = function(url){
		var self = this;

		var howler = new Howl({
			src: [url],
			html5: settings.preferHTML5,
			autoplay: self.parent.isPlaying() && settings.preferHTML5,
			buffer: settings.preferHTML5
		});

		howler.on("load",function(){
			if (logger) logger("Audio loaded: " + url);
			if (!self.isPreloaded){
				self.isPreloaded = true;
				onAudioPreload();
			}
		});

		howler.on("end",function(){
			if (self.parent.isPlaying()){
				if (logger) logger("Audio ended: " + url);
				var isPlaylistEnded = false;
				if (settings.preferHTML5){
					if (self.index == self.lastIndex) isPlaylistEnded = true;
					if (logger) logger("self.index == self.lastIndex " + self.index + ", " + self.lastIndex);
				}else{
					if (self.segmentIndex == self.lastSegmentIndex) isPlaylistEnded = true;
				}

				if (isPlaylistEnded){
					if (logger) logger("Playlist " + self.name + " is done");
					if (self.onEnd) self.onEnd();
				}else{
					self.loadNextBuffer();
					if (!settings.preferHTML5) self.playNextSegment();

				}

			}
		});

		return howler;
	};


	// --- End Aurelis Audio Playlist Model ---

	var settings,
		backgroundAudio,
		sessionAudio,
		playButton,
		video,
		status,
		img1,
		img2,
		slideShowTimer;

	self.init = function(properties){

		settings = properties;
		container = document.getElementById(settings.container);

		settings.preferHTML5 = !Client.isMobileDevice();
		if (settings.audioEngine == "html5") settings.preferHTML5=true;
		if (settings.audioEngine == "webaudio") settings.preferHTML5=false;

		bufferCount = 2; // amount of segments to preload in advance
		if (settings.preferHTML5) bufferCount=1;

		logger = settings.logger;

		generate();
		status.innerHTML = "preloading audio ...";

		if (settings.backGroundPlaylist && settings.backGroundPlaylist.length){
			preloadMax++;
			backgroundAudio = new AurelisAudioPlaylist({
				name: "background",
				playList: settings.backGroundPlaylist,
				loop: true,
				parent: self
			})
		}

		if (settings.sessionPlaylist && settings.sessionPlaylist.length){
			preloadMax++;
			sessionAudio = new AurelisAudioPlaylist({
				name: "session",
				playList: settings.sessionPlaylist,
				loop: false,
				parent: self,
				onEnd: function(){
					self.stop();
				}
			})
		}

		// skip forced preloading for html5 audio
		if (settings.preferHTML5) isReady = true;

	};

	self.start = function(){

		isPlaying = true;
		isStarted = true;

		if (logger) logger("Start audio playback");
		startVisual();

		playButton.classList.add("hidden");

		if (backgroundAudio) backgroundAudio.play();
		setTimeout(function(){
			if (isPlaying && sessionAudio){
				sessionAudio.play();
			}
		},1000);
	};

	self.pause = function(){
		if (logger) logger("pausing");
		if (backgroundAudio) backgroundAudio.pause();
		if (sessionAudio) sessionAudio.pause();
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
				if (logger) logger("playing");
				if (backgroundAudio) backgroundAudio.play();
				if (sessionAudio) sessionAudio.play();
				if (video) video.play();

				playButton.classList.add("hidden");
				isPlaying = true;
			}else{
				self.start();
			}
		}
	};

	self.stop = function(){
		if (logger) logger("Aurelis Player Stop");
		isPlaying = false;
		isStarted = false;
		if (backgroundAudio) backgroundAudio.stop();
		if (video){
			video.pause();
			video.classList.add("hidden");
		}
		if (img1) img1.classList.remove("hidden");
		playButton.classList.remove("hidden");
	};

	var generate = function(){
		container.className = "aurelisplayer";
		var includeVideo = (Client.canEmbedVideo() && settings.videoUrl && !Client.isMobileDevice());

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
		if (preloadCount == preloadMax){
			isReady = true;
			playButton.classList.remove("hidden");
			status.innerHTML = "";
		}
	};

	var startVisual = function(){
		if (video && settings.videoUrl){
			if (logger) logger("Start video playback");
			video.src = settings.videoUrl;
			video.play();
			video.classList.remove("hidden");
		}else{
			// start Slideshow
			clearTimeout(slideShowTimer);
			if (logger) logger("start slideshow");
			nextSlide();
		}
	};

	var stopVisual = function(){
		if (logger) logger("stop video playback");
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