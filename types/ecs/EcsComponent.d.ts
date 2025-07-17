import { SetStoreFunction, Store } from 'solid-js/store';
import { Result } from '../kitty-demo/Result';
import { TypeSchema } from '../TypeSchema';
import { Accessor } from 'solid-js';
export interface IsEcsComponentType {
    readonly typeName: string;
}
export interface IsEcsComponent {
    readonly type: IsEcsComponentType;
}
export declare class EcsComponentType<S extends object> implements IsEcsComponentType {
    readonly typeName: string;
    readonly typeSchema: TypeSchema<S>;
    constructor(params: {
        typeName: string;
        typeSchema: TypeSchema<S>;
    });
    create(s: S): EcsComponent<S>;
    createJsonProjectionV3(json: any, changeJson: (callback: (json: any) => void) => void): Result<EcsComponent<S>>;
    createJsonProjectionV2(json: any, changeJson: (callback: (json: any) => void) => void): Result<EcsComponent<S>>;
    createJsonProjection(json: Accessor<any>, setJson: (x: any) => void): Accessor<Result<EcsComponent<S>>>;
}
export declare class EcsComponent<S extends object> implements IsEcsComponent {
    readonly type: EcsComponentType<S>;
    state: Store<S>;
    setState: SetStoreFunction<S>;
    constructor(params: {
        type: EcsComponentType<S>;
        state: Store<S>;
        setState: SetStoreFunction<S>;
    });
}
