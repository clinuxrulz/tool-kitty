import { EcsComponentType } from "../../ecs/EcsComponent";
import { tsObject, tsString, TypeSchemaType, vec2TypeSchema } from "../../TypeSchema";

const typeSchema = tsObject({
  pos: vec2TypeSchema,
  textureAtlasFilename: tsString(),
  frameId: tsString(),
});

export type SpawnState = TypeSchemaType<typeof typeSchema>;

export const spawnComponentType = new EcsComponentType<SpawnState>({
  typeName: "Spawn",
  typeSchema,
});
