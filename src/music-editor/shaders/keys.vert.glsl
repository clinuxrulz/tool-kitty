attribute vec4 aVertexPosition;

uniform mat4 uModelViewMatrix;

void main(void) {
  gl_Position = uModelViewMatrix * aVertexPosition;
}
