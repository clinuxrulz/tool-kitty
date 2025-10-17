import { Node, NodeParams, NodeType, Pin } from "tool-kitty-node-editor";
import { NodeExt, NodeTypeExt } from "../NodeExt";
import { Accessor, createMemo } from "solid-js";
import { PinValue } from "../CodeGenCtx";
import { repeatRotationalComponentType, RepeatRotationalState } from "../components/RepeatRotationalComponent";

export class RepeatRotationalNodeType implements NodeType<NodeTypeExt,NodeExt,RepeatRotationalState> {
  componentType = repeatRotationalComponentType;
  ext: NodeTypeExt = {};

  create(nodeParams: NodeParams<RepeatRotationalState>) {
    return new RepeatRotationalNode(nodeParams);
  }
}

export const repeatRotationalNodeType = new RepeatRotationalNodeType();

class RepeatRotationalNode implements Node<NodeTypeExt,NodeExt,RepeatRotationalState> {
  type = repeatRotationalNodeType;
  nodeParams: NodeParams<RepeatRotationalState>;
  inputPins: Accessor<{ name: string; source: Accessor<Pin | undefined>; setSource: (x: Pin | undefined) => void; isEffectPin?: boolean; }[]>;
  outputPins: Accessor<{ name: string; sinks: Accessor<Pin[]>; setSinks: (x: Pin[]) => void; isEffectPin?: boolean; }[]>;
  ext: NodeExt = {};

  constructor(nodeParams: NodeParams<RepeatRotationalState>) {
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
        name: "count",
        source: () => state.count,
        setSource: (x) => setState("count", x),
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
      let count_ = inputs.get("count");
      if (count_?.type != "Atom") {
        return undefined;
      }
      let count = count_.value;
      let sdfFn = ctx.allocVar();
      ctx.insertGlobalCode([
        `float ${sdfFn}(vec3 p) {`,
        `  float sp = 6.283185/float(${count});
          float an = atan(p.y,p.x);
          float id = floor(an/sp);

          float a1 = sp*(id+0.0);
          float a2 = sp*(id+1.0);
          vec2 r1 = mat2(cos(a1),-sin(a1),sin(a1),cos(a1))*p.xy;
          vec2 r2 = mat2(cos(a2),-sin(a2),sin(a2),cos(a2))*p.xy;

          return min(${model.sdfFuncName}(vec3(r1.x, r1.y, p.z)), ${model.sdfFuncName}(vec3(r2.x,r2.y,p.z)));
        `,
        "}",
      ]);
      return new Map<string,PinValue>([
        [
          "out",
          {
            type: "Model",
            value: {
              sdfFuncName: sdfFn,
              colourFuncName: "defaultColour",
            },
          },
        ],
      ]);
    };
  }
}
