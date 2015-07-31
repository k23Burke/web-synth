app.factory('MidiDeviceFactory', function ($window, KBSynthService) {
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
	            KBSynthService.noteOn(e.data[1], e.data[2]);
	        break;
	        case 128:
	        console.log('NOTE RELEASE');
	            KBSynthService.releaseNote(e.data[1]);
	        break;
	        case 224:
	            // KBSynthService.detune(e.data[2]);
	            console.log('NO DETUNE FOR NOW');
	        break;
	    }

	}


	return {
		connectMidiBrowser: connectMidiBrowser,
		pluginMidiDevice: pluginMidiDevice

	}
})