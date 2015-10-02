// angular.module('synthesizer')
app.controller('SynthController', 
    ['$scope', 'MidiDeviceFactory', 'SynthFactory', '$window', '$timeout', '$q',
    function ($scope, Devices, SynthFactory, $window, $timeout, $q) {
//TODO: see how many watchers are on page
    //set scope vars
    $scope.devices = [];
    $scope.detune = 0;
    $scope.messageDelivered = false;

    //set scope options
    $scope.enableComputerKeyboardMidi = false;
    $scope.wavForms = ['sine','square','triangle','sawtooth', 'pulse', 'pwm'];
    $scope.filterRolloff = [-12, -24, -48];
    $scope.filterTypes = ["lowpass", "highpass", "bandpass", "lowshelf", "highshelf", "notch", "allpass", "peaking"];
    $scope.fDefault = [{type:'lowpass',roll:-12,freq:400},{type:'lowpass',roll:-12,freq:400}];
    $scope.lDefault = [{type:'sine',rate:"4m",depth:0, min:100, max:600},{type:'sine',rate:"4m",depth:0,min:100, max:600}];
    $scope.lfoRates = ["8m","4m","2m","1m","2n","3n","4n","8n","12n","16n"];
    $scope.lfoForms = ['sine','square','triangle','sawtooth'];

    $scope.synthPingPong = {time:'1m', feedback: 0};
    $scope.synthChorus = {wetness:0, freequency: 0, depth: 0, time: 0};
    $scope.synthBitcrusher = {bits: 1, wet: 0};
    $scope.synthPhaser = {base: 0, freq: 0, depth: 0, wet: 0};

    $scope.synth = new SynthFactory();
    $scope.synth.initialize();
    console.log('SYNTH', $scope.synth);
    $scope.keyCurrentlyPressed = false;

    $scope.lfoInit = function(index, type, depth, rate) {
        $scope.synth.lfos[index].active = !$scope.synth.lfos[index].active
        $scope.synth.initializeLFO(index, type, depth, rate); 
    }


    $scope.keyPressed = function (event) {
        $scope.keyCurrentlyPressed = true;
        console.log('KEY PRESSED', $scope.synth);
        // console.log('KEY PRESSED', $scope.keyCurrentlyPressed);
        if($scope.enableComputerKeyboardMidi) {
            $scope.synth.noteOn(event.keyCode, 100);
        }
    }

    $scope.keyReleased = function(event) {
        wasLastKeyReleased().then(function(wasNotlastKey){$scope.keyCurrentlyPressed = wasNotlastKey});
        console.log('KEY RELEASED', $scope.keyCurrentlyPressed);
        // console.log('KEY RELEASED', $scope.keyCurrentlyPressed);
        if ($scope.enableComputerKeyboardMidi) {
            $scope.synth.noteOff(event.keyCode);
        }
    }

    function wasLastKeyReleased() {
        var deferred = $q.defer();
        var notLastKey = true;
        $timeout(function(){
            $scope.synth.oscillators.forEach(function(osc) {
                if(!osc.keys.length) {
                    notLastKey = false;
                    console.log('SHUT LIGHT OFF')
                }
            })
            deferred.resolve(notLastKey);
        }, 0);
        return deferred.promise;
    }

    // $scope.synth.oscillators.forEach(function (osc, index) {
    //     $scope.oscillators.push({
    //         number: 1,
    //         active: osc.active,
    //         wavForm: osc.wavForm,
    //         sub: 0,

    //         attack: osc.attack,
    //         decay: osc.decay,
    //         sustain: osc.sustain,
    //         release: osc.release,

    //         detune: osc.detune,
    //         subVolume: osc.subVolume
    //     });
    // });

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
                        Devices.pluginMidiDevice(first.value);
                        first.value.onmidimessage = function(e) {              
                            switch(e.data[0]) {
                                case 144:
                                    $scope.keyCurrentlyPressed = true;
                                    console.log('NOTE HIT', $scope.keyCurrentlyPressed);
                                    $scope.synth.noteOn(e.data[1], e.data[2]);
                                    $scope.$digest();
                                break;
                                case 128:
                                    wasLastKeyReleased().then(function(wasNotlastKey){$scope.keyCurrentlyPressed = wasNotlastKey});
                                    console.log('NOTE RELEASE', $scope.keyCurrentlyPressed);
                                    $scope.synth.noteOff(e.data[1]);
                                    $scope.$digest();

                                break;
                                case 224:
                                    // SynthFactory.detune(e.data[2]);
                                    console.log('NO DETUNE FOR NOW');
                                break;
                            }
                        }
                        $scope.$digest(); // ----------------------------- FIGURE OUT HOW TO REPLACE THIS --------------------------------
                    } else {
                        $scope.enableComputerKeyboardMidi = true;
                        // DSP.plug('keyboard');
                        // Devices.pluginMidiDevice(first.value);
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