import { Accessor, createMemo, EcsComponentType } from "../../lib";
import { delayComponentType, DelayState } from "../components/DelayComponent";
import { Pin } from "../components/Pin";
import { Node, NodeParams, NodeType } from "../Node";
import { CodeGenCtx } from "../CodeGenCtx";

export class DelayNodeType implements NodeType<DelayState> {
  componentType = delayComponentType;

  create(nodeParams: NodeParams<DelayState>) {
      return new DelayNode(nodeParams);
  }
}

export const delayNodeType = new DelayNodeType();

class DelayNode implements Node<DelayState> {
  type = delayNodeType;
  nodeParams: NodeParams<DelayState>;
  inputPins: Accessor<{ name: string; source: Accessor<Pin | undefined>; setSource: (x: Pin | undefined) => void; }[]>;
  outputPins: Accessor<{ name: string; sinks: Accessor<Pin[]>; setSinks: (x: Pin[]) => void; }[]>;
  generateCode: (params: { ctx: CodeGenCtx; inputAtoms: Map<string, string>; }) => { outputAtoms: Map<string, string>; }[];

  constructor(nodeParams: NodeParams<DelayState>) {
    let state = nodeParams.state;
    let setState = nodeParams.setState;
    this.nodeParams = nodeParams;
    this.inputPins = createMemo(() => [
      {
        name: "prev",
        source: () => state.prev,
        setSource: (x) => setState("prev", x),
      },
      {
        name: "delay",
        source: () => state.delay,
        setSource: (x) => setState("delay", x),
      },
    ]);
    this.outputPins = createMemo(() => [
      {
        name: "next",
        sinks: () => state.next,
        setSinks: (x) => setState("next", x),
      },
    ]);
    this.generateCode = ({ ctx, inputAtoms }) => {
      let prev = inputAtoms.get("prev");
      if (prev == undefined) {
        return [];
      }
      let delay = inputAtoms.get("delay");
      if (delay == undefined) {
        return [];
      }
      let next = ctx.allocField("false");
      let startTime = ctx.allocField("0");
      let running = ctx.allocField("false");
      ctx.insertCode([
        `if (${prev}) {`,
        `  ${running} = true;`,
        `  ${startTime} = performance.now();`,
        "}",
        `if (${running}) {`,
        `  let time = performance.now() - ${startTime};`,
        `  if (time >= ${delay}) {`,
        `    ${running} = false;`,
        `    ${next} = true;`,
        "  }",
        "}",
      ]);
      ctx.insertPostCode([
        `${next} = false;`,
      ]);
      let outputAtoms = new Map<string,string>();
      outputAtoms.set("next", next);
      return [{ outputAtoms, }];
    };
  }
}
