import { createStore, SetStoreFunction, Store } from "solid-js/store";
import { Vec2 } from "../math/Vec2";
import { Component, createMemo, For, onCleanup, Show } from "solid-js";

export type NodeFlag = "Unknown" | "Dirty" | "Clean";

export let nodeFlags: NodeFlag[] = ["Unknown", "Dirty", "Clean"];

export const nodeFlagToColour = (() => {
  let nodeFlagColourMap = new Map<NodeFlag, string>([
    ["Unknown", "blue"],
    ["Dirty", "brown"],
    ["Clean", "green"],
  ]);
  return (nodeFlag: NodeFlag) => {
    return nodeFlagColourMap.get(nodeFlag)!;
  };
})();

export const NODE_RADIUS = 20;
export const NODE_RADIUS_SQUARED = NODE_RADIUS * NODE_RADIUS;
const ARROW_SIZE = 20;

type State = {
  position: Vec2;
  sources: Node[];
  sinks: Node[];
  flag: NodeFlag;
};

export class Node {
  state: Store<State>;
  setState: SetStoreFunction<State>;

  constructor(params: { initPos?: Vec2 }) {
    let [state, setState] = createStore<State>({
      position: params.initPos ?? Vec2.zero,
      sources: [],
      sinks: [],
      flag: "Unknown",
    });
    this.state = state;
    this.setState = setState;
  }

  Render: Component<{ isHighlighted: boolean; isSelected: boolean }> = (
    props,
  ) => {
    return (
      <>
        <circle
          cx={this.state.position.x}
          cy={this.state.position.y}
          r={NODE_RADIUS}
          stroke={props.isSelected ? "red" : "black"}
          stroke-width={props.isHighlighted || props.isSelected ? 6 : 2}
          fill={nodeFlagToColour(this.state.flag)}
          pointer-events="none"
        />
        <For each={this.state.sinks}>
          {(sink) => {
            let isDoubleArrow = createMemo(() => {
              return sink.state.sources.some((x) => x === this);
            });
            let verts = createMemo(() => {
              let u = sink.state.position.sub(this.state.position).normalize();
              if (!Number.isFinite(u.x)) {
                return undefined;
              }
              let v1 = u.multScalar(NODE_RADIUS).add(this.state.position);
              let v2 = u.multScalar(-NODE_RADIUS).add(sink.state.position);
              return { v1, v2 };
            });
            return (
              <Show when={verts()}>
                {(verts2) => (
                  <DrawArrowedLine
                    v1={verts2().v1}
                    v2={verts2().v2}
                    hasArrowStart={isDoubleArrow()}
                    hasArrowEnd={true}
                    arrowSize={ARROW_SIZE}
                  />
                )}
              </Show>
            );
          }}
        </For>
        <For each={this.state.sources}>
          {(source) => {
            let isAlreadyRendered = createMemo(() => {
              return source.state.sinks.some((x) => x === this);
            });
            let verts = createMemo(() => {
              let u = this.state.position
                .sub(source.state.position)
                .normalize();
              if (!Number.isFinite(u.x)) {
                return undefined;
              }
              let v1 = u.multScalar(NODE_RADIUS).add(source.state.position);
              let v2 = u.multScalar(-NODE_RADIUS).add(this.state.position);
              return { v1, v2 };
            });
            return (
              <Show when={isAlreadyRendered() ? undefined : verts()}>
                {(verts2) => (
                  <DrawArrowedLine
                    v1={verts2().v1}
                    v2={verts2().v2}
                    hasArrowStart={true}
                    hasArrowEnd={false}
                    arrowSize={ARROW_SIZE}
                  />
                )}
              </Show>
            );
          }}
        </For>
      </>
    );
  };
}

const DrawArrowedLine: Component<{
  v1: Vec2;
  v2: Vec2;
  hasArrowStart: boolean;
  hasArrowEnd: boolean;
  arrowSize: number;
}> = (props) => {
  let midArrowV2 = createMemo(() => {
    let u = props.v2.sub(props.v1).normalize();
    if (!Number.isFinite(u.x)) {
      return props.v1.add(props.v2).multScalar(0.5);
    }
    return u
      .multScalar(0.25 * ARROW_SIZE * Math.sqrt(3))
      .add(props.v1.add(props.v2).multScalar(0.5));
  });
  return (
    <>
      <line
        x1={props.v1.x}
        y1={props.v1.y}
        x2={props.v2.x}
        y2={props.v2.y}
        stroke="black"
        stroke-width="2"
        pointer-events="none"
      />
      <DrawArrowOnV2OfLine
        v1={props.v1}
        v2={midArrowV2()}
        arrowSize={props.arrowSize}
      />
      <Show when={props.hasArrowStart}>
        <DrawArrowOnV2OfLine
          v1={props.v2}
          v2={props.v1}
          arrowSize={props.arrowSize}
        />
      </Show>
      <Show when={props.hasArrowEnd}>
        <DrawArrowOnV2OfLine
          v1={props.v1}
          v2={props.v2}
          arrowSize={props.arrowSize}
        />
      </Show>
    </>
  );
};

const DrawArrowOnV2OfLine: Component<{
  v1: Vec2;
  v2: Vec2;
  arrowSize: number;
}> = (props) => {
  let path = createMemo(() => {
    let u = props.v2.sub(props.v1).normalize();
    if (!Number.isFinite(u.x)) {
      return undefined;
    }
    /**
     * negated cross product of unit z and u because we are
     * in screen coordinates not cartesian
     * coordinates.
     */
    let v = Vec2.create(u.y, -u.x);
    let arrowHeight = 0.5 * props.arrowSize * Math.sqrt(3);
    let pt = u.multScalar(-arrowHeight).add(props.v2);
    let transformStr =
      `matrix(` + `${u.x},${u.y},` + `${v.x},${v.y},` + `${pt.x},${pt.y})`;
    let pathStr =
      `M 0 ${-0.5 * props.arrowSize} ` +
      `L ${arrowHeight} 0 ` +
      `L 0 ${0.5 * props.arrowSize} ` +
      `Z`;
    return { transformStr, pathStr };
  });
  return (
    <Show when={path()}>
      {(path2) => (
        <path
          transform={path2().transformStr}
          d={path2().pathStr}
          fill="black"
          pointer-events="none"
        />
      )}
    </Show>
  );
};
