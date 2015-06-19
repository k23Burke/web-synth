var Synth = function() {
	this.voices = [];
	this.voices[0] = new Osc();
	this.voices[1] = new Osc();
}

Synth.prototype.changeSubLevel = function (index, vol) {
	this.voices[index].sub.volume.value = vol;
}

var Osc = function (note) {
	this.main = new Tone.MonoSynth();
	this.sub = new Tone.MonoSynth();
	this.filter = new Tone.Filter(800, "lowpass"); //"lowpass", "highpass", "bandpass", "lowshelf", "highshelf", "notch", "allpass", or "peaking"
	// this.lfo = new Tone.LFO("2n", 400, 1200);
	this.noteHeld = false;

	//A-D-S-R  TIME IN MILLISECONDS
	this.attack = 3;
	this.decay = 1;
	this.sustain = -10;
	this.release = 2;



	//initializing route
	this.main.volume.value = -50;
	this.sub.volume.value = -50;
	this.main.connect(this.filter);
	this.sub.connect(this.filter);
	// this.lfo.connect(this.filter.frequency);
	// this.lfo.sync();
	this.filter.toMaster();
}
Osc.prototype.NoteTrigger = function() {
	this.noteHeld = true;
	console.log('TRIGGERED');
    this.main.triggerAttack("c#2", 0);
    this.sub.triggerAttack("c#1", 0);
	
	var TIME_INTERVAL = 10;
	var end = (this.attack * 1000) + (this.decay * 1000);
	var time = 0;
	var volumeValue = Math.round(this.main.volume.value);
	var attackVolInterval = Math.abs(this.main.volume.value) / ((this.attack*1000)/TIME_INTERVAL);
	var decayVolInterval = Math.abs(this.sustain / ((this.decay*1000)/TIME_INTERVAL));
	
	var self = this;
	var interval = window.setInterval( function() {
		time += 10;
		// console.log('TIME', time);
		if(time < (self.attack*1000) && self.noteHeld) {
			// console.log('HELD?', self.noteHeld);
			// console.log('ATTK-INT', attackVolInterval);
			// console.log('Synth_ATTACK_VOL', self.main.volume.value);
			volumeValue += attackVolInterval;
			self.main.volume.value = volumeValue;
			self.sub.volume.value = volumeValue;
		} 
		else if(time < end && self.noteHeld) {
			// console.log('HELD?', self.noteHeld);
			// console.log('Synth_DECAY_VOL', self.main.volume.value);
			volumeValue -= decayVolInterval;
			self.main.volume.value = volumeValue;
			self.sub.volume.value = volumeValue;
		}
		else {
			window.clearInterval(interval);
		}
	}, TIME_INTERVAL);
}


Osc.prototype.releaseTrigger = function() {
	this.noteHeld = false;
	this.main.volume.value = this.sustain;
	this.sub.volume.value = this.sustain;

	var TIME_INTERVAL = 10;
	var end = (this.attack * 1000) + (this.decay * 1000);
	var time = 0;
	var volumeValue = Math.round(this.main.volume.value);
	var releaseVolInterval = Math.abs((-50 + Math.abs(this.sustain)) / ((this.release*1000)/TIME_INTERVAL));
	
	var self = this;
	var interval = window.setInterval( function() {
		time += 10;
		if(time < (self.release*1000)) {
			// console.log('Synth_RELEASE_VOL', self.main.volume.value);
			volumeValue -= releaseVolInterval;
			self.main.volume.value = volumeValue;
			self.sub.volume.value = volumeValue;
		}
		else {
			window.clearInterval(interval);
		}
	}, TIME_INTERVAL);

}
var synth = new Synth();

$('#trig').click(function () {
    synth.voices.push(new Osc());
    synth.voices[synth.voices.length-1].NoteTrigger();
});
$('#release').click(function () {
    synth.voices[synth.voices.length-1].releaseTrigger();
});

$('#changeVol').click(function () {
	console.log(synth.voices[0].sub.volume.value)
	synth.changeSubLevel(0, -10);
	synth.changeSubLevel(1, -10);
	console.log(synth.voices[0].sub.volume.value)

});

Tone.Transport.start();