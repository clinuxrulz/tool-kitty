import { Accessor, Component, createComputed, createMemo, createRoot, For, mapArray, onCleanup, onMount, Show } from "solid-js";
import { NodesSystemNode } from "./NodesSystem";
import { Vec2 } from "../../lib";
import { ReactiveSet } from "@solid-primitives/set";

export class RenderSystem {
  Render: Component;

  constructor(params: {
    nodes: Accessor<NodesSystemNode[]>,
    highlightedEntitySet: ReactiveSet<string>,
    selectedEntitySet: ReactiveSet<string>,
  }) {

    this.Render = () => (
      <For each={params.nodes()}>
        {(node) => (
          <RenderNode
            node={node}
            isHighlighted={
              params.highlightedEntitySet.has(node.node.nodeParams.entity)
            }
            isSelected={
              params.selectedEntitySet.has(node.node.nodeParams.entity)
            }
          />)}
      </For>
    );
  }
}

const RenderNode: Component<{
  node: NodesSystemNode,
  isHighlighted: boolean,
  isSelected: boolean,
}> = (props) => {
  let titleSize = createMemo(() => {
      let { svg, dispose, } = createRoot((dispose) => {
        return {
          svg: createMeasurementSvg(),
          dispose,
        }
      });
      let text = document.createElementNS("http://www.w3.org/2000/svg", "text");
      let text2 = document.createTextNode(props.node.node.type.componentType.typeName);
      text.appendChild(text2);
      svg.appendChild(text);
      let size = text.getBBox();
      dispose();
      return Vec2.create(size.width, size.height);
  });
  let inputPinSizes = createMemo(mapArray(
    () => props.node.node.inputPins?.() ?? [],
    (inputPin) => {
      let { svg, dispose, } = createRoot((dispose) => {
        return {
          svg: createMeasurementSvg(),
          dispose,
        }
      });
      let text = document.createElementNS("http://www.w3.org/2000/svg", "text");
      let text2 = document.createTextNode(inputPin.name);
      text.appendChild(text2);
      svg.appendChild(text);
      let size = text.getBBox();
      dispose();
      return {
        name: inputPin.name,
        size: Vec2.create(size.width, size.height),
      };
    },
  ));
  let outputPinSizes = createMemo(mapArray(
    () => props.node.node.outputPins?.() ?? [],
    (outputPin) => {
      let { svg, dispose, } = createRoot((dispose) => {
        return {
          svg: createMeasurementSvg(),
          dispose,
        }
      });
      let text = document.createElementNS("http://www.w3.org/2000/svg", "text");
      let text2 = document.createTextNode(outputPin.name);
      text.appendChild(text2);
      svg.appendChild(text);
      let size = text.getBBox();
      dispose();
      return {
        name: outputPin.name,
        size: Vec2.create(size.width, size.height),
      };
    },
  ));
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
    ) + 2.0 * boxPadding;
  });
  let boxWidth = createMemo(() => {
    return Math.max(
      titleSize().x,
      inputPinsMaxWidth() + outputPinsMaxWidth() + 4.0 * gapAroundPinDot
    ) + 2.0 * boxPadding;
  });
  let boxSize = createMemo(() => Vec2.create(boxWidth(), boxHeight()));
  onMount(() => {
    props.node.setRenderSizeAccessor(boxSize);
  });
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
      <text
        x={0.5 * (boxWidth() - titleSize().x)}
        y={-boxHeight() + titleSize().y}
      >
        {props.node.node.type.componentType.typeName}
      </text>
      <For each={props.node.node.inputPins?.() ?? []}>
        {(inputPin) => {
          let pos = createMemo(() => inputPinPositions()[inputPin.name]);
          return (
            <Show when={pos()}>
              {(pos) => (
                <>
                  <circle
                    cx={pos().dotPos.x}
                    cy={-pos().dotPos.y}
                    r={0.5 * pinDotSize}
                    fill="black"
                  />
                  <text
                    x={pos().textPos.x}
                    y={-pos().textPos.y}
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
          return (
            <Show when={pos()}>
              {(pos) => (
                <>
                  <circle
                    cx={pos().dotPos.x}
                    cy={-pos().dotPos.y}
                    r={0.5 * pinDotSize}
                    fill="black"
                  />
                  <text
                    x={pos().textPos.x}
                    y={-pos().textPos.y}
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
