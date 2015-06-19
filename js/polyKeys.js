var Synth = function() {
	this.voices = [];
	this.voices[0] = new Osc();
	this.voices[1] = new Osc();
}

Synth.prototype.changeSubLevel = function (index, vol) {
	this.voices[index].sub.volume.value = vol;
}

var Osc = function (note) {
	this.keys = [];
	this.volume  = new Tone.Volume(0);
	this.subVolume = -100; //MAX: -50
	this.filter = new Tone.Filter(800, "lowpass"); //"lowpass", "highpass", "bandpass", "lowshelf", "highshelf", "notch", "allpass", or "peaking"
	// this.lfo = new Tone.LFO("2n", 400, 1200);
	this.noteHeld = false;

	//A-D-S-R  TIME IN MILLISECONDS
	this.attack = 3;
	this.decay = 1;
	this.sustain = -10;
	this.release = 2;

	//initializing route
	this.volume.connect(this.filter);
	// this.sub.connect(this.filter);
	// this.lfo.connect(this.filter.frequency);
	// this.lfo.sync();
	this.filter.toMaster();
}

Osc.prototype.createNote = function(midiKey) {
    var keyArray = ["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"];
    var key = keyArray[midiKey % 12];
    var oct = Math.round(midiKey / 12);
    var theNote = key + oct.toString();
    var theSubNote = '';
    if(oct === 0) theSubNote = key + "0";
    else theSubNote = key + (oct-1).toString();

	var keysObj = {};
	keysObj[midiKey] = {
		main: new Tone.MonoSynth(),
		sub: new Tone.MonoSynth(),
		noteHeld: true
	}

	keysObj[midiKey].main.volume.value = -50;
	keysObj[midiKey].sub.volume.value = this.subVolume;

	keysObj[midiKey].main.chain(this.volume);
	keysObj[midiKey].sub.chain(this.volume);

    keysObj[midiKey].main.triggerAttack(theNote, 0);
    keysObj[midiKey].sub.triggerAttack(theSubNote, 0);

	this.keys.push(keysObj);
	this.noteTrigger(midiKey);
}

Osc.prototype.noteTrigger = function(midiKey) {
	var theNote;
	this.keys.forEach(function (keyObj) {
		if(keyObj.hasOwnProperty(midiKey)) theNote = keyObj[midiKey];
	});
	console.log('THE NOTE', theNote);
	
	var TIME_INTERVAL = 10;
	var end = (this.attack * 1000) + (this.decay * 1000);
	var time = 0;
	var volumeValue = Math.round(theNote.main.volume.value);
	var attackVolInterval = Math.abs(theNote.main.volume.value) / ((this.attack*1000)/TIME_INTERVAL);
	var decayVolInterval = Math.abs(this.sustain / ((this.decay*1000)/TIME_INTERVAL));
	
	var self = this;
	var interval = window.setInterval( function() {
		time += 10;
		if(time < (self.attack*1000) && theNote.noteHeld) {
			volumeValue += attackVolInterval;
			theNote.main.volume.value = volumeValue;
			theNote.sub.volume.value = volumeValue;
		} 
		else if(time < end && theNote.noteHeld) {
			volumeValue -= decayVolInterval;
			theNote.main.volume.value = volumeValue;
			theNote.sub.volume.value = volumeValue;
		}
		else {
			window.clearInterval(interval);
		}
	}, TIME_INTERVAL);
}


Osc.prototype.releaseTrigger = function(midiKey) {
	var theNote;
	this.keys.forEach(function (keyObj) {
		if(keyObj.hasOwnProperty(midiKey)) theNote = keyObj[midiKey];
	});
	console.log('THE NOTE', theNote);

	theNote.noteHeld = false;

	theNote.main.volume.value = this.sustain;
	theNote.sub.volume.value = this.subVolume + this.sustain;

	var TIME_INTERVAL = 10;
	var end = (this.attack * 1000) + (this.decay * 1000);
	var time = 0;
	var volumeValue = Math.round(theNote.main.volume.value);
	var releaseVolInterval = Math.abs((-50 + Math.abs(this.sustain)) / ((this.release*1000)/TIME_INTERVAL));
	
	var self = this;
	var interval = window.setInterval( function() {
		time += 10;
		if(time < (self.release*1000)) {
			volumeValue -= releaseVolInterval;
			theNote.main.volume.value = volumeValue;
			theNote.sub.volume.value = volumeValue;
		}
		else {
			window.clearInterval(interval);
			self.keys = self.keys.filter(function (keyObj) {
				if(keyObj.hasOwnProperty(midiKey)) {
					keyObj[midikey].main.triggerRelease(0.25);
					keyObj[midikey].sub.triggerRelease(0.25);
					return false;
				}
				else return true;
			});
		}
	}, TIME_INTERVAL);
}

Osc.changeADSR = function (param) {
	if(param === 'attack') {
		
	}
}
var synth = new Synth();

$('#trig').click(function () {
	synth.voices[0].createNote($('#midiNum').val());
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