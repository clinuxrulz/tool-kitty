import { EcsComponentType } from "../../lib";
import { tsArray, tsMaybeUndefined, tsObject, TypeSchemaType } from "../../TypeSchema";
import { pinTypeSchema } from "./Pin";

const typeSchema = tsObject({
  prev: tsMaybeUndefined(pinTypeSchema),
  delay: tsMaybeUndefined(pinTypeSchema),
  next: tsArray(pinTypeSchema),
});

export type DelayState = TypeSchemaType<typeof typeSchema>;

export const delayComponentType = new EcsComponentType({
  typeName: "Delay",
  typeSchema,
});
