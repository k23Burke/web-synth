// check MIDI device
angular
    .module('WebMIDI', ['ngMaterial'])
    .factory('Devices', ['$window', function($window) {
        function _connect() {
            if($window.navigator && 'function' === typeof $window.navigator.requestMIDIAccess) {
                return $window.navigator.requestMIDIAccess();
            } else {
                throw 'No Web MIDI support';
            }
        }

        return {
            connect: _connect
        };
    }]);
//WHERE THE onMidi Trigger happens
angular
    .module('Synth', ['WebAudio'])//, 'WebAnalyser'])
    .factory('DSP', ['AudioEngine', function(Engine) { // 'Analyser', function(Engine, Analyser) {
        var self = this;
        self.device = null;
        self.analyser = null;

        Engine.init();

        function _unplug() {
            self.device.onmidimessage = null;
            self.device = null;
        }

        function _plug(device) {
            // console.log('ON Plugin');
            if(device) {
                // unplug any already connected device
                if(self.device) {
                    _unplug();
                }

                self.device = device;
                self.device.onmidimessage = _onmidimessage;
            }
        }

        // function _createAnalyser(canvas) {
        //     self.analyser = new Analyser(canvas);
        //     Engine.wire(self.analyser);

        //     return self.analyser;
        // }

        function _onmidimessage(e) {
            /**
            * e.data is an array
            * e.data[0] = on (144) / off (128) / detune (224)
            * e.data[1] = midi note
            * e.data[2] = velocity || detune
            */

            switch(e.data[0]) {
                case 144:
                    // console.log('HIT NOTE', e.data[1]);
                    Engine.noteOn(e.data[1], e.data[2]);
                    // keyGen(e.data[1], e.data[2])
                break;
                case 128:
                    // console.log('RELEASE NOTE', e.data[1]);
                    Engine.noteOff(e.data[1]);
                break;
                case 224:
                    Engine.detune(e.data[2]);
                break;
            }

        }

        function _enableFilter(enable) {
            if(enable !== undefined) {
                if(enable) {
                    Engine.filter.connect();
                } else {
                    Engine.filter.disconnect();
                }
            }
        }

        return {
            getAllOscillators: Engine.getAllOscillators,
            plug: _plug,
            // createAnalyser: _createAnalyser,
            setOscType: Engine.osc.setType,
            setFilterType: Engine.filter.setType,
            setAttack: Engine.setAttack,
            setRelease: Engine.setRelease,
            setFilterFrequency: Engine.filter.setFrequency,
            setFilterResonance: Engine.filter.setResonance,
            enableFilter: _enableFilter
        };
    }]);

//WILL NEED TO REPLACE------------------!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
angular
    .module('WebAudio', [])
    .service('Filt', function () {
        function Filter() {
            this.filter = new Tone.Filter(800, "lowpass");
            this.options = ["lowpass", "highpass", "bandpass", "lowshelf", "highshelf", "notch", "allpass", "peaking"];
            this.min = 50;
            this.max = 1600;

            return this;
        }

        Filter.prototype.changeType = function (type) {
            this.filter.type = type;
        }

        Filter.prototype.changeFrequency = function (freq) {
            this.filter.frequency.value = freq;   
        }

        return Filter;
    })
    .service('Oscill', function () {
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
            // console.log("LFO", lfo);
            // console.log("LFO min", lfo.min);
            // console.log("LFO", lfo.max);

            if(this.active) {
                // console.log("THIS", this.active)
                var keyObj = {};
                keyObj[midiKey] = {
                    main: this.createKeyOsc(),
                    sub: this.createKeyOsc()
                }
                keyObj[midiKey].sub.volume.value = this.subVolume;
                this.keys.push(keyObj);
                var keyPlayed = this.midiToKey(midiKey);
                keyObj[midiKey].main.triggerAttack(keyPlayed);
                var oct = parseInt(keyPlayed.substr(keyPlayed.length-1, 1)) - 1;
                if(oct !== 0) {
                    keyObj[midiKey].sub.triggerAttack(keyPlayed.substr(0,keyPlayed.length-1) + oct.toString());
                } else {
                    keyObj[midiKey].sub.triggerAttack(keyPlayed);
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
                    // console.log('rELEASE TIME', self.release/1000)
                    keyObj[midiKey].main.triggerEnvelopeRelease(self.release/1000);
                    keyObj[midiKey].sub.triggerEnvelopeRelease(self.release/1000);

                    var interval = window.setInterval( function() {

                        //dispose of both main and sub
                        keyObj[midiKey].main.dispose();
                        keyObj[midiKey].sub.dispose();
                        window.clearInterval(interval);

                    }, self.release);

                    return false;
                }
                else return true;
            });
        }
        Oscillator.prototype.changeDetune = function(value) {
            console.log('DETUNEING', value/100);
            this.keys.forEach(function (key) {
                console.log(key);
                key.main.detune.value = value/100;
                key.sub.detune.value = value/100;
            })
        }
        // Oscillator.prototype.changeAttack = function(value) {
        //     this.attack = value/1000;
        // }
        Oscillator.prototype.changeWavForm = function(wavForm) {
            this.wavForm = wavForm;
        }
        Oscillator.prototype.connectToFilter = function(filter) {
            this.volume.connect(filter);
        }

        return Oscillator;
    })
    .service('AMP', function() {
        var self;

        function Gain(ctx) {
            self = this;

            self.gain = ctx.createGain();

            return self;
        }

        Gain.prototype.setVolume = function(volume, time) {
            self.gain.gain.setTargetAtTime(volume, 0, time);
        }

        Gain.prototype.connect = function(i) {
            self.gain.connect(i);
        }

        Gain.prototype.cancel = function() {
            self.gain.gain.cancelScheduledValues(0);
        }

        Gain.prototype.disconnect = function() {
            self.gain.disconnect(0);
        }

        return Gain;
    })
    .service('OSC', function() {
        var self;

        function Oscillator(ctx) {
            self = this;
            self.osc = ctx.createOscillator();

            return self;
        }

        Oscillator.prototype.setOscType = function(type) {
            if(type) {
                self.osc.type = type
            }
        }

        Oscillator.prototype.setFrequency = function(freq, time) {
            self.osc.frequency.setTargetAtTime(freq, 0, time);
        };

        Oscillator.prototype.start = function(pos) {
            self.osc.start(pos);
        }

        Oscillator.prototype.stop = function(pos) {
            self.osc.stop(pos);
        }

        Oscillator.prototype.connect = function(i) {
            self.osc.connect(i);
        }

        Oscillator.prototype.cancel = function() {
            self.osc.frequency.cancelScheduledValues(0);
        }

        return Oscillator;
    })
    .service('FTR', function() {
        var self;

        function Filter(ctx) {
            self = this;

            self.filter = ctx.createBiquadFilter();

            return self;
        }

        Filter.prototype.setFilterType = function(type) {
            if(type) {
                self.filter.type = type;
            }
        }

        Filter.prototype.setFilterFrequency = function(freq) {
            if(freq) {
                self.filter.frequency.value = freq;
            }
        }

        Filter.prototype.setFilterResonance = function(res) {
            if(res) {
                self.filter.Q.value = res;
            }
        }

        Filter.prototype.connect = function(i) {
            self.filter.connect(i);
        }

        Filter.prototype.disconnect = function() {
            self.filter.disconnect(0);
        }

        return Filter;
    })
    .factory('AudioEngine', ['OSC', 'Oscill', 'AMP', 'FTR', 'Filt', '$window', function(Oscillator, Oscill, Amp, Filter, Filt, $window) {
        var syn = [new Oscill(), new Oscill()]

        var filt = new Tone.Filter(200, 'lowpass');
        var filt2 = new Tone.Filter(200, 'lowpass');
        syn[0].volume.connect(filt);
        syn[1].volume.connect(filt2);

        // var lfo1FLT = new Tone.Filter(1600, 'allpass');
        // filt.connect(lfo1FLT);
        var lfo1 = new Tone.LFO("4m", 100, 600);
        lfo1.connect(filt.frequency);
        lfo1.sync();

        var lfo2 = new Tone.LFO("4m", 100, 600);
        lfo2.connect(filt2.frequency);
        lfo2.sync();

        var ppdelay = new Tone.PingPongDelay("8n", 0);
        ppdelay.wet.value = 0.2;
        filt.connect(ppdelay);
        filt2.connect(ppdelay);

        var chorus = new Tone.Chorus(2, 3.5, 0.7);
        ppdelay.connect(chorus);


        var bit = new Tone.BitCrusher(1);
        chorus.connect(bit);

        var phase = new Tone.Phaser(0.5, 10, 400);
        bit.connect(phase);
        phase.toMaster();
        // ppdelay.toMaster();


        // filt.toMaster();
        // filt2.toMaster();


        // lfo1FLT.toMaster();
        // lfo2FLT.toMaster();

        Tone.Transport.start();


            // var lfo = new Tone.LFO("2n", 100, 1000);
            // lfo.connect(filt.frequency);
            // lfo.sync();


        syn[0].active = true;
        syn[1].active = true;




        function _noteOn(note, velocity) {
            syn.forEach(function (osc) {
                if(osc.active) osc.createNote(note, lfo1);
            });
        }

        function _noteOff(note) {
            syn.forEach(function (osc) {
                osc.releaseNote(note);
            });
        }
        //OLD CODE
            var self = this;
            self.activeNotes = [];
            self.settings = {
                attack: 0.05,
                release: 0.05,
                portamento: 0.05
            };

            self.detuneAmount = 0;

            self.currentFreq = null;

            function _createContext() {
                self.ctx = new $window.AudioContext();
            }

            function _createAmp() {
                self.amp = new Amp(self.ctx);
            }

            function _createOscillators() {
                //osc types: sine, square, triangle, sawtooth
                // osc1
                self.osc1 = new Oscillator(self.ctx);
                self.osc1.setOscType('sine');
            }

            function _setAttack(a) {
                if(a) {
                    self.settings.attack = a / 1000;
                }
            }

            function _setRelease(r) {
                if(r) {
                    self.settings.release = r / 1000;
                }
            }

            function _createFilters() {
                self.filter1 = new Filter(self.ctx);
                self.filter1.setFilterFrequency(50);
                self.filter1.setFilterResonance(0);
            }

            function _wire(Analyser) {
                self.osc1.connect(self.amp.gain);

                if(Analyser) {
                    self.analyser = Analyser;
                    self.analyser.connect(self.ctx, self.amp);
                } else {
                    self.amp.connect(self.ctx.destination);
                }

                self.amp.setVolume(0.0, 0); //mute the sound
                self.osc1.start(0); // start osc1
            }

            function _connectFilter() {
                self.amp.disconnect();
                self.amp.connect(self.filter1.filter);
                if(self.analyser) {
                    self.analyser.connect(self.ctx, self.filter1);
                } else {
                    self.filter1.connect(self.ctx.destination);
                }
            }

            function _disconnectFilter() {
                self.filter1.disconnect();
                self.amp.disconnect();
                if(self.analyser) {
                    self.analyser.connect(self.ctx, self.amp);
                } else {
                    self.amp.connect(self.ctx.destination);
                }
            }

            function _mtof(note) {
                return 440 * Math.pow(2, (note - 69) / 12);
            }

            function _vtov (velocity) {
                return (velocity / 127).toFixed(2);
            }


            function _detune(d) {
                if(self.currentFreq) {
                    //64 = no detune
                    if(64 === d) {
                        self.osc1.setFrequency(self.currentFreq, self.settings.portamento);
                        self.detuneAmount = 0;
                    } else {
                        var detuneFreq = Math.pow(2, 1 / 12) * (d - 64);
                        self.osc1.setFrequency(self.currentFreq + detuneFreq, self.settings.portamento);
                        self.detuneAmount = detuneFreq;
                    }
                }
            }

        function getAllOscillators() {
            console.log('RETURNING ALL');
            return syn;
        }

        function changeDetune(value) {
            syn.forEach(function (osc) {
                osc.changeDetune(value)
            })
        }

        //OSC 1
            function activeateOSC1() {
                syn[0].active = true;
            }
            function deactiveateOSC1() {
                syn[0].active = false;
            }
            function changeWavForm(wavForm) {
                syn.forEach(function (osc) {
                    osc.wavForm = wavForm;
                })
            }
            function changeAttack(value) {
                syn[0].attack = value;
            }
            function changeDecay(value) {
                syn[0].decay = value;
            }
            function changeSustain(value) {
                syn[0].sustain = value;
            }
            function changeRelease(value) {
                syn[0].release = value;
            }

        //OSC 2
            function activeateOSC2() {
                syn[1].active = true;
            }
            function deactiveateOSC2() {
                syn[1].active = false;
            }
            function changeWavForm2(wavForm) {
                syn.forEach(function (osc) {
                    osc.wavForm = wavForm;
                })
            }
            function changeAttack2(value) {
                syn[1].attack = value;
            }
            function changeDecay2(value) {
                syn[1].decay = value;
            }
            function changeSustain2(value) {
                syn[1].sustain = value;
            }
            function changeRelease2(value) {
                syn[1].release = value;
            }


        //FLT 1
            function changeFilt1Type(type) {
                filt.type = type;
            }
            function changeFilt1Freq (freq) {
                console.log('HERE', freq)
                console.log('HERE', filt.frequency.value)
                filt.frequency.value = freq;
            }
            function changeFilt1Roll(amount) {
                filt.rolloff = amount;
            }

        //FLT 2
            function changeFilt2Type(type) {
                filt2.type = type;
            }
            function changeFilt2Freq (freq) {
                console.log('HERE', freq)
                console.log('HERE', filt2.frequency.value)
                filt2.frequency.value = freq;
            }
            function changeFilt2Roll(amount) {
                filt2.rolloff = amount;
            }

        //LFO 1
            function changeLFO1Type(type) {
                lfo1.type = type;
            }
            function changeLFO1Depth(num) {
                var midFreq = filt.frequency.value;
                console.log("MIDDLE", midFreq);
                lfo1.min = midFreq - num;
                lfo1.max = midFreq + num;
            }
            function changeLFO1Rate(rate) {
                lfo1.frequency.value = rate;
            }

        //LFO 2
            function changeLFO2Type(type) {
                lfo2.type = type;
            }
            function changeLFO2Depth(num) {
                var midFreq = filt2.frequency.value;
                console.log("MIDDLE", midFreq);
                lfo2.min = midFreq - num;
                lfo2.max = midFreq + num;
            }
            function changeLFO2Rate(rate) {
                lfo2.frequency.value = rate;
            }


        //PP DELAY
            function changePPTime(time) {
                ppdelay.delayTime.value = time;
            }
            function changePPFeedback(amount) {
                if(amount === 0) {
                    ppdelay.wet.value = 0;
                } else {
                    ppdelay.wet.value = 0.2;
                }
                ppdelay.feedback.value = amount/1000;
            }

        //CHORUS
            function changeChorFreq(freq) {
                chorus.frequency.value = freq;
            }
            function changeChorDelayTime(time) {
                chorus.delayTime = time / 100;
            }
            function changeChorDepth(depth) {
                chorus.depth = depth / 1000;
            }
            function changeChorWetness(amount) {
                chorus.wet = amount / 1000;
            }

        //BITCRUSHER
            function changeBCBits(bits) {
                bit.bits = bits;
            }

            function changeBCWet(amount) {
                bit.wet.value = amount;
            }

        //PHASER
            function changePhaserFreq(freq) {
                phase.frequency.value = freq;
            }
            function changePhaserDepth(depth) {
                phase.depth = depth / 1000;
            }
            function changePhaserBase(freq) {
                phase.baseFrequency = freq;
            }
            function changePhaserWet(amount) {
                phase.wet = amount /1000;
            }

        return {
            init: function() {
                _createContext();
                _createAmp();
                _createOscillators();
                _createFilters();
            },



            getAllOscillators: getAllOscillators,
            detuune: changeDetune,

            changeAttack: changeAttack,
            changeDecay: changeDecay,
            changeSustain: changeSustain,
            changeRelease: changeRelease,
            changeWavForm: changeWavForm,

            changeAttack2: changeAttack2,
            changeDecay2: changeDecay2,
            changeSustain2: changeSustain2,
            changeRelease2: changeRelease2,
            changeWavForm2: changeWavForm2,

            changeFilt1Freq: changeFilt1Freq,
            changeFilt1Type: changeFilt1Type,
            changeFilt1Roll: changeFilt1Roll,

            changeFilt2Freq: changeFilt2Freq,
            changeFilt2Type: changeFilt2Type,
            changeFilt2Roll: changeFilt2Roll,

            activeateOSC1: activeateOSC1,
            deactiveateOSC1: deactiveateOSC1,

            activeateOSC2: activeateOSC2,
            deactiveateOSC2: deactiveateOSC2,

            changeLFO1Type: changeLFO1Type,
            changeLFO1Depth: changeLFO1Depth,
            changeLFO1Rate: changeLFO1Rate,

            changeLFO2Type: changeLFO2Type,
            changeLFO2Depth: changeLFO2Depth,
            changeLFO2Rate: changeLFO2Rate,

            changePPTime: changePPTime,
            changePPFeedback: changePPFeedback,

            changeChorFreq: changeChorFreq,
            changeChorDelayTime: changeChorDelayTime,
            changeChorDepth: changeChorDepth,
            changeChorWetness: changeChorWetness,

            changeBCBits: changeBCBits,
            changeBCWet: changeBCWet,


            changePhaserFreq: changePhaserFreq,
            changePhaserDepth: changePhaserDepth,
            changePhaserBase: changePhaserBase,
            changePhaserWet: changePhaserWet,

            wire: _wire,
            noteOn: _noteOn,
            noteOff: _noteOff,
            detune: _detune,
            setAttack: _setAttack,
            setRelease: _setRelease,
            osc: {
                setType: function(t) {
                    if(self.osc1) {
                        self.osc1.setOscType(t);
                    }
                }
            },
            filter: {
                setType: function(t) {
                    if(self.filter1) {
                        self.filter1.setFilterType(t);
                    }
                },
                setFrequency: function(f) {
                    if(self.filter1) {
                        self.filter1.setFilterFrequency(f);
                    }
                },
                setResonance: function(r) {
                    if(self.filter1) {
                        self.filter1.setFilterResonance(r);
                    }
                },
                connect: _connectFilter,
                disconnect: _disconnectFilter
            }
        };
    }]);


angular
    .module('DemoApp', ['WebMIDI', 'Synth'])
    .controller('AppCtrl', ['$scope', 'Devices', 'DSP', 'AudioEngine', function($scope, devices, DSP, Synth) {
        console.log('Synth', Synth.getAllOscillators());
        $scope.devices = [];
        $scope.detune = 0;
        var oscArray = Synth.getAllOscillators();
        var osc = oscArray[0];
        var osc2 = oscArray[1];

        $scope.wavForms = ['sine','square','triangle','sawtooth', 'pulse', 'pwm'];
        $scope.filterRolloff = ['-12', '-24', '-48'];
        $scope.filterTypes = ["lowpass", "highpass", "bandpass", "lowshelf", "highshelf", "notch", "allpass", "peaking"];
        $scope.lfoRates = ["8m","4m","2m","1m","2n","3n","4n","8n","12n","16n"];
        $scope.lfoForms = ['sine','square','triangle','sawtooth'];
        $scope.OSC1 = {
            number: 1,
            active: osc.active,
            wavForm: osc.wavForm,

            attack: osc.attack,
            decay: osc.decay,
            sustain: osc.sustain,
            release: osc.release,

            detune: osc.detune,
            subVolume: osc.subVolume
        }

        $scope.OSC2 = {
            number: 2,
            active: osc2.active,
            wavForm: osc2.wavForm,

            attack: osc2.attack,
            decay: osc2.decay,
            sustain: osc2.sustain,
            release: osc2.release,

            detune: osc2.detune,
            subVolume: osc2.subVolume
        }

        $scope.activate = function (num) {
            if(num === 1) {
                $scope.OSC1.active = true;
                Synth.activeateOSC1();
            } else {
                $scope.OSC2.active = true;
                Synth.activeateOSC2();
            }
            console.log(num);
        }

        $scope.deactiveate = function (num) {
            if(num === 1) {
                $scope.OSC1.active = false;
                Synth.deactiveateOSC1();
            } else {
                $scope.OSC2.active = false;
                Synth.deactiveateOSC2();
            }
            console.log(num);
        }



        $scope.FLT1 = {
            number: 1,
            type: "lowpass",
            rolloff: '-12',
            freq: 200
        }
        $scope.FLT2 = {
            number: 2,
            type: "lowpass",
            rolloff: '-12',
            freq: 200
        }


        $scope.LFO1 = {
            number: 1,
            type: "sine",
            rate: "4m",
            dist: 0
        }
        $scope.LFO2 = {
            number: 2,
            type: "sine",
            rate: "4m",
            dist: 0
        }


        $scope.PPD = {
            feedback: 0,
            time: "4n"
        }


        $scope.CHR = {
            frequency: 0,
            time: 0,
            depth: 0,
            wet: 0
        }

        $scope.BTC = {
            bit: 1,
            wet: 0
        }

        $scope.PHS = {
            base: 400,
            freq: 0.5,
            depth: 10,
            wet: 0
        }





        devices
            .connect()
            .then(function(access) {
                if('function' === typeof access.inputs) {
                    // deprecated
                    $scope.devices = access.inputs();
                    console.error('Update your Chrome version!');
                } else {
                    if(access.inputs && access.inputs.size > 0) {
                        var inputs = access.inputs.values(),
                            input = null;

                        // iterate through the devices
                        for (input = inputs.next(); input && !input.done; input = inputs.next()) {
                            $scope.devices.push(input.value);
                        }
                        $scope.$digest(); // ----------------------------- FIGURE OUT HOW TO REPLACE THIS --------------------------------
                    } else {
                        console.error('No devices detected!');
                    }

                }
            })
            .catch(function(e) {
                console.error(e);
            });

        $scope.$watch('activeDevice', DSP.plug);
        $scope.$watch('detune', Synth.detuune);

        $scope.$watch('OSC1.attack', Synth.changeAttack);
        $scope.$watch('OSC1.decay', Synth.changeDecay);
        $scope.$watch('OSC1.sustain', Synth.changeSustain);
        $scope.$watch('OSC1.release', Synth.changeRelease);
        $scope.$watch('OSC1.wavForm', Synth.changeWavForm);
        
        $scope.$watch('OSC2.attack', Synth.changeAttack2);
        $scope.$watch('OSC2.decay', Synth.changeDecay2);
        $scope.$watch('OSC2.sustain', Synth.changeSustain2);
        $scope.$watch('OSC2.release', Synth.changeRelease2);
        $scope.$watch('OSC2.wavForm', Synth.changeWavForm2);

        $scope.$watch('FLT1.type', Synth.changeFilt1Type);
        $scope.$watch('FLT1.freq', Synth.changeFilt1Freq);
        $scope.$watch('FLT1.roll', Synth.changeFilt1Roll);

        $scope.$watch('FLT2.type', Synth.changeFilt2Type);
        $scope.$watch('FLT2.freq', Synth.changeFilt2Freq);
        $scope.$watch('FLT2.roll', Synth.changeFilt2Roll);


        $scope.$watch('LFO1.type', Synth.changeLFO1Type);
        $scope.$watch('LFO1.dist', Synth.changeLFO1Depth);
        $scope.$watch('LFO1.rate', Synth.changeLFO1Rate);
        $scope.$watch('LFO2.type', Synth.changeLFO2Type);
        $scope.$watch('LFO2.dist', Synth.changeLFO2Depth);
        $scope.$watch('LFO2.rate', Synth.changeLFO2Rate);

        $scope.$watch('PPD.time', Synth.changePPTime);
        $scope.$watch('PPD.feedback', Synth.changePPFeedback);


        $scope.$watch('CHR.wet', Synth.changeChorWetness);
        $scope.$watch('CHR.frequency', Synth.changeChorFreq);
        $scope.$watch('CHR.depth', Synth.changeChorDepth);
        $scope.$watch('CHR.time', Synth.changeChorDelayTime);

        $scope.$watch('BTC.bit', Synth.changeBCBits);
        $scope.$watch('BTC.wet', Synth.changeBCWet);


        $scope.$watch('PHS.freq', Synth.changePhaserFreq);
        $scope.$watch('PHS.depth', Synth.changePhaserDepth);
        $scope.$watch('PHS.base', Synth.changePhaserBase);
        $scope.$watch('PHS.wet', Synth.changePhaserWet);

    }]);


