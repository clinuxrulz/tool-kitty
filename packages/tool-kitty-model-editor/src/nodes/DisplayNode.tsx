import { Accessor, Component, createComputed, createMemo, on } from "solid-js";
import { displayComponentType, DisplayState } from "../components/DisplayComponent";
import { Node, NodeParams, NodeType, Pin } from "tool-kitty-node-editor";
import { NodeExt, NodeTypeExt } from "../NodeExt";
import { PinValue } from "../CodeGenCtx";
import { compile, glsl, uniform } from "@bigmistqke/view.gl/tag";
import { uniformView } from "@bigmistqke/view.gl";

export class DisplayNodeType implements NodeType<NodeTypeExt,NodeExt,DisplayState> {
  componentType = displayComponentType;
  ext: NodeTypeExt = {};

  create(nodeParams: NodeParams<DisplayState>) {
    return new DisplayNode(nodeParams);
  }
}

export const displayNodeType = new DisplayNodeType();

class DisplayNode implements Node<NodeTypeExt,NodeExt,DisplayState> {
  type = displayNodeType;
  nodeParams: NodeParams<DisplayState>;
  inputPins: Accessor<{ name: string; source: Accessor<Pin | undefined>; setSource: (x: Pin | undefined) => void; }[]>;
  ui: Accessor<Component | undefined>;
  ext: NodeExt = {};

  constructor(nodeParams: NodeParams<DisplayState>) {
    let state = nodeParams.state;
    let setState = nodeParams.setState;
    this.nodeParams = nodeParams;
    this.inputPins = createMemo(() => [
      {
        name: "in",
        source: () => state.in,
        setSource: (x) => setState("in", x),
      },
    ]);
    this.ui = createMemo(() => () => (
      <>
        <div class="bg-base-200 mt-2 mb-2">
          <label class="label">
            <input
              class="checkbox checkbox-sm pl-2"
              type="checkbox"
              checked={state.visible}
              onChange={(e) => {
                setState("visible", e.currentTarget.checked);
              }}
            />
            Visible
          </label>
        </div>
        <i
          class="fa-solid fa-desktop"
          style={{
            "font-size": "24px",
            "color": "green",
          }}
        />
      </>
    ));
    this.ext.generateCode = ({ ctx, inputs, onInit, }) => {
      let in_ = inputs.get("in");
      if (in_?.type != "Model") {
        return undefined;
      }
      let in2 = in_.value;
      let { sdfFuncName, colourFuncName, } = in2;
      let visibleIdent = ctx.allocVar();
      let globalCode = glsl`
        ${uniform.bool(visibleIdent)}
      `;
      ctx.insertGlobalCode(globalCode);
      ctx.insertCode(glsl`
        if (${visibleIdent}) {
          d = min(d, ${sdfFuncName}(p));
        }
      `);
      let d = ctx.allocVar();
      ctx.insertColourCode(glsl`
        if (${visibleIdent}) {
          float ${d} = ${sdfFuncName}(p);
          if (${d} < d) {
            d = ${d};
            ${colourFuncName}(p, c);
          }
        }
      `);
      onInit(({ gl, program, rerender }) => {
        let uniforms = uniformView(gl, program, compile.toSchema(globalCode).uniforms);
        createComputed(on(
          () => state.visible,
          (visible) => {
            uniforms[visibleIdent].set(visible ? 1 : 0);
            rerender();
          },
        ));
      });
      return new Map<string,PinValue>();
    };
  }
}
