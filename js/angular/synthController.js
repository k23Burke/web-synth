app.controller('SynthController', function ($scope, Devices, KBSynthService) {
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

	var synth = KBSynthService();
	synth.initialize();

	synth.oscillators.forEach(function (channel) {
		$scope.oscillators.push({
            number: 1,
            active: channel.osc.active,
            wavForm: channel.osc.wavForm,
            sub: 0,

            attack: channel.osc.attack,
            decay: channel.osc.decay,
            sustain: channel.osc.sustain,
            release: channel.osc.release,

            detune: channel.osc.detune,
            subVolume: channel.osc.subVolume
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

});