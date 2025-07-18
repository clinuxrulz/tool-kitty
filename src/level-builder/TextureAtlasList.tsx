import {
  Accessor,
  Component,
  createEffect,
  createMemo,
  createSelector,
  For,
  JSX,
  lazy,
  on,
  Show,
  untrack,
} from "solid-js";
import { createStore, SetStoreFunction, Store } from "solid-js/store";
import { AsyncResult } from "../AsyncResult";
import { EcsWorld } from "../ecs/EcsWorld";
import { textureAtlasComponentType } from "./components/TextureAtlasComponent";
import { registry } from "./components/registry";
import { ReactiveVirtualFileSystem } from "../ReactiveVirtualFileSystem";
import {
  AutomergeVfsFile,
  AutomergeVfsFolder,
  AutomergeVirtualFileSystem,
  VfsFile,
} from "solid-fs-automerge";
import { makeDocumentProjection } from "solid-automerge";
import { mkAccessorToPromise, uint8ArrayToBase64 } from "../util";
import BoxSvg from "../assets/game-icons--cardboard-box.svg";
import { Portal } from "solid-js/web";
const BundledAssetFilePicker = lazy(() => import("./BundledAssetFilePicker"));

type State = {
  textureAtlasFiles: [string, string][];
  selectedTextureAtlasByFileId: string | undefined;
  overlayForm: Component | undefined,
};

export class TextureAtlasList {
  private state: Store<State>;
  private setState: SetStoreFunction<State>;
  readonly selectedTextureAtlasByFileId: Accessor<string | undefined>;
  readonly Render: Component<{
    style?: JSX.CSSProperties | string;
  }>;

  constructor(params: {
    vfs: AutomergeVirtualFileSystem;
    imagesFolder: Accessor<AsyncResult<AutomergeVfsFolder>>;
    imageFiles: Accessor<AsyncResult<AutomergeVfsFile<any>[]>>;
    textureAtlasesFolder: Accessor<AsyncResult<AutomergeVfsFolder>>;
  }) {
    let [state, setState] = createStore<State>({
      selectedTextureAtlasByFileId: undefined,
      textureAtlasFiles: [],
      overlayForm: undefined,
    });
    let addTextureAtlasFromBundledAsset = () => {
      setState(
        "overlayForm",
        () => () => (
          <div
            class="bg-base-200"
            style={{
              "position": "absolute",
              "inset": "10px",
              "display": "flex",
              "flex-direction": "column",
              "overflow": "hidden",
            }}
          >
            <div
              style="flex-grow: 1; overflow-y: scroll;"
            >
              <BundledAssetFilePicker
                isFileChoosable={(filename) => filename.endsWith(".png")}
                onChoose={async (path) => {
                  let textureAtlasesFolder = params.textureAtlasesFolder();
                  if (textureAtlasesFolder.type != "Success") {
                    return;
                  }
                  let textureAtlasesFolder2 = textureAtlasesFolder.value;
                  let textureAtlasName = window.prompt(
                    "Enter filename for texture atlas",
                  );
                  if (textureAtlasName == null) {
                    return;
                  }
                  textureAtlasName = textureAtlasName.trim();
                  if (textureAtlasName.length == 0) {
                    return;
                  }
                  if (!textureAtlasName.endsWith(".json")) {
                    textureAtlasName += ".json";
                  }
                  let world = new EcsWorld();
                  world.createEntity([
                    textureAtlasComponentType.create({
                      imageRef: "bundled:" + path,
                    }),
                  ]);
                  let result = await textureAtlasesFolder2.createFile(
                    textureAtlasName,
                    world.toJson(),
                  );
                  if (result.type == "Err") {
                    console.log(result.message);
                    return;
                  }
                  let fileId = result.value.id;
                  //
                  setState("selectedTextureAtlasByFileId", fileId);
                  setState("overlayForm", undefined);
                }}
                chooseText="Use This"
              />
            </div>
            <div>
              <button
                class="btn btn-primary"
                onClick={() => {
                  setState("overlayForm", undefined);
                }}
              >
                Close
              </button>
            </div>
          </div>
        )
      );
    };
    //
    createEffect(
      on([params.textureAtlasesFolder], () => {
        let textureAtlasesFolder = params.textureAtlasesFolder();
        if (textureAtlasesFolder.type != "Success") {
          return textureAtlasesFolder;
        }
        let textureAtlasesFolder2 = textureAtlasesFolder.value;
        let filesAndFolders = createMemo(() => textureAtlasesFolder2.contents);
        createEffect(
          on(filesAndFolders, () => {
            let filesAndFolders2 = filesAndFolders();
            let files = filesAndFolders2.flatMap((x) => {
              if (x.type != "File") {
                return [];
              }
              return [[x.name, x.id] as [string, string]];
            });
            setState("textureAtlasFiles", files);
          }),
        );
      }),
    );
    //
    this.state = state;
    this.setState = setState;
    this.selectedTextureAtlasByFileId = () =>
      state.selectedTextureAtlasByFileId;
    //
    this.Render = (props) => {
      let addTextureAtlasInput!: HTMLInputElement;
      let addTextureAtlas = () => {
        addTextureAtlasInput.click();
        addTextureAtlasInput.value = "";
      };
      let onAddTextureAtlas = async (imageFile: File) => {
        let imagesFolder = params.imagesFolder();
        if (imagesFolder.type != "Success") {
          return;
        }
        let imagesFolder2 = imagesFolder.value;
        let textureAtlasesFolder = params.textureAtlasesFolder();
        if (textureAtlasesFolder.type != "Success") {
          return;
        }
        let textureAtlasesFolder2 = textureAtlasesFolder.value;
        let textureAtlasName = window.prompt(
          "Enter filename for texture atlas",
        );
        if (textureAtlasName == null) {
          return;
        }
        textureAtlasName = textureAtlasName.trim();
        if (textureAtlasName.length == 0) {
          return;
        }
        if (!textureAtlasName.endsWith(".json")) {
          textureAtlasName += ".json";
        }
        let world = new EcsWorld();
        world.createEntity([
          textureAtlasComponentType.create({
            imageRef: imageFile.name,
          }),
        ]);
        let imageData = new Uint8Array(await imageFile.arrayBuffer());
        let r = await imagesFolder2.createFile(imageFile.name, {
          mimeType: imageFile.type,
          data: imageData,
        });
        if (r.type == "Err") {
          console.log(r.message);
          return;
        }
        let result = await textureAtlasesFolder2.createFile(
          textureAtlasName,
          world.toJson(),
        );
        if (result.type == "Err") {
          console.log(result.message);
          return;
        }
        let fileId = result.value.id;
        //
        setState("selectedTextureAtlasByFileId", fileId);
      };
      //
      let selectTextureAtlasFile = (textureAtlasFileId: string) => {
        if (
          !this.state.textureAtlasFiles.some((x) => x[1] == textureAtlasFileId)
        ) {
          return;
        }
        setState("selectedTextureAtlasByFileId", textureAtlasFileId);
      };
      let isSelectedV2 = createSelector(
        () => this.state.selectedTextureAtlasByFileId,
      );
      let removeTextureAtlasFile = async (textureAtlasFileId: string) => {
        let textureAtlasesFolder = params.textureAtlasesFolder();
        if (textureAtlasesFolder.type != "Success") {
          return;
        }
        let textureAtlasesFolder2 = textureAtlasesFolder.value;
        let imagesFolder = params.imagesFolder();
        if (imagesFolder.type != "Success") {
          return;
        }
        let imagesFolder2 = imagesFolder.value;
        let textureAtlasData = await mkAccessorToPromise(() =>
          textureAtlasesFolder2.openFileById(textureAtlasFileId),
        );
        if (textureAtlasData.type == "Err") {
          return;
        }
        let textureAtlasData2 = textureAtlasData.value.doc;
        let world = EcsWorld.fromJson(registry, textureAtlasData2);
        if (world.type == "Err") {
          console.log(world.message);
          return;
        }
        let world2 = world.value;
        let entities = world2.entitiesWithComponentType(
          textureAtlasComponentType,
        );
        if (entities.length != 1) {
          return;
        }
        let entity = entities[0];
        let textureAtlas = world2.getComponent(
          entity,
          textureAtlasComponentType,
        )?.state;
        if (textureAtlas == undefined) {
          return;
        }
        let imageFilename = textureAtlas.imageRef;
        let filesAndFolders = untrack(() => imagesFolder2.contents);
        let imageFileId: string | undefined = undefined;
        for (let x of filesAndFolders) {
          if (x.type == "File" && x.name == imageFilename) {
            imageFileId = x.id;
            break;
          }
        }
        if (imageFileId == undefined) {
          return;
        }
        await imagesFolder2.removeFileOrFolderById(imageFileId);
        await textureAtlasesFolder2.removeFileOrFolderById(textureAtlasFileId);
        if (state.selectedTextureAtlasByFileId == textureAtlasFileId) {
          setState("selectedTextureAtlasByFileId", undefined);
        }
      };
      return (<>
        <div style={props.style}>
          <div
            style={{
              display: "flex",
              "flex-direction": "row",
              "align-items": "flex-end",
            }}
          >
            <div
              style={{
                "flex-grow": "1",
                "margin-bottom": "5px",
              }}
            >
              <b>Texture Atlases:</b>
            </div>
            <button class="btn" onClick={() => addTextureAtlas()}>
              <i class="fa-solid fa-circle-plus"></i>
            </button>
            <button class="btn" onClick={() => addTextureAtlasFromBundledAsset()}>
              <BoxSvg width="24" height="24" viewBox="0 0 512 512" style={{ "color": "red", }}/>
            </button>
            <input
              ref={addTextureAtlasInput}
              type="file"
              hidden
              accept="image/png"
              onInput={(e) => {
                if (addTextureAtlasInput.files?.length != 1) {
                  return;
                }
                onAddTextureAtlas(addTextureAtlasInput.files[0]);
              }}
            />
          </div>
          <div class="list-container-2">
            <For each={this.state.textureAtlasFiles}>
              {(textureAtlasFile) => (
                <div
                  role="button"
                  class={
                    isSelectedV2(textureAtlasFile[1])
                      ? "list-item-selected"
                      : "list-item"
                  }
                  onClick={() => {
                    selectTextureAtlasFile(textureAtlasFile[1]);
                  }}
                >
                  {textureAtlasFile[0]}
                  <div class="list-item-button-container">
                    <button
                      class="list-item-button text-right"
                      type="button"
                      onClick={() => {
                        removeTextureAtlasFile(textureAtlasFile[1]);
                      }}
                    >
                      <i class="fa-solid fa-trash"></i>
                    </button>
                  </div>
                </div>
              )}
            </For>
          </div>
        </div>
        <Show when={state.overlayForm} keyed>
          {(OverlayForm) => (
            <Portal>
              <OverlayForm/>
            </Portal>
          )}
        </Show>
      </>);
    };
  }
}
