import { Accessor, Component, createMemo, For, Show } from "solid-js";
import { EcsWorld } from "../../../ecs/EcsWorld";
import {
  frameComponentType,
  FrameState,
} from "../../components/FrameComponent";
import { Vec2 } from "../../../math/Vec2";
import { RenderParams } from "../RenderParams";
import { IEcsWorld } from "../../../ecs/IEcsWorld";

export class RenderSystem {
  readonly Render: Component;
  readonly RenderOverlay: Component;

  constructor(params: {
    renderParams: RenderParams;
    world: Accessor<IEcsWorld>;
    highlightedEntitiesSet: Accessor<Set<string>>;
    selectedEntitiesSet: Accessor<Set<string>>;
  }) {
    let frameEntityIds = createMemo(() =>
      params.world().entitiesWithComponentType(frameComponentType),
    );
    this.Render = () => undefined;
    this.RenderOverlay = () => {
      return (
        <For each={frameEntityIds()}>
          {(entityId) => {
            let frameState = createMemo<FrameState | undefined>(
              () =>
                params.world().getComponent(entityId, frameComponentType)
                  ?.state,
            );
            let highlighted = createMemo(() =>
              params.highlightedEntitiesSet().has(entityId),
            );
            let selected = createMemo(() =>
              params.selectedEntitiesSet().has(entityId),
            );
            return (
              <Show when={frameState()}>
                {(frameState2) => (
                  <RenderFrame
                    renderParams={params.renderParams}
                    state={frameState2()}
                    highlighted={highlighted()}
                    selected={selected()}
                  />
                )}
              </Show>
            );
          }}
        </For>
      );
    };
  }
}

const RenderFrame: Component<{
  renderParams: RenderParams;
  state: FrameState;
  highlighted: boolean;
  selected: boolean;
}> = (props) => {
  let screenRect = createMemo<
    | {
        pos: Vec2;
        size: Vec2;
      }
    | undefined
  >(() => {
    let pt1 = props.renderParams.worldPtToScreenPt(props.state.pos);
    if (pt1 == undefined) {
      return undefined;
    }
    let pt2 = props.renderParams.worldPtToScreenPt(
      props.state.pos.add(props.state.size),
    );
    if (pt2 == undefined) {
      return undefined;
    }
    let minX = Math.min(pt1.x, pt2.x);
    let minY = Math.min(pt1.y, pt2.y);
    let maxX = Math.max(pt1.x, pt2.x);
    let maxY = Math.max(pt1.y, pt2.y);
    return {
      pos: Vec2.create(minX, minY),
      size: Vec2.create(maxX - minX, maxY - minY),
    };
  });
  let stroke = createMemo(() => {
    if (props.selected && props.highlighted) {
      return "cyan";
    } else if (props.selected) {
      return "green";
    } else if (props.highlighted) {
      return "blue";
    } else {
      return "black";
    }
  });
  return (
    <Show when={screenRect()}>
      {(screenRect2) => (
        <rect
          x={screenRect2().pos.x}
          y={screenRect2().pos.y}
          width={screenRect2().size.x}
          height={screenRect2().size.y}
          stroke={stroke()}
          stroke-width="2"
          fill="none"
          pointer-events="none"
        />
      )}
    </Show>
  );
};
