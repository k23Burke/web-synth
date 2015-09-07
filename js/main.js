angular.module('synthesizer')
.factory('MidiDeviceFactory', ['$window', 'SynthFactory', function ($window, SynthFactory) {
	function connectMidiBrowser() {
		if($window.navigator && 'function' === typeof $window.navigator.requestMIDIAccess) {

			//GETS EXACT BROWSER RELEASE
	        $window.navigator.sayswho = (function(){
	            var ua= navigator.userAgent, tem,
	            M= ua.match(/(opera|chrome|safari|firefox|msie|trident(?=\/))\/?\s*(\d+)/i) || [];
	            if(/trident/i.test(M[1])){
	                tem=  /\brv[ :]+(\d+)/g.exec(ua) || [];
	                return 'IE '+(tem[1] || '');
	            }
	            if(M[1]=== 'Chrome'){
	                tem= ua.match(/\b(OPR|Edge)\/(\d+)/);
	                if(tem!= null) return tem.slice(1).join(' ').replace('OPR', 'Opera');
	            }
	            M= M[2]? [M[1], M[2]]: [navigator.appName, navigator.appVersion, '-?'];
	            if((tem= ua.match(/version\/(\d+)/i))!= null) M.splice(1, 1, tem[1]);
	            return M.join(' ');
	        })();
	        console.log("NAVIGATION", $window.navigator.appName);
	        console.log("NAMER", $window.navigator.sayswho);



			return $window.navigator.requestMIDIAccess();
		} else {
			throw 'No Web MIDI support';
		}
	}

	var self = this;
	self.device = null;
	self.analyser = null;


	function _unplug() {
	    self.device.onmidimessage = null;
	    self.device = null;
	}

	function pluginMidiDevice(device) {
	    if(device) {
	        // unplug any already connected device
	        if(self.device) {
	            _unplug();
	        }

	        self.device = device;
	        self.device.onmidimessage = onmidimessage;
	    }
	}
	function onmidimessage(e) {
	    /**
	    * e.data is an array
	    * e.data[0] = on (144) / off (128) / detune (224)
	    * e.data[1] = midi note
	    * e.data[2] = velocity || detune
	    */

	    switch(e.data[0]) {
	        case 144:
	        console.log('NOTE HIT');
	            SynthFactory.noteOn(e.data[1], e.data[2]);
	        break;
	        case 128:
	        console.log('NOTE RELEASE');
	            SynthFactory.releaseNote(e.data[1]);
	        break;
	        case 224:
	            // SynthFactory.detune(e.data[2]);
	            console.log('NO DETUNE FOR NOW');
	        break;
	    }

	}


	return {
		connectMidiBrowser: connectMidiBrowser,
		pluginMidiDevice: pluginMidiDevice

	}
}])
angular.module('synthesizer')
.factory('Oscillator', function() {
    function Oscillator() {
        this.keys = [];
        this.active = false;
        this.detune = 0;
        this.subVolume = -50;
        this.attack = 10;
        this.decay = 100;
        this.sustain = 500;
        this.release = 500;
        this.wavForm = 'sine';
        this.filterType = 'lowpass';
        this.filterFreq = 400;
        this.volume = new Tone.Volume(0);
        // this.filter = new Tone.Filter(this.filterFreq, this.filterType);
        // this.volume.toMaster();
        return this;
    }
    Oscillator.prototype.createNote = function(midiKey, lfo) {

        if(this.active) {
            var keyObj = {};
            keyObj[midiKey] = {
                main: this.createKeyOsc()
            }
            this.keys.push(keyObj);
            var keyPlayed = this.midiToKey(midiKey);
            keyObj[midiKey].main.triggerAttack(keyPlayed);
            var oct = parseInt(keyPlayed.substr(keyPlayed.length-1, 1)) - 1;
            if(this.subVolume !== -50) {
                keyObj[midiKey].sub = this.createKeyOsc()
                keyObj[midiKey].sub.volume.value = this.subVolume;
                if(oct !== 0) {
                    keyObj[midiKey].sub.triggerAttack(keyPlayed.substr(0,keyPlayed.length-1) + oct.toString());
                } else {
                    keyObj[midiKey].sub.triggerAttack(keyPlayed);
                }
            }
        }
    }
    Oscillator.prototype.createKeyOsc = function() {
        var key = new Tone.MonoSynth();
        key.envelope.attack = this.attack/1000;
        key.envelope.decay = this.decay/1000;
        key.envelope.sustain = this.sustain/1000;
        key.envelope.release = this.release/1000;
        key.oscillator.type = this.wavForm;
        key.detune.value = this.detune;
        key.filter.type  = this.filterType;
        key.filter.frequency.value  = this.filterFreq;
        key.chain(this.volume);

        return key;
    }
    Oscillator.prototype.midiToKey = function(midiKey) {
        var keyArray = ["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"];
        var key = keyArray[midiKey % 12];
        var oct = Math.floor(midiKey / 12);
        var theNote = key + oct.toString();
        return theNote;
    }
    Oscillator.prototype.releaseNote = function(midiKey) {
        var self = this;
        this.keys = this.keys.filter(function (keyObj) {
            if(keyObj.hasOwnProperty(midiKey)) {
                keyObj[midiKey].main.triggerRelease(self.release/1000);
                if(keyObj[midiKey].sub) {
                    keyObj[midiKey].sub.triggerRelease(self.release/1000);
                }
                var interval = window.setInterval( function() {

                    //dispose of both main and sub
                    keyObj[midiKey].main.dispose();
                    if(keyObj[midiKey].sub) {
                        keyObj[midiKey].sub.dispose();
                    }

                    window.clearInterval(interval);

                }, self.release);

                return false;
            }
            else return true;
        });
    }
    Oscillator.prototype.changeWavForm = function(wavForm) {
        this.wavForm = wavForm;
    }
    Oscillator.prototype.connectToFilter = function(filter) {
        this.volume.connect(filter);
    }

    return Oscillator;
	
})
angular.module('synthesizer')
.controller('SynthController', ['$scope', 'MidiDeviceFactory', 'SynthFactory', function ($scope, Devices, SynthFactory) {
//TODO: see how many watchers are on page
    //set scope vars
    $scope.devices = [];
    $scope.detune = 0;
    $scope.messageDelivered = false;
    $scope.oscillators = [];

    //set scope options
    $scope.wavForms = ['sine','square','triangle','sawtooth', 'pulse', 'pwm'];
    $scope.filterRolloff = [-12, -24, -48];
    $scope.filterTypes = ["lowpass", "highpass", "bandpass", "lowshelf", "highshelf", "notch", "allpass", "peaking"];
    $scope.lfoRates = ["8m","4m","2m","1m","2n","3n","4n","8n","12n","16n"];
    $scope.lfoForms = ['sine','square','triangle','sawtooth'];

    var synth = SynthFactory();
    synth.initialize();

    synth.oscillators.forEach(function (osc, index) {
        $scope.oscillators.push({
            number: 1,
            active: osc.active,
            wavForm: osc.wavForm,
            sub: 0,

            attack: osc.attack,
            decay: osc.decay,
            sustain: osc.sustain,
            release: osc.release,

            detune: osc.detune,
            subVolume: osc.subVolume
        });
    });

    Devices.connectMidiBrowser()
            .then(function(access) {
                if('function' === typeof access.inputs) {
                    // deprecated
                    $scope.devices = access.inputs();
                    console.error('Update your Chrome version!');
                    $scope.noMidi = true;
                    $scope.noMidiMessage = "Use Google Chrome version 43 and above for WebMIDI";
                    $scope.$digest(); 
                } else {
                    if(access.inputs && access.inputs.size > 0) {
                        var inputs = access.inputs.values(),
                            input = null;
                            first = null;

                        // iterate through the devices
                        for (input = inputs.next(); input && !input.done; input = inputs.next()) {
                            if(first === null) {
                                first = input;
                            }
                            $scope.devices.push(input.value);
                        }
                        $scope.activeDevice = first.value;
                        DSP.plug(first.value);
                        $scope.$digest(); // ----------------------------- FIGURE OUT HOW TO REPLACE THIS --------------------------------
                    } else {
                        $scope.noMidi = true;
                        $scope.noMidiMessage = "Plug in a MIDI device and reload";
                        $window.setTimeout(function() {
                            $scope.messageDelivered = true;
                            $scope.$digest(); 
                        }, 3000);
                        console.log($scope.noMidi);
                        console.log($scope.noMidiMessage);
                        console.error('No devices detected!');
                        $scope.$digest(); 
                    }

                }
            })
            .catch(function(e) {
                console.log('HERE RIGHT?!?!?!?!')
                console.error(e);
                $scope.noMidi = true;
                $scope.noMidiMessage = "Plug in a MIDI device and reload";
                $window.setTimeout(function() {
                    $scope.messageDelivered = true;
                    $scope.$digest(); 
                }, 3000);
                console.log($scope.noMidi);
                console.log($scope.noMidiMessage);
                // console.error('No devices detected!');
                $scope.$digest(); 
            });

}]);
angular.module('synthesizer')
.factory('SynthFactory', ['Oscillator', function (Oscillator) {
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

		this.oscillators.forEach(function (osc, i) {
			osc.active = true;
			osc.volume.connect(this.filters[i]);
			this.lfos[i].connect(this.filters[i].frequency);
			this.lfos[i].sync();
			this.filters[i].connect(ppdelay);
		})

        this.ppdelay.wet.value = 0.2;
        this.ppdelay.connect(this.chorus);
        this.chorus.connect(this.bit);
        this.bit.connect(this.phaser);
        this.phaser.toMaster();
        Tone.Transport.start();
    }


    //WHOLE SYNTH FUNCTIONS
	    //TODO: combine noteOn and noteOff to one function
	    synthesizer.prototype.noteOn = function (note, velocity) {
	        this.oscillators.forEach(function (osc, i) {
	            if(osc.active) {
	                THENOTEWASPRESSED = true;
	                osc.createNote(note, lfo1);
	                console.log('ACTIVE OSC', osc);
	            }
	        });
	    }

	    synthesizer.prototype.noteOff = function (note) {
	        this.oscillators.forEach(function (osc,i) {
	            THENOTEWASPRESSED = false;
	            osc.releaseNote(note);
	        });
	    }

	//OSCILLATOR FUNCTIONS
		synthesizer.prototype.changeActivation = function(index) { //TODO: get this to work
			this.oscillators[index].active = !this.oscillators[index].active;
		}
        synthesizer.prototype.changeWavForm = function (index, wavForm) {
            this.oscillators[index].wavForm = wavForm;
        }
        synthesizer.prototype.changeSubBass = function (index, volume) {
            this.oscillators[index].subVolume = volume - 50;
        }
        synthesizer.prototype.changeADSorR = function (index, value, ADSorR) { //TODO: get this to work
        	this.oscillators[index][ADSorR] = value;
        }
        synthesizer.prototype.changeAttack = function (index, value) {
            this.oscillators[index].attack = value;
        }
        synthesizer.prototype.changeDecay = function (index, value) {
            this.oscillators[index].decay = value;
        }
        synthesizer.prototype.changeSustain = function (index, value) {
            this.oscillators[index].sustain = value;
        }
        synthesizer.prototype.changeRelease = function (index, value) {
            this.oscillators[index].release = value;
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

	        synthesizer.prototype.changeLFODepth = function (index, depth) {
	        	var midFreq = this.filters[index].frequency.value;
	        	this.lfos[index].min = midFreq - depth;
	        	this.lfos[index].max = midFreq + depth;
	        }
	        synthesizer.prototype.changeLFORate = function (index, rate) {
	        	this.lofs[index].frequency.value = rate;
	        }
        //PP DELAY
            synthesizer.prototype.changePPTime = function (time) {
                this.ppdelay.delayTime.value = time;
            }

            synthesizer.prototype.changePPFeedback = function (amount) {
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