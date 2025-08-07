import { Accessor, createMemo } from "solid-js";
import { addComponentType, AddState } from "../components/AddComponent";
import { Pin } from "../components/Pin";
import { Node, NodeParams, NodeType } from "../Node";
import { CodeGenCtx } from "../CodeGenCtx";

export class AddNodeType implements NodeType<AddState> {
  componentType = addComponentType;

  create(nodeParams: NodeParams<AddState>) {
    return new AddNode(nodeParams);
  }
}

export const addNodeType = new AddNodeType();

class AddNode implements Node<AddState> {
  type = addNodeType;
  nodeParams: NodeParams<AddState>;
  inputPins: Accessor<{ name: string; source: Accessor<Pin | undefined>; setSource: (x: Pin | undefined) => void; }[]>;
  outputPins: Accessor<{ name: string; sinks: Accessor<Pin[]>; setSinks: (x: Pin[]) => void; }[]>;
  generateCode: (params: { ctx: CodeGenCtx; inputAtoms: Map<string, string>; }) => { outputAtoms: Map<string, string>; }[];

  constructor(nodeParams: NodeParams<AddState>) {
    let state = nodeParams.state;
    let setState = nodeParams.setState;
    this.nodeParams = nodeParams;
    this.inputPins = createMemo(() => [
      {
        name: "a",
        source: () => state.a,
        setSource: (x) => setState("a", x),
      },
      {
        name: "b",
        source: () => state.b,
        setSource: (x) => setState("b", x),
      },
    ]);
    this.outputPins = createMemo(() => [
      {
        name: "out",
        sinks: () => state.out,
        setSinks: (x) => setState("out", x),
      },
    ]);
    this.generateCode = ({ ctx, inputAtoms, }) => {
      let a = inputAtoms.get("a");
      if (a == undefined) {
        return [];
      }
      let b = inputAtoms.get("b");
      if (b == undefined) {
        return [];
      }
      let out = ctx.allocField("0.0");
      ctx.insertCode([
        `${out} = ${a} + ${b}`,
      ]);
      let outputAtoms = new Map<string,string>();
      outputAtoms.set("out", out);
      return [{
        outputAtoms,
      }];
    };
  }
}
