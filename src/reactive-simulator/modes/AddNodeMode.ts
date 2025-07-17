import {
  Accessor,
  Component,
  createComputed,
  createMemo,
  createSignal,
  on,
  onCleanup,
  untrack,
} from "solid-js";
import { Node } from "../Node";
import { Mode } from "../Mode";
import { ModeParams } from "../ModeParams";

export class AddNodeMode implements Mode {
  instructions: Component;
  click: () => void;

  constructor(modeParams: ModeParams) {
    let workingPt = createMemo(() => {
      let mousePos = modeParams.mousePos();
      if (mousePos == undefined) {
        return undefined;
      }
      return modeParams.screenPtToWorldPt(mousePos);
    });
    let [bounce, setBounce] = createSignal(0);
    let triggerBounce = () => {
      setBounce((x) => 1 - x);
    };
    let insertNode: () => void = () => {};
    {
      let hasWorkingPt = createMemo(() => workingPt() != undefined);
      createComputed(() => {
        let _ = bounce();
        if (!hasWorkingPt()) {
          return;
        }
        let workingPt2 = workingPt as Accessor<
          NonNullable<ReturnType<typeof workingPt>>
        >;
        let node = untrack(
          () =>
            new Node({
              initPos: workingPt2(),
            }),
        );
        untrack(() => {
          modeParams.addNode(node);
        });
        let keepIt = false;
        insertNode = () => {
          keepIt = true;
          triggerBounce();
        };
        onCleanup(() => {
          insertNode = () => {};
          if (keepIt) {
            return;
          }
          modeParams.removeNode(node);
        });
        createComputed(
          on(
            workingPt2,
            () => {
              node.setState("position", workingPt2());
            },
            { defer: true },
          ),
        );
      });
    }
    this.instructions = () => {
      return "Click where you would like to place the nodes. Press escape when finished.";
    };
    this.click = () => {
      insertNode();
    };
  }
}
