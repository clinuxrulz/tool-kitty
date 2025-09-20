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
    return (props.value - props.valueAt0Pi) * 2.0 * Math.PI / (props.valueAt2Pi - props.valueAt0Pi);
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
        //"background-image": "radial-gradient(circle at 30% 30%, #dddddd, #777777, #444444)",
        "background-image": "conic-gradient(#888888, #ffffff, #888888, #ffffff, #888888, #ffffff, #888888)",
        "position": "relative",
      }}
    >
      <div
        style={{
          "position": "absolute",
          "left": `${indentPos().x}px`,
          "top": `${indentPos().y}px`,
          "width": `${props.indentSize}px`,
          "height": `${props.indentSize}px`,
          "border-radius": "50%",
          "background-image": "radial-gradient(circle at 30% 30%, #777777, #999999, #dddddd)",
        }}
      />
    </div>
  );
};

export default Knob;
