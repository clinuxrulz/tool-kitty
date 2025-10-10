import { Accessor, createMemo } from "solid-js";
import { gotoComponentType, GotoState } from "../components/GotoComponent";
import { Node, NodeParams, NodeType, Pin } from "tool-kitty-node-editor";
import { NodeExt, NodeTypeExt } from "../NodeExt";

export class GotoNodeType implements NodeType<NodeTypeExt,NodeExt,GotoState> {
  componentType = gotoComponentType;
  ext: NodeTypeExt = {};

  create(nodeParams: NodeParams<GotoState>) {
    return new GotoNode(nodeParams);
  }
}

export const gotoNodeType = new GotoNodeType();

class GotoNode implements Node<NodeTypeExt,NodeExt,GotoState> {
  type = gotoNodeType;
  nodeParams: NodeParams<GotoState>;
  inputPins: Accessor<{ name: string; source: Accessor<Pin | undefined>; setSource: (x: Pin | undefined) => void; isEffectPin?: boolean; }[]>;
  outputPins: Accessor<{ name: string; sinks: Accessor<Pin[]>; setSinks: (x: Pin[]) => void; isEffectPin?: boolean; }[]>;
  ext: NodeExt;

  constructor(nodeParams: NodeParams<GotoState>) {
    let state = nodeParams.state;
    let setState = nodeParams.setState;
    this.nodeParams = nodeParams;
    //
    this.inputPins = createMemo(() => [
      {
        name: "prev",
        source: () => state.prev,
        setSource: (x) => setState("prev", x),
        isEffectPin: true,
      },
      {
        name: "entry",
        source: () => state.entry,
        setSource: (x) => setState("entry", x),
        isEffectPin: true,
      },
    ]);
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
        let prev = inputAtoms.get("prev");
        if (prev == undefined) {
          return [];
        }
        let entry = inputAtoms.get("entry");
        if (entry == undefined) {
          return [];
        }
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
          `${prev}.onDone.push(() => {`,
          `  this.insertRunningEffect(${effect});`,
          "});",
          `${entry}.onDone.push(() => {`,
          `  this.insertRunningEffect(${effect});`,
          "});",
          `${effect}.update = () => true;`,
        ]);
        let next = `${effect}`;
        let outputAtoms = new Map<string,string>();
        outputAtoms.set("next", next);
        return [{ outputAtoms, }];
      },
    };
  }
}
