import { Component, createMemo } from "solid-js";

const Knob: Component<{
  size: number,
  indentSize: number,
  value: number,
  setValue: (x: number) => void,
  valueAt0Pi: number,
  valueAt2Pi: number,
}> = (props) => {
  let indentAngle = createMemo(() => {
    return (props.value - props.valueAt0Pi) * 2.0 * Math.PI / (props.valueAt2Pi - props.valueAt0Pi) + 0.5;
  });
  let indentR = createMemo(() => 0.7 * 0.5 * props.size);
  let indentPos = createMemo(() => {
    let ca = Math.cos(indentAngle());
    let sa = Math.sin(indentAngle());
    let r = indentR();
    return {
      x: 0.5 * props.size - r * sa - 0.5 * props.indentSize,
      y: 0.5 * props.size - r * ca - 0.5 * props.indentSize,
    };
  });
  return (
    <div
      style={{
        "width": `${props.size}px`,
        "height": `${props.size}px`,
        "border-radius": "50%",
        "background": "conic-gradient(from -45deg, #DDD, #444, #DDD)",
        "position": "relative",
      }}
    >
      <div
        style={{
          "width": `${0.9*props.size}px`,
          "height": `${0.9*props.size}px`,
          "border-radius": "50%",
          "background-image": "conic-gradient(#888888, #ffffff, #888888, #ffffff, #888888, #ffffff, #888888)",
          "position": "absolute",
          "left": `${0.05*props.size}px`,
          "top": `${0.05*props.size}px`,
        }}
      />
      <div
        style={{
          "position": "absolute",
          "left": `${indentPos().x}px`,
          "top": `${indentPos().y}px`,
          "width": `${0.7*props.indentSize}px`,
          "height": `${0.7*props.indentSize}px`,
          "border-radius": "50%",
          "background-color": "#800"
        }}
      />
    </div>
  );
};

export default Knob;
