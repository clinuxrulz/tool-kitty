import { Accessor, createMemo } from "solid-js";
import { gotoComponentType, GotoState } from "../components/GotoComponent";
import { Node, NodeParams, NodeType } from "../Node";
import { CodeGenCtx } from "../CodeGenCtx";
import { Pin } from "../components/Pin";

export class GotoNodeType implements NodeType<GotoState> {
  componentType = gotoComponentType;

  create(nodeParams: NodeParams<GotoState>) {
    return new GotoNode(nodeParams);
  }
}

export const gotoNodeType = new GotoNodeType();

class GotoNode implements Node<GotoState> {
  type = gotoNodeType;
  nodeParams: NodeParams<GotoState>;
  inputPins: Accessor<{ name: string; source: Accessor<Pin | undefined>; setSource: (x: Pin | undefined) => void; isEffectPin?: boolean; }[]>;
  outputPins: Accessor<{ name: string; sinks: Accessor<Pin[]>; setSinks: (x: Pin[]) => void; isEffectPin?: boolean; }[]>;
  generateCode: (params: { ctx: CodeGenCtx; inputAtoms: Map<string, string>; }) => { outputAtoms: Map<string, string>; }[];

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
    this.generateCode = ({ ctx, inputAtoms, }) => {
      let prev = inputAtoms.get("prev");
      if (prev == undefined) {
        return [];
      }
      let entry = inputAtoms.get("entry");
      if (entry == undefined) {
        return [];
      }
      let effect = ctx.allocField(
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
    };
  }
}
