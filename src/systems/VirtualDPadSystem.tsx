import { render } from "solid-js/web";
import { VirtualDPad } from "../kitty-demo/VirtualDPad";
import { Accessor } from "solid-js";

export function createVirtualDPadSystem(): {
  dispose: () => void;
  leftPressed: Accessor<boolean>;
  rightPressed: Accessor<boolean>;
  upPressed: Accessor<boolean>;
  downPressed: Accessor<boolean>;
} {
  let dpad = new VirtualDPad();
  let dispose = render(() => <dpad.Render />, document.body);
  return {
    dispose,
    leftPressed: dpad.leftPressed,
    rightPressed: dpad.rightPressed,
    upPressed: dpad.upPressed,
    downPressed: dpad.downPressed,
  };
}
