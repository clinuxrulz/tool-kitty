import { EcsComponentType } from "tool-kitty-ecs";
import { pinTypeSchema } from "tool-kitty-node-editor";
import { tsArray, tsMaybeUndefined, tsObject, TypeSchemaType } from "tool-kitty-type-schema";

const typeSchema = tsObject({
  model: tsMaybeUndefined(pinTypeSchema),
  scaleX: tsMaybeUndefined(pinTypeSchema),
  out: tsArray(pinTypeSchema),
});

export type ScaleXState = TypeSchemaType<typeof typeSchema>;

export const scaleXComponentType = new EcsComponentType<ScaleXState>({
  typeName: "ScaleX",
  typeSchema,
});
