import { err, ok, Result } from "./Result.js";

import bp_url from "./buffer-processor.ts?worker&url";

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

let GME: GME_Module;
// @ts-ignore
import initGME from "../../libgme/gme.js";
GME = await initGME();

export class Chiptunes {
  private node: AudioWorkletNode;
  private sampleRate: number;
  private onMoreData:
    | ((pool?: ArrayBuffer[]) => {
        channels: ArrayBuffer[];
      })
    | undefined;
  bufferSize: number;
  buffer: number;

  static async init(): Promise<Chiptunes> {
    const audioContext = new AudioContext();
    await audioContext.audioWorklet.addModule(bp_url);
    const chiptunesNode = new AudioWorkletNode(
      audioContext,
      "buffer-processor",
      {
        outputChannelCount: [2],
      },
    );
    const volume = audioContext.createGain();
    chiptunesNode.connect(volume);
    volume.gain.setValueAtTime(1.0, audioContext.currentTime);
    volume.connect(audioContext.destination);
    return new Chiptunes(chiptunesNode, audioContext.sampleRate);
  }

  constructor(node: AudioWorkletNode, sampleRate: number) {
    this.node = node;
    this.node.port.onmessage = (e) => {
      if (this.onMoreData != undefined) {
        this.node.port.postMessage(this.onMoreData(e.data.pool));
      }
    };
    this.sampleRate = sampleRate;
    this.bufferSize = 1024 * 16;
    this.buffer = GME._malloc(this.bufferSize * 2 * 4);
  }

  async load(musicData: ArrayBuffer): Promise<
    Result<{
      emu: number;
      subtuneCount: number;
    }>
  > {
    let musicData2 = new Uint8Array(musicData);
    let ref = GME._malloc(4);
    if (
      GME.ccall(
        "gme_open_data",
        "number",
        ["array", "number", "number", "number"],
        [musicData2, musicData2.length, ref, this.sampleRate],
      ) != 0
    ) {
      return err("failed.");
    }
    let emu = GME.getValue(ref, "i32");
    let subtuneCount = GME.ccall(
      "gme_track_count",
      "number",
      ["number"],
      [emu],
    );
    GME.ccall("gme_ignore_silence", "number", ["number"], [emu, 1]);
    return ok({
      emu,
      subtuneCount,
    });
  }

  async play(emu: number, subtune: number): Promise<Result<{}>> {
    if (
      GME.ccall(
        "gme_start_track",
        "number",
        ["number", "number"],
        [emu, subtune],
      ) != 0
    ) {
      return err("Failed.");
    }

    const INT32_MAX = Math.pow(2, 32) - 1;

    this.onMoreData = (pool) => {
      let channels: Float32Array[];
      if (pool == undefined) {
        channels = [
          new Float32Array(this.bufferSize),
          new Float32Array(this.bufferSize),
        ];
      } else {
        channels = pool.map((c) => new Float32Array(c));
      }
      if (GME.ccall("gme_track_ended", "number", ["number"], [emu]) == 1) {
        this.onMoreData = undefined;
        return {
          channels: channels.map((c) => c.buffer as ArrayBuffer),
        };
      }
      const err = GME.ccall(
        "gme_play",
        "number",
        ["number", "number", "number"],
        [emu, this.bufferSize * 2, this.buffer],
      );
      for (var i = 0; i < this.bufferSize; i++) {
        for (var n = 0; n < channels.length; n++) {
          channels[n][i] =
            GME.getValue(this.buffer + i * channels.length * 2 + n * 4, "i32") /
            INT32_MAX;
        }
      }
      return {
        channels: channels.map((c) => c.buffer as ArrayBuffer),
      };
    };
    this.node.port.postMessage({
      new: true,
      ...this.onMoreData(),
    });
    return ok({});
  }
}
