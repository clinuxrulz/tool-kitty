import { Accessor } from 'solid-js';
export declare function createVirtualDPadSystem(): {
    dispose: () => void;
    leftPressed: Accessor<boolean>;
    rightPressed: Accessor<boolean>;
    upPressed: Accessor<boolean>;
    downPressed: Accessor<boolean>;
};
