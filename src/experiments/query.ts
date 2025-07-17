let _queryCache = new Map<
  string,
  | {
      type: "Pending";
      callbacks: { resolve: (x: any) => void; reject: (x: any) => void }[];
    }
  | {
      type: "Resolved";
      value: any;
    }
>();

export function query<A extends object, B>(
  callback: (params: A) => PromiseLike<B>,
): (params: A) => Promise<B> {
  return (params) =>
    new Promise((resolve, reject) => {
      let object2: any = {};
      let keys: (keyof A)[] = Object.keys(params).sort() as (keyof A)[];
      for (let key of keys) {
        object2[key] = params[key];
      }
      let key = JSON.stringify(object2);
      let cache = _queryCache.get(key);
      if (cache == undefined) {
        cache = {
          type: "Pending",
          callbacks: [{ resolve, reject }],
        };
        let cache2 = cache;
        _queryCache.set(key, cache2);
        (async () => {
          try {
            let result = await callback(params);
            let callbacks = cache2.callbacks;
            _queryCache.set(key, {
              type: "Resolved",
              value: result,
            });
            for (let { resolve } of callbacks) {
              resolve(result);
            }
          } catch (ex) {
            let callbacks = cache2.callbacks;
            _queryCache.delete(key);
            for (let { reject } of callbacks) {
              reject(ex);
            }
          }
        })();
      } else if (cache.type == "Pending") {
        cache.callbacks.push({ resolve, reject });
      } else {
        resolve(cache.value);
      }
    });
}
