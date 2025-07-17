import {
  Accessor,
  Component,
  createMemo,
  createResource,
  createSignal,
  onMount,
  Show,
} from "solid-js";
import { VirtualFileSystem as VFS, VfsFileOrFolder } from "./VirtualFileSystem";
import JSZip from "jszip";
import FileSaver from "file-saver";
import { ok } from "../kitty-demo/Result";

const VirtualFileSystemTest: Component = () => {
  let [vfs, { mutate: mutateVfs }] = createResource(() => VFS.init());
  let exportToZip = async () => {
    let vfs2 = vfs();
    if (vfs2?.type != "Ok") {
      return;
    }
    let vfs3 = vfs2.value;
    let zip = new JSZip();
    let addFilesAndFolders = async (at: JSZip, folderId: string) => {
      let filesAndFolders = await vfs3.getFilesAndFolders(folderId);
      if (filesAndFolders.type == "Err") {
        return;
      }
      let filesAndFolders2 = filesAndFolders.value;
      for (let fileOrFolder of filesAndFolders2) {
        switch (fileOrFolder.type) {
          case "File": {
            let data = await vfs3.readFile(fileOrFolder.id);
            if (data.type == "Err") {
              continue;
            }
            let data2 = data.value;
            at.file(fileOrFolder.name, data2);
            break;
          }
          case "Folder":
            let atNext = at.folder(fileOrFolder.name);
            if (atNext == null) {
              continue;
            }
            await addFilesAndFolders(atNext, fileOrFolder.id);
            break;
        }
      }
    };
    await addFilesAndFolders(zip, vfs3.rootFolderId);
    let data = await zip.generateAsync({ type: "blob" });
    FileSaver.saveAs(data, "kitty_export.zip");
  };
  let importFromZip = async (file: File) => {
    debugger;
    let vfs2 = vfs();
    if (vfs2?.type != "Ok") {
      return;
    }
    let vfs3 = vfs2.value;
    // clear out existing files/folders
    {
      let filesAndFolders = await vfs3.getFilesAndFolders(vfs3.rootFolderId);
      if (filesAndFolders.type == "Err") {
        return;
      }
      let filesAndfolders2 = filesAndFolders.value;
      for (let fileOrFolder of filesAndfolders2) {
        await vfs3.delete(fileOrFolder.id);
      }
    }
    //
    let zip = await JSZip.loadAsync(file);
    async function addFilesAndFoldersToVfs(
      folderPath: string,
      vfsFolderId: string,
    ): Promise<void> {
      debugger;
      let folder: JSZip;
      if (folderPath == "") {
        folder = zip;
      } else {
        let folder2 = zip.folder(folderPath);
        if (folder2 == undefined) {
          return;
        }
        folder = folder2;
      }

      if (!folder) {
        console.warn(`Folder "${folderPath}" not found in the zip.`);
        return;
      }
      const entries: {
        name: string;
        relativePath: string;
        isFolder: boolean;
      }[] = [];
      folder.forEach((relativePath, file) => {
        const fullPath =
          folderPath +
          (folderPath && !folderPath.endsWith("/") ? "/" : "") +
          relativePath;

        entries.push({
          name: fullPath,
          relativePath,
          isFolder: file.dir,
        });
      });
      let folderPaths: string[] = [];
      for (let entry of entries) {
        if (entry.isFolder) {
          folderPaths.push(entry.relativePath);
        }
      }

      for (const entry of entries) {
        if (folderPaths.some((x) => entry.relativePath.startsWith(x))) {
          continue;
        }
        if (!entry.isFolder) {
          let data = zip.file(entry.name);
          if (data == null) {
            continue;
          }
          let data2 = await data.async("blob");
          await vfs3.createFile(vfsFolderId, entry.relativePath, data2);
        }
      }
      for (const entry of entries) {
        if (entry.isFolder) {
          let folderName = entry.relativePath;
          if (folderName.endsWith("/")) {
            folderName = folderName.slice(0, folderName.length - 1);
          }
          let r = await vfs3.createFolder(vfsFolderId, folderName);
          if (r.type == "Err") {
            continue;
          }
          let { folderId: nextVfsFolderId } = r.value;
          await addFilesAndFoldersToVfs(entry.name, nextVfsFolderId);
        }
      }
    }
    await addFilesAndFoldersToVfs("", vfs3.rootFolderId);
    // refresh
    mutateVfs(undefined);
    mutateVfs(ok(vfs3));
  };
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        "overflow-y": "auto",
      }}
    >
      <Show when={vfs()} keyed fallback={<>Loading...</>}>
        {(vfs2) => {
          if (vfs2.type == "Err") {
            return vfs2.message;
          }
          let vfs3 = vfs2.value;
          let filesAndFoldersUi = createFilesAndFoldersUI({
            vfs: vfs3,
            currentFolderId: () => vfs3.rootFolderId,
          });
          let fileInput!: HTMLInputElement;
          return (
            <>
              <button class="btn" onClick={() => exportToZip()}>
                Export to Zip
              </button>
              <button class="btn" onClick={() => fileInput.click()}>
                Import from Zip
              </button>
              <input
                ref={fileInput}
                type="file"
                hidden
                onInput={(e) => {
                  let files = e.currentTarget.files;
                  if (files == null) {
                    return;
                  }
                  if (files.length != 1) {
                    return;
                  }
                  let file = files[0];
                  importFromZip(file);
                }}
              />
              <br />
              <filesAndFoldersUi.Render />
            </>
          );
        }}
      </Show>
    </div>
  );
};

const createFilesAndFoldersUI: (params: {
  vfs: VFS;
  currentFolderId: Accessor<string>;
}) => {
  refresh: () => void;
  Render: Component;
} = (params) => {
  let [contents, { refetch }] = createResource(
    params.currentFolderId,
    (source) => params.vfs.getFilesAndFolders(source),
  );
  return {
    refresh: () => refetch(),
    Render: () => (
      <Show when={contents()} keyed>
        {(contents2) => {
          if (contents2.type == "Err") {
            return contents2.message;
          }
          let contents3 = contents2.value;
          /*
                    // Folder closed
                    <i class="fa-solid fa-folder"></i>
                    // Folder open
                    <i class="fa-solid fa-folder-open"></i>
                    // File
                    <i class="fa-solid fa-file"></i>
                    */
          let ulElement!: HTMLDivElement;
          let [lineSize, setLineSize] = createSignal<number>();
          onMount(() => {
            let rect = ulElement.getBoundingClientRect();
            setLineSize(rect.height - 5);
          });
          let backgroundSize = createMemo(() => {
            let lineSize2 = lineSize();
            if (lineSize2 == undefined) {
              return "5px 100%";
            } else {
              //return `5px ${lineSize2}px`;
              return "5px 100%";
            }
          });
          return (
            <>
              <div
                ref={ulElement}
                style={{
                  "margin-left": "15px",
                  "margin-top": "-6px",
                  "padding-top": "6px",
                  "padding-left": "20px",
                  background: "linear-gradient(blue 0 0) 10px",
                  "background-size": "5px calc(100% - 20px)",
                  "background-position-y": "0",
                  "background-repeat": "no-repeat",
                }}
              >
                <ul>
                  {contents3.map((entry) => (
                    <>
                      <li
                        style={{
                          display: "flex",
                          "flex-direction": "row",
                          "align-items": "center",
                          "margin-left": "-20px",
                          "padding-left": "30px",
                          background: "linear-gradient(blue 0 0) 10px",
                          "background-size": "20px 5px",
                          "background-repeat": "no-repeat",
                        }}
                      >
                        <div style="font-size: 20pt; display: inline-block; margin-left: 5px; margin-right: 5px;">
                          {entry.type == "File" ? (
                            <i class="fa-solid fa-file"></i>
                          ) : (
                            <i class="fa-solid fa-folder-open"></i>
                          )}
                        </div>
                        {entry.name}
                        <button
                          class="btn"
                          style="margin-left: 10px;"
                          onClick={async () => {
                            await params.vfs.delete(entry.id);
                            refetch();
                          }}
                        >
                          Delete
                        </button>
                      </li>
                      <Show when={entry.type == "Folder"}>
                        {(() => {
                          let tmp = createFilesAndFoldersUI({
                            vfs: params.vfs,
                            currentFolderId: () => entry.id,
                          });
                          return <tmp.Render />;
                        })()}
                      </Show>
                    </>
                  ))}
                </ul>
              </div>
              <div>
                Add File:
                <input
                  type="file"
                  onChange={async (e) => {
                    if (e.currentTarget.files == null) {
                      return;
                    }
                    let files = e.currentTarget.files;
                    for (let file of files) {
                      await params.vfs.createFile(
                        params.currentFolderId(),
                        file.name,
                        file,
                      );
                    }
                    refetch();
                  }}
                />
                <button
                  class="btn"
                  onClick={async () => {
                    let folderName = window.prompt("Enter Folder Name:");
                    if (folderName == null) {
                      return;
                    }
                    folderName = folderName.trim();
                    if (folderName.length == 0) {
                      return;
                    }
                    await params.vfs.createFolder(
                      params.currentFolderId(),
                      folderName,
                    );
                    refetch();
                  }}
                >
                  Add Folder
                </button>
              </div>
            </>
          );
        }}
      </Show>
    ),
  };
};

export default VirtualFileSystemTest;
