import { Node, NodeParams, NodeType, Pin } from "tool-kitty-node-editor";
import { capsuleComponentType, CapsuleState } from "../components/CapsuleComponent";
import { NodeExt, NodeTypeExt } from "../NodeExt";
import { Accessor, createMemo } from "solid-js";
import { PinValue } from "../CodeGenCtx";
import { glsl } from "@bigmistqke/view.gl/tag";

export class CapsuleNodeType implements NodeType<NodeTypeExt,NodeExt,CapsuleState> {
  componentType = capsuleComponentType;
  ext: NodeTypeExt = {};

  create(nodeParams: NodeParams<CapsuleState>) {
    return new CapsuleNode(nodeParams);
  }
}

export const capsuleNodeType = new CapsuleNodeType();

class CapsuleNode implements Node<NodeTypeExt,NodeExt,CapsuleState> {
  type = capsuleNodeType;
  nodeParams: NodeParams<CapsuleState>;
  inputPins: Accessor<{ name: string; source: Accessor<Pin | undefined>; setSource: (x: Pin | undefined) => void; isEffectPin?: boolean; }[]>;
  outputPins: Accessor<{ name: string; sinks: Accessor<Pin[]>; setSinks: (x: Pin[]) => void; isEffectPin?: boolean; }[]>;
  ext: NodeExt = {};

  constructor(nodeParams: NodeParams<CapsuleState>) {
    let state = nodeParams.state;
    let setState = nodeParams.setState;
    this.nodeParams = nodeParams;
    this.inputPins = createMemo(() => [
      {
        name: "height",
        source: () => state.height,
        setSource: (x) => setState("height", x),
      },
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
      let height_ = inputs.get("height");
      if (height_?.type != "Atom") {
        return undefined;
      }
      let height = height_.value;
      let radius_ = inputs.get("radius");
      if (radius_?.type != "Atom") {
        return undefined;
      }
      let radius = radius_.value;
      let sdfFn = ctx.allocVar();
      ctx.insertGlobalCode(glsl`
        float ${sdfFn}(vec3 p) {
          p.y -= clamp( p.y, 0.0, ${height} );
          return length( p ) - ${radius};
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
