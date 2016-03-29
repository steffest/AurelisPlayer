# AurelisPlayer

Web media player allowing multiple concurrent audio streams on desktop and mobile browsers

Input:
- audio playlist for
  - background music (
  - session audio (containing intro, session and outro)
- video url
- array of image urls

Audio playback is based on Howler : https://github.com/goldfire/howler.js/tree/2.0

Desktop browser will default to HTML5 audio
Mobile browser will default to Web Audio API
This allows for multiple concurrent audio playback on mobile.
When using Web Audio API a segmentented playlist is used.
This allows for fast preloading and playing of very large audio files, even on low-end devices with a limited amount of memory.

Example

```javascript
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
		logger: log 
	});
```


Tested on most current Desktop and Mobile browsers
- Windows
  - Internet Explorer 9, 10 and 11
  - Edge
  - Firefox
  - Chrome
- OSX
  - Safari
  - Chrome
  - Firefox
- Linux
  - Chrome
  - Firefox
- Android 4,5 and 6
  - Chrome
  - Stock Androuid browser
  - Firefox
- IOS
  - Ipad IOS9
  - iPhone IOS9 and IOS8
  - iPod touch IOS7 and IOS6
  

Live demo at http://box.stef.be/audio/aurelis/player.html
