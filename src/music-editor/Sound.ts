
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
    await this.audioContext.audioWorklet.addModule(workletUrl);
    let sineNode = new AudioWorkletNode(this.audioContext, 'sine-processor');
    sineNode.connect(this.audioContext.destination);
  }

  play() {
    this.init();
  }
}

const workletCode = `
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
const workletBlob = new Blob([workletCode], { type: 'application/javascript' });
const workletUrl = URL.createObjectURL(workletBlob);
window.addEventListener('beforeunload', () => {
    if (workletUrl) {
        URL.revokeObjectURL(workletUrl);
    }
});
