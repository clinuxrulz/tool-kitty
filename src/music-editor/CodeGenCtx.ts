export class CodeGenCtx {
  private nextFieldIdx = 0;
  private fieldDeclarations = "";
  private code_ = "";

  allocField(initValue: string): string {
    let fieldName = `x${this.nextFieldIdx++}`;
    this.fieldDeclarations += `  ${fieldName} = ${initValue};\r\n`;
    return `this.${fieldName}`;
  }

  insertCode(lines: string[]) {
    this.code_ += lines.map((line) => `      ${line}\r\n`).join();
  }

  get code(): string {
    return [
      "class CompiledGraphAudioWorkletProcessor extends AudioWorkletProcessor {",
      this.fieldDeclarations,
      "  process(inputs, outputs, parameters) {",
      "    let input = inputs[0][0];",
      "    let output = outputs[0][0];",
      "    for (let i = 0; i < input.length; ++i) {",
      "      let result = 0.0;",
      `${this.code_}      output[i] = result;`,
      "    }",
      "    return true;",
      "  }",
      "}",
      "",
      "registerProcessor(\"compiled-graph-audio-worklet-processor\", CompiledGraphAudioWorkletProcessor);"
    ].join("\r\n");
  }
}
