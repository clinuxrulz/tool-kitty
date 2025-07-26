import { tsArray, tsMaybeUndefined, tsObject, TypeSchemaType } from "../../TypeSchema";
import { EcsComponentType } from "../../ecs/EcsComponent";
import { pinTypeSchema } from "./Pin";

const typeSchema = tsObject({
  a: tsMaybeUndefined(pinTypeSchema),
  b: tsMaybeUndefined(pinTypeSchema),
  out: tsArray(pinTypeSchema),
});

export type AddState = TypeSchemaType<typeof typeSchema>;

export const addComponentType = new EcsComponentType({
  typeName: "Add",
  typeSchema,
});
