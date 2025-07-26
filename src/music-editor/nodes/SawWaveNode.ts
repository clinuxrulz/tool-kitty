import { Accessor, createMemo, EcsComponentType } from "../../lib";
import { Pin } from "../components/Pin";
import { sawWaveComponentType, SawWaveState } from "../components/SawWaveComponent";
import { Node, NodeParams, NodeType } from "../Node";

export class SawWaveNodeType implements NodeType<SawWaveState> {
  componentType = sawWaveComponentType;

  create(nodeParams: NodeParams<SawWaveState>) {
    return new SawWaveNode(nodeParams);
  }
}

export const sawWaveNodeType = new SawWaveNodeType();

class SawWaveNode implements Node<SawWaveState> {
  type = sawWaveNodeType;
  nodeParams: NodeParams<SawWaveState>;
  inputPins: Accessor<{ name: string; source: Accessor<Pin | undefined>; setSource: (x: Pin | undefined) => void; }[]>;
  outputPins: Accessor<{ name: string; sinks: Accessor<Pin[]>; setSinks: (x: Pin[]) => void; }[]>;

  constructor(nodeParams: NodeParams<SawWaveState>) {
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
