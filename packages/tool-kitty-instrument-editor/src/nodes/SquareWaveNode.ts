import { Accessor, createMemo } from "solid-js";
import { squareWaveComponentType, SquareWaveState } from "../components/SquareWaveComponent";
import { Node, NodeParams, NodeType, Pin } from "tool-kitty-node-editor";
import { NodeExt, NodeTypeExt } from "../NodeExt";

export class SquareWaveNodeType implements NodeType<NodeTypeExt,NodeExt,SquareWaveState> {
  componentType = squareWaveComponentType;
  ext: NodeTypeExt = {};

  create(nodeParams: NodeParams<SquareWaveState>) {
    return new SquareWaveNode(nodeParams);
  }
}

export const squareWaveNodeType = new SquareWaveNodeType();

class SquareWaveNode implements Node<NodeTypeExt,NodeExt,SquareWaveState> {
  type = squareWaveNodeType;
  nodeParams: NodeParams<SquareWaveState>;
  inputPins: Accessor<{ name: string; source: Accessor<Pin | undefined>; setSource: (x: Pin | undefined) => void; }[]>;
  outputPins: Accessor<{ name: string; sinks: Accessor<Pin[]>; setSinks: (x: Pin[]) => void; }[]>;
  ext: NodeExt;

  constructor(nodeParams: NodeParams<SquareWaveState>) {
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
          `${out} = ${amplitude} * (${phase} < Math.PI ? -1 : 1) + ${centre};`,
          `${phase} %= 2 * Math.PI;`,
        ]);
        outputAtoms.set("out", out);
        return [{ outputAtoms, }];
      },
    };
  }
}
