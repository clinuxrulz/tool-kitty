import { Vec2 } from "./Vec2";

export class Complex {
  readonly x: number;
  readonly y: number;

  public static rot0: Complex = new Complex(1, 0);

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
  }

  public static xy(xy: Vec2): Complex {
    return new Complex(xy.x, xy.y);
  }

  public static fromAngle(angle: number): Complex {
    let a = (angle * Math.PI) / 180.0;
    return new Complex(Math.cos(a), Math.sin(a));
  }

  public get u(): Vec2 {
    return Vec2.create(this.x, this.y);
  }

  public get v(): Vec2 {
    return Vec2.create(-this.y, this.x);
  }

  public getLengthSquared(): number {
    return this.x * this.x + this.y * this.y;
  }

  public getLength(): number {
    return Math.sqrt(this.getLengthSquared());
  }

  public normalize(): Complex {
    let length: number = this.getLength();
    return new Complex(this.x / length, this.y / length);
  }

  public times(rhs: Complex): Complex {
    let lhs: Complex = this;
    return new Complex(
      lhs.x * rhs.x - lhs.y * rhs.y,
      lhs.x * rhs.y + lhs.y * rhs.x,
    );
  }

  public conjugate(): Complex {
    return new Complex(this.x, -this.y);
  }

  public rotate(p: Vec2): Vec2 {
    let uX: number = this.x;
    let uY: number = this.y;
    let vX: number = -uY;
    let vY: number = uX;
    return Vec2.create(p.x * uX + p.y * vX, p.x * uY + p.y * vY);
  }

  public getAngle(): number {
    return /* toDegrees */ ((x) => (x * 180) / Math.PI)(
      Math.atan2(this.y, this.x),
    );
  }
}
