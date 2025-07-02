import { EcsComponentType } from "../ecs/EcsComponent";
import { tsNumber, tsObject, tsString, TypeSchemaType } from "../TypeSchema";

const typeSchema = tsObject({
  textureAtlasFilename: tsString(),
  animationName: tsString(),
  frameIndex: tsNumber(),
});

export type AnimatedState = TypeSchemaType<typeof typeSchema>;

export const animatedComponentType = new EcsComponentType<AnimatedState>({
  typeName: "Animated",
  typeSchema,
});
