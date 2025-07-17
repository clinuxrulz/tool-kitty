export declare function createGmeSystem(params: {
    fileUrl: string;
    onReady?: () => void;
}): {
    playMusic: (subtune: number) => void;
    playSound: (subtune: number) => void;
    subtuneCount: () => number;
};
