# AurelisPlayer

Web media player allowing multiple concurrent audio streams on desktop and mobile browsers

Input:
- audio urls for
  - background music
  - intro
  - session
  - outro
- video url
- array of image urls

Audio playback is based on Howler : https://github.com/goldfire/howler.js/tree/2.0

Desktop browser will default to HTML5 audio
Mobile browser will default to Web Audio API
This allows for multiple concurrent audio playback on mobile.
The drawback is that all audio must be preloaded

Example

```javascript
AurelisPlayer.init({
		container: "aurelisplayer",
		backGroundAudioUrl: '_samples/birds.mp3',
		introAudioUrl: '_samples/chicken1.mp3',
		sessionAudioUrl: '_samples/bond.mp3',
		outroAudioUrl: '_samples/chicken2.mp3',
		videoUrl: '_video/UnderwaterLightRays.mp4',
		images:[
			'_video/snap1.png',
			'_video/snap2.png',
			'_video/snap3.png',
			'_video/snap4.png',
			'_video/snap5.png',
			'_video/snap6.png'
		],
		audioEngine: "default"
	});
```
