import { Vec2 } from "./Vec2";
import { Complex } from "./Complex";

export class Transform2D {
  readonly origin: Vec2;
  readonly orientation: Complex;

  public static readonly identity: Transform2D = new Transform2D(
    Vec2.zero,
    Complex.rot0,
  );

  constructor(origin: Vec2, orientation: Complex) {
    this.origin = origin;
    this.orientation = orientation;
  }

  public static create(origin: Vec2, orientation: Complex): Transform2D {
    return new Transform2D(origin, orientation);
  }

  public get u(): Vec2 {
    return this.orientation.u;
  }

  public get v(): Vec2 {
    return this.orientation.v;
  }
  public pointFromSpace(p: Vec2): Vec2 {
    return this.orientation.rotate(p).add(this.origin);
  }

  public pointToSpace(p: Vec2): Vec2 {
    return this.orientation.conjugate().rotate(p.sub(this.origin));
  }

  public vectorFromSpace(v: Vec2): Vec2 {
    return this.orientation.rotate(v);
  }

  public vectorToSpace(v: Vec2): Vec2 {
    return this.orientation.conjugate().rotate(v);
  }

  public transformFromSpace(a: Transform2D): Transform2D {
    return Transform2D.create(
      this.pointFromSpace(a.origin),
      a.orientation.times(this.orientation),
    );
  }

  public transformToSpace(a: Transform2D): Transform2D {
    return Transform2D.create(
      this.pointToSpace(a.origin),
      this.orientation.conjugate().times(a.orientation),
    );
  }
}
