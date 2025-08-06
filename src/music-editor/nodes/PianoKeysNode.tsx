import { Accessor, Component, createMemo } from "solid-js";
import { pianoKeysComponentType, PianoKeysState } from "../components/PianoKeysComponent";
import { Node, NodeParams, NodeType } from "../Node";
import PianoKeys from "../PianoKeys";
import { Pin } from "../components/Pin";
import { CodeGenCtx } from "../CodeGenCtx";

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
  generateCode: (params: { ctx: CodeGenCtx; inputAtoms: Map<string, string>; }) => { outputAtoms: Map<string, string>; }[];

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
    const NOTES = [
      "C",
      "C#",
      "D",
      "D#",
      "E",
      "F",
      "F#",
      "G",
      "G#",
      "A",
      "A#",
      "B",
    ];
    const MIDDLE_C_HZ = 261.63;
    this.generateCode = ({ ctx, }) => {
      return NOTES.map((note, idx) => {
        const frequency = MIDDLE_C_HZ * Math.pow(2.0, idx / 12.0);
        let out = ctx.allocField("0.0");
        let outputAtoms = new Map<string,string>();
        outputAtoms.set("out", out);
        ctx.insertCode([
          `if (noteDown["${nodeParams.entity}/${note}"]) {`,
          `  ${out} = ${frequency};`,
          "} else {",
          `  ${out} = 0.0;`,
          "}",
        ]);
        return { outputAtoms, };
      });
    };
  }
}
