import { Node, NodeParams, NodeType, Pin } from "tool-kitty-node-editor";
import { applyCheckersComponentType, ApplyCheckersState } from "../components/ApplyCheckersComponent";
import { NodeExt, NodeTypeExt } from "../NodeExt";
import { Accessor, batch, Component, createMemo } from "solid-js";
import { PinValue } from "../CodeGenCtx";
import { glsl } from "@bigmistqke/view.gl/tag";

export class ApplyCheckersNodeType implements NodeType<NodeTypeExt,NodeExt,ApplyCheckersState> {
  componentType = applyCheckersComponentType;
  ext: NodeTypeExt = {};

  create(nodeParams: NodeParams<ApplyCheckersState>) {
    return new ApplyCheckersNode(nodeParams);
  }
}

export const applyCheckersNodeType = new ApplyCheckersNodeType();

class ApplyCheckersNode implements Node<NodeTypeExt,NodeExt,ApplyCheckersState> {
  type = applyCheckersNodeType;
  nodeParams: NodeParams<ApplyCheckersState>;
  inputPins: Accessor<{ name: string; source: Accessor<Pin | undefined>; setSource: (x: Pin | undefined) => void; isEffectPin?: boolean; }[]>;
  outputPins: Accessor<{ name: string; sinks: Accessor<Pin[]>; setSinks: (x: Pin[]) => void; isEffectPin?: boolean; }[]>;
  ext: NodeExt = {};

  constructor(nodeParams: NodeParams<ApplyCheckersState>) {
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
        name: "colour1",
        source: () => state.colour1,
        setSource: (x) => setState("colour1", x),
      },
      {
        name: "colour2",
        source: () => state.colour2,
        setSource: (x) => setState("colour2", x),
      },
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
      let model_ = inputs.get("model");
      if (model_?.type != "Model") {
        return undefined;
      }
      let model = model_.value;
      let colour1_ = inputs.get("colour1");
      if (colour1_?.type != "Atom") {
        return undefined;
      }
      let colour1 = colour1_.value;
      let colour2_ = inputs.get("colour2");
      if (colour2_?.type != "Atom") {
        return undefined;
      }
      let colour2 = colour2_.value;
      let size_ = inputs.get("size");
      if (size_?.type != "Atom") {
        return undefined;
      }
      let size = size_.value;
      let applyCheckersFn = ctx.allocVar();
      ctx.insertGlobalCode(glsl`
        void ${applyCheckersFn}(vec3 p, out vec4 c) {
          p = floor(p / ${size});
          float a = mod(p.x + p.y + p.z, 2.0);
          if (a < 0.5) {
            c = vec4(${colour1});
          } else {
            c = vec4(${colour2});
          }
        }
      `);
      return new Map<string,PinValue>([
        [
          "out",
          {
            type: "Model",
            value: {
              sdfFuncName: model.sdfFuncName,
              colourFuncName: applyCheckersFn,
            },
          },
        ],
      ]);
    };
  }
}
