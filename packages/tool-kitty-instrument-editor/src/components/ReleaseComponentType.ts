import { tsArray, tsMaybeUndefined, tsObject, TypeSchemaType } from "tool-kitty-type-schema";
import { EcsComponentType } from "tool-kitty-ecs";
import { pinTypeSchema } from "tool-kitty-node-editor";

const typeSchema = tsObject({
  timeToZero: tsMaybeUndefined(pinTypeSchema),
  out: tsArray(pinTypeSchema),
});

export type ReleaseState = TypeSchemaType<typeof typeSchema>;

export const releaseComponentType = new EcsComponentType<ReleaseState>({
  typeName: "Release",
  typeSchema,
});
