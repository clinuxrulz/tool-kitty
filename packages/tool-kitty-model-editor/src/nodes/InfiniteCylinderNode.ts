import { Node, NodeParams, NodeType, Pin } from "tool-kitty-node-editor";
import { infiniteCylinderComponentType, InfiniteCylinderState } from "../components/InfiniteCylinderComponent";
import { NodeExt, NodeTypeExt } from "../NodeExt";
import { Accessor, createMemo } from "solid-js";
import { PinValue } from "../CodeGenCtx";
import { glsl } from "@bigmistqke/view.gl/tag";

export class InfiniteCylinderNodeType implements NodeType<NodeTypeExt,NodeExt,InfiniteCylinderState> {
  componentType = infiniteCylinderComponentType;
  ext: NodeTypeExt = {};

  create(nodeParams: NodeParams<InfiniteCylinderState>) {
    return new InfiniteCylinderNode(nodeParams);
  }
}

export const infiniteCylinderNodeType = new InfiniteCylinderNodeType();

class InfiniteCylinderNode implements Node<NodeTypeExt,NodeExt,InfiniteCylinderState> {
  type = infiniteCylinderNodeType;
  nodeParams: NodeParams<InfiniteCylinderState>;
  inputPins: Accessor<{ name: string; source: Accessor<Pin | undefined>; setSource: (x: Pin | undefined) => void; isEffectPin?: boolean; }[]>;
  outputPins: Accessor<{ name: string; sinks: Accessor<Pin[]>; setSinks: (x: Pin[]) => void; isEffectPin?: boolean; }[]>;
  ext: NodeExt = {};

  constructor(nodeParams: NodeParams<InfiniteCylinderState>) {
    let state = nodeParams.state;
    let setState = nodeParams.setState;
    this.nodeParams = nodeParams;
    this.inputPins = createMemo(() => [
      {
        name: "radius",
        source: () => state.radius,
        setSource: (x) => setState("radius", x),
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
      let sdfFn = ctx.allocVar();
      ctx.insertGlobalCode(glsl`
        float ${sdfFn}(vec3 p) {
          return length(p.xy) - ${radius};
        }
      `);
      let colourFn = ctx.allocVar();
      ctx.insertGlobalCode(glsl`
        void ${colourFn}(vec3 p, out vec4 c) {
          c = vec4(0.7, 0.7, 0.7, 1.0);
        }
      `);
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
