import { tsArray, tsMaybeUndefined, tsObject, TypeSchemaType } from "../../TypeSchema";
import { EcsComponentType } from "./../../ecs/EcsComponent";
import { pinTypeSchema } from "./Pin";

const typeSchema = tsObject({
  frequency: tsMaybeUndefined(pinTypeSchema),
  amplitude: tsMaybeUndefined(pinTypeSchema),
  centre: tsMaybeUndefined(pinTypeSchema),
  out: tsArray(pinTypeSchema),
});

export type SawWaveState = TypeSchemaType<typeof typeSchema>;

export const sawWaveComponentType = new EcsComponentType({
  typeName: "SawWave",
  typeSchema,
});
