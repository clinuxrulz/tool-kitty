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
    this.generateCode = ({ ctx, inputAtoms, }) => {
      let prev = inputAtoms.get("prev");
      if (prev == undefined) {
        return [];
      }
      let delay = inputAtoms.get("delay");
      if (delay == undefined) {
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
      let startTime = ctx.allocField("0.0");
      ctx.insertConstructorCode([
        `${prev}.onDone.push(() => {`,
        `  ${startTime} = currentTime * 1000.0;`,
        `  this.insertRunningEffect(${effect});`,
        "});",
        `${effect}.update = () => {`,
        `  let time = currentTime * 1000.0 - ${startTime};`,
        "  // return true when done.",
        `  return time >= ${delay};`,
        `};`,
      ]);
      let next = `${effect}`;
      let outputAtoms = new Map<string,string>();
      outputAtoms.set("next", next);
      return [{ outputAtoms, }];
    };
  }
}
