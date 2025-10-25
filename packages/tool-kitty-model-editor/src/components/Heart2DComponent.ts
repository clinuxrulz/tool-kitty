import { EcsComponentType } from "tool-kitty-ecs";
import { pinTypeSchema } from "tool-kitty-node-editor";
import { tsArray, tsObject, TypeSchemaType } from "tool-kitty-type-schema";

const typeSchema = tsObject({
  out: tsArray(pinTypeSchema),
});

export type Heart2DState = TypeSchemaType<typeof typeSchema>;

export const heart2DComponentType = new EcsComponentType<Heart2DState>({
  typeName: "Heart2D",
  typeSchema,
});
