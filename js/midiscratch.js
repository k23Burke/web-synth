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
angular
    .module('Synth', ['WebAudio'])
    .factory('DSP', ['AudioEngine', function(Engine) {
        var self = this;
        self.device = null;
        self.analyser = null;

        // Engine.init();

        function _unplug() {
            self.device.onmidimessage = null;
            self.device = null;
        }

        function _plug(device) {
            if(device) {
                // unplug any already connected device
                if(self.device) {
                    _unplug();
                }

                self.device = device;
                self.device.onmidimessage = _onmidimessage;
            }
        }
        function _onmidimessage(e) {
            /**
            * e.data is an array
            * e.data[0] = on (144) / off (128) / detune (224)
            * e.data[1] = midi note
            * e.data[2] = velocity || detune
            */

            switch(e.data[0]) {
                case 144:
                    Engine.noteOn(e.data[1], e.data[2]);
                break;
                case 128:
                    Engine.noteOff(e.data[1]);
                break;
                case 224:
                    Engine.detune(e.data[2]);
                break;
            }

        }

        return {
            getAllOscillators: Engine.getAllOscillators,
            plug: _plug
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
    .factory('AudioEngine', [ 'Oscill', 'Filt', '$window', function(Oscill, Filt, $window) {
        var syn = [new Oscill(), new Oscill()]

        var filt = new Tone.Filter(200, 'lowpass');
        var filt2 = new Tone.Filter(200, 'lowpass');
        syn[0].volume.connect(filt);
        syn[1].volume.connect(filt2);

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

        Tone.Transport.start();


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

        function getAllOscillators() {
            return syn;
        }

        function changeDetune(value) {
            syn.forEach(function (osc) {
                // osc.changeDetune(value)
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
                syn[0].wavForm = wavForm;
            }
            function changeSubBass(volume) {
                syn[0].subVolume = volume - 50;
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
                // syn.forEach(function (osc) {
                //     osc.wavForm = wavForm;
                // })
                syn[1].wavForm = wavForm;
            }
            function changeSubBass2(volume) {
                syn[1].subVolume = volume - 50;
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
                bit.wet.value = amount /1000;
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



            getAllOscillators: getAllOscillators,
            detuune: changeDetune,

            changeAttack: changeAttack,
            changeDecay: changeDecay,
            changeSustain: changeSustain,
            changeRelease: changeRelease,
            changeWavForm: changeWavForm,
            changeSubBass: changeSubBass,

            changeAttack2: changeAttack2,
            changeDecay2: changeDecay2,
            changeSustain2: changeSustain2,
            changeRelease2: changeRelease2,
            changeWavForm2: changeWavForm2,
            changeSubBass2: changeSubBass2,

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

            noteOn: _noteOn,
            noteOff: _noteOff,
        };
    }]);


angular
    .module('DemoApp', ['WebMIDI', 'Synth'])
    .controller('AppCtrl', ['$scope', 'Devices', 'DSP', 'AudioEngine', function($scope, devices, DSP, Synth) {
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
            sub: 0,

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
            sub: 0,

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
        }

        $scope.deactiveate = function (num) {
            if(num === 1) {
                $scope.OSC1.active = false;
                Synth.deactiveateOSC1();
            } else {
                $scope.OSC2.active = false;
                Synth.deactiveateOSC2();
            }
        }



        $scope.FLT1 = {
            number: 1,
            type: "lowpass",
            roll: -12,
            freq: 200
        }
        $scope.FLT2 = {
            number: 2,
            type: "lowpass",
            roll: -12,
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
                        console.log($scope.noMidi);
                        console.log($scope.noMidiMessage);
                        console.error('No devices detected!');
                        $scope.$digest(); 
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
        $scope.$watch('OSC1.sub', Synth.changeSubBass);
        
        $scope.$watch('OSC2.attack', Synth.changeAttack2);
        $scope.$watch('OSC2.decay', Synth.changeDecay2);
        $scope.$watch('OSC2.sustain', Synth.changeSustain2);
        $scope.$watch('OSC2.release', Synth.changeRelease2);
        $scope.$watch('OSC2.wavForm', Synth.changeWavForm2);
        $scope.$watch('OSC2.sub', Synth.changeSubBass2);

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


