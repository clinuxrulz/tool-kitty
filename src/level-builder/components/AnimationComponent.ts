import { tsArray, tsObject, tsString, TypeSchemaType } from "../../TypeSchema";
import { EcsComponentType } from "../../ecs/EcsComponent";

const typeSchema = tsObject({
  name: tsString(),
  frameIds: tsArray(tsString()),
});

export type AnimationState = TypeSchemaType<typeof typeSchema>;

export const animationComponentType = new EcsComponentType({
  typeName: "Animation",
  typeSchema,
});
