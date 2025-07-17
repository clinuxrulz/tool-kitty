import { isValidAutomergeUrl, Repo } from "@automerge/automerge-repo";
import { FileSystem } from "@bigmistqke/solid-fs-components";
import { Accessor, createMemo, createResource, createRoot, onCleanup } from "solid-js";
import { AutomergeVfsFile, AutomergeVfsFolder, AutomergeVirtualFileSystem, AutomergeVirtualFileSystemState } from "./AutomergeVirtualFileSystem";
import { asyncFailed, AsyncResult, asyncSuccess } from "control-flow-as-value";

export * from "./AutomergeVirtualFileSystem";

export function newAutomergeFsDoc(repo: Repo): {
    docUrl: string,
} {
    let docState = AutomergeVirtualFileSystem.makeEmptyState(repo);
    let doc = repo.create(docState);
    return {
        docUrl: doc.url,
    };
}

export function createAutomergeFs(
    vfs: AutomergeVirtualFileSystem
): FileSystem<Blob> {
    let accessCache: {
        [path: string]: {
            fileOrFolder: Accessor<AsyncResult<{
                type: "File",
                value: Accessor<AsyncResult<AutomergeVfsFile<any>>>,
            } | {
                type: "Folder",
                value: Accessor<AsyncResult<AutomergeVfsFolder>>,
            }>>,
            refCount: number,
            dispose: () => void,
        },
    } = {};;
    let navigate = (path: string): Accessor<AsyncResult<{
        type: "File",
        value: Accessor<AsyncResult<AutomergeVfsFile<any>>>,
    } | {
        type: "Folder",
        value: Accessor<AsyncResult<AutomergeVfsFolder>>,
    }>> => {
        path = path.trim();
        if (!path.startsWith("/")) {
            path = "/" + path;
        }
        if (path.endsWith("/")) {
            path = path.slice(0, path.length-1);
        }
        path = path.trim();
        if (accessCache[path] != undefined) {
            let r = accessCache[path];
            r.refCount++;
            onCleanup(() => {
                r.refCount--;
                if (r.refCount == 0) {
                    r.dispose();
                }
            });
            return r.fileOrFolder;
        } else {
            if (path == "") {
                let { folder, dispose, } = createRoot((dispose) => {
                    let folder = vfs.rootFolder();
                    return {
                        folder,
                        dispose,
                    };
                });
                accessCache[path] = {
                    fileOrFolder: createMemo(() => asyncSuccess({
                        type: "Folder" as const,
                        value: folder,
                    })),
                    refCount: 1,
                    dispose,
                };
                let r = accessCache[path];
                onCleanup(() => {
                    r.refCount--;
                    if (r.refCount == 0) {
                        r.dispose();
                    }
                });
                return accessCache[path].fileOrFolder;
            }
            let tailIdx = path.lastIndexOf("/") ?? 0;
            let tail = path.slice(tailIdx+1);
            let pre = path.slice(0, tailIdx+1);
            let pre2 = navigate(pre);
            let { fileOrFolder, dispose, } = createRoot((dispose) => {
                let fileOrFolder = createMemo(() => {
                    let pre3 = pre2();
                    if (pre3.type != "Success") {
                        return pre3;
                    }
                    let pre4 = pre3.value;
                    if (pre4.type != "Folder") {
                        return asyncFailed("Tried to read a file like it was a folder");
                    }
                    let preFolder = pre4.value();
                    if (preFolder.type != "Success") {
                        return preFolder;
                    }
                    let preFolder2 = preFolder.value;
                    let contents = preFolder2.contents;
                    let fileOrFolderEntry = contents.find((entry) => entry.name == tail);
                    if (fileOrFolderEntry == undefined) {
                        return asyncFailed("File or folder not found");
                    }
                    let fileOrFolderEntry2 = fileOrFolderEntry;
                    let fileOrFolder: {
                        type: "File",
                        value: Accessor<AsyncResult<AutomergeVfsFile<unknown>>>,
                    } | {
                        type: "Folder",
                        value: Accessor<AsyncResult<AutomergeVfsFolder>>,
                    };
                    switch (fileOrFolderEntry2.type) {
                        case "File": {
                            fileOrFolder = {
                                type: "File",
                                value: preFolder2.openFileById(fileOrFolderEntry2.id),
                            };
                            break;
                        }
                        case "Folder": {
                            fileOrFolder = {
                                type: "Folder",
                                value: preFolder2.openFolderById(fileOrFolderEntry2.id),
                            };
                            break;
                        }
                    }
                    return asyncSuccess(fileOrFolder);
                });
                return { fileOrFolder, dispose, };
            });
            accessCache[path] = {
                fileOrFolder,
                refCount: 1,
                dispose,
            };
            let r = accessCache[path];
            onCleanup(() => {
                r.refCount--;
                if (r.refCount == 0) {
                    r.dispose();
                }
            });
            return accessCache[path].fileOrFolder;
        }
    }
    vfs.rootFolder();
    function readdir(
        path: string,
        options: { withFileTypes: true },
    ): Array<{ type: 'dir' | 'file'; path: string }>
    function readdir(path: string): Array<string>
    function readdir(path: string, options?: { withFileTypes?: boolean }) {
        let r = navigate(path)();
        if (r.type == "Pending") {
            if (options?.withFileTypes) {
                return [{type: "File", path: "Loading...",}];
            } else {
                return ["Loading..."];
            }
        } else if (r.type == "Failed") {
            if (options?.withFileTypes) {
                return [{type: "File", path: "Error",}];
            } else {
                return ["Error"];
            }
        }
        let r2 = r.value;
        if (r2.type != "Folder") {
            return [];
        }
        let r3 = r2.value();
        if (r3.type == "Pending") {
            if (options?.withFileTypes) {
                return [{type: "File", path: "Loading...",}];
            } else {
                return ["Loading..."];
            }
        } else if (r3.type == "Failed") {
            if (options?.withFileTypes) {
                return [{type: "File", path: "Error",}];
            } else {
                return ["Error"];
            }
        }
        let r4 = r3.value;
        let r5 = r4.contents;
        if (options?.withFileTypes) {
            return r5.map((x) => {
                let type2: "dir" | "file";
                switch (x.type) {
                    case "File":
                        type2 = "file";
                        break;
                    case "Folder":
                        type2 = "dir";
                        break;
                }
                return { type: type2, path: (path != "" && path != "/" ? path + "/" : path) + x.name, };
            });
        } else {
            return r5.map((x) => (path != "" && path != "/" ? path + "/" : path) + x.name);
        }
    }
    return {
        exists(path) {
            let r = navigate(path)();
            if (r.type != "Success") {
                return false;
            }
            return true;
        },
        getType(path) {
            let fileOrFolder = navigate(path);
            let r = fileOrFolder();
            if (r.type != "Success") {
                return "file";
            }
            let r2 = r.value;
            switch (r2.type) {
                case "File":
                    return "file";
                case "Folder":
                    return "dir";
            }
        },
        readdir,
        mkdir(path, options) {
            throw new Error("TODO");
        },
        readFile(path) {
            throw new Error("TODO");
        },
        rename(previous, next) {
            throw new Error("TODO");
        },
        rm(path, options) {
            throw new Error("TODO");
        },
        writeFile(path, source) {
            throw new Error("TODO");
        },
    };
}
