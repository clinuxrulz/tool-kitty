import { Accessor, createMemo, EcsComponentType } from "../../lib";
import { attackComponentType, AttackState } from "../components/AttackComponent";
import { Pin } from "../components/Pin";
import { Node, NodeParams, NodeType } from "../Node";

export class AttackNodeType implements NodeType<AttackState> {
  componentType = attackComponentType;

  create(nodeParams: NodeParams<AttackState>): Node<AttackState> {
    return new AttackNode(nodeParams);
  }  
}

export const attackNodeType = new AttackNodeType();

class AttackNode implements Node<AttackState> {
  nodeParams: NodeParams<AttackState>;
  inputPins: Accessor<{ name: string; source: Accessor<Pin | undefined>; setSource: (x: Pin | undefined) => void }[]>;
  outputPins: Accessor<{ name: string; sinks: Accessor<Pin[]>; setSinks: (x: Pin[]) => void, }[]>;

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
