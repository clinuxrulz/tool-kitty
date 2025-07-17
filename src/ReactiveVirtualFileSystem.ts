import {
  Accessor,
  createMemo,
  createResource,
  createRoot,
  getListener,
  onCleanup,
} from "solid-js";
import {
  asyncFailed,
  asyncPending,
  AsyncResult,
  asyncSuccess,
} from "./AsyncResult";
import { err, Result } from "./kitty-demo/Result";
import {
  VfsFileOrFolder,
  VirtualFileSystem,
} from "./level-builder/VirtualFileSystem";

const channel = "rvfs";

export class ReactiveVirtualFileSystem {
  readonly vfs: VirtualFileSystem;
  private folderMonitors = new Map<
    string,
    {
      accessor: Accessor<AsyncResult<VfsFileOrFolder[]>>;
      refetch: (options?: { skipBroadcast?: boolean }) => void;
      dispose: () => void;
      refCount: number;
    }
  >();
  private fileDataMonitors = new Map<
    string,
    {
      accessor: Accessor<AsyncResult<Blob>>;
      refetch: (options?: { skipBroadcast?: boolean }) => void;
      dispose: () => void;
      refCount: number;
    }
  >();
  private readerCount: number = 0;
  private hasWriter: boolean = false;
  private pendingWriters: (() => void)[] = [];
  private pendingReaders: (() => void)[] = [];
  private bc: BroadcastChannel;

  awaitReadLock(): Promise<{}> {
    return new Promise((resolve) => {
      this.pendingReaders.push(() => resolve({}));
    });
  }

  awaitWriteLock(): Promise<{}> {
    return new Promise((resolve) => {
      this.pendingWriters.push(() => resolve({}));
    });
  }

  async lockRead<A>(callback: () => PromiseLike<A>): Promise<A> {
    if (this.hasWriter) {
      await this.awaitReadLock();
    }
    this.readerCount++;
    let result = await callback();
    this.readerCount--;
    if (this.readerCount == 0) {
      while (true) {
        let pendingWriter = this.pendingWriters.pop();
        if (pendingWriter == undefined) {
          break;
        }
        pendingWriter();
      }
    }
    return result;
  }

  async lockWrite<A>(callback: () => PromiseLike<A>): Promise<A> {
    if (this.readerCount != 0 || this.hasWriter) {
      await this.awaitWriteLock();
    }
    this.hasWriter = true;
    let result = await callback();
    this.hasWriter = false;
    while (true) {
      let pendingReader = this.pendingReaders.pop();
      if (pendingReader == undefined) {
        break;
      }
      pendingReader();
    }
    while (true) {
      let pendingWriter = this.pendingWriters.pop();
      if (pendingWriter == undefined) {
        break;
      }
      pendingWriter();
    }
    return result;
  }

  constructor(params: { vfs: VirtualFileSystem }) {
    this.vfs = params.vfs;
    this.bc = new BroadcastChannel(channel);
    //
    this.bc.onmessage = (e) => {
      let data = e.data;
      if (data.type == "FolderChanged") {
        let folderId = data.folderId;
        let monitor = this.folderMonitors.get(folderId);
        if (monitor != undefined) {
          monitor.refetch({ skipBroadcast: true });
        }
      }
      if (data.type == "FileDataChanged") {
        let fileId = data.fileId;
        let monitor = this.fileDataMonitors.get(fileId);
        if (monitor != undefined) {
          monitor.refetch({ skipBroadcast: true });
        }
      }
    };
  }

  get rootFolderId(): string {
    return this.vfs.rootFolderId;
  }

  getFilesAndFolders(
    folderId: string,
  ): Accessor<AsyncResult<VfsFileOrFolder[]>> {
    let folderMonitor = this.folderMonitors.get(folderId);
    if (folderMonitor != undefined) {
      folderMonitor.refCount++;
    } else {
      let { accessor, refetch, dispose } = createRoot((dispose) => {
        let [filesAndFolders, { refetch }] = createResource(() =>
          this.lockRead(() => this.vfs.getFilesAndFolders(folderId)),
        );
        let accessor = createMemo(() => {
          let filesAndFolders2 = filesAndFolders();
          if (filesAndFolders2 == undefined) {
            return asyncPending();
          }
          if (filesAndFolders2.type == "Err") {
            return asyncFailed(filesAndFolders2.message);
          }
          return asyncSuccess(filesAndFolders2.value);
        });
        let refetch2 = (options?: { skipBroadcast?: boolean }) => {
          refetch();
          if (!(options?.skipBroadcast ?? false)) {
            this.bc.postMessage({
              type: "FolderChanged",
              folderId,
            });
          }
        };
        return {
          accessor,
          refetch: refetch2,
          dispose,
        };
      });
      folderMonitor = {
        accessor,
        refetch,
        dispose,
        refCount: 1,
      };
      this.folderMonitors.set(folderId, folderMonitor);
    }
    onCleanup(() => {
      folderMonitor.refCount--;
      if (folderMonitor.refCount == 0) {
        folderMonitor.dispose();
        this.folderMonitors.delete(folderId);
      }
    });
    return folderMonitor.accessor;
  }

  async createFile(
    folderId: string,
    filename: string,
    blob: Blob,
  ): Promise<Result<{ fileId: string }>> {
    let r = await this.lockWrite(() =>
      this.vfs.createFile(folderId, filename, blob),
    );
    if (r.type != "Ok") {
      return r;
    }
    let folderMonitor = this.folderMonitors.get(folderId);
    if (folderMonitor != undefined) {
      folderMonitor.refetch();
    }
    return r;
  }

  readFileAsText(fileId: string): Accessor<AsyncResult<string>> {
    let data = this.readFile(fileId);
    let text_ = createMemo(() => {
      let data2 = data();
      if (data2.type != "Success") {
        return data2;
      }
      let data3 = data2.value;
      let [text] = createResource(() => data3.text());
      return asyncSuccess(
        createMemo(() => {
          let text2 = text();
          if (text2 == undefined) {
            return asyncPending();
          }
          return asyncSuccess(text2);
        }),
      );
    });
    return createMemo(() => {
      let tmp = text_();
      if (tmp.type != "Success") {
        return tmp;
      }
      return tmp.value();
    });
  }

  readFile(fileId: string): Accessor<AsyncResult<Blob>> {
    let fileDataMonitor = this.fileDataMonitors.get(fileId);
    if (fileDataMonitor != undefined) {
      fileDataMonitor.refCount++;
    } else {
      let { accessor, refetch, dispose } = createRoot((dispose) => {
        let [fileData, { refetch }] = createResource(() =>
          this.lockRead(() => this.vfs.readFile(fileId)),
        );
        let accessor = createMemo(() => {
          let fileData2 = fileData();
          if (fileData2 == undefined) {
            return asyncPending();
          }
          if (fileData2.type == "Err") {
            return asyncFailed(fileData2.message);
          }
          return asyncSuccess(fileData2.value);
        });
        let refetch2 = (options?: { skipBroadcast?: boolean }) => {
          refetch();
          if (!(options?.skipBroadcast ?? false)) {
            this.bc.postMessage({
              type: "FileDataChanged",
              fileId,
            });
          }
        };
        return {
          accessor,
          refetch: refetch2,
          dispose,
        };
      });
      fileDataMonitor = {
        accessor,
        refetch,
        dispose,
        refCount: 1,
      };
      this.fileDataMonitors.set(fileId, fileDataMonitor);
    }
    onCleanup(() => {
      fileDataMonitor.refCount--;
      if (fileDataMonitor.refCount == 0) {
        fileDataMonitor.dispose();
        this.fileDataMonitors.delete(fileId);
      }
    });
    return fileDataMonitor.accessor;
  }

  async overwriteFile(fileId: string, blob: Blob): Promise<Result<{}>> {
    let r = await this.lockWrite(() => this.vfs.overwriteFile(fileId, blob));
    if (r.type != "Ok") {
      return r;
    }
    let fileDataMonitor = this.fileDataMonitors.get(fileId);
    if (fileDataMonitor != undefined) {
      fileDataMonitor.refetch();
    }
    return r;
  }

  async createFolder(
    parentFolderId: string,
    folderName: string,
  ): Promise<Result<{ folderId: string }>> {
    let r = await this.lockWrite(() =>
      this.vfs.createFolder(parentFolderId, folderName),
    );
    if (r.type != "Ok") {
      return r;
    }
    let folderMonitor = this.folderMonitors.get(parentFolderId);
    if (folderMonitor != undefined) {
      folderMonitor.refetch();
    }
    return r;
  }

  async delete(fileOrFolderId: string): Promise<Result<{}>> {
    let parentFolderId = await this.lockRead(() =>
      this.vfs.getParentFolderId(fileOrFolderId),
    );
    if (parentFolderId.type != "Ok") {
      return parentFolderId;
    }
    let parentFolderId2 = parentFolderId.value;
    if (parentFolderId2 == undefined) {
      return err("Can not delete the root folder.");
    }
    let filesAndFolders = await this.lockRead(() =>
      this.vfs.getFilesAndFolders(parentFolderId2),
    );
    if (filesAndFolders.type == "Err") {
      return filesAndFolders;
    }
    let filesAndFolders2 = filesAndFolders.value;
    let fileOrFolder = filesAndFolders2.find((x) => x.id == fileOrFolderId);
    if (fileOrFolder == undefined) {
      return err("Could not find file or folder to delete.");
    }
    switch (fileOrFolder.type) {
      case "File":
        return this.deleteFile(parentFolderId2, fileOrFolderId);
      case "Folder":
        return this.deleteFolder(parentFolderId2, fileOrFolderId);
    }
  }

  private async deleteFile(
    parentFolderId: string,
    fileId: string,
  ): Promise<Result<{}>> {
    let r = await this.lockWrite(() => this.vfs.deleteFile(fileId));
    if (r.type != "Ok") {
      return r;
    }
    let folderMonitor = this.folderMonitors.get(parentFolderId);
    if (folderMonitor != undefined) {
      folderMonitor.refetch();
    }
    return r;
  }

  private async deleteFolder(
    parentFolderId: string,
    folderId: string,
  ): Promise<Result<{}>> {
    let filesAndFolders = await this.lockRead(() =>
      this.vfs.getFilesAndFolders(folderId),
    );
    if (filesAndFolders.type == "Err") {
      return filesAndFolders;
    }
    let filesAndFolders2 = filesAndFolders.value;
    for (let fileOrFolder of filesAndFolders2) {
      switch (fileOrFolder.type) {
        case "File": {
          let r = await this.deleteFile(folderId, fileOrFolder.id);
          if (r.type != "Ok") {
            console.log(r.message);
          }
        }
        case "Folder": {
          let r = await this.deleteFolder(folderId, fileOrFolder.id);
          if (r.type != "Ok") {
            console.log(r.message);
          }
        }
      }
    }
    let r = await this.lockWrite(() => this.vfs.deleteFolder(folderId));
    if (r.type != "Ok") {
      return r;
    }
    let folderMonitor = this.folderMonitors.get(parentFolderId);
    if (folderMonitor != undefined) {
      folderMonitor.refetch();
    }
    return r;
  }
}
