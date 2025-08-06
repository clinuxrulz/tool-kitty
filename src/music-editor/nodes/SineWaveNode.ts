import { Accessor, createMemo } from "../../lib";
import { CodeGenCtx } from "../CodeGenCtx";
import { Pin } from "../components/Pin";
import { sineWaveComponentType, SineWaveState } from "../components/SineWaveComponent";
import { Node, NodeParams, NodeType } from "../Node";
import sineWaveAudioWorkletProcessorUrl from  "./worklets/sine-wave-audio-worklet-processor.ts?worker&url";

export class SineWaveNodeType implements NodeType<SineWaveState> {
  componentType = sineWaveComponentType;
  registerAudioWorkletModules = (audioCtx: AudioContext) => {
    audioCtx.audioWorklet.addModule(sineWaveAudioWorkletProcessorUrl);
  };

  create(nodeParams: NodeParams<SineWaveState>) {
    return new SineWaveNode(nodeParams);
  }
}

export const sineWaveNodeType = new SineWaveNodeType();

class SineWaveNode implements Node<SineWaveState> {
  type = sineWaveNodeType;
  nodeParams: NodeParams<SineWaveState>;
  inputPins: Accessor<{ name: string; source: Accessor<Pin | undefined>; setSource: (x: Pin | undefined) => void; }[]>;
  outputPins: Accessor<{ name: string; sinks: Accessor<Pin[]>; setSinks: (x: Pin[]) => void; }[]>;
  generateCode: (params: { ctx: CodeGenCtx; inputAtoms: Map<string, string>; }) => { outputAtoms: Map<string, string>; }[];

  constructor(nodeParams: NodeParams<SineWaveState>) {
    let state = nodeParams.state;
    let setState = nodeParams.setState;
    this.nodeParams = nodeParams;
    this.inputPins = createMemo(() => [
      {
        name: "frequency",
        source: () => state.frequency,
        setSource: (x) => setState("frequency", x),
      },
      {
        name: "amplitude",
        source: () => state.amplitude,
        setSource: (x) => setState("amplitude", x),
      },
      {
        name: "centre",
        source: () => state.centre,
        setSource: (x) => setState("centre", x),
      },
    ]);
    this.outputPins = createMemo(() => [
      {
        name: "out",
        sinks: () => state.out,
        setSinks: (x) => setState("out", x),
      }
    ]);
    this.generateCode = ({ ctx, inputAtoms }) => {
      let frequency = inputAtoms.get("frequency");
      if (frequency == undefined) {
        return [];
      }
      let amplitude = inputAtoms.get("amplitute") ?? "1.0";
      let centre = inputAtoms.get("centre") ?? "0.0";
      let outputAtoms = new Map<string,string>();
      let phase = ctx.allocField("0.0");
      let out = ctx.allocField("0.0");
      ctx.insertCode([
        `this.${phase} += (2 * Math.PI * ${frequency}) / sampleRate;`,
        `this.${out} = this.${amplitude} * Math.sin(this.${phase}) + this.${centre};`
      ]);
      outputAtoms.set("out", out);
      return [{ outputAtoms, }];
    };
  }
}
