import { CodeGenCtx, PinValue } from "./CodeGenCtx";

export type NodeTypeExt = {};

export type NodeExt = {
  generateCode?: (params: {
    ctx: CodeGenCtx,
    inputs: Map<string,PinValue>,
    onInit: (cb: (params: { gl: WebGLRenderingContext, program: WebGLProgram, rerender: () => void, }) => void) => void,
  }) => Map<string,PinValue> | undefined;
};
