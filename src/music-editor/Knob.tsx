import { Component, createMemo } from "solid-js";

const Knob: Component<{
  size: number,
  indentSize: number,
  minValue: number,
  maxValue: number,
  value: number,
  setValue: (x: number) => void,
}> = (props) => {
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
  return (
    <svg
      style={{
        "width": `${props.size}px`,
        "height": `${props.size}px`,
        "user-select": "none",
        "outline": "none",
        "--rot": `${angle()}deg`,
      }}
      version="1.1"
      viewBox="-16 -16 32 32"
    >
      <defs>
        <linearGradient id="shape-fill" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stop-color="rgb(80, 80, 81)"/>
          <stop offset="100%" stop-color="rgb(30, 30, 31)"/>
        </linearGradient>
        <path id="shape" d="
        M14.876 -5.890A-16 -16 0 0 0 14.876 5.890A16 16 0 0 112.539 9.938A-16 -16 0 0 0 2.337 15.828
        A16 16 0 0 1-2.337 15.828A-16 -16 0 0 0 -12.539 9.938A16 16 0 0 1-14.876 5.890A-16 -16 0 0 0 -14.876 -5.890
        A16 16 0 0 1-12.539 -9.938A-16 -16 0 0 0 -2.337 -15.828A16 16 0 0 12.337 -15.828A-16 -16 0 0 0 12.539 -9.938
        A16 16 0 0 114.876 -5.890"></path>
        <clipPath id="shape-mask" style="transform: rotate(var(--rot)) scale(0.87)">
          <use href="#shape"/>
        </clipPath>
        <filter id="lights">
          {lightsDropShadow}
          {/*
          <feDropShadow dx="-0.3" dy="-0.3" stdDeviation="0.1" flood-opacity="0.7" flood-color="white"/>
          */}
        </filter>
        <filter id="shadow">
          {shadowDropShadow}
          {/*
          <feDropShadow dx="1.5" dy="1.5" stdDeviation="0.5" flood-opacity="0.9" flood-color="black"/>
          */}
        </filter>
      </defs>
      <circle cx="0" cy="0" r="15.0" fill="rgb(36, 36, 37)" stroke="rgb(28, 28, 29)" stroke-width="0.5"></circle>
      <g filter="url(#shadow)">
        <g filter="url(#lights)">
          <g clip-path="url(#shape-mask)">
            <rect x="-16" y="-16" width="32" height="32" fill="url(#shape-fill)"></rect>
            <circle cx="-28" cy="-28" r="32" fill="rgba(250, 250, 255, .16)"></circle>
          </g>
        </g>
      </g>
      <g style="transform: rotate(var(--rot))">
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
