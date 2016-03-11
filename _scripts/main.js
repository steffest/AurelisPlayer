document.addEventListener("DOMContentLoaded", function() {

	// settings the videoUrl to undefined will skip the video and play the image slideShow;
	var videoUrl = '_video/UnderwaterLightRays.mp4';
	if (window.location.getParameter("slideshow")) videoUrl = undefined;


	var audioEngine = "";
	/*
	 desktop browser will use HTML5 audio by default.
	 mobile browsers will use WebAudioAPI by default to allow for multiple concurrent audio playback
	 the drawback of WebAudioAPI is that all audio must be preloaded

	 set to audioEngine to 'html5' if you want to try to use HTML5 audio instead of WebAudioAPI, even on mobile
	 set to audioEngine to 'webaudio' to always use WebAudioAPI
	 */

	//audioEngine = "html5";
	//audioEngine = "webaudio";


	if (window.location.getParameter("forcehtml5")) audioEngine = "html5";
	if (window.location.getParameter("forcewebaudio")) audioEngine = "webaudio";

	AurelisPlayer.init({
		container: "aurelisplayer",
		backGroundAudioUrl: '_samples/birds.mp3',
		introAudioUrl: '_samples/chicken1.mp3',
		sessionAudioUrl: '_samples/bond.mp3',
		outroAudioUrl: '_samples/chicken2.mp3',
		videoUrl: videoUrl,
		images:[
			'_video/snap1.png',
			'_video/snap2.png',
			'_video/snap3.png',
			'_video/snap4.png',
			'_video/snap5.png',
			'_video/snap6.png'
		],
		audioEngine: audioEngine
	});
});


function log(s){
	var container = document.getElementById("log");
	if (container){
		container.innerHTML += s + "<br>";
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
