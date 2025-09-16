import { EcsComponentType } from "../../lib";
import { tsArray, tsMaybeUndefined, tsObject, TypeSchemaType } from "../../TypeSchema";
import { pinTypeSchema } from "./Pin";

const typeSchema = tsObject({
  prev: tsMaybeUndefined(pinTypeSchema),
  entry: tsMaybeUndefined(pinTypeSchema),
  next: tsArray(pinTypeSchema),
});

export type GotoState = TypeSchemaType<typeof typeSchema>;

export const gotoComponentType = new EcsComponentType({
  typeName: "Goto",
  typeSchema,
});
