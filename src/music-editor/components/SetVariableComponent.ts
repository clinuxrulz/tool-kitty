import { EcsComponentType } from "../../lib";
import { tsArray, tsMaybeUndefined, tsObject, tsString, TypeSchemaType } from "../../TypeSchema";
import { pinTypeSchema } from "./Pin";

const typeSchema = tsObject({
  id: tsString(),
  prev: tsMaybeUndefined(pinTypeSchema),
  value: tsMaybeUndefined(pinTypeSchema),
  next: tsArray(pinTypeSchema),
});

export type SetVariableState = TypeSchemaType<typeof typeSchema>;

export const setVariableComponentType = new EcsComponentType({
  typeName: "SetVariable",
  typeSchema,
});
