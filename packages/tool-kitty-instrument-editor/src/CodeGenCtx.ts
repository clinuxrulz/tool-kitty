export class CodeGenCtx {
  private nextFieldIdx = 0;
  private fieldDeclarations = "";
  private constructorCode = "";
  private messageHandlers = new Map<string,string>();
  private globalCode = "";
  private code_ = "";
  private postCode = "";

  allocField(initValue: string): string {
    let fieldName = `x${this.nextFieldIdx++}`;
    this.fieldDeclarations += `  ${fieldName} = ${initValue};\r\n`;
    return `this.${fieldName}`;
  }

  allocFieldNoDecl(): string {
    let fieldName = `x${this.nextFieldIdx++}`;
    return `this.${fieldName}`;
  }

  addDeclToExistingForField(fieldName: string, initValue: string) {
    if (fieldName.startsWith("this.")) {
      fieldName = fieldName.substring("this.".length);
    }
    this.fieldDeclarations += `  ${fieldName} = ${initValue};\r\n`;
  }

  insertConstructorCode(lines: string[]) {
    this.constructorCode += lines.map((line) => `      ${line}\r\n`).join("");
  }

  insertMessageHandlerCode(type: string, lines: string[]) {
    let handler = this.messageHandlers.get(type);
    let toAdd = lines.map((line) => `        ${line}\r\n`).join("");
    if (handler == undefined) {
      handler = toAdd;
    } else {
      handler += toAdd;
    }
    this.messageHandlers.set(type, toAdd);
  }

  insertGlobalCode(lines: string[]) {
    this.globalCode += lines.map((line) => `${line}\r\n`).join("");
  }

  insertCode(lines: string[]) {
    this.code_ += lines.map((line) => `      ${line}\r\n`).join("");
  }

  insertPostCode(lines: string[]) {
    this.postCode += lines.map((line) => `      ${line}\r\n`).join("");
  }

  get code(): string {
    let messageHandlerCode = "";
    if (this.messageHandlers.size != 0) {
      messageHandlerCode = [
        "    this.port.onmessage = (e) => {\r\n",
        "      let data = e.data;\r\n",
        ...this.messageHandlers.entries().map(
          ([ type, code, ], idx) => {
            let start: string;
            let isLast = idx == this.messageHandlers.size - 1;
            if (idx == 0) {
              start = "      if";
            } else {
              start = "      } else if";
            }
            return (
              `${start} (data.type == "${type}") {\r\n` +
              "        let params = data.params;\r\n" +
              `${code}${isLast ? "      }\r\n" : ""}`
            );
          },
        ),
        "    };\r\n",
      ].join("");
    } else {
      messageHandlerCode = "";
    }
    return [
      this.globalCode,
      "class CompiledGraphAudioWorkletProcessor extends AudioWorkletProcessor {",
      "  runningEffectsHead = null;",
      "  runningEffectsTail = null;",
      "  variables = {};",
      this.fieldDeclarations,
      "  constructor(options) {",
      "    super();",
      `${this.constructorCode}${messageHandlerCode}  }`,
      "",
      "  insertRunningEffect(effect) {",
      "    if (this.runningEffectsTail == null) {",
      "      this.runningEffectsHead = effect;",
      "      this.runningEffectsTail = effect;",
      "    } else {",
      "      this.runningEffectsTail.next = effect;",
      "      effect.prev = this.runningEffectsTail;",
      "      this.runningEffectsTail = effect;",
      "    }",
      "  }",
      "",
      "  removeRunningEffect(effect) {",
      "    if (effect.prev != null) {",
      "      effect.prev.next = effect.next;",
      "    }",
      "    if (effect.next != null) {",
      "      effect.next.prev = effect.prev;",
      "    }",
      "    if (this.runningEffectsHead == effect) {",
      "      this.runningEffectsHead = effect.next;",
      "    }",
      "    if (this.runningEffectsTail == effect) {",
      "      this.runningEffectsTail = effect.prev;",
      "    }",
      "    effect.prev = null;",
      "    effect.next = null;",
      "  }",
      "",
      "  process(inputs, outputs, parameters) {",
      "    let output = outputs[0][0];",
      "    debugger;",
      "    for (let i = 0; i < output.length; ++i) {",
      "      let result = 0.0;",
      `${this.code_}${this.postCode}` +
      "      let effect = this.runningEffectsHead;",
      "      while (effect != null) {",
      "        let isDone = effect.update();",
      "        if (isDone) {",
      "          this.removeRunningEffect(effect);",
      "          for (let onDone of effect.onDone) {",
      "            onDone();",
      "          }",
      "        }",
      "        effect = effect.next;",
      "      }",
      "      output[i] = result;",
      "    }",
      "    return true;",
      "  }",
      "}",
      "",
      "registerProcessor(\"compiled-graph-audio-worklet-processor\", CompiledGraphAudioWorkletProcessor);"
    ].join("\r\n");
  }
}
