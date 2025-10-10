import { Accessor, createMemo } from "solid-js";
import { noiseWaveComponentType, NoiseWaveState } from "../components/NoiseWaveComponent";
import { Node, NodeParams, NodeType, Pin } from "tool-kitty-node-editor";
import { NodeExt, NodeTypeExt } from "../NodeExt";

export class NoiseNodeType implements NodeType<NodeTypeExt,NodeExt,NoiseWaveState> {
  componentType = noiseWaveComponentType;
  ext: NodeTypeExt = {};

  create(nodeParams: NodeParams<NoiseWaveState>) {
    return new NoiseNode(nodeParams);
  }  
}

export const noiseNodeType = new NoiseNodeType();

class NoiseNode implements Node<NodeTypeExt,NodeExt,NoiseWaveState> {
  type = noiseNodeType;
  nodeParams: NodeParams<NoiseWaveState>;
  outputPins: Accessor<{ name: string; sinks: Accessor<Pin[]>; setSinks: (x: Pin[]) => void, }[]>;
  ext: NodeExt = {};

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
