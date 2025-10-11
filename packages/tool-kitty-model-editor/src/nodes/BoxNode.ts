import { Node, NodeParams, NodeType, Pin } from "tool-kitty-node-editor";
import { boxComponentType, BoxState } from "../components/BoxComponent";
import { NodeExt, NodeTypeExt } from "../NodeExt";
import { Accessor, createMemo } from "solid-js";
import { PinValue } from "../CodeGenCtx";

export class BoxNodeType implements NodeType<NodeTypeExt,NodeExt,BoxState> {
  componentType = boxComponentType;
  ext: NodeTypeExt = {};

  create(nodeParams: NodeParams<BoxState>) {
    return new BoxNode(nodeParams);
  }
}

export const boxNodeType = new BoxNodeType();

class BoxNode implements Node<NodeTypeExt,NodeExt,BoxState> {
  type = boxNodeType;
  nodeParams: NodeParams<BoxState>;
  inputPins: Accessor<{ name: string; source: Accessor<Pin | undefined>; setSource: (x: Pin | undefined) => void; isEffectPin?: boolean; }[]>;
  outputPins: Accessor<{ name: string; sinks: Accessor<Pin[]>; setSinks: (x: Pin[]) => void; isEffectPin?: boolean; }[]>;
  ext: NodeExt = {};

  constructor(nodeParams: NodeParams<BoxState>) {
    let state = nodeParams.state;
    let setState = nodeParams.setState;
    this.nodeParams = nodeParams;
    this.inputPins = createMemo(() => [
      {
        name: "size",
        source: () => state.size,
        setSource: (x) => setState("size", x),
      },
    ]);
    this.outputPins = createMemo(() => [
      {
        name: "out",
        sinks: () => state.out,
        setSinks: (x) => setState("out", x),
      },
    ]);
    this.ext.generateCode = ({ ctx, inputs, }) => {
      let size_ = inputs.get("size");
      if (size_?.type != "Atom") {
        return undefined;
      }
      let size = size_.value;
      let sdfFn = ctx.allocVar();
      ctx.insertGlobalCode([
        `float ${sdfFn}(vec3 p) {`,
        `  vec3 q = abs(p) - 0.5 * ${size};`,
        `  return length(max(q,0.0)) + min(max(q.x,max(q.y,q.z)),0.0);`,
        "}",
      ]);
      let colourFn = ctx.allocVar();
      ctx.insertGlobalCode([
        `void ${colourFn}(vec3 p, out vec4 c) {`,
        `  c = vec4(0.7, 0.7, 0.7, 1.0);`,
        "}",
      ]);
      return new Map<string,PinValue>([
        [
          "out",
          {
            type: "Model",
            value: {
              sdfFuncName: sdfFn,
              colourFuncName: colourFn,
            },
          },
        ],
      ]);
    };
  }
}
