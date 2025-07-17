import * as PIXI from "pixi.js";

const vertex =
  "in vec2 aPosition;\n\nout vec2 vTextureCoord;\nout vec2 vMaskCoord;\n\n\nuniform vec4 uInputSize;\nuniform vec4 uOutputFrame;\nuniform vec4 uOutputTexture;\nuniform mat3 uFilterMatrix;\n\nvec4 filterVertexPosition(  vec2 aPosition )\n{\n    vec2 position = aPosition * uOutputFrame.zw + uOutputFrame.xy;\n       \n    position.x = position.x * (2.0 / uOutputTexture.x) - 1.0;\n    position.y = position.y * (2.0*uOutputTexture.z / uOutputTexture.y) - uOutputTexture.z;\n\n    return vec4(position, 0.0, 1.0);\n}\n\nvec2 filterTextureCoord(  vec2 aPosition )\n{\n    return aPosition * (uOutputFrame.zw * uInputSize.zw);\n}\n\nvec2 getFilterCoord( vec2 aPosition )\n{\n    return  ( uFilterMatrix * vec3( filterTextureCoord(aPosition), 1.0)  ).xy;\n}   \n\nvoid main(void)\n{\n    gl_Position = filterVertexPosition(aPosition);\n    vTextureCoord = filterTextureCoord(aPosition);\n    vMaskCoord = getFilterCoord(aPosition);\n}\n";
const fragment = `
in vec2 vTextureCoord;
in vec4 vColor;

out vec4 finalColor;

uniform float uNoise;
uniform float uSeed;
uniform sampler2D uTexture;

float colorDifference(vec4 c1, vec4 c2) {
    vec4 delta = c1 - c2;
    return length(delta);
}


void main()
{
    vec4 currentColor = texture(uTexture, vTextureCoord);
    vec4 whiteColor = vec4(1.0);
    float difference = colorDifference(currentColor, whiteColor);

    if (difference < 0.01) {
        finalColor = vec4(0.0, 0.0, 0.0, 0.0); // Transparent black
    } else {
        finalColor = currentColor;
    }
}
`;

export class PixiRemoveBgColourFilter extends PIXI.Filter {
  constructor() {
    super({
      glProgram: new PIXI.GlProgram({
        vertex,
        fragment,
      }),
      resources: {
        // uniforms can go here
      },
    });
  }
}
