import { Accessor, Component, createMemo, createSignal } from "solid-js";
import { pianoKeysComponentType, PianoKeysState } from "../components/PianoKeysComponent";
import { Node, NodeParams, NodeType } from "../Node";
import PianoKeys from "../PianoKeys";
import { Pin } from "../components/Pin";
import { CodeGenCtx } from "../CodeGenCtx";

export class PianoKeysNodeType implements NodeType<PianoKeysState> {
  componentType = pianoKeysComponentType;
  generateInitOnceCode: (params: { ctx: CodeGenCtx; }) => void;

  constructor() {
    this.generateInitOnceCode = ({ ctx }) => {
      ctx.insertGlobalCode([
        "let noteDown = {};",
      ]);
      ctx.insertMessageHandlerCode(
        "NoteOn",
        [
          "noteDown[params.id] = true;",
        ],
      );
      ctx.insertMessageHandlerCode(
        "NoteOff",
        [
          "noteDown[params.id] = false;",
        ],
      );
    };
  }

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
  init: (workletNode: AudioWorkletNode) => Promise<void>;

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
    let [ audioWorkletNode, setAudioWorkletNode, ] = createSignal<AudioWorkletNode>();
    this.ui = createMemo(() => () =>
      <PianoKeys
        onNoteOn={(name) => {
          let n = audioWorkletNode();
          if (n == undefined) {
            return;
          }
          n.port.postMessage({
            type: "NoteOn",
            params: {
              id: `${nodeParams.entity}/${name}`,
            },
          });
        }}
        onNoteOff={(name) => {
          let n = audioWorkletNode();
          if (n == undefined) {
            return;
          }
          n.port.postMessage({
            type: "NoteOff",
            params: {
              id: `${nodeParams.entity}/${name}`,
            },
          });
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
      {
        let decl = [];
        for (let note of NOTES) {
          decl.push(`noteDown["${nodeParams.entity}/${note}"] = false;`);
        }
        ctx.insertGlobalCode(decl);
      }
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
    this.init = async (workletNode) => {
      setAudioWorkletNode(workletNode);
    };
  }
}
