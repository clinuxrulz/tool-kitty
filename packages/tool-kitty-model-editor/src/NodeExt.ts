import { CodeGenCtx, PinValue } from "./CodeGenCtx";

export type NodeExt = {
  generateCode?: (params: { ctx: CodeGenCtx, inputs: Map<string,PinValue>, }) => Map<string,PinValue>;
};

export type NodeTypeExt = {};
