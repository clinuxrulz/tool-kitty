import JSZip from "jszip";
import FileSaver from "file-saver";
import { AutomergeVfsFolder, AutomergeVirtualFileSystem } from "./AutomergeVirtualFileSystem";
import { createComputed, createMemo, createResource, createRoot } from "solid-js";
import { asyncSuccess, err, ok, Result } from "control-flow-as-value";
import { useParams } from "@solidjs/router";
import { untrack } from "solid-js/web";
import { createSignal, on } from "solid-js";
import { e } from "unocss";

export let exportToZip = async (params: {
    vfs: AutomergeVirtualFileSystem,
}) => {
    let vfs3 = params.vfs;
    let zip = new JSZip();
    let addFilesAndFolders = async (at: JSZip, folder: AutomergeVfsFolder) => {
        let filesAndFolders2 = folder.contents;
        for (let fileOrFolder of filesAndFolders2) {
            switch (fileOrFolder.type) {
                case "File": {
                    let data = await new Promise<Result<Blob>>((resolve) => {
                        createRoot((dispose) => {
                            let data = folder.openFileById(fileOrFolder.id);
                            createComputed(() => {
                                let data2 = data();
                                if (data2.type == "Pending") {
                                    return;
                                }
                                dispose();
                                if (data2.type == "Failed") {
                                    resolve(err(data2.message));
                                    return;
                                }
                                let file = data2.value;
                                let blob: Blob;
                                if (file.name().toLowerCase().endsWith(".json")) {
                                    blob = new Blob([JSON.stringify(file.doc, undefined, 2)], { type: "application/json" });
                                } else if (file.name().toLowerCase().endsWith(".ts")) {
                                    blob = new Blob([(file as any).doc.source as string], { type: "application/typescript", });
                                } else {
                                    let type = (file as any).doc.mimeType as string;
                                    let data = (file as any).doc.data as Uint8Array;
                                    blob = new Blob([data], { type, });
                                }
                                resolve(ok(blob));
                            });
                        });
                    });
                    if (data.type == "Err") {
                        continue;
                    }
                    let data2 = data.value;
                    at.file(fileOrFolder.name, data2);
                    break;
                }
                case "Folder": {
                    let atNext = at.folder(fileOrFolder.name);
                    if (atNext == null) {
                        continue;
                    }
                    await new Promise<void>((resolve) => {
                        createRoot((dispose) => {
                            let next = folder.openFolderById(fileOrFolder.id);
                            createComputed(() => {
                                let next2 = next();
                                if (next2.type == "Pending") {
                                    return;
                                }
                                if (next2.type == "Failed") {
                                    console.log(next2.message);
                                    dispose();
                                    resolve();
                                    return;
                                }
                                let next3 = next2.value;
                                (async () => {
                                    await addFilesAndFolders(atNext, next3);
                                    dispose();
                                    resolve();
                                })();
                            });
                        });
                    });
                    break;
                }
            }
        }
    };
    createRoot((dispose) => {
        let rootFolder = vfs3.rootFolder();
        createComputed(() => {
            let next = rootFolder();
            if (next.type == "Pending") {
                return;
            }
            if (next.type == "Failed") {
                console.log(next.message);
                dispose();
                return;
            }
            (async () => {
                let next2 = next.value;
                await addFilesAndFolders(zip, next2);
                let data = await zip.generateAsync({ type: "blob" });
                FileSaver.saveAs(data, "kitty_export.zip");
                dispose();
            })();
        });
    });
};

export let importFromZip = async (params: {
    file: File, vfs: AutomergeVirtualFileSystem,
}): Promise<Result<{}>> => {
    let vfs3 = params.vfs;
    // clear out existing files/folders
    let rootFolder: AutomergeVfsFolder;
    {
        let r = await new Promise<Result<AutomergeVfsFolder>>((resolve) => {
            createRoot((dispose) => {
                let rootFolder = vfs3.rootFolder();
                createComputed(() => {
                    let rootFolder2 = rootFolder();
                    if (rootFolder2.type == "Pending") {
                        return;
                    }
                    if (rootFolder2.type == "Failed") {
                        dispose();
                        resolve(err(rootFolder2.message));
                        return;
                    }
                    let rootFolder3 = rootFolder2.value;
                    untrack(() => {
                        let contents = rootFolder3.contents;
                        for (let entry of contents) {
                            rootFolder3.removeFileOrFolderById(entry.id);
                        }
                    });
                    dispose();
                    resolve(ok(rootFolder3));
                });
            });
        });
        if (r.type == "Err") {
            return r;
        }
        rootFolder = r.value;
    }
    // copy everything over from the zip
    {
        let zip = await JSZip.loadAsync(params.file);
        async function addFilesAndFoldersToVfs(
            folderPath: string,
            vfsFolder: AutomergeVfsFolder,
        ): Promise<void> {
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
                    if (entry.relativePath.toLowerCase().endsWith(".json")) {
                        let data3 = await data2.text();
                        let data4 = JSON.parse(data3);
                        vfsFolder.createFile(
                            entry.relativePath,
                            data4,
                        );
                    } else if (entry.relativePath.toLowerCase().endsWith(".ts")) {
                        let data3 = await data2.text();
                        vfsFolder.createFile(
                            entry.relativePath,
                            {
                                source: data3,
                            },
                        );
                    } else {
                        let data3 = new Uint8Array(await data2.arrayBuffer());
                        vfsFolder.createFile(
                            entry.relativePath,
                            {
                                mimeType: data2.type,
                                data: data3,
                            },
                        );
                    }
                }
            }
            for (const entry of entries) {
                if (entry.isFolder) {
                    let folderName = entry.relativePath;
                    if (folderName.endsWith("/")) {
                        folderName = folderName.slice(0, folderName.length - 1);
                    }
                    let r = vfsFolder.createFolder(folderName);
                    if (r.type == "Err") {
                        continue;
                    }
                    let { id: nextVfsFolderId } = r.value;
                    await new Promise<void>((resolve) => {
                        createRoot((dispose) => {
                            let nextVfsFolder = vfsFolder.openFolderById(nextVfsFolderId);
                            createComputed(on(
                                nextVfsFolder,
                                (nextVfsFolder) => {
                                    if (nextVfsFolder.type == "Pending") {
                                        return;
                                    }
                                    if (nextVfsFolder.type == "Failed") {
                                        console.log(nextVfsFolder.message);
                                        dispose();
                                        resolve();
                                        return;
                                    }
                                    let nextVfsFolder2 = nextVfsFolder.value;
                                    (async () => {
                                        await addFilesAndFoldersToVfs(entry.name, nextVfsFolder2);
                                        dispose();
                                        resolve();
                                    })();
                                },
                            ));
                        });
                    });
                }
            }
        }
        await addFilesAndFoldersToVfs("", rootFolder);
        //
    }
    //
    return ok({});
};
