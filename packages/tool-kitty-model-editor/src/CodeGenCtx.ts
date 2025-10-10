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
  private funcCode = new Map<string,{
    declaration: string[],
    body: string[],
  }>();
  private mainBody: string[] = [];
  private inFn: string | undefined;

  allocVar() {
    return `x${this.nextId++}`;
  }

  insertCode(code: string[]) {
    let body: string[];
    if (this.inFn != undefined) {
      body = this.funcCode.get(this.inFn)!.body;
    } else {
      body = this.mainBody;
    }
    code.push(...code);
  }

  implFn(params: {
    declaration: string[],
    body: () => void,
  }): string {
    let fnName = this.allocVar();
    let oldInFn = this.inFn;
    this.inFn = fnName;
    try {
      let fn: {
        declaration: string[],
        body: string[],
      } = {
        declaration: params.declaration,
        body: [],
      };
      params.body();
      this.funcCode.set(fnName, fn);
      return fnName;
    } finally {
      this.inFn = oldInFn;
    }
  }

  genCode(): string {
    let result = `precision mediump float;
uniform vec2 resolution;
uniform float uFocalLength;

${this.funcCode.entries().flatMap(([_funcName, { declaration, body }]) => [
  ...declaration, " {\r\n",
  ...body.map((line) => `  ${line}`),
  "}\r\n",
]).toArray()}

float map(vec3 p) {
  let d = 10_000.0;
  ${this.mainBody.map((line) => `${line}\r\n`).join("  ")}
  return p.length - 10.0;
}

bool march(vec3 ro, vec3 rd, out float t) {
  vec3 p = ro;
  t = 0.0;
  for (int i = 0; i < 20; ++i) {
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
  ro -= uOffsetY * v;
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

