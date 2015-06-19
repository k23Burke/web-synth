//main controller
angular
    .module('WebSynth', ['WebMIDI', 'Synth'])
    .controller('WebSynthCtrl', ['$scope', 'Devices', 'DSP', function($scope, devices, DSP) {
        $scope.devices = [];
        $scope.analyser = null;

        $scope.oscTypes = ['sine', 'square', 'triangle', 'sawtooth'];
        $scope.filterTypes = ['lowpass', 'highpass'];

        $scope.synth = {
            oscType: 'sine',
            filterType: 'lowpass',
            filterOn: false,
            filterFreq: 50,
            filterRes: 0,
            attack: 0.05,
            release: 0.05
        };

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
                        input, device;

                        // iterate through the devices
                        for (input = inputs.next(); input && !input.done; input = inputs.next()) {
                            $scope.devices.push(input.value);
                        }

                        // create the frequency analyser
                        $scope.analyser = DSP.createAnalyser('#analyser');
                    } else {
                        console.error('No devices detected!');
                    }

                }
            })
            .catch(function(e) {
                console.error(e);
            });

        // watchers
        $scope.$watch('activeDevice', DSP.plug);
        $scope.$watch('synth.oscType', DSP.setOscType);
        $scope.$watch('synth.filterOn', DSP.enableFilter);
        $scope.$watch('synth.filterType', DSP.setFilterType);
        $scope.$watch('synth.filterFreq', DSP.setFilterFrequency);
        $scope.$watch('synth.filterRes', DSP.setFilterResonance);
        $scope.$watch('synth.attack', DSP.setAttack);
        $scope.$watch('synth.release', DSP.setRelease);
    }]);

angular
    .element(document)
    .ready(function() {
        angular.bootstrap(document.body, ['WebSynth']);
    })

//web audio - SYNTH
angular
    .module('WebAudio', [])
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
    .factory('AudioEngine', ['OSC', 'AMP', 'FTR', '$window', function(Oscillator, Amp, Filter, $window) {
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
            console.log('DO NOTHING');
            // var keyArray = ["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"];
            // var key = keyArray[note % 12];
            // var oct = Math.round(note / 12);
            // var theNote = key + oct.toString();
            // var synth = new Tone.MonoSynth();
            // synth.toMaster();
            // console.log(theNote);
            // synth.triggerAttackRelease("C2", "4n", "2n");


            // self.activeNotes.push(note);

            // self.osc1.cancel();
            // self.currentFreq = _mtof(note);
            // self.osc1.setFrequency(self.currentFreq + self.detuneAmount, self.settings.portamento);

            // self.amp.cancel();

            // self.amp.setVolume(_vtov(velocity), self.settings.attack);
        }

        function _noteOff(note) {
            var position = self.activeNotes.indexOf(note);
            if (position !== -1) {
                self.activeNotes.splice(position, 1);
            }

            if (self.activeNotes.length === 0) {
                // shut off the envelope
                self.amp.cancel();
                self.currentFreq = null;
                self.amp.setVolume(0.0, self.settings.release);
            } else {
                // in case another note is pressed, we set that one as the new active note
                self.osc1.cancel();
                self.currentFreq = _mtof(self.activeNotes[self.activeNotes.length - 1]);
                self.osc1.setFrequency(self.currentFreq + self.detuneAmount, self.settings.portamento);
            }
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

        return {
            init: function() {
                _createContext();
                _createAmp();
                _createOscillators();
                _createFilters();
            },
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

//web MIDI
angular
    .module('WebMIDI', [])
    .factory('Devices', ['$window', '$q', function($window, $q) {
        function _test() {
            return ($window.navigator && $window.navigator.requestMIDIAccess) ? true : false;
        }

        function _connect() {
            console.log('HERE');
            var d = $q.defer(),
            p = d.promise
            a = null;

            if(_test()) {
                $window
                    .navigator
                    .requestMIDIAccess()
                    .then(d.resolve, d.reject);
            } else {
                d.reject(new Error('No Web MIDI support'));
            }

            return p;
        }

        return {
            connect: _connect
        };
    }]);


            var synth = new Tone.MonoSynth();
            synth.toMaster();
            synth.triggerAttackRelease("C2", "4n", "2n");


angular
    .module('Synth', ['WebAudio', 'WebAnalyser'])
    .factory('DSP', ['AudioEngine', 'Analyser', function(Engine, Analyser) {
        var self = this;
        self.device = null;
        self.analyser = null;

        Engine.init();

        function _unplug() {
            self.device.onmidimessage = null;
            self.device = null;
        }

        function _plug(device) {
            console.log('ON Plugin');
            if(device) {
                // unplug any already connected device
                if(self.device) {
                    _unplug();
                }

                self.device = device;
                self.device.onmidimessage = _onmidimessage;
            }
        }

        function _createAnalyser(canvas) {
            self.analyser = new Analyser(canvas);
            Engine.wire(self.analyser);

            return self.analyser;
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
                    keyGen(e.data[1], e.data[2])
                break;
                case 128:
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
            plug: _plug,
            createAnalyser: _createAnalyser,
            setOscType: Engine.osc.setType,
            setFilterType: Engine.filter.setType,
            setAttack: Engine.setAttack,
            setRelease: Engine.setRelease,
            setFilterFrequency: Engine.filter.setFrequency,
            setFilterResonance: Engine.filter.setResonance,
            enableFilter: _enableFilter
        };
    }]);

//Analyser
angular
    .module('WebAnalyser', [])
    .service('Analyser', function() {
        var self;

        function Analyser(canvas) {
            self = this;

            self.canvas = angular.element(canvas) || null;
            self.view = self.canvas[0].getContext('2d') || null;
            self.javascriptNode = null;
            self.analyser = null;

            return self;
        }

        function drawSpectrum(array) {
            for (var i = 0; i < (array.length); i++) {
                var v = array[i],
                    h = self.canvas.height();

                self.view.fillRect(i * 2, h - (v - (h / 4)), 1, v + (h / 4));
            }
        }

        Analyser.prototype.connect = function(ctx, output) {
            // setup a javascript node
            self.javascriptNode = ctx.createScriptProcessor(2048, 1, 1);
            // connect to destination, else it isn't called
            self.javascriptNode.connect(ctx.destination);

            // setup a analyzer
            self.analyser = ctx.createAnalyser();
            self.analyser.smoothingTimeConstant = 0.3;
            self.analyser.fftSize = 512;

            // connect the output to the destiantion for sound
            output.connect(ctx.destination);
            // connect the output to the analyser for processing
            output.connect(self.analyser);

            self.analyser.connect(self.javascriptNode);

            // sourceNode.connect(context.destination);
            var gradient = self.view.createLinearGradient(0, 0, 0, 200);
            gradient.addColorStop(1, '#000000');
            gradient.addColorStop(0.75, '#ff0000');
            gradient.addColorStop(0.25, '#ffff00');
            gradient.addColorStop(0, '#ffffff');

            // when the javascript node is called
            // we use information from the analyzer node
            // to draw the volume
            self.javascriptNode.onaudioprocess = function() {
                // get the average for the first channel
                var array =  new Uint8Array(self.analyser.frequencyBinCount);
                self.analyser.getByteFrequencyData(array);

                // clear the current state
                self.view.clearRect(0, 0, 1000, 325);

                // set the fill style
                self.view.fillStyle = gradient;
                drawSpectrum(array);
            }
        };

        Analyser.prototype.disconnect = function() {
            self.analyser.disconnect(0);
        };

        return Analyser;
    });