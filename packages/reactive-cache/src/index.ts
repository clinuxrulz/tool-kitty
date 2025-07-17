import { Accessor, createMemo, createRoot, getListener, onCleanup } from "solid-js";

export class ReactiveCache<A> {
    private map = new Map<
        string,
        {
            cache: Accessor<A>,
            refCount: number,
            dispose: () => void,
        }
    >();

    cached(key: string, mkValue: () => A): A {
        if (getListener() == null) {
            let result = this.map.get(key);
            if (result != undefined) {
                return result.cache();
            }
            return mkValue();
        }
        let result = this.map.get(key);
        if (result == undefined) {
            let { dispose, cache, } = createRoot((dispose) => {
                return {
                    dispose,
                    cache: createMemo(mkValue),
                };
            });
            result = {
                cache,
                refCount: 1,
                dispose,
            };
            this.map.set(key, result);
        } else {
            result.refCount++;
        }
        onCleanup(() => {
            result.refCount--;
            if (result.refCount == 0) {
                result.dispose();
                this.map.delete(key);
            }
        });
        return result.cache();
    }
}
