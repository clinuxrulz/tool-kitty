import { glsl } from "@bigmistqke/view.gl/tag";
import type { GLSL } from "@bigmistqke/view.gl";

export type PinValue = {
  type: "Atom",
  value: string,
} | {
  type: "Model",
  value: {
    sdfFuncName: string,
    colourFuncName: string,
  },
};

export class CodeGenCtx {
  private nextId: number = 0;
  private globalCode: GLSL[] = [];
  private mainBody: GLSL[] = [];
  private colourBody: GLSL[] = [];

  allocVar() {
    return `x${this.nextId++}`;
  }

  insertGlobalCode(code: GLSL) {
    this.globalCode.push(code);
  }

  insertCode(code: GLSL) {
    this.mainBody.push(code);
  }

  insertColourCode(code: GLSL) {
    this.colourBody.push(code);
  }

  genCode() {
    return glsl`precision highp float;
uniform vec2 resolution;
uniform float uFocalLength;
uniform bool uUseOrthogonalProjection;
uniform float uOrthogonalScale;

void defaultColour(vec3 p, out vec4 c) {
  c = vec4(1.0, 1.0, 1.0, 1.0);
}

${this.globalCode}

float map(vec3 p) {
  float d = 10000.0;
  ${this.mainBody}
  return d;
}

void colourMap(vec3 p, out vec4 c) {
  float d = 10000.0;
  ${this.colourBody}
}

bool march(vec3 ro, vec3 rd, out float t) {
  vec3 p = ro;
  t = 0.0;
  for (int i = 0; i < 100; ++i) {
    vec3 p = ro + rd*t;
    float d = map(p);
    if (abs(d) <= 0.01) {
      return true;
    }
    t += d;
  }
  return false;
}

vec3 normal(vec3 p) {
  float d = 0.01;
  float mp = map(p);
  float dx = map(p + vec3(d,0,0)) - mp;
  float dy = map(p + vec3(0,d,0)) - mp;
  float dz = map(p + vec3(0,0,d)) - mp;
  return normalize(vec3(dx,dy,dz));
}

void main(void) {
  float fl = uFocalLength;
  float d = 10000.0;
  float mx = max(resolution.x, resolution.y);
  vec2 uv = gl_FragCoord.xy / mx;
  vec3 w = normalize(vec3(0.0, 0.0, 1.0));
  vec3 u = normalize(cross(vec3(0,1,0),w));
  vec3 v = cross(w,u);
  vec3 ro;
  vec3 rd;
  if (uUseOrthogonalProjection) {
    ro = w * d
       + (gl_FragCoord.x - 0.5 * resolution.x) * u / uOrthogonalScale
       + (gl_FragCoord.y - 0.5 * resolution.y) * v / uOrthogonalScale;
    rd = vec3(0.0, 0.0, -1.0);
  } else {
    ro = w * d;
    rd = normalize(
      (gl_FragCoord.x - 0.5 * resolution.x) * u +
      (gl_FragCoord.y - 0.5 * resolution.y) * v +
      -fl * w
    );
  }
  float t = 0.0;
  bool hit = march(ro, rd, t);
  if (!hit) {
    gl_FragColor = vec4(0.2, 0.2, 0.2, 1.0);
    return;
  }
  vec3 p = ro + rd*t;
  vec3 n = normal(p);
  float s = dot(n,normalize(vec3(1,1,1))) + 0.2;
  vec4 c = vec4(1.0, 1.0, 1.0, 1.0);
  colourMap(p, c);
  gl_FragColor = vec4(c.r * s, c.g * s, c.b * s, c.a);
}`;
  }
}

