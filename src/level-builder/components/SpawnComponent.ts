import { EcsComponentType } from "../../ecs/EcsComponent";
import { tsObject, tsString, TypeSchemaType } from "../../TypeSchema";

const typeSchema = tsObject({
  textureAtlasFilename: tsString(),
  frameId: tsString(),
});

export type SpawnState = TypeSchemaType<typeof typeSchema>;

export const spawnComponentType = new EcsComponentType<SpawnState>({
  typeName: "Spawn",
  typeSchema,
});
