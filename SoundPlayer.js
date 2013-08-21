var SoundPlayer = {

	bgm: new Audio,

	playBGM: function(name) {
		SoundPlayer.bgm.loop = true;
		SoundPlayer.bgm.src = "BGM/" + name + ".mp3";
		SoundPlayer.bgm.autoplay = true;
		//SoundPlayer.bgm.onload = function() {
		//	SoundPlayer.bgm.play();
		//};
		
	}

};