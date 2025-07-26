import { Accessor, createMemo } from "../../lib";
import { Pin } from "../components/Pin";
import { sineWaveComponentType, SineWaveState } from "../components/SineWaveComponent";
import { Node, NodeParams, NodeType } from "../Node";

export class SineWaveNodeType implements NodeType<SineWaveState> {
  componentType = sineWaveComponentType;

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
  }
}
