import { Accessor, Component, createMemo, For, Index, Show } from "solid-js";
import { EcsWorld } from "../../../ecs/EcsWorld";
import { RenderParams } from "../RenderParams";
import {
  levelComponentType,
  LevelState,
} from "../../components/LevelComponent";
import { FrameState } from "../../components/FrameComponent";
import { IEcsWorld } from "../../../ecs/IEcsWorld";
import { spawnComponentType, SpawnState } from "../../components/SpawnComponent";

export class RenderSystem {
  readonly Render: Component;
  readonly RenderOverlay: Component;

  constructor(params: {
    renderParams: RenderParams;
    world: Accessor<IEcsWorld>;
    highlightedEntitiesSet: Accessor<Set<string>>;
    selectedEntitiesSet: Accessor<Set<string>>;
  }) {
    let tileWidth = params.renderParams.tileWidth;
    let tileHeight = params.renderParams.tileHeight;
    let level: Accessor<LevelState | undefined>;
    {
      let levelEntities = createMemo(() =>
        params.world().entitiesWithComponentType(levelComponentType),
      );
      level = createMemo(() => {
        let levelEntities2 = levelEntities();
        if (levelEntities2.length != 1) {
          return undefined;
        }
        let levelEntity = levelEntities2[0];
        return params.world().getComponent(levelEntity, levelComponentType)
          ?.state;
      });
    }
    let imageFrameLookupMap = createMemo(() => {
      let textureAtlases = params.renderParams.textureAtlases();
      if (textureAtlases.type != "Success") {
        return undefined;
      }
      let result = new Map<
        string,
        Map<
          string,
          {
            image: HTMLImageElement;
            frame: FrameState;
          }
        >
      >();
      for (let x of textureAtlases.value) {
        let textureAtlasRef = x.textureAtlasFilename();
        let image = x.image;
        for (let frame of x.frames) {
          let tmp = result.get(textureAtlasRef);
          if (tmp == undefined) {
            tmp = new Map<
              string,
              {
                image: HTMLImageElement;
                frame: FrameState;
              }
            >();
            result.set(textureAtlasRef, tmp);
          }
          tmp.set(frame.frameId, {
            image,
            frame: frame.frame,
          });
        }
      }
      return result;
    });
    //
    this.Render = () => (
      <Show when={level()}>
        {(level2) => (
          <>
            <Index each={JSON.parse(JSON.stringify(level2().mapData))}>
              {(row, i) => {
                let posY = i * tileHeight();
                return (
                  <Index each={row()}>
                    {(cell, j) => (
                      <RenderCell
                        renderParams={params.renderParams}
                        cell={cell()}
                        imageFrameLookupMap={imageFrameLookupMap()}
                        j={j}
                        posY={posY}
                        tileWidth={tileWidth()}
                        tileHeight={tileHeight()}
                      />
                    )}
                  </Index>
                );
              }}
            </Index>
            <For each={params.world().entitiesWithComponentType(spawnComponentType)}>
              {(spawnEntity) => {
                let spawn = createMemo(() => params.world().getComponent(spawnEntity, spawnComponentType)?.state);
                return (
                  <Show when={spawn()} keyed>
                    {(spawn) => (
                      <RenderSpawn
                        spawn={spawn}
                        renderParams={params.renderParams}
                        imageFrameLookupMap={imageFrameLookupMap()}
                        tileWidth={tileWidth()}
                        tileHeight={tileHeight()}
                      />
                    )}
                  </Show>
                );
              }}
            </For>
            <For
              each={Array(level2().mapData.length + 1)
                .fill(undefined)
                .map((_, i) => i * tileHeight())}
            >
              {(y) => (
                <line
                  x1="-1"
                  y1={y}
                  x2={level2().mapData[0].length * tileWidth() + 1}
                  y2={y}
                  stroke="black"
                  stroke-width="2"
                />
              )}
            </For>
            <For
              each={Array((level2().mapData?.[0].length ?? -1) + 1)
                .fill(undefined)
                .map((_, j) => j * tileWidth())}
            >
              {(x) => (
                <line
                  x1={x}
                  y1="-1"
                  x2={x}
                  y2={level2().mapData.length * tileHeight() + 1}
                  stroke="black"
                  stroke-width="2"
                />
              )}
            </For>
          </>
        )}
      </Show>
    );
    this.RenderOverlay = () => undefined;
  }
}

const RenderCell: Component<{
  renderParams: RenderParams;
  cell: number;
  imageFrameLookupMap:
    | Map<
        string,
        Map<
          string,
          {
            image: HTMLImageElement;
            frame: FrameState;
          }
        >
      >
    | undefined;
  j: number;
  posY: number;
  tileWidth: number;
  tileHeight: number;
}> = (props) => {
  let cell = () => props.cell;
  let imageFrameLookupMap = () => props.imageFrameLookupMap;
  let j = props.j;
  let posY = props.posY;
  let tileWidth = () => props.tileWidth;
  let tileHeight = () => props.tileHeight;
  let frame = createMemo(() => {
    let tmp = props.renderParams.tileIndexToFrameMap();
    if (tmp == undefined) {
      return undefined;
    }
    let tmp2 = tmp.get(cell());
    if (tmp2 == undefined) {
      return undefined;
    }
    let frameRef = tmp2.frameRef;
    let textureAtlasRef = tmp2.textureAtlasRef;
    let imageFrameLookupMap2 = imageFrameLookupMap();
    if (imageFrameLookupMap2 == undefined) {
      return undefined;
    }
    let tmp3 = imageFrameLookupMap2.get(textureAtlasRef)?.get(frameRef);
    return tmp3;
  });
  let posX = j * tileWidth();
  let showTileIds = () => false;
  return (
    <>
      <Show when={showTileIds()}>
        <text
          x={posX + 0.5 * tileWidth()}
          y={posY + 0.5 * tileHeight()}
          text-anchor="middle"
          dominant-baseline="middle"
        >
          {cell()}
        </text>
        *
      </Show>
      <Show when={frame()}>
        {(frame2) => {
          let frame3 = () => frame2().frame;
          let image = () => frame2().image;
          let scaleX = createMemo(
            () =>
              (props.renderParams.tileWidth() * frame3().numCells.x) /
              frame3().size.x,
          );
          let scaleY = createMemo(
            () =>
              (props.renderParams.tileHeight() * frame3().numCells.y) /
              frame3().size.y,
          );
          let backgroundWidth = createMemo(() => image().width * scaleX());
          let backgroundHeight = createMemo(() => image().height * scaleY());
          let imageUrl = () => image().src;
          return (
            <image
              x={posX - frame3().pos.x * scaleX()}
              y={posY - frame3().pos.y * scaleY()}
              width={backgroundWidth()}
              height={backgroundHeight()}
              style={{
                "image-rendering": "pixelated",
              }}
              href={imageUrl()}
              attr:clip-path={
                `inset(` +
                `${frame3().pos.y * scaleY()}px ` +
                `${(image().width - frame3().pos.x - frame3().size.x) * scaleX()}px ` +
                `${(image().height - frame3().pos.y - frame3().size.y) * scaleY()}px ` +
                `${frame3().pos.x * scaleX()}px` +
                `)`
              }
              preserveAspectRatio="none"
            />
          );
        }}
      </Show>
    </>
  );
};

const RenderSpawn: Component<{
  renderParams: RenderParams;
  spawn: SpawnState;
  imageFrameLookupMap:
    | Map<
        string,
        Map<
          string,
          {
            image: HTMLImageElement;
            frame: FrameState;
          }
        >
      >
    | undefined;
  tileWidth: number;
  tileHeight: number;
}> = (props) => {
  let imageFrameLookupMap = () => props.imageFrameLookupMap;
  let frame = createMemo(() => {
    let textureAtlasRef = props.spawn.textureAtlasFilename;
    let frameRef = props.spawn.frameId;
    let imageFrameLookupMap2 = imageFrameLookupMap();
    if (imageFrameLookupMap2 == undefined) {
      return undefined;
    }
    let tmp3 = imageFrameLookupMap2.get(textureAtlasRef)?.get(frameRef);
    return tmp3;
  });
  return (
    <>
      <Show when={frame()}>
        {(frame2) => {
          let frame3 = () => frame2().frame;
          let image = () => frame2().image;
          let scaleX = createMemo(
            () =>
              (props.renderParams.tileWidth() * frame3().numCells.x) /
              frame3().size.x,
          );
          let scaleY = createMemo(
            () =>
              (props.renderParams.tileHeight() * frame3().numCells.y) /
              frame3().size.y,
          );
          let backgroundWidth = createMemo(() => image().width * scaleX());
          let backgroundHeight = createMemo(() => image().height * scaleY());
          let imageUrl = () => image().src;
          return (
            <image
              x={props.spawn.pos.x- frame3().pos.x * scaleX()}
              y={props.spawn.pos.y- frame3().pos.y * scaleY()}
              width={backgroundWidth()}
              height={backgroundHeight()}
              style={{
                "image-rendering": "pixelated",
              }}
              href={imageUrl()}
              attr:clip-path={
                `inset(` +
                `${frame3().pos.y * scaleY()}px ` +
                `${(image().width - frame3().pos.x - frame3().size.x) * scaleX()}px ` +
                `${(image().height - frame3().pos.y - frame3().size.y) * scaleY()}px ` +
                `${frame3().pos.x * scaleX()}px` +
                `)`
              }
              preserveAspectRatio="none"
            />
          );
        }}
      </Show>
    </>
  );
};
