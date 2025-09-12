import { Accessor, createMemo } from "solid-js";
import { CodeGenCtx } from "../CodeGenCtx";
import { Pin } from "../components/Pin";
import { startComponentType, StartState } from "../components/StartComponent";
import { Node, NodeParams, NodeType } from "../Node";

export class StartNodeType implements NodeType<StartState> {
  componentType = startComponentType;

  create(nodeParams: NodeParams<{ next: { target: string; pin: string; }[]; }>): Node<{ next: { target: string; pin: string; }[]; }> {
      return new StartNode(nodeParams);
  }
}

export const startNodeType = new StartNodeType();

class StartNode implements Node<StartState> {
  type = startNodeType;
  nodeParams: NodeParams<StartState>;
  outputPins: Accessor<{ name: string; sinks: Accessor<Pin[]>; setSinks: (x: Pin[]) => void; }[]>;
  generateCode: (params: { ctx: CodeGenCtx; inputAtoms: Map<string, string>; }) => { outputAtoms: Map<string, string>; }[];

  constructor(nodeParams: NodeParams<StartState>) {
    let state = nodeParams.state;
    let setState = nodeParams.setState;
    this.nodeParams = nodeParams;
    this.outputPins = createMemo(() => [
      {
        name: "next",
        sinks: () => state.next,
        setSinks: (x) => setState("next", x),
      },
    ]);
    this.generateCode = ({ ctx, inputAtoms, }) => {
      let effect = ctx.allocField(
        "{\r\n" +
        "    prev: null,\r\n" +
        "    next: null,\r\n" +
        "    update: null, /* () => boolean */\r\n" +
        "    onDone: [], /* (() => void)[] */\r\n" +
        "  }"
      );
      ctx.insertConstructorCode([
        `${effect}.update = () => true;`,
        `this.insertRunningEffect(${effect});`,
      ]);
      let next = `${effect}`;
      let outputAtoms = new Map<string,string>();
      outputAtoms.set("next", next);
      return [{ outputAtoms, }];
    };
  }
}
