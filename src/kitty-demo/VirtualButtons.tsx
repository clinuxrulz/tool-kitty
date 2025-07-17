import { Accessor, Component, JSX } from "solid-js";
import { createStore, SetStoreFunction, Store } from "solid-js/store";

type State = {
  jumpPressed: boolean;
};

export class VirtualButtons {
  readonly jumpPressed: Accessor<boolean>;
  private state: Store<State>;
  private setState: SetStoreFunction<State>;
  readonly Render: Component;
  constructor() {
    let [state, setState] = createStore<State>({
      jumpPressed: false,
    });
    this.jumpPressed = () => state.jumpPressed;
    this.state = state;
    this.setState = setState;
    //
    this.Render = (props) => {
      let minOfWH = Math.min(window.innerWidth, window.innerHeight);
      let buttonStyle: (
        pressed: Accessor<boolean>,
      ) => string | JSX.CSSProperties = (pressed) => ({
        "background-color": pressed() ? "green" : "grey",
        border: "2px lightgrey solid",
        width: `${minOfWH * 0.12}px`,
        height: `${minOfWH * 0.12}px`,
        "border-radius": `${0.5 * minOfWH * 0.12}px`,
        "font-size": `${minOfWH * 0.08}px`,
        "text-align": "center",
        cursor: "pointer",
        "user-select": "none",
      });
      return (
        <div
          style={{
            display: "grid",
            "grid-template-columns": "auto auto",
            position: "absolute",
            right: `${minOfWH * 0.12}px`,
            bottom: `${minOfWH * 0.12}px`,
          }}
        >
          <div></div>
          <div
            onPointerOver={() => this.setState("jumpPressed", true)}
            onPointerOut={() => this.setState("jumpPressed", false)}
            style={buttonStyle(this.jumpPressed)}
          >
            {"A"}
          </div>
        </div>
      );
    };
  }
}
