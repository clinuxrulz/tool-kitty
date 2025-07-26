import { Accessor, createMemo } from "../../lib";
import { Pin } from "../components/Pin";
import { releaseComponentType, ReleaseState } from "../components/ReleaseComponentType";
import { Node, NodeParams, NodeType } from "../Node";

export class ReleaseNodeType implements NodeType<ReleaseState> {
  componentType = releaseComponentType;

  create(nodeParams: NodeParams<ReleaseState>): Node<ReleaseState> {
    return new ReleaseNode(nodeParams);
  }  
}

export const releaseNodeType = new ReleaseNodeType();

class ReleaseNode implements Node<ReleaseState> {
  nodeParams: NodeParams<ReleaseState>;
  inputPins: Accessor<{ name: string; source: Accessor<Pin | undefined>; setSource: (x: Pin | undefined) => void }[]>;
  outputPins: Accessor<{ name: string; sinks: Accessor<Pin[]>; setSinks: (x: Pin[]) => void, }[]>;

  constructor(nodeParams: NodeParams<ReleaseState>) {
    let state = nodeParams.state;
    let setState = nodeParams.setState;
    this.nodeParams = nodeParams;
    this.inputPins = createMemo(() => [
      {
        name: "timeToZero",
        source: () => state.timeToZero,
        setSource: (x) => setState("timeToZero", x),
      }
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
