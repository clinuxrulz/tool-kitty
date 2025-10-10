import { CodeGenNode } from "./code-gen";
import { CodeGenCtx } from "./CodeGenCtx";

export type NodeTypeExt = {
  readonly initAudioCtx?: (audioCtx: AudioContext, workletNode: AudioWorkletNode) => Promise<void>;
  readonly generateInitOnceCode?: (params: {
    ctx: CodeGenCtx,
  }) => void;
};

export type NodeExt = {
  readonly init?: (workletNode: AudioWorkletNode) => Promise<void>;
  readonly macro?: (node: CodeGenNode, recordNewNode: (x: CodeGenNode) => void) => void;
  generateUnorderedInitCode?: (params: {
    ctx: CodeGenCtx,
  }) => void;
  generateCode?: (params: {
    ctx: CodeGenCtx,
    inputAtoms: Map<string,string>,
    codeGenNodeId: number,
  }) => {
    outputAtoms: Map<string,string>,
  }[];
};
