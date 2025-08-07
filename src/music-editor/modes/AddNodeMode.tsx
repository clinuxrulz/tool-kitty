import { Accessor, Component, createComputed, createMemo, createSignal, onCleanup, onMount, Show, untrack } from "solid-js";
import { Mode } from "../Mode";
import { ModeParams } from "../ModeParams";
import { Complex, EcsWorld, makeDefaultViaTypeSchema, Transform2D, transform2DComponentType, Vec2 } from "../../lib";
import { getNodeTypes } from "../nodes/node_registry";
import { NodesSystem } from "../systems/NodesSystem";
import { RenderSystem } from "../systems/RenderSystem";
import { ReactiveSet } from "@solid-primitives/set";
import { createStore } from "solid-js/store";
import { PickingSystem } from "../systems/PickingSystem";
import { NodeType } from "../Node";
import { NoTrack } from "../../util";

export class AddNodeMode implements Mode {
  instructions: Component;
  overlayHtmlUi: Component;
  sideForm: Accessor<Component | undefined>;

  constructor(modeParams: ModeParams) {
    let [ state, setState ] = createStore<{
      pan: Vec2,
      scale: number,
      formMousePos: Vec2 | undefined,
      dragging: NoTrack<{
        nodeType: NodeType<any>,
        nodeSize: Vec2,
        pickupOffset: Vec2,
      }> | undefined,
    }>({
      pan: Vec2.zero,
      scale: 1.0,
      formMousePos: undefined,
      dragging: undefined,
    });
    // mini world for showing nodes we can select
    let world = new EcsWorld();
    let atY = 0.0;
    for (let nodeType of getNodeTypes()) {
      atY -= 80;
      world.createEntity([
        nodeType.componentType.create(
          makeDefaultViaTypeSchema(
            nodeType.componentType.typeSchema,
          ),
        ),
        transform2DComponentType.create({
          transform: Transform2D.create(
            Vec2.create(0, atY),
            Complex.rot0,
          ),
        }),
      ]);
    }
    let screenPtToWorldPt = (screenPt: Vec2): Vec2 | undefined => {
      return Vec2.create(
        state.pan.x + screenPt.x / state.scale,
        -(state.pan.y + screenPt.y / state.scale),
      );
    };
    let worldPtToScreenPt = (worldPt: Vec2): Vec2 | undefined => {
      return Vec2.create(
        (worldPt.x - state.pan.x) * state.scale,
        ((-worldPt.y) - state.pan.y) * state.scale,
      );
    };
    let nodesSystem = new NodesSystem({
      world: () => world,
    });
    let pickingSystem = new PickingSystem({
      mousePos: () => state.formMousePos,
      screenPtToWorldPt,
      worldPtToScreenPt,
      nodes: () => nodesSystem.nodes(),
    });
    let nodeUnderMouseById = () => pickingSystem.nodeUnderMouseById();
    let highlightedEntitySet = new ReactiveSet<string>();
    let selectedEntitySet = new ReactiveSet<string>();
    createComputed(() => {
      let nodeId = nodeUnderMouseById();
      if (nodeId == undefined) {
        highlightedEntitySet.clear();
      } else {
        highlightedEntitySet.clear();
        highlightedEntitySet.add(nodeId);
      }
    });
    let renderSystem = new RenderSystem({
      nodes: () => nodesSystem.nodes(),
      lookupNodeById: (nodeId) => nodesSystem.lookupNodeById(nodeId),
      highlightedEntitySet,
      selectedEntitySet,
    });
    let nodePositions = createMemo(() => {
      let result: {
        [ entity: string ]: Vec2,
      } = {};
      let atY = 0;
      for (let node of nodesSystem.nodes()) {
        let size = node.renderSize();
        if (size == undefined) {
          return undefined;
        }
        atY -= size.y;
        result[node.node.nodeParams.entity] = Vec2.create(0, atY);
      }
      return result;
    });
    let svgPaletteHeight = createMemo(() => {
      let nodePositions2 = nodePositions();
      if (nodePositions2 == undefined) {
        return 0.0;
      }
      let minAtY = 0.0;
      for (let pt of Object.values(nodePositions2)) {
        minAtY = Math.min(minAtY, pt.y);
      }
      return Math.abs(minAtY);
    });
    createComputed(() => {
      let nodePositions2 = nodePositions();
      if (nodePositions2 == undefined) {
        return;
      }
      for (let entity of world.entities()) {
        untrack(() => {
          let pos = nodePositions2[entity];
          if (pos == undefined) {
            return;
          }
          let transformComponent = world.getComponent(entity, transform2DComponentType);
          if (transformComponent == undefined) {
            return;
          }
          transformComponent.setState(
            "transform",
            Transform2D.create(pos, Complex.rot0)
          );
        });
      }
    });
    let [ overlayDiv, setOverlayDiv, ] = createSignal<HTMLDivElement>();
    let svgElement!: SVGSVGElement;
    let onPointerDown = (e: PointerEvent) => {
      {
        let rect = svgElement.getBoundingClientRect();
        setState(
          "formMousePos",
          Vec2.create(
            e.clientX - rect.left,
            e.clientY - rect.top,
          ),
        );
      }
      svgElement.setPointerCapture(e.pointerId);
      queueMicrotask(() => {
        let mousePos = state.formMousePos;
        if (mousePos == undefined) {
          return;
        }
        let nodeUnderMouseById2 = nodeUnderMouseById();
        if (nodeUnderMouseById2 == undefined) {
          return;
        }
        let node = nodesSystem.lookupNodeById(nodeUnderMouseById2);
        if (node == undefined) {
          return;
        }
        let nodePos = node.space().origin;
        let pt = screenPtToWorldPt(mousePos);
        if (pt == undefined) {
          return;
        }
        setState("dragging", new NoTrack({
          nodeType: node.node.type,
          nodeSize: node.renderSize() ?? Vec2.create(100, 50),
          pickupOffset: pt.sub(nodePos),
        }));
      });
    };
    let onPointerUp = (e: PointerEvent) => {
      svgElement.releasePointerCapture(e.pointerId);
      let overlayDiv2 = overlayDiv();
      if (state.formMousePos != undefined && state.dragging != undefined && overlayDiv2 != undefined) {
        let formMousePos = state.formMousePos;
        let rect = svgElement.getBoundingClientRect();
        let rect2 = overlayDiv2.getBoundingClientRect();
        let pickOffset = state.dragging.value.pickupOffset;
        let pt = Vec2.create(
          rect.left - rect2.left + formMousePos.x - pickOffset.x,
          rect.top - rect2.top + formMousePos.y + pickOffset.y,
        );
        let pt2 = modeParams.screenPtToWorldPt(pt);
        if (pt2 == undefined) {
          return;
        }
        let dropWorld = modeParams.world();
        dropWorld.createEntity([
          state.dragging.value.nodeType.componentType.create(
            makeDefaultViaTypeSchema(state.dragging.value.nodeType.componentType.typeSchema),
          ),
          transform2DComponentType.create({
            transform: Transform2D.create(
              pt2,
              Complex.rot0,
            )
          }),
        ]);
        setState("dragging", undefined);
      }
    };
    let onPointerMove = (e: PointerEvent) => {
      let rect = svgElement.getBoundingClientRect();
      setState(
        "formMousePos",
        Vec2.create(
          e.clientX - rect.left,
          e.clientY - rect.top,
        ),
      );
    };
    this.instructions = () => (
      <button
        class="btn btn-primary"
        onClick={() => {
          modeParams.onDone();
        }}
      >
        End Mode
      </button>
    );
    this.overlayHtmlUi = () => (
      <Show when={state.dragging?.value}>
        {(draging) => (
          <Show when={state.formMousePos}>
            {(pt) => {
              let [ blockPt2, setBlockPt2, ] = createSignal(true);
              onCleanup(() => {
                setOverlayDiv(undefined);
              });
              onMount(() => setBlockPt2(false));
              let pt2 = createMemo(() => {
                if (blockPt2()) {
                  return undefined;
                }
                let overlayDiv2 = overlayDiv();
                if (overlayDiv2 == undefined) {
                  return undefined;
                }
                let rect = svgElement.getBoundingClientRect();
                let rect2 = overlayDiv2.getBoundingClientRect();
                return pt().add(Vec2.create(
                  rect.left-rect2.left-draging().pickupOffset.x,
                  rect.top-rect2.top-draging().nodeSize.y+draging().pickupOffset.y,
                ));
              });
              let dragWorld = new EcsWorld();
              let dragEntity = dragWorld.createEntity([
                untrack(() => draging().nodeType.componentType.create(
                  makeDefaultViaTypeSchema(
                    draging().nodeType.componentType.typeSchema,
                  ),
                )),
                transform2DComponentType.create({
                  transform: Transform2D.create(
                    Vec2.create(0, untrack(() => -draging().nodeSize.y)),
                    Complex.rot0,
                  ),
                }),
              ]);
              let dragNodesSystem = new NodesSystem({
                world: () => dragWorld,
              });
              let dragRenderSystem = new RenderSystem({
                nodes: () => dragNodesSystem.nodes(),
                lookupNodeById: (nodeId) => dragNodesSystem.lookupNodeById(nodeId),
                highlightedEntitySet: new ReactiveSet([ dragEntity, ]),
                selectedEntitySet: new ReactiveSet(),
              });
              return (
                <div
                  ref={setOverlayDiv}
                  style={{
                    "position": "absolute",
                    "left": "0",
                    "top": "0",
                    "right": "0",
                    "bottom": "0",
                    "pointer-events": "none",
                  }}
                >
                  <Show when={pt2()}>
                    {(pt2) => (
                      <svg
                        style={{
                          position: "absolute",
                          left: `${pt2().x}px`,
                          top: `${pt2().y}px`,
                          width: `${draging().nodeSize.x}px`,
                          height: `${draging().nodeSize.y}px`,
                          "touch-action": "none",
                          "user-select": "none",
                        }}
                      >
                        <dragRenderSystem.Render/>
                      </svg>
                    )}
                  </Show>
                </div>
              );
            }}
          </Show>
        )}
      </Show>
    );
    this.sideForm = createMemo(() => () => (
      <div
        style={{
          width: "150px",
          height: "100%",
          "overflow-x": "hidden",
          "overflow-y": "auto",
        }}
      >
        <svg
          ref={svgElement}
          style={{
            width: "100%",
            height: `${svgPaletteHeight()}px`,
            "touch-action": "pan-y",
            "user-select": "none",
          }}
          onPointerDown={onPointerDown}
          onPointerUp={onPointerUp}
          onPointerMove={onPointerMove}
        >
          <g>
            <renderSystem.Render/>
          </g>
        </svg>
      </div>
    ));
  }
}

