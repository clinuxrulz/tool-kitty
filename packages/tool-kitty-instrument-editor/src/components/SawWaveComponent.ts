import { tsArray, tsMaybeUndefined, tsObject, TypeSchemaType } from "tool-kitty-type-schema";
import { EcsComponentType } from "tool-kitty-ecs";
import { pinTypeSchema } from "tool-kitty-node-editor";

const typeSchema = tsObject({
  frequency: tsMaybeUndefined(pinTypeSchema),
  amplitude: tsMaybeUndefined(pinTypeSchema),
  centre: tsMaybeUndefined(pinTypeSchema),
  out: tsArray(pinTypeSchema),
});

export type SawWaveState = TypeSchemaType<typeof typeSchema>;

export const sawWaveComponentType = new EcsComponentType<SawWaveState>({
  typeName: "SawWave",
  typeSchema,
});
