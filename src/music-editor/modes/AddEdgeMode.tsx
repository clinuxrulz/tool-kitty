import { Accessor, Component, createMemo, Show } from "solid-js";
import { Mode } from "../Mode";
import { ModeParams } from "../ModeParams";
import { Pin } from "../components/Pin";
import { createSBezierPath } from "../systems/RenderSystem";

export class AddEdgeMode implements Mode {
  overlaySvg: Component;
  dragEnd: () => void;
  disablePan = () => true;

  constructor(params: {
    modeParams: ModeParams,
    fromNodeId: string,
    fromPin: { type: "Output", name: string, },
  }) {
    let modeParams = params.modeParams;
    let fromNode = createMemo(() =>
      modeParams.nodesSystem.lookupNodeById(params.fromNodeId)
    );
    let fromPt = createMemo(() => {
      let fromNode2 = fromNode();
      if (fromNode2 == undefined) {
        return undefined;
      }
      let pt = fromNode2.outputPinPositionMap()?.get(params.fromPin.name);
      if (pt == undefined) {
        return undefined;
      }
      return fromNode2.space().pointFromSpace(pt);
    });
    let wipToPt = createMemo(() => {
      let mousePos = modeParams.mousePos();
      if (mousePos == undefined) {
        return undefined;
      }
      return modeParams.screenPtToWorldPt(mousePos);
    });
    let toNodePinUnderMouse = createMemo(() => {
      let nodeId = modeParams.pickingSystem.nodeUnderMouseById();
      if (nodeId == undefined) {
        return undefined;
      }
      let node = modeParams.nodesSystem.lookupNodeById(nodeId);
      if (node == undefined) {
        return undefined;
      }
      let pin = modeParams.pickingSystem.pinUnderMouse();
      if (pin?.type != "Input") {
        return undefined;
      }
      return {
        nodeId,
        node,
        pin,
      };
    });
    this.overlaySvg = () => (
      <Show when={fromPt()}>
        {(fromPt) => (
          <Show when={wipToPt()}>
            {(toPt) => {
              let d = createMemo(() =>
                createSBezierPath(
                  fromPt().x,
                  -fromPt().y,
                  toPt().x,
                  -toPt().y,
                  0.0,
                )
              );
              let hasToPinUnderMouse = createMemo(() => toNodePinUnderMouse() != undefined);
              return (
                <path
                  d={d()}
                  fill="none"
                  stroke={hasToPinUnderMouse() ? "blue" : "red"}
                  stroke-width={2.0}
                  pointer-events="none"
                  vector-effect="non-scaling-stroke"
                />
              );
            }}
          </Show>
        )}
      </Show>
    );
    this.dragEnd = () => {
      let toPin = toNodePinUnderMouse();
      if (toPin != undefined) {
        let fromNode2 = fromNode();
        if (fromNode2 != undefined) {
          let outputPins = fromNode2.node.outputPins?.() ?? [];
          let outputPin: (typeof outputPins)[number] | undefined;
          for (let outputPin2 of outputPins) {
            if (outputPin2.name == params.fromPin.name) {
              outputPin = outputPin2;
              break;
            }
          }
          if (outputPin != undefined) {
            let inputPins = toPin.node.node.inputPins?.() ?? [];
            for (let inputPin of inputPins) {
              if (inputPin.name == toPin.pin.name) {
                {
                  let edge: Pin = {
                    target: toPin.nodeId,
                    pin: toPin.pin.name,
                  };
                  let alreadyHas = false;
                  for (let pin of outputPin.sinks()) {
                    if (pin.target == edge.target && pin.pin == edge.pin) {
                      alreadyHas = true;
                      break;
                    }
                  }
                  if (!alreadyHas) {
                    outputPin.setSinks([
                      ...outputPin.sinks(),
                      edge
                    ]);
                  }
                }
                {
                  let edge: Pin = {
                    target: params.fromNodeId,
                    pin: params.fromPin.name,
                  };
                  inputPin.setSource(edge);
                }
              }
            }
          }
        }
      }
      modeParams.onDone();
    };
  }
}
