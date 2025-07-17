import { createStore, SetStoreFunction, Store } from "solid-js/store";
import { ActorBase, IsActor, IsAnimated } from "./Actor";
import { Accessor, createMemo } from "solid-js";
import { Kitty, MAX_HOLD_JUMP_FRAMES } from "./Kitty";
import { SQUASH_SOUND } from "./sound-effect-ids";

type GoombaState = {
  isFlat: boolean;
  flatCounter: number;
};

const FLAT_TIMEOUT = 100;

export class Goomba implements IsActor {
  state: Store<GoombaState>;
  setState: SetStoreFunction<GoombaState>;
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
    let [state, setState] = createStore<GoombaState>({
      isFlat: false,
      flatCounter: 0,
    });
    this.state = state;
    this.setState = setState;
    this.actor = new ActorBase({
      spawnHome: params.spawnHome,
      initPos: params.initPos,
    });
    this.animated = {
      flipX: () => false,
      animation: createMemo(() => {
        if (state.isFlat) {
          return "goomba_flat";
        } else {
          return "goomba_walking";
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
    removeSelf: () => void;
  }): void {
    this.actor.update(params);
    if (this.state.isFlat) {
      this.actor.setState("vel", "x", 0);
      let flatCounter = this.state.flatCounter;
      flatCounter--;
      this.setState("flatCounter", flatCounter);
      if (flatCounter == 0) {
        params.removeSelf();
      }
      return;
    }
    this.actor.setState("vel", "x", -1);
  }

  onCollide(params: {
    other: IsActor;
    playSoundEffect: (soundId: number) => void;
    playBackgroundMusic: (musicId: number) => void;
  }): void {
    if (!this.state.isFlat) {
      if (params.other instanceof Kitty && !params.other.state.dead) {
        //
        let squashMaxY = this.actor.state.pos.y + this.actor.state.size.y * 0.2;
        let kittyMaxY =
          params.other.actor.state.pos.y + params.other.actor.state.size.y;
        //
        if (kittyMaxY <= squashMaxY) {
          this.setState("flatCounter", FLAT_TIMEOUT);
          this.setState("isFlat", true);
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
    }
  }
}
