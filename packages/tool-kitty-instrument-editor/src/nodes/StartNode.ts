import { Accessor, createMemo } from "solid-js";
import { startComponentType, StartState } from "../components/StartComponent";
import { Node, NodeParams, NodeType, Pin } from "tool-kitty-node-editor";
import { NodeExt, NodeTypeExt } from "../NodeExt";

export class StartNodeType implements NodeType<NodeTypeExt,NodeExt,StartState> {
  componentType = startComponentType;
  ext: NodeTypeExt = {};

  create(nodeParams: NodeParams<{ next: { target: string; pin: string; }[]; }>) {
      return new StartNode(nodeParams);
  }
}

export const startNodeType = new StartNodeType();

class StartNode implements Node<NodeTypeExt,NodeExt,StartState> {
  type = startNodeType;
  nodeParams: NodeParams<StartState>;
  outputPins: Accessor<{ name: string; sinks: Accessor<Pin[]>; setSinks: (x: Pin[]) => void; isEffectPin?: boolean, }[]>;
  ext: NodeExt;

  constructor(nodeParams: NodeParams<StartState>) {
    let state = nodeParams.state;
    let setState = nodeParams.setState;
    this.nodeParams = nodeParams;
    this.outputPins = createMemo(() => [
      {
        name: "next",
        sinks: () => state.next,
        setSinks: (x) => setState("next", x),
        isEffectPin: true,
      },
    ]);
    this.ext = {
      generateCode: ({ ctx, inputAtoms, codeGenNodeId, }) => {
        let effect = `this.n_${codeGenNodeId}_next`;
        ctx.addDeclToExistingForField(
          effect,
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
      },
    };
  }
}
