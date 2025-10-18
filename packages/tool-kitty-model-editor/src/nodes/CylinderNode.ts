import { Node, NodeParams, NodeType, Pin } from "tool-kitty-node-editor";
import { cylinderComponentType, CylinderState } from "../components/CylinderComponent";
import { NodeExt, NodeTypeExt } from "../NodeExt";
import { Accessor, createMemo } from "solid-js";
import { PinValue } from "../CodeGenCtx";
import { glsl } from "@bigmistqke/view.gl/tag";

export class CylinderNodeType implements NodeType<NodeTypeExt,NodeExt,CylinderState> {
  componentType = cylinderComponentType;
  ext: NodeTypeExt = {};

  create(nodeParams: NodeParams<CylinderState>) {
    return new CylinderNode(nodeParams);
  }
}

export const cylinderNodeType = new CylinderNodeType();

class CylinderNode implements Node<NodeTypeExt,NodeExt,CylinderState> {
  type = cylinderNodeType;
  nodeParams: NodeParams<CylinderState>;
  inputPins: Accessor<{ name: string; source: Accessor<Pin | undefined>; setSource: (x: Pin | undefined) => void; isEffectPin?: boolean; }[]>;
  outputPins: Accessor<{ name: string; sinks: Accessor<Pin[]>; setSinks: (x: Pin[]) => void; isEffectPin?: boolean; }[]>;
  ext: NodeExt = {};

  constructor(nodeParams: NodeParams<CylinderState>) {
    let state = nodeParams.state;
    let setState = nodeParams.setState;
    this.nodeParams = nodeParams;
    this.inputPins = createMemo(() => [
      {
        name: "radius",
        source: () => state.radius,
        setSource: (x) => setState("radius", x),
      },
      {
        name: "height",
        source: () => state.height,
        setSource: (x) => setState("height", x),
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
      let radius_ = inputs.get("radius");
      if (radius_?.type != "Atom") {
        return undefined;
      }
      let radius = radius_.value;
      let height_ = inputs.get("height");
      if (height_?.type != "Atom") {
        return undefined;
      }
      let height = height_.value;
      let sdfFn = ctx.allocVar();
      ctx.insertGlobalCode(glsl`
        float ${sdfFn}(vec3 p) {
          vec2 d = abs(vec2(length(p.xz),p.y)) - vec2(${radius},${height});
          return min(max(d.x,d.y),0.0) + length(max(d,0.0));
        }
      `);
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
