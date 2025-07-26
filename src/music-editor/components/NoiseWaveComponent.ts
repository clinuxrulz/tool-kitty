import { tsArray, tsObject, TypeSchemaType } from "../../TypeSchema";
import { EcsComponentType } from "../../ecs/EcsComponent";
import { pinTypeSchema } from "./Pin";

const typeSchema = tsObject({
  out: tsArray(pinTypeSchema),
});

export type NoiseWaveState = TypeSchemaType<typeof typeSchema>;

export const noiseWaveComponentType = new EcsComponentType({
  typeName: "NoiseWave",
  typeSchema,
});
