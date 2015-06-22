//OSC
	function Oscillator() {
		var osc = new Tone.OmniOscillator("C4", "sine");
		osc.wavForms = ['sine','square','triangle','sawtooth', 'pulse', 'pwm'];
		osc.active = false;
		return osc
	}
	Oscillator.prototype.changeKey = function (midiNote) {
		this.frequency.value = this.midiToNote(midiNote);
	}
	Oscillator.prototype.changeWavForm = function (type) {
		this.type = type;
	}
	Oscillator.prototype.changeDetune =  function (value) {
		this.detune.value = value;
	}
	// Oscillator.prototype.remove = function () {
	// 	this.dispose();
	// }

//ENV
	function Envelope() {
		var env = new Tone.AmplitudeEnvelope();
		return env;
	}
	Envelope.prototype.changeAttack = function (attack) {
		this.attack = attack;
	}
	Envelope.prototype.changeDecay = function (decay) {
		this.decay = decay;
	}
	Envelope.prototype.changeSustain = function (sustain) {
		this.sustain = sustain;
	}
	Envelope.prototype.changeRelease = function (release) {
		this.release = release;
	}

//Volume
	function Volume() {
		var vol = new Tone.Volume(0);
		return vol;
	}
	Volume.prototype.changeVolume = function (value){
		this.volume = (value);
	}

//CNL
	function Channel() {
        this.attack = 10;
        this.decay = 100;
        this.sustain = 500;
        this.release = 5000;
        this.wavForm = 'sine';

		this.voices = [{
			active: false,
			main: new Oscillator(),
			sub: new Oscillator(),
			env: new Envelope()
		},{
			active: false,
			main: new Oscillator(),
			sub: new Oscillator(),
			env: new Envelope()
		},{
			active: false,
			main: new Oscillator(),
			sub: new Oscillator(),
			env: new Envelope()
		},{
			active: false,
			main: new Oscillator(),
			sub: new Oscillator(),
			env: new Envelope()
		},{
			active: false,
			main: new Oscillator(),
			sub: new Oscillator(),
			env: new Envelope()
		},{
			active: false,
			main: new Oscillator(),
			sub: new Oscillator(),
			env: new Envelope()
		}];

        this.subVolume = -100;
        this.volume = new Volume();

	}
	Channel.prototype.initalize = function () {
		var self = this;
		this.voices.forEach(function (voice) {
			voice.main.chain(voice.env,self.volume);
			voice.sub.chain(voice.env,self.volume);
			// voice.env.connect(self.volume);
		});
	}

//SNT
	function Synth() {
		this.channels = [new Channel()];
	}

	Synth.prototype.initalize = function () {
		this.channels.forEach(function (channel) {
			channel.volume.toMaster();
		});
	}

	Synth.prototype.playNote = function(midiNote) {
		this.channels.forEach(function (channel) {
			channel.voices.forEach(function (voice, ind) {
				console.log('MAIN', voice.main)
				console.log('ENVELOPE', voice.env)
				// console.log(voice.env);
				// voice.main.changeKey(voice.main.midiToNote(midiNote))
				// voice.env
			});
		});
	}
	// var osc = new Tone.OmniOscillator();
	// var env = new Tone.AmplitudeEnvelope();

	// var mono = new Tone.MonoSynth()
	// mono.toMaster();
	// mono.envelope.attack = 9;
	

	// var syn = new Synth();
	// syn.playNote(122);