import { untrack } from "solid-js/web";
import { Mode } from "../Mode";
import { Node } from "../Node";
import { ModeParams } from "../ModeParams";
import {
  Accessor,
  Component,
  createMemo,
  createSignal,
  onCleanup,
  Signal,
} from "solid-js";
import { opToArr } from "../../kitty-demo/util";

const ALGORITHM_STEP_DELAY_MS = 1000;

type AlgorithmnState = {
  isDone: boolean;
  nodesToVisit: Node[];
  nodesToResetUnknown: Node[];
  stepCounter: Signal<number>;
  cursorAt: Signal<Node | undefined>;
  executingNode: Signal<Node | undefined>;
};

export class RunningMode implements Mode {
  instructions: Component;
  highlightNodes: Accessor<Node[]>;
  selectedNodes: Accessor<Node[]>;

  constructor(modeParams: ModeParams) {
    // Gather all dirty nodes.
    // They would normally automatically go into a collection as they are
    // marked diry.
    let nodesToVisit: Node[] = untrack(() => {
      let result: Node[] = [];
      for (let node of modeParams.nodes()) {
        if (node.state.flag == "Dirty") {
          result.push(node);
        }
      }
      return result;
    });
    //
    let algorithmnState: AlgorithmnState = {
      isDone: false,
      nodesToVisit,
      nodesToResetUnknown: [],
      stepCounter: createSignal<number>(0),
      cursorAt: createSignal<Node | undefined>(undefined),
      executingNode: createSignal<Node | undefined>(undefined),
    };
    let intervalId = setInterval(() => {
      this.stepAlgorithmn(algorithmnState);
      if (algorithmnState.isDone) {
        modeParams.onDone();
      }
    }, ALGORITHM_STEP_DELAY_MS);
    onCleanup(() => {
      for (let node of algorithmnState.nodesToResetUnknown) {
        node.setState("flag", "Unknown");
      }
      clearInterval(intervalId);
    });
    //
    this.instructions = () => {
      return (
        <div>
          Simulation is running.
          <br />
          Step: {algorithmnState.stepCounter[0]()}
        </div>
      );
    };
    this.highlightNodes = createMemo(() =>
      opToArr(algorithmnState.cursorAt[0]()),
    );
    this.selectedNodes = createMemo(() =>
      opToArr(algorithmnState.executingNode[0]()),
    );
  }

  stepAlgorithmn(state: AlgorithmnState) {
    // If executing a node, finish executing it.
    {
      let exeNode = state.executingNode[0]();
      if (exeNode != undefined) {
        exeNode.setState("flag", "Clean");
        state.nodesToResetUnknown.push(exeNode);
        for (let sink of exeNode.state.sinks) {
          sink.setState("flag", "Dirty");
          state.nodesToResetUnknown.push(sink);
          state.nodesToVisit.push(sink);
        }
        state.executingNode[1](undefined);
        state.stepCounter[1]((x) => x + 1);
        return;
      }
    }
    // If not cursor, pick a cursor
    let cursorAt = state.cursorAt[0]();
    if (cursorAt == undefined) {
      let node = state.nodesToVisit.pop();
      if (node == undefined) {
        return;
      }
      state.cursorAt[1](node);
      state.stepCounter[1]((x) => x + 1);
      return;
    }
    // Check for any sources in an unknown or dirty state.
    for (let source of cursorAt.state.sources) {
      if (source.state.flag != "Clean") {
        // If found, add the current cursor in nodesToVisit incase we can not path back,
        // and make the found node the current cursor
        state.nodesToVisit.push(cursorAt);
        state.cursorAt[1](source);
        state.stepCounter[1]((x) => x + 1);
        return;
      }
    }
    // If we make it here, all sources are clean.
    // If we are in unknown state, mark ourself as clean.
    if (cursorAt.state.flag == "Unknown") {
      cursorAt.setState("flag", "Clean");
      state.nodesToResetUnknown.push(cursorAt);
      state.cursorAt[1](undefined);
      state.stepCounter[1]((x) => x + 1);
      return;
    }
    // If we are in dirty state, execute the node's update function.
    if (cursorAt.state.flag == "Dirty") {
      state.executingNode[1](cursorAt);
      state.cursorAt[1](undefined);
      state.stepCounter[1]((x) => x + 1);
      return;
    }
    // If we make it here, we are done.
    for (let node of state.nodesToResetUnknown) {
      node.setState("flag", "Unknown");
      state.isDone = true;
    }
  }
}
