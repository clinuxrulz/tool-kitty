import { tsArray, tsObject, TypeSchemaType } from "tool-kitty-type-schema";
import { EcsComponentType } from "tool-kitty-ecs";
import { pinTypeSchema } from "tool-kitty-node-editor";

const typeSchema = tsObject({
  out: tsArray(pinTypeSchema),
});

export type NoiseWaveState = TypeSchemaType<typeof typeSchema>;

export const noiseWaveComponentType = new EcsComponentType<NoiseWaveState>({
  typeName: "NoiseWave",
  typeSchema,
});
