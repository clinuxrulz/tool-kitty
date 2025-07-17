import {
  Accessor,
  Component,
  createEffect,
  createMemo,
  createResource,
  createSelector,
  For,
  JSX,
  on,
} from "solid-js";
import { AsyncResult, asyncSuccess } from "../AsyncResult";
import { createStore } from "solid-js/store";
import { levelComponentType } from "./components/LevelComponent";
import { EcsWorld } from "../ecs/EcsWorld";
import { ReactiveVirtualFileSystem } from "../ReactiveVirtualFileSystem";
import {
  AutomergeVfsFolder,
  AutomergeVirtualFileSystem,
  VfsFile,
} from "solid-fs-automerge";
import { makeDocumentProjection } from "solid-automerge";

export class LevelList {
  readonly selectedLevelByFileId: Accessor<string | undefined>;
  readonly Render: Component<{
    style?: JSX.CSSProperties;
  }>;

  constructor(params: {
    vfs: AutomergeVirtualFileSystem;
    levelsFolder: Accessor<AsyncResult<AutomergeVfsFolder>>;
  }) {
    let [state, setState] = createStore<{
      levelFiles: [string, string][];
      seletedLevelByFileId: string | undefined;
    }>({
      levelFiles: [],
      seletedLevelByFileId: undefined,
    });
    createEffect(
      on([params.levelsFolder], async () => {
        let levelsFolder = params.levelsFolder();
        if (levelsFolder.type != "Success") {
          return;
        }
        let levelsFolder2 = levelsFolder.value;
        let filesAndFolders = createMemo(() => levelsFolder2.contents);
        createEffect(() => {
          let filesAndFolders2 = filesAndFolders();
          let levelFiles = filesAndFolders2.flatMap((x) => {
            if (x.type != "File") {
              return [];
            }
            return [[x.name, x.id] as [string, string]];
          });
          setState("levelFiles", levelFiles);
        });
      }),
    );
    this.selectedLevelByFileId = () => state.seletedLevelByFileId;
    this.Render = (props) => {
      let addLevel = async () => {
        let levelsFolder = params.levelsFolder();
        if (levelsFolder.type != "Success") {
          return;
        }
        let levelsFolder2 = levelsFolder.value;
        let levelFilename = window.prompt("Enter name for level:");
        if (levelFilename == null) {
          return;
        }
        levelFilename = levelFilename.trim();
        if (levelFilename == "") {
          return;
        }
        levelFilename += ".json";
        let level = levelComponentType.create({
          tileToShortIdTable: [],
          mapData: Array(10)
            .fill(undefined)
            .map((_) =>
              Array(10)
                .fill(undefined)
                .map((_) => 0),
            ),
        });
        let world = new EcsWorld();
        world.createEntity([level]);
        let result = levelsFolder2.createFile(levelFilename, world.toJson());
        if (result.type == "Err") {
          return;
        }
        let fileId = result.value.id;
        setState("seletedLevelByFileId", fileId);
      };
      let isSelected = createSelector(() => state.seletedLevelByFileId);
      let selectLevel = (levelFileId: string) => {
        setState("seletedLevelByFileId", levelFileId);
      };
      let removeLevel = async (levelFileId: string) => {
        let levelsFolder = params.levelsFolder();
        if (levelsFolder.type != "Success") {
          return;
        }
        let levelsFolder2 = levelsFolder.value;
        levelsFolder2.removeFileOrFolderById(levelFileId);
        if (state.seletedLevelByFileId == levelFileId) {
          setState("seletedLevelByFileId", undefined);
        }
      };
      return (
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
              <b>Levels:</b>
            </div>
            <button class="btn" onClick={() => addLevel()}>
              <i class="fa-solid fa-circle-plus"></i>
            </button>
          </div>
          <div class="list-container-2">
            <For each={state.levelFiles}>
              {(levelFile) => (
                <div
                  role="button"
                  class={
                    isSelected(levelFile[1])
                      ? "list-item-selected"
                      : "list-item"
                  }
                  onClick={() => {
                    selectLevel(levelFile[1]);
                  }}
                >
                  {levelFile[0]}
                  <div class="list-item-button-container">
                    <button
                      class="list-item-button text-right"
                      type="button"
                      onClick={() => {
                        removeLevel(levelFile[1]);
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
      );
    };
  }
}
