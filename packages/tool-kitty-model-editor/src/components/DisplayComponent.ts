import { EcsComponentType } from "tool-kitty-ecs";
import { tsBoolean, tsDefault, tsMaybeUndefined, tsObject, TypeSchemaType } from "tool-kitty-type-schema";
import { pinTypeSchema } from "tool-kitty-node-editor";

const typeSchema = tsObject({
  visible: tsDefault(true, tsBoolean()),
  in: tsMaybeUndefined(pinTypeSchema),
});

export type DisplayState = TypeSchemaType<typeof typeSchema>;

export const displayComponentType = new EcsComponentType<DisplayState>({
  typeName: "Display",
  typeSchema,
});
