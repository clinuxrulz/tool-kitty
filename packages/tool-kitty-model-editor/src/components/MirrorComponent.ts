import { EcsComponentType } from "tool-kitty-ecs";
import { pinTypeSchema } from "tool-kitty-node-editor";
import { tsArray, tsMaybeUndefined, tsObject, TypeSchemaType } from "tool-kitty-type-schema";

const typeSchema = tsObject({
  model: tsMaybeUndefined(pinTypeSchema),
  out: tsArray(pinTypeSchema),
});

export type MirrorState = TypeSchemaType<typeof typeSchema>;

export const mirrorComponentType = new EcsComponentType<MirrorState>({
  typeName: "Mirror",
  typeSchema,
});
