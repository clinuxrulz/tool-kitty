import { batch, Component, onMount, untrack } from "solid-js";
import { EcsComponent } from "../../../ecs/EcsComponent";
import { FrameState } from "../../components/FrameComponent";
import { Mode } from "../Mode";
import { ModeParams } from "../ModeParams";
import { createStore } from "solid-js/store";
import { Vec2 } from "../../../math/Vec2";

export class EditDataMode implements Mode {
  overlayHtmlUI: Component;

  constructor(params: {
    modeParams: ModeParams;
    frameComponent: EcsComponent<FrameState>;
  }) {
    let modeParams = params.modeParams;
    let frameComponent = params.frameComponent;
    let [state, setState] = createStore<{
      name: string;
      frameWidthText: string;
      frameHeightText: string;
      numCellsWide: number;
      numCellsHigh: number;
      metaDataText: string;
    }>({
      name: untrack(() => frameComponent.state.name),
      frameWidthText: untrack(() => frameComponent.state.size.x.toString()),
      frameHeightText: untrack(() => frameComponent.state.size.y.toString()),
      numCellsWide: untrack(() => frameComponent.state.numCells.x),
      numCellsHigh: untrack(() => frameComponent.state.numCells.y),
      metaDataText: untrack(() =>
        JSON.stringify(frameComponent.state.metaData),
      ),
    });
    this.overlayHtmlUI = () => (
      <div
        style={{
          position: "absolute",
          left: "0",
          top: "0",
          right: "0",
          bottom: "0",
          "background-color": "rgba(0,0,0,0.5)",
        }}
      >
        <div
          style={{
            position: "absolute",
            left: "50%",
            top: "50%",
            transform: "translate(-50%,-50%)",
            "background-color": "black",
            "border-radius": "10px",
            padding: "20px",
          }}
        >
          <table>
            <thead />
            <tbody>
              <tr>
                <td style="padding-right: 10px;">
                  <b>Name:</b>
                </td>
                <td>
                  <input
                    type="text"
                    class="input"
                    value={state.name}
                    onInput={(e) => {
                      setState("name", e.currentTarget.value);
                    }}
                  />
                </td>
              </tr>
              <tr>
                <td style="padding-right: 10px; white-space: nowrap;">
                  <b>Frame Width:</b>
                </td>
                <td>
                  <input
                    type="text"
                    class="input"
                    value={state.frameWidthText}
                    onInput={(e) => {
                      setState("frameWidthText", e.currentTarget.value);
                    }}
                  />
                </td>
              </tr>
              <tr>
                <td style="padding-right: 10px; white-space: nowrap;">
                  <b>Frame Width:</b>
                </td>
                <td>
                  <input
                    type="text"
                    class="input"
                    value={state.frameHeightText}
                    onInput={(e) => {
                      setState("frameHeightText", e.currentTarget.value);
                    }}
                  />
                </td>
              </tr>
              <tr>
                <td style="padding-right: 10px; white-space: nowrap;">
                  <b># Cells Wide:</b>
                </td>
                <td>
                  <input
                    type="number"
                    class="input"
                    min="1"
                    step="1"
                    value={state.numCellsWide}
                    onInput={(e) => {
                      let value = Number.parseInt(e.currentTarget.value);
                      if (!Number.isFinite(value)) {
                        return;
                      }
                      setState("numCellsWide", value);
                    }}
                  />
                </td>
              </tr>
              <tr>
                <td style="padding-right: 10px; white-space: nowrap;">
                  <b># Cells High:</b>
                </td>
                <td>
                  <input
                    type="number"
                    class="input"
                    min="1"
                    step="1"
                    value={state.numCellsHigh}
                    onInput={(e) => {
                      let value = Number.parseInt(e.currentTarget.value);
                      if (!Number.isFinite(value)) {
                        return;
                      }
                      setState("numCellsHigh", value);
                    }}
                  />
                </td>
              </tr>
              <tr>
                <td style="padding-right: 10px;">
                  <b>Meta Data:</b>
                </td>
                <td>
                  <input
                    type="text"
                    class="input"
                    value={state.metaDataText}
                    onInput={(e) => {
                      setState("metaDataText", e.currentTarget.value);
                    }}
                  />
                </td>
              </tr>
            </tbody>
          </table>
          <br />
          <div style="text-align: right;">
            <button
              class="btn"
              onClick={() => {
                batch(() => {
                  let frameWidth = Number.parseInt(state.frameWidthText);
                  if (!Number.isFinite(frameWidth)) {
                    frameWidth = params.frameComponent.state.size.x;
                  }
                  let frameHeight = Number.parseInt(state.frameHeightText);
                  if (!Number.isFinite(frameHeight)) {
                    frameHeight = params.frameComponent.state.size.y;
                  }
                  let metaData: any;
                  try {
                    metaData = JSON.parse(state.metaDataText);
                  } catch (e) {
                    metaData = params.frameComponent.state.metaData;
                  }
                  frameComponent.setState("name", state.name);
                  frameComponent.setState(
                    "size",
                    Vec2.create(frameWidth, frameHeight),
                  );
                  frameComponent.setState(
                    "numCells",
                    Vec2.create(state.numCellsWide, state.numCellsHigh),
                  );
                  frameComponent.setState("metaData", metaData);
                });
                modeParams.onDone();
              }}
            >
              OK
            </button>
            <button class="btn" onClick={() => modeParams.onDone()}>
              Cancel
            </button>
          </div>
        </div>
      </div>
    );
  }
}
