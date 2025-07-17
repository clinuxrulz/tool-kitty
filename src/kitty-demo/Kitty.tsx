import { Accessor, createMemo } from "solid-js";
import { ActorBase, IsActor, IsAnimated } from "./Actor";
import { createStore, SetStoreFunction, Store } from "solid-js/store";
import { JUMP_SOUND, PLAYER_DEATH_SOUND } from "./sound-effect-ids";
import { RENDER_BLOCK_HEIGHT, RENDER_BLOCK_WIDTH } from "./constants";

type KittyState = {
  facing: "Left" | "Right";
  onGround: boolean;
  lastJumpPressed: boolean;
  jumpHeld: boolean;
  remainingJumpHeldFrames: number;
  dead: boolean;
  deadInitPosY: number;
  deadSequence: number;
  deadFrame: number;
};

const GRAVITY = 1;
export const MAX_HOLD_JUMP_FRAMES = 20;
const DEAD_STILL_TIMEOUT = 50;
const DEAD_SIN_FALL_TIMEOUT = 100;

export class Kitty implements IsActor {
  state: Store<KittyState>;
  setState: SetStoreFunction<KittyState>;
  actor: ActorBase;
  animated: IsAnimated;

  constructor(params: {
    spawnHome?: {
      xIdx: number;
      yIdx: number;
    };
    initPos?: {
      x: number;
      y: number;
    };
    initVel?: {
      x: number;
      y: number;
    };
  }) {
    let [state, setState] = createStore<KittyState>({
      facing: "Right",
      onGround: false,
      lastJumpPressed: false,
      jumpHeld: false,
      remainingJumpHeldFrames: 0,
      dead: false,
      deadInitPosY: 0,
      deadSequence: 0,
      deadFrame: 0,
    });
    this.state = state;
    this.setState = setState;
    this.actor = new ActorBase({
      spawnHome: params.spawnHome,
      initPos: params.initPos,
      initVel: params.initVel,
    });
    this.animated = {
      flipX: createMemo(() => state.facing == "Left"),
      animation: createMemo(() => {
        if (this.state.dead) {
          return "kitty_hurt";
        } else if (this.state.onGround) {
          if (this.actor.state.vel.x != 0.0) {
            return "kitty_running";
          } else {
            return "kitty_stand";
          }
        } else {
          if (this.actor.state.vel.y < 0.0) {
            return "kitty_jump";
          } else {
            return "kitty_drop";
          }
        }
      }),
    };
  }

  update(params: {
    leftPressed: boolean;
    rightPressed: boolean;
    jumpPressed: boolean;
    onGround: boolean;
    playSoundEffect: (soundId: number) => void;
    playBackgroundMusic: (musicId: number) => void;
  }) {
    if (this.state.dead) {
      if (this.state.deadSequence == 0) {
        let deadFrame = this.state.deadFrame;
        deadFrame++;
        this.setState("deadFrame", deadFrame);
        if (deadFrame >= DEAD_STILL_TIMEOUT) {
          this.setState("deadSequence", 1);
          this.setState("deadFrame", 0);
        }
        this.actor.setState("vel", "x", 0);
        this.actor.setState("vel", "y", 0);
      } else {
        let deadFrame = this.state.deadFrame;
        deadFrame++;
        this.setState("deadFrame", deadFrame);
        if (deadFrame >= DEAD_SIN_FALL_TIMEOUT) {
          this.setState("dead", false);
          this.setState("deadSequence", 0);
          this.setState("deadFrame", 0);
          this.actor.setState("collideBlocks", true);
          if (this.actor.actor.state.spawnHome != undefined) {
            let spawnHome = this.actor.actor.state.spawnHome;
            this.actor.setState("pos", {
              x: spawnHome.xIdx * RENDER_BLOCK_WIDTH,
              y: spawnHome.yIdx * RENDER_BLOCK_HEIGHT,
            });
            params.playBackgroundMusic(9);
          }
        } else {
          let a = Math.sin(
            (((deadFrame * 3.0) / 4.0) * 2.0 * Math.PI) / DEAD_SIN_FALL_TIMEOUT,
          );
          this.actor.setState("pos", "y", this.state.deadInitPosY - a * 400.0);
          this.actor.setState("vel", "x", 0);
          this.actor.setState("vel", "y", 0);
        }
      }
      return;
    }
    this.setState("onGround", params.onGround);
    let accelX = 0.0;
    if (params.leftPressed) {
      accelX -= 1.0;
    }
    if (params.rightPressed) {
      accelX += 1.0;
    }
    if (accelX < 0.0) {
      this.setState("facing", "Left");
    } else if (accelX > 0.0) {
      this.setState("facing", "Right");
    }
    if (params.jumpPressed && !this.state.lastJumpPressed && params.onGround) {
      params.playSoundEffect(JUMP_SOUND);
      this.actor.setState("vel", "y", -10);
      this.setState("jumpHeld", true);
      this.setState("remainingJumpHeldFrames", MAX_HOLD_JUMP_FRAMES);
    } else if (
      params.jumpPressed &&
      this.state.jumpHeld &&
      this.state.remainingJumpHeldFrames != 0
    ) {
      this.actor.setState("vel", "y", -10);
      this.setState("remainingJumpHeldFrames", (x) => x - 1);
    } else if (!params.onGround) {
      this.setState("jumpHeld", false);
    }
    if (!this.state.onGround && !this.state.jumpHeld) {
      this.actor.setState("acc", "y", (ay) => ay + GRAVITY);
    }
    this.actor.setState("acc", "x", (ax) => ax + accelX);
    // friction
    this.actor.setState("vel", "x", (vx) => {
      let vx2 = 0.9 * vx;
      if (this.actor.state.acc.x == 0.0 && Math.abs(vx2) < 1) {
        vx2 = 0.0;
      }
      return vx2;
    });
    this.setState("lastJumpPressed", params.jumpPressed);
  }

  onCollide(params: {
    other: IsActor;
    playSoundEffect: (soundId: number) => void;
  }): void {}

  onHurt(params: { playBackgroundMusic: (musicId: number) => void }): void {
    if (!this.state.dead) {
      params.playBackgroundMusic(PLAYER_DEATH_SOUND);
      this.setState("dead", true);
      this.setState("deadInitPosY", this.actor.state.pos.y);
      this.actor.setState("collideBlocks", false);
    }
  }
}
