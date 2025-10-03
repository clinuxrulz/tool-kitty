uniform float uFocalLength;
uniform mat4 uInvMV;
uniform vec2 uRes;

void main(void) {
  vec3 ro = (uInvMV * vec4(0,0,0,1)).xyz;
  vec3 rd = ((uInvMV * vec4(gl_FragCoord.x - 0.5 * uRes.x, gl_FragCoord.y - 0.5 * uRes.y, uFocalLength)).xyz - ro).normalize();
  
  gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0);
}
