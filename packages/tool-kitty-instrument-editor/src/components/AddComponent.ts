import { tsArray, tsMaybeUndefined, tsObject, TypeSchemaType } from "tool-kitty-type-schema";
import { EcsComponentType } from "tool-kitty-ecs";
import { pinTypeSchema } from "tool-kitty-node-editor";

const typeSchema = tsObject({
  a: tsMaybeUndefined(pinTypeSchema),
  b: tsMaybeUndefined(pinTypeSchema),
  out: tsArray(pinTypeSchema),
});

export type AddState = TypeSchemaType<typeof typeSchema>;

export const addComponentType = new EcsComponentType<AddState>({
  typeName: "Add",
  typeSchema,
});
