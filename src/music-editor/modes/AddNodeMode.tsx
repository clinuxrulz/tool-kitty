import { Accessor, Component, createComputed, createMemo, untrack } from "solid-js";
import { Mode } from "../Mode";
import { ModeParams } from "../ModeParams";
import { Complex, EcsWorld, makeDefaultViaTypeSchema, Transform2D, transform2DComponentType, Vec2 } from "../../lib";
import { getNodeTypes } from "../nodes/node_registry";
import { NodesSystem } from "../systems/NodesSystem";
import { RenderSystem } from "../systems/RenderSystem";
import { ReactiveSet } from "@solid-primitives/set";
import { createStore } from "solid-js/store";
import { PickingSystem } from "../systems/PickingSystem";

export class AddNodeMode implements Mode {
  sideForm: Accessor<Component | undefined>;

  constructor(modeParams: ModeParams) {
    let [ state, setState ] = createStore<{
      pan: Vec2,
      scale: number,
      formMousePos: Vec2 | undefined
    }>({
      pan: Vec2.zero,
      scale: 1.0,
      formMousePos: undefined,
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
      nodes: () => nodesSystem.nodes(),
    });
    let nodeUnderMouseById = () => pickingSystem.nodeUnderMouseById();
    let highlightedEntitySet = new ReactiveSet<string>();
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
      highlightedEntitySet,
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
    let svgElement!: SVGSVGElement;
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
    this.sideForm = createMemo(() => () => (
      <svg
        ref={svgElement}
        style={{
          width: "150px",
          height: "100%",
        }}
        onPointerMove={onPointerMove}
      >
        <g>
          <renderSystem.Render/>
        </g>
      </svg>
    ));
  }
}

