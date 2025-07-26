import { Accessor, createMemo, createSignal, mapArray, untrack } from "solid-js";
import { Node } from "../Node";
import { Transform2D } from "../../math/Transform2D";
import { IEcsWorld } from "../../ecs/IEcsWorld";
import { lookupNodeType } from "../nodes/node_registry";
import { EcsComponent, transform2DComponentType, Vec2 } from "../../lib";
import { opToArr } from "../../kitty-demo/util";

export type NodesSystemNode = {
  node: Node<any>,
  space: Accessor<Transform2D>,
  setSpace: (x: Transform2D) => void,
  setRenderSizeAccessor: (x: Accessor<Vec2 | undefined> | undefined) => void,
  renderSize: Accessor<Vec2 | undefined>,
}

export class NodesSystem {
  nodes: Accessor<NodesSystemNode[]>;

  constructor(params: {
    world: Accessor<IEcsWorld>,
  }) {
    let nodes_ = createMemo(mapArray(
      () => params.world().entities(),
      (entity) => {
        let nodeTypeWithNodeComponent = createMemo(() => {
          for (let component of params.world().getComponents(entity)) {
            let nodeType2 = lookupNodeType(component.type.typeName);
            if (nodeType2 != undefined) {
              return {
                nodeType: nodeType2,
                nodeComponent: component,
              };
            }
          }
          return undefined;
        });
        return createMemo(() => {
          let nodeTypeWithNodeComponent2 = nodeTypeWithNodeComponent();
          if (nodeTypeWithNodeComponent2 == undefined) {
            return undefined;
          }
          let { nodeType, nodeComponent } = nodeTypeWithNodeComponent2;
          let nodeComponent2 = nodeComponent as EcsComponent<any>;
          let node = nodeType.create({
            entity,
            state: nodeComponent2.state,
            setState: nodeComponent2.setState,
          });
          let space = createMemo(() => {
            return params.world().getComponent(entity, transform2DComponentType)?.state.transform ?? Transform2D.identity;
          });
          let setSpace = (x: Transform2D) => untrack(() => {
            let transformComponent = params.world().getComponent(entity, transform2DComponentType);
            if (transformComponent == undefined) {
              transformComponent = transform2DComponentType.create({
                transform: x,
              });
              params.world().setComponents(
                entity,
                [
                  transformComponent,
                ]
              );
            } else {
              transformComponent.setState("transform", x);
            }
          });
          let [ renderSizeAccessor, setRenderSizeAccessor, ] = createSignal<Accessor<Vec2 | undefined>>();
          let nodesSystemNode: NodesSystemNode = {
            node,
            space,
            setSpace,
            setRenderSizeAccessor: (x) => setRenderSizeAccessor(() => x),
            renderSize: () => renderSizeAccessor()?.()
          };
          return nodesSystemNode;
        });
      },
    ));
    this.nodes = createMemo(() => nodes_().flatMap((node) => opToArr(node())));
  }
}
