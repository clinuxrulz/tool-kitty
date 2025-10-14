import { Node, NodeParams, NodeType, Pin } from "tool-kitty-node-editor";
import { NodeExt, NodeTypeExt } from "../NodeExt";
import { Accessor, createMemo } from "solid-js";
import { PinValue } from "../CodeGenCtx";
import { rotateComponentType, RotateState } from "../components/RotateComponent";

export class RotateNodeType implements NodeType<NodeTypeExt,NodeExt,RotateState> {
  componentType = rotateComponentType;
  ext: NodeTypeExt = {};

  create(nodeParams: NodeParams<RotateState>) {
    return new RotateNode(nodeParams);
  }
}

export const rotateNodeType = new RotateNodeType();

class RotateNode implements Node<NodeTypeExt,NodeExt,RotateState> {
  type = rotateNodeType;
  nodeParams: NodeParams<RotateState>;
  inputPins: Accessor<{ name: string; source: Accessor<Pin | undefined>; setSource: (x: Pin | undefined) => void; isEffectPin?: boolean; }[]>;
  outputPins: Accessor<{ name: string; sinks: Accessor<Pin[]>; setSinks: (x: Pin[]) => void; isEffectPin?: boolean; }[]>;
  ext: NodeExt = {};

  constructor(nodeParams: NodeParams<RotateState>) {
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
        name: "axis",
        source: () => state.axis,
        setSource: (x) => setState("axis", x),
      },
      {
        name: "angle",
        source: () => state.angle,
        setSource: (x) => setState("angle", x),
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
      let axis_ = inputs.get("axis");
      if (axis_?.type != "Atom") {
        return undefined;
      }
      let axis = axis_.value;
      let angle_ = inputs.get("angle");
      if (angle_?.type != "Atom") {
        return undefined;
      }
      let angle = angle_.value;
      let sdfFn = ctx.allocVar();
      ctx.insertGlobalCode([
        `float ${sdfFn}(vec3 p) {`,
        `  float a = 0.5 * ${angle} * ${Math.PI / 180.0};`,
        `  vec3 tmp = sin(a) * normalize(${axis});`,
        `  vec4 q = vec4(tmp.x, tmp.y, tmp.z, cos(a));`,
        "  p = p + 2.0 * cross(-q.xyz, cross(-q.xyz, p) + q.w * p);",
        `  return ${model.sdfFuncName}(p);`,
        "}",
      ]);
      let colourFn = ctx.allocVar();
      ctx.insertGlobalCode([
        `void ${colourFn}(vec3 p, out vec4 c) {`,
        `  float a = 0.5 * ${angle} * ${Math.PI / 180.0};`,
        `  vec3 tmp = sin(a) * normalize(${axis});`,
        `  vec4 q = vec4(tmp.x, tmp.y, tmp.z, cos(a));`,
        "  p = p + 2.0 * cross(-q.xyz, cross(-q.xyz, p) + q.w * p);",
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
