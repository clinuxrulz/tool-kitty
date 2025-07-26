import { tsArray, tsMaybeUndefined, tsObject, TypeSchemaType } from "../../TypeSchema";
import { EcsComponentType } from "../../ecs/EcsComponent";
import { pinTypeSchema } from "./Pin";

const typeSchema = tsObject({
  frequency: tsMaybeUndefined(pinTypeSchema),
  amplitude: tsMaybeUndefined(pinTypeSchema),
  centre: tsMaybeUndefined(pinTypeSchema),
  out: tsArray(pinTypeSchema),
});

export type SquareWaveState = TypeSchemaType<typeof typeSchema>;

export const squareWaveComponentType = new EcsComponentType({
  typeName: "SquareWave",
  typeSchema,
});
