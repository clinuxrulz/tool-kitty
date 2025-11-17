import { Accessor, Component, createComputed, createEffect, createMemo, createRoot, For, JSX, mapArray, onCleanup, onMount, Show } from "solid-js";
import { NodesSystem, NodesSystemNode } from "./NodesSystem";
import { QuadraticBezier, Vec2 } from "tool-kitty-math";
import { ReactiveSet } from "@solid-primitives/set";
import { render } from "solid-js/web";
import { createJoin, createJoinDefined, opToArr, whenDefined } from "tool-kitty-util";

export class RenderSystem<TYPE_EXT,INST_EXT> {
  Render: Component;

  constructor(params: {
    mousePos: Accessor<Vec2 | undefined>,
    screenPtToWorldPt: (pt: Vec2) => Vec2 | undefined,
    scale: Accessor<number>,
    nodesSystem: NodesSystem<TYPE_EXT,INST_EXT>,
    lookupNodeById: (nodeId: string) => NodesSystemNode<TYPE_EXT,INST_EXT> | undefined,
    highlightedEntitySet: ReactiveSet<string>,
    selectedEntitySet: ReactiveSet<string>,
    edgeUnderMouse: Accessor<{
      id: `${string}-${string}-${string}-${string}-${string}`;
      source: {
          target: string;
          pin: string;
      };
      sink: {
          target: string;
          pin: string;
      };
      beziers: QuadraticBezier[];
    } | undefined>,
  }) {
    this.Render = () => (<>
      <For each={params.nodesSystem.nodes()}>
        {(node) => (
          <RenderNode
            node={node}
            isHighlighted={
              params.highlightedEntitySet.has(node.node.nodeParams.entity)
            }
            isSelected={
              params.selectedEntitySet.has(node.node.nodeParams.entity)
            }
          />
        )}
      </For>
      <For each={params.nodesSystem.edges()}>
        {(edge) => {
          let highlighted = createMemo(() =>
            params.edgeUnderMouse()?.id == edge.id
          );
          return (
            edge.beziers.map((bezier) => (
              <path
                d={bezier.svgPathString({ invertY: true, })}
                fill="none"
                stroke={highlighted() ? "green" : "blue"}
                stroke-width={2.0}
                vector-effect="non-scaling-stroke"
              />
            ))
          );
        }}
      </For>
    </>);
  }
}

let calcSvgTextSize = (() => {
  let cache = new Map<string,Vec2>();
  return (text: string): Vec2 => {
    let result = cache.get(text);
    if (result != undefined) {
      return result;
    }
    let { svg, dispose, } = createRoot((dispose) => {
      return {
        svg: createMeasurementSvg(),
        dispose,
      }
    });
    let text2 = document.createElementNS("http://www.w3.org/2000/svg", "text");
    let text3 = document.createTextNode(text);
    text2.appendChild(text3);
    svg.appendChild(text2);
    let size = text2.getBBox();
    dispose();
    result = Vec2.create(size.width, size.height);
    cache.set(text, result);
    return result;
  };
})();

let cachedExtraUiSizeByKey = (() => {
  let cache = new Map<string,Vec2>();
  return (key: string, calc: () => Vec2): Vec2 => {
    let result = cache.get(key);
    if (result != undefined) {
      return result;
    }
    result = calc();
    cache.set(key, result);
    return result;
  }
})();

function RenderNode<TYPE_EXT,INST_EXT>(props: {
  node: NodesSystemNode<TYPE_EXT,INST_EXT>,
  isHighlighted: boolean,
  isSelected: boolean,
}): JSX.Element {
  let titleSize = createMemo(() => {
    return calcSvgTextSize(props.node.node.type.componentType.typeName);
  });
  let inputPinSizes = createMemo(mapArray(
    () => props.node.node.inputPins?.() ?? [],
    (inputPin) => {
      let size = calcSvgTextSize(inputPin.name);
      return {
        name: inputPin.name,
        size,
      };
    },
  ));
  let outputPinSizes = createMemo(mapArray(
    () => props.node.node.outputPins?.() ?? [],
    (outputPin) => {
      let size = calcSvgTextSize(outputPin.name);
      return {
        name: outputPin.name,
        size,
      };
    },
  ));
  let extraUiSize = createMemo(() => {
    let Ui = props.node.node.ui?.();
    if (Ui == undefined) {
      return undefined;
    }
    return cachedExtraUiSizeByKey(props.node.node.type.componentType.typeName, () => {
      let div = createMeasurementDiv();
      let span = document.createElement("div");
      span.style.setProperty("display", "inline-block");
      div.append(span);
      let dispose = render(() => <Ui/>, span);
      let rect = span.getBoundingClientRect();
      dispose();
      return Vec2.create(rect.width, rect.height);
    });
  });
  const boxPadding = 5.0;
  const pinDotSize = 2.0;
  const gapAroundPinDot = 5.0;
  const inputPinsTotalHeight = createMemo(() => {
    let result = 0.0;
    for (let inputPinSize of inputPinSizes()) {
      result += inputPinSize.size.y;
    }
    return result;
  });
  const outputPinsTotalHeight = createMemo(() => {
    let result = 0.0;
    for (let outputPinSize of outputPinSizes()) {
      result += outputPinSize.size.y;
    }
    return result;
  });
  let inputPinsMaxWidth = createMemo(() => {
    let result = 0.0;
    for (let inputPinSize of inputPinSizes()) {
      result = Math.max(result, inputPinSize.size.x);
    }
    return result;
  });
  let outputPinsMaxWidth = createMemo(() => {
    let result = 0.0;
    for (let outputPinSize of outputPinSizes()) {
      result = Math.max(result, outputPinSize.size.x);
    }
    return result;
  });
  let boxHeight = createMemo(() => {
    return titleSize().y + Math.max(
      inputPinsTotalHeight(),
      outputPinsTotalHeight(),
    ) + (extraUiSize()?.y ?? 0.0) + 2.0 * boxPadding;
  });
  let boxWidth = createMemo(() => {
    return Math.max(
      titleSize().x,
      inputPinsMaxWidth() + outputPinsMaxWidth() + 4.0 * gapAroundPinDot,
      extraUiSize()?.x ?? 0.0
    ) + 2.0 * boxPadding;
  });
  let boxSize = createMemo(() => Vec2.create(boxWidth(), boxHeight()));
  let inputPinPositions = createMemo(() => {
    let result: { [name: string]: {
      dotPos: Vec2,
      textPos: Vec2,
    } } = {};
    let atY = boxHeight() - titleSize().y;
    for (let inputPinSize of inputPinSizes()) {
      atY -= inputPinSize.size.y;
      result[inputPinSize.name] = {
        dotPos: Vec2.create(
          gapAroundPinDot,
          atY + 0.28 * inputPinSize.size.y,
        ),
        textPos: Vec2.create(2.0 * gapAroundPinDot, atY),
      };
    }
    return result;
  });
  let outputPinPositions = createMemo(() => {
    let result: { [name: string]: {
      dotPos: Vec2,
      textPos: Vec2,
    } } = {};
    let atY = boxHeight() - titleSize().y;
    for (let outputPinSize of outputPinSizes()) {
      atY -= outputPinSize.size.y;
      result[outputPinSize.name] = {
        dotPos: Vec2.create(
          boxWidth() - gapAroundPinDot,
          atY + 0.28 * outputPinSize.size.y,
        ),
        textPos: Vec2.create(
          boxWidth() - 2.0 * gapAroundPinDot - outputPinSize.size.x,
          atY,
        ),
      };
    }
    return result;
  });
  let inputPinPositionMapAccessor = createMemo(() => {
    let result = new Map<string,Vec2>();
    for (let [ name, { dotPos, }, ] of Object.entries(inputPinPositions())) {
      result.set(name, dotPos);
    }
    return result;
  });
  let outputPinPositionMapAccessor = createMemo(() => {
    let result = new Map<string,Vec2>();
    for (let [ name, { dotPos, }, ] of Object.entries(outputPinPositions())) {
      result.set(name, dotPos);
    }
    return result;
  });
  onMount(() => {
    props.node.setRenderSizeAccessor(boxSize);
    props.node.setInputPinPositionMapAccessor(inputPinPositionMapAccessor);
    props.node.setOutputPinPositionMapAccessor(outputPinPositionMapAccessor);
  });
  let transform = createMemo(() => {
    let space = props.node.space();
    let o = space.origin;
    let u = space.u;
    let o2x = o.x;
    let o2y = -o.y;
    let u2x = u.x;
    let u2y = -u.y;
    let v2x = -u2y;
    let v2y = u2x;
    return `matrix(${u2x} ${v2x} ${u2y} ${v2y} ${o2x} ${o2y})`;
  });
  return (
    <g transform={transform()}>
      <rect
        x={0}
        y={-boxHeight()}
        width={boxWidth()}
        height={boxHeight()}
        stroke="black"
        fill={
          props.isSelected ?
            "green" :
          props.isHighlighted ?
            "blue" :
            "white"
        }
        rx="5"
        ry="5"
      />
      <Show when={extraUiSize()}>
        {(extraUiSize) => (
          <Show when={props.node.node.ui?.()} keyed>
            {(UI) => (
              <foreignObject
                x={boxPadding}
                y={-extraUiSize().y - boxPadding}
                width={extraUiSize().x}
                height={extraUiSize().y}
              >
                <UI/>
              </foreignObject>
            )}
          </Show>
        )}
      </Show>
      <text
        x={0.5 * (boxWidth() - titleSize().x)}
        y={-boxHeight() + titleSize().y}
        style="user-select: none;"
      >
        {props.node.node.type.componentType.typeName}
      </text>
      <For each={props.node.node.inputPins?.() ?? []}>
        {(inputPin) => {
          let pos = createMemo(() => inputPinPositions()[inputPin.name]);
          let isEffectPin = inputPin.isEffectPin ?? false;
          return (
            <Show when={pos()}>
              {(pos) => (
                <>
                  <circle
                    cx={pos().dotPos.x}
                    cy={-pos().dotPos.y}
                    r={0.5 * pinDotSize}
                    fill={isEffectPin ? "purple" : "black"}
                  />
                  <text
                    x={pos().textPos.x}
                    y={-pos().textPos.y}
                    font-weight={isEffectPin ? "bold" : "normal"}
                    fill={isEffectPin ? "purple" : "black"}
                  >
                    {inputPin.name}
                  </text>
                </>
              )}
            </Show>
          );
        }}
      </For>
      <For each={props.node.node.outputPins?.() ?? []}>
        {(outputPin) => {
          let pos = createMemo(() => outputPinPositions()[outputPin.name]);
          let isEffectPin = outputPin.isEffectPin ?? false;
          return (
            <Show when={pos()}>
              {(pos) => (
                <>
                  <circle
                    cx={pos().dotPos.x}
                    cy={-pos().dotPos.y}
                    r={0.5 * pinDotSize}
                    fill={isEffectPin ? "purple" : "black"}
                  />
                  <text
                    x={pos().textPos.x}
                    y={-pos().textPos.y}
                    font-weight={isEffectPin ? "bold" : "normal"}
                    fill={isEffectPin ? "purple" : "black"}
                  >
                    {outputPin.name}
                  </text>
                </>
              )}
            </Show>
          );
        }}
      </For>
    </g>
  );
};

const createMeasurementDiv = (() => {
  let refCount = 0;
  let div: HTMLDivElement | undefined;
  return () => {
    if (div != undefined) {
      ++refCount;
    } else {
      div = document.createElement("div");
      div.style.setProperty("position", "absolute");
      div.style.setProperty("left", "-1000px");
      div.style.setProperty("top", "-1000px");
      div.style.setProperty("width", "500px");
      div.style.setProperty("height", "500px");
      document.body.append(div);
      refCount = 1;
    }
    onCleanup(() => {
      --refCount;
      if (refCount == 0) {
        window.queueMicrotask(() => {
          if (refCount == 0 && div != undefined) {
            document.body.removeChild(div);
            div = undefined;
          }
        });
      }
    });
    return div;
  };
})();

const createMeasurementSvg = (() => {
  let refCount = 0;
  let svg: SVGSVGElement | undefined = undefined;
  return () => {
    if (svg != undefined) {
      ++refCount;
    } else {
      svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      svg.style.setProperty("position", "absolute");
      svg.style.setProperty("left", "-1000px");
      svg.style.setProperty("top", "-1000px");
      document.body.append(svg);
      refCount = 1;
    }
    onCleanup(() => {
      --refCount;
      if (refCount == 0) {
        window.queueMicrotask(() => {
          if (refCount == 0 && svg != undefined) {
            document.body.removeChild(svg);
            svg = undefined;
          }
        });
      }
    });
    return svg;
  };
})();

export function calcHorizontalSBezierPaths(start: Vec2, end: Vec2, strength: number = 0.5): {
  beziers: QuadraticBezier[],
} {
  let midPt = start.add(end).multScalar(0.5);
  let bezier1 = new QuadraticBezier({
    start,
    end: midPt,
    controlPoint: Vec2.create(
      start.x * (1.0 - strength) + midPt.x * strength,
      start.y,
    ),
  });
  let bezier2 = new QuadraticBezier({
    start: midPt,
    end,
    controlPoint: Vec2.create(
      end.x * (1.0 - strength) + midPt.x * strength,
      end.y,
    ),
  });
  return {
    beziers: [
      bezier1,
      bezier2,
    ],
  };
}

export function createSBezierPath(startX: number, startY: number, endX: number, endY: number, strength: number = 0.5) {
  // Calculate the midpoint
  const midX = (startX + endX) / 2;
  const midY = (startY + endY) / 2;

  // Determine the direction of the S-curve.
  // This is a simplified approach. For more complex scenarios, you might want to
  // adjust control points more precisely or allow for an explicit 'direction' parameter.
  //const isHorizontal = Math.abs(endX - startX) > Math.abs(endY - startY);
  const isHorizontal = false;

  let controlPoint1X, controlPoint1Y, controlPoint2X, controlPoint2Y;

  if (isHorizontal) {
    // S-curve primarily along the X-axis
    controlPoint1X = startX + (midX - startX) * strength;
    controlPoint1Y = startY + (midY - startY) * (1 - strength); // Pull away from straight line
    controlPoint2X = endX - (endX - midX) * strength;
    controlPoint2Y = endY - (endY - midY) * (1 - strength); // Pull away from straight line
  } else {
    // S-curve primarily along the Y-axis
    controlPoint1X = startX + (midX - startX) * (1 - strength); // Pull away from straight line
    controlPoint1Y = startY + (midY - startY) * strength;
    controlPoint2X = endX - (endX - midX) * (1 - strength); // Pull away from straight line
    controlPoint2Y = endY - (endY - midY) * strength;
  }

  // SVG Path Data:
  // M startX startY - Move to the start point
  // C controlPoint1X controlPoint1Y, controlPoint2X controlPoint2Y, endX endY - Cubic Bezier curve
  return `M ${startX} ${startY} C ${controlPoint1X} ${controlPoint1Y}, ${controlPoint2X} ${controlPoint2Y}, ${endX} ${endY}`;
}
