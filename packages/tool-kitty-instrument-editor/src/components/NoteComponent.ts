import { EcsComponentType } from "tool-kitty-ecs";
import { tsArray, tsObject, tsString, TypeSchemaType } from "tool-kitty-type-schema";
import { pinTypeSchema } from "tool-kitty-node-editor";

const typeSchema = tsObject({
  entity: tsString(),
  note: tsString(),
  out: tsArray(pinTypeSchema),
});

export type NoteState = TypeSchemaType<typeof typeSchema>;

export const noteComponentType = new EcsComponentType<NoteState>({
  typeName: "Note",
  typeSchema,
});
