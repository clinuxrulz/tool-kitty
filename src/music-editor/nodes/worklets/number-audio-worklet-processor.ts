class NumberAudioWorkletProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
  }

  static get parameterDescriptors() {
    return [
      {
        name: "value",
        defaultValue: 0,
      },
    ];
  }

  process(inputs: Float32Array[][], outputs: Float32Array[][], parameters: Record<string, Float32Array>): boolean {
    const out = outputs[0][0];
    for (let i = 0; i < out.length; ++i) {
      let value = (parameters["value"].length > 1
            ? parameters["value"][i]
            : parameters["value"][0]);
      out[i] = value;
    }
    return true;
  }
}

registerProcessor('number-audio-worklet-processor', NumberAudioWorkletProcessor);
