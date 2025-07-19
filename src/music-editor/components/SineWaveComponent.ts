import { tsObject, TypeSchemaType } from "../../TypeSchema";
import { EcsComponentType } from "../../ecs/EcsComponent";

const typeSchema = tsObject({});

export type SineWaveState = TypeSchemaType<typeof typeSchema>;

export const sineWaveComponentType = new EcsComponentType({
  typeName: "SineWave",
  typeSchema,
});
