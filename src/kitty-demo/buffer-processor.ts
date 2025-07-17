interface AudioWorkletProcessor {
  readonly port: MessagePort;
  process(
    inputs: Float32Array[][],
    outputs: Float32Array[][],
    parameters: Record<string, Float32Array>,
  ): boolean;
}

declare var AudioWorkletProcessor: {
  prototype: AudioWorkletProcessor;
  new (options?: AudioWorkletNodeOptions): AudioWorkletProcessor;
};

declare function registerProcessor(
  name: string,
  processorCtor: new (
    options?: AudioWorkletNodeOptions,
  ) => AudioWorkletProcessor /* & {
        parameterDescriptors?: AudioParamDescriptor[];
    }*/,
): void;

class BufferProcessor extends AudioWorkletProcessor {
  channels: Float32Array[] | undefined;
  nextChannels: Float32Array[] | undefined;
  atFrame: number;
  waitingForMore: boolean;
  constructor(options?: AudioWorkletNodeOptions) {
    super(options);
    this.channels = undefined;
    this.atFrame = 0;
    this.waitingForMore = false;
    this.port.onmessage = (e) => {
      let data = e.data;
      if (data.new) {
        this.channels = undefined;
        this.nextChannels = undefined;
      }
      if (this.channels == undefined) {
        this.channels = (data.channels as ArrayBuffer[]).map(
          (x) => new Float32Array(x),
        );
        this.port.postMessage("moreData");
      } else {
        this.nextChannels = (data.channels as ArrayBuffer[]).map(
          (x) => new Float32Array(x),
        );
        this.waitingForMore = false;
      }
      this.atFrame = 0;
    };
  }
  process(
    inputs: Float32Array[][],
    outputs: Float32Array[][],
    parameters: Record<string, Float32Array>,
  ): boolean {
    if (this.channels == undefined) {
      return true;
    }
    if (this.atFrame >= this.channels[0].length) {
      return true;
    }
    let pool: ArrayBuffer[] | undefined = undefined;
    let outputs2 = outputs[0];
    for (let i = 0; i < outputs2[0].length; ++i) {
      if (this.channels == undefined) {
        return true;
      }
      for (let j = 0; j < this.channels.length; ++j) {
        outputs2[j][i] = this.channels[j][this.atFrame];
      }
      ++this.atFrame;
      if (
        this.channels != undefined &&
        this.atFrame >= this.channels[0].length
      ) {
        this.atFrame = 0;
        pool = this.channels.map((c) => c.buffer as ArrayBuffer);
        this.channels = this.nextChannels;
        this.nextChannels = undefined;
      }
    }
    if (!this.waitingForMore && this.nextChannels == undefined) {
      if (pool != undefined) {
        this.port.postMessage({
          type: "moreData",
          pool,
        });
      } else {
        this.port.postMessage({
          type: "moreData",
        });
      }
      this.waitingForMore = true;
    }
    return true;
  }
}

registerProcessor("buffer-processor", BufferProcessor);
