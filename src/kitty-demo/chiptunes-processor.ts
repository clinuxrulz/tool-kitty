import { err, ok, Result } from "./Result.js";
// @ts-ignore
import initGME from "../../libgme-as-worklet/gme.js";

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

interface ALLOC_STATIC_TYPE {}

interface GME_Module {
  ALLOC_STATIC: ALLOC_STATIC_TYPE;
  run(): void;
  _malloc(size: number): number;
  getValue(a: number, b: "i32"): number;
  ccall(
    a: "gme_open_data",
    b: "number",
    c: ["array", "number", "number", "number"],
    d: [Uint8Array, number, number, number],
  ): number;
  ccall(a: "gme_track_count", b: "number", c: ["number"], d: [number]): number;
  ccall(
    a: "gme_ignore_silence",
    b: "number",
    c: ["number"],
    d: [number, 1],
  ): void;
  ccall(
    a: "gme_start_track",
    b: "number",
    c: ["number", "number"],
    d: [number, number],
  ): number;
  ccall(a: "gme_track_ended", b: "number", c: ["number"], d: [number]): number;
  ccall(
    a: "gme_play",
    b: "number",
    c: ["number", "number", "number"],
    d: [number, number, number],
  ): number;
}

class ChiptunesProcessor extends AudioWorkletProcessor {
  private GME!: GME_Module;
  private buffer: number = 0;
  private bufferSize: number = 0;
  private playing:
    | {
        emu: number;
      }
    | undefined;
  private INT32_MAX = Math.pow(2, 32) - 1;

  constructor(options?: AudioWorkletNodeOptions) {
    super(options);
    //
    this.port.onmessage = (e) => {
      let callbackId = e.data.callbackId;
      let message = e.data.message;
      let type = message.type;
      let data = message;
      switch (type) {
        case "init": {
          (async () => {
            let r = await this.init();
            this.port.postMessage({
              callbackId,
              result: r,
            });
          })();
          break;
        }
        case "load": {
          let r = this.load(data.musicData, data.sampleRate);
          this.port.postMessage({
            callbackId,
            result: r,
          });
          break;
        }
        case "play": {
          let r = this.play(data.emu, data.subtune);
          this.port.postMessage({
            callbackId,
            result: r,
          });
          break;
        }
      }
    };
  }

  async init(): Promise<Result<{}>> {
    // @ts-ignore
    this.GME = await initGME();
    this.bufferSize = 1024 * 16;
    this.buffer = this.GME._malloc(this.bufferSize * 2 * 4);
    this.playing = undefined;
    return ok({});
  }

  load(
    musicData: ArrayBuffer,
    sampleRate: number,
  ): Result<{
    emu: number;
    subtuneCount: number;
  }> {
    let musicData2 = new Uint8Array(musicData);
    let ref = this.GME._malloc(4);
    if (
      this.GME.ccall(
        "gme_open_data",
        "number",
        ["array", "number", "number", "number"],
        [musicData2, musicData2.length, ref, sampleRate],
      ) != 0
    ) {
      return err("failed.");
    }
    let emu = this.GME.getValue(ref, "i32");
    let subtuneCount = this.GME.ccall(
      "gme_track_count",
      "number",
      ["number"],
      [emu],
    );
    this.GME.ccall("gme_ignore_silence", "number", ["number"], [emu, 1]);
    return ok({
      emu,
      subtuneCount,
    });
  }

  play(emu: number, subtune: number): Result<{}> {
    if (
      this.GME.ccall(
        "gme_start_track",
        "number",
        ["number", "number"],
        [emu, subtune],
      ) != 0
    ) {
      return err("Failed.");
    }
    this.playing = { emu };
    return ok({});
  }

  process(
    inputs: Float32Array[][],
    outputs: Float32Array[][],
    parameters: Record<string, Float32Array>,
  ): boolean {
    if (this.playing == undefined) {
      return true;
    }
    let emu = this.playing.emu;
    if (this.GME.ccall("gme_track_ended", "number", ["number"], [emu]) == 1) {
      this.playing = undefined;
      return true;
    }
    let outputs2 = outputs[0];
    const err = this.GME.ccall(
      "gme_play",
      "number",
      ["number", "number", "number"],
      [emu, outputs2[0].length * 2, this.buffer],
    );
    for (let n = 0; n < outputs2.length; ++n) {
      let outputs3 = outputs2[n];
      for (let i = 0; i < outputs3.length; ++i) {
        outputs3[i] =
          this.GME.getValue(
            this.buffer + i * outputs2.length * 2 + n * 4,
            "i32",
          ) / this.INT32_MAX;
      }
    }
    return true;
  }
}

registerProcessor("chiptunes-processor", ChiptunesProcessor);
