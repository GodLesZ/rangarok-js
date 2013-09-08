var SoundPlayer = {

	bgm: new Audio,

	playBgm: function(name) {
		SoundPlayer.bgm.loop = true;
		SoundPlayer.bgm.src = "BGM/" + name + ".mp3";
		SoundPlayer.bgm.autoplay = true;
		SoundPlayer.bgm.volume = 0.5;
		//SoundPlayer.bgm.onload = function() {
		//	SoundPlayer.bgm.play();
		//};
		
	},
	
	unpauseBgm: function() {
		SoundPlayer.bgm.play();
	},
	
	pauseBgm: function() {
		SoundPlayer.bgm.pause();
	}

};