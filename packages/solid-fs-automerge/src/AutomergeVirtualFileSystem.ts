import {
    AutomergeUrl,
    DocHandle,
    isValidAutomergeUrl,
    Repo,
} from "@automerge/automerge-repo";
import { createDocumentProjection, makeDocumentProjection } from "solid-automerge";
import { Accessor, createComputed, createMemo, createResource, createRoot, mapArray, on, onCleanup, untrack } from "solid-js";
import { Store } from "solid-js/store";
import {
    asyncFailed,
    asyncPending,
    AsyncResult,
    asyncSuccess,
    err,
    ok,
    Result,
} from "control-flow-as-value";
import { ReactiveCache } from "reactive-cache";
import { AsyncFileSystemAdapter } from "./AsyncFileSystemAdapter";

export type VfsFile = {
    type: "File";
    docUrl: AutomergeUrl;
};

export type VfsFolder = {
    type: "Folder";
    docUrl: AutomergeUrl;
};

export type VfsFolderContents = {
    contents: {
        [name: string]: VfsFileOrFolder;
    };
};

type VfsFileOrFolder = VfsFile | VfsFolder;

export type AutomergeVirtualFileSystemState = {
    root: {
        docUrl: AutomergeUrl;
    };
};

export async function createAutomergeFileSystem(repo: Repo, docUrl?: string): Promise<{
    docUrl: string,
    vfs: AsyncFileSystemAdapter,
}> {
    let docHandle: DocHandle<AutomergeVirtualFileSystemState>;
    if (docUrl == undefined) {
        let doc = repo.create<VfsFolderContents>({
            contents: {},
        });
        docHandle = repo.create<AutomergeVirtualFileSystemState>({
            root: { docUrl: doc.url },
        });
        docUrl = docHandle.url;
    } else {
        if (!isValidAutomergeUrl(docUrl)) {
            throw new Error("Invalid automerge url");
        }
        docHandle = await repo.find<AutomergeVirtualFileSystemState>(docUrl);
    }
    let vfs = new AutomergeVirtualFileSystem({
        repo,
        docHandle: () => docHandle,
    });
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
            if (path[0] != "/") {
                throw new Error("Path needs to start with /");
            }
            if (path != "/" && path.endsWith("/")) {
                path = path.slice(0, path.length-1);
            }
            path = path.trim();
            if (path == "/") {
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
            let tailIdx = path.lastIndexOf("/");
            if (tailIdx != -1) {
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
            } else {
                throw new Error("Unreachable");
            }
        }
    }
    let asyncSignalToPromise = <A>(a: Accessor<AsyncResult<A>>): Promise<A> => {
        return new Promise<A>((resolve, reject) => {
            createRoot((dispose) => {
                createComputed(on(
                    a,
                    (a) => {
                        if (a.type == "Pending") {
                            return;
                        }
                        dispose();
                        if (a.type == "Failed") {
                            reject(new Error(a.message));
                            return;
                        }
                        resolve(a.value);
                    },
                ));
            });
        });
    };
    let vfs2: AsyncFileSystemAdapter = {
        async: true,
        async getType(path: string) {
            let fileOrFolder = await asyncSignalToPromise(navigate(path));
            switch (fileOrFolder.type) {
                case "File":
                    return "file";
                case "Folder":
                    return "dir";
            }
        },
        async mkdir(path: string) {
            let preIdx = path.lastIndexOf("/");
            if (preIdx == -1) {
                throw new Error("Invalid path");
            }
            let pre = path.slice(0, preIdx+1);
            let name = path.slice(preIdx+1);
            let fileOrFolder = await asyncSignalToPromise(navigate(pre));
            if (fileOrFolder.type != "Folder") {
                throw new Error("Can not make a folder inside a file");
            }
            let folder = await asyncSignalToPromise(fileOrFolder.value);
            let r = await folder.createFolder(name);
            if (r.type == "Err") {
                throw new Error(r.message);
            }
        },
        async readdir(path: string) {
            let fileOrFolder = await asyncSignalToPromise(navigate(path));
            if (fileOrFolder.type != "Folder") {
                throw new Error("Can not read a directory listing of a file");
            }
            let folder = await asyncSignalToPromise(fileOrFolder.value);
            return folder.contents.map((entry) => entry.name);
        },
        async readFile(path: string) {
            let fileOrFolder = await asyncSignalToPromise(navigate(path));
            if (fileOrFolder.type != "File") {
                throw new Error("Can not read a folder like its a file");
            }
            let file = await asyncSignalToPromise(fileOrFolder.value);
            let fileName = untrack(() => file.name());
            if (fileName.toLowerCase().endsWith(".json")) {
                return new Blob([JSON.stringify(file.doc)], { type: "application/json", });
            } else {
                let mimeType = file.doc.mimeType as string;
                let data = file.doc.data as Uint8Array;
                let blob = new Blob([ data ], { type: mimeType, });
                return blob;
            }
        },
        async rm(path: string) {
            let fileOrFolder = await asyncSignalToPromise(navigate(path));
            switch (fileOrFolder.type) {
                case "File": {
                    let file = await asyncSignalToPromise(fileOrFolder.value);
                    let r = file.delete();
                    if (r.type == "Err") {
                        throw new Error(r.message);
                    }
                    break;
                }
                case "Folder": {
                    let folder = await asyncSignalToPromise(fileOrFolder.value);
                    let r = folder.delete();
                    if (r.type == "Err") {
                        throw new Error(r.message);
                    }
                    break;
                }
            }
        },
        async writeFile(path: string, data: Blob) {
            let preIdx = path.lastIndexOf("/");
            if (preIdx == -1) {
                throw new Error("Invalid path");
            }
            let pre = path.slice(0, preIdx+1);
            let name = path.slice(preIdx+1);
            let fileOrFolder = await asyncSignalToPromise(navigate(pre));
            if (fileOrFolder.type != "Folder") {
                throw new Error("File treated as folder");
            }
            let folder = await asyncSignalToPromise(fileOrFolder.value);
            let contents = untrack(() => folder.contents);
            let existing = contents.find((entry) => entry.name == name);
            let data2: any;
            if (data.type == "application/json" || name.toLowerCase().endsWith(".json")) {
                data2 = JSON.parse(await data.text());
            } else {
                data2 = {
                    mimeType: data.type,
                    data: await data.bytes(),
                };
            }
            if (existing != undefined) {
                let file = await asyncSignalToPromise(folder.openFileById<any>(existing.id));
                file.doc.change((doc: any) => {
                    for (let [ k, v, ] of Object.entries(data2)) {
                        doc[k] = v;
                    }
                });
            } else {
                let r = await folder.createFile(name, data2);
                if (r.type == "Err") {
                    throw new Error(r.message);
                }
            }
        }
    };
    return {
        docUrl,
        vfs: vfs2,
    };
}

export class AutomergeVirtualFileSystem {
    private repo: Repo;
    private doc: Accessor<Store<AutomergeVirtualFileSystemState> | undefined>;

    static makeEmptyState(repo: Repo): AutomergeVirtualFileSystemState {
        let doc = repo.create<VfsFolderContents>({
            contents: {},
        });
        return {
            root: { docUrl: doc.url },
        };
    }

    constructor(params: {
        repo: Repo;
        docHandle: Accessor<
            DocHandle<AutomergeVirtualFileSystemState> | undefined
        >;
    }) {
        this.repo = params.repo;
        this.doc = createDocumentProjection(params.docHandle);
    }

    get rootFolderId(): Accessor<AsyncResult<AutomergeUrl>> {
        return createMemo(() => {
            let docUrl = this.doc()?.root?.docUrl;
            if (docUrl == undefined) {
                return asyncPending();
            }
            return asyncSuccess(docUrl);
        });
    }

    rootFolder(): Accessor<AsyncResult<AutomergeVfsFolder>> {
        let docUrl = createMemo(() => {
            let docUrl2 = this.doc()?.root.docUrl;
            if (docUrl2 == undefined) {
                return asyncPending();
            }
            return asyncSuccess(docUrl2);
        });
        let id = docUrl;
        let docHandle_ = createMemo(() => {
            let docUrl2 = docUrl();
            if (docUrl2?.type != "Success") {
                return docUrl2;
            }
            let docUrl3 = docUrl2.value;
            if (!isValidAutomergeUrl(docUrl3)) {
                return asyncFailed("Invalid automerge url");
            }
            let [ docHandle, ] = createResource(() => this.repo.find<AutomergeVfsFolderState>(docUrl3));
            return asyncSuccess(createMemo(() => {
                let docHandle2 = docHandle();
                if (docHandle2 == undefined) {
                    return asyncPending();
                }
                return asyncSuccess(docHandle2);
            }));
        });
        let docHandle = createMemo(() => {
            let tmp = docHandle_();
            if (tmp.type != "Success") {
                return tmp;
            }
            return tmp.value();
        });
        let id2 = createMemo(
            () => {
                let id3 = id();
                if (id3.type != "Success") {
                    return id3;
                } else {
                    return asyncSuccess(id as Accessor<Extract<ReturnType<typeof id>, { type: "Success", }>>);
                }
            },
            undefined,
            {
                equals: (a, b) => {
                    if (a.type == "Success" && b.type == "Success") {
                        return a.value == b.value;
                    } else {
                        return a == b;
                    }
                },
            },
        );
        let result_ = createMemo(() => {
            let id3 = id2();
            if (id3.type != "Success") {
                return id3;
            }
            let id4 = createMemo(() => id3.value().value);
            let name = () => "";
            let docHandle2 = docHandle();
            if (docHandle2.type != "Success") {
                return docHandle2;
            }
            let docHandl3 = docHandle2.value;
            return asyncSuccess(createMemo(() => {
                let id5 = id4();
                return new AutomergeVfsFolder(
                    this.repo,
                    id5,
                    name,
                    undefined,
                    docHandl3,
                );
            }));
        });
        return createMemo(() => {
            let tmp = result_();
            if (tmp.type != "Success") {
                return tmp;
            }
            return asyncSuccess(tmp.value());
        });
    }

    readFolder(
        docUrl: string,
    ): Accessor<AsyncResult<DocHandle<VfsFolderContents>>> {
        if (!isValidAutomergeUrl(docUrl)) {
            return () => asyncFailed("not a valid automerge url");
        }
        let [doc] = createResource(() =>
            this.repo.find<VfsFolderContents>(docUrl),
        );
        return createMemo(() => {
            let doc2 = doc();
            if (doc2 == undefined) {
                return asyncPending();
            }
            return asyncSuccess(doc2);
        });
    }

    readFile<T>(docUrl: string): Accessor<AsyncResult<DocHandle<T>>> {
        if (!isValidAutomergeUrl(docUrl)) {
            return () => asyncFailed("not a valid automerge url");
        }
        let [doc] = createResource(() => this.repo.find<T>(docUrl));
        return createMemo(() => {
            let doc2 = doc();
            if (doc2 == undefined) {
                return asyncPending();
            }
            return asyncSuccess(doc2);
        });
    }

    async createFolder(
        parentFolderDocUrl: string,
        folderName: string,
    ): Promise<Result<AutomergeUrl>> {
        if (!isValidAutomergeUrl(parentFolderDocUrl)) {
            return err("not a valid automerge url");
        }
        let parentFolderContents = await this.repo.find<VfsFolderContents>(
            parentFolderDocUrl,
        );
        let folderContents = this.repo.create<VfsFolderContents>({
            contents: {},
        });
        parentFolderContents.change((doc) => {
            doc.contents[folderName] = {
                type: "Folder",
                docUrl: folderContents.url,
            };
        });
        return ok(folderContents.url);
    }

    async createFile<T>(
        parentFolderDocUrl: string,
        filename: string,
        data: T
    ): Promise<Result<AutomergeUrl>> {
        if (!isValidAutomergeUrl(parentFolderDocUrl)) {
            return err("not a valid automerge url");
        }
        let parentFolderContents = await this.repo.find<VfsFolderContents>(
            parentFolderDocUrl,
        );
        let fileDoc = this.repo.create<T>(data);
        let fileDocUrl = fileDoc.url;
        parentFolderContents.change((doc) => {
            doc.contents[filename] = {
                type: "File",
                docUrl: fileDocUrl,
            };
        });
        return ok(fileDocUrl);
    }

    async addFile(
        parentFolderDocUrl: string,
        filename: string,
        fileDocUrl: AutomergeUrl,
    ): Promise<{}> {
        if (!isValidAutomergeUrl(parentFolderDocUrl)) {
            return err("not a valid automerge url");
        }
        let parentFolderDoc =
            await this.repo.find<VfsFolder>(parentFolderDocUrl);
        let parentfolderContentsUrl = parentFolderDoc.doc().docUrl;
        if (!isValidAutomergeUrl(parentfolderContentsUrl)) {
            return err("not a valid automerge url");
        }
        let parentFolderContents = await this.repo.find<VfsFolderContents>(
            parentfolderContentsUrl,
        );
        parentFolderContents.change((doc) => {
            doc.contents[filename] = {
                type: "File",
                docUrl: fileDocUrl,
            };
        });
        return ok({});
    }

    async removeFileOrFolder<T>(
        parentFolderDocUrl: string,
        fileOrFolderName: string,
    ): Promise<Result<AutomergeUrl | undefined>> {
        if (!isValidAutomergeUrl(parentFolderDocUrl)) {
            return err("not a valid automerge url");
        }
        let parentFolderDoc =
            await this.repo.find<VfsFolder>(parentFolderDocUrl);
        let parentfolderContentsUrl = parentFolderDoc.doc().docUrl;
        if (!isValidAutomergeUrl(parentfolderContentsUrl)) {
            return err("not a valid automerge url");
        }
        let parentFolderContents = await this.repo.find<VfsFolderContents>(
            parentfolderContentsUrl,
        );
        let fileOrFolderBefore = parentFolderContents.doc().contents[fileOrFolderName];
        if (fileOrFolderBefore == undefined) {
            return ok(undefined);
        }
        parentFolderContents.change((doc) => {
            delete doc.contents[fileOrFolderName];
        });
        return ok(fileOrFolderBefore.docUrl);
    }
}

type AutomergeVfsFolderState = {
    contents: {
        [id: string]: {
            type: "File" | "Folder",
            name: string,
            docUrl: string,
        },
    },
};

export class AutomergeVfsFolder {
    private repo: Repo;
    readonly id: string;
    readonly name: Accessor<string>;
    private parent: AutomergeVfsFolder | undefined;
    private docHandle: DocHandle<AutomergeVfsFolderState>;
    private doc: Store<AutomergeVfsFolderState>;
    private nameToIdMap = new Map<string,string>();

    constructor(repo: Repo, id: string, name: Accessor<string>, parent: AutomergeVfsFolder | undefined, docHandle: DocHandle<AutomergeVfsFolderState>) {
        this.repo = repo;
        this.id = id;
        this.name = name;
        this.parent = parent;
        this.docHandle = docHandle;
        this.doc = makeDocumentProjection(docHandle);
        //
        let nameToIdMap = new Map<string,string>();
        createComputed(mapArray(
            createMemo(() => Object.keys(this.doc.contents)),
            (fileOrFolderId) => {
                let name = createMemo(() => this.doc.contents[fileOrFolderId].name);
                createComputed(on(
                    name,
                    (name) => {
                        nameToIdMap.set(name, fileOrFolderId);
                        onCleanup(() => {
                            let id = nameToIdMap.get(name);
                            if (id == fileOrFolderId) {
                                nameToIdMap.delete(name);
                            }
                        });
                    },
                ));
            },
        ));
        this.nameToIdMap = nameToIdMap;
    }

    private _contentsCache = new ReactiveCache<{ id: string, type: "File" | "Folder", name: string, }[]>();
    get contents(): { id: string, type: "File" | "Folder", name: string, }[] {
        return this._contentsCache.cached("", () =>
            Object.entries(this.doc.contents).map(([k,v]) => ({
                id: k,
                type: v.type,
                name: v.name,
            }))
        );
    }

    private _getFolderIdCache = new ReactiveCache<string | undefined>();
    getFolderId(name: string): string | undefined {
        return this._getFolderIdCache.cached(name, () =>
            this.contents.find((entry) => entry.name == name && entry.type == "Folder")?.id
        );
    }

    private _openFolderById = new ReactiveCache<Accessor<AsyncResult<AutomergeVfsFolder>>>();
    openFolderById(id: string): Accessor<AsyncResult<AutomergeVfsFolder>> {
        return this._openFolderById.cached(id, () => {
            let folderInfo = createMemo(() => {
                let fileOrFolder = this.doc.contents[id] ?? this.docHandle.doc().contents[id];
                if (fileOrFolder == undefined) {
                    return asyncFailed("Folder does not exist");
                }
                if (fileOrFolder.type != "Folder") {
                    return asyncFailed("Expexcted a folder, but got a file");
                }
                if (!isValidAutomergeUrl(fileOrFolder.docUrl)) {
                    return asyncFailed("Invalid automerge url");
                }
                return asyncSuccess(fileOrFolder);
            });
            let docUrl = createMemo(() => {
                let folderInfo2 = folderInfo();
                if (folderInfo2.type != "Success") {
                    return folderInfo2;
                }
                return asyncSuccess(folderInfo2.value.docUrl);
            });
            let name = createMemo(() => {
                let folderInfo2 = folderInfo();
                if (folderInfo2.type != "Success") {
                    return folderInfo2;
                }
                return asyncSuccess(folderInfo2.value.name);
            });
            let docHandle_ = createMemo(() => {
                let docUrl2 = docUrl();
                if (docUrl2?.type != "Success") {
                    return docUrl2;
                }
                let docUrl3 = docUrl2.value;
                if (!isValidAutomergeUrl(docUrl3)) {
                    return asyncFailed("Invalid automerge url");
                }
                let [ docHandle, ] = createResource(() => this.repo.find<AutomergeVfsFolderState>(docUrl3));
                return asyncSuccess(createMemo(() => {
                    let docHandle2 = docHandle();
                    if (docHandle2 == undefined) {
                        return asyncPending();
                    }
                    return asyncSuccess(docHandle2);
                }));
            });
            let docHandle = createMemo(() => {
                let tmp = docHandle_();
                if (tmp.type != "Success") {
                    return tmp;
                }
                return tmp.value();
            });
            let name2 = createMemo(
                () => {
                    let name3 = name();
                    if (name3.type != "Success") {
                        return name3;
                    } else {
                        return asyncSuccess(name as Accessor<Extract<ReturnType<typeof name>, { type: "Success", }>>);
                    }
                },
                undefined,
                {
                    equals: (a, b) => {
                        if (a.type == "Success" && b.type == "Success") {
                            return a.value == b.value;
                        } else {
                            return a == b;
                        }
                    },
                },
            );
            return createMemo(() => {
                let name3 = name2();
                if (name3.type != "Success") {
                    return name3;
                }
                let name4 = createMemo(() => name3.value().value);
                let docHandle2 = docHandle();
                if (docHandle2.type != "Success") {
                    return docHandle2;
                }
                let docHandl3 = docHandle2.value;
                return asyncSuccess(new AutomergeVfsFolder(
                    this.repo,
                    id,
                    name4,
                    this,
                    docHandl3,
                ));
            });
        });
    }

    private _openFileById = new ReactiveCache<Accessor<AsyncResult<AutomergeVfsFile<any>>>>();
    openFileById<A>(id: string): Accessor<AsyncResult<AutomergeVfsFile<A>>> {
        return this._openFileById.cached(id, () => {
            let folderInfo = createMemo(() => {
                let fileOrFolder = this.doc.contents[id];
                if (fileOrFolder == undefined) {
                    return asyncFailed("File does not exist");
                }
                if (fileOrFolder.type != "File") {
                    return asyncFailed("Expexcted a folder, but got a file");
                }
                if (!isValidAutomergeUrl(fileOrFolder.docUrl)) {
                    return asyncFailed("Invalid automerge url");
                }
                return asyncSuccess(fileOrFolder);
            });
            let docUrl = createMemo(() => {
                let folderInfo2 = folderInfo();
                if (folderInfo2.type != "Success") {
                    return folderInfo2;
                }
                return asyncSuccess(folderInfo2.value.docUrl);
            });
            let name = createMemo(() => {
                let folderInfo2 = folderInfo();
                if (folderInfo2.type != "Success") {
                    return folderInfo2;
                }
                return asyncSuccess(folderInfo2.value.name);
            });
            let docHandle_ = createMemo(() => {
                let docUrl2 = docUrl();
                if (docUrl2?.type != "Success") {
                    return docUrl2;
                }
                let docUrl3 = docUrl2.value;
                if (!isValidAutomergeUrl(docUrl3)) {
                    return asyncFailed("Invalid automerge url");
                }
                let [ docHandle, ] = createResource(() => this.repo.find<A>(docUrl3));
                return asyncSuccess(createMemo(() => {
                    let docHandle2 = docHandle();
                    if (docHandle2 == undefined) {
                        return asyncPending();
                    }
                    return asyncSuccess(docHandle2);
                }));
            });
            let docHandle = createMemo(() => {
                let tmp = docHandle_();
                if (tmp.type != "Success") {
                    return tmp;
                }
                return tmp.value();
            });
            let name2 = createMemo(
                () => {
                    let name3 = name();
                    if (name3.type != "Success") {
                        return name3;
                    } else {
                        return asyncSuccess(name as Accessor<Extract<ReturnType<typeof name>, { type: "Success", }>>);
                    }
                },
                undefined,
                {
                    equals: (a, b) => {
                        if (a.type == "Success" && b.type == "Success") {
                            return a.value == b.value;
                        } else {
                            return a == b;
                        }
                    },
                },
            );
            return createMemo(() => {
                let name3 = name2();
                if (name3.type != "Success") {
                    return name3;
                }
                let name4 = createMemo(() => name3.value().value);
                let docHandle2 = docHandle();
                if (docHandle2.type != "Success") {
                    return docHandle2;
                }
                let docHandl3 = docHandle2.value;
                return asyncSuccess(new AutomergeVfsFile<A>(
                    this.repo,
                    id,
                    name4,
                    this,
                    docHandl3,
                ));
            });
        }) as Accessor<AsyncResult<AutomergeVfsFile<A>>>;
    }

    async openFolderByIdNonReactive(id: string): Promise<Result<AutomergeVfsFolder>> {
        let fileOrFolder = this.docHandle.doc().contents[id];
        if (fileOrFolder == undefined) {
            return err("Folder not found");
        }
        if (fileOrFolder.type != "Folder") {
            return err("Expected folder, but got a file");
        }
        if (!isValidAutomergeUrl(fileOrFolder.docUrl)) {
            return err("Invalid automerge url");
        }
        let docHandle = await this.repo.find<AutomergeVfsFolderState>(fileOrFolder.docUrl);
        let name = () => this.doc.contents[id].name;
        return ok(new AutomergeVfsFolder(
            this.repo,
            id,
            name,
            this,
            docHandle,
        ));
    }

    async openFileByIdNonReactive<A>(id: string): Promise<Result<AutomergeVfsFile<A>>> {
        let fileOrFolder = untrack(() => this.doc.contents[id]);
        if (fileOrFolder == undefined) {
            return err("Folder not found");
        }
        if (fileOrFolder.type != "File") {
            return err("Expected file, but got a folder");
        }
        if (!isValidAutomergeUrl(fileOrFolder.docUrl)) {
            return err("Invalid automerge url");
        }
        let docHandle = await this.repo.find<A>(fileOrFolder.docUrl);
        let name = createMemo(() => this.doc.contents[id].name);
        return ok(new AutomergeVfsFile<A>(
            this.repo,
            id,
            name,
            this,
            docHandle,
        ));
    }

    createFile<A>(name: string, initData: A): Result<{ id: string, }> {
        {
            let existingId = this.nameToIdMap.get(name);
            if (existingId != undefined) {
                let existing = untrack(() => this.doc.contents[existingId]);
                if (existing != undefined) {
                    return err(`${existing.type } with name ${name} already exists.`);
                }
            }
        }
        let newFileDocHandle = this.repo.create<A>(initData);
        let newFileUrl = newFileDocHandle.url;
        // use document url as file id
        let newFileId = newFileUrl;
        this.docHandle.change((doc) => {
            doc.contents[newFileId] = {
                type: "File",
                name,
                docUrl: newFileUrl,
            };
        });
        return ok({
            id: newFileId,
        });
    }

    createFolder(name: string): Result<{ id: string, }> {
        {
            let existingId = this.nameToIdMap.get(name);
            if (existingId != undefined) {
                let existing = untrack(() => this.doc.contents[existingId]);
                if (existing != undefined) {
                    return err(`${existing.type } with name ${name} already exists.`);
                }
            }
        }
        let newFolderDocHandle = this.repo.create<AutomergeVfsFolderState>({
            contents: {},
        });
        let newFolderUrl = newFolderDocHandle.url;
        // use document url as folder id
        let newFolderId = newFolderUrl;
        this.docHandle.change((doc) => {
            doc.contents[newFolderId] = {
                type: "Folder",
                name,
                docUrl: newFolderUrl,
            };
        });
        return ok({ id: newFolderId, });
    }

    getOrCreateFolder(name: string): Result<{ id: string, }> {
        {
            let existingId = this.nameToIdMap.get(name);
            if (existingId != undefined) {
                return ok({ id: existingId });
            }
        }
        let newFolderDocHandle = this.repo.create<AutomergeVfsFolderState>({
            contents: {},
        });
        let newFolderUrl = newFolderDocHandle.url;
        // use document url as folder id
        let newFolderId = newFolderUrl;
        this.docHandle.change((doc) => {
            doc.contents[newFolderId] = {
                type: "Folder",
                name,
                docUrl: newFolderUrl,
            };
        });
        return ok({ id: newFolderId, });
    }

    delete(): Result<{}> {
        if (this.parent == undefined) {
            return err("Can not delete root");
        }
        this.parent.removeFileOrFolderById(this.id);
        return ok({});
    }

    rename(newName: string): Result<{}> {
        if (this.parent == undefined) {
            return err("Can not rename root");
        }
        this.parent.renameFileOrFolderById(this.id, newName);
        return ok({});
    }

    removeFileOrFolderById(id: string) {
        this.docHandle.change((doc) => {
            delete doc.contents[id];
        });
    }

    renameFileOrFolderById(id: string, newName: string) {
        this.docHandle.change((doc) => {
            doc.contents[id].name = newName;
        });
    }
}

export class AutomergeVfsFile<A> {
    private repo: Repo;
    readonly id: string;
    readonly name: Accessor<string>;
    private parent: AutomergeVfsFolder;
    readonly docHandle: DocHandle<A>;
    readonly doc: Store<A>;

    constructor(repo: Repo, id: string, name: Accessor<string>, parent: AutomergeVfsFolder, docHandle: DocHandle<A>) {
        this.repo = repo;
        this.id = id;
        this.name = name;
        this.parent = parent;
        this.docHandle = docHandle;
        this.doc = makeDocumentProjection(docHandle);
    }

    rename(newName: string): Result<{}> {
        this.parent.renameFileOrFolderById(this.id, newName);
        return ok({});
    }

    delete(): Result<{}> {
        if (this.parent == undefined) {
            return err("Can not delete root");
        }
        this.parent.removeFileOrFolderById(this.id);
        return ok({});
    }
}
