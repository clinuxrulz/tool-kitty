
const MIDDLE_C_HZ = 261.63;

let ratiosAsFractions: number[] = [];

for (let i = 0; i <= 12; ++i) {
  for (let j = i; j <= 12; ++j) {
    let fraction = i / j;
    ratiosAsFractions.push(fraction);
  }
}
ratiosAsFractions.sort((a, b) => a - b);
for (let i = ratiosAsFractions.length-1; i > 0; --i) {
  if (ratiosAsFractions[i] - ratiosAsFractions[i-1] <= 0.001) {
    ratiosAsFractions.splice(i, 1);
  }
}

let atFrequencyIdx = 0;
let frequencies: number[] = ratiosAsFractions.map(
  (fraction) =>
    MIDDLE_C_HZ + MIDDLE_C_HZ * fraction
);

let nextFreq = () => {
  let result = frequencies[atFrequencyIdx];
  atFrequencyIdx = (atFrequencyIdx + 1) % frequencies.length;
  return result;
};

let atFrequencyIdx2 = 0;
let nextFreq2 = () => {
  let idx = atFrequencyIdx2;
  atFrequencyIdx2 = (atFrequencyIdx2 + 1) % 12;
  return MIDDLE_C_HZ * Math.pow(2, (idx / 12));
};

const notes: { name: string, type: "white" | "black", }[] = [
  { name: 'C', type: 'white' },
  { name: 'C#', type: 'black' },
  { name: 'D', type: 'white' },
  { name: 'D#', type: 'black' },
  { name: 'E', type: 'white' },
  { name: 'F', type: 'white' },
  { name: 'F#', type: 'black' },
  { name: 'G', type: 'white' },
  { name: 'G#', type: 'black' },
  { name: 'A', type: 'white' },
  { name: 'A#', type: 'black' },
  { name: 'B', type: 'white' },
];


export class Sound {
  audioContext: AudioContext | undefined = undefined;
  pianoNode: AudioWorkletNode | undefined = undefined;

  constructor() {}

  async init() {
    if (this.audioContext) {
        if (this.audioContext.state === 'suspended') {
            await this.audioContext.resume();
        } else if (this.audioContext.state === 'running') {
            await this.audioContext.suspend();
        }
        return;
    }
    this.audioContext = new AudioContext();
    await this.audioContext.audioWorklet.addModule(sineWorkletUrl);
    await this.audioContext.audioWorklet.addModule(sawWorkletUrl);
    await this.audioContext.audioWorklet.addModule(squareWorkletUrl);
    await this.audioContext.audioWorklet.addModule(pianoWorkletUrl);
    let gainNode = this.audioContext.createGain()
    gainNode.gain.value = 0.1 // 10 %
    gainNode.connect(this.audioContext.destination)
    //let sineNode = new AudioWorkletNode(this.audioContext, 'sine-processor');
    //sineNode.connect(gainNode);
    //let sawNode = new AudioWorkletNode(this.audioContext, "saw-processor");
    //sawNode.connect(gainNode);
    //let squareNode = new AudioWorkletNode(this.audioContext, "square-processor");
    //squareNode.connect(gainNode);
    this.pianoNode = new AudioWorkletNode(this.audioContext, "piano-processor");
    this.pianoNode.connect(gainNode);
  }

  async noteOn(name: string) {
    if (this.audioContext == undefined) {
      await this.init();
      return;
    }
    let noteIdx = notes.findIndex((note) => note.name == name);
    if (noteIdx == -1) {
      return;
    }
    let frequency = MIDDLE_C_HZ * Math.pow(2, noteIdx / 12);
    this.pianoNode?.port.postMessage({
      type: "noteOn",
      frequency,
    });
  }

  async noteOff(name: string) {
    if (this.audioContext == undefined) {
      await this.init();
    }    
    this.pianoNode?.port.postMessage({
      type: "noteOff",
    });
  }

  play() {
    this.init();
  }
}

const sineWorkletCode = `
class SineProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.phase = 0;
    this.frequency = 300; // Hz
  }

  process(inputs, outputs, parameters) {
    const output = outputs[0]; // Get the first output channel
    const outputChannel = output[0]; // Get the first channel (mono)

    // Generate sine wave samples
    for (let i = 0; i < outputChannel.length; i++) {
      // Calculate the phase increment based on frequency and sample rate
      // sampleRate is a global variable available in AudioWorkletGlobalScope
      this.phase += (2 * Math.PI * this.frequency) / sampleRate;
      outputChannel[i] = Math.sin(this.phase); // Generate sine wave sample
    }

    // Keep phase within [0, 2*PI] to prevent it from growing indefinitely
    this.phase %= (2 * Math.PI);

    return true; // Keep the processor alive
  }
}

registerProcessor('sine-processor', SineProcessor);
`;

// Create a Blob URL for the worklet code
const sineWorkletBlob = new Blob([sineWorkletCode], { type: 'application/javascript' });
const sineWorkletUrl = URL.createObjectURL(sineWorkletBlob);

const sawWorkletCode = `
class SawProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.phase = 0;
    this.frequency = 300; // Hz
  }

  process(inputs, outputs, parameters) {
    const output = outputs[0]; // Get the first output channel
    const outputChannel = output[0]; // Get the first channel (mono)

    // Generate sine wave samples
    for (let i = 0; i < outputChannel.length; i++) {
      // Calculate the phase increment based on frequency and sample rate
      // sampleRate is a global variable available in AudioWorkletGlobalScope
      this.phase += (2 * Math.PI * this.frequency) / sampleRate;
      outputChannel[i] = this.phase; // Generate sine wave sample
    }

    // Keep phase within [0, 2*PI] to prevent it from growing indefinitely
    this.phase %= (2 * Math.PI);

    return true; // Keep the processor alive
  }
}

registerProcessor('saw-processor', SawProcessor);
`;

// Create a Blob URL for the worklet code
const sawWorkletBlob = new Blob([sawWorkletCode], { type: 'application/javascript' });
const sawWorkletUrl = URL.createObjectURL(sawWorkletBlob);

const squireWorkletCode = `
class SquareProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.phase = 0;
    this.frequency = 300; // Hz
  }

  process(inputs, outputs, parameters) {
    const output = outputs[0]; // Get the first output channel
    const outputChannel = output[0]; // Get the first channel (mono)

    // Generate sine wave samples
    for (let i = 0; i < outputChannel.length; i++) {
      // Calculate the phase increment based on frequency and sample rate
      // sampleRate is a global variable available in AudioWorkletGlobalScope
      this.phase += (2 * Math.PI * this.frequency) / sampleRate;
      outputChannel[i] = (this.phase < Math.PI ? 0 : 1); // Generate sine wave sample
    }

    // Keep phase within [0, 2*PI] to prevent it from growing indefinitely
    this.phase %= (2 * Math.PI);

    return true; // Keep the processor alive
  }
}

registerProcessor('square-processor', SquareProcessor);
`;

// Create a Blob URL for the worklet code
const squareWorkletBlob = new Blob([squireWorkletCode], { type: 'application/javascript' });
const squareWorkletUrl = URL.createObjectURL(squareWorkletBlob);

const pianoWorkletCode = `
class PianoProcessor extends AudioWorkletProcessor {
    constructor() {
        super();
        this.phase = 0;
        this.sampleRate = sampleRate; // Global sampleRate from AudioWorkletGlobalScope

        // Define harmonics (fundamental + a few overtones) and their relative gains
        // These values are simplified and can be tweaked for different piano sounds
        this.harmonics = [
            { freqMultiplier: 1, gain: 1.0 },   // Fundamental
            { freqMultiplier: 2, gain: 0.6 },   // 1st overtone (octave)
            { freqMultiplier: 3, gain: 0.4 },   // 2nd overtone (fifth above octave)
            { freqMultiplier: 4, gain: 0.3 },   // 3rd overtone (two octaves)
            { freqMultiplier: 5, gain: 0.2 },   // 4th overtone (major third)
        ];

        // ADSR envelope parameters (simplified)
        this.attackTime = 0.01; // Very fast attack
        this.decayTime = 0.1;
        this.sustainLevel = 0.6;
        this.releaseTime = 0.8;

        this.envelopePhase = 0; // 0: idle, 1: attack, 2: decay, 3: sustain, 4: release
        this.currentGain = 0;
        this.noteOnTime = 0;
        this.noteOffTime = 0;
        this.frequency = 0; // Will be set via port.onmessage

        this.port.onmessage = (event) => {
            if (event.data.type === 'noteOn') {
                this.frequency = event.data.frequency;
                this.noteOnTime = currentTime; // Global currentTime from AudioWorkletGlobalScope
                this.envelopePhase = 1; // Start attack
                this.phase = 0; // Reset phase for new note
            } else if (event.data.type === 'noteOff') {
                this.noteOffTime = currentTime;
                this.envelopePhase = 4; // Start release
            }
        };
    }

    process(inputs, outputs, parameters) {
        const output = outputs[0]; // Assuming mono output for simplicity
        const channel = output[0]; // Get the first channel

        for (let i = 0; i < channel.length; ++i) {
            let sample = 0;

            // Update envelope
            if (this.envelopePhase === 1) { // Attack
                const timeElapsed = currentTime - this.noteOnTime;
                if (timeElapsed < this.attackTime) {
                    this.currentGain = timeElapsed / this.attackTime;
                } else {
                    this.currentGain = 1.0;
                    this.envelopePhase = 2; // Move to decay
                    this.decayStartTime = currentTime;
                }
            } else if (this.envelopePhase === 2) { // Decay
                const timeElapsed = currentTime - this.decayStartTime;
                if (timeElapsed < this.decayTime) {
                    this.currentGain = 1.0 - (1.0 - this.sustainLevel) * (timeElapsed / this.decayTime);
                } else {
                    this.currentGain = this.sustainLevel;
                    this.envelopePhase = 3; // Move to sustain
                }
            } else if (this.envelopePhase === 3) { // Sustain (maintain currentGain)
                // Nothing to do, just hold the sustain level
            } else if (this.envelopePhase === 4) { // Release
                const timeElapsed = currentTime - this.noteOffTime;
                if (timeElapsed < this.releaseTime) {
                    this.currentGain = this.sustainLevel * (1.0 - (timeElapsed / this.releaseTime));
                } else {
                    this.currentGain = 0;
                    this.envelopePhase = 0; // Go to idle
                    this.frequency = 0; // Stop generating sound
                }
            }

            // Generate sound if frequency and gain are active
            if (this.frequency > 0 && this.currentGain > 0.001) { // Threshold to prevent silence from generating
                for (const harmonic of this.harmonics) {
                    const freq = this.frequency * harmonic.freqMultiplier;
                    sample += Math.sin(this.phase * freq * 2 * Math.PI) * harmonic.gain;
                }
                sample *= this.currentGain; // Apply envelope gain
            } else {
                sample = 0; // No sound
            }

            channel[i] = sample;

            // Advance phase for the next sample
            this.phase += 1 / this.sampleRate;
            if (this.phase >= 1) {
                this.phase -= 1; // Keep phase within [0, 1)
            }
        }

        // Return false when the sound is completely silent to allow garbage collection
        //return this.envelopePhase !== 0 || this.currentGain > 0.001;
        return true;
    }
}

registerProcessor('piano-processor', PianoProcessor);`;

// Create a Blob URL for the worklet code
const pianoWorkletBlob = new Blob([pianoWorkletCode], { type: 'application/javascript' });
const pianoWorkletUrl = URL.createObjectURL(pianoWorkletBlob);

window.addEventListener('beforeunload', () => {
  if (sineWorkletUrl) {
    URL.revokeObjectURL(sineWorkletUrl);
    URL.revokeObjectURL(sawWorkletUrl);
    URL.revokeObjectURL(squareWorkletUrl);
    URL.revokeObjectURL(pianoWorkletUrl);
  }
});
