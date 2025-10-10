import { Accessor, createMemo } from "solid-js";
import { attackComponentType, AttackState } from "../components/AttackComponent";
import { Node, NodeParams, NodeType, Pin } from "tool-kitty-node-editor";
import { NodeExt, NodeTypeExt } from "../NodeExt";

export class AttackNodeType implements NodeType<NodeTypeExt,NodeExt,AttackState> {
  componentType = attackComponentType;
  ext: NodeTypeExt = {};

  create(nodeParams: NodeParams<AttackState>): Node<NodeTypeExt,NodeExt,AttackState> {
    return new AttackNode(nodeParams);
  }  
}

export const attackNodeType = new AttackNodeType();

class AttackNode implements Node<NodeTypeExt,NodeExt,AttackState> {
  type = attackNodeType;
  nodeParams: NodeParams<AttackState>;
  inputPins: Accessor<{ name: string; source: Accessor<Pin | undefined>; setSource: (x: Pin | undefined) => void }[]>;
  outputPins: Accessor<{ name: string; sinks: Accessor<Pin[]>; setSinks: (x: Pin[]) => void, }[]>;
  ext: NodeExt = {};

  constructor(nodeParams: NodeParams<AttackState>) {
    let state = nodeParams.state;
    let setState = nodeParams.setState;
    this.nodeParams = nodeParams;
    this.inputPins = createMemo(() => [
      {
        name: "timeToOne",
        source: () => state.timeToOne,
        setSource: (x) => setState("timeToOne", x),
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
