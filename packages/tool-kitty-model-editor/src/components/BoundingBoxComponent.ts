import { EcsComponentType } from "tool-kitty-ecs";
import { pinTypeSchema } from "tool-kitty-node-editor";
import { tsArray, tsMaybeUndefined, tsObject, TypeSchemaType } from "tool-kitty-type-schema";

const typeSchema = tsObject({
  model: tsMaybeUndefined(pinTypeSchema),
  size: tsMaybeUndefined(pinTypeSchema),
  padding: tsMaybeUndefined(pinTypeSchema),
  out: tsArray(pinTypeSchema),
});

export type BoundingBoxState = TypeSchemaType<typeof typeSchema>;

export const boundingBoxComponentType = new EcsComponentType<BoundingBoxState>({
  typeName: "BoundingBox",
  typeSchema,
});
