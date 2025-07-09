import { Component, createMemo, createSignal, For, Show } from "solid-js";
import { Mode } from "../Mode";
import { ModeParams } from "../ModeParams";
import { createStore } from "solid-js/store";
import { NoTrack } from "../../../util";
import { Vec2 } from "../../../math/Vec2";
import { spawnComponentType } from "../../components/SpawnComponent";

export class InsertSpawnMode implements Mode {
  instructions: Component;
  overlayHtmlUI: Component;
  click: () => void;

  constructor(modeParams: ModeParams) {
    let [state, setState] = createStore<{
      selectedTile:
        | NoTrack<{
            textureAtlasRef: string;
            frameRef: string;
          }>
        | undefined;
    }>({
      selectedTile: undefined,
    });
    let workingPt = createMemo(() => {
      let mousePos = modeParams.mousePos();
      if (mousePos == undefined) {
        return undefined;
      }
      return modeParams.screenPtToWorldPt(mousePos);
    });
    let tilePos = createMemo(() => {
      let pt = workingPt();
      if (pt == undefined) {
        return undefined;
      }
      return Vec2.create(
        Math.floor(pt.x / modeParams.tileWidth()),
        Math.floor(pt.y / modeParams.tileHeight()),
      );
    });
    let textureAtlases = createMemo(() => {
      let textureAtlases2 = modeParams.textureAtlases();
      if (textureAtlases2.type != "Success") {
        return undefined;
      }
      return textureAtlases2.value;
    });
    this.instructions = () => (
      <Show when={state.selectedTile}>
        {(tile) => (
          <>
            Click where you would like to insert spawn.
            <br />({tile().value.textureAtlasRef}, {tile().value.frameRef})
            <br />
            <button class="btn" onClick={() => modeParams.onDone()}>
              End Mode
            </button>
          </>
        )}
      </Show>
    );
    const DISPLAY_TILE_SIZE = 200;
    this.overlayHtmlUI = () => {
      return (
        <Show when={state.selectedTile == undefined}>
          <div
            style={{
              position: "absolute",
              left: "0",
              top: "0",
              bottom: "0",
              right: "0",
              background: "rgba(0,0,0,0.8)",
              display: "flex",
              "flex-direction": "column",
            }}
          >
            <div>Select a sprite to insert:</div>
            <Show when={textureAtlases()}>
              {(textureAtlases2) => (
                <div
                  style={{
                    "flex-grow": "1",
                    "white-space": "normal",
                    "overflow-y": "auto",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      "flex-wrap": "wrap",
                      "flex-direction": "row",
                    }}
                  >
                    <For each={textureAtlases2()}>
                      {(textureAtlas) => {
                        let image = textureAtlas.image;
                        let imageUrl = image.src;
                        return (
                          <For each={textureAtlas.frames}>
                            {(frame) => {
                              let scaleX = createMemo(
                                () => DISPLAY_TILE_SIZE / frame.frame.size.x,
                              );
                              let scaleY = createMemo(
                                () => DISPLAY_TILE_SIZE / frame.frame.size.y,
                              );
                              let backgroundWidth = createMemo(
                                () => image.width * scaleX(),
                              );
                              let backgroundHeight = createMemo(
                                () => image.height * scaleY(),
                              );
                              let [highlightIt, setHighlightIt] =
                                createSignal(false);
                              let onMouseOver = () => {
                                setHighlightIt(true);
                              };
                              let onMouseOut = () => {
                                setHighlightIt(false);
                              };
                              return (
                                <div
                                  onMouseOver={onMouseOver}
                                  onMouseOut={onMouseOut}
                                  onClick={() => {
                                    setState(
                                      "selectedTile",
                                      new NoTrack({
                                        textureAtlasRef:
                                          textureAtlas.textureAtlasFilename(),
                                        frameRef: frame.frameId,
                                      }),
                                    );
                                  }}
                                  style={{
                                    "background-image": `url(${imageUrl})`,
                                    "background-position-x": `${-frame.frame.pos.x * scaleX()}px`,
                                    "background-position-y": `${-frame.frame.pos.y * scaleY()}px`,
                                    "background-size": `${backgroundWidth()}px ${backgroundHeight()}px`,
                                    "background-color": highlightIt()
                                      ? "blue"
                                      : undefined,
                                    "background-blend-mode": highlightIt()
                                      ? "lighten"
                                      : undefined,
                                    width: `${DISPLAY_TILE_SIZE}px`,
                                    height: `${DISPLAY_TILE_SIZE}px`,
                                    "image-rendering": "pixelated",
                                    "margin-left": "20px",
                                    "margin-top": "20px",
                                  }}
                                />
                              );
                            }}
                          </For>
                        );
                      }}
                    </For>
                  </div>
                </div>
              )}
            </Show>
          </div>
        </Show>
      );
    };
    this.click = () => {
      if (state.selectedTile == undefined) {
        return;
      }
      let tilePos2 = tilePos();
      if (tilePos2 == undefined) {
        return;
      }
      let { textureAtlasRef, frameRef } = state.selectedTile.value;
      modeParams.world().createEntity([
        spawnComponentType.create({
          pos: Vec2.create(
            tilePos2.x * modeParams.tileWidth(),
            tilePos2.y * modeParams.tileHeight(),
          ),
          textureAtlasFilename: textureAtlasRef,
          frameId: frameRef,
        }),
      ]);
    };
  }
}
