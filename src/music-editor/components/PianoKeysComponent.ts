import { EcsComponentType } from "../../lib";
import { tsArray, tsObject, TypeSchemaType } from "../../TypeSchema";
import { pinTypeSchema } from "./Pin";

const typeSchema = tsObject({
  out: tsArray(pinTypeSchema),
});

export type PianoKeysState = TypeSchemaType<typeof typeSchema>;

export const pianoKeysComponentType = new EcsComponentType({
  typeName: "PianoKeys",
  typeSchema,
});
