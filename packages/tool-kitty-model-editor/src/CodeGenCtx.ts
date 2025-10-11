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
  private globalCode: string[] = [];
  private mainBody: string[] = [];

  allocVar() {
    return `x${this.nextId++}`;
  }

  insertGlobalCode(code: string[]) {
    this.globalCode.push(...code);
  }

  insertCode(code: string[]) {
    this.mainBody.push(...code);
  }

  genCode(): string {
    let result = `precision mediump float;
uniform vec2 resolution;
uniform float uFocalLength;

${this.globalCode.join("\r\n")}

float map(vec3 p) {
  float d = 10000.0;
  ${this.mainBody.join("\r\n  ")}
  return d;
}

bool march(vec3 ro, vec3 rd, out float t) {
  vec3 p = ro;
  t = 0.0;
  for (int i = 0; i < 100; ++i) {
    vec3 p = ro + rd*t;
    float d = map(p);
    if (abs(d) < 1.0) {
      return true;
    }
    t += d;
  }
  return false;
}

vec3 normal(vec3 p) {
  float d = 0.001;
  float mp = map(p);
  float dx = map(p + vec3(d,0,0)) - mp;
  float dy = map(p + vec3(0,d,0)) - mp;
  float dz = map(p + vec3(0,0,d)) - mp;
  return normalize(vec3(dx,dy,dz));
}

void main(void) {
  float fl = uFocalLength;
  float d = 52.0 * 200.0 * fl / resolution.x;
  float mx = max(resolution.x, resolution.y);
  vec2 uv = gl_FragCoord.xy / mx;
  vec3 w = normalize(vec3(0, -1, 3));
  vec3 ro = w * d + vec3(0.0, -600.0, 50.0);
  vec3 u = normalize(cross(vec3(0,1,0),w));
  vec3 v = cross(w,u);
  vec3 rd = normalize(
    (gl_FragCoord.x - 0.5 * resolution.x) * u +
    (gl_FragCoord.y - 0.5 * resolution.y) * v +
    -fl * w
  );
  float t = 0.0;
  bool hit = march(ro, rd, t);
  if (!hit) {
    gl_FragColor = vec4(0.2, 0.2, 0.2, 1.0);
    return;
  }
  vec3 p = ro + rd*t;
  vec3 n = normal(p);
  float s = dot(n,normalize(vec3(1,1,1))) + 0.2;
  if (p.z > 101.0) {
    s *= 0.5;
  }
  gl_FragColor = vec4(s,s,s,1.0);
}`;
    return result;
  }
}

