import { Spritesheet, Texture } from "pixi.js";

export const KITTY_SPRITES = "kitty-sprites.png";
const SPRITE_WIDTH = 16;
const SPRITE_HEIGHT = 16;
const FLYING_OFFSET_X = 128;
const FLYING_OFFSET_Y = 8;
const FLYING_STEP_X = 24;
const RUNNING_OFFSET_X = 152;
const RUNNING_OFFSET_Y = 32;
const RUNNING_STEP_X = 24;
const STAND_OFFSET_X = 8 + 24 * 5;
const STAND_OFFSET_Y = 32;
const BUMP_OFFSET_X = 8 + 24 * 9;
const BUMP_OFFSET_Y = 8;
const SKID_OFFSET_X = 8 + 24 * 9;
const SKID_OFFSET_Y = 32;
const JUMP_OFFSET_X = 8 + 24 * 9;
const JUMP_OFFSET_Y = 56;
const DROP_OFFSET_X = 128;
const DROP_OFFSET_Y = 56 + 24;
const PUMP_OFFSET_X = 8 + 24 * 5;
const PUMP_OFFSET_Y = 56;
const PUMP_STEP_X = 24;
const HURT_OFFSET_X = 128 - 24 * 3;
const HURT_OFFSET_Y = 56 + 24;
const HURT_STEP_X = 24;
const FALL_OFFSET_X = 8;
const FALL_OFFSET_Y = 8 + 24 * 4;
const FALL_STEP_X = 24;
const BALLOON_OFFSET_X = 8 + 24 * 6;
const BALLOON_OFFSET_Y = 8 + 24 * 3;
const BALLOON_PAIR_OFFSET_X = 8 + 24 * 7;
const BALLOON_PAIR_OFFSET_Y = 8 + 24 * 3;
const BALLOON_PAIR_STEP_X = 24;

export const atlasData = {
  frames: {
    kitty_flying_1: {
      frame: {
        x: FLYING_OFFSET_X,
        y: FLYING_OFFSET_Y,
        w: SPRITE_WIDTH,
        h: SPRITE_HEIGHT,
      },
      sourceSize: { w: SPRITE_WIDTH, h: SPRITE_HEIGHT },
      spriteSourceSize: { x: 0, y: 0, w: SPRITE_WIDTH, h: SPRITE_HEIGHT },
    },
    kitty_flying_2: {
      frame: {
        x: FLYING_OFFSET_X + FLYING_STEP_X,
        y: FLYING_OFFSET_Y,
        w: SPRITE_WIDTH,
        h: SPRITE_HEIGHT,
      },
      sourceSize: { w: SPRITE_WIDTH, h: SPRITE_HEIGHT },
      spriteSourceSize: { x: 0, y: 0, w: SPRITE_WIDTH, h: SPRITE_HEIGHT },
    },
    kitty_flying_3: {
      frame: {
        x: FLYING_OFFSET_X + FLYING_STEP_X * 2,
        y: FLYING_OFFSET_Y,
        w: SPRITE_WIDTH,
        h: SPRITE_HEIGHT,
      },
      sourceSize: { w: SPRITE_WIDTH, h: SPRITE_HEIGHT },
      spriteSourceSize: { x: 0, y: 0, w: SPRITE_WIDTH, h: SPRITE_HEIGHT },
    },
    kitty_running_1: {
      frame: {
        x: RUNNING_OFFSET_X,
        y: RUNNING_OFFSET_Y,
        w: SPRITE_WIDTH,
        h: SPRITE_HEIGHT,
      },
      sourceSize: { w: SPRITE_WIDTH, h: SPRITE_HEIGHT },
      spriteSourceSize: { x: 0, y: 0, w: SPRITE_WIDTH, h: SPRITE_HEIGHT },
    },
    kitty_running_2: {
      frame: {
        x: RUNNING_OFFSET_X + RUNNING_STEP_X,
        y: RUNNING_OFFSET_Y,
        w: SPRITE_WIDTH,
        h: SPRITE_HEIGHT,
      },
      sourceSize: { w: SPRITE_WIDTH, h: SPRITE_HEIGHT },
      spriteSourceSize: { x: 0, y: 0, w: SPRITE_WIDTH, h: SPRITE_HEIGHT },
    },
    kitty_running_3: {
      frame: {
        x: RUNNING_OFFSET_X + RUNNING_STEP_X * 2,
        y: RUNNING_OFFSET_Y,
        w: SPRITE_WIDTH,
        h: SPRITE_HEIGHT,
      },
      sourceSize: { w: SPRITE_WIDTH, h: SPRITE_HEIGHT },
      spriteSourceSize: { x: 0, y: 0, w: SPRITE_WIDTH, h: SPRITE_HEIGHT },
    },
    kitty_stand: {
      frame: {
        x: STAND_OFFSET_X,
        y: STAND_OFFSET_Y,
        w: SPRITE_WIDTH,
        h: SPRITE_HEIGHT,
      },
      sourceSize: { w: SPRITE_WIDTH, h: SPRITE_HEIGHT },
      spriteSourceSize: { x: 0, y: 0, w: SPRITE_WIDTH, h: SPRITE_HEIGHT },
    },
    kitty_bump: {
      frame: {
        x: BUMP_OFFSET_X,
        y: BUMP_OFFSET_Y,
        w: SPRITE_WIDTH,
        h: SPRITE_HEIGHT,
      },
      sourceSize: { w: SPRITE_WIDTH, h: SPRITE_HEIGHT },
      spriteSourceSize: { x: 0, y: 0, w: SPRITE_WIDTH, h: SPRITE_HEIGHT },
    },
    kitty_skid: {
      frame: {
        x: SKID_OFFSET_X,
        y: SKID_OFFSET_Y,
        w: SPRITE_WIDTH,
        h: SPRITE_HEIGHT,
      },
      sourceSize: { w: SPRITE_WIDTH, h: SPRITE_HEIGHT },
      spriteSourceSize: { x: 0, y: 0, w: SPRITE_WIDTH, h: SPRITE_HEIGHT },
    },
    kitty_jump: {
      frame: {
        x: JUMP_OFFSET_X,
        y: JUMP_OFFSET_Y,
        w: SPRITE_WIDTH,
        h: SPRITE_HEIGHT,
      },
      sourceSize: { w: SPRITE_WIDTH, h: SPRITE_HEIGHT },
      spriteSourceSize: { x: 0, y: 0, w: SPRITE_WIDTH, h: SPRITE_HEIGHT },
    },
    kitty_drop: {
      frame: {
        x: DROP_OFFSET_X,
        y: DROP_OFFSET_Y,
        w: SPRITE_WIDTH,
        h: SPRITE_HEIGHT,
      },
      sourceSize: { w: SPRITE_WIDTH, h: SPRITE_HEIGHT },
      spriteSourceSize: { x: 0, y: 0, w: SPRITE_WIDTH, h: SPRITE_HEIGHT },
    },
    kitty_pump_1: {
      frame: {
        x: PUMP_OFFSET_X,
        y: PUMP_OFFSET_Y,
        w: SPRITE_WIDTH,
        h: SPRITE_HEIGHT,
      },
      sourceSize: { w: SPRITE_WIDTH, h: SPRITE_HEIGHT },
      spriteSourceSize: { x: 0, y: 0, w: SPRITE_WIDTH, h: SPRITE_HEIGHT },
    },
    kitty_pump_2: {
      frame: {
        x: PUMP_OFFSET_X + PUMP_STEP_X,
        y: PUMP_OFFSET_Y,
        w: SPRITE_WIDTH,
        h: SPRITE_HEIGHT,
      },
      sourceSize: { w: SPRITE_WIDTH, h: SPRITE_HEIGHT },
      spriteSourceSize: { x: 0, y: 0, w: SPRITE_WIDTH, h: SPRITE_HEIGHT },
    },
    kitty_pump_3: {
      frame: {
        x: PUMP_OFFSET_X + PUMP_STEP_X * 2,
        y: PUMP_OFFSET_Y,
        w: SPRITE_WIDTH,
        h: SPRITE_HEIGHT,
      },
      sourceSize: { w: SPRITE_WIDTH, h: SPRITE_HEIGHT },
      spriteSourceSize: { x: 0, y: 0, w: SPRITE_WIDTH, h: SPRITE_HEIGHT },
    },
    kitty_hurt_1: {
      frame: {
        x: HURT_OFFSET_X,
        y: HURT_OFFSET_Y,
        w: SPRITE_WIDTH,
        h: SPRITE_HEIGHT,
      },
      sourceSize: { w: SPRITE_WIDTH, h: SPRITE_HEIGHT },
      spriteSourceSize: { x: 0, y: 0, w: SPRITE_WIDTH, h: SPRITE_HEIGHT },
    },
    kitty_hurt_2: {
      frame: {
        x: HURT_OFFSET_X + HURT_STEP_X,
        y: HURT_OFFSET_Y,
        w: SPRITE_WIDTH,
        h: SPRITE_HEIGHT,
      },
      sourceSize: { w: SPRITE_WIDTH, h: SPRITE_HEIGHT },
      spriteSourceSize: { x: 0, y: 0, w: SPRITE_WIDTH, h: SPRITE_HEIGHT },
    },
    kitty_fall_1: {
      frame: {
        x: FALL_OFFSET_X,
        y: FALL_OFFSET_Y,
        w: SPRITE_WIDTH,
        h: SPRITE_HEIGHT,
      },
      sourceSize: { w: SPRITE_WIDTH, h: SPRITE_HEIGHT },
      spriteSourceSize: { x: 0, y: 0, w: SPRITE_WIDTH, h: SPRITE_HEIGHT },
    },
    kitty_fall_2: {
      frame: {
        x: FALL_OFFSET_X + FALL_STEP_X,
        y: FALL_OFFSET_Y,
        w: SPRITE_WIDTH,
        h: SPRITE_HEIGHT,
      },
      sourceSize: { w: SPRITE_WIDTH, h: SPRITE_HEIGHT },
      spriteSourceSize: { x: 0, y: 0, w: SPRITE_WIDTH, h: SPRITE_HEIGHT },
    },
    kitty_fall_3: {
      frame: {
        x: FALL_OFFSET_X + FALL_STEP_X * 2,
        y: FALL_OFFSET_Y,
        w: SPRITE_WIDTH,
        h: SPRITE_HEIGHT,
      },
      sourceSize: { w: SPRITE_WIDTH, h: SPRITE_HEIGHT },
      spriteSourceSize: { x: 0, y: 0, w: SPRITE_WIDTH, h: SPRITE_HEIGHT },
    },
    kitty_fall_4: {
      frame: {
        x: FALL_OFFSET_X + FALL_STEP_X * 3,
        y: FALL_OFFSET_Y,
        w: SPRITE_WIDTH,
        h: SPRITE_HEIGHT,
      },
      sourceSize: { w: SPRITE_WIDTH, h: SPRITE_HEIGHT },
      spriteSourceSize: { x: 0, y: 0, w: SPRITE_WIDTH, h: SPRITE_HEIGHT },
    },
    balloon: {
      frame: {
        x: BALLOON_OFFSET_X,
        y: BALLOON_OFFSET_Y,
        w: SPRITE_WIDTH,
        h: SPRITE_HEIGHT,
      },
      sourceSize: { w: SPRITE_WIDTH, h: SPRITE_HEIGHT },
      spriteSourceSize: { x: 0, y: 0, w: SPRITE_WIDTH, h: SPRITE_HEIGHT },
    },
    balloon_pair_1: {
      frame: {
        x: BALLOON_PAIR_OFFSET_X,
        y: BALLOON_PAIR_OFFSET_Y,
        w: SPRITE_WIDTH,
        h: SPRITE_HEIGHT,
      },
      sourceSize: { w: SPRITE_WIDTH, h: SPRITE_HEIGHT },
      spriteSourceSize: { x: 0, y: 0, w: SPRITE_WIDTH, h: SPRITE_HEIGHT },
    },
    balloon_pair_2: {
      frame: {
        x: BALLOON_PAIR_OFFSET_X + BALLOON_PAIR_STEP_X,
        y: BALLOON_PAIR_OFFSET_Y,
        w: SPRITE_WIDTH,
        h: SPRITE_HEIGHT,
      },
      sourceSize: { w: SPRITE_WIDTH, h: SPRITE_HEIGHT },
      spriteSourceSize: { x: 0, y: 0, w: SPRITE_WIDTH, h: SPRITE_HEIGHT },
    },
  },
  meta: {
    image: KITTY_SPRITES,
    format: "RGBA8888",
    size: { w: 128, h: 32 },
    scale: 1,
  },
  animations: {
    kitty_flying: [
      "kitty_flying_1",
      "kitty_flying_2",
      "kitty_flying_3",
      "kitty_flying_2",
    ],
    kitty_running: [
      "kitty_running_1",
      "kitty_running_2",
      "kitty_running_3",
      "kitty_running_2",
    ],
    kitty_stand: ["kitty_stand"],
    kitty_bump: ["kitty_bump"],
    kitty_skid: ["kitty_skid"],
    kitty_jump: ["kitty_jump"],
    kitty_drop: ["kitty_drop"],
    kitty_pump: [
      "kitty_pump_1",
      "kitty_pump_2",
      "kitty_pump_3",
      "kitty_pump_2",
    ],
    kitty_hurt: ["kitty_hurt_1", "kitty_hurt_2"],
    kitty_fall: [
      "kitty_fall_1",
      "kitty_fall_2",
      "kitty_fall_3",
      "kitty_fall_4",
    ],
    balloon: ["balloon"],
    balloon_pair: ["balloon_pair_1", "balloon_pair_2"],
  },
};
