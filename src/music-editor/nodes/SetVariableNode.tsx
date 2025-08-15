import { Accessor, Component, createMemo } from "solid-js";
import { EcsComponentType } from "../../lib";
import { setVariableComponentType, SetVariableState } from "../components/SetVariableComponent";
import { Node, NodeParams, NodeType } from "../Node";
import { Pin } from "../components/Pin";

export class SetVariableNodeType implements NodeType<SetVariableState> {
  componentType = setVariableComponentType;

  create(nodeParams: NodeParams<SetVariableState>) {
    return new SetVariableNode(nodeParams);
  }
}

export const setVariableNodeType = new SetVariableNodeType();

class SetVariableNode implements Node<SetVariableState> {
  type = setVariableNodeType;
  nodeParams: NodeParams<SetVariableState>;
  inputPins: Accessor<{ name: string; source: Accessor<Pin | undefined>; setSource: (x: Pin | undefined) => void; }[]>;
  outputPins: Accessor<{ name: string; sinks: Accessor<Pin[]>; setSinks: (x: Pin[]) => void; }[]>;
  ui: Accessor<Component | undefined>;
  
  constructor(nodeParams: NodeParams<SetVariableState>) {
    let state = nodeParams.state;
    let setState = nodeParams.setState;
    this.nodeParams = nodeParams;
    this.inputPins = createMemo(() => [
      {
        name: "prev",
        source: () => state.prev,
        setSource: (x) => setState("prev", x),
      },
      {
        name: "value",
        source: () => state.value,
        setSource: (x) => setState("value", x),
      },
    ]);
    this.outputPins = createMemo(() => [
      {
        name: "next",
        sinks: () => state.next,
        setSinks: (x) => setState("next", x),
      }
    ]);
    this.ui = createMemo(() => () => {
      return (
        <label>
          <span style="color: black; padding-right: 5px;">Id:</span>
          <input
            class="input"
            type="text"
            size={8}
            value={state.id}
            onInput={(e) => {
              setState("id", e.currentTarget.value);
            }}
          />
        </label>
      );
    });
  }
}
