import { EcsComponentType } from "../../ecs/EcsComponent";
import {
  tsArray,
  tsNumber,
  tsObject,
  tsString,
  TypeSchemaType,
} from "../../TypeSchema";

const typeSchema = tsObject({
  tileToShortIdTable: tsArray(
    tsObject({
      textureAtlasRef: tsString(),
      frames: tsArray(
        tsObject({
          frameId: tsString(),
          shortId: tsNumber(),
        }),
      ),
    }),
  ),
  /** 2D Array of short IDs */
  mapData: tsArray(tsArray(tsNumber())),
});

export type LevelState = TypeSchemaType<typeof typeSchema>;

export const levelComponentType: EcsComponentType<LevelState> =
  new EcsComponentType({
    typeName: "Level",
    typeSchema,
  });
