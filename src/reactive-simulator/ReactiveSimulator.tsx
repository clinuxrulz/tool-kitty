import { Component, createMemo, createSignal, For, onCleanup } from "solid-js";
import { Node } from "./Node";
import { createStore } from "solid-js/store";
import { ModeParams } from "./ModeParams";
import { IdleMode } from "./modes/IdleMode";
import { AddNodeMode } from "./modes/AddNodeMode";
import { AddLinkMode } from "./modes/AddLinkMode";
import { MarkDirtyMode } from "./modes/MarkDirtyMode";
import { RunningMode } from "./modes/RunningMode";
import { Mode } from "./Mode";
import { Vec2 } from "../math/Vec2";
import { PickingSystem } from "./systems/PickingSystem";

type State = {
  mousePos: Vec2 | undefined;
  nodes: Node[];
  mode:
    | "Idle"
    | "Add Node"
    | "Add Double Link"
    | "Add Single Link"
    | "Mark Dirty"
    | "Running";
};

const ReactiveSimulator: Component = () => {
  let [state, setState] = createStore<State>({
    mousePos: Vec2.zero,
    nodes: [],
    mode: "Idle",
  });
  let screenPtToWorldPt: (pt: Vec2) => Vec2 | undefined = (pt) => {
    return pt;
  };
  let worldPtToScreenPt: (pt: Vec2) => Vec2 | undefined = (pt) => {
    return pt;
  };
  let [svg, setSvg] = createSignal<SVGSVGElement>();
  let keyDownListener = (e: KeyboardEvent) => {
    if (e.key == "Escape") {
      setState("mode", "Idle");
    }
  };
  document.addEventListener("keydown", keyDownListener);
  onCleanup(() => {
    document.removeEventListener("keydown", keyDownListener);
  });
  //
  let pickingSystem = new PickingSystem({
    mousePos: () => state.mousePos,
    screenPtToWorldPt,
    nodes: () => state.nodes,
  });
  //
  let modeParams: ModeParams = {
    mousePos: () => state.mousePos,
    screenPtToWorldPt,
    worldPtToScreenPt,
    nodes: () => state.nodes,
    addNode: (node) => {
      setState("nodes", [...state.nodes, node]);
    },
    removeNode: (node) => {
      setState(
        "nodes",
        state.nodes.filter((x) => x !== node),
      );
    },
    onDone: () => {
      setState("mode", "Idle");
    },
    pickingSystem,
  };
  //
  let mode = createMemo<Mode>(() => {
    switch (state.mode) {
      case "Idle":
        return new IdleMode(modeParams);
      case "Add Node":
        return new AddNodeMode(modeParams);
      case "Add Double Link":
        return new AddLinkMode({ modeParams, type: "Double" });
      case "Add Single Link":
        return new AddLinkMode({ modeParams, type: "Single" });
      case "Mark Dirty":
        return new MarkDirtyMode(modeParams);
      case "Running":
        return new RunningMode(modeParams);
    }
  });
  //
  let Instructions: Component = () => {
    return <>{mode().instructions?.({})}</>;
  };
  let highlightNodesSet = createMemo(() => {
    return new Set(mode().highlightNodes?.() ?? []);
  });
  let selectedNodeSet = createMemo(() => {
    return new Set(mode().selectedNodes?.() ?? []);
  });
  //
  let onMouseMove = (e: MouseEvent) => {
    let svg2 = svg();
    if (svg2 == undefined) {
      return;
    }
    let rect = svg2.getBoundingClientRect();
    let pt = Vec2.create(e.clientX - rect.left, e.clientY - rect.top);
    setState("mousePos", pt);
  };
  let onMouseOut = (e: MouseEvent) => {
    let tmp = state.mousePos;
    setState("mousePos", undefined);
  };
  let onClick = (e: MouseEvent) => {
    mode().click?.();
  };
  //
  return (
    <div
      style={{
        "flex-grow": "1",
        display: "flex",
        "flex-direction": "column",
      }}
    >
      {/* Toolbar */}
      <div
        style={{
          "margin-top": "5px",
          "margin-bottom": "5px",
        }}
      >
        <button
          style={{
            "font-size": "24pt",
            "margin-left": "5px",
            "background-color": state.mode == "Add Node" ? "blue" : undefined,
          }}
          onClick={() => setState("mode", "Add Node")}
        >
          <i class="fa-solid fa-circle-plus"></i>
        </button>
        <button
          style={{
            "font-size": "24pt",
            "margin-left": "5px",
            "background-color":
              state.mode == "Add Double Link" ? "blue" : undefined,
          }}
          onClick={() => setState("mode", "Add Double Link")}
        >
          <i class="fa-solid fa-arrows-left-right"></i>
        </button>
        <button
          style={{
            "font-size": "24pt",
            "margin-left": "5px",
            "background-color":
              state.mode == "Add Single Link" ? "blue" : undefined,
          }}
          onClick={() => setState("mode", "Add Single Link")}
        >
          <i class="fa-solid fa-arrow-left-long"></i>
        </button>
        <button
          style={{
            "font-size": "24pt",
            "margin-left": "5px",
            "background-color": state.mode == "Mark Dirty" ? "blue" : undefined,
          }}
          onClick={() => setState("mode", "Mark Dirty")}
        >
          <i class="fa-solid fa-poo"></i>
        </button>
        <button
          style={{
            "font-size": "24pt",
            "margin-left": "5px",
            "background-color": state.mode == "Running" ? "blue" : undefined,
          }}
          onClick={() => setState("mode", "Running")}
        >
          <i class="fa-solid fa-person-running"></i>
        </button>
      </div>
      {/* Main View */}
      <div
        style={{
          position: "relative",
          "flex-grow": "1",
          display: "flex",
          "flex-direction": "column",
        }}
      >
        <svg
          ref={setSvg}
          style={{
            "flex-grow": "1",
            "background-color": "lightgrey",
          }}
          onMouseMove={onMouseMove}
          onMouseOut={onMouseOut}
          onClick={onClick}
        >
          <For each={state.nodes}>
            {(node) => {
              let isHighlighted = createMemo(() =>
                highlightNodesSet().has(node),
              );
              let isSelected = createMemo(() => selectedNodeSet().has(node));
              return (
                <node.Render
                  isHighlighted={isHighlighted()}
                  isSelected={isSelected()}
                />
              );
            }}
          </For>
        </svg>
        <div
          style={{
            position: "absolute",
            left: "0",
            top: "0",
          }}
        >
          <Instructions />
        </div>
      </div>
    </div>
  );
};

export default ReactiveSimulator;
