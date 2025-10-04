let meowOriginalPitch: number | undefined = undefined;
let meowSampleRate: number | undefined = undefined;
let meowData: Float32Array | undefined = undefined;
let meowStepPerHz: number | undefined = undefined;

const middle_c_hz = 261.625565;

type Meow = {
  activeId: number,
  active: boolean,
  at: number,
  step: number,
  prev: Meow,
  next: Meow | undefined,
};

export type NoteEvent = {
  id: number,
  time: number,
  note: number,
  type: "On" | "Off",
};

declare const currentTime: number;

class MusicAudioWorkletProcessor extends AudioWorkletProcessor {
  meow: Meow[] = [];
  activeMeowsHead: Meow | undefined = undefined;
  activeMeowsTail: Meow | undefined = undefined;
  noteEvents: NoteEvent[] | undefined = undefined;
  atNoteEventIdx: number | undefined = undefined;
  t0: number | undefined = undefined;

  constructor() {
    super();
    this.port.onmessage = (e: MessageEvent) => {
      let data = e.data;
      if (data.type == "meowData") {
        let params = data.params;
        meowOriginalPitch = params.meowOriginalPitch;
        meowSampleRate = params.meowSampleRate as number;
        meowData = params.meowData;
        meowStepPerHz = meowSampleRate / (sampleRate * middle_c_hz);
        this.meow = Array(128).fill(undefined).map((_, idx) => {
          let n: Meow = {
            activeId: 0,
            active: false,
            at: 0.0,
            step: middle_c_hz * Math.pow(2.0, (idx-60)/12.0) * meowStepPerHz!,
            prev: undefined!,
            next: undefined,
          };
          n.prev = n;
          return n;
        });
      } else if (data.type == "musicData") {
        let params = data.params;
        this.noteEvents = params.noteEvents;
        this.t0 = currentTime;
      }
    };
  }

  process(inputs: Float32Array[][], outputs: Float32Array[][]): boolean {
    if (this.t0 == undefined || this.noteEvents == undefined || meowData == undefined) {
      return true;
    }
    if (this.atNoteEventIdx == undefined) {
      this.atNoteEventIdx = 0;
    }
    if (this.atNoteEventIdx >= this.noteEvents.length) {
      return false;
    }
    let t = currentTime - this.t0;
    while (this.atNoteEventIdx < this.noteEvents.length) {
      let e = this.noteEvents[this.atNoteEventIdx];
      if (t >= e.time) {
        let meow = this.meow[e.note];
        if (meow != undefined) {
          if (e.type == "On") {
            if (!meow.active) {
              if (this.activeMeowsHead == undefined) {
                this.activeMeowsHead = this.activeMeowsTail = meow;
              } else {
                let tail = this.activeMeowsTail!;
                tail.next = meow;
                meow.prev = tail;
                this.activeMeowsTail = tail;
              }
              meow.active = true;
            }
            meow.activeId = e.id;
            meow.at = 0.0;
          } else if (e.type == "Off" && e.id == meow.activeId) {
            meow.activeId = -1;
            if (meow.active) {
              meow.prev.next = meow.next;
              if (meow.next != undefined) {
                meow.next.prev = meow.prev;
              }
              if (this.activeMeowsHead == meow) {
                this.activeMeowsHead = meow.next;
              }
              if (this.activeMeowsTail == meow) {
                this.activeMeowsTail = meow.prev;
              }
              meow.prev = meow;
              meow.next = undefined;
              meow.active = false;
            }
          }
        }
        this.atNoteEventIdx++;
      } else {
        break;
      }
    }
    let output = outputs[0][0];
    for (let i = 0; i < output.length; ++i) {
      let out = 0.0;
      let meow = this.activeMeowsHead;
      while (meow != undefined) {
        let idx = Math.floor(meow.at);
        if (idx < meowData.length) {
          out += meowData[idx];
          meow.at += meow.step;
        }
        meow = meow.next;
      }
      output[i] = out;
    }
    return true;
  }
}


registerProcessor("music-audio-worklet-processor", MusicAudioWorkletProcessor);

