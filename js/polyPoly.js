var Synth = function() {
	this.voices = [];
	this.voices[0] = new Osc();
	this.voices[1] = new Osc();
}

Synth.prototype.changeSubLevel = function (index, vol) {
	this.voices[index].sub.volume.value = vol;
}

var Osc = function (note) {
	//A-D-S-R  TIME IN MILLISECONDS!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
	this.attack = 3;
	this.decay = 1;
	this.sustain = -10;
	this.release = 20;

	this.noteHeld = false;

	//FILTER
	this.filterFreq = 1600;
	this.filterTypeArray = ["lowpass", "highpass", "bandpass", "lowshelf", "highshelf", "notch", "allpass", "peaking"]
	this.filter = new Tone.Filter(this.filterFreq, this.filterTypeArray[0]);
	//NO RESONANCE!!

	//LFO
	this.lfoRateArray = ["32n", "16n", "8n", "4n", "2n", "1n"];
	this.lfoAmount = 0;
	this.lfoFrequency = new Tone.LFO(this.lfoRateArray[0], this.filterFreq - this.lfoAmount, this.filterFreq + this.lfoAmount);

	//create array of keys
	this.keys = [];
    var keyArray = ["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"];

	for(var i = 0;i < 128; i++) {
		this.keys[i] = {
			main: new Tone.MonoSynth(),
			sub: new Tone.MonoSynth(),
			noteHeld: false
		}

		//set basic params
		this.keys[i].main.volume.value = 0;
		this.keys[i].sub.volume.value = 0;

		//trigger key
	    var key = keyArray[i % 12];
	    var oct = Math.round(i / 12);
	    var theNote = key + oct.toString();
	    var theSubNote = '';
	    if(oct === 0) theSubNote = key + "0";
	    else theSubNote = key + (oct-1).toString();
	    this.keys[i].main.triggerAttack(theNote, 0);
	    this.keys[i].sub.triggerAttack(theSubNote, 0);

	    //connect to filter
		this.keys[i].main.connect(this.filter);
		this.keys[i].sub.connect(this.filter);
	}

	//lfo connect to filter
	// this.lfo.connect(this.filter.frequency);
	// this.lfo.sync();
	this.filter.toMaster();
}


Osc.prototype.noteTrigger = function(midiKey) {
	console.log('TRIGGERED');
	this.keys[midiKey].noteHeld = true;
	
	var TIME_INTERVAL = 10;
	var end = (this.attack * 1000) + (this.decay * 1000);
	var time = 0;
	var volumeValue = Math.round(this.keys[midiKey].main.volume.value);
	var attackVolInterval = Math.abs(this.keys[midiKey].main.volume.value) / ((this.attack*1000)/TIME_INTERVAL);
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
			self.keys[midiKey].main.volume.value = volumeValue;
			self.keys[midiKey].sub.volume.value = volumeValue;
		} 
		else if(time < end && self.noteHeld) {
			// console.log('HELD?', self.noteHeld);
			// console.log('Synth_DECAY_VOL', self.main.volume.value);
			volumeValue -= decayVolInterval;
			self.keys[midiKey].main.volume.value = volumeValue;
			self.keys[midiKey].sub.volume.value = volumeValue;
		}
		else {
			window.clearInterval(interval);
		}
	}, TIME_INTERVAL);
}


Osc.prototype.releaseTrigger = function() {
	this.noteHeld = false;
	this.keys[midiKey].main.volume.value = this.sustain;
	this.keys[midiKey].sub.volume.value = this.sustain;

	var TIME_INTERVAL = 10;
	var end = (this.attack * 1000) + (this.decay * 1000);
	var time = 0;
	var volumeValue = Math.round(this.keys[midiKey].main.volume.value);
	var releaseVolInterval = Math.abs((-50 + Math.abs(this.sustain)) / ((this.release*1000)/TIME_INTERVAL));
	
	var self = this;
	var interval = window.setInterval( function() {
		time += 10;
		if(time < (self.release*1000)) {
			// console.log('Synth_RELEASE_VOL', self.main.volume.value);
			volumeValue -= releaseVolInterval;
			self.keys[midiKey].main.volume.value = volumeValue;
			self.keys[midiKey].sub.volume.value = volumeValue;
		}
		else {
			window.clearInterval(interval);
		}
	}, TIME_INTERVAL);

}
var synth = new Synth();

$('#trig').click(function () {
	synth.voices[0].noteTrigger($('#midiNum').val());
});
$('#release').click(function () {
	synth.voices[0].releaseTrigger($('#midiNum').val());

    // synth.voices[synth.voices.length-1].releaseTrigger();
});

$('#changeVol').click(function () {
	console.log(synth.voices[0].sub.volume.value)
	synth.changeSubLevel(0, -10);
	synth.changeSubLevel(1, -10);
	console.log(synth.voices[0].sub.volume.value)

});

Tone.Transport.start();