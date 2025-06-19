import { EcsComponentType, tsObject, tsString, TypeSchemaType } from "../lib";

const typeSchema = tsObject({
  levelFilename: tsString(),
});

export type LevelRefState = TypeSchemaType<typeof typeSchema>;

export const levelRefComponentType = new EcsComponentType<LevelRefState>({
  typeName: "LevelRef",
  typeSchema,
});
