import { EcsComponentType } from "tool-kitty-ecs";
import { pinTypeSchema } from "tool-kitty-node-editor";
import { tsArray, tsMaybeUndefined, tsObject, TypeSchemaType } from "tool-kitty-type-schema";

const typeSchema = tsObject({
  model2D: tsMaybeUndefined(pinTypeSchema),
  height: tsMaybeUndefined(pinTypeSchema),
  out: tsArray(pinTypeSchema),
});

export type ExtrusionState = TypeSchemaType<typeof typeSchema>;

export const extrusionComponentType = new EcsComponentType<ExtrusionState>({
  typeName: "Extrusion",
  typeSchema,
});
