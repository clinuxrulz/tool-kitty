import { Component, createMemo, createSignal, onCleanup } from "solid-js";
import { createStore } from "solid-js/store";
import { NoTrack } from "tool-kitty-util";
import { v4 as uuid } from "uuid";

const Knob: Component<{
  size: number,
  indentSize: number,
  minValue: number,
  maxValue: number,
  unbounded?: boolean,
  value: number,
  setValue: (x: number) => void,
  setDisablePan: (x: boolean) => void,
}> = (props) => {
  let [ state, setState, ] = createStore<{
    dragging: NoTrack<{
      pointerId: number,
      startX: number,
      startY: number,
      startValue: number,
      dadx: number,
      dady: number,
    }> | undefined,
  }>({
    dragging: undefined,
  });
  let [ svg, setSvg, ] = createSignal<SVGSVGElement>();
  onCleanup(() => {
    if (state.dragging) {
      props.setDisablePan(false);
    }
  });
  let minAngle = -165.0;
  let maxAngle = -minAngle;
  let angle = createMemo(() =>
    minAngle + (props.value - props.minValue) * (maxAngle - minAngle) / (props.maxValue - props.minValue)
  );
  let lightsDropShadow = document.createElementNS("http://www.w3.org/2000/svg", "feDropShadow");
  lightsDropShadow.setAttribute("dx", "-0.3");
  lightsDropShadow.setAttribute("dy", "-0.3");
  lightsDropShadow.setAttribute("stdDeviation", "0.1");
  lightsDropShadow.setAttribute("flood-opacity", "0.7");
  lightsDropShadow.setAttribute("flood-color", "white");
  let shadowDropShadow = document.createElementNS("http://www.w3.org/2000/svg", "feDropShadow");
  shadowDropShadow.setAttribute("dx", "1.5");
  shadowDropShadow.setAttribute("dy", "1.5");
  shadowDropShadow.setAttribute("stdDeviation", "0.5");
  shadowDropShadow.setAttribute("flood-opacity", "0.9");
  shadowDropShadow.setAttribute("flood-color", "black");
  let onPointerDown = (e: PointerEvent) => {
    let svg2 = svg()!;
    let rect = svg2.getBoundingClientRect();
    let x = e.clientX - rect.left;
    let y = e.clientY - rect.top;
    let dx = x - 0.5 * rect.width;
    let dy = y - 0.5 * rect.width;
    console.log("x", x.toFixed());
    console.log("y", y.toFixed());
    console.log("dx", dx.toFixed());
    console.log("dy", dy.toFixed());
    let m = dx * dx + dy * dy;
    if (m > rect.width * rect.width) {
      return;
    }
    let r = Math.sqrt(m);
    let p = 2 * Math.PI * r;
    let da = 360.0 / p;
    let dadx = dy > 0 ? -da : da;
    let dady = dx > 0 ? da : -da;
    setState("dragging", new NoTrack({
      pointerId: e.pointerId,
      startX: x,
      startY: y,
      startValue: props.value,
      dadx,
      dady,
    }));
    svg2.setPointerCapture(e.pointerId);
    props.setDisablePan(true);
  };
  let onPointerMove = (e: PointerEvent) => {
    if (state.dragging == undefined || e.pointerId != state.dragging.value.pointerId) {
      return;
    }
    let svg2 = svg()!;
    let dragging = state.dragging.value;
    let rect = svg2.getBoundingClientRect();
    let x = e.clientX - rect.left;
    let y = e.clientY - rect.top;
    let angle = minAngle + (dragging.startValue - props.minValue) * (maxAngle - minAngle) / (props.maxValue - props.minValue)
      + (x - dragging.startX) * dragging.dadx
      + (y - dragging.startY) * dragging.dady;
    let value = props.minValue + (angle - minAngle) * (props.maxValue - props.minValue) / (maxAngle - minAngle);
    if (!(props.unbounded ?? false)) {
      value = Math.max(props.minValue, Math.min(props.maxValue, value));
    }
    props.setValue(value);
  };
  let onPointerUp = (e: PointerEvent) => {
    if (state.dragging != undefined && state.dragging.value.pointerId == e.pointerId) {
      let svg2 = svg()!;
      svg2.releasePointerCapture(state.dragging.value.pointerId);
      props.setDisablePan(false);
      setState("dragging", undefined);
    }
  };
  let shapeFillId = uuid();
  let shapeId = uuid();
  let shapeMaskId = uuid();
  let lightsId = uuid();
  let shadowId = uuid();
  return (
    <svg
      ref={setSvg}
      style={{
        "width": `${props.size}px`,
        "height": `${props.size}px`,
        "user-select": "none",
        "outline": "none",
      }}
      version="1.1"
      viewBox="-16 -16 32 32"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
    >
      <defs>
        <linearGradient id={shapeFillId} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stop-color="rgb(80, 80, 81)"/>
          <stop offset="100%" stop-color="rgb(30, 30, 31)"/>
        </linearGradient>
        <path id={shapeId} d="
        M14.876 -5.890A-16 -16 0 0 0 14.876 5.890A16 16 0 0 112.539 9.938A-16 -16 0 0 0 2.337 15.828
        A16 16 0 0 1-2.337 15.828A-16 -16 0 0 0 -12.539 9.938A16 16 0 0 1-14.876 5.890A-16 -16 0 0 0 -14.876 -5.890
        A16 16 0 0 1-12.539 -9.938A-16 -16 0 0 0 -2.337 -15.828A16 16 0 0 12.337 -15.828A-16 -16 0 0 0 12.539 -9.938
        A16 16 0 0 114.876 -5.890"></path>
        <clipPath id={shapeMaskId} style={`transform: rotate(${angle()}deg) scale(0.87)`}>
          <use href={`#${shapeId}`}/>
        </clipPath>
        <filter id={lightsId}>
          {lightsDropShadow}
          {/*
          <feDropShadow dx="-0.3" dy="-0.3" stdDeviation="0.1" flood-opacity="0.7" flood-color="white"/>
          */}
        </filter>
        <filter id={shadowId}>
          {shadowDropShadow}
          {/*
          <feDropShadow dx="1.5" dy="1.5" stdDeviation="0.5" flood-opacity="0.9" flood-color="black"/>
          */}
        </filter>
      </defs>
      <circle cx="0" cy="0" r="15.0" fill="rgb(36, 36, 37)" stroke="rgb(28, 28, 29)" stroke-width="0.5"></circle>
      <g filter={`url(#${shadowId})`}>
        <g filter={`url(#${lightsId})`}>
          <g clip-path={`url(#${shapeMaskId})`}>
            <rect x="-16" y="-16" width="32" height="32" fill={`url(#${shapeFillId})`}></rect>
            <circle cx="-28" cy="-28" r="32" fill="rgba(250, 250, 255, .16)"></circle>
          </g>
        </g>
      </g>
      <g style={`transform: rotate(${angle()}deg)`}>
        <circle cx="0" cy="-11" r="1.1" fill="black"></circle>
        <circle cx="0" cy="-11" r="0.8" fill="white"></circle>
      </g>
      <circle cx="0" cy="0" r="9" stroke="rgb(50, 50, 51)" stroke-width="0.7" fill="none"></circle>
      <foreignObject
        x="-9"
        y="-9"
        width="18"
        height="18"
      >
        <div
        style="width: 18px; height: 18px; border-radius: 50%; background-image: conic-gradient(#aaa,#666,#aaa,#666,#aaa,#666,#aaa);"
        />
      </foreignObject>
    </svg>
  );
};

export default Knob;
