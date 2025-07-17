import { Component, createMemo, createSignal } from "solid-js";
import { createStore } from "solid-js/store";
import { EcsWorld } from "../ecs/EcsWorld";
import { RenderSystem } from "./systems/RenderSystem";
import { ModeParams } from "./ModeParams";
import { Vec2 } from "../math/Vec2";
import { Mode } from "./Mode";
import { InsertCatmullRomSplineMode } from "./modes/InsertCatmullRomSpline";
import { IdleMode } from "./modes/IdleMode";
import { InsertNurbsMode } from "./modes/InsertNurbs";

const VectorEditor: Component = () => {
  let [state, setState] = createStore<{
    mousePos: Vec2 | undefined;
    mode: "Idle" | "Insert Catmull Rom Spline" | "Insert Nurbs";
  }>({
    mousePos: undefined,
    mode: "Idle",
  });
  let screenPtToWorldPt = (pt: Vec2) => pt;
  let worldPtToScreenPt = (pt: Vec2) => pt;
  let world = new EcsWorld();
  let renderSystem = new RenderSystem({
    world,
  });
  let modeParams: ModeParams = {
    mousePos: () => state.mousePos,
    screenPtToWorldPt,
    worldPtToScreenPt,
    world: () => world,
    onDone: () => setState("mode", "Idle"),
  };
  let mode = createMemo<Mode>(() => {
    switch (state.mode) {
      case "Idle":
        return new IdleMode(modeParams);
      case "Insert Catmull Rom Spline":
        return new InsertCatmullRomSplineMode(modeParams);
      case "Insert Nurbs":
        return new InsertNurbsMode(modeParams);
    }
  });
  let Instructions = () => <>{mode().instructions?.({})}</>;
  let [svg, setSvg] = createSignal<SVGSVGElement>();
  let onPointerDown = (e: PointerEvent) => {
    let svg2 = svg();
    if (svg2 == undefined) {
      return;
    }
    svg2.setPointerCapture(e.pointerId);
    e.preventDefault();
  };
  let onPointerUp = (e: PointerEvent) => {
    let svg2 = svg();
    if (svg2 == undefined) {
      return;
    }
    svg2.releasePointerCapture(e.pointerId);
    mode().click?.();
    e.preventDefault();
  };
  let onPointerMove = (e: PointerEvent) => {
    let svg2 = svg();
    if (svg2 == undefined) {
      return;
    }
    let rect = svg2.getBoundingClientRect();
    let pt = Vec2.create(e.clientX - rect.left, e.clientY - rect.top);
    setState("mousePos", pt);
    e.preventDefault();
  };
  let onPointerLeave = (e: PointerEvent) => {
    setState("mousePos", undefined);
    e.preventDefault();
  };
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        "flex-direction": "column",
      }}
    >
      <div>
        <button
          class="btn"
          onClick={() => {
            setState("mode", "Insert Catmull Rom Spline");
          }}
        >
          Insert Catmull Rom Spline
        </button>
        <button
          class="btn"
          onClick={() => {
            setState("mode", "Insert Nurbs");
          }}
        >
          Insert Nurbs
        </button>
      </div>
      <div
        style={{
          "flex-grow": "1",
          position: "relative",
          display: "flex",
          "flex-direction": "column",
        }}
      >
        <svg
          ref={setSvg}
          style={{
            "flex-grow": "1",
            "background-color": "white",
            "touch-action": "none",
          }}
          onPointerDown={onPointerDown}
          onPointerUp={onPointerUp}
          onPointerMove={onPointerMove}
          onPointerLeave={onPointerLeave}
        >
          <renderSystem.Render />
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

export default VectorEditor;
