import { Component } from "solid-js";
import { Sound } from "./Sound";

const MusicEditor: Component<{}> = (props) => {
  let sound = new Sound();
  return (
    <div
      style={{
        "flex-grow": "1",
      }}
    >
      <button
        class="btn btn-primary"
        onClick={() => {
          sound.init();
        }}
      >
        Play
      </button>
    </div>
  );
};


export default MusicEditor;
