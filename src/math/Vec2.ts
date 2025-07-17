export class Vec2 {
  readonly x: number;
  readonly y: number;

  private constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
  }

  static create(x: number, y: number): Vec2 {
    return new Vec2(x, y);
  }

  static readonly zero: Vec2 = Vec2.create(0, 0);
  static readonly unitX: Vec2 = Vec2.create(1, 0);
  static readonly unitY: Vec2 = Vec2.create(0, 1);

  add(other: Vec2): Vec2 {
    return Vec2.create(this.x + other.x, this.y + other.y);
  }

  sub(other: Vec2): Vec2 {
    return Vec2.create(this.x - other.x, this.y - other.y);
  }

  multScalar(s: number): Vec2 {
    return Vec2.create(this.x * s, this.y * s);
  }

  cross(other: Vec2): number {
    return this.x * other.y - this.y * other.x;
  }

  distanceSquared(other: Vec2): number {
    let dx = other.x - this.x;
    let dy = other.y - this.y;
    return dx * dx + dy * dy;
  }

  distance(other: Vec2): number {
    return Math.sqrt(this.distanceSquared(other));
  }

  lengthSquared(): number {
    return this.x * this.x + this.y * this.y;
  }

  length(): number {
    return Math.sqrt(this.lengthSquared());
  }

  normalize(): Vec2 {
    return this.multScalar(1.0 / this.length());
  }
}
