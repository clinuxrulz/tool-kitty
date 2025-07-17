import { SpritesheetData } from "pixi.js";
import { fixRelativeUrl } from "../lib";

const TILESET_IMAGE = "smb3-tileset.png";

export const tilesetAtlasData = {
  frames: {
    woodGroundTopLeft: {
      frame: { x: 2, y: 197, w: 16, h: 16 },
    },
    woodGroundTopCentre: {
      frame: { x: 19, y: 197, w: 16, h: 16 },
    },
    woodGroundTopRight: {
      frame: { x: 19 + 17, y: 197, w: 16, h: 16 },
    },
    woodGroundCentreLeft: {
      frame: { x: 2, y: 197 + 17, w: 16, h: 16 },
    },
    woodGroundCentreCentre: {
      frame: { x: 19, y: 197 + 17, w: 16, h: 16 },
    },
    woodGroundCentreRight: {
      frame: { x: 19 + 17, y: 197 + 17, w: 16, h: 16 },
    },
    bgCloudTopLeft: {
      frame: { x: 138, y: 197, w: 16, h: 16 },
    },
    bgCloudTopCentre: {
      frame: { x: 138 + 17, y: 197, w: 16, h: 16 },
    },
    bgCloudTopRight: {
      frame: { x: 138 + 17 * 2, y: 197, w: 16, h: 16 },
    },
    bgCloudBottomLeft: {
      frame: { x: 138, y: 197 + 17, w: 16, h: 16 },
    },
    bgCloudBottomCentre: {
      frame: { x: 138 + 17, y: 197 + 17, w: 16, h: 16 },
    },
    bgCloudBottomRight: {
      frame: { x: 138 + 17 * 2, y: 197 + 17, w: 16, h: 16 },
    },
  },
  meta: {
    image: TILESET_IMAGE,
    scale: 1.0,
  },
};
