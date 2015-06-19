// var channel = function(wave, ) {
// 	this.waveForm = wave;
// 	this.sub = 0;
// 	this.attack = 0;
// 	this.release = 0;
// }




//create one of Tone's built-in synthesizers
var synth = new Tone.MonoSynth();

var pulse = new Tone.PulseOscillator("E5", 0.4);

// var oscillator = new Tone.Oscillator(frequency, type); //(sine|square|triangle|sawtooth)

// var noise = new Tone.Noise(type); //(white|pink|brown)



//effect - FILTER
var FILTERFREQ = 350;
var filter = new Tone.Filter(FILTERFREQ, "lowpass");

//LFO
// var lfo = new Tone.LFO("4n", FILTERFREQ+50, FILTERFREQ-50);
// lfo.connect(filter.frequency);
// lfo.sync();

//effect - CRUSHER
var crusher = new Tone.BitCrusher(4);
crusher.wet.value = 0.8;


//effect - PingPong
var pingPong = new Tone.PingPongDelay("16n", 0.1);

//connect the synth to the master output channel


synth.connect(filter);
filter.connect(crusher);
crusher.toMaster();
// crusher.connect(pingPong)
// pingPong.toMaster();


var notes = ["A3", "D4", "F4", "D5", "A2", "C4", "F3", "B3"];
var position = 0;
//create a callback which is invoked every quarter note
Tone.Transport.setInterval(function(time){
    //trigger middle C for the duration of an 8th note
    var note = notes[position++];
    position = position % notes.length;
    synth.triggerAttackRelease(note, "8n", time);
    // synth.triggerAttackRelease("C4", 0.9, time);
}, "8n");

//start the transport
Tone.Transport.start();
