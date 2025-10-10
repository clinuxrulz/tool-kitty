import { Accessor, Component, createComputed, createMemo, on } from "solid-js";
import { createStore } from "solid-js/store";
import { numberComponentType, NumberState } from "../components/NumberComponent";
import { Node, NodeParams, NodeType, Pin } from "tool-kitty-node-editor";
import { untrack } from "solid-js/web";
import { NodeExt, NodeTypeExt } from "../NodeExt";

export class NumberNodeType implements NodeType<NodeTypeExt,NodeExt,NumberState> {
  componentType = numberComponentType;
  ext: NodeTypeExt = {};

  create(nodeParams: NodeParams<NumberState>) {
    return new NumberNode(nodeParams);
  }
}

export const numberNodeType = new NumberNodeType();

class NumberNode implements Node<NodeTypeExt,NodeExt,NumberState> {
  type = numberNodeType;
  nodeParams: NodeParams<NumberState>;
  outputPins: Accessor<{ name: string; sinks: Accessor<Pin[]>; setSinks: (x: Pin[]) => void, }[]>;
  ui: Accessor<Component | undefined>;
  ext: NodeExt;

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
    this.ext = {
      generateCode: ({ ctx, }) => {
        let outputAtoms = new Map<string,string>();
        outputAtoms.set("out", `${state.value}`);
        return [{
          outputAtoms,
        }];
      },
    };
  }
}
