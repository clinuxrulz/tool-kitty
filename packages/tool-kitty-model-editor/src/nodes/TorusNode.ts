import { Node, NodeParams, NodeType, Pin } from "tool-kitty-node-editor";
import { torusComponentType, TorusState } from "../components/TorusComponent";
import { NodeExt, NodeTypeExt } from "../NodeExt";
import { Accessor, createMemo } from "solid-js";
import { PinValue } from "../CodeGenCtx";
import { glsl } from "@bigmistqke/view.gl/tag";

export class TorusNodeType implements NodeType<NodeTypeExt,NodeExt,TorusState> {
  componentType = torusComponentType;
  ext: NodeTypeExt = {};

  create(nodeParams: NodeParams<TorusState>) {
    return new TorusNode(nodeParams);
  }
}

export const torusNodeType = new TorusNodeType();

class TorusNode implements Node<NodeTypeExt,NodeExt,TorusState> {
  type = torusNodeType;
  nodeParams: NodeParams<TorusState>;
  inputPins: Accessor<{ name: string; source: Accessor<Pin | undefined>; setSource: (x: Pin | undefined) => void; isEffectPin?: boolean; }[]>;
  outputPins: Accessor<{ name: string; sinks: Accessor<Pin[]>; setSinks: (x: Pin[]) => void; isEffectPin?: boolean; }[]>;
  ext: NodeExt = {};

  constructor(nodeParams: NodeParams<TorusState>) {
    let state = nodeParams.state;
    let setState = nodeParams.setState;
    this.nodeParams = nodeParams;
    this.inputPins = createMemo(() => [
      {
        name: "radius1",
        source: () => state.radius1,
        setSource: (x) => setState("radius1", x),
      },
      {
        name: "radius2",
        source: () => state.radius2,
        setSource: (x) => setState("radius2", x),
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
      let radius1_ = inputs.get("radius1");
      if (radius1_?.type != "Atom") {
        return undefined;
      }
      let radius1 = radius1_.value;
      let radius2_ = inputs.get("radius2");
      if (radius2_?.type != "Atom") {
        return undefined;
      }
      let radius2 = radius2_.value;
      let sdfFn = ctx.allocVar();
      ctx.insertGlobalCode(glsl`
        float ${sdfFn}(vec3 p) {
          vec2 q = vec2(length(p.xz)-${radius1},p.y);
          return length(q)-${radius2};
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
