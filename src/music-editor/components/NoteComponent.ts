import { EcsComponentType } from "../../lib";
import { tsArray, tsObject, tsString, TypeSchemaType } from "../../TypeSchema";
import { pinTypeSchema } from "./Pin";

const typeSchema = tsObject({
  entity: tsString(),
  note: tsString(),
  out: tsArray(pinTypeSchema),
});

export type NoteState = TypeSchemaType<typeof typeSchema>;

export const noteComponentType = new EcsComponentType({
  typeName: "Note",
  typeSchema,
});
