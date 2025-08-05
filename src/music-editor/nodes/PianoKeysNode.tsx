import { Accessor, Component, createMemo } from "solid-js";
import { pianoKeysComponentType, PianoKeysState } from "../components/PianoKeysComponent";
import { Node, NodeParams, NodeType } from "../Node";
import PianoKeys from "../PianoKeys";
import { Pin } from "../components/Pin";

export class PianoKeysNodeType implements NodeType<PianoKeysState> {
  componentType = pianoKeysComponentType;

  create(nodeParams: NodeParams<PianoKeysState>) {
    return new PianoKeysNode(nodeParams);
  }
}

export const pianoKeysNodeType = new PianoKeysNodeType();

class PianoKeysNode implements Node<PianoKeysState> {
  type = pianoKeysNodeType;
  nodeParams: NodeParams<PianoKeysState>;
  outputPins: Accessor<{ name: string; sinks: Accessor<Pin[]>; setSinks: (x: Pin[]) => void, }[]>;
  ui: Accessor<Component | undefined>;

  constructor(nodeParams: NodeParams<PianoKeysState>) {
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
    this.ui = createMemo(() => () =>
      <PianoKeys
        onNoteOn={(name) => {
          // TODO
        }}
        onNoteOff={(name) => {
          // TODO
        }}
      />
    );
  }
}
