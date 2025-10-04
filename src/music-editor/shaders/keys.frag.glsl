#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif

uniform float time;
uniform vec2 resolution;

float sdRoundBox(vec3 p, vec3 b, float r){
  vec3 q = abs(p) - b + r;
  return length(max(q,0.0)) + min(max(q.x,max(q.y,q.z)),0.0) - r;
}

float map(vec3 p) {
  float b = 100.0*7.0/12.0;
  vec3 p2 = p;
  p.x = mod(p.x + 100.0, 200.0) - 100.0;
  float i = mod(floor((p2.x) / (2.0*b)) - 6.0,12.0);
  p2.x = mod(p2.x, b*2.0);
  bool skipB = false;
  if ( i == 0.0 || i == 2.0 ||
       i == 4.0 || i == 6.0 ||
       i == 7.0 || i == 9.0 || i == 11.0) {
    skipB = true;
  }
  float d1 = sdRoundBox(p, vec3(100,600,100), 30.0);
  if (skipB) {
    return d1;
  }
  return min(
    d1,
    sdRoundBox(p2 + vec3(-b,-180,-150), vec3(100*7/12,420,50), 20.0)
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
  float fl = 1000.0;
  float mx = max(resolution.x, resolution.y);
  vec2 uv = gl_FragCoord.xy / mx;
  vec3 ro = vec3(0.0, -2000.0, 2000.0 + 1000.0*sin(time));
  vec3 w = normalize(ro);
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
    gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
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
