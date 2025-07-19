
export class Sound {
  audioContext: AudioContext | undefined = undefined;

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
    let gainNode = this.audioContext.createGain()
    gainNode.gain.value = 0.1 // 10 %
    gainNode.connect(this.audioContext.destination)
    //let sineNode = new AudioWorkletNode(this.audioContext, 'sine-processor');
    //sineNode.connect(gainNode);
    let sawNode = new AudioWorkletNode(this.audioContext, "saw-processor");
    sawNode.connect(gainNode);
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


window.addEventListener('beforeunload', () => {
    if (sineWorkletUrl) {
        URL.revokeObjectURL(sineWorkletUrl);
        URL.revokeObjectURL(sawWorkletUrl);
    }
});
