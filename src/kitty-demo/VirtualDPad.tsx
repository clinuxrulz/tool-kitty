import { Accessor, Component, JSX } from "solid-js";
import { createStore, SetStoreFunction, Store } from "solid-js/store";

type State = {
  leftPressed: boolean;
  rightPressed: boolean;
  upPressed: boolean;
  downPressed: boolean;
};

export class VirtualDPad {
  readonly leftPressed: Accessor<boolean>;
  readonly rightPressed: Accessor<boolean>;
  readonly upPressed: Accessor<boolean>;
  readonly downPressed: Accessor<boolean>;
  private state: Store<State>;
  private setState: SetStoreFunction<State>;
  readonly Render: Component;
  constructor() {
    let [state, setState] = createStore<State>({
      leftPressed: false,
      rightPressed: false,
      upPressed: false,
      downPressed: false,
    });
    this.leftPressed = () => state.leftPressed;
    this.rightPressed = () => state.rightPressed;
    this.upPressed = () => state.upPressed;
    this.downPressed = () => state.downPressed;
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
        "font-size": `${minOfWH * 0.08}px`,
        "text-align": "center",
        cursor: "pointer",
        "user-select": "none",
      });
      return (
        <div
          style={{
            display: "grid",
            "grid-template-columns": "auto auto auto",
            position: "absolute",
            left: `${minOfWH * 0.12}px`,
            bottom: `${minOfWH * 0.12}px`,
          }}
        >
          <div></div>
          <div
            onPointerOver={() => this.setState("upPressed", true)}
            onPointerOut={() => this.setState("upPressed", false)}
            style={buttonStyle(this.upPressed)}
          >
            {"\u25B2"}
          </div>
          <div></div>
          <div
            onPointerOver={() => this.setState("leftPressed", true)}
            onPointerOut={() => this.setState("leftPressed", false)}
            style={buttonStyle(this.leftPressed)}
          >
            {"\u25C0"}
          </div>
          <div></div>
          <div
            onPointerOver={() => this.setState("rightPressed", true)}
            onPointerOut={() => this.setState("rightPressed", false)}
            style={buttonStyle(this.rightPressed)}
          >
            {"\u25B6"}
          </div>
          <div></div>
          <div
            onPointerOver={() => this.setState("downPressed", true)}
            onPointerOut={() => this.setState("downPressed", false)}
            style={buttonStyle(this.downPressed)}
          >
            {"\u25BC"}
          </div>
        </div>
      );
    };
  }
}
