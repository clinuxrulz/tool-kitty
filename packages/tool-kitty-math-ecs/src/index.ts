import { tsInvarant, tsNumber, tsObject, TypeSchema, TypeSchemaType } from "tool-kitty-type-schema";
import { Complex, Transform2D, Vec2 } from "tool-kitty-math";
import { EcsComponentType } from "tool-kitty-ecs";

export const vec2TypeSchema = tsInvarant(
  (a) => Vec2.create(a.x, a.y),
  (a) => ({ x: a.x, y: a.y }),
  tsObject({
    x: tsNumber(),
    y: tsNumber(),
  }),
);

export const complexTypeSchema: TypeSchema<Complex> = tsInvarant(
  (a: { x: number; y: number }) => new Complex(a.x, a.y),
  (a: Complex) => ({ x: a.x, y: a.y }),
  tsObject({
    x: tsNumber(),
    y: tsNumber(),
  }),
);

export const transform2DTypeSchema: TypeSchema<Transform2D> = tsInvarant(
  ({ origin, orientation }) => Transform2D.create(origin, orientation),
  (a) => ({ origin: a.origin, orientation: a.orientation }),
  tsObject({
    origin: vec2TypeSchema,
    orientation: complexTypeSchema,
  }),
);

const transform2dComponentTypeSchema = tsObject({
  transform: transform2DTypeSchema,
});

export type Transform2DState = TypeSchemaType<typeof transform2dComponentTypeSchema>;

export const transform2DComponentType = new EcsComponentType<Transform2DState>({
  typeName: "Transform2D",
  typeSchema: transform2dComponentTypeSchema,
});
