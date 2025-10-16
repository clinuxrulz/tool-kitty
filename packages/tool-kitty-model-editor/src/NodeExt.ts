import { CodeGenCtx, PinValue } from "./CodeGenCtx";

export type NodeTypeExt = {};

export type NodeExt = {
  init?: (params: { gl: WebGLRenderingContext, program: WebGLProgram, rerender: () => void, }) => void;
  generateCode?: (params: { ctx: CodeGenCtx, inputs: Map<string,PinValue>, }) => Map<string,PinValue> | undefined;
};
