import { EcsComponentType } from "tool-kitty-ecs";
import { pinTypeSchema } from "tool-kitty-node-editor";
import { tsArray, tsMaybeUndefined, tsObject, TypeSchemaType } from "tool-kitty-type-schema";

const typeSchema = tsObject({
  model: tsMaybeUndefined(pinTypeSchema),
  axis: tsMaybeUndefined(pinTypeSchema),
  angle: tsMaybeUndefined(pinTypeSchema),
  out: tsArray(pinTypeSchema),
});

export type RotateState = TypeSchemaType<typeof typeSchema>;

export const rotateComponentType = new EcsComponentType<RotateState>({
  typeName: "Rotate",
  typeSchema,
});
