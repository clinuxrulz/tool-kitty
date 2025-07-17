import { Component } from "solid-js";

const LandingApp: Component = () => {
  return (
    <div style={{ "flex-grow": "1" }}>
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: "50%",
          transform: "translate(-50%,-50%)",
        }}
      >
        Select something from the menubar above
      </div>
    </div>
  );
};

export default LandingApp;
