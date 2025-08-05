import { Accessor, Component, createComputed, createMemo, on } from "solid-js";
import { createStore } from "solid-js/store";
import { numberComponentType, NumberState } from "../components/NumberComponent";
import { Pin } from "../components/Pin";
import { Node, NodeParams, NodeType } from "../Node";
import { untrack } from "solid-js/web";
import numberAudioWorkletProcessorUrl from  "./worklets/number-audio-worklet-processor.ts?worker&url";

export class NumberNodeType implements NodeType<NumberState> {
  componentType = numberComponentType;
  registerAudioWorkletModules = (audioCtx: AudioContext) => {
    audioCtx.audioWorklet.addModule(numberAudioWorkletProcessorUrl);
  };

  create(nodeParams: NodeParams<NumberState>): Node<NumberState> {
    return new NumberNode(nodeParams);
  }
}

export const numberNodeType = new NumberNodeType();

class NumberNode implements Node<NumberState> {
  type = numberNodeType;
  nodeParams: NodeParams<NumberState>;
  outputPins: Accessor<{ name: string; sinks: Accessor<Pin[]>; setSinks: (x: Pin[]) => void, }[]>;
  ui: Accessor<Component | undefined>;

  constructor(nodeParams: NodeParams<NumberState>) {
    let state = nodeParams.state;
    let setState = nodeParams.setState;
    this.nodeParams = nodeParams;
    this.outputPins = createMemo(() => [
      {
        name: "out",
        sinks: () => state.out,
        setSinks: (x) => setState("out", x),
      }
    ]);
    this.ui = createMemo(() => () => {
      let [ state2, setState2, ] = createStore<{
        valueText: string,
      }>({
        valueText: untrack(() => state.value.toFixed(3))
      });
      createComputed(on(
        () => state2.valueText,
        () => {
          let value = Number.parseFloat(state2.valueText);
          if (Number.isNaN(value)) {
            return;
          }
          setState("value", value);
        },
        { defer: true, },
      ));
      return (
        <input
          class="input"
          type="text"
          size={8}
          value={state2.valueText}
          onInput={(e) => {
            setState2("valueText", e.currentTarget.value);
          }}
        />
      );
    });
  }
}
