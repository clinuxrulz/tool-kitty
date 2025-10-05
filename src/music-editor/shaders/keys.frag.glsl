#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif

uniform float time;
uniform float uOffsetY;
uniform vec2 resolution;
uniform float uFocalLength;

float sdRoundBox(vec3 p, vec3 b, float r){
  vec3 q = abs(p) - b + r;
  return length(max(q,0.0)) + min(max(q.x,max(q.y,q.z)),0.0) - r;
}

float map(vec3 p) {
  p.x += 700.0;
  float b = 100.0*7.0/12.0;
  vec3 p3 = p;
  vec3 p2 = p;
  p.x = mod(p.x + 100.0, 200.0) - 100.0;
  float i = mod(floor((p2.x) / (2.0*b)) - 6.0,12.0);
  p2.x = mod(p2.x, b*2.0);
  bool skipB = false;
  float w = 52.0 * 200.0;
  if ( i == 0.0 || i == 2.0 ||
       i == 4.0 || i == 6.0 ||
       i == 7.0 || i == 9.0 || i == 11.0 ||
       p3.x < -0.5*w+900.0 ||
       p3.x > 0.5*w+600.0
  ) {
    skipB = true;
  }
  float d3;
  float d1 = sdRoundBox(p, vec3(100,600,100), 30.0);
  if (skipB) {
    d3 = d1;
  } else {
    d3 = min(
      d1,
      sdRoundBox(p2 + vec3(-b,-180,-150), vec3(100*7/12,420,50), 20.0)
    );
  }
  return max(d3,
    max(
      p3.x - 0.5 * w - 700.0,
      -p3.x - 0.5 * w + 700.0
    )
  );
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
}
