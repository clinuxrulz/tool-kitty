import { createStore, SetStoreFunction, Store } from "solid-js/store";
import { ActorBase, IsActor, IsAnimated } from "./Actor";
import { Accessor, createMemo } from "solid-js";
import {
  KOOPA_TROOPA_1_HEIGHT,
  KOOPA_TROOPA_2_HEIGHT,
  KOOPA_TROOPA_WIDTH,
} from "./SmSprites";
import { Kitty, MAX_HOLD_JUMP_FRAMES } from "./Kitty";
import { KICK_SOUND, SQUASH_SOUND } from "./sound-effect-ids";

type KoopaTroopaState = {
  state: "Walking" | "Shell" | "Spinning" | "WakingUp";
  facing: "Left" | "Right";
};

export class KoopaTroopa implements IsActor {
  state: Store<KoopaTroopaState>;
  setState: SetStoreFunction<KoopaTroopaState>;
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
  }) {
    let [state, setState] = createStore<KoopaTroopaState>({
      state: "Walking",
      facing: "Left",
    });
    this.state = state;
    this.setState = setState;
    this.actor = new ActorBase({
      spawnHome: params.spawnHome,
      initPos: params.initPos,
      initSize: {
        x: KOOPA_TROOPA_WIDTH * 5,
        y: KOOPA_TROOPA_1_HEIGHT * 5,
      },
    });
    this.animated = {
      flipX: createMemo(() => state.facing == "Left"),
      animation: createMemo(() => {
        switch (state.state) {
          case "Walking":
            return "koopa_troopa_walking";
          case "Shell":
            return "koopa_troopa_shell";
          case "Spinning":
            return "koopa_troopa_shell_spin";
          case "WakingUp":
            return "koopa_troopa_waking_up";
        }
      }),
      animationSpeed: createMemo(() => {
        if (state.state == "Spinning") {
          return 0.4;
        }
        return undefined;
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
    removeSelf: () => void;
  }): void {
    this.actor.update(params);
    if (this.state.state == "Walking") {
      let vx = this.state.facing == "Left" ? -1 : 1;
      this.actor.setState("vel", "x", vx);
    } else if (this.state.state == "Spinning") {
      let vx = this.state.facing == "Left" ? -10 : 10;
      this.actor.setState("vel", "x", vx);
    }
  }

  onCollide(params: {
    other: IsActor;
    playSoundEffect: (soundId: number) => void;
    playBackgroundMusic: (musicId: number) => void;
  }): void {
    if (this.state.state == "Walking") {
      if (params.other instanceof Kitty && !params.other.state.dead) {
        //
        let squashMaxY = this.actor.state.pos.y + this.actor.state.size.y * 0.2;
        let kittyMaxY =
          params.other.actor.state.pos.y + params.other.actor.state.size.y;
        //
        if (kittyMaxY <= squashMaxY) {
          this.setState("state", "Shell");
          this.actor.setState("size", "y", KOOPA_TROOPA_2_HEIGHT * 5);
          this.actor.setState(
            "pos",
            "y",
            (y) => y - (KOOPA_TROOPA_2_HEIGHT - KOOPA_TROOPA_1_HEIGHT) * 5,
          );
          this.actor.setState("vel", "x", 0);
          params.other.actor.setState("vel", "y", -100);
          params.other.setState("jumpHeld", true);
          params.other.setState(
            "remainingJumpHeldFrames",
            MAX_HOLD_JUMP_FRAMES,
          );
          params.playSoundEffect(SQUASH_SOUND);
        } else {
          params.other.onHurt({
            playBackgroundMusic: params.playBackgroundMusic,
          });
        }
      }
    } else if (this.state.state == "Shell") {
      if (params.other instanceof Kitty && !params.other.state.dead) {
        let scx = this.actor.state.pos.x + 0.5 * this.actor.state.size.x;
        let kcx =
          params.other.actor.state.pos.x +
          0.5 * params.other.actor.state.size.x;
        if (kcx < scx) {
          this.setState("facing", "Right");
        } else {
          this.setState("facing", "Left");
        }
        this.setState("state", "Spinning");
        params.playSoundEffect(KICK_SOUND);
      }
    }
  }
}
