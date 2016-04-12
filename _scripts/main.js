document.addEventListener("DOMContentLoaded", function() {

	// settings the videoUrl to undefined will skip the video and play the image slideShow;
	var videoUrl = '_video/UnderwaterLightRays.mp4';
	if (window.location.getParameter("slideshow")) videoUrl = undefined;


	var audioEngine = "";
	/*
	 desktop browser will use HTML5 audio by default.
	 mobile browsers will use WebAudioAPI by default to allow for multiple concurrent audio playback
	 the drawback of WebAudioAPI is that all audio must be preloaded

	 Therefore when WebAudioAPI is used, the audio will be loaded and played is segments
	 The player assumes there's a directory with the same name as the mp3 file with several smaller mp3 files in it, numbered as xxx.mp3,
	 starting from 001.mp3 onwards.
	 the maximum number of parts should be stated as the "parts" parameter in the playlist object array.

	 set to audioEngine to 'html5' if you want to try to use HTML5 audio instead of WebAudioAPI, even on mobile
	 set to audioEngine to 'webaudio' to always use WebAudioAPI
	 */

	//audioEngine = "html5";
	//audioEngine = "webaudio";


	if (window.location.getParameter("forcehtml5")) audioEngine = "html5";
	if (window.location.getParameter("forcewebaudio")) audioEngine = "webaudio";

	AurelisPlayer.init({
		container: "aurelisplayer",
		backGroundPlaylist: [
			{url: '_samples/Guitar01.mp3', parts: 53}
		],
		sessionPlaylist:[
			{url: '_samples/EN00015.mp3', parts: 60 },
			{url: '_samples/EN07101.mp3', parts: 107 },
			{url: '_samples/EN99906.mp3', parts: 25 }
		],
		silenceBeforeSession: 10, // in seconds
		backgroundMusicAfterSession: false,
		videoUrl: videoUrl,
		images:[
			'_video/snap1.png',
			'_video/snap2.png',
			'_video/snap3.png',
			'_video/snap4.png',
			'_video/snap5.png',
			'_video/snap6.png'
		],
		audioEngine: audioEngine,
		sessionVolume: 0.8, // 0 to 1
		sessionVolumeLabel: "Session",
		backgroundVolume: 0.8, // 0 to 1
		backgroundVolumeLabel: "Background",
		logger: log // set to false to disable logging
	});
});


var logCounter = 0;
function log(s){
	var container = document.getElementById("log");
	if (container){
		if (logCounter>40) {
			container.innerHTML = "";
			logCounter = 0;
		}
		container.innerHTML += s + "<br>";
		logCounter++;
	}
	console.log(s);
}

if (typeof window.location.getParameter != "function") {
	window.location.getParameter = function(parameterName) {
		var queryString = window.location.search.substring(1);
		var parameters = queryString.split('&');
		var parameter;
		for (var i = 0, totalParams = parameters.length; i < totalParams; i++) {
			parameter = parameters[i].split('=');
			if (parameter && parameter.length > 0 && parameter[0] == parameterName) {
				return (parameter.length==2) ? parameter[1] : '';
			}
		}
		return '';
	}
}
