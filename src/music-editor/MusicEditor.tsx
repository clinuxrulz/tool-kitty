import { Component } from "solid-js";
import { Sound } from "./Sound";
import PianoKeys from "./PianoKeys";

const MusicEditor: Component<{}> = (props) => {
  let sound = new Sound();
  return (
    <div
      style={{
        "flex-grow": "1",
      }}
    >
      <PianoKeys
        onNoteOn={(name) => sound.noteOn(name)}
        onNoteOff={(name) => sound.noteOff(name)}
      />
    </div>
  );
};


export default MusicEditor;
