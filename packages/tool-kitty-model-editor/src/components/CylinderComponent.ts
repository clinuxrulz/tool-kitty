import { EcsComponentType } from "tool-kitty-ecs";
import { pinTypeSchema } from "tool-kitty-node-editor";
import { tsArray, tsMaybeUndefined, tsObject, TypeSchemaType } from "tool-kitty-type-schema";

const typeSchema = tsObject({
  radius: tsMaybeUndefined(pinTypeSchema),
  height: tsMaybeUndefined(pinTypeSchema),
  out: tsArray(pinTypeSchema),
});

export type CylinderState = TypeSchemaType<typeof typeSchema>;

export const cylinderComponentType = new EcsComponentType<CylinderState>({
  typeName: "Cylinder",
  typeSchema,
});
