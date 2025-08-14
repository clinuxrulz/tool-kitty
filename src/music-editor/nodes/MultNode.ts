import { Accessor, createMemo } from "solid-js";
import { Pin } from "../components/Pin";
import { Node, NodeParams, NodeType } from "../Node";
import { multComponentType, MultState } from "../components/MultComponentType";
import { CodeGenCtx } from "../CodeGenCtx";

export class MultNodeType implements NodeType<MultState> {
  componentType = multComponentType;

  create(nodeParams: NodeParams<MultState>) {
    return new MultNode(nodeParams);
  }
}

export const multNodeType = new MultNodeType();

class MultNode implements Node<MultState> {
  type = multNodeType;
  nodeParams: NodeParams<MultState>;
  inputPins: Accessor<{ name: string; source: Accessor<Pin | undefined>; setSource: (x: Pin | undefined) => void; }[]>;
  outputPins: Accessor<{ name: string; sinks: Accessor<Pin[]>; setSinks: (x: Pin[]) => void; }[]>;
  generateCode: (params: { ctx: CodeGenCtx; inputAtoms: Map<string, string>; }) => { outputAtoms: Map<string, string>; }[];

  constructor(nodeParams: NodeParams<MultState>) {
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
        `${out} = ${a} * ${b}`,
      ]);
      let outputAtoms = new Map<string,string>();
      outputAtoms.set("out", out);
      return [{
        outputAtoms,
      }];
    };
  }
}
