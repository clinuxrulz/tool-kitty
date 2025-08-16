import { EcsComponentType } from "../../lib";
import { tsArray, tsMaybeUndefined, tsObject, TypeSchemaType } from "../../TypeSchema";
import { pinTypeSchema } from "./Pin";

const typeSchema = tsObject({
  frequency: tsMaybeUndefined(pinTypeSchema),
  out: tsArray(pinTypeSchema),
});

export type MeowState = TypeSchemaType<typeof typeSchema>;

export const meowComponentType = new EcsComponentType({
  typeName: "Meow",
  typeSchema,
});
