import { err, ok, Result } from "./Result.js";

import ChiptunesWorker from "./chiptunes-worker.js?worker";
import bp_url from "./buffer-processor.ts?worker&url";

export class Chiptunes {
  private callbacks = new Map<number, (x: Result<any>) => void>();
  private nextCallbackId: number = 0;
  private worker = new ChiptunesWorker();
  private node: AudioWorkletNode;
  private sampleRate: number;
  private onMoreData:
    | ((pool?: ArrayBuffer[]) => Promise<{
        channels: ArrayBuffer[];
      }>)
    | undefined;

  private call<A>(message: object): Promise<Result<A>> {
    return new Promise<Result<A>>((resolve) => {
      let callbackId = this.nextCallbackId++;
      this.callbacks.set(callbackId, resolve);
      this.worker.postMessage({
        callbackId,
        message,
      });
    });
  }

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
    let r = new Chiptunes(chiptunesNode, audioContext.sampleRate);
    await r.call({ type: "init" });
    return r;
  }

  constructor(node: AudioWorkletNode, sampleRate: number) {
    this.node = node;
    this.node.port.onmessage = (e) => {
      if (this.onMoreData != undefined) {
        let onMoreData = this.onMoreData;
        (async () => {
          let r = await onMoreData(e.data.pool);
          this.node.port.postMessage(r);
        })();
      }
    };
    this.sampleRate = sampleRate;
    this.worker.addEventListener("message", (e) => {
      let data = e.data;
      let callbackId = data.callbackId;
      let callback = this.callbacks.get(callbackId)!;
      callback(data.result);
      this.callbacks.delete(callbackId);
    });
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
    let r = await this.call<{
      channels: ArrayBuffer[];
      moreDataCallbackId: number;
    }>({
      type: "play",
      emu,
      subtune,
    });
    if (r.type == "Err") {
      return r;
    }
    let { channels: initChannels, moreDataCallbackId } = r.value;
    this.onMoreData = async (pool) => {
      let r = await this.call<{
        channels: ArrayBuffer[];
      }>({
        type: "moreData",
        moreDataCallbackId,
        pool,
      });
      if (r.type == "Err") {
        console.log(r.message);
        throw r.message;
      }
      return r.value;
    };
    this.node.port.postMessage({
      channels: initChannels,
      new: true,
    });
    return ok({});
  }
}
