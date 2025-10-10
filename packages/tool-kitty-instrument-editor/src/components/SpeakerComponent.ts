import { EcsComponentType } from "tool-kitty-ecs";
import { tsMaybeUndefined, tsObject, TypeSchemaType } from "tool-kitty-type-schema";
import { pinTypeSchema } from "tool-kitty-node-editor";

const typeSchema = tsObject({
  in: tsMaybeUndefined(pinTypeSchema),
});

export type SpeakerState = TypeSchemaType<typeof typeSchema>;

export const speakerComponentType = new EcsComponentType<SpeakerState>({
  typeName: "Speaker",
  typeSchema,
});
