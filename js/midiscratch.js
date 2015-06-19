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

// angular
//     .directive('ParameterSilder', function() {
//         return {
//             restrict: 'E',
//             template: '<md-slider flex min="{{param.min}}" max="{{param.max}}" ng-model="{{param.value}}" aria-label="red" id="red-slider">'
//         }
//     });

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
    // .service('SYN', function () {

    // })
    .service('Oscill', function () {
        function Oscillator() {
            this.keys = [];
            this.active = false;
            this.detune = 0;
            this.subVolume = -100;
            this.attack = 0.01;
            this.decay = 0.1;
            this.sustain = 0.5;
            this.release = 1;
            this.volume = new Tone.Volume(0);
            this.volume.toMaster();
            return this;
        }
        Oscillator.prototype.createNote = function(midiKey) {
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
        Oscillator.prototype.createKeyOsc = function() {
            var key = new Tone.MonoSynth();
            key.envelope.attack = this.attack;
            key.envelope.decay = this.decay;
            key.envelope.sustain = this.sustain;
            key.envelope.release = this.release;
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
            this.keys = this.keys.filter(function (keyObj) {
                if(keyObj.hasOwnProperty(midiKey)) {
                    keyObj[midiKey].main.triggerRelease();
                    keyObj[midiKey].sub.triggerRelease();
                    return false;
                }
                else return true;
            });
        }
        Oscillator.prototype.changeDetune = function(value) {
            console.log('DETUNEING');
            this.keys.forEach(function (key) {
                key.main.detune.value = value;
                key.sub.detune.value = value;
            })
        }
        Oscillator.prototype.routeToFilter = function() {

        }

        return Oscillator;
    })
    // .service('Filt', function() {

    // })
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
    .factory('AudioEngine', ['OSC', 'Oscill', 'AMP', 'FTR', '$window', function(Oscillator, Oscill, Amp, Filter, $window) {
        var syn = [new Oscill(), new Oscill(), new Oscill(), new Oscill()];
        syn[0].active = true;


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

        function _noteOn(note, velocity) {
            syn.forEach(function (osc) {
                if(osc.active) osc.createNote(note);
            });

            // self.activeNotes.push(note);

            // self.osc1.cancel();
            // self.currentFreq = _mtof(note);
            // self.osc1.setFrequency(self.currentFreq + self.detuneAmount, self.settings.portamento);

            // self.amp.cancel();

            // self.amp.setVolume(_vtov(velocity), self.settings.attack);
        }

        function _noteOff(note) {
            syn.forEach(function (osc) {
                osc.releaseNote(note);
            });
            // var position = self.activeNotes.indexOf(note);
            // if (position !== -1) {
            //     self.activeNotes.splice(position, 1);
            // }

            // if (self.activeNotes.length === 0) {
            //     // shut off the envelope
            //     self.amp.cancel();
            //     self.currentFreq = null;
            //     self.amp.setVolume(0.0, self.settings.release);
            // } else {
            //     // in case another note is pressed, we set that one as the new active note
            //     self.osc1.cancel();
            //     self.currentFreq = _mtof(self.activeNotes[self.activeNotes.length - 1]);
            //     self.osc1.setFrequency(self.currentFreq + self.detuneAmount, self.settings.portamento);
            // }
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

        return {
            init: function() {
                _createContext();
                _createAmp();
                _createOscillators();
                _createFilters();
            },
            // detuune, Oscill.changeDetune,
            getAllOscillators: getAllOscillators,
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
        // console.log('Devices', devices);
        // console.log('DSP', DSP);
        console.log('Synth', Synth.getAllOscillators());
        $scope.devices = [];
        $scope.detune = 0;

        $scope.oscArray = Synth.getAllOscillators();
        // oscArray.forEach(function (osc) {

        // })
        $scope.ADSR = [{
            paramName: 'Attack',
            min: 0,
            max: 10000,
        },{
            paramName: 'Decay',
            min: 0,
            max: 10000,
        },{
            paramName: 'Sustain',
            min: 0,
            max: 10000,
        },{
            paramName: 'Release',
            min: 0,
            max: 10000,
        }]
        // $scope.wavTypes = []
        // $scope.oscillators = 

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
        // $scope.$watch('detune', Synth.detuune);
    }]);

Tone.Transport.start();

