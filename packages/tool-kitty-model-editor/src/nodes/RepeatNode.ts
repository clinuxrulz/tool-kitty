import { Node, NodeParams, NodeType, Pin } from "tool-kitty-node-editor";
import { NodeExt, NodeTypeExt } from "../NodeExt";
import { Accessor, createMemo } from "solid-js";
import { PinValue } from "../CodeGenCtx";
import { repeatComponentType, RepeatState } from "../components/RepeatComponent";

export class RepeatNodeType implements NodeType<NodeTypeExt,NodeExt,RepeatState> {
  componentType = repeatComponentType;
  ext: NodeTypeExt = {};

  create(nodeParams: NodeParams<RepeatState>) {
    return new RepeatNode(nodeParams);
  }
}

export const repeatNodeType = new RepeatNodeType();

class RepeatNode implements Node<NodeTypeExt,NodeExt,RepeatState> {
  type = repeatNodeType;
  nodeParams: NodeParams<RepeatState>;
  inputPins: Accessor<{ name: string; source: Accessor<Pin | undefined>; setSource: (x: Pin | undefined) => void; isEffectPin?: boolean; }[]>;
  outputPins: Accessor<{ name: string; sinks: Accessor<Pin[]>; setSinks: (x: Pin[]) => void; isEffectPin?: boolean; }[]>;
  ext: NodeExt = {};

  constructor(nodeParams: NodeParams<RepeatState>) {
    let state = nodeParams.state;
    let setState = nodeParams.setState;
    this.nodeParams = nodeParams;
    this.inputPins = createMemo(() => [
      {
        name: "model",
        source: () => state.model,
        setSource: (x) => setState("model", x),
      },
      {
        name: "step",
        source: () => state.step,
        setSource: (x) => setState("step", x),
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
      let model_ = inputs.get("model");
      if (model_?.type != "Model") {
        return undefined;
      }
      let model = model_.value;
      let step_ = inputs.get("step");
      if (step_?.type != "Atom") {
        return undefined;
      }
      let step = step_.value;
      let sdfFn = ctx.allocVar();
      ctx.insertGlobalCode([
        `float ${sdfFn}(vec3 p) {`,
        `  vec3 s = ${step};`,
        "  vec3 id = vec3(floor(p.x/s.x + 0.5),floor(p.y/s.y + 0.5),floor(p.z/s.z + 0.5));",
        "  vec3  o = sign(p-s*id);",
        "  float d = 1e20;",
        "  for( int k=0; k<2; k++ )",
        "  for( int j=0; j<2; j++ )",
        "  for( int i=0; i<2; i++ )",
        "  {",
        "    vec3 rid = id + vec3(i,j,k)*o;",
        "    vec3 r = p - s*rid;",
        `    d = min( d, ${model.sdfFuncName}(r));`,
        "  }",
        "  return d;",
        "}",
      ]);
      let colourFn = ctx.allocVar();
      ctx.insertGlobalCode([
        `void ${colourFn}(vec3 p, out vec4 c) {`,
        `  vec3 s = ${step};`,
        "  vec3 id = vec3(floor(p.x/s.x + 0.5),floor(p.y/s.y + 0.5),floor(p.z/s.z + 0.5));",
        "  p = p-s*id;",
        `  ${model.colourFuncName}(p, c);`,
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
