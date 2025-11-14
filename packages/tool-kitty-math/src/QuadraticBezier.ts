import { Vec2 } from "./Vec2";

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

  sdf(pt: Vec2): number {
    let A = this.start;
    let B = this.controlPoint;
    let C = this.end;
    let a = B.sub(A);
    let b = A.add(B.multScalar(2.0)).add(C);
    let c = A.multScalar(2.0);
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
        let t = clamp( uv.x+uv.y-kx, 0.0, 1.0 );
        res = dot2(d + (c + b*t)*t);
    } else {
        float z = sqrt(-p);
        float v = acos( q/(p*z*2.0) ) / 3.0;
        float m = cos(v);
        float n = sin(v)*1.732050808;
        vec3  t = clamp(vec3(m+m,-n-m,n-m)*z-kx,0.0,1.0);
        res = min( dot2(d+(c+b*t.x)*t.x),
                   dot2(d+(c+b*t.y)*t.y) );
        // the third root cannot be the closest
        // res = min(res,dot2(d+(c+b*t.z)*t.z));
    }
    return Math.sqrt(res);
  }
}
/*
float sdBezier( in vec2 pos, in vec2 A, in vec2 B, in vec2 C )
{    
    vec2 a = B - A;
    vec2 b = A - 2.0*B + C;
    vec2 c = a * 2.0;
    vec2 d = A - pos;
    float kk = 1.0/dot(b,b);
    float kx = kk * dot(a,b);
    float ky = kk * (2.0*dot(a,a)+dot(d,b)) / 3.0;
    float kz = kk * dot(d,a);      
    float res = 0.0;
    float p = ky - kx*kx;
    float p3 = p*p*p;
    float q = kx*(2.0*kx*kx-3.0*ky) + kz;
    float h = q*q + 4.0*p3;
    if( h >= 0.0) 
    { 
        h = sqrt(h);
        vec2 x = (vec2(h,-h)-q)/2.0;
        vec2 uv = sign(x)*pow(abs(x), vec2(1.0/3.0));
        float t = clamp( uv.x+uv.y-kx, 0.0, 1.0 );
        res = dot2(d + (c + b*t)*t);
    }
    else
    {
        float z = sqrt(-p);
        float v = acos( q/(p*z*2.0) ) / 3.0;
        float m = cos(v);
        float n = sin(v)*1.732050808;
        vec3  t = clamp(vec3(m+m,-n-m,n-m)*z-kx,0.0,1.0);
        res = min( dot2(d+(c+b*t.x)*t.x),
                   dot2(d+(c+b*t.y)*t.y) );
        // the third root cannot be the closest
        // res = min(res,dot2(d+(c+b*t.z)*t.z));
    }
    return sqrt( res );
}
*/

function clamp(x: number, a: number, b: number): number {
  return Math.min(Math.max(x, Math.min(a, b)), Math.max(a, b));
}