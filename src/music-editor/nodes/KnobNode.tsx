import { Accessor, Component, createMemo, createSignal, onCleanup } from "solid-js";
import { knobComponentType, KnobState } from "../components/KnobComponent";
import { Node, NodeParams, NodeType } from "../Node";
import { Pin } from "../components/Pin";
import Knob from "../Knob";

export class KnobNodeType implements NodeType<KnobState> {
  componentType = knobComponentType;

  create(nodeParams: NodeParams<KnobState>) {
    return new KnobNode(nodeParams);
  }
}

export const knobNodeType = new KnobNodeType();

class KnobNode implements Node<KnobState> {
  type = knobNodeType;
  nodeParams: NodeParams<KnobState>;
  outputPins: Accessor<{ name: string; sinks: Accessor<Pin[]>; setSinks: (x: Pin[]) => void; isEffectPin?: boolean; }[]>;
  ui: Accessor<Component | undefined>;
  disablePan: Accessor<boolean>;

  constructor(nodeParams: NodeParams<KnobState>) {
    let state = nodeParams.state;
    let setState = nodeParams.setState;
    this.nodeParams = nodeParams;
    this.outputPins = createMemo(() => [
      {
        name: "out",
        sinks: () => state.out,
        setSinks: (x) => setState("out", x),
      },
    ]);
    let [ disablePan, setDisablePan, ] = createSignal(false);
    this.ui = createMemo(() => () => {
      let [ value, setValue, ] = createSignal(0);
      /*
      let done = false;
      onCleanup(() => done = true);
      let update = (t: number) => {
        if (done) {
          return;
        }
        setValue(0.5 + 0.5 * Math.sin(t * 0.002));
        requestAnimationFrame(update);
      };
      requestAnimationFrame(update)*/
      onCleanup(() => setDisablePan(false));
      let size = 100;
      return (
        <div>
          <div style={{
            "max-width": `${size}px`
          }}>
            <label class="input">
              min
              <input type="text" value="0.00"/>
            </label>
            <label class="input">
              max
              <input type="text" value="1.00"/>
            </label>
            <label class="input">
              value
              <input type="text" value={value().toFixed(2)}/>
            </label>
          </div>
          <Knob
            size={size}
            indentSize={10}
            minValue={0.0}
            maxValue={1.0}
            value={value()}
            setValue={setValue}
            setDisablePan={setDisablePan}
          />
        </div>
      );
    });
    this.disablePan = disablePan;
  }
}
