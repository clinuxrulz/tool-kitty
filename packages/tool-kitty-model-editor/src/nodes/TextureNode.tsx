import { NodeParams, Node, NodeType, Pin } from "tool-kitty-node-editor";
import { textureComponentType, TextureState } from "../components/TextureComponent";
import { NodeExt, NodeTypeExt } from "../NodeExt";
import { Accessor, batch, Component, createEffect, createMemo, createSignal, on, onCleanup } from "solid-js";
import { base64ToUint8Array, uint8ArrayToBase64 } from "tool-kitty-util";
import { PinValue } from "../CodeGenCtx";
import { compile, glsl, uniform } from "@bigmistqke/view.gl/tag";
import { uniformView } from "@bigmistqke/view.gl";

export class TextureNodeType implements NodeType<NodeTypeExt,NodeExt,TextureState> {
  componentType = textureComponentType;
  ext: NodeTypeExt = {};

  create(nodeParams: NodeParams<TextureState>) {
    return new TextureNode(nodeParams);
  }
}

export const textureNodeType = new TextureNodeType();

export class TextureNode implements Node<NodeTypeExt,NodeExt,TextureState> {
  type = textureNodeType;
  nodeParams: NodeParams<TextureState>;
  outputPins: Accessor<{ name: string; sinks: Accessor<Pin[]>; setSinks: (x: Pin[]) => void; isEffectPin?: boolean; }[]>;
  ui: Accessor<Component | undefined>;
  ext: NodeExt = {};

  constructor(nodeParams: NodeParams<TextureState>) {
    let state = nodeParams.state;
    let setState = nodeParams.setState;
    this.nodeParams = nodeParams;
    this.outputPins = createMemo(() => [
      {
        name: "out",
        sinks: () => state.out,
        setSinks: (x) => setState("out", x),
      }
    ]);
    this.ui = createMemo(() => () => {
      let [ fileInputElement, setFileInputElement, ] = createSignal<HTMLInputElement>();
      let loadFile = async (file: File) => {
        let mimeType = file.type;
        let data = await file.arrayBuffer();
        let data2 = new Uint8Array(data);
        let data3 = uint8ArrayToBase64(data2);
        batch(() => {
          setState("mimeType", mimeType);
          setState("base64Data", data3);
        });
      };
      return (<>
        <button
          class="btn btn-primary"
          onClick={() => fileInputElement()?.click()}
        >
          Browse...
        </button>
        <input
          ref={setFileInputElement}
          type="file"
          hidden
          onChange={(e) => {
            let files = e.currentTarget.files;
            if (files == null) {
              return;
            }
            if (files.length != 1) {
              return;
            }
            let file = files[0];
            loadFile(file);
            e.currentTarget.value = "";
          }}
        />
      </>);
    });
    let image_ = createMemo(() => {
      if (state.mimeType == "" || state.base64Data == "") {
        return undefined;
      }
      let data = base64ToUint8Array(state.base64Data);
      let blob = new Blob([ data, ], { type: state.mimeType });
      let url = URL.createObjectURL(blob);
      let [ result, setResult, ] = createSignal<HTMLImageElement>();
      let image = document.createElement("img");
      image.src = url;
      image.onload = () => {
        setResult(image);
      };
      onCleanup(() => {
        URL.revokeObjectURL(url);
      });
      return result;
    });
    let image = createMemo(() => image_()?.());
    this.ext.generateCode = ({ ctx, onInit }) => {
      let textureIdent = ctx.allocVar();
      let code = glsl`
        ${uniform.sampler2D(textureIdent)}
      `;
      ctx.insertGlobalCode(code);
      let schema = compile.toSchema(code);
      onInit(({ gl, program, rerender, }) => {
        let uniforms = uniformView(gl, program, schema.uniforms);
        uniforms[textureIdent].set(0);
        let texture = gl.createTexture();
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, texture);
        createEffect(on(
          image,
          (image) => {
            if (image == undefined) {
              return;
            }
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

            // Set wrapping modes
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
            gl.texImage2D(
              gl.TEXTURE_2D,
              0,
              gl.RGBA,
              gl.RGBA,
              gl.UNSIGNED_BYTE,
              image,
            );
            rerender();
          },
        ));
        onCleanup(() => {
          gl.deleteTexture(texture);
        });
      });
      return new Map<string,PinValue>([
        [
          "out",
          {
            type: "Atom",
            value: textureIdent,
          },
        ],
      ]);
    };
  }
}
