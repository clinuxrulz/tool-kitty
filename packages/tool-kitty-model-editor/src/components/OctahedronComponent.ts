import { EcsComponentType } from "tool-kitty-ecs";
import { pinTypeSchema } from "tool-kitty-node-editor";
import { tsArray, tsMaybeUndefined, tsObject, TypeSchemaType } from "tool-kitty-type-schema";

const typeSchema = tsObject({
  size: tsMaybeUndefined(pinTypeSchema),
  out: tsArray(pinTypeSchema),
});

export type OctahedronState = TypeSchemaType<typeof typeSchema>;

export const octahedronComponentType = new EcsComponentType<OctahedronState>({
  typeName: "Octahedron",
  typeSchema,
});
