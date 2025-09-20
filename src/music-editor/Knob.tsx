import { Component } from "solid-js";

const Knob: Component<{ size: number, }> = (props) => {
  return (
    <div
      style={{
        "width": `${props.size}px`,
        "height": `${props.size}px`,
        "border-radius": "50%",
        "background-image": "radial-gradient(circle at center 40% 40%, #ffffff, #888888, #000000",
      }}
    >

    </div>
  );
};

export default Knob;
