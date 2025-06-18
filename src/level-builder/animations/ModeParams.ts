import { Accessor } from "solid-js";
import { UndoManager } from "../../pixel-editor/UndoManager";
import { Vec2 } from "../../math/Vec2";
import { IEcsWorld } from "../../ecs/IEcsWorld";
import { AutomergeVirtualFileSystem } from "solid-fs-automerge";

export type ModeParams = {
    image: HTMLImageElement,
    undoManager: UndoManager;
    mousePos: Accessor<Vec2 | undefined>;
    screenPtToWorldPt(screenPt: Vec2): Vec2 | undefined;
    worldPtToScreenPt(worldPt: Vec2): Vec2 | undefined;
    world: Accessor<IEcsWorld>;
    onDone: () => void;
};
