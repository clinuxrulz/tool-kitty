import { Vec2 } from "./Vec2";
import { Vec3 } from "./Vec3";

export class QuadraticBezier {
  readonly start: Vec2;
  readonly end: Vec2;
  readonly controlPoint: Vec2;

  constructor(params: {
    start: Vec2,
    end: Vec2,
    controlPoint: Vec2,
  }) {
    this.start = params.start;
    this.end = params.end;
    this.controlPoint = params.controlPoint;
  }

  sdfWithLimit(pt: Vec2, limit: number): number | undefined {
    let minX = Math.min(this.start.x, this.end.x, this.controlPoint.x);
    let minY = Math.min(this.start.y, this.end.y, this.controlPoint.y);
    let maxX = Math.max(this.start.x, this.end.x, this.controlPoint.x);
    let maxY = Math.max(this.start.y, this.end.y, this.controlPoint.y);
    if (pt.x < minX - limit) {
      return undefined;
    }
    if (pt.y < minY - limit) {
      return undefined;
    }
    if (pt.x > maxX + limit) {
      return undefined;
    }
    if (pt.y > maxY + limit) {
      return undefined;
    }
    let dist = this.sdf(pt);
    if (!Number.isFinite(dist)) {
      return undefined;
    }
    if (dist > limit) {
      return undefined;
    }
    return dist;
  }

  sdf(pt: Vec2): number {
    let A = this.start;
    let B = this.controlPoint;
    let C = this.end;
    let a = B.sub(A);
    let b = A.sub(B.multScalar(2.0)).add(C);
    let c = a.multScalar(2.0);
    let d = A.sub(pt);
    let kk = 1.0 / b.dot(b);
    let kx = kk * a.dot(b);
    let ky = kk * (2.0*a.dot(a)+d.dot(b)) / 3.0;
    let kz = kk * d.dot(a);
    let res = 0.0;
    let p = ky - kx*kx;
    let p3 = p*p*p;
    let q = kx*(2.0*kx*kx-3.0*ky) + kz;
    let h = q*q + 4.0*p3;
    if(h >= 0.0) { 
        h = Math.sqrt(h);
        let x = Vec2.create(h - q, -h - q).multScalar(0.5);
        let uv = Vec2.create(
          Math.sign(x.x)*Math.pow(Math.abs(x.x), 1.0 / 3.0),
          Math.sign(x.y)*Math.pow(Math.abs(x.y), 1.0 / 3.0),
        );
        let t = clamp(uv.x+uv.y-kx, 0.0, 1.0 );
        res = dot2(d.add(c.add(b.multScalar(t)).multScalar(t)));
    } else {
        let z = Math.sqrt(-p);
        let v = Math.acos(q / (p*z*2.0)) / 3.0;
        let m = Math.cos(v);
        let n = Math.sin(v) * 1.732050808;
        let t = clamp(
          Vec3.create(
            m+m,-n-m,n-m
          ).scale(z).sub(Vec3.create(kx, kx, kx)),
          0.0,
          1.0,
        );
        res = Math.min(
          dot2(d.add(c.add(b.multScalar(t.x)).multScalar(t.x))),
          dot2(d.add(c.add(b.multScalar(t.y)).multScalar(t.y))),
        );
    }
    return Math.sqrt(res);
  }

  svgPathString(params?: {
    invertY?: boolean
  }): string {
    let yScale = (params?.invertY ?? false) ? -1.0 : 1.0;
    return `M ${this.start.x} ${this.start.y*yScale} Q ${
      this.controlPoint.x
    } ${
      this.controlPoint.y*yScale
    } ${
      this.end.x
    } ${
      this.end.y*yScale
    }`;
  }
}

function dot2(a: Vec2) {
  return a.dot(a);
}

function clamp(x: number, a: number, b: number): number;
function clamp(x: Vec3, a: number, b: number): Vec3;
function clamp(x: number | Vec3, a: number, b: number): number | Vec3 {
  let min_ab = Math.min(a, b);
  let max_ab = Math.max(a, b);
  if (x instanceof Vec3) {
    return Vec3.create(
      Math.min(Math.max(x.x, min_ab), max_ab),
      Math.min(Math.max(x.y, min_ab), max_ab),
      Math.min(Math.max(x.z, min_ab), max_ab),
    );
  } else {
    return Math.min(Math.max(x, min_ab), max_ab);
  }
}
