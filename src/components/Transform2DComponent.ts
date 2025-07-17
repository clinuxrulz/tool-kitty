import { EcsComponentType } from "../ecs/EcsComponent";
import { Complex } from "../math/Complex";
import { Transform2D } from "../math/Transform2D";
import { Vec2 } from "../math/Vec2";
import {
  tsInvarant,
  tsNumber,
  tsObject,
  TypeSchema,
  TypeSchemaType,
  vec2TypeSchema,
} from "../TypeSchema";

let complexTypeSchema: TypeSchema<Complex> = tsInvarant(
  (a: { x: number; y: number }) => new Complex(a.x, a.y),
  (a: Complex) => ({ x: a.x, y: a.y }),
  tsObject({
    x: tsNumber(),
    y: tsNumber(),
  }),
);

let transformTypeSchema: TypeSchema<Transform2D> = tsInvarant(
  ({ origin, orientation }) => Transform2D.create(origin, orientation),
  (a) => ({ origin: a.origin, orientation: a.orientation }),
  tsObject({
    origin: vec2TypeSchema,
    orientation: complexTypeSchema,
  }),
);

const typeSchema = tsObject({
  transform: transformTypeSchema,
});

export type Transform2DState = TypeSchemaType<typeof typeSchema>;

export const transform2DComponentType = new EcsComponentType<Transform2DState>({
  typeName: "Transform2D",
  typeSchema,
});
