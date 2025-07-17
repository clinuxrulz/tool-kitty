import {
  Accessor,
  createComputed,
  createMemo,
  createRoot,
  getListener,
  getOwner,
  on,
  onCleanup,
} from "solid-js";
import { AsyncResult } from "./AsyncResult";
import { err, ok, Result } from "./kitty-demo/Result";

export function makeRefCountedMakeReactiveObject<A>(
  fn: () => A,
  cleanup?: () => void,
): () => A {
  let cache: Accessor<A> | undefined = undefined;
  let dispose: () => void = () => {};
  let refCount = 0;
  return () => {
    if (getOwner() == null) {
      if (cache != undefined) {
        return cache();
      } else {
        return fn();
      }
    }
    if (cache == undefined) {
      let { cache: cache2, dispose: dispose2 } = createRoot((dispose) => {
        return {
          cache: createMemo(fn),
          dispose,
        };
      });
      cache = cache2;
      dispose = dispose2;
      refCount = 1;
    } else {
      ++refCount;
    }
    onCleanup(() => {
      if (--refCount == 0) {
        dispose();
        dispose = () => {};
        cleanup?.();
        cache = undefined;
      }
    });
    return cache();
  };
}

export class NoTrack<A> {
  value: A;
  constructor(value: A) {
    this.value = value;
  }
}

export function uint8ArrayToBase64(bytes: Uint8Array): string {
  var binary = "";
  var len = bytes.byteLength;
  for (var i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

export function base64ToUint8Array(base64: string): Uint8Array {
  var binary = atob(base64);
  var bytes = new Uint8Array(binary.length);
  for (var i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export function mkAccessorToPromise<A, E>(
  mkAccessor: () => Accessor<AsyncResult<A, E>>,
): Promise<Result<A, E>> {
  return new Promise((resolve) => {
    createRoot((dispose) => {
      let accessor = mkAccessor();
      createComputed(
        on(accessor, (asyncResult) => {
          switch (asyncResult.type) {
            case "Pending": {
              break;
            }
            case "Failed": {
              dispose();
              resolve(err(asyncResult.message));
              break;
            }
            case "Success": {
              dispose();
              resolve(ok(asyncResult.value));
              break;
            }
          }
        }),
      );
    });
  });
}

export type Overwrite<TTarget, TSource extends Record<string, unknown>> = Omit<
  TTarget,
  keyof TSource
> &
  TSource;
