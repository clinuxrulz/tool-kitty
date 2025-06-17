import {
  Component,
  ComponentProps,
  createMemo,
  mergeProps,
  splitProps,
} from "solid-js";
import { IEcsWorld } from "../../ecs/IEcsWorld";
import { Overwrite } from "@bigmistqke/solid-fs-components";
import { createPanZoomManager } from "../../PanZoomManager";
import { createStore } from "solid-js/store";
import { Vec2 } from "../../math/Vec2";

const Animations: Component<
  Overwrite<
    ComponentProps<"div">,
    {
      world: IEcsWorld;
    }
  >
> = (props_) => {
  const [props, rest] = splitProps(props_, ["world"]);
  let [state, setState] = createStore<{
    pan: Vec2;
    scale: number;
  }>({
    pan: Vec2.zero,
    scale: 2.0,
  });
  let svgElement!: SVGSVGElement;
  let panZoomManager = createPanZoomManager({
    pan: () => state.pan,
    setPan: (x) => setState("pan", x),
    scale: () => state.scale,
    setScale: (x) => setState("scale", x),
    setPointerCapture: (pointerId) => svgElement.setPointerCapture(pointerId),
    releasePointerCapture: (pointerId) =>
      svgElement.releasePointerCapture(pointerId),
  });
  let transform = createMemo(
    () => `scale(${state.scale}) translate(${-state.pan.x} ${-state.pan.y})`,
  );
  return (
    <div {...rest}>
      <svg
        ref={svgElement}
        style="width: 100%; height: 100%; touch-action: none;"
        onPointerDown={(e) => panZoomManager.onPointerDown(e)}
        onPointerUp={(e) => panZoomManager.onPointerUp(e)}
        onPointerCancel={(e) => panZoomManager.onPointerCancel(e)}
        onPointerMove={(e) => panZoomManager.onPointerMove(e)}
        onWheel={(e) => panZoomManager.onWheel(e)}
      >
        <g transform={transform()}>
          <circle cx={50} cy={50} r={5} fill="red" />
        </g>
      </svg>
    </div>
  );
};

export default Animations;
