import { EcsComponentType } from "tool-kitty-ecs";
import { tsArray, tsObject, TypeSchemaType } from "tool-kitty-type-schema";
import { pinTypeSchema } from "tool-kitty-node-editor";

const typeSchema = tsObject({
  out: tsArray(pinTypeSchema),
});

export type PianoKeysState = TypeSchemaType<typeof typeSchema>;

export const pianoKeysComponentType = new EcsComponentType<PianoKeysState>({
  typeName: "PianoKeys",
  typeSchema,
});
