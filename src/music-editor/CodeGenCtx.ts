export class CodeGenCtx {
  private nextFieldIdx = 0;
  private fieldDeclarations = "";
  private code_ = "";

  allocField(initValue: string): string {
    let fieldName = `x${this.nextFieldIdx++}`;
    this.fieldDeclarations += `${fieldName} = ${initValue};\r\n`;
    return fieldName;
  }

  insertCode(lines: string[]) {
    this.code_ += lines.join("\r\n") + "\r\n";
  }

  get code(): string {
    return this.code_;
  }
}
