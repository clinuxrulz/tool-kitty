import {
  batch,
  Component,
  createComputed,
  createEffect,
  createMemo,
  createSignal,
  JSX,
  mergeProps,
  on,
  onCleanup,
  untrack,
} from "solid-js";
import { Vec2 } from "tool-kitty-math";
import { createStore } from "solid-js/store";
import { Colour } from "./Colour";

const ColourPicker: Component<{
  colour?: Colour;
  onColour?: (colour: Colour) => void;
}> = (props) => {
  let [state, setState] = createStore<{
    cursorPos: Vec2;
    chartMousePos: Vec2 | undefined;
    chartMouseDown: boolean;
    brightness: number;
    brightnessMousePos: Vec2 | undefined;
    brightnessMouseDown: boolean;
    alpha: number;
    alphaMousePos: Vec2 | undefined;
    alphaMouseDown: boolean;
    userColour: Colour | undefined;
    userRedText: string | undefined;
    userGreenText: string | undefined;
    userBlueText: string | undefined;
    userAlphaText: string | undefined;
  }>({
    cursorPos: Vec2.zero,
    chartMousePos: undefined,
    chartMouseDown: false,
    brightness: 255,
    brightnessMousePos: undefined,
    brightnessMouseDown: false,
    alpha: 255,
    alphaMousePos: undefined,
    alphaMouseDown: false,
    userColour: untrack(() => props.colour),
    userRedText: undefined,
    userGreenText: undefined,
    userBlueText: undefined,
    userAlphaText: undefined,
  });
  let [colourChartDiv, setColourChartDiv] = createSignal<HTMLDivElement>();
  let [colourChartSize, setColourChartSize] = createSignal<Vec2 | undefined>();
  createComputed(() => {
    let div = colourChartDiv();
    if (div == undefined) {
      return;
    }
    let resizeObserver = new ResizeObserver(() => {
      let rect = div.getBoundingClientRect();
      let tmp = colourChartSize();
      setColourChartSize(Vec2.create(rect.width, rect.height));
    });
    resizeObserver.observe(div);
    onCleanup(() => {
      resizeObserver.unobserve(div);
      resizeObserver.disconnect();
    });
  });
  let canvas = createMemo(() => {
    let size = colourChartSize();
    if (size == undefined) {
      return;
    }
    let canvas = document.createElement("canvas");
    canvas.setAttribute("width", `${size.x}`);
    canvas.setAttribute("height", `${size.y}`);
    canvas.style.setProperty("flex-grow", "1");
    let ctx = canvas.getContext("2d");
    if (ctx == null) {
      return;
    }
    let imageData = new ImageData(size.x, size.y);
    // Phases:
    // - red to yellow
    // - yellow to green
    // - green to cyan
    // - cyan to blue
    // - blue to purple
    // - purple to red
    let phaseMax = 256 * 6;
    for (let j = 0; j < size.x; ++j) {
      let r: number;
      let g: number;
      let b: number;
      let phaseIndex = Math.floor((j * phaseMax) / size.x);
      if (phaseIndex < 256) {
        let idx = phaseIndex;
        r = 255;
        g = idx;
        b = 0;
      } else if (phaseIndex < 256 * 2) {
        let idx = phaseIndex - 256;
        r = 255 - idx;
        g = 255;
        b = 0;
      } else if (phaseIndex < 256 * 3) {
        let idx = phaseIndex - 256 * 2;
        r = 0;
        g = 255;
        b = idx;
      } else if (phaseIndex < 256 * 4) {
        let idx = phaseIndex - 256 * 3;
        r = 0;
        g = 255 - idx;
        b = 255;
      } else if (phaseIndex < 256 * 5) {
        let idx = phaseIndex - 256 * 4;
        r = idx;
        g = 0;
        b = 255;
      } else {
        let idx = phaseIndex - 256 * 5;
        r = 255;
        g = 0;
        b = 255 - idx;
      }
      let offset = j << 2;
      for (let i = 0; i < size.y; ++i) {
        let r2 = r + Math.floor(((256 - r) * i) / size.y);
        let g2 = g + Math.floor(((256 - g) * i) / size.y);
        let b2 = b + Math.floor(((256 - b) * i) / size.y);
        imageData.data[offset] = r2;
        imageData.data[offset + 1] = g2;
        imageData.data[offset + 2] = b2;
        imageData.data[offset + 3] = 255;
        offset += size.x << 2;
      }
    }
    let brightnessImageData = new ImageData(size.x, size.y);
    createComputed(
      on(
        () => state.brightness,
        () => {
          let brightness = state.brightness;
          let dataSize = (size.x * size.y) << 2;
          for (let i = 0; i < dataSize; i += 4) {
            let r = imageData.data[i];
            let g = imageData.data[i + 1];
            let b = imageData.data[i + 2];
            let a = imageData.data[i + 3];
            let r2 = Math.floor((r * brightness) / 255.0);
            let g2 = Math.floor((g * brightness) / 255.0);
            let b2 = Math.floor((b * brightness) / 255.0);
            brightnessImageData.data[i] = r2;
            brightnessImageData.data[i + 1] = g2;
            brightnessImageData.data[i + 2] = b2;
            brightnessImageData.data[i + 3] = a;
          }
          ctx.putImageData(brightnessImageData, 0, 0);
        },
      ),
    );
    let sliderCanvas = document.createElement("canvas");
    sliderCanvas.setAttribute("width", "1");
    sliderCanvas.setAttribute("height", `${size.y}`);
    sliderCanvas.style.setProperty("flex-grow", "1");
    let sliderCtx = sliderCanvas.getContext("2d");
    if (sliderCtx == null) {
      return;
    }
    let sliderImageData = new ImageData(1, size.y);
    createComputed(() => {
      let cursorPos = state.cursorPos;
      if (cursorPos == undefined) {
        return;
      }
      let offset = (imageData.width * cursorPos.y + cursorPos.x) << 2;
      let r = imageData.data[offset];
      let g = imageData.data[offset + 1];
      let b = imageData.data[offset + 2];
      for (let i = 0; i < size.y; ++i) {
        let offset = i << 2;
        let r2 = Math.floor((r * (size.y - 1 - i)) / (size.y - 1));
        let g2 = Math.floor((g * (size.y - 1 - i)) / (size.y - 1));
        let b2 = Math.floor((b * (size.y - 1 - i)) / (size.y - 1));
        sliderImageData.data[offset] = r2;
        sliderImageData.data[offset + 1] = g2;
        sliderImageData.data[offset + 2] = b2;
        sliderImageData.data[offset + 3] = 255;
      }
      sliderCtx.putImageData(sliderImageData, 0, 0);
    });
    let alphaSliderCanvas = document.createElement("canvas");
    alphaSliderCanvas.style.setProperty(
      "background-image",
      "linear-gradient(45deg, #808080 25%, transparent 25%), linear-gradient(-45deg, #808080 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #808080 75%), linear-gradient(-45deg, transparent 75%, #808080 75%)",
    );
    alphaSliderCanvas.style.setProperty("background-size", "20px 20px");
    alphaSliderCanvas.style.setProperty(
      "background-position",
      "0 0, 0 10px, 10px -10px, -10px 0px",
    );
    alphaSliderCanvas.setAttribute("width", "1");
    alphaSliderCanvas.setAttribute("height", `${size.y}`);
    alphaSliderCanvas.style.setProperty("flex-grow", "1");
    let alphaSliderCtx = alphaSliderCanvas.getContext("2d");
    if (alphaSliderCtx == null) {
      return;
    }
    let alphaSliderImageData = new ImageData(1, size.y);
    createComputed(() => {
      let cursorPos = state.cursorPos;
      if (cursorPos == undefined) {
        return;
      }
      let offset = (imageData.width * cursorPos.y + cursorPos.x) << 2;
      let r = imageData.data[offset];
      let g = imageData.data[offset + 1];
      let b = imageData.data[offset + 2];
      let a = imageData.data[offset + 3];
      for (let i = 0; i < size.y; ++i) {
        let offset = i << 2;
        let a2 = Math.floor((a * (size.y - 1 - i)) / (size.y - 1));
        alphaSliderImageData.data[offset] = r;
        alphaSliderImageData.data[offset + 1] = g;
        alphaSliderImageData.data[offset + 2] = b;
        alphaSliderImageData.data[offset + 3] = a2;
      }
      alphaSliderCtx.putImageData(alphaSliderImageData, 0, 0);
    });
    return {
      canvas,
      sliderCanvas,
      alphaSliderCanvas,
      size,
      sliderImageData,
      alphaSliderImageData,
    };
  });
  /* Debug brightness changes
    let done = false;
    onCleanup(() => done = true);
    let brightnessAnimationUpdate = () => {
        if (done) {
            return;
        }
        setState("brightness", (x) => (x + 1) & 255);
        requestAnimationFrame(brightnessAnimationUpdate);
    };
    requestAnimationFrame(brightnessAnimationUpdate);
    */
  createEffect(() => {
    let canvas2 = canvas();
    if (canvas2 == undefined) {
      return;
    }
    if (!state.chartMouseDown) {
      return;
    }
    let pt = state.chartMousePos;
    if (pt == undefined) {
      return;
    }
    setState("userColour", undefined);
    setState("userRedText", undefined);
    setState("userGreenText", undefined);
    setState("userBlueText", undefined);
    setState(
      "cursorPos",
      Vec2.create(
        Math.max(0, Math.min(canvas2.size.x - 1, Math.floor(pt.x))),
        Math.max(0, Math.min(canvas2.size.y - 1, Math.floor(pt.y))),
      ),
    );
  });
  createEffect(() => {
    if (!state.brightnessMouseDown) {
      return;
    }
    let pt = state.brightnessMousePos;
    if (pt == undefined) {
      return;
    }
    let sizeY = canvas()?.size.y;
    if (sizeY == undefined) {
      return;
    }
    setState("userColour", undefined);
    setState("userRedText", undefined);
    setState("userGreenText", undefined);
    setState("userBlueText", undefined);
    setState(
      "brightness",
      Math.max(0, Math.min(255, Math.floor((256 * (sizeY - pt.y)) / sizeY))),
    );
  });
  createEffect(() => {
    if (!state.alphaMouseDown) {
      return;
    }
    let pt = state.alphaMousePos;
    if (pt == undefined) {
      return;
    }
    let sizeY = canvas()?.size.y;
    if (sizeY == undefined) {
      return;
    }
    setState("userColour", undefined);
    setState("userRedText", undefined);
    setState("userGreenText", undefined);
    setState("userBlueText", undefined);
    setState("userAlphaText", undefined);
    setState(
      "alpha",
      Math.max(0, Math.min(255, Math.floor((256 * (sizeY - pt.y)) / sizeY))),
    );
  });
  let colourInCanvas = createMemo(
    on(
      [
        canvas,
        () => state.cursorPos,
        () => state.brightness,
        () => state.alpha,
      ],
      () => {
        let canvas2 = canvas();
        if (canvas2 == undefined) {
          return undefined;
        }
        let i = Math.max(
          0,
          Math.min(
            canvas2.size.y,
            Math.floor(((255 - state.brightness) * canvas2.size.y) / 256),
          ),
        );
        let offset = i << 2;
        let r = canvas2.sliderImageData.data[offset];
        let g = canvas2.sliderImageData.data[offset + 1];
        let b = canvas2.sliderImageData.data[offset + 2];
        let a = state.alpha;
        return new Colour(r, g, b, a);
      },
    ),
  );
  let userRedFieldVal = createMemo(() => {
    if (state.userRedText == undefined) {
      return undefined;
    }
    let value = Number.parseFloat(state.userRedText);
    if (!Number.isFinite(value)) {
      return undefined;
    }
    return Math.max(0, Math.min(255, value));
  });
  let userGreenFieldVal = createMemo(() => {
    if (state.userGreenText == undefined) {
      return undefined;
    }
    let value = Number.parseFloat(state.userGreenText);
    if (!Number.isFinite(value)) {
      return undefined;
    }
    return Math.max(0, Math.min(255, value));
  });
  let userBlueFieldVal = createMemo(() => {
    if (state.userBlueText == undefined) {
      return undefined;
    }
    let value = Number.parseFloat(state.userBlueText);
    if (!Number.isFinite(value)) {
      return undefined;
    }
    return Math.max(0, Math.min(255, value));
  });
  let userAlphaFieldVal = createMemo(() => {
    if (state.userAlphaText == undefined) {
      return undefined;
    }
    let value = Number.parseFloat(state.userAlphaText);
    if (!Number.isFinite(value)) {
      return undefined;
    }
    return Math.max(0, Math.min(255, value));
  });
  let currentColour = createMemo(() => {
    let c: Colour | undefined;
    if (state.userColour != undefined) {
      c = state.userColour;
    } else {
      c = colourInCanvas();
    }
    return new Colour(
      userRedFieldVal() ?? c?.r ?? 0,
      userGreenFieldVal() ?? c?.g ?? 0,
      userBlueFieldVal() ?? c?.b ?? 0,
      userAlphaFieldVal() ?? c?.a ?? 255,
    );
  });
  createEffect(
    on(
      [() => props.colour],
      () => {
        let c = currentColour();
        if (c == undefined) {
          return;
        }
        if (props.colour == undefined) {
          return;
        }
        let c2 = props.colour;
        if (c2.r == c.r && c2.g == c.g && c2.b == c.b && c2.a == c.a) {
          return;
        }
        setState("userColour", c2);
      },
      { defer: true },
    ),
  );
  createEffect(
    on([() => state.userColour, currentColour], () => {
      if (state.userColour != undefined) {
        return;
      }
      let c = currentColour();
      if (c != undefined) {
        props.onColour?.(c);
      }
    }),
  );
  createEffect(() => {
    let canvas2 = canvas();
    if (!canvas2) {
      return;
    }
    if (
      state.userColour == undefined &&
      userRedFieldVal() == undefined &&
      userGreenFieldVal() == undefined &&
      userBlueFieldVal() == undefined &&
      userAlphaFieldVal() == undefined
    ) {
      return;
    }
    let c = state.userColour;
    let c2 = new Colour(
      userRedFieldVal() ?? c?.r ?? 0,
      userGreenFieldVal() ?? c?.g ?? 0,
      userBlueFieldVal() ?? c?.b ?? 0,
      userAlphaFieldVal() ?? c?.a ?? 255,
    );
    let mv = Math.max(c2.r, c2.g, c2.b);
    let lv = Math.min(c2.r, c2.g, c2.b);
    let brightness = mv;
    let s = 255 / (mv - lv);
    if (!Number.isFinite(s)) {
      return;
    }
    let r = Math.floor((c2.r - lv) * s);
    let g = Math.floor((c2.g - lv) * s);
    let b = Math.floor((c2.b - lv) * s);
    // Phases:
    // - red to yellow
    // - yellow to green
    // - green to cyan
    // - cyan to blue
    // - blue to purple
    // - purple to red
    let rm = c2.r == mv;
    let gm = c2.g == mv;
    let bm = c2.b == mv;
    let hueIndex: number;
    if (rm && !gm && b == 0) {
      hueIndex = g;
    } else if (!rm && gm && b == 0) {
      hueIndex = 256 + (255 - r);
    } else if (r == 0 && gm && !bm) {
      hueIndex = 256 * 2 + b;
    } else if (r == 0 && !gm && bm) {
      hueIndex = 256 * 3 + (255 - g);
    } else if (!rm && g == 0 && bm) {
      hueIndex = 256 * 4 + r;
    } else {
      hueIndex = 256 * 5 + (255 - b);
    }
    let cursor_x = Math.floor((canvas2.size.x * hueIndex) / (256 * 6));
    let cursor_y = lv;
    batch(() => {
      setState("cursorPos", Vec2.create(cursor_x, cursor_y));
      setState("brightness", brightness);
      setState("alpha", c2.a);
    });
  });
  let [colourPreviewDiv, setColourPreviewDiv] = createSignal<HTMLDivElement>();
  let [colourPreviewDivWidth, setColourPreviewDivWidth] =
    createSignal<number>(50);
  createEffect(
    on(colourPreviewDiv, () => {
      let div = colourPreviewDiv();
      if (div == undefined) {
        return;
      }
      let resizeOberser = new ResizeObserver(() => {
        let rect = div.getBoundingClientRect();
        console.log(rect);
        if (rect.width != rect.height) {
          setColourPreviewDivWidth(rect.height);
        }
      });
      resizeOberser.observe(div);
      onCleanup(() => {
        resizeOberser.unobserve(div);
        resizeOberser.disconnect();
      });
    }),
  );
  return (
    <div
      style={{
        "flex-grow": "1",
        display: "flex",
        "flex-direction": "column",
      }}
    >
      <div
        style={{
          "flex-grow": "1",
          display: "flex",
          "flex-direction": "row",
        }}
      >
        <div
          style={{
            position: "relative",
            "flex-grow": "1",
            display: "flex",
            "flex-direction": "column",
            "touch-action": "none",
          }}
          onPointerMove={(e) => {
            let rect = e.currentTarget.getBoundingClientRect();
            let x = e.clientX - rect.left;
            let y = e.clientY - rect.top;
            setState("chartMousePos", Vec2.create(x, y));
            e.preventDefault();
          }}
          onPointerOut={(e) => {
            setState("chartMousePos", undefined);
            e.preventDefault();
          }}
          onPointerDown={(e) => {
            setState("chartMouseDown", true);
            e.currentTarget.setPointerCapture(e.pointerId);
            e.preventDefault();
          }}
          onPointerUp={(e) => {
            setState("chartMouseDown", false);
            e.currentTarget.releasePointerCapture(e.pointerId);
            e.preventDefault();
          }}
        >
          <div
            ref={setColourChartDiv}
            style={{
              "flex-grow": "1",
              display: "flex",
              "flex-direction": "column",
            }}
          >
            {canvas()?.canvas}
          </div>
          <svg
            width={canvas()?.size.x ?? 300}
            height={canvas()?.size.y ?? 300}
            style={{
              position: "absolute",
              left: "0",
              top: "0",
              right: "0",
              bottom: "0",
            }}
          >
            <circle
              cx={state.cursorPos.x}
              cy={state.cursorPos.y}
              r="5"
              stroke="black"
              stroke-width={2}
              fill="none"
              pointer-events="none"
            />
          </svg>
        </div>
        <div
          style={{
            position: "relative",
            display: "flex",
            "flex-direction": "row",
            width: "25px",
            height: `${canvas()?.size.y ?? 0}px`,
            "margin-left": "15px",
            overflow: "hidden",
            "touch-action": "none",
          }}
          onPointerMove={(e) => {
            let rect = e.currentTarget.getBoundingClientRect();
            let x = e.clientX - rect.left;
            let y = e.clientY - rect.top;
            setState("brightnessMousePos", Vec2.create(x, y));
            e.preventDefault();
          }}
          onPointerOut={(e) => {
            setState("brightnessMousePos", undefined);
            e.preventDefault();
          }}
          onPointerDown={(e) => {
            setState("brightnessMouseDown", true);
            e.currentTarget.setPointerCapture(e.pointerId);
            e.preventDefault();
          }}
          onPointerUp={(e) => {
            setState("brightnessMouseDown", false);
            e.currentTarget.releasePointerCapture(e.pointerId);
            e.preventDefault();
          }}
        >
          {canvas()?.sliderCanvas}
          <svg
            width={25}
            height={canvas()?.size.y ?? 0}
            style={{
              position: "absolute",
              left: "0",
              top: "0",
              right: "0",
              bottom: "0",
            }}
          >
            <rect
              x={0}
              y={
                (canvas()?.size.y ?? 0) -
                (state.brightness * (canvas()?.size.y ?? 0)) / 255 -
                5
              }
              width={24}
              height={10}
              fill="none"
              stroke="black"
              stroke-width={2}
              pointer-events="none"
            />
          </svg>
        </div>
        <div
          style={{
            position: "relative",
            display: "flex",
            "flex-direction": "row",
            width: "25px",
            height: `${canvas()?.size.y ?? 0}px`,
            "margin-left": "15px",
            overflow: "hidden",
            "touch-action": "none",
          }}
          onPointerMove={(e) => {
            let rect = e.currentTarget.getBoundingClientRect();
            let x = e.clientX - rect.left;
            let y = e.clientY - rect.top;
            setState("alphaMousePos", Vec2.create(x, y));
            e.preventDefault();
          }}
          onPointerOut={(e) => {
            setState("alphaMousePos", undefined);
            e.preventDefault();
          }}
          onPointerDown={(e) => {
            setState("alphaMouseDown", true);
            e.currentTarget.setPointerCapture(e.pointerId);
            e.preventDefault();
          }}
          onPointerUp={(e) => {
            setState("alphaMouseDown", false);
            e.currentTarget.releasePointerCapture(e.pointerId);
            e.preventDefault();
          }}
        >
          {canvas()?.alphaSliderCanvas}
          <svg
            width={25}
            height={canvas()?.size.y ?? 0}
            style={{
              position: "absolute",
              left: "0",
              top: "0",
              right: "0",
              bottom: "0",
            }}
          >
            <rect
              x={0}
              y={
                (canvas()?.size.y ?? 0) -
                (state.alpha * (canvas()?.size.y ?? 0)) / 255 -
                5
              }
              width={24}
              height={10}
              fill="none"
              stroke="black"
              stroke-width={2}
              pointer-events="none"
            />
          </svg>
        </div>
      </div>
      <div
        style={{
          display: "flex",
          "flex-direction": "row",
        }}
      >
        <div style={{ "flex-grow": "1" }}></div>
        <div>
          <table>
            <thead />
            <tbody>
              <tr>
                <td>Red:</td>
                <td>
                  <input
                    type="text"
                    value={
                      state.userRedText ??
                      state.userColour?.r ??
                      colourInCanvas()?.r
                    }
                    onInput={(e) => {
                      batch(() => {
                        setState("userRedText", e.currentTarget.value);
                        setState("userGreenText", currentColour().g.toFixed(0));
                        setState("userBlueText", currentColour().b.toFixed(0));
                        setState("userAlphaText", currentColour().a.toFixed(0));
                      });
                    }}
                    size="4"
                  />
                </td>
              </tr>
              <tr>
                <td>Green:</td>
                <td>
                  <input
                    type="text"
                    value={
                      state.userGreenText ??
                      state.userColour?.g ??
                      colourInCanvas()?.g
                    }
                    onInput={(e) => {
                      batch(() => {
                        setState("userRedText", currentColour().r.toFixed(0));
                        setState("userGreenText", e.currentTarget.value);
                        setState("userBlueText", currentColour().b.toFixed(0));
                        setState("userAlphaText", currentColour().a.toFixed(0));
                      });
                    }}
                    size="4"
                  />
                </td>
              </tr>
              <tr>
                <td>Blue:</td>
                <td>
                  <input
                    type="text"
                    value={
                      state.userBlueText ??
                      state.userColour?.b ??
                      colourInCanvas()?.b
                    }
                    onInput={(e) => {
                      batch(() => {
                        setState("userRedText", currentColour().r.toFixed(0));
                        setState("userGreenText", currentColour().g.toFixed(0));
                        setState("userBlueText", e.currentTarget.value);
                        setState("userAlphaText", currentColour().a.toFixed(0));
                      });
                    }}
                    size="4"
                  />
                </td>
              </tr>
              <tr>
                <td>Alpha:</td>
                <td>
                  <input
                    type="text"
                    value={
                      state.userAlphaText ??
                      state.userColour?.a ??
                      colourInCanvas()?.a
                    }
                    onInput={(e) => {
                      batch(() => {
                        setState("userRedText", currentColour().r.toFixed(0));
                        setState("userGreenText", currentColour().g.toFixed(0));
                        setState("userBlueText", currentColour().b.toFixed(0));
                        setState("userAlphaText", e.currentTarget.value);
                      });
                    }}
                    size="4"
                  />
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div
          ref={setColourPreviewDiv}
          style={{
            width: `${colourPreviewDivWidth()}px`,
            "background-image":
              "linear-gradient(45deg, #808080 25%, transparent 25%), linear-gradient(-45deg, #808080 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #808080 75%), linear-gradient(-45deg, transparent 75%, #808080 75%)",
            "background-size": "20px 20px",
            "background-position": "0 0, 0 10px, 10px -10px, -10px 0px",
            "margin-top": "10px",
            "margin-bottom": "10px",
            "margin-left": "10px",
            display: "flex",
            "flex-direction": "column",
          }}
        >
          <div
            style={{
              "flex-grow": "1",
              "background-color": (() => {
                let c = currentColour();
                if (c == undefined) {
                  return undefined;
                }
                return `rgb(${c.r}, ${c.g}, ${c.b})`;
              })(),
              opacity: (() => {
                let a = currentColour().a;
                return a / 255.0;
              })(),
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default ColourPicker;
