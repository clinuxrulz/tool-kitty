import { Accessor, Component, createMemo } from "solid-js";
import { SoundFont2, Preset, Instrument, Sample } from 'soundfont2';
import { meowComponentType, MeowState } from "../components/MeowComponent";
import { Pin } from "../components/Pin";
import { Node, NodeParams, NodeType } from "../Node";
import { CodeGenCtx } from "../CodeGenCtx";

export class MeowNodeType implements NodeType<MeowState> {
  componentType = meowComponentType;
  initAudioCtx: (audioCtx: AudioContext, workletNode: AudioWorkletNode) => Promise<void>;
  generateInitOnceCode: (params: { ctx: CodeGenCtx; }) => void;

  constructor() {
    this.initAudioCtx = async (audioCtx, workletNode) => {
      const presetIndex = 0;
      const sf2Data = await fetch("./Thurston Waffles.sf2").then((x) => x.arrayBuffer());
      const soundfont = new SoundFont2(new Uint8Array(sf2Data));
      const preset: Preset = soundfont.presets[presetIndex];
      if (!preset) {
          throw new Error(`Preset at index ${presetIndex} not found.`);
      }
      const instrument: Instrument = soundfont.instruments[preset.header.bagIndex];
      if (!instrument) {
          throw new Error(`No instrument found for preset at index ${presetIndex}`);
      }
      const findSampleForNote = (instr: Instrument, note: number): Sample | null => {
        for (const zone of instr.zones) {
          if (zone.keyRange == undefined) {
            continue;
          }
            // Check if the note is within the zone's key range.
            if (note >= zone.keyRange.lo && note <= zone.keyRange.hi) {
                return zone.sample;
            }
        }
        return null;
      };
      let noteNumber = 60;
      const sample: Sample | null = findSampleForNote(instrument, noteNumber);
      if (!sample) {
          throw new Error(`No sample found for note ${noteNumber} in preset ${presetIndex}.`);
      }
      const sampleRate: number = sample.header.sampleRate;
      const totalSamples: number = sample.data.length;
      const channelData: Float32Array = new Float32Array(totalSamples);
      for (let i = 0; i < totalSamples; i++) {
          channelData[i] = sample.data[i] / 32768.0;
      }
      const samplePitch: number = sample.header.originalPitch;
      workletNode.port.postMessage({
        type: "meowData",
        params: {
          meowOriginalPitch: samplePitch,
          meowSampleRate: sampleRate,
          meowData: channelData,
        },
      });
    };
    this.generateInitOnceCode = ({ ctx, }) => {
      ctx.insertGlobalCode([
        "let meowOriginalPitch = undefined;",
        "let meowSampleRate = undefined;",
        "let meowData = undefined;",
        "let meowStepPerHz = undefined;",
      ]);
      const middle_c_hz = 261.625565;
      ctx.insertMessageHandlerCode(
        "meowData",
        [
          "meowOriginalPitch = params.meowOriginalPitch;",
          "meowSampleRate = params.meowSampleRate;",
          "meowData = params.meowData;",
          `meowStepPerHz = meowSampleRate / (sampleRate * ${middle_c_hz});`,
        ]
      );
    };
  }

  create(nodeParams: NodeParams<MeowState>) {
    return new MeowNode(nodeParams);
  }
}

export const meowNodeType = new MeowNodeType();

class MeowNode implements Node<MeowState> {
  type = meowNodeType;
  nodeParams: NodeParams<MeowState>;
  inputPins: Accessor<{ name: string; source: Accessor<Pin | undefined>; setSource: (x: Pin | undefined) => void; }[]>;
  outputPins: Accessor<{ name: string; sinks: Accessor<Pin[]>; setSinks: (x: Pin[]) => void; }[]>;
  ui: Accessor<Component>;
  generateCode: (params: { ctx: CodeGenCtx; inputAtoms: Map<string, string>; }) => { outputAtoms: Map<string, string>; }[];

  constructor(nodeParams: NodeParams<MeowState>) {
    let state = nodeParams.state;
    let setState = nodeParams.setState;
    this.nodeParams = nodeParams;
    this.inputPins = createMemo(() => [
      {
        name: "frequency",
        source: () => state.frequency,
        setSource: (x) => setState("frequency", x),
      }
    ]);
    this.outputPins = createMemo(() => [
      {
        name: "out",
        sinks: () => state.out,
        setSinks: (x) => setState("out", x),
      }
    ]);
    this.ui = createMemo(() => () => (
      <img
        width="120px"
        height="120px"
        src="./cat-node.jpg"
      />
    ));
    this.generateCode = ({ ctx, inputAtoms }) => {
      let frequency = inputAtoms.get("frequency");
      if (frequency == undefined) {
        return [];
      }
      let lastFreq = ctx.allocField("0.0");
      let out = ctx.allocField("0.0");
      let outputAtoms = new Map<string,string>();
      let at = ctx.allocField("0.0");
      let idx = ctx.allocField("0");
      const middle_c_hz = 261.625565;
      ctx.insertCode([
        `if (meowData == undefined || ${frequency} != ${lastFreq}) {`,
        `  ${out} = 0.0;`,
        `  ${at} = 0.0;`,
        `  ${lastFreq} = ${frequency};`,
        "} else {",
        `  if (${at} >= meowData.length) {`,
        `    ${out} = 0.0;`,
        "  } else {",
        `    ${idx} = Math.floor(${at});`,
        `    let value = meowData[${idx}];`,
        `    ${out} = value;`,
        `    let step = ${frequency} * meowStepPerHz;`,
        `    ${at} += step;`,
        "  }",
        "}",
      ]);
      outputAtoms.set("out", out);
      return [{ outputAtoms, }];
    };
  }
}
