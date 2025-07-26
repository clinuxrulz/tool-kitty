import { tsArray, tsMaybeUndefined, tsObject, TypeSchemaType } from "../../TypeSchema";
import { EcsComponentType } from "../../ecs/EcsComponent";
import { pinTypeSchema } from "./Pin";

const typeSchema = tsObject({
  a: tsMaybeUndefined(pinTypeSchema),
  b: tsMaybeUndefined(pinTypeSchema),
  out: tsArray(pinTypeSchema),
});

export type MultState = TypeSchemaType<typeof typeSchema>;

export const multComponentType = new EcsComponentType({
  typeName: "Mult",
  typeSchema,
});
