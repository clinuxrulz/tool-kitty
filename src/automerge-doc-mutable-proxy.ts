import {
  equalsViaTypeSchema,
  loadFromJsonViaTypeSchema,
  makeDefaultViaTypeSchema,
  saveToJsonViaTypeSchema,
  TypeSchema,
} from "./TypeSchema";

export function projectMutableOverAutomergeDoc<T extends object>(
  json: any,
  updateJson: (cb: (json: any) => any) => void,
  typeSchema: TypeSchema<T>,
): T {
  if (typeof typeSchema != "object" || typeSchema.type != "Object") {
    throw new Error("Expected object.");
  }
  {
    let result = objectProxiesMap.get(json);
    if (result != undefined) {
      return result as T;
    }
  }
  let properties = typeSchema.properties;
  let result = new Proxy<T>({} as T, {
    defineProperty(target, property, attributes) {
      // console.log("defineProperty", target, property, attributes);
      return Reflect.defineProperty(target, property, attributes);
    },
    deleteProperty(target, p) {
      // console.log("deleteProperty", target, p);
      return Reflect.deleteProperty(target, p);
    },
    getOwnPropertyDescriptor(target, p) {
      // console.log("getOwnPropertyDescriptor", target, p);
      if ((properties as any)[p] != undefined) {
        let r = Reflect.getOwnPropertyDescriptor(properties, p);
        if (r == undefined) {
          return;
        }
        r = { ...r };
        r.value = (result as any)[p];
        return r;
      }
      return Reflect.getOwnPropertyDescriptor(target, p);
    },
    getPrototypeOf(target) {
      // console.log("getPrototypeOf", target);
      return Reflect.getPrototypeOf(target);
    },
    has(target, p) {
      // console.log("has", target);
      if ((properties as any)[p] != undefined) {
        return true;
      }
      return Reflect.has(target, p);
    },
    isExtensible(target) {
      // console.log("isExtendable", target);
      return Reflect.isExtensible(target);
    },
    ownKeys(target) {
      // console.log("ownKeys", target);
      return [...Reflect.ownKeys(properties), ...Reflect.ownKeys(target)];
    },
    preventExtensions(target) {
      // console.log("preventExtensions", target);
      return Reflect.preventExtensions(target);
    },
    setPrototypeOf(target, v) {
      // console.log("setPrototypeOf", target, v);
      return Reflect.setPrototypeOf(target, v);
    },
    get(target, p, receiver) {
      // console.log("get", target, p, receiver);
      if (typeof p == "symbol") {
        return (target as any)[p];
      }
      if (typeof p == "string") {
        let propertySchema = (properties as any)[p] as TypeSchema<any>;
        if (propertySchema != undefined) {
          if ((propertySchema as any).type == "Object") {
            return projectMutableOverAutomergeDoc(
              json[p],
              (cb) => updateJson((json2) => cb(json2[p])),
              propertySchema,
            );
          } else if ((propertySchema as any).type == "Array") {
            return projectMutableOverAutomergeDocArray(
              json[p],
              (cb) => updateJson((json2) => cb(json2[p])),
              propertySchema,
            );
          }
          let r = loadFromJsonViaTypeSchema(propertySchema as any, json[p]);
          if (r.type == "Err") {
            return makeDefaultViaTypeSchema(propertySchema as any);
          }
          return r.value;
        }
      }
      return Reflect.get(target, p, receiver);
    },
    set(target, p, newValue, receiver) {
      // console.log("set", target, p, newValue, receiver);
      if (typeof p == "symbol") {
        (target as any)[p] = newValue;
        return true;
      }
      if (typeof p == "string") {
        let propertySchema = (properties as any)[p] as TypeSchema<any>;
        if (propertySchema != undefined) {
          let r = saveToJsonViaTypeSchema(propertySchema, newValue);
          updateJson((json2) => (json2[p] = r));
          return true;
        }
      }
      return Reflect.set(target, p, newValue, receiver);
    },
  });
  objectProxiesMap.set(json, result);
  return result;
}

export function projectMutableOverAutomergeDocArray<T extends object>(
  json: any,
  updateJson: (cb: (json: any) => any) => void,
  typeSchema: TypeSchema<T>,
): T {
  if (typeof typeSchema != "object" || typeSchema.type != "Array") {
    throw new Error("Expected object.");
  }
  {
    let result = arrayProxiesMap.get(json);
    if (result != undefined) {
      return result;
    }
  }
  let elementSchema = typeSchema.element;
  let iterator = function* () {
    for (let i = 0; i < json.length; ++i) {
      yield (result as any)[i];
    }
  };
  let result = new Proxy<T>([undefined] as T, {
    defineProperty(target, property, attributes) {
      // console.log("defineProperty", target, property, attributes);
      return Reflect.defineProperty(target, property, attributes);
    },
    deleteProperty(target, p) {
      // console.log("deleteProperty", target, p);
      return Reflect.deleteProperty(target, p);
    },
    getOwnPropertyDescriptor(target, p) {
      // console.log("getOwnPropertyDescriptor", target, p);
      let idx = typeof p == "string" ? Number.parseInt(p) : undefined;
      if (Number.isNaN(idx)) {
        idx = undefined;
      }
      if (idx != undefined) {
        let r = Reflect.getOwnPropertyDescriptor(target, 0);
        if (r == undefined) {
          return;
        }
        r = { ...r };
        r.value = (result as any)[p];
        return r;
      }
      let r = Reflect.getOwnPropertyDescriptor(target, p);
      if (r == undefined) {
        return undefined;
      }
      if (p === "length") {
        r = { ...r };
        r.value = json.length;
      }
      return r;
    },
    getPrototypeOf(target) {
      // console.log("getPrototypeOf", target);
      return Reflect.getPrototypeOf(target);
    },
    has(target, p) {
      // console.log("has", target);
      let idx = typeof p == "string" ? Number.parseInt(p) : undefined;
      if (Number.isNaN(idx)) {
        idx = undefined;
      }
      if (idx != undefined) {
        return 0 <= idx && idx < json.length;
      }
      return Reflect.has(target, p);
    },
    isExtensible(target) {
      // console.log("isExtendable", target);
      return Reflect.isExtensible(target);
    },
    ownKeys(target) {
      // console.log("ownKeys", target);
      return [
        ...Array(json.length)
          .fill(undefined)
          .map((_, idx) => idx.toString()),
        ...Reflect.ownKeys(target).filter((key) => key != "0"),
      ];
    },
    preventExtensions(target) {
      // console.log("preventExtensions", target);
      return Reflect.preventExtensions(target);
    },
    setPrototypeOf(target, v) {
      // console.log("setPrototypeOf", target, v);
      return Reflect.setPrototypeOf(target, v);
    },
    get(target, p, receiver) {
      // console.log("get", target, p, receiver);
      if (p == Symbol.iterator) {
        return iterator;
      }
      if (typeof p == "symbol") {
        return (target as any)[p];
      }
      if (p === "length") {
        return json.length;
      }
      if (p === "findIndex") {
        return function (
          predicate: (value: any, index: number, obj: any[]) => boolean,
          thisArg?: any,
        ) {
          console.log("Intercepted findIndex call!");

          const tempArray = [];
          for (let i = 0; i < json.length; i++) {
            if ((elementSchema as any).type == "Object") {
              tempArray.push(
                projectMutableOverAutomergeDoc(
                  json[i],
                  (cb) => updateJson((json2) => cb(json2[i])),
                  elementSchema as any,
                ),
              );
            } else if ((elementSchema as any).type == "Array") {
              tempArray.push(
                projectMutableOverAutomergeDocArray(
                  json[i],
                  (cb) => updateJson((json2) => cb(json2[i])),
                  elementSchema as any,
                ),
              );
            } else {
              let r = loadFromJsonViaTypeSchema(elementSchema as any, json[i]);
              if (r.type == "Err") {
                tempArray.push(makeDefaultViaTypeSchema(elementSchema as any));
              } else {
                tempArray.push(r.value);
              }
            }
          }
          return Array.prototype.findIndex.call(tempArray, predicate, thisArg);
        };
      }
      if (typeof p == "string") {
        let idx = typeof p == "string" ? Number.parseInt(p) : undefined;
        if (Number.isNaN(idx)) {
          idx = undefined;
        }
        if (idx != undefined && 0 <= idx && idx < json.length) {
          if ((elementSchema as any).type == "Object") {
            return projectMutableOverAutomergeDoc(
              json[idx],
              (cb) => updateJson((json2) => cb(json2[p])),
              elementSchema as any,
            );
          } else if ((elementSchema as any).type == "Array") {
            return projectMutableOverAutomergeDocArray(
              json[idx],
              (cb) => updateJson((json2) => cb(json2[p])),
              elementSchema as any,
            );
          }
          let r = loadFromJsonViaTypeSchema(elementSchema as any, json[idx]);
          if (r.type == "Err") {
            return makeDefaultViaTypeSchema(elementSchema as any);
          }
          return r.value;
        }
      }
      return Reflect.get(target, p, receiver);
    },
    set(target, p, newValue, receiver) {
      // console.log("set", target, p, newValue, receiver);
      if (typeof p == "symbol") {
        (target as any)[p] = newValue;
        return true;
      }
      if (p === "length") {
        let length = newValue as number;
        let n = length - json.length;
        if (n > 0) {
          let x = Array(n)
            .fill(undefined)
            .map((_) => makeDefaultViaTypeSchema(elementSchema as any));
          updateJson((json2) => json2.push(...x));
        } else if (n < 0) {
          updateJson((json2) => json2.splice(json.length + n, -n));
        }
        return true;
      }
      if (typeof p == "string") {
        let idx = typeof p == "string" ? Number.parseInt(p) : undefined;
        if (Number.isNaN(idx)) {
          idx = undefined;
        }
        if (idx != undefined) {
          let r = saveToJsonViaTypeSchema(elementSchema as any, newValue);
          updateJson((json2) => (json2[p] = r));
          return true;
        }
      }
      return Reflect.set(target, p, newValue, receiver);
    },
  });
  arrayProxiesMap.set(json, result);
  return result;
}

let objectProxiesMap = new WeakMap<any, any>();
let arrayProxiesMap = new WeakMap<any, any>();
