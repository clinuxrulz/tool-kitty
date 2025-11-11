import { Node, NodeParams, NodeType, Pin } from "tool-kitty-node-editor";
import { NodeExt, NodeTypeExt } from "../NodeExt";
import { unboundKnobComponentType, UnboundKnobState } from "../components/UnboundKnobComponent";
import { Accessor, Component, createComputed, createEffect, createMemo, createSignal, on } from "solid-js";
import { Knob } from "tool-kitty-components";
import { uniformView } from "@bigmistqke/view.gl";
import { compile, glsl, uniform } from "@bigmistqke/view.gl/tag";

export class UnboundKnobNodeType implements NodeType<NodeTypeExt, NodeExt, UnboundKnobState> {
  componentType = unboundKnobComponentType;
  ext: NodeTypeExt = {};

  create(nodeParams: NodeParams<UnboundKnobState>): Node<NodeTypeExt, NodeExt, UnboundKnobState> {
    return new UnboundKnobNode(nodeParams);
  }
}

export const unboundKnobNodeType = new UnboundKnobNodeType();

export class UnboundKnobNode implements Node<NodeTypeExt,NodeExt,UnboundKnobState> {
  type = unboundKnobNodeType;
  nodeParams: NodeParams<UnboundKnobState>;
  outputPins: Accessor<{ name: string; sinks: Accessor<Pin[]>; setSinks: (x: Pin[]) => void; isEffectPin?: boolean; }[]>;
  ui: Accessor<Component | undefined>;
  disablePan: Accessor<boolean>;
  ext: NodeExt = {};

  constructor(nodeParams: NodeParams<UnboundKnobState>) {
    let state = nodeParams.state;
    let setState = nodeParams.setState;
    this.nodeParams = nodeParams;
    let [ disablePan, setDisablePan, ] = createSignal(false);
    this.outputPins = createMemo(() => [
      {
        name: "out",
        sinks: () => state.out,
        setSinks: (x) => setState("out", x),
      }
    ]);
    this.ui = createMemo(() => () => {
      let [ textValue, setTextValue, ] = createSignal(state.value.toFixed(3));
      let [ textSensitivity, setTextSensitivity, ] = createSignal(state.sensitivity.toFixed(3));
      let skipSetTextValue = false;
      let skipSetTextSensitivity = false;
      createEffect(on(
        () => state.value,
        (value) => {
          if (skipSetTextValue) {
            return;
          }
          setTextValue(value.toFixed(3));
        },
        { defer: true, },
      ));
      createEffect(on(
        () => state.sensitivity,
        (sensitivity) => {
          if (skipSetTextSensitivity) {
            return;
          }
          setTextSensitivity(sensitivity.toFixed(3));
        },
      ));
      return (
        <div
          style={{
            "display": "flex",
            "flex-direction": "column",
          }}
        >
          <label class="label" style="color: black;">Value</label>
          <input
            class="input"
            type="text"
            size={5}
            value={textValue()}
            onInput={(e) => {
              let textValue = e.currentTarget.value;
              setTextValue(textValue);
              let value = Number.parseFloat(textValue.trim());
              if (!Number.isNaN(value)) {
                try {
                  skipSetTextValue = true;
                  setState("value", value);
                } finally {
                  skipSetTextValue = false;
                }
              }
            }}
          />
          <label class="label" style="color: black;">Sensitivity</label>
          <input
            class="input"
            type="text"
            size={5}
            value={textSensitivity()}
            onInput={(e) => {
              let textSensitivity = e.currentTarget.value;
              setTextSensitivity(textSensitivity);
              let value = Number.parseFloat(textSensitivity.trim());
              if (!Number.isNaN(value)) {
                try {
                  skipSetTextSensitivity = true;
                  setState("sensitivity", value);
                } finally {
                  skipSetTextSensitivity = false;
                }
              }
            }}
          />
          <Knob
            size={100}
            indentSize={10}
            minValue={0.0}
            maxValue={100.0 * state.sensitivity}
            unbounded={true}
            value={state.value}
            setValue={(x) => setState("value", x)}
            setDisablePan={setDisablePan}
          />
        </div>
      );
    });
    this.disablePan = disablePan;
    this.ext.generateCode = ({ ctx, inputs, onInit }) => {
      let valueIdent = ctx.allocVar();
      let code = glsl`
        ${uniform.float(valueIdent)}
      `;
      let schema = compile.toSchema(code);
      ctx.insertGlobalCode(code);
      onInit(({ gl, program, rerender, }) => {
        let uniforms = uniformView(gl, program, schema.uniforms);
        createComputed(on(
          () => state.value,
          (value) => {
            uniforms[valueIdent].set(value);
            rerender();
          }
        ));
      });
      return new Map([
        [
          "out",
          {
            type: "Atom",
            value: valueIdent,
          }
        ]
      ]);
    };
  }
}
