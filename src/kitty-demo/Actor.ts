import { Accessor } from "solid-js";
import { createStore, SetStoreFunction, Store } from "solid-js/store";

type ActorState = {
  spawnHome?: {
    xIdx: number;
    yIdx: number;
  };
  pos: {
    x: number;
    y: number;
  };
  size: {
    x: number;
    y: number;
  };
  vel: {
    x: number;
    y: number;
  };
  acc: {
    x: number;
    y: number;
  };
  maxVel: {
    x: number;
    y: number;
  };
  /**
   * Weither or not the actor collides against level blocks.
   * Default is true.
   * This is used (set to false) for kitty death animation,
   * so kitty can pass throug the blocks.
   */
  collideBlocks: boolean;
  /**
   * Adds a tint to the actor.
   * For debugging purposes to see if collision detector is working.
   */
  tint: number | undefined;
};

export interface IsActor {
  get actor(): ActorBase;
  readonly animated?: IsAnimated;
  update(params: {
    leftPressed: boolean;
    rightPressed: boolean;
    jumpPressed: boolean;
    onGround: boolean;
    playSoundEffect: (soundId: number) => void;
    playBackgroundMusic: (musicId: number) => void;
    removeSelf: () => void;
  }): void;
  onCollide(params: {
    other: IsActor;
    playSoundEffect: (soundId: number) => void;
    playBackgroundMusic: (musicId: number) => void;
  }): void;
}

export interface IsAnimated {
  readonly flipX: Accessor<boolean>;
  readonly animation: Accessor<string>;
  readonly animationSpeed?: Accessor<number | undefined>;
}

const GRAVITY = 1;

export class ActorBase implements IsActor {
  state: Store<ActorState>;
  setState: SetStoreFunction<ActorState>;

  constructor(params: {
    spawnHome?: {
      xIdx: number;
      yIdx: number;
    };
    initPos?: {
      x: number;
      y: number;
    };
    initSize?: {
      x: number;
      y: number;
    };
    initVel?: {
      x: number;
      y: number;
    };
  }) {
    let [state, setState] = createStore<ActorState>({
      spawnHome:
        params.spawnHome == undefined
          ? undefined
          : {
              xIdx: params.spawnHome.xIdx,
              yIdx: params.spawnHome.yIdx,
            },
      pos: {
        x: params.initPos?.x ?? 0,
        y: params.initPos?.y ?? 0,
      },
      size: {
        x: params.initSize?.x ?? 24 * 3,
        y: params.initSize?.y ?? 24 * 3,
      },
      vel: {
        x: params.initVel?.x ?? 0,
        y: params.initVel?.y ?? 0,
      },
      acc: {
        x: 0.0,
        y: 0.0,
      },
      maxVel: {
        x: 10.0,
        y: 10.0,
      },
      collideBlocks: true,
      tint: undefined,
    });
    this.state = state;
    this.setState = setState;
  }

  get actor(): ActorBase {
    return this;
  }

  update(params: {
    leftPressed: boolean;
    rightPressed: boolean;
    jumpPressed: boolean;
    onGround: boolean;
    playSoundEffect: (soundId: number) => void;
  }): void {
    if (!params.onGround) {
      this.actor.setState("acc", "y", (ay) => ay + GRAVITY);
    }
  }

  onCollide(params: {
    other: IsActor;
    playSoundEffect: (soundId: number) => void;
  }): void {}
}
