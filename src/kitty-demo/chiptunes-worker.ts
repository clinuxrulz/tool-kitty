import { err, ok, Result } from "./Result.js";

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

let moreDataCallbacks = new Map<
  number,
  (pool: ArrayBuffer[]) => { channels: ArrayBuffer[] }
>();
let nextMoreDataCallbackId = 0;

let GME!: GME_Module;
// @ts-ignore
import initGME from "../../libgme/gme.js";

self.addEventListener("message", (e) => {
  let callbackId = e.data.callbackId;
  let message = e.data.message;
  let type = message.type;
  let data = message;
  switch (type) {
    case "init": {
      (async () => {
        let r = await init();
        self.postMessage({
          callbackId,
          result: r,
        });
      })();
      break;
    }
    case "load": {
      let r = load(data.musicData, data.sampleRate);
      self.postMessage({
        callbackId,
        result: r,
      });
      break;
    }
    case "play": {
      let r = play(data.emu, data.subtune);
      self.postMessage({
        callbackId,
        result: r,
      });
      break;
    }
    case "moreData": {
      let moreDataCallbackId = data.moreDataCallbackId;
      let pool = data.pool;
      let onMoreData = moreDataCallbacks.get(moreDataCallbackId)!;
      let r = ok(onMoreData(pool));
      self.postMessage({
        callbackId,
        result: r,
      });
      break;
    }
  }
});

async function init(): Promise<Result<{}>> {
  GME = await initGME();
  return ok({});
}

function load(
  musicData: ArrayBuffer,
  sampleRate: number,
): Result<{
  emu: number;
  subtuneCount: number;
}> {
  let musicData2 = new Uint8Array(musicData);
  let ref = GME._malloc(4);
  if (
    GME.ccall(
      "gme_open_data",
      "number",
      ["array", "number", "number", "number"],
      [musicData2, musicData2.length, ref, sampleRate],
    ) != 0
  ) {
    return err("failed.");
  }
  let emu = GME.getValue(ref, "i32");
  let subtuneCount = GME.ccall("gme_track_count", "number", ["number"], [emu]);
  GME.ccall("gme_ignore_silence", "number", ["number"], [emu, 1]);
  return ok({
    emu,
    subtuneCount,
  });
}

function play(
  emu: number,
  subtune: number,
): Result<{
  channels: ArrayBuffer[];
  moreDataCallbackId: number;
}> {
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
  const bufferSize = 1024 * 16;
  const inputs = 2;
  const outputs = 2;

  //
  const buffer = GME._malloc(bufferSize * 2 * 4);

  const INT32_MAX = Math.pow(2, 32) - 1;

  let onMoreData: (pool?: ArrayBuffer[]) => { channels: ArrayBuffer[] } = (
    pool,
  ) => {
    let channels: Float32Array[];
    if (pool == undefined) {
      channels = [new Float32Array(bufferSize), new Float32Array(bufferSize)];
    } else {
      channels = pool.map((c) => new Float32Array(c));
    }
    const err = GME.ccall(
      "gme_play",
      "number",
      ["number", "number", "number"],
      [emu, bufferSize * 2, buffer],
    );
    for (var i = 0; i < bufferSize; i++) {
      for (var n = 0; n < channels.length; n++) {
        channels[n][i] =
          GME.getValue(buffer + i * channels.length * 2 + n * 4, "i32") /
          INT32_MAX;
      }
    }
    return {
      channels: channels.map((c) => c.buffer as ArrayBuffer),
    };
  };
  let moreDataCallbackId = nextMoreDataCallbackId++;
  moreDataCallbacks.set(moreDataCallbackId, onMoreData);
  let { channels } = onMoreData();
  return ok({
    channels,
    moreDataCallbackId,
  });
}
