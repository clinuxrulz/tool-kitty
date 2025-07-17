import { err, ok, Result } from "./Result.js";

import cp_url from "./chiptunes-processor.js?worker&url";

export class Chiptunes {
  private callbacks = new Map<number, (x: Result<any>) => void>();
  private nextCallbackId: number = 0;
  private node: AudioWorkletNode;
  private sampleRate: number;

  private call<A>(message: object): Promise<Result<A>> {
    return new Promise<Result<A>>((resolve) => {
      let callbackId = this.nextCallbackId++;
      this.callbacks.set(callbackId, resolve);
      this.node.port.postMessage({
        callbackId,
        message,
      });
    });
  }

  static async init(): Promise<Chiptunes> {
    const audioContext = new AudioContext();
    await audioContext.audioWorklet.addModule(cp_url);
    const chiptunesNode = new AudioWorkletNode(
      audioContext,
      "chiptunes-processor",
      {
        outputChannelCount: [2],
      },
    );
    const volume = audioContext.createGain();
    chiptunesNode.connect(volume);
    volume.gain.setValueAtTime(1.0, audioContext.currentTime);
    volume.connect(audioContext.destination);
    let r = new Chiptunes(chiptunesNode, audioContext.sampleRate);
    await r.call({ type: "init" });
    return r;
  }

  constructor(node: AudioWorkletNode, sampleRate: number) {
    this.node = node;
    this.node.port.onmessage = (e) => {
      let data = e.data;
      let callbackId = data.callbackId;
      let callback = this.callbacks.get(callbackId)!;
      callback(data.result);
      this.callbacks.delete(callbackId);
    };
    this.sampleRate = sampleRate;
  }

  async load(musicData: ArrayBuffer): Promise<
    Result<{
      emu: number;
      subtuneCount: number;
    }>
  > {
    return this.call({
      type: "load",
      musicData,
      sampleRate: this.sampleRate,
    });
  }

  async play(emu: number, subtune: number): Promise<Result<{}>> {
    return this.call({
      type: "play",
      emu,
      subtune,
    });
  }
}
