import {
  EcsComponentType,
  tsObject,
  TypeSchemaType,
  Vec2,
  vec2TypeSchema,
} from "../lib";

const typeSchema = tsObject({
  velocity: vec2TypeSchema,
});

export type Velocity2DState = TypeSchemaType<typeof typeSchema>;

export const velocity2DComponentType = new EcsComponentType<Velocity2DState>({
  typeName: "Velocity2D",
  typeSchema,
});
