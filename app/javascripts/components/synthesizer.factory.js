// angular.module('synthesizer')
app.factory('SynthFactory', ['Oscillator', function (Oscillator) {
	function synthesizer() { //TODO: pass in number of oscillators to create
        this.oscillators = [];
        this.filters = [];
        this.lfos = [];
        this.keyCurrentlyPressed = false;

        //effects
        this.ppdelay = new Tone.PingPongDelay("8n", 0);
        this.chorus = new Tone.Chorus(2, 3.5, 0.7);
        this.bit = new Tone.BitCrusher(1);
        this.phaser = new Tone.Phaser(0.5, 10, 400);
	}

	synthesizer.prototype.initialize = function () {
		this.oscillators = [new Oscillator(), new Oscillator()];
		this.filters = [new Tone.Filter(200, 'lowpass'), new Tone.Filter(200, 'lowpass')];
		this.lfos = [new Tone.LFO("4m", 100, 600), new Tone.LFO("4m", 100, 600)];
        Tone.Transport.start();
        var self = this;

        this.oscillators.forEach(function (osc, i) {
            osc.active = true;
            osc.volume.connect(self.filters[i]);
            // self.lfos[i].connect(self.filters[i].frequency);
            // self.lfos[i].sync();
            // self.filters[i].toMaster();
            self.lfos[i].active = false;
            self.filters[i].connect(self.ppdelay);
        })

        this.ppdelay.wet.value = 0;
        this.ppdelay.connect(this.chorus);
        this.chorus.toMaster();
        // this.chorus.connect(this.bit);
        // this.bit.connect(this.phaser);
        // this.phaser.toMaster();
    }


    //WHOLE SYNTH FUNCTIONS
	    //TODO: combine noteOn and noteOff to one function
	    synthesizer.prototype.noteOn = function (note, velocity) {
            var self = this;
	        this.oscillators.forEach(function (osc, i) {
	            if(osc.active) {
	                osc.createNote(note);
	                console.log('ACTIVE OSC', osc);
	            }
	        });
	    }

	    synthesizer.prototype.noteOff = function (note) {
	        this.oscillators.forEach(function (osc,i) {
                osc.releaseNote(note);
                console.log('RELEASING OSC', osc);
	        });
	    }

    //EFFECTS FUNCTIONS
        //Filter
	   		synthesizer.prototype.changeFilterType = function (index, type) {
	   			this.filters[index].type = type;
	   		}
	   		synthesizer.prototype.changeFilterFrequency = function (index, freq) {
	   			this.filters[index].frequency.value = freq;
	   		}
	   		synthesizer.prototype.changeFilterRollOff = function (index, amount) {
	   			this.filters[index].rolloff = amount;
	   		}
        //LFO
	        synthesizer.prototype.changeLFOType = function (index, type) {
	        	this.lfos[index].type = type;
	        }

	        // synthesizer.prototype.changeLFOMin = function (index, freq) {
	        // 	var midFreq = this.filters[index].frequency.value;
	        // 	this.lfos[index].min = midFreq - depth;
	        // 	this.lfos[index].max = midFreq + depth;
	        // }
            synthesizer.prototype.changeLFODepth = function (index, depth) {
                console.log('DEPTHING', index, depth)
                var midFreq = this.filters[index].frequency.value;
                console.log('DEPTHING', midFreq);
                this.lfos[index].min = midFreq - depth;
                this.lfos[index].max = midFreq + depth;
                console.log('min', this.lfos[index].min);
                console.log('MAX', this.lfos[index].max);
            }
            synthesizer.prototype.changeLFORate = function (index, rate) {
	        	this.lfos[index].frequency.value = rate;
	        }
            synthesizer.prototype.initializeLFO = function (index, type, depth, rate) {
                var midFreq = this.filters[index].frequency.value;
                console.log('DEPTHING', midFreq);
                this.lfos[index].min = 300 - depth;
                this.lfos[index].max = 300 + depth;
                console.log('min', this.lfos[index].min);
                console.log('MAX', this.lfos[index].max);
                this.lfos[index].frequency.value = rate;
                this.lfos[index].type = type;

                this.lfos[index].connect(this.filters[index].frequency);
                this.lfos[index].sync();

            }
        //PP DELAY
            synthesizer.prototype.changePPTime = function (time) {
                this.ppdelay.delayTime.value = time;
            }

            synthesizer.prototype.changePPFeedback = function (amount) { //TODO: ?????
                if(amount === 0) {
                    this.ppdelay.wet.value = 0;
                } else {
                    this.ppdelay.wet.value = 0.2;
                }
                this.ppdelay.feedback.value = amount/1000;
            }
        //CHORUS
            synthesizer.prototype.changeChorFreq = function (freq) {
                this.chorus.frequency.value = freq;
            }
            synthesizer.prototype.changeChorDelayTime = function (time) {
                this.chorus.delayTime = time / 100;
            }
            synthesizer.prototype.changeChorDepth = function (depth) {
                this.chorus.depth = depth / 1000;
            }
            synthesizer.prototype.changeChorWetness = function (amount) {
                this.chorus.wet = amount / 1000;
            }
        //BITCRUSHER
            synthesizer.prototype.changeBCBits = function (bits) {
                this.bit.bits = bits;
            }
            synthesizer.prototype.changeBCWet = function (amount) {
                this.bit.wet.value = amount /1000;
            }
        //PHASER
            synthesizer.prototype.changePhaserFreq = function (freq) {
                this.phaser.frequency.value = freq;
            }
            synthesizer.prototype.changePhaserDepth = function (depth) {
                this.phaser.depth = depth / 1000;
            }
            synthesizer.prototype.changePhaserBase = function (freq) {
                this.phaser.baseFrequency = freq;
            }
            synthesizer.prototype.changePhaserWet = function (amount) {
                this.phaser.wet = amount /1000;
            }


    return synthesizer;

}]);