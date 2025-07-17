import { Kitty } from "./Kitty";
import { IsActor } from "./Actor";
import { createStore, SetStoreFunction, Store } from "solid-js/store";
import { isMonsterChar, Level, level1, monsterConstructor } from "./Level";
import { untrack } from "solid-js";
import { Goomba } from "./Goomba";
import { collision_detection } from "./collision_detection";
import { RENDER_BLOCK_HEIGHT, RENDER_BLOCK_WIDTH } from "./constants";

type WorldState = {
  camera: {
    pos: {
      x: number;
      y: number;
    };
  };
  actors: IsActor[];
  blockSpawns: {
    xIdx: number;
    yIdx: number;
  }[];
  level: Level;
};

export class World {
  state: Store<WorldState>;
  setState: SetStoreFunction<WorldState>;

  constructor() {
    let kittySpawnXIdx = Math.round(100.0 / RENDER_BLOCK_WIDTH);
    let kittySpawnYIdx = Math.round(210.0 / RENDER_BLOCK_HEIGHT);
    let kitty = new Kitty({
      spawnHome: {
        xIdx: kittySpawnXIdx,
        yIdx: kittySpawnYIdx,
      },
      initPos: {
        x: kittySpawnXIdx * RENDER_BLOCK_WIDTH,
        y: kittySpawnYIdx * RENDER_BLOCK_HEIGHT,
      },
    });
    let [state, setState] = createStore<WorldState>({
      camera: {
        pos: {
          x: untrack(() => kitty.actor.state.pos.x - 100),
          y: untrack(() => kitty.actor.state.pos.y - 300),
        },
      },
      actors: [kitty],
      blockSpawns: [],
      level: new Level(level1),
    });
    this.state = state;
    this.setState = setState;
  }

  update(params: {
    windowSize: {
      width: number;
      height: number;
    };
    leftPressed: boolean;
    rightPressed: boolean;
    jumpPressed: boolean;
    playSoundEffect: (soundId: number) => void;
    playBackgroundMusic: (musicId: number) => void;
  }) {
    {
      // drag camera if kitty gets close to edges
      let minScreenX = params.windowSize.width / 3;
      let maxScreenX = (params.windowSize.width * 2) / 3;
      let minScreenY = params.windowSize.height / 3;
      let maxScreenY = (params.windowSize.height * 2) / 3;
      for (let i = 0; i < this.state.actors.length; ++i) {
        let actor = this.state.actors[i];
        if (actor instanceof Kitty) {
          // If kitty dead, then do not camera follow
          if (actor.state.dead) {
            continue;
          }
          //
          let actor2 = actor.actor.state;
          let kittyScreenX = actor2.pos.x - this.state.camera.pos.x;
          let kittyScreenY = actor2.pos.y - this.state.camera.pos.y;
          if (kittyScreenX < minScreenX) {
            this.setState(
              "camera",
              "pos",
              "x",
              (x) => x + kittyScreenX - minScreenX,
            );
          } else if (kittyScreenX > maxScreenX) {
            this.setState(
              "camera",
              "pos",
              "x",
              (x) => x + kittyScreenX - maxScreenX,
            );
          }
          if (kittyScreenY < minScreenY) {
            this.setState(
              "camera",
              "pos",
              "y",
              (y) => y + kittyScreenY - minScreenY,
            );
          } else if (kittyScreenY > maxScreenY) {
            this.setState(
              "camera",
              "pos",
              "y",
              (y) => y + kittyScreenY - maxScreenY,
            );
          }
        }
      }
    }
    {
      // scan for new monsters
      let startI = Math.floor(this.state.camera.pos.y / RENDER_BLOCK_HEIGHT);
      let startJ = Math.floor(this.state.camera.pos.x / RENDER_BLOCK_WIDTH);
      let numRows = Math.ceil(params.windowSize.height / RENDER_BLOCK_WIDTH);
      let numCols = Math.ceil(params.windowSize.width / RENDER_BLOCK_HEIGHT);
      for (let i = startI; i < startI + numRows; ++i) {
        for (let j = startJ; j < startJ + numCols; ++j) {
          let monsterConstructor2 = monsterConstructor(
            this.state.level.readBlock(j, i) ?? "",
          );
          if (monsterConstructor2 != undefined) {
            // block spawn if that block is the home block of existing actor
            let skipSpawn = false;
            for (let actor of this.state.actors) {
              if (actor.actor.state.spawnHome != undefined) {
                let spawnHome = actor.actor.state.spawnHome;
                if (spawnHome.xIdx == j && spawnHome.yIdx == i) {
                  skipSpawn = true;
                }
              }
            }
            // Also only respawn if the spawn point has only just appeared on the screen
            for (let blockSpawn of this.state.blockSpawns) {
              if (blockSpawn.xIdx == j && blockSpawn.yIdx == i) {
                skipSpawn = true;
              }
            }
            if (skipSpawn) {
              continue;
            }
            this.setState("blockSpawns", (blockSpawns) => [
              ...blockSpawns,
              { xIdx: j, yIdx: i },
            ]);
            let newActor = new monsterConstructor2({
              spawnHome: {
                xIdx: j,
                yIdx: i,
              },
            });
            newActor.actor.setState("pos", {
              x: j * RENDER_BLOCK_WIDTH,
              y: (i + 1) * RENDER_BLOCK_HEIGHT - newActor.actor.state.size.y,
            });
            this.setState("actors", (actors) => [...actors, newActor]);
          }
        }
      }
    }
    {
      // If actor goes too far of the screen, make them dissappear.
      // Unless it is kitty.
      let minXIdx = Math.floor(this.state.camera.pos.x / RENDER_BLOCK_WIDTH);
      let minYIdx = Math.floor(this.state.camera.pos.y / RENDER_BLOCK_HEIGHT);
      let numRows = Math.ceil(params.windowSize.height / RENDER_BLOCK_WIDTH);
      let numCols = Math.ceil(params.windowSize.width / RENDER_BLOCK_HEIGHT);
      let maxXIdx = minXIdx + numCols;
      let maxYIdx = minYIdx + numRows;
      let actorsChanged = false;
      let actors = [...this.state.actors];
      for (let i = actors.length - 1; i >= 0; --i) {
        let actor = actors[i];
        if (actor instanceof Kitty) {
          continue;
        }
        let actorXIdx = Math.ceil(actor.actor.state.pos.x / RENDER_BLOCK_WIDTH);
        let actorYIdx = Math.ceil(
          actor.actor.state.pos.y / RENDER_BLOCK_HEIGHT,
        );
        if (
          actorXIdx < minXIdx ||
          actorXIdx > maxXIdx ||
          actorYIdx < minYIdx ||
          actorYIdx > maxYIdx
        ) {
          actors.splice(i, 1);
          actorsChanged = true;
        }
      }
      if (actorsChanged) {
        this.setState("actors", actors);
      }
      // Likewise if a spawn bloocker goes too far of the screen, remove it.
      let blockSpawnsChanged = false;
      let blockSpawns = [...this.state.blockSpawns];
      for (let i = blockSpawns.length - 1; i >= 0; --i) {
        let blockSpawn = blockSpawns[i];
        let xIdx = blockSpawn.xIdx;
        let yIdx = blockSpawn.yIdx;
        if (
          xIdx < minXIdx ||
          xIdx > maxXIdx ||
          yIdx < minYIdx ||
          yIdx > maxYIdx
        ) {
          blockSpawns.splice(i, 1);
          blockSpawnsChanged = true;
        }
      }
      if (blockSpawnsChanged) {
        this.setState("blockSpawns", blockSpawns);
      }
    }
    for (let actor of this.state.actors) {
      actor.actor.setState("acc", "x", 0.0);
      actor.actor.setState("acc", "y", 0.0);
    }
    let actorIndicesToRemove: number[] = [];
    for (let i = 0; i < this.state.actors.length; ++i) {
      let actor = this.state.actors[i];
      let actorIdx = i;
      // check if actor on ground
      let onGround = false;
      {
        let actor2 = actor.actor.state;
        const ACTOR_WIDTH = 24;
        const ACTOR_HEIGHT = 24;
        let minX = actor2.pos.x;
        let minY = actor2.pos.y;
        let maxX = minX + ACTOR_WIDTH;
        let maxY = minY + ACTOR_HEIGHT;
        let minXIdx = Math.floor(minX / RENDER_BLOCK_WIDTH);
        let maxXIdx = Math.ceil(maxX / RENDER_BLOCK_WIDTH);
        let maxYIdx = Math.ceil((maxY + 1) / RENDER_BLOCK_HEIGHT);
        let yIdx = maxYIdx;
        for (let xIdx = minXIdx; xIdx <= maxXIdx; ++xIdx) {
          if (this.state.level.readBlock(xIdx, yIdx) == "G") {
            onGround = true;
            break;
          }
        }
      }
      //
      actor.update({
        leftPressed: params.leftPressed,
        rightPressed: params.rightPressed,
        jumpPressed: params.jumpPressed,
        onGround,
        playSoundEffect: params.playSoundEffect,
        playBackgroundMusic: params.playBackgroundMusic,
        removeSelf: () => {
          actorIndicesToRemove.push(actorIdx);
        },
      });
    }
    if (actorIndicesToRemove.length != 0) {
      actorIndicesToRemove.sort((a, b) => a - b);
      let newActors = [...this.state.actors];
      for (let i = actorIndicesToRemove.length - 1; i >= 0; --i) {
        newActors.splice(actorIndicesToRemove[i], 1);
      }
      this.setState("actors", newActors);
    }
    for (let actor of this.state.actors) {
      if (!actor.actor.state.collideBlocks) {
        continue;
      }
      let oldX = actor.actor.state.pos.x;
      let oldY = actor.actor.state.pos.y;
      let actor2 = actor.actor.state;
      let vx = actor2.vel.x + actor2.acc.x;
      let vy = actor2.vel.y + actor2.acc.y;
      if (Math.abs(vx) > actor2.maxVel.x) {
        vx = Math.sign(vx) * actor2.maxVel.x;
      }
      if (Math.abs(vy) > actor2.maxVel.y) {
        vy = Math.sign(vy) * actor2.maxVel.y;
      }
      let x = actor.actor.state.pos.x + vx;
      let y = actor.actor.state.pos.y + vy;
      actor.actor.setState("vel", "x", vx);
      actor.actor.setState("vel", "y", vy);
      actor.actor.setState("pos", "x", x);
      actor.actor.setState("pos", "y", y);
      {
        // check if actor hit block
        let actor2 = actor.actor.state;
        const RENDER_BLOCK_WIDTH = 16 * 3;
        const RENDER_BLOCK_HEIGHT = 16 * 3;
        const ACTOR_WIDTH = actor2.size.x;
        const ACTOR_HEIGHT = actor2.size.y;
        let minX = actor2.pos.x;
        let minY = actor2.pos.y;
        let maxX = minX + ACTOR_WIDTH;
        let maxY = minY + ACTOR_HEIGHT;
        let minXIdx = Math.floor(minX / RENDER_BLOCK_WIDTH);
        let minYIdx = Math.floor(minY / RENDER_BLOCK_HEIGHT);
        let maxXIdx = Math.ceil(maxX / RENDER_BLOCK_WIDTH);
        let maxYIdx = Math.ceil(maxY / RENDER_BLOCK_HEIGHT);
        for (let yIdx = minYIdx; yIdx <= maxYIdx; ++yIdx) {
          for (let xIdx = minXIdx; xIdx <= maxXIdx; ++xIdx) {
            let cell = this.state.level.readBlock(xIdx, yIdx);
            let leftCell = this.state.level.readBlock(xIdx - 1, yIdx);
            let rightCell = this.state.level.readBlock(xIdx + 1, yIdx);
            let topCell = this.state.level.readBlock(xIdx, yIdx - 1);
            let bottomCell = this.state.level.readBlock(xIdx, yIdx + 1);
            if (cell == "G") {
              let blockLeft = xIdx * RENDER_BLOCK_WIDTH;
              let blockRight = blockLeft + RENDER_BLOCK_WIDTH;
              let blockTop = yIdx * RENDER_BLOCK_HEIGHT;
              let blockBottom = blockTop + RENDER_BLOCK_HEIGHT;
              if (
                maxX < blockLeft ||
                minX > blockRight ||
                maxY < blockTop ||
                minY > blockBottom
              ) {
                continue;
              }
              if (leftCell != "G" && maxX - blockLeft < 20) {
                actor.actor.setState(
                  "pos",
                  "x",
                  blockLeft - actor.actor.state.size.x,
                );
                actor.actor.setState("vel", "x", 0);
              } else if (rightCell != "G" && blockRight - minX < 20) {
                actor.actor.setState("pos", "x", blockRight);
                actor.actor.setState("vel", "x", 0);
              } else if (topCell != "G" && maxY - blockTop < 20) {
                actor.actor.setState(
                  "pos",
                  "y",
                  blockTop - actor.actor.state.size.y,
                );
                actor.actor.setState("vel", "y", 0);
              } else if (bottomCell != "G" && minY - blockBottom < 20) {
                actor.actor.setState("pos", "y", blockBottom);
                actor.actor.setState("vel", "y", 0);
                if (actor instanceof Kitty) {
                  actor.setState("jumpHeld", false);
                }
              }
            }
          }
        }
      }
    }
    // do collision detection between actors
    for (let actor of this.state.actors) {
      actor.actor.setState("tint", undefined);
    }
    collision_detection({
      hasBox: {
        x: (actor: IsActor) => {
          return actor.actor.state.pos.x;
        },
        y: (actor: IsActor) => {
          return actor.actor.state.pos.y;
        },
        w: (actor: IsActor) => {
          return 24 * 3;
        },
        h: (actor: IsActor) => {
          return 24 * 3;
        },
      },
      objects: this.state.actors,
      onCollide(a, b) {
        a.onCollide({
          other: b,
          playSoundEffect: params.playSoundEffect,
          playBackgroundMusic: params.playBackgroundMusic,
        });
        b.onCollide({
          other: a,
          playSoundEffect: params.playSoundEffect,
          playBackgroundMusic: params.playBackgroundMusic,
        });
      },
    });
  }
}
