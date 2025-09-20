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
  let indentPos = createMemo(() => {
    let ca = Math.cos(indentAngle());
    let sa = Math.sin(indentAngle());
    
  });
  return (
    <div
      style={{
        "width": `${props.size}px`,
        "height": `${props.size}px`,
        "border-radius": "50%",
        "background-image": "radial-gradient(circle at 30% 30%, #dddddd, #777777, #444444)",
      }}
    >

    </div>
  );
};

export default Knob;
