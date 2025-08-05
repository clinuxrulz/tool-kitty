import { EcsComponentType } from "../../lib";
import { tsMaybeUndefined, tsObject, TypeSchemaType } from "../../TypeSchema";
import { pinTypeSchema } from "./Pin";

const typeSchema = tsObject({
  in: tsMaybeUndefined(pinTypeSchema),
});

export type SpeakerState = TypeSchemaType<typeof typeSchema>;

export const speakerComponentType = new EcsComponentType({
  typeName: "Speaker",
  typeSchema,
});
