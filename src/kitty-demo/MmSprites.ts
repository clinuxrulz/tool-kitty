export const MM_SPRITES = "micro-mario.png";

const MARIO_1_OFFSET_X = 4;
const MARIO_1_OFFSET_Y = 2;
const MARIO_1_WIDTH = 11;
const MARIO_1_HEIGHT = 10;

export const mmSpriteAtlasData = {
  frames: {
    mario_standing: {
      frame: {
        x: MARIO_1_OFFSET_X,
        y: MARIO_1_OFFSET_Y,
        w: MARIO_1_WIDTH,
        h: MARIO_1_HEIGHT,
      },
    },
  },
  meta: {
    image: MM_SPRITES,
    format: "RGBA8888",
    scale: 1.0,
  },
  animations: {},
};
