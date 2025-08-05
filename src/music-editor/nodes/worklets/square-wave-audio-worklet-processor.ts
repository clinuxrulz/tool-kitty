class SquareWaveAudioWorkletProcessor extends AudioWorkletProcessor {
  private phase: number;

  constructor() {
    super();
    this.phase = 0;
  }

  process(inputs: Float32Array[][], outputs: Float32Array[][], parameters: Record<string, Float32Array>): boolean {
    const frequency = inputs[0][0];
    const amplitude = inputs[1][0];
    const centre = inputs[2][0];
    const out = outputs[0][0];
    for (let i = 0; i < out.length; ++i) {
      this.phase += (2 * Math.PI * frequency[i]) / sampleRate;
      out[i] = amplitude[i] * (this.phase < Math.PI ? 0 : 1) + centre[i];
    }
    this.phase %= (2 * Math.PI);
    return true;
  }
}

registerProcessor('square-wave-audio-worklet-processor', SquareWaveAudioWorkletProcessor);
