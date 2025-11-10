import { glsl, uniform } from "@bigmistqke/view.gl/tag";
import type { GLSL, GLSLSlot } from "@bigmistqke/view.gl";

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

  genCode(params: { maxIterations?: number, }) {
    let maxIterations = params.maxIterations ?? 100;
    return glsl`precision highp float;
uniform vec2 resolution;
uniform float uTollerance;
uniform float uMaxStep;
uniform float uFocalLength;
uniform mat4 uInverseViewMatrix;
uniform bool uUseOrthogonalProjection;
uniform float uOrthogonalScale;

float dot2( in vec2 v ) { return dot(v,v); }
float dot2( in vec3 v ) { return dot(v,v); }
float ndot( in vec2 a, in vec2 b ) { return a.x*b.x - a.y*b.y; }

void defaultColour(vec3 p, out vec4 c) {
  c = vec4(1.0, 1.0, 1.0, 1.0);
}

${this.globalCode}

float map(vec3 p) {
  float d = 100000000.0;
  ${this.mainBody}
  return d;
}

void colourMap(vec3 p, out vec4 c) {
  float d = 100000000.0;
  ${this.colourBody}
}

bool march(vec3 ro, vec3 rd, bool negateDist, out float t) {
  vec3 p = ro;
  t = 0.0;
  for (int i = 0; i < ${maxIterations}; ++i) {
    vec3 p = ro + rd*t;
    float d = map(p);
    if (negateDist) {
      d = -d;
    }
    if (d <= uTollerance) {
      return true;
    }
    if (d > uMaxStep) {
      return false;
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
    ro = (gl_FragCoord.x - 0.5 * resolution.x) * u / uOrthogonalScale
       + (gl_FragCoord.y - 0.5 * resolution.y) * v / uOrthogonalScale;
    rd = vec3(0.0, 0.0, -1.0);
  } else {
    ro = vec3(0.0);
    rd = normalize(
      (gl_FragCoord.x - 0.5 * resolution.x) * u +
      (gl_FragCoord.y - 0.5 * resolution.y) * v +
      -fl * w
    );
  }
  vec3 rp = ro + rd;
  ro = (uInverseViewMatrix * vec4(ro, 1.0)).xyz;
  rp = (uInverseViewMatrix * vec4(rp, 1.0)).xyz;
  rd = rp - ro;
  float t = 0.0;
  bool hit = march(ro, rd, false, t);
  if (!hit) {
    gl_FragColor = vec4(0.2, 0.2, 0.2, 1.0);
    return;
  }
  vec3 p = ro + rd*t;
  vec3 n = normal(p);
  float s = dot(n,normalize(vec3(1,1,1))) + 0.2;
  vec4 c = vec4(1.0, 1.0, 1.0, 1.0);
  colourMap(p, c);
  c = vec4(c.rgb * s, c.a);
  if (c.a < 1.0) {
    vec3 ro2 = p + rd*100.0;
    vec3 rd2 = refract(rd, n, 1.0/1.5);
    march(ro2, rd2, true, t);
    p = ro2 + rd2*t;
    n = normal(p);
    ro2 = p + rd2*100.0;
    rd2 = refract(rd2, -n, 1.5);
    hit = march(ro2, rd2, false, t);
    vec4 c2;
    if (!hit) {
      c2 = vec4(0.2,0.2,0.2,1.0);
    } else {
      p = ro2 + rd2*t;
      n = normal(p);
      colourMap(p, c2);
      s = dot(n,normalize(vec3(1,1,1))) + 0.2;
      c2 = vec4(c2.rgb * s, 1.0);
    }
    c = vec4(c.rgb * c.a + c2.rgb * (1.0 - c.a), 1.0);
  }
  gl_FragColor = c;
}`;
  }

  sdfEvaluatorCodeGen(): GLSL<[{
    type: "uniform";
    kind: "ivec3";
    key: "uNumCubes";
}, {
    type: "uniform";
    kind: "ivec2";
    key: "uResolution";
}, {
    type: "uniform";
    kind: "vec3";
    key: "uEvalMin";
}, {
    type: "uniform";
    kind: "float";
    key: "uCubeSize";
}, any, any]> {
    return glsl`precision highp float;
${uniform.ivec3("uNumCubes")}
${uniform.ivec2("uResolution")}
${uniform.vec3("uEvalMin")}
${uniform.float("uCubeSize")}

float dot2( in vec2 v ) { return dot(v,v); }
float dot2( in vec3 v ) { return dot(v,v); }
float ndot( in vec2 a, in vec2 b ) { return a.x*b.x - a.y*b.y; }

void defaultColour(vec3 p, out vec4 c) {
  c = vec4(1.0, 1.0, 1.0, 1.0);
}

${this.globalCode}

float map(vec3 p) {
  float d = 100000000.0;
  ${this.mainBody}
  return d;
}

// https://github.com/mikolalysenko/glsl-read-float/blob/master/index.glsl
#define FLOAT_MAX  1.70141184e38
#define FLOAT_MIN  1.17549435e-38

lowp vec4 encode_float(highp float v) {
  highp float av = abs(v);

  //Handle special cases
  if(av < FLOAT_MIN) {
    return vec4(0.0, 0.0, 0.0, 0.0);
  } else if(v > FLOAT_MAX) {
    return vec4(127.0, 128.0, 0.0, 0.0) / 255.0;
  } else if(v < -FLOAT_MAX) {
    return vec4(255.0, 128.0, 0.0, 0.0) / 255.0;
  }

  highp vec4 c = vec4(0,0,0,0);

  //Compute exponent and mantissa
  highp float e = floor(log2(av));
  highp float m = av * pow(2.0, -e) - 1.0;
  
  //Unpack mantissa
  c[1] = floor(128.0 * m);
  m -= c[1] / 128.0;
  c[2] = floor(32768.0 * m);
  m -= c[2] / 32768.0;
  c[3] = floor(8388608.0 * m);
  
  //Unpack exponent
  highp float ebias = e + 127.0;
  c[0] = floor(ebias / 2.0);
  ebias -= c[0] * 2.0;
  c[1] += floor(ebias) * 128.0; 

  //Unpack sign bit
  c[0] += 128.0 * step(0.0, -v);

  //Scale back to range
  return c / 255.0;
}

void main(void) {
  int idx = int(gl_FragCoord.y * float(uResolution.x) + gl_FragCoord.x);
  int cubeZIdx = idx / (uNumCubes.x * uNumCubes.y);
  idx = idx - cubeZIdx * uNumCubes.x * uNumCubes.y;
  int cubeYIdx = idx / uNumCubes.x;
  idx = idx - cubeYIdx * uNumCubes.x;
  int cubeXIdx = idx;
  vec3 p = uEvalMin + vec3(cubeXIdx, cubeYIdx, cubeZIdx) * uCubeSize;
  float r = map(p);
  gl_FragColor = encode_float(r);
}
`;
  }
}

