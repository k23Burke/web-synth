// app.service('OscillatorService', function () {
//         function Oscillator() {
//             this.keys = [];
//             this.active = true;
//             this.detune = 0;
//             this.subVolume = -50;
//             this.attack = 10;
//             this.decay = 100;
//             this.sustain = 500;
//             this.release = 500;
//             this.wavForm = 'sine';
//             this.filterType = 'lowpass';
//             this.filterFreq = 400;
//             this.volume = new Tone.Volume(0);
//         }
//         Oscillator.prototype.createNote = function(midiKey, lfo) {

//             if(this.active) {
//                 var keyObj = {};
//                 keyObj[midiKey] = {
//                     main: this.createKeyOsc()
//                 }
//                 this.keys.push(keyObj);
//                 var keyPlayed = this.midiToKey(midiKey);
//                 keyObj[midiKey].main.triggerAttack(keyPlayed);
//                 var oct = parseInt(keyPlayed.substr(keyPlayed.length-1, 1)) - 1;
//                 if(this.subVolume !== -50) {
//                     keyObj[midiKey].sub = this.createKeyOsc()
//                     keyObj[midiKey].sub.volume.value = this.subVolume;
//                     if(oct !== 0) {
//                         keyObj[midiKey].sub.triggerAttack(keyPlayed.substr(0,keyPlayed.length-1) + oct.toString());
//                     } else {
//                         keyObj[midiKey].sub.triggerAttack(keyPlayed);
//                     }
//                 }
//             }
//         }
//         Oscillator.prototype.createKeyOsc = function() {
//             var key = new Tone.MonoSynth();
//             key.envelope.attack = this.attack/1000;
//             key.envelope.decay = this.decay/1000;
//             key.envelope.sustain = this.sustain/1000;
//             key.envelope.release = this.release/1000;
//             key.oscillator.type = this.wavForm;
//             key.detune.value = this.detune;
//             key.filter.type  = this.filterType;
//             key.filter.frequency.value  = this.filterFreq;
//             key.chain(this.volume);

//             return key;
//         }
//         Oscillator.prototype.midiToKey = function(midiKey) {
//             var keyArray = ["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"];
//             var key = keyArray[midiKey % 12];
//             var oct = Math.floor(midiKey / 12);
//             var theNote = key + oct.toString();
//             return theNote;
//         }
//         Oscillator.prototype.releaseNote = function(midiKey) {
//             var self = this;
//             this.keys = this.keys.filter(function (keyObj) {
//                 if(keyObj.hasOwnProperty(midiKey)) {
//                     keyObj[midiKey].main.triggerRelease(self.release/1000);
//                     if(keyObj[midiKey].sub) {
//                         keyObj[midiKey].sub.triggerRelease(self.release/1000);
//                     }
//                     var interval = window.setInterval( function() {

//                         //dispose of both main and sub
//                         keyObj[midiKey].main.dispose();
//                         if(keyObj[midiKey].sub) {
//                             keyObj[midiKey].sub.dispose();
//                         }

//                         window.clearInterval(interval);

//                     }, self.release);

//                     return false;
//                 }
//                 else return true;
//             });
//         }

//         //change features
//         Oscillator.prototype.changeWavForm = function(wavForm) {
//             this.wavForm = wavForm;
//         }
//         Oscillator.prototype.connectToFilter = function(filter) {
//             this.volume.connect(filter);
//         }

//         return Oscillator;
//     })