import { GLSL } from "@bigmistqke/view.gl";
import { compile, glsl } from "@bigmistqke/view.gl/tag";
import { Accessor, Component, ComponentProps, createComputed, createMemo, on, splitProps } from "solid-js";
import { createStore } from "solid-js/store";
import { Overwrite } from "tool-kitty-util";

const MarchingCubes: Component<
  Overwrite<
    ComponentProps<"div">,
    {
      //sdf: (x: number, y: number, z: number) => number,
      sdfEvalCode: GLSL<[{
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
      }, any, any]>,
    }
  >
> = (_props) => {
  let [ state, setState, ] = createStore<{
    minXText: string,
    minYText: string,
    minZText: string,
    maxXText: string,
    maxYText: string,
    maxZText: string,
    cubeSizeText: string,
    interpolate: boolean,
  }>({
    minXText: "-5000",
    minYText: "-5000",
    minZText: "-5000",
    maxXText: "5000",
    maxYText: "5000",
    maxZText: "5000",
    cubeSizeText: "100",
    interpolate: true,
  });
  let [ props, rest, ] = splitProps(_props, ["sdfEvalCode"]);
  let createReadNumberMemo = (read: () => string) => createMemo(() => {
    let x = Number.parseFloat(read());
    if (Number.isNaN(x)) {
      return undefined;
    }
    return x;
  });
  let minX = createReadNumberMemo(() => state.minXText);
  let minY = createReadNumberMemo(() => state.minYText);
  let minZ = createReadNumberMemo(() => state.minZText);
  let maxX = createReadNumberMemo(() => state.maxXText);
  let maxY = createReadNumberMemo(() => state.maxYText);
  let maxZ = createReadNumberMemo(() => state.maxZText);
  let cubeSize = createReadNumberMemo(() => state.cubeSizeText);
  let NumberField = (props: { name: string, read: string, write: (x: string) => void, }) => (
    <>
      <label
        class="label"
      >
        {props.name}
      </label>
      <input
        class="input"
        type="text"
        value={props.read}
        onInput={(e) => props.write(e.currentTarget.value)}
      />
    </>
  );
  // 512 * 512 == 64 * 64 * 64
  const width = 512;
  const height = 512;
  const chunkNumCubesX = 64;
  const chunkNumCubesY = 64;
  const chunkNumCubesZ = 64;
  let pixelBuffer = new Uint8Array((width * height) << 2);
  let resultsBuffer = new Float32Array(pixelBuffer.buffer);
  let canvas = new OffscreenCanvas(width, height);
  let gl = canvas.getContext("webgl");
  if (gl == null) {
    return undefined;
  }
  let vs = glsl`attribute vec4 aVertexPosition;
uniform mat4 uModelViewMatrix;
void main(void) {
  gl_Position = uModelViewMatrix * aVertexPosition;
}`;
  let program = compile(
    gl,
    vs,
    props.sdfEvalCode,
  );
  gl.useProgram(program.program);
  const positionLocation = gl.getAttribLocation(program.program, "aVertexPosition");
  const modelViewMatrixLocation = gl.getUniformLocation(program.program, "uModelViewMatrix");
  const vertices = new Float32Array(12);
  vertices[0] = 0.0;
  vertices[1] = 0.0;
  vertices[2] = width;
  vertices[3] = 0.0;
  vertices[4] = width;
  vertices[5] = height;
  vertices[6] = 0.0;
  vertices[7] = 0.0;
  vertices[8] = width;
  vertices[9] = height;
  vertices[10] = 0.0;
  vertices[11] = height;
  let verticesGLBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, verticesGLBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
  gl.vertexAttribPointer(
    positionLocation,
    2,
    gl.FLOAT,
    false,
    0,
    0,
  );
  function createOrtho2D(left: number, right: number, bottom: number, top: number) {
      var near = -1, far = 1, rl = right-left, tb = top-bottom, fn = far-near;
      return [        2/rl,               0,              0,  0,
                        0,             2/tb,              0,  0,
                        0,                0,          -2/fn,  0,
          -(right+left)/rl, -(top+bottom)/tb, -(far+near)/fn,  1];
  }
  const modelViewMatrix = new Float32Array(
    createOrtho2D(
      0.0,
      width,
      0.0,
      height,
    ),
  );
  gl.uniformMatrix4fv(
    modelViewMatrixLocation,
    false,
    modelViewMatrix,
  );
  gl.viewport(0, 0, width, height);
  gl.enableVertexAttribArray(positionLocation);
  let numCubesX = createMemo(on(
    [ minX, maxX, cubeSize, ],
    ([ minX, maxX, cubeSize ]) => {
      if (minX == undefined || maxX == undefined || cubeSize == undefined) {
        return undefined;
      }
      return Math.ceil((maxX - minX) / cubeSize);
    }
  ));
  let numCubesY = createMemo(on(
    [ minY, maxY, cubeSize, ],
    ([ minY, maxY, cubeSize ]) => {
      if (minY == undefined || maxY == undefined || cubeSize == undefined) {
        return undefined;
      }
      return Math.ceil((maxY - minY) / cubeSize);
    }
  ));
  let numCubesZ = createMemo(on(
    [ minZ, maxZ, cubeSize, ],
    ([ minZ, maxZ, cubeSize ]) => {
      if (minZ == undefined || maxZ == undefined || cubeSize == undefined) {
        return undefined;
      }
      return Math.ceil((maxZ - minZ) / cubeSize);
    }
  ));
  let gridStorage = createMemo(on(
    [ numCubesX, numCubesY, numCubesZ, ],
    ([ numCubesX, numCubesY, numCubesZ, ]) => {
      if (numCubesX == undefined || numCubesY == undefined || numCubesZ == undefined) {
        return undefined;
      }
      let storage: number[][][] = [];
      for (let i = 0; i < numCubesZ; ++i) {
        let slice: number[][] = [];
        for (let j = 0; j < numCubesY; ++j) {
          let row: number[] = [];
          for (let k = 0; j < numCubesX; ++k) {
            row.push(0.0);
          }
          slice.push(row);
        }
        storage.push(slice);
      }
      return storage;
    },
  ));
  createComputed(on(
    [ minX, minY, minZ, maxX, maxY, maxZ, numCubesX, numCubesY, numCubesZ, cubeSize, gridStorage, ],
    ([ minX, minY, minZ, maxX, maxY, maxZ, numCubesX, numCubesY, numCubesZ, cubeSize, gridStorage, ]) => {
      if (
        minX == undefined ||
        minY == undefined ||
        minZ == undefined ||
        maxX == undefined ||
        maxY == undefined ||
        maxZ == undefined ||
        numCubesX == undefined ||
        numCubesY == undefined ||
        numCubesZ == undefined ||
        cubeSize == undefined ||
        gridStorage == undefined
      ) {
        return;
      }
      program.view.uniforms["uNumCubes"].set(new Float32Array([
        chunkNumCubesX,
        chunkNumCubesY,
        chunkNumCubesZ,
      ]));
      program.view.uniforms["uResolution"].set(new Float32Array([
        width,
        height,
      ]));
      program.view.uniforms["cubeSize"].set(new Float32Array([
        cubeSize,
      ]));
      let useMinX = (minX + maxX - numCubesX * cubeSize) * 0.5;
      let useMinY = (minY + maxY - numCubesY * cubeSize) * 0.5;
      let useMinZ = (minZ + maxZ - numCubesZ * cubeSize) * 0.5;
      let numStepsX = Math.ceil(numCubesX / chunkNumCubesX);
      let numStepsY = Math.ceil(numCubesY / chunkNumCubesY);
      let numStepsZ = Math.ceil(numCubesZ / chunkNumCubesZ);
      for (let iz = 0, atMinZ = useMinZ; iz < numStepsZ; ++iz, atMinZ += cubeSize * chunkNumCubesZ) {
        let soz = iz * chunkNumCubesZ;
        for (let iy = 0, atMinY = useMinY; iy < numStepsY; ++iy, atMinY += cubeSize * chunkNumCubesY) {
          let soy = iy * chunkNumCubesY;
          for (let ix = 0, atMinX = useMinX; ix < numStepsX; ++ix, atMinX += cubeSize * chunkNumCubesX) {
            let sox = ix * chunkNumCubesX;
            program.view.uniforms["uEvalMin"].set(new Float32Array([
              minX,
              minY,
              minZ,
            ]));
            gl.drawArrays(gl.TRIANGLES, 0, 6);
            gl.flush();
            gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, pixelBuffer);
            for (let oz = soz; oz < soz + chunkNumCubesZ; ++oz) {
              if (oz >= gridStorage.length) {
                break;
              }
              let sliceStorage = gridStorage[oz];
              for (let oy = soy; oy < soy + chunkNumCubesY; ++oy) {
                if (oy >= sliceStorage.length) {
                  break;
                }
                let rowStorage = sliceStorage[oy];
                for (let ox = sox; ox < sox + chunkNumCubesX; ++ox) {
                  if (ox >= rowStorage.length) {
                    break;
                  }
                  ///
                  let pOffset = (
                    ((oz - soz) * chunkNumCubesY + (oy - soy)) * chunkNumCubesX
                    + (ox - sox)
                  ) << 2;
                  let value = resultsBuffer[pOffset];
                  gridStorage[oz][oy][ox] = value;
                }
              }
            }
          }
        }
      }
    },
  ));
  return (
    <div {...rest}>
      <div>
        <NumberField
          name="Min X:"
          read={state.minXText}
          write={(x) => setState("minXText", x)}
        />
        <NumberField
          name="Min Y:"
          read={state.minYText}
          write={(x) => setState("minYText", x)}
        />
        <NumberField
          name="Min Z:"
          read={state.minZText}
          write={(x) => setState("minZText", x)}
        />
        <NumberField
          name="Max X:"
          read={state.maxXText}
          write={(x) => setState("maxXText", x)}
        />
        <NumberField
          name="Max Y:"
          read={state.maxYText}
          write={(x) => setState("maxYText", x)}
        />
        <NumberField
          name="Max Z:"
          read={state.maxZText}
          write={(x) => setState("maxZText", x)}
        />
        <NumberField
          name="Cube Size:"
          read={state.cubeSizeText}
          write={(x) => setState("cubeSizeText", x)}
        />
      </div>
    </div>
  );
};

export default MarchingCubes;
