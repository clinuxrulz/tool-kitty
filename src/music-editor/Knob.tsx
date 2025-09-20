import { Component } from "solid-js";

const Knob: Component<{
  size: number,
  value: number,
  setValue: (x: number) => void,
  valueAt0Pi: number,
  valueAt2Pi: number,
}> = (props) => {
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
