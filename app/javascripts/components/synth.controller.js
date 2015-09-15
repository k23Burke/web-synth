// angular.module('synthesizer')
app.controller('SynthController', ['$scope', 'MidiDeviceFactory', 'SynthFactory', '$window', function ($scope, Devices, SynthFactory, $window) {
//TODO: see how many watchers are on page
    //set scope vars
    $scope.devices = [];
    $scope.detune = 0;
    $scope.messageDelivered = false;
    $scope.oscillators = [];

    //set scope options
    $scope.enableComputerKeyboardMidi = false;
    $scope.wavForms = ['sine','square','triangle','sawtooth', 'pulse', 'pwm'];
    $scope.filterRolloff = [-12, -24, -48];
    $scope.filterTypes = ["lowpass", "highpass", "bandpass", "lowshelf", "highshelf", "notch", "allpass", "peaking"];
    $scope.lfoRates = ["8m","4m","2m","1m","2n","3n","4n","8n","12n","16n"];
    $scope.lfoForms = ['sine','square','triangle','sawtooth'];

    $scope.synth = new SynthFactory();
    $scope.synth.initialize();
    console.log('SYNTH', $scope.synth);



    $scope.keyPressed = function (event) {
        if($scope.enableComputerKeyboardMidi) $scope.synth.noteOn(event.keyCode, 100);
        // if($scope.OSC1.active) $scope.OSC1.light = true;
        // if($scope.OSC2.active) $scope.OSC2.light = true;
    }

    $scope.keyReleased = function(event) {
        if ($scope.enableComputerKeyboardMidi) $scope.synth.noteOff(event.keyCode+32);
        // $scope.OSC1.light = false;
        // $scope.OSC2.light = false;
        console.log('KEY RELEASED', event.keyCode+32-60);
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