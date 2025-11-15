import { Accessor, createComputed, createMemo, createSignal, mapArray, onCleanup, untrack } from "solid-js";
import { Node } from "../Node";
import { QuadraticBezier, Transform2D } from "tool-kitty-math";
import { EcsComponent, IEcsWorld } from "tool-kitty-ecs";
import { transform2DComponentType } from "tool-kitty-math-ecs";
import { Vec2 } from "tool-kitty-math";
import { createJoinDefined, opToArr, whenDefined } from "tool-kitty-util";
import { ReactiveMap } from "@solid-primitives/map";
import { NodeRegistry } from "../NodeRegistry";
import { calcHorizontalSBezierPaths } from "./RenderSystem";

export type NodesSystemNode<TYPE_EXT,INST_EXT> = {
  node: Node<TYPE_EXT,INST_EXT,any>,
  space: Accessor<Transform2D>,
  setSpace: (x: Transform2D) => void,
  setRenderSizeAccessor: (x: Accessor<Vec2 | undefined> | undefined) => void,
  setInputPinPositionMapAccessor: (x: Accessor<Map<string,Vec2>>) => void,
  setOutputPinPositionMapAccessor: (x: Accessor<Map<string,Vec2>>) => void,
  renderSize: Accessor<Vec2 | undefined>,
  inputPinPositionMap: Accessor<Map<string,Vec2> | undefined>,
  outputPinPositionMap: Accessor<Map<string,Vec2> | undefined>,
}

export class NodesSystem<TYPE_EXT,INST_EXT> {
  nodes: Accessor<NodesSystemNode<TYPE_EXT,INST_EXT>[]>;
  edges: Accessor<{
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
  }[]>;
  lookupNodeById: (nodeId: string) => NodesSystemNode<TYPE_EXT,INST_EXT> | undefined;
  disablePan: Accessor<boolean>;

  constructor(params: {
    nodeRegistry: NodeRegistry<TYPE_EXT,INST_EXT>,
    world: Accessor<IEcsWorld>,
  }) {
    let nodeRegistry = params.nodeRegistry;
    let nodes_ = createMemo(mapArray(
      () => params.world().entities(),
      (entity) => {
        let nodeTypeWithNodeComponent = createMemo(() => {
          for (let component of params.world().getComponents(entity)) {
            let nodeType2 = nodeRegistry.lookupNodeType(component.type.typeName);
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
          let [ inputPinPositionMapAccessor, setInputPinPositionMapAccessor ] = createSignal<Accessor<Map<string,Vec2>>>();
          let [ outputPinPositionMapAccessor, setOutputPinPositionMapAccessor ] = createSignal<Accessor<Map<string,Vec2>>>();
          let nodesSystemNode: NodesSystemNode<TYPE_EXT,INST_EXT> = {
            node,
            space,
            setSpace,
            setRenderSizeAccessor: (x) => setRenderSizeAccessor(() => x),
            setInputPinPositionMapAccessor: (x) => setInputPinPositionMapAccessor(() => x),
            setOutputPinPositionMapAccessor: (x) => setOutputPinPositionMapAccessor(() => x),
            renderSize: () => renderSizeAccessor()?.(),
            inputPinPositionMap: () => inputPinPositionMapAccessor()?.(),
            outputPinPositionMap: () => outputPinPositionMapAccessor()?.(),
          };
          return nodesSystemNode;
        });
      },
    ));
    let nodes = createMemo(() => nodes_().flatMap((node) => opToArr(node())));
    let nodeIdTToNodeMap = new ReactiveMap<string,NodesSystemNode<TYPE_EXT,INST_EXT>>();
    let firewall = createMemo(() => {
      mapArray(
        nodes,
        (node) => {
          let nodeId = node.node.nodeParams.entity;
          nodeIdTToNodeMap.set(
            nodeId,
            node,
          );
          onCleanup(() => {
            nodeIdTToNodeMap.delete(nodeId)
          });
        },
      )();
      return undefined;
    });
    let lookupNodeById = (nodeId: string): NodesSystemNode<TYPE_EXT,INST_EXT> | undefined => {
      firewall();
      return nodeIdTToNodeMap.get(nodeId);
    };
    let edges_ = createMemo(mapArray(
      nodes,
      (node) => createMemo(mapArray(
        () => node.node.inputPins?.() ?? [],
        (inputPin) => {
          return createJoinDefined(whenDefined(
            () => inputPin.source(),
            (source) => {
              return createJoinDefined(whenDefined(
                createMemo(() => lookupNodeById(source().target)),
                (sourceNode) => {
                  let fromPt = createMemo(() => {
                    let sourceNode2 = sourceNode();
                    if (sourceNode2 == undefined) {
                      return undefined;
                    }
                    let pt = sourceNode2.outputPinPositionMap()?.get(source().pin);
                    if (pt == undefined) {
                      return undefined;
                    }
                    return sourceNode2.space().pointFromSpace(pt);
                  });
                  return createJoinDefined(whenDefined(
                    fromPt,
                    (fromPt) => {
                      let toPt = createMemo(() => {
                        let pt = node.inputPinPositionMap()?.get(inputPin.name);
                        if (pt == undefined) {
                          return undefined;
                        }
                        return node.space().pointFromSpace(pt);
                      });
                      return createJoinDefined(whenDefined(
                        toPt,
                        (toPt) => {
                          return createMemo(() => {
                            let { beziers } = calcHorizontalSBezierPaths(
                              fromPt(),
                              toPt(),
                            );
                            return {
                              id: crypto.randomUUID(),
                              source: source(),
                              sink: {
                                target: node.node.nodeParams.entity,
                                pin: inputPin.name,
                              },
                              beziers,
                            };
                          });
                        },
                      ));
                    },
                  ))
                },
              ));
            },
          ));
        },
      )),
    ));
    let edges = createMemo(() =>
      edges_().flatMap((x) => x().flatMap((x) => opToArr(x())))
    );
    this.nodes = nodes;
    this.edges = edges;
    this.lookupNodeById = lookupNodeById;
    this.disablePan = createMemo(() => {
      for (let node of nodes()) {
        if (node.node.disablePan?.() ?? false) {
          return true;
        }
      }
      return false;
    });
  }
}
