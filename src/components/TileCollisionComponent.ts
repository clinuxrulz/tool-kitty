import { EcsComponentType } from "../ecs/EcsComponent";
import {
  tsJson,
  tsNumber,
  tsObject,
  tsString,
  TypeSchemaType,
} from "../TypeSchema";

const typeSchema = tsObject({
  textureAtlasFilename: tsString(),
  frameName: tsString(),
  width: tsNumber(),
  height: tsNumber(),
  metaData: tsJson(),
});

export type TileCollisionState = TypeSchemaType<typeof typeSchema>;

export const tileCollisionComponentType =
  new EcsComponentType<TileCollisionState>({
    typeName: "TileCollision",
    typeSchema,
  });
