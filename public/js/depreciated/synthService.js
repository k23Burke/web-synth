app.service('KBSynthService', function (FilterService, OscillatorService) {

	function Synth() {
		var channel = {
			osc: new OscillatorService(),
			filt: new FilterService()
		}
		this.oscillators = [channel, channel];
		this.output = new Tone.Volume(0);

	}

	Synth.prototype.initialize = function() {
		this.oscillators.forEach(function (channel) {
			channel.osc.volume.connect(channel.filt.toneFilter);
			channel.filt.toneFilter.connect(this.output);
		});
		this.output.toMaster();
		Tone.Transport.start();
	}

	Synth.prototype.toggleActivate = function (index) {
		this.oscillators[index].active = !this.oscillators[index].active;
	}

    Synth.prototype.changeWavForm = function (index, wavForm) {
	    this.oscillators[index].wavForm = wavForm;
	}
    Synth.prototype.changeSubBass = function (index, volume) {
	    this.oscillators[index].subVolume = volume - 50;
	}
    Synth.prototype.changeAttack = function (index, value) {
	    this.oscillators[index].attack = value;
	}
    Synth.prototype.changeDecay = function (index, value) {
	    this.oscillators[index].decay = value;
	}
    Synth.prototype.changeSustain = function (index, value) {
	    this.oscillators[index].sustain = value;
	}
    Synth.prototype.changeRelease = function (index, value) {
	    this.oscillators[index].release = value;
	}

	//play the note
	Synth.prototype.onNote = function (note, velocity) {
		this.oscillators.forEach(function (channel) {
			if(channel.active) channel.createNote(note);
		});
	}

	Synth.prototype.releaseNote = function (note) {
		this.oscillators.forEach(function (channel) {
			channel.releaseNote(note);
		})
	}



	return Synth;
});