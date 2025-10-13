import { EcsComponentType } from "tool-kitty-ecs";
import { pinTypeSchema } from "tool-kitty-node-editor";
import { tsArray, tsNumber, tsObject, TypeSchemaType } from "tool-kitty-type-schema";

const typeSchema = tsObject({
  colour: tsObject({
    red: tsNumber(),
    green: tsNumber(),
    blue: tsNumber(),
    alpha: tsNumber(),
  }),
  out: tsArray(pinTypeSchema),
});

export type ColourState = TypeSchemaType<typeof typeSchema>;

export const colourComponentType = new EcsComponentType<ColourState>({
  typeName: "Colour",
  typeSchema,
});
