import { AwesomeQR } from "awesome-qr";

export async function makeQrForText(text: string): Promise<string> {
  let dataUrl = await new AwesomeQR({
    text,
    size: 500,
  }).draw();
  if (typeof dataUrl != "string") {
    throw new Error("expected string data url from AwesomeQR.draw()");
  }
  return dataUrl;
}
