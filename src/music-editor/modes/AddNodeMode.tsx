import { Accessor, Component, createComputed, createMemo, untrack } from "solid-js";
import { Mode } from "../Mode";
import { ModeParams } from "../ModeParams";
import { Complex, EcsWorld, makeDefaultViaTypeSchema, Transform2D, transform2DComponentType, Vec2 } from "../../lib";
import { getNodeTypes } from "../nodes/node_registry";
import { NodesSystem } from "../systems/NodesSystem";
import { RenderSystem } from "../systems/RenderSystem";
import { ReactiveSet } from "@solid-primitives/set";

export class AddNodeMode implements Mode {
  sideForm: Accessor<Component | undefined>;

  constructor(modeParams: ModeParams) {
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
    let nodesSystem = new NodesSystem({
      world: () => world,
    });
    let renderSystem = new RenderSystem({
      nodes: () => nodesSystem.nodes(),
      highlightedEntitySet: new ReactiveSet(),
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
    this.sideForm = createMemo(() => () => (
      <svg
        style={{
          width: "150px",
          height: "100%",
        }}
      >
        <g>
          <renderSystem.Render/>
        </g>
      </svg>
    ));
  }
}

