export const SM_SPRITES = "smb3-spritesheet.png";
const GOOMBA_WIDTH = 16;
const GOOMBA_HEIGHT = 16;
const GOOMBA_1_OFFSET_X = 47;
const GOOMBA_2_OFFSET_X = 65;
const GOOMBA_3_OFFSET_X = 83;
const GOOMBA_OFFSET_Y = 724;
export const KOOPA_TROOPA_WIDTH = 17;
export const KOOPA_TROOPA_1_HEIGHT = 27;
export const KOOPA_TROOPA_2_HEIGHT = 16;
const KOOPA_TROOPA_1_OFFSET_X = 3;
const KOOPA_TROOPA_2_OFFSET_X = 21;
const KOOPA_TROOPA_3_OFFSET_X = 39 - 1;
const KOOPA_TROOPA_4_OFFSET_X = 57 - 1;
const KOOPA_TROOPA_5_OFFSET_X = 75 - 1;
const KOOPA_TROOPA_6_OFFSET_X = 93 - 1;
const KOOPA_TROOPA_7_OFFSET_X = 111;
const KOOPA_TROOPA_1_OFFSET_Y = 778;
const KOOPA_TROOPA_2_OFFSET_Y = 790;

export const smSpriteAtlasData = {
  frames: {
    goomba_walking_1: {
      frame: {
        x: GOOMBA_1_OFFSET_X,
        y: GOOMBA_OFFSET_Y,
        w: GOOMBA_WIDTH,
        h: GOOMBA_HEIGHT,
      },
    },
    goomba_walking_2: {
      frame: {
        x: GOOMBA_2_OFFSET_X,
        y: GOOMBA_OFFSET_Y,
        w: GOOMBA_WIDTH,
        h: GOOMBA_HEIGHT,
      },
    },
    goomba_flat: {
      frame: {
        x: GOOMBA_3_OFFSET_X,
        y: GOOMBA_OFFSET_Y,
        w: GOOMBA_WIDTH,
        h: GOOMBA_HEIGHT,
      },
    },
    koopa_troopa_walking_1: {
      frame: {
        x: KOOPA_TROOPA_1_OFFSET_X,
        y: KOOPA_TROOPA_1_OFFSET_Y,
        w: KOOPA_TROOPA_WIDTH,
        h: KOOPA_TROOPA_1_HEIGHT,
      },
    },
    koopa_troopa_walking_2: {
      frame: {
        x: KOOPA_TROOPA_2_OFFSET_X,
        y: KOOPA_TROOPA_1_OFFSET_Y,
        w: KOOPA_TROOPA_WIDTH,
        h: KOOPA_TROOPA_1_HEIGHT,
      },
    },
    koopa_troopa_shell_1: {
      frame: {
        x: KOOPA_TROOPA_3_OFFSET_X,
        y: KOOPA_TROOPA_2_OFFSET_Y,
        w: KOOPA_TROOPA_WIDTH,
        h: KOOPA_TROOPA_2_HEIGHT,
      },
    },
    koopa_troopa_shell_2: {
      frame: {
        x: KOOPA_TROOPA_4_OFFSET_X,
        y: KOOPA_TROOPA_2_OFFSET_Y,
        w: KOOPA_TROOPA_WIDTH,
        h: KOOPA_TROOPA_2_HEIGHT,
      },
    },
    koopa_troopa_shell_3: {
      frame: {
        x: KOOPA_TROOPA_5_OFFSET_X,
        y: KOOPA_TROOPA_2_OFFSET_Y,
        w: KOOPA_TROOPA_WIDTH,
        h: KOOPA_TROOPA_2_HEIGHT,
      },
    },
    koopa_troopa_shell_4: {
      frame: {
        x: KOOPA_TROOPA_6_OFFSET_X,
        y: KOOPA_TROOPA_2_OFFSET_Y,
        w: KOOPA_TROOPA_WIDTH,
        h: KOOPA_TROOPA_2_HEIGHT,
      },
    },
    koopa_troopa_waking_up: {
      frame: {
        x: KOOPA_TROOPA_7_OFFSET_X,
        y: KOOPA_TROOPA_2_OFFSET_Y,
        w: KOOPA_TROOPA_WIDTH,
        h: KOOPA_TROOPA_2_HEIGHT,
      },
    },
  },
  meta: {
    image: SM_SPRITES,
    format: "RGBA8888",
    scale: 1.0,
  },
  animations: {
    goomba_walking: ["goomba_walking_1", "goomba_walking_2"],
    goomba_flat: ["goomba_flat"],
    koopa_troopa_walking: ["koopa_troopa_walking_1", "koopa_troopa_walking_2"],
    koopa_troopa_shell: ["koopa_troopa_shell_1"],
    koopa_troopa_shell_spin: [
      "koopa_troopa_shell_1",
      "koopa_troopa_shell_2",
      "koopa_troopa_shell_3",
      "koopa_troopa_shell_4",
    ],
    koopa_troopa_waking_up: ["koopa_troopa_waking_up", "koopa_troopa_shell_1"],
  },
};
