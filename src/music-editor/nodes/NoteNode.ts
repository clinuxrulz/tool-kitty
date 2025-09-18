import { Accessor, createMemo } from "solid-js";
import { noteComponentType, NoteState } from "../components/NoteComponent";
import { Node, NodeParams, NodeType } from "../Node";
import { Pin } from "../components/Pin";
import { CodeGenCtx } from "../CodeGenCtx";

export class NoteNodeType implements NodeType<NoteState> {
  componentType = noteComponentType;

  create(nodeParams: NodeParams<NoteState>): Node<NoteState> {
    return new NoteNode(nodeParams);
  }
}

export const noteNodeType = new NoteNodeType();

class NoteNode implements Node<NoteState> {
  type = noteNodeType;
  nodeParams: NodeParams<NoteState>;
  outputPins: Accessor<{ name: string; sinks: Accessor<Pin[]>; setSinks: (x: Pin[]) => void; isEffectPin?: boolean; }[]>;
  generateCode: (params: { ctx: CodeGenCtx; inputAtoms: Map<string, string>; codeGenNodeId: number; }) => { outputAtoms: Map<string, string>; }[];

  constructor(nodeParams: NodeParams<NoteState>) {
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
    this.generateCode = ({ ctx, inputAtoms, }) => {
      let noteIdx = NOTES.indexOf(state.note);
      if (noteIdx == -1) {
        return [];
      }
      let freq = MIDDLE_C_HZ * Math.pow(2.0, noteIdx / 12.0);
      let out = ctx.allocField("0.0");
      let outputAtoms = new Map<string,string>();
      outputAtoms.set("out", out);
      ctx.insertCode([
          `if (noteDown["${state.entity}/${state.note}"]) {`,
          `  ${out} = ${freq};`,
          "} else {",
          `  ${out} = 0.0;`,
          "}",
      ]);
      return [{
        outputAtoms,
      }];
    };
  }
}