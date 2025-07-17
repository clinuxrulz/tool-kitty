import { err, ok, Result } from "../kitty-demo/Result";
import { v4 as uuid } from "uuid";

export type VfsFile = {
  id: string;
  type: "File";
  name: string;
};

export type VfsFolder = {
  id: string;
  type: "Folder";
  name: string;
};

export type VfsFileOrFolder = VfsFile | VfsFolder;

export class VirtualFileSystem {
  db: IDBDatabase;

  private constructor(db: IDBDatabase) {
    this.db = db;
  }

  static init(): Promise<Result<VirtualFileSystem>> {
    return new Promise<Result<VirtualFileSystem>>((resolve) => {
      let dbOpenRequest = window.indexedDB.open("level-builder", 1);
      dbOpenRequest.onerror = () => {
        resolve(err("Failed to load database."));
      };
      dbOpenRequest.onupgradeneeded = () => {
        let db = dbOpenRequest.result;
        if (!db.objectStoreNames.contains("files")) {
          db.createObjectStore("files");
        }
      };
      dbOpenRequest.onsuccess = () => {
        let db = dbOpenRequest.result;
        resolve(ok(new VirtualFileSystem(db)));
      };
    });
  }

  readonly rootFolderId = "root";

  getFilesAndFolders(folderId: string): Promise<Result<VfsFileOrFolder[]>> {
    return new Promise<Result<VfsFileOrFolder[]>>((resolve) => {
      let cursor = this.db
        .transaction("files", "readwrite")
        .objectStore("files")
        .get(folderId + "_files_and_folders");
      cursor.onerror = () => {
        resolve(err("Unable to retrieve root files and folders."));
      };
      cursor.onsuccess = () => {
        let filesAndFolders = cursor.result ?? [];
        resolve(ok(filesAndFolders));
      };
    });
  }

  async createFile(
    folderId: string,
    filename: string,
    blob: Blob,
  ): Promise<Result<{ fileId: string }>> {
    let filesAndFolders = await this.getFilesAndFolders(folderId);
    if (filesAndFolders.type == "Err") {
      return filesAndFolders;
    }
    let filesAndFolders2 = filesAndFolders.value;
    let fileEntry: VfsFileOrFolder = {
      id: uuid(),
      type: "File",
      name: filename,
    };
    let filesAndFolders3 = [...filesAndFolders2, fileEntry];
    {
      let r = await new Promise<Result<{}>>((resolve) => {
        let cursor = this.db
          .transaction("files", "readwrite")
          .objectStore("files")
          .put(folderId, fileEntry.id + "_parent");
        cursor.onerror = () => {
          resolve(err("Could not add file."));
        };
        cursor.onsuccess = () => {
          resolve(ok({}));
        };
      });
      if (r.type == "Err") {
        return r;
      }
    }
    {
      let r = await new Promise<Result<{}>>((resolve) => {
        let cursor = this.db
          .transaction("files", "readwrite")
          .objectStore("files")
          .put(filesAndFolders3, folderId + "_files_and_folders");
        cursor.onerror = () => {
          resolve(err("Could not add file."));
        };
        cursor.onsuccess = () => {
          resolve(ok({}));
        };
      });
      if (r.type == "Err") {
        return r;
      }
    }
    await this.overwriteFile(fileEntry.id, blob);
    return ok({ fileId: fileEntry.id });
  }

  readFile(fileId: string): Promise<Result<Blob>> {
    return new Promise<Result<Blob>>((resolve) => {
      let cursor = this.db
        .transaction("files", "readwrite")
        .objectStore("files")
        .get(fileId + "_data");
      cursor.onerror = () => {
        resolve(err("Unable to read file."));
      };
      cursor.onsuccess = () => {
        let blob = cursor.result;
        resolve(ok(blob));
      };
    });
  }

  overwriteFile(fileId: string, blob: Blob): Promise<Result<{}>> {
    return new Promise<Result<{}>>((resolve) => {
      let cursor = this.db
        .transaction("files", "readwrite")
        .objectStore("files")
        .put(blob, fileId + "_data");
      cursor.onerror = () => {
        resolve(err("Unable to read file."));
      };
      cursor.onsuccess = () => {
        resolve(ok({}));
      };
    });
  }

  async deleteFile(fileId: string): Promise<Result<{}>> {
    let parentFolderId = await new Promise<Result<string>>((resolve) => {
      let cursor = this.db
        .transaction("files", "readwrite")
        .objectStore("files")
        .get(fileId + "_parent");
      cursor.onerror = () => {
        resolve(err("Failed to get parent folder of file."));
      };
      cursor.onsuccess = () => {
        resolve(ok(cursor.result));
      };
    });
    if (parentFolderId.type == "Err") {
      return parentFolderId;
    }
    let parentFolderId2 = parentFolderId.value;
    let filesAndFolders = await this.getFilesAndFolders(parentFolderId2);
    if (filesAndFolders.type == "Err") {
      return filesAndFolders;
    }
    let filesAndFolders2 = filesAndFolders.value;
    let filesAndFolders3 = filesAndFolders2.filter((x) => x.id !== fileId);
    if (filesAndFolders3.length != 0) {
      let r = await new Promise<Result<{}>>((resolve) => {
        let cursor = this.db
          .transaction("files", "readwrite")
          .objectStore("files")
          .put(filesAndFolders3, parentFolderId2 + "_files_and_folders");
        cursor.onerror = () => {
          resolve(err("Could not delete file."));
        };
        cursor.onsuccess = () => {
          resolve(ok({}));
        };
      });
      if (r.type == "Err") {
        return r;
      }
    } else {
      let r = await new Promise<Result<{}>>((resolve) => {
        let cursor = this.db
          .transaction("files", "readwrite")
          .objectStore("files")
          .delete(parentFolderId2 + "_files_and_folders");
        cursor.onerror = () => {
          resolve(err("Could not delete file."));
        };
        cursor.onsuccess = () => {
          resolve(ok({}));
        };
      });
      if (r.type == "Err") {
        return r;
      }
    }
    {
      let r = await new Promise<Result<{}>>((resolve) => {
        let cursor = this.db
          .transaction("files", "readwrite")
          .objectStore("files")
          .delete(fileId + "_parent");
        cursor.onerror = () => {
          resolve(err("Could not add file."));
        };
        cursor.onsuccess = () => {
          resolve(ok({}));
        };
      });
      if (r.type == "Err") {
        return r;
      }
    }
    return new Promise<Result<{}>>((resolve) => {
      let cursor = this.db
        .transaction("files", "readwrite")
        .objectStore("files")
        .delete(fileId + "_data");
      cursor.onerror = () => {
        resolve(err("Could not add file."));
      };
      cursor.onsuccess = () => {
        resolve(ok({}));
      };
    });
  }

  async createFolder(
    parentFolderId: string,
    folderName: string,
  ): Promise<Result<{ folderId: string }>> {
    let filesAndFolders = await this.getFilesAndFolders(parentFolderId);
    if (filesAndFolders.type == "Err") {
      return filesAndFolders;
    }
    let filesAndFolders2 = filesAndFolders.value;
    let folderEntry: VfsFileOrFolder = {
      id: uuid(),
      type: "Folder",
      name: folderName,
    };
    let filesAndFolders3 = [...filesAndFolders2, folderEntry];
    {
      let r = await new Promise<Result<{}>>((resolve) => {
        let cursor = this.db
          .transaction("files", "readwrite")
          .objectStore("files")
          .put(parentFolderId, folderEntry.id + "_parent");
        cursor.onerror = () => {
          resolve(err("Could not add file."));
        };
        cursor.onsuccess = () => {
          resolve(ok({}));
        };
      });
      if (r.type == "Err") {
        return r;
      }
    }
    {
      let r = await new Promise<Result<{}>>((resolve) => {
        let cursor = this.db
          .transaction("files", "readwrite")
          .objectStore("files")
          .put(filesAndFolders3, parentFolderId + "_files_and_folders");
        cursor.onerror = () => {
          resolve(err("Could not add file."));
        };
        cursor.onsuccess = () => {
          resolve(ok({}));
        };
      });
      if (r.type == "Err") {
        return r;
      }
    }
    return ok({ folderId: folderEntry.id });
  }

  async deleteFolder(folderId: string): Promise<Result<{}>> {
    if (folderId == this.rootFolderId) {
      return err("Can not delete root folder.");
    }
    {
      let filesAndFolders = await this.getFilesAndFolders(folderId);
      if (filesAndFolders.type == "Err") {
        return filesAndFolders;
      }
      let filesAndFolders2 = filesAndFolders.value;
      for (let fileOrFolder of filesAndFolders2) {
        switch (fileOrFolder.type) {
          case "File": {
            let r = await this.deleteFile(fileOrFolder.id);
            if (r.type == "Err") {
              return r;
            }
            break;
          }
          case "Folder": {
            let r = await this.deleteFolder(fileOrFolder.id);
            if (r.type == "Err") {
              return r;
            }
            break;
          }
        }
      }
      let r = await new Promise<Result<{}>>((resolve) => {
        let cursor = this.db
          .transaction("files", "readwrite")
          .objectStore("files")
          .delete(folderId + "_files_and_folders");
        cursor.onerror = () => {
          resolve(err("Could not delete file."));
        };
        cursor.onsuccess = () => {
          resolve(ok({}));
        };
      });
      if (r.type == "Err") {
        return r;
      }
    }
    let parentFolderId = await new Promise<Result<string>>((resolve) => {
      let cursor = this.db
        .transaction("files", "readwrite")
        .objectStore("files")
        .get(folderId + "_parent");
      cursor.onerror = () => {
        resolve(err("Failed to get parent folder of file."));
      };
      cursor.onsuccess = () => {
        resolve(ok(cursor.result));
      };
    });
    if (parentFolderId.type == "Err") {
      return parentFolderId;
    }
    let parentFolderId2 = parentFolderId.value;
    let filesAndFolders = await this.getFilesAndFolders(parentFolderId2);
    if (filesAndFolders.type == "Err") {
      return filesAndFolders;
    }
    let filesAndFolders2 = filesAndFolders.value;
    let filesAndFolders3 = filesAndFolders2.filter((x) => x.id !== folderId);
    if (filesAndFolders3.length != 0) {
      let r = await new Promise<Result<{}>>((resolve) => {
        let cursor = this.db
          .transaction("files", "readwrite")
          .objectStore("files")
          .put(filesAndFolders3, parentFolderId2 + "_files_and_folders");
        cursor.onerror = () => {
          resolve(err("Could not delete file."));
        };
        cursor.onsuccess = () => {
          resolve(ok({}));
        };
      });
      if (r.type == "Err") {
        return r;
      }
    } else {
      let r = await new Promise<Result<{}>>((resolve) => {
        let cursor = this.db
          .transaction("files", "readwrite")
          .objectStore("files")
          .delete(parentFolderId2 + "_files_and_folders");
        cursor.onerror = () => {
          resolve(err("Could not delete file."));
        };
        cursor.onsuccess = () => {
          resolve(ok({}));
        };
      });
      if (r.type == "Err") {
        return r;
      }
    }
    {
      let r = await new Promise<Result<{}>>((resolve) => {
        let cursor = this.db
          .transaction("files", "readwrite")
          .objectStore("files")
          .delete(folderId + "_parent");
        cursor.onerror = () => {
          resolve(err("Could not add file."));
        };
        cursor.onsuccess = () => {
          resolve(ok({}));
        };
      });
      if (r.type == "Err") {
        return r;
      }
    }
    return ok({});
  }

  async getParentFolderId(
    fileOrFolderId: string,
  ): Promise<Result<string | undefined>> {
    if (fileOrFolderId == this.rootFolderId) {
      return Promise.resolve(ok(undefined));
    }
    return await new Promise<Result<string>>((resolve) => {
      let cursor = this.db
        .transaction("files", "readwrite")
        .objectStore("files")
        .get(fileOrFolderId + "_parent");
      cursor.onerror = () => {
        resolve(err("Failed to get parent folder of file."));
      };
      cursor.onsuccess = () => {
        resolve(ok(cursor.result));
      };
    });
  }

  async delete(fileOrFolderId: string) {
    let parentFolderId = await new Promise<Result<string>>((resolve) => {
      let cursor = this.db
        .transaction("files", "readwrite")
        .objectStore("files")
        .get(fileOrFolderId + "_parent");
      cursor.onerror = () => {
        resolve(err("Failed to get parent folder of file."));
      };
      cursor.onsuccess = () => {
        resolve(ok(cursor.result));
      };
    });
    if (parentFolderId.type == "Err") {
      return parentFolderId;
    }
    let parentFolderId2 = parentFolderId.value;
    let filesAndFolders = await this.getFilesAndFolders(parentFolderId2);
    if (filesAndFolders.type == "Err") {
      return filesAndFolders;
    }
    let filesAndFolders2 = filesAndFolders.value;
    let fileOrFolder = filesAndFolders2.find((x) => x.id === fileOrFolderId);
    if (fileOrFolder == undefined) {
      return err("Failed to delete file or folder");
    }
    switch (fileOrFolder.type) {
      case "File": {
        return this.deleteFile(fileOrFolderId);
      }
      case "Folder": {
        return this.deleteFolder(fileOrFolderId);
      }
    }
  }
}
