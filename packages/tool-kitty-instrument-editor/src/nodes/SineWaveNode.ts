import { Accessor, createMemo } from "solid-js";
import { sineWaveComponentType, SineWaveState } from "../components/SineWaveComponent";
import { Node, NodeParams, NodeType, Pin } from "tool-kitty-node-editor";
import { NodeExt, NodeTypeExt } from "../NodeExt";

export class SineWaveNodeType implements NodeType<NodeTypeExt,NodeExt,SineWaveState> {
  componentType = sineWaveComponentType;
  ext: NodeTypeExt = {};

  create(nodeParams: NodeParams<SineWaveState>) {
    return new SineWaveNode(nodeParams);
  }
}

export const sineWaveNodeType = new SineWaveNodeType();

class SineWaveNode implements Node<NodeTypeExt,NodeExt,SineWaveState> {
  type = sineWaveNodeType;
  nodeParams: NodeParams<SineWaveState>;
  inputPins: Accessor<{ name: string; source: Accessor<Pin | undefined>; setSource: (x: Pin | undefined) => void; }[]>;
  outputPins: Accessor<{ name: string; sinks: Accessor<Pin[]>; setSinks: (x: Pin[]) => void; }[]>;
  ext: NodeExt;

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
    this.ext = {
      generateCode: ({ ctx, inputAtoms }) => {
        let frequency = inputAtoms.get("frequency");
        if (frequency == undefined) {
          return [];
        }
        let amplitude = inputAtoms.get("amplitude") ?? "1.0";
        let centre = inputAtoms.get("centre") ?? "0.0";
        let outputAtoms = new Map<string,string>();
        let phase = ctx.allocField("0.0");
        let out = ctx.allocField("0.0");
        ctx.insertCode([
          `${phase} += (2 * Math.PI * ${frequency}) / sampleRate;`,
          `${out} = ${amplitude} * Math.sin(${phase}) + ${centre};`,
          `${phase} %= 2 * Math.PI;`,
        ]);
        outputAtoms.set("out", out);
        return [{ outputAtoms, }];
      }
    };
  }
}
