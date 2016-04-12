var AurelisPlayer = (function(){
	var self = {};
	var mainPlayer = self;
	var mainTimer;

	var container;

	var isPlaying = false;
	var isStarted = false;
	var isReady = false;
	var preloadCount = 0;
	var preloadMax = 0;
	var slideShowIndex = 0;
	var bufferCount;
	var logger;
	var controlElements = {
		position:0,
		dotWidth: 12
	};

	var partLength = 20; // 20 seconds
	var initialSeek;
	var initialPlay;

	var labels = {
		session: "Session",
		background: "Background"
	};

	var volume = {
		session: 0.8,
		background: 0.8
	};

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
		this.initialSilence = properties.initialSilence || 0;

		if (settings.preferHTML5 && !this.loop) this.lastIndex = this.playList.length;

		if (logger && this.initialSilence){
			logger("Playlist " + this.name + " has an initial silence of " + this.initialSilence + " seconds");
		}

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

	AurelisAudioPlaylist.prototype.setPosition = function(position,andPlay){

		position = Math.round(position);
		if (logger) logger("Seeking into session audio to " + position + " seconds");

		controlElements.position = position;
		updateControls();
		initialPlay = andPlay;

		var realPosition = position - this.initialSilence;

		// in which audio part are we?
		var index = this.getIndexforPosition(realPosition);
		var segmentDelta = realPosition % partLength;

		if (settings.preferHTML5){
			if (this.index == index.playlist){
				// we are still in the same audio file
				var startPosition = index.segment * partLength + segmentDelta;
				var howler = this.howlers[this.howlerIndex];
				if (howler) {
					if (logger) logger("Seeking into same audio file to " + startPosition);
					howler.seek(startPosition);
					if (andPlay) self.play();
				}
			}else{
				if (logger) logger("We have seeked outside the current audio file. Loading new one");
				this.index = index.playlist - 1;
				initialSeek = (index.segment * partLength) + segmentDelta;
				this.loadNextBuffer();
			}
		}else{
			// segment playback
			if ((this.index == index.playlist) && (this.segmentIndex == index.segment)){
				// we are still in the same 20 second fragment: continue playing;
				if (initialPlay) mainPlayer.play();
			}else{
				if (logger) logger("We have seeked outside the current audio file.");
				if (logger) logger("Setting segment index to " + index.playlist + "," + index.segment);

				// clear all howlers so the intial buffering can start over
				this.howlers.forEach(function(howler){
					howler.unload();
				});

				// reset player to initial state
				isReady = false;
				preloadCount = 0;
				preloadMax = 1;

				this.index = index.playlist - 1;
				this.segmentIndex = index.segment + 1;
				this.isPreloaded = false;

				this.lastSegmentIndex = 0;
				this.howlerIndex = 0;
				this.howlers = [];
				status.innerHTML = preLoadingText;
				this.loadNextBuffer();
			}
		}

	};

	AurelisAudioPlaylist.prototype.setVolume = function(newVolume){
		newVolume = Math.max(0,newVolume);
		newVolume = Math.min(1,newVolume);

		if (logger) logger("Setting volume " + this.name + " to " + newVolume);
		volume[this.name] = newVolume;
		var howler = this.howlers[this.howlerIndex];
		if (howler) {
			howler.volume(newVolume);
		}
	};

	AurelisAudioPlaylist.prototype.getIndexforPosition = function(position){

		var length = 0;

		for (var i = 0, len = this.playList.length; i<len;i++){
			var item = this.playList[i];
			var maxParts = item.parts || 0;
			for (var j = 0; j<maxParts;j++){
				length += partLength;
				if (length>position){
					return {
						playlist: i+1,
						segment: j
					}
				}
			}
		}

		return {
			index: 1,
			segment: 0
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
			buffer: settings.preferHTML5,
			volume: volume[self.name] || 0.5
		});

		howler.on("load",function(){
			if (logger) logger("Audio loaded: " + url);
			if (!self.isPreloaded){
				self.isPreloaded = true;
				onAudioPreload();
			}
			if (initialSeek){
				if (logger) logger("Starting at position: " + initialSeek);
				// we are seeking into the stream;
				howler.on("play",function(){
					if (initialSeek){
						if (logger) logger("Seeking to: " + initialSeek);
						this.seek(initialSeek);
						initialSeek = false;
					}
				});

				if (initialPlay) mainPlayer.play();
			}
		});

		howler.on("play",function(){
			if (self.initialSilence && self.initialSilence > controlElements.position) this.pause();
			this.volume(volume[self.name] || 0.5);
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

	var preLoadingText = "preloading audio ...";

	self.init = function(properties){

		settings = properties;
		container = document.getElementById(settings.container);

		settings.preferHTML5 = !Client.isMobileDevice();
		if (settings.audioEngine == "html5") settings.preferHTML5=true;
		if (settings.audioEngine == "webaudio") settings.preferHTML5=false;

		bufferCount = 2; // amount of segments to preload in advance
		if (settings.preferHTML5) bufferCount=1;

		logger = settings.logger;

		if (typeof settings.sessionVolume == "number") volume.session = settings.sessionVolume;
		if (typeof settings.backgroundVolume == "number") volume.background = settings.backgroundVolume;
		if (settings.sessionVolumeLabel) labels.session = settings.sessionVolumeLabel;
		if (settings.backgroundVolumeLabel) labels.background = settings.backgroundVolumeLabel;

		generate();
		status.innerHTML = preLoadingText;

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
				initialSilence: settings.silenceBeforeSession || 0,
				loop: false,
				parent: self,
				onEnd: function(){
					if (!settings.backgroundMusicAfterSession) self.stop();
				}
			})
		}

		// skip forced preloading for html5 audio
		if (settings.preferHTML5) {
			isReady = true;
		}


	};

	self.start = function(){

		isPlaying = true;
		isStarted = true;

		if (logger) logger("Start audio playback");
		startVisual();

		playButton.classList.add("hidden");

		if (backgroundAudio) backgroundAudio.play();
		clearTimeout(mainTimer);
		mainTimer = setTimeout(function(){
			if (isPlaying && sessionAudio){
				sessionAudio.play();
				onTimeUpdate();
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

	self.setPosition = function(position,andPlay){
		sessionAudio.setPosition(position,andPlay);
	};

	var onTimeUpdate = function(){
		if (isPlaying){
			if (controlElements.position < controlElements.length) controlElements.position += 1;
			updateControls();
			if (sessionAudio){
				if (sessionAudio.initialSilence && controlElements.position == sessionAudio.initialSilence){
					if (logger) logger("Initial silence of Session has passed, playing session");
					sessionAudio.play();
				}
			}
		}
		clearTimeout(mainTimer);
		mainTimer = setTimeout(onTimeUpdate,1000);
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
			video.loop = true;
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

		container.appendChild(generateControls());

	};

	var generateControls = function(){

		var controls = document.createElement("div");
		controls.className = "controls hidden";

		// volume
		var volumeIcon = document.createElement("div");
		volumeIcon.className = "volume";
		volumeIcon.onclick = showVolumeControls;
		controls.appendChild(volumeIcon);

		// progressBar
		var progress = document.createElement("div");
		progress.className = "progress control_progress";
		var time1 = document.createElement("div");
		time1.className = "time control_progress";
		var time2 = document.createElement("div");
		time2.className = "time right control_progress";
		var bar = document.createElement("div");
		bar.className = "bar control_progress";
		var dot = document.createElement("div");
		dot.className = "dot audio";
		makeDraggable(dot,bar);
		bar.appendChild(dot);
		progress.appendChild(time1);
		progress.appendChild(bar);
		progress.appendChild(time2);
		controls.appendChild(progress);


		controlElements.container = controls;
		controlElements.elapsed = time1;
		controlElements.remaining =  time2;
		controlElements.bar = bar;
		controlElements.dot = dot;
		controlElements.length = self.getAudioLength();
		controlElements.position = 0;
		updateControls();

		progress.ontouchstart = function(e){
			var src = e.srcElement;
			if (src){
				e.preventDefault();
				if (src.classList.contains("control_progress")){
					startDragMarker(controlElements.dot,e,"parent touch");
				}
			}
		};

		// fullscreen button
		var fullScreenButton = document.createElement("div");
		fullScreenButton.className = "fullscreenbutton";
		fullScreenButton.onclick = toggleFullscreen;
		controls.appendChild(fullScreenButton);

		return controls;

	};

	var getEventCoordinateX = function(event){
		var result = 0;
		if (event.targetTouches){
			var touch = event.targetTouches[0];
			result = touch.pageX;

			if (event.targetTouches.length > 1){
				// multitouch ... should we handle this?
			}

		}else{
			// no touchscreen
			if (event.pageX){
				result = event.pageX;
			}
		}

		return result;
	};

	var startDragMarker = function(elm,event,source){
		controlElements.isDragging = true;
		controlElements.dragElement = elm;
		controlElements.dragElement.classList.add("dragging");
		controlElements.startX = getEventCoordinateX(event);
		controlElements.startDotX = parseInt(elm.style.left);
		if (isNaN(controlElements.startDotX)) controlElements.startDotX = 0;

		if (logger) logger("start drag dot from " + source + " with start X " + controlElements.startX);
	};

	var onDragMarker = function(event){
		if (controlElements.isDragging && controlElements.dragElement){
			var delta = getEventCoordinateX(event) - controlElements.startX;
			var dotPosition = controlElements.startDotX + delta;

			var max = controlElements.bar.offsetWidth - controlElements.dotWidth;

			dotPosition = Math.max(0,dotPosition);
			dotPosition = Math.min(max,dotPosition);

			controlElements.dragElement.style.left = dotPosition + "px";
		}
	};

	var endDragMarker = function(){
		if (controlElements.isDragging){
			controlElements.isDragging = false;
			if (controlElements.dragElement){
				controlElements.dragElement.classList.remove("dragging");

				var left = parseInt(controlElements.dragElement.style.left);
				var max = controlElements.bar.offsetWidth - controlElements.dotWidth;
				var ratio = left/max;

				if (controlElements.dragElement.classList.contains("audio")){
					var wasPlaying = self.isPlaying();
					self.pause();
					self.setPosition(controlElements.length * ratio,wasPlaying);
				}

				if (controlElements.dragElement.classList.contains("volumesession")){
					sessionAudio.setVolume(ratio);
				}

				if (controlElements.dragElement.classList.contains("volumebackground")){
					backgroundAudio.setVolume(ratio);
				}

				controlElements.dragElement.touchHandled = false;
				controlElements.dragElement = undefined;
			}
		}
	};

	var makeDraggable = function(elm){
		if (window.navigator.msPointerEnabled) {
			// MS pointer model
			elm.onpointerdown = elm.onmspointerdown = function(e){
				e.preventDefault();
				startDragMarker(this,e,"pointer");
			};

			if (!controlElements.hasDocumentHandlers) {
				document.addEventListener("MSPointerMove", onDragMarker);
				document.addEventListener("MSPointerUp", endDragMarker);
				controlElements.hasDocumentHandlers = true;
			}
		}
		else {
			// mouse / touch model
			elm.onmousedown = function(e){
				if (elm.touchHandled) return;
				if (!e) e = window.event;
				if (e.preventDefault){
					e.preventDefault();
				}
				startDragMarker(this,e,"mouse")
			};
			elm.ontouchstart = function(e){
				elm.touchHandled = true;
				e.preventDefault();
				startDragMarker(this,e,"touch")
			};

			if (!controlElements.hasDocumentHandlers){
				document.addEventListener("mousemove",onDragMarker);
				document.addEventListener("touchmove",onDragMarker);
				document.addEventListener("mouseup",endDragMarker);
				document.addEventListener("touchend",endDragMarker);
				controlElements.hasDocumentHandlers = true;
			}

		}
	};

	var updateControls = function(){

		var w = 100;
		var dotPosition;
		var volumeValue;

		if (controlElements.bar) w = controlElements.bar.offsetWidth - controlElements.dotWidth;

		if (controlElements.elapsed && controlElements.remaining){
			controlElements.elapsed.innerHTML = formatTime(controlElements.position);
			controlElements.remaining.innerHTML = "-" + formatTime(controlElements.length - controlElements.position);

			if (controlElements.length && !controlElements.isDragging){
				dotPosition = (controlElements.position/controlElements.length) * w;
				controlElements.dot.style.left = dotPosition + "px";
			}
		}

		if (controlElements.volumeDots && !controlElements.isDragging){
			if (controlElements.volumeDots.session){
				volumeValue = volume["session"] || 0.5;
				dotPosition = volumeValue * w;
				controlElements.volumeDots.session.style.left = dotPosition + "px";
			}
			if (controlElements.volumeDots.background){
				volumeValue = volume["background"] || 0.5;
				dotPosition = volumeValue * w;
				controlElements.volumeDots.background.style.left = dotPosition + "px";
			}
		}
	};

	var toggleFullscreen = function(){
		var elm = container || document.documentElement;
		var isFullscreen = container.classList.contains("fullscreen");

		if (isFullscreen){
			if (document.exitFullscreen) {
				document.exitFullscreen();
			} else if (document.msExitFullscreen) {
				document.msExitFullscreen();
			} else if (document.mozCancelFullScreen) {
				document.mozCancelFullScreen();
			} else if (document.webkitExitFullscreen) {
				document.webkitExitFullscreen();
			}else{
				container.classList.remove("full");
			}
			container.classList.remove("fullscreen");
		}else{
			if (elm.requestFullscreen) {
				elm.requestFullscreen();
			} else if (elm.msRequestFullscreen) {
				elm.msRequestFullscreen();
			} else if (elm.mozRequestFullScreen) {
				elm.mozRequestFullScreen();
			} else if (elm.webkitRequestFullscreen) {
				elm.webkitRequestFullscreen();
			}else{
				container.classList.add("full");
			}
			container.classList.add("fullscreen");
		}
		updateControls();
	};

	var showVolumeControls = function(){
		if (logger) logger("Toggle Volume Controls");
		var volumeControls = document.getElementById("volumeControls");
		if (!volumeControls){
			volumeControls = document.createElement("div");
			volumeControls.id = "volumeControls";
			volumeControls.className = "volumeControls";

			volumeControls.appendChild(generateVolumeControl("session"));
			volumeControls.appendChild(generateVolumeControl("background"));

			container.appendChild(volumeControls);

			// make the entire control panel react to touch too enlarge the hit area
			volumeControls.ontouchstart = function(e){
				var src = e.srcElement;
				if (src){
					e.preventDefault();
					if (src.classList.contains("control_session")){
						startDragMarker(controlElements["dot_session"],e,"parent touch");
					}
					if (src.classList.contains("control_background")){
						startDragMarker(controlElements["dot_background"],e,"parent touch");
					}
				}
			};

			updateControls();
		}else{
			volumeControls.classList.toggle("hidden");
		}
	};

	var generateVolumeControl = function(section){
		var volumeControl = document.createElement("div");
		volumeControl.className = "control_" + section;
		volumeControl.id = "volume" + section;

		var label = document.createElement("div");
		label.className = "label control_" + section;
		label.innerHTML = labels[section] || section;

		var bar = document.createElement("div");
		bar.className = "bar control_" + section;
		var dot = document.createElement("div");
		dot.className = "dot volume" + section;

		controlElements.volumeDots = controlElements.volumeDots || {};
		controlElements.volumeDots[section] = dot;

		makeDraggable(dot);
		bar.appendChild(dot);
		volumeControl.appendChild(label);
		volumeControl.appendChild(bar);

		controlElements["dot_" + section] = dot;

		return volumeControl;
	};

	var onAudioPreload = function(){
		preloadCount++;
		if (preloadCount == preloadMax){
			isReady = true;
			playButton.classList.remove("hidden");
			status.innerHTML = "";
			if (controlElements.container){
				controlElements.container.classList.remove("hidden");
			}

			if (initialPlay){
				mainPlayer.play();
			}
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

	var formatTime = function(s){
		var hours = "";
		var minutes = "00:";
		var seconds = s;
		if (seconds > 3600) {
			hours = Math.floor(seconds/3600) + ":";
			seconds = seconds % 3600;
		}

		if (seconds > 60){
			minutes = Math.floor(seconds/60);
			if (minutes<10) minutes = "0" + minutes;
			minutes = minutes + ":";
			seconds = seconds % 60;
		}

		if (seconds<10) seconds = "0" + seconds;

		return hours + minutes + seconds;
	};

	self.getAudioLength = function(){
		var length = settings.silenceBeforeSession || 0;
		if (settings.sessionPlaylist && settings.sessionPlaylist.length){
			settings.sessionPlaylist.forEach(function(item){
				if (item.parts){
					length += item.parts*partLength;
				}else if (item.duration){
					length += item.duration;
				} else {
					console.error("Error: could not get lenght of playlist item.",item);
				}
			});
		}
		return length;
	};

	self.setVolume = function(session,background){
		if (sessionAudio) sessionAudio.setVolume(session);
		if (backgroundAudio) backgroundAudio.setVolume(session);
		updateControls();
	};

	self.getVolume = function(){
		return volume;
	};

	self.isPlaying = function(){
		return isPlaying;
	};

	self.getSettings = function(){
		return settings;
	};


	return self

}());