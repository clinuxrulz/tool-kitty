import md5 from "md5";

const SALT = "7ae48d46-10f2-kitty-";

export function makeInviteCode(): string {
  let s = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  let code = "";
  for (let i = 0; i < 6; ++i) {
    let x = Math.floor(Math.random() * s.length);
    code += s.substring(x, x + 1);
  }
  return code;
}

export function inviteCodeToPeerId(inviteCode: string): string {
  return md5(SALT + inviteCode);
}
