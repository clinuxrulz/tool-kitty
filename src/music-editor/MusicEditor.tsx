import { Component, Match, Switch, untrack } from "solid-js";
import { Sound } from "./Sound";
import PianoKeys from "./PianoKeys";
import { createStore } from "solid-js/store";
import { EcsWorld } from "../lib";
import InstrumentEditor from "./InstrumentEditor";

const MusicEditor: Component<{}> = (props) => {
  const tabs = [
    "Piano Keys" as const,
    "Instrument Editor" as const,
  ];
  type Tab = (typeof tabs)[0];
  let [ state, setState, ] = createStore<{
    selectedTab: Tab,
  }>({
    selectedTab: "Piano Keys",
  });
  let sound = new Sound();
  sound.init();
  let world = new EcsWorld();
  return (
    <div
      style={{
        "flex-grow": "1",
        "display": "flex",
        "flex-direction": "column"
      }}
    >
      <div
        role="tablist"
        class="tabs tabs-box"
      >
        {tabs.map((tab) => untrack(() => (
          <a
            role="tab"
            classList={{
              "tab": true,
              "tab-active": state.selectedTab == tab
            }}
            onClick={() => setState("selectedTab", tab)}
          >
            {tab}
          </a>
        )))}
      </div>
      <Switch>
        <Match when={state.selectedTab == "Piano Keys"}>
          <PianoKeys
            onNoteOn={(name) => sound.noteOn(name)}
            onNoteOff={(name) => sound.noteOff(name)}
          />
        </Match>
        <Match when={state.selectedTab == "Instrument Editor"}>
          <InstrumentEditor
            style={{
              "flex-grow": "1",
            }}
            world={world}
          />
        </Match>
      </Switch>
    </div>
  );
};


export default MusicEditor;
