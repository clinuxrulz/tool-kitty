import { Accessor, createMemo } from "../../lib";
import { noiseWaveComponentType, NoiseWaveState } from "../components/NoiseWaveComponent";
import { Pin } from "../components/Pin";
import { Node, NodeParams, NodeType } from "../Node";

export class NoiseNodeType implements NodeType<NoiseWaveState> {
  componentType = noiseWaveComponentType;

  create(nodeParams: NodeParams<NoiseWaveState>): Node<NoiseWaveState> {
    return new NoiseNode(nodeParams);
  }  
}

export const noiseNodeType = new NoiseNodeType();

class NoiseNode implements Node<NoiseWaveState> {
  type = noiseNodeType;
  nodeParams: NodeParams<NoiseWaveState>;
  outputPins: Accessor<{ name: string; sinks: Accessor<Pin[]>; setSinks: (x: Pin[]) => void, }[]>;

  constructor(nodeParams: NodeParams<NoiseWaveState>) {
    let state = nodeParams.state;
    let setState = nodeParams.setState;
    this.nodeParams = nodeParams;
    this.outputPins = createMemo(() => [
      {
        name: "out",
        sinks: () => state.out,
        setSinks: (x) => setState("out", x),
      }
    ]);
  }
}
