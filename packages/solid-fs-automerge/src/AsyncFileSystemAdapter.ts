export type ItemType = "dir" | "file" | null;

export type DirEntries = string[];

export type AsyncFileSystemAdapter = {
    async: true;
    getType: (path: string) => Promise<ItemType>;
    mkdir: (path: string) => Promise<void>;
    readdir: (path: string) => Promise<DirEntries>;
    readFile: (path: string) => Promise<Blob>;
    rm: (path: string) => Promise<void>;
    writeFile: (path: string, data: Blob) => Promise<void>;
};
