import { createComputed, on } from "solid-js";
import { err, ok, Result } from "./kitty-demo/Result";
import { Vec2 } from "./math/Vec2";

export interface TypeSchemaMaybeUndefined<A> {
  type: "MaybeUndefined";
  element: TypeSchema<A>;
}

export interface TypeSchemaMaybeNull<A> {
  type: "MaybeNull";
  element: TypeSchema<A>;
}

export interface TypeSchemaBoolean {
  type: "Boolean";
}

export interface TypeSchemaNumber {
  type: "Number";
}

export interface TypeSchemaString {
  type: "String";
}

export interface TypeSchemaUnion<
  A extends { [K in Key]: unknown },
  Key extends string = "type",
> {
  type: "Union";
  selector: Key;
  parts: {
    [P in A[Key] & string]: TypeSchemaObject<
      Extract<A, { [Q in Key]: P }>
    >["properties"];
  };
}

export interface TypeSchemaObject<A extends object> {
  type: "Object";
  properties: {
    [K in keyof A]: TypeSchema<A[K]>;
  };
}

export interface TypeSchemaArray<A> {
  type: "Array";
  element: TypeSchema<A>;
}

export interface TypeSchemaInvarant<A, B> {
  type: "Invarant";
  fromFn: (b: B) => A;
  toFn: (a: A) => B;
  inner: TypeSchema<B>;
}

export interface TypeSchemaDefault<A> {
  type: "Default";
  value: A;
  inner: TypeSchema<A>;
}

export interface TypeSchemaRecursive<A> {
  type: "Recursive";
  inner: () => TypeSchema<A>;
}

export interface TypeSchemaJson {
  type: "Json";
}

export type TypeSchema<A> =
  | TypeSchemaMaybeUndefined<NonNullable<A>>
  | TypeSchemaMaybeNull<NonNullable<A>>
  | TypeSchemaBoolean
  | TypeSchemaNumber
  | TypeSchemaString
  | TypeSchemaUnion<Extract<A, Record<string, unknown>>, any>
  | TypeSchemaObject<Extract<A, object>>
  | TypeSchemaArray<any>
  | TypeSchemaInvarant<A, any>
  | TypeSchemaDefault<A>
  | TypeSchemaRecursive<A>
  | TypeSchemaJson;

export type TypeSchemaType<A> =
  A extends TypeSchemaMaybeUndefined<infer B>
    ? B | undefined
    : A extends TypeSchemaMaybeNull<infer B>
      ? B | null
      : A extends TypeSchemaBoolean
        ? boolean
        : A extends TypeSchemaNumber
          ? number
          : A extends TypeSchemaString
            ? string
            : A extends TypeSchemaUnion<infer B, any>
              ? B
              : A extends TypeSchemaObject<infer B>
                ? B
                : A extends TypeSchemaArray<infer B>
                  ? B[]
                  : A extends TypeSchemaInvarant<infer B, any>
                    ? B
                    : A extends TypeSchemaDefault<A>
                      ? A
                      : A extends TypeSchemaRecursive<A>
                        ? A
                        : A extends TypeSchemaJson
                          ? any
                          : never;

export function tsMaybeUndefined<TS>(
  element: TS,
): TypeSchemaMaybeUndefined<TypeSchemaType<TS>> {
  return {
    type: "MaybeUndefined",
    element: element as any,
  };
}

export function tsMaybeNull<TS>(
  element: TS,
): TypeSchemaMaybeNull<TypeSchemaType<TS>> {
  return {
    type: "MaybeNull",
    element: element as any,
  };
}

export function tsBoolean(): TypeSchemaBoolean {
  return { type: "Boolean" };
}

export function tsNumber(): TypeSchemaNumber {
  return { type: "Number" };
}

export function tsString(): TypeSchemaString {
  return { type: "String" };
}

type InferObjectSchema<T extends Record<string, TypeSchema<any>>> = {
  [K in keyof T]: TypeSchemaType<T[K]>;
};

export type UnionPart<
  T extends Record<string, Record<string, TypeSchema<any>>>,
  Key extends string,
> = {
  [P in keyof T]: P extends string
    ? { [Q in Key]: P } & InferObjectSchema<T[P]>
    : never;
}[keyof T];

export function tsUnion<
  T extends { [K in keyof T]: Record<string, TypeSchema<any>> },
  Key extends string = "type",
>(selector: Key, parts: T): TypeSchemaUnion<UnionPart<T, Key>, Key> {
  return {
    type: "Union",
    selector: selector,
    parts: parts as any,
  };
}

export function tsObject<T>(
  properties: T,
): TypeSchemaObject<{ [K in keyof T]: TypeSchemaType<T[K]> }> {
  return {
    type: "Object",
    properties: properties as unknown as {
      [K in keyof T]: TypeSchema<TypeSchemaType<T[K]>>;
    },
  };
}

export function tsArray<TS>(element: TS): TypeSchemaArray<TypeSchemaType<TS>> {
  return {
    type: "Array",
    element: element as any,
  };
}

export function tsInvarant<T, U>(
  fromFn: (u: U) => T,
  toFn: (t: T) => U,
  inner: TypeSchema<U>,
): TypeSchemaInvarant<T, U> {
  return {
    type: "Invarant",
    fromFn,
    toFn,
    inner,
  };
}

export function tsDefault<A>(
  value: A,
  inner: TypeSchema<A>,
): TypeSchemaDefault<A> {
  return {
    type: "Default",
    value,
    inner,
  };
}

export function tsRecursive<A>(
  inner: () => TypeSchema<A>,
): TypeSchemaRecursive<A> {
  return {
    type: "Recursive",
    inner,
  };
}

export function tsJson(): TypeSchemaJson {
  return {
    type: "Json",
  };
}

let tsUnionExample = tsUnion("type", {
  point: {
    x: tsNumber(),
    y: tsNumber(),
  },
  circle: {
    radius: tsNumber(),
    color: tsString(),
  },
  rectangle: {
    width: tsNumber(),
    height: tsNumber(),
  },
});

type MyUnionShapeType = TypeSchemaType<typeof tsUnionExample>;
/*
MyUnionShapeType will be:
{ type: "point"; x: number; y: number; } |
{ type: "circle"; radius: number; color: string; } |
{ type: "rectangle"; width: number; height: number; }
*/

let tsEventUnion = tsUnion("event", {
  click: {
    targetId: tsString(),
    x: tsNumber(),
    y: tsNumber(),
  },
  keypress: {
    key: tsString(),
    keyCode: tsNumber(),
  },
  scroll: {
    deltaY: tsNumber(),
  },
});

type MyEventType = TypeSchemaType<typeof tsEventUnion>;
/*
MyEventType will be:
{ event: "click"; targetId: string; x: number; y: number; } |
{ event: "keypress"; key: string; keyCode: number; } |
{ event: "scroll"; deltaY: number; }
*/

// Original tsObject example (unrelated to the union simplification, still works)
let tsObjectExample = tsObject({
  name: tsString(),
  age: tsNumber(),
});
type MyObjectType = TypeSchemaType<typeof tsObjectExample>;

let tsInvarantExample = tsInvarant(
  (a: { x: number; y: number }) => ({ x: a.x, y: a.y }),
  (a) => ({ x: a.x, y: a.y }),
  tsObject({
    x: tsNumber(),
    y: tsNumber(),
  }),
);
type MyInvarantType = TypeSchemaType<typeof tsInvarantExample>;

export const vec2TypeSchema = tsInvarant(
  (a) => Vec2.create(a.x, a.y),
  (a) => ({ x: a.x, y: a.y }),
  tsObject({
    x: tsNumber(),
    y: tsNumber(),
  }),
);

export function loadFromJsonViaTypeSchema<A>(
  typeSchema: TypeSchema<A>,
  x: any,
): Result<A> {
  switch (typeSchema.type) {
    case "Boolean": {
      if (typeof x !== "boolean") {
        return err("Expected a boolean.");
      }
      return ok(x) as any;
    }
    case "Number": {
      if (typeof x !== "number") {
        return err("Expected a number.");
      }
      return ok(x) as any;
    }
    case "String": {
      if (typeof x !== "string") {
        return err("Expected a string.");
      }
      return ok(x) as any;
    }
    case "MaybeUndefined": {
      if (x == null) {
        return ok(undefined) as any;
      }
      return loadFromJsonViaTypeSchema(typeSchema.element, x);
    }
    case "MaybeNull": {
      if (x == null) {
        return ok(null) as any;
      }
      return loadFromJsonViaTypeSchema(typeSchema.element, x);
    }
    case "Union": {
      let type = x[typeSchema.selector];
      if (typeof type !== "string") {
        return err("Missing type param for union.");
      }
      let value = { ...x };
      delete value[typeSchema.selector];
      let element = tsObject((typeSchema as any).parts[type]);
      let res = loadFromJsonViaTypeSchema(element, value);
      if (res.type == "Err") {
        return err(`Problem parsing union part ${type}: ${res.message}`);
      }
      let x2 = res.value;
      let result = { ...x2 };
      result[typeSchema.selector] = type;
      return ok(result) as any;
    }
    case "Array": {
      let res: any[] = [];
      for (let x2 of x) {
        let value = loadFromJsonViaTypeSchema(typeSchema.element, x2);
        if (value.type == "Err") {
          return value;
        }
        res.push(value.value);
      }
      return ok(res) as any;
    }
    case "Object": {
      let res: any = {};
      for (let key of Object.keys(typeSchema.properties)) {
        let fieldTypeSchema = (typeSchema as any).properties[key];
        if (!Object.hasOwn(x, key)) {
          res[key] = makeDefaultViaTypeSchema(fieldTypeSchema);
        }
        let value = loadFromJsonViaTypeSchema(
          (typeSchema as any).properties[key],
          x[key],
        );
        if (value.type == "Err") {
          return err(`Problem parsing field ${key}: ${value.message}`);
        }
        res[key] = value.value;
      }
      return ok(res);
    }
    case "Recursive": {
      let typeSchema2 = typeSchema.inner();
      return loadFromJsonViaTypeSchema(typeSchema2, x);
    }
    case "Invarant": {
      let fn1 = typeSchema.fromFn;
      let value = loadFromJsonViaTypeSchema(typeSchema.inner, x);
      if (value.type == "Err") {
        return value;
      }
      return ok(fn1(value.value));
    }
    case "Default": {
      let typeSchema2 = typeSchema.inner;
      let r: Result<A>;
      try {
        r = loadFromJsonViaTypeSchema(typeSchema2, x);
      } catch (e) {
        r = err("" + e);
      }
      if (r.type == "Err") {
        return ok(typeSchema.value);
      }
      return ok(r.value);
    }
    case "Json": {
      return ok(x);
    }
  }
}

export function makeDefaultViaTypeSchema<A>(typeSchema: TypeSchema<A>): A {
  switch (typeSchema.type) {
    case "Boolean": {
      return false as A;
    }
    case "Number": {
      return 0.0 as A;
    }
    case "String": {
      return "" as A;
    }
    case "MaybeUndefined": {
      return undefined as A;
    }
    case "MaybeNull": {
      return null as A;
    }
    case "Union": {
      let type = Object.keys(typeSchema.parts)[0];
      let result = makeDefaultViaTypeSchema(
        tsObject((typeSchema.parts as any)[type]),
      );
      (result as any)[typeSchema.selector] = type;
      return result as A;
    }
    case "Array": {
      return [] as A;
    }
    case "Object": {
      let res: any = {};
      for (let key of Object.keys(typeSchema.properties)) {
        let fieldTypeSchema = (typeSchema as any).properties[key];
        res[key] = makeDefaultViaTypeSchema(fieldTypeSchema);
      }
      return res as A;
    }
    case "Recursive": {
      let typeSchema2 = typeSchema.inner();
      return makeDefaultViaTypeSchema(typeSchema2);
    }
    case "Invarant": {
      let fn1 = typeSchema.fromFn;
      let value = makeDefaultViaTypeSchema(typeSchema.inner);
      return fn1(value as any);
    }
    case "Default": {
      return typeSchema.value;
    }
    case "Json": {
      return null as A;
    }
  }
}

export function saveToJsonViaTypeSchema<A>(
  typeSchema: TypeSchema<A>,
  x: A,
): any {
  switch (typeSchema.type) {
    case "Boolean": {
      return x;
    }
    case "Number": {
      return x;
    }
    case "String": {
      return x;
    }
    case "MaybeUndefined": {
      if (x == undefined) {
        return null;
      }
      return saveToJsonViaTypeSchema(typeSchema.element, x);
    }
    case "MaybeNull": {
      if (x == null) {
        return null;
      }
      return saveToJsonViaTypeSchema(typeSchema.element, x);
    }
    case "Union": {
      let type = (x as any)[typeSchema.selector] as string;
      let value = { ...(x as any) };
      delete value[typeSchema.selector];
      let result = saveToJsonViaTypeSchema(
        tsObject((typeSchema as any).parts[type]),
        value,
      );
      result[typeSchema.selector] = type;
      return result;
    }
    case "Object": {
      let res: any = {};
      for (let key of Object.keys(typeSchema.properties)) {
        res[key] = saveToJsonViaTypeSchema(
          (typeSchema as any).properties[key],
          (x as any)[key],
        );
      }
      return res;
    }
    case "Array": {
      return (x as any).map((x2: any) =>
        saveToJsonViaTypeSchema((typeSchema as any).element, x2),
      );
    }
    case "Recursive": {
      let typeSchema2 = typeSchema.inner();
      return saveToJsonViaTypeSchema(typeSchema2, x);
    }
    case "Invarant": {
      let fn2 = typeSchema.toFn;
      let x2 = fn2(x);
      return saveToJsonViaTypeSchema(typeSchema.inner, x2);
    }
    case "Default": {
      return saveToJsonViaTypeSchema(typeSchema.inner, x);
    }
    case "Json": {
      return x;
    }
  }
}

export function equalsViaTypeSchema<A>(
  typeSchema: TypeSchema<A>,
  a: A,
  b: A,
): boolean {
  // the lazy way for now
  return (
    saveToJsonViaTypeSchema(typeSchema, a) ==
    saveToJsonViaTypeSchema(typeSchema, b)
  );
}

const objProjectionMap = new WeakMap();
const arrProjectionMap = new WeakMap();

export function createJsonProjectionViaTypeSchemaV2<A>(
  typeSchema: TypeSchema<A>,
  json: any,
  changeJson: (callback: (json: any) => void) => void,
): Result<A> {
  if (typeof typeSchema != "object" || typeSchema.type != "Object") {
    return err("Only projections of objects are supported");
  }
  /*{
        let json2 = untrack(json);
        if (objProjectionMap.has(json2)) {
            return ok(objProjectionMap.get(json2)!);
        }
    }*/
  let result: any = {};
  for (let [fieldName, fieldTypeSchema] of Object.entries(
    typeSchema.properties,
  )) {
    let fieldTypeSchema2 = fieldTypeSchema as TypeSchema<any>;
    Object.defineProperty(result, fieldName, {
      get() {
        //
        let field = json?.[fieldName];
        //
        if (typeof fieldTypeSchema == "object") {
          if ((fieldTypeSchema as any).type == "Object") {
            let r = createJsonProjectionViaTypeSchemaV2(
              fieldTypeSchema2 as any,
              field,
              (callback) => changeJson((json2) => callback(json2[fieldName])),
            );
            if (r.type == "Err") {
              throw new Error("Unreachable");
            }
            return r.value;
          }
          if ((fieldTypeSchema as any).type == "Array") {
            let r = createJsonArrayProjectionViaTypeSchemaV2(
              fieldTypeSchema2 as any,
              field,
              (callback) =>
                changeJson((json2) => {
                  callback(json2[fieldName]);
                }),
            );
            if (r.type == "Err") {
              throw new Error("Unreachable");
            }
            return r.value;
          }
        }
        let r = loadFromJsonViaTypeSchema<any>(fieldTypeSchema2, field);
        if (r.type == "Err") {
          return makeDefaultViaTypeSchema(fieldTypeSchema2);
        }
        return r.value;
      },
      set(v) {
        let newValue = saveToJsonViaTypeSchema(fieldTypeSchema2, v);
        if (JSON.stringify(json[fieldName]) == JSON.stringify(newValue)) {
          return;
        }
        changeJson((json2) => (json2[fieldName] = newValue));
      },
    });
  }
  /*
    {
        let json2 = untrack(json);
        objProjectionMap.set(json2, result);
    }*/
  return ok(result as A);
}

function createJsonArrayProjectionViaTypeSchemaV2<A>(
  typeSchema: TypeSchema<A>,
  json: any,
  changeJson: (callback: (json: any) => void) => void,
): Result<A> {
  if (typeof typeSchema != "object" || typeSchema.type != "Array") {
    return err("Expected an array for projection");
  }
  /*
    {
        let json2 = untrack(json);
        if (arrProjectionMap.has(json2)) {
            return ok(arrProjectionMap.get(json2)!);
        }
    }*/
  let elementTypeSchema = typeSchema.element;
  let dummy: any = [];
  let result = new Proxy(dummy, {
    get(target, p, receiver) {
      if (p == "length") {
        dummy.length = json.length;
        return json.length;
      }
      if (typeof p == "string" && !Number.isNaN(Number.parseInt(p))) {
        let idx = Number.parseInt(p);
        //
        let elem = json?.[idx];
        //
        if (typeof elementTypeSchema == "object") {
          if (elementTypeSchema.type == "Object") {
            let r = createJsonProjectionViaTypeSchemaV2(
              elementTypeSchema as any,
              elem,
              (callback) =>
                changeJson((json2) => {
                  callback(json2[idx]);
                }),
            );
            if (r.type == "Err") {
              throw new Error("Unreachable");
            }
            return r.value;
          }
          if (elementTypeSchema.type == "Array") {
            let r = createJsonArrayProjectionViaTypeSchemaV2(
              elementTypeSchema as any,
              elem,
              (callback) =>
                changeJson((json2) => {
                  callback(json2[p]);
                }),
            );
            if (r.type == "Err") {
              throw new Error("Unreachable");
            }
            return r.value;
          }
        }
        let r = loadFromJsonViaTypeSchema(elementTypeSchema, elem);
        if (r.type == "Err") {
          return makeDefaultViaTypeSchema(elementTypeSchema);
        }
        return r.value;
      }
      return Reflect.get(dummy, p, dummy);
    },
    set(target, p, newValue, receiver) {
      if (typeof p == "string" && !Number.isNaN(Number.parseInt(p))) {
        let idx = Number.parseInt(p);
        let newValue2 = saveToJsonViaTypeSchema(
          elementTypeSchema as any,
          newValue,
        );
        if (JSON.stringify(json[idx]) == JSON.stringify(newValue)) {
          return false;
        }
        changeJson((json2) => (json2[idx] = newValue2));
      }
      return Reflect.set(dummy, p, newValue, dummy);
    },
  });
  /*
    {
        let json2 = untrack(json);
        arrProjectionMap.set(json2, result);
    }*/
  return ok(result as A);
}

export function createJsonProjectionViaTypeSchema<A extends object>(
  typeSchema: TypeSchema<A>,
  json: any,
  changeJson: (callback: (json: any) => void) => void,
): Result<A> {
  if (typeof typeSchema != "object") {
    return err("Only projections of objects are supported");
  }
  if (typeSchema.type != "Object") {
    return err("Only projections of objects are supported");
  }
  if (objProjectionMap.has(json)) {
    return ok(objProjectionMap.get(json) as A);
  }
  let target2 = makeDefaultViaTypeSchema(typeSchema);
  let projection = new Proxy(target2, {
    get(_target, p, _receiver) {
      let fieldTypeSchema = (typeSchema.properties as any)[p] as
        | TypeSchema<any>
        | undefined;
      if (fieldTypeSchema == undefined) {
        return (target2 as any)[p];
      }
      if ((fieldTypeSchema as any).type == "Object") {
        let r = createJsonProjectionViaTypeSchema(
          fieldTypeSchema as any,
          json[p],
          (callback) => changeJson((json2) => callback(json2[p])),
        );
        if (r.type == "Ok") {
          return r.value;
        }
      }
      if ((fieldTypeSchema as any).type == "Array") {
        let r = createJsonArrayProjectionViaTypeSchema(
          fieldTypeSchema as any,
          json[p],
          (callback) => changeJson((json2) => callback(json2[p])),
        );
        if (r.type == "Ok") {
          return r.value;
        }
      }
      let x = loadFromJsonViaTypeSchema<any>(fieldTypeSchema, json[p]);
      if (x.type == "Err") {
        return (target2 as any)[p];
      }
      let x2 = x.value;
      let last = (target2 as any)[p];
      if (equalsViaTypeSchema(fieldTypeSchema, last, x2)) {
        return last;
      }
      (target2 as any)[p] = x2;
      return (target2 as any)[p];
    },
    set(target, p, newValue, receiver) {
      (target2 as any)[p] = newValue;
      let fieldTypeSchema = (typeSchema.properties as any)[p] as
        | TypeSchema<any>
        | undefined;
      if (fieldTypeSchema == undefined) {
        return true;
      }
      let x = saveToJsonViaTypeSchema(fieldTypeSchema, newValue);
      changeJson((json2: any) => (json2[p] = x));
      return true;
    },
  }) as A;
  objProjectionMap.set(json, projection);
  return ok(projection);
}

type JsonValue =
  | null
  | boolean
  | number
  | string
  | JsonValue[]
  | { [key: string]: JsonValue };

function createJsonArrayProjectionViaTypeSchema<A>(
  typeSchema: TypeSchema<A>,
  json: any,
  changeJson: (callback: (json: any) => void) => void,
): Result<A> {
  if (typeof typeSchema != "object") {
    return err("expected an array type schema");
  }
  if (typeSchema.type != "Array") {
    return err("expected an array type schema");
  }
  if (arrProjectionMap.has(json)) {
    return ok(arrProjectionMap.get(json)! as A);
  }
  let target2 = makeDefaultViaTypeSchema(typeSchema) as any[];
  createComputed(
    on(
      () => json.length,
      (len) => {
        while (target2.length > len) {
          target2.pop();
        }
        while (target2.length < len) {
          target2.push(makeDefaultViaTypeSchema(typeSchema.element));
        }
      },
    ),
  );
  let elemTypeSchema = typeSchema.element;
  let projection = new Proxy(target2, {
    get(target, p, receiver) {
      if (typeof p !== "symbol" && !Number.isNaN(Number.parseInt(p))) {
        if ((elemTypeSchema as any).type == "Object") {
          let r = createJsonProjectionViaTypeSchema(
            elemTypeSchema as any,
            json[p],
            (callback) => changeJson((json2) => callback(json2[p])),
          );
          if (r.type == "Ok") {
            return r.value;
          }
        }
        if ((elemTypeSchema as any).type == "Array") {
          let r = createJsonArrayProjectionViaTypeSchema(
            elemTypeSchema as any,
            json[p],
            (callback) => changeJson((json2) => callback(json2[p])),
          );
          if (r.type == "Ok") {
            return r.value;
          }
        }
        let x = loadFromJsonViaTypeSchema<any>(elemTypeSchema as any, json[p]);
        if (x.type == "Err") {
          return (target2 as any)[p];
        }
        let x2 = x.value;
        let last = (target2 as any)[p];
        if (equalsViaTypeSchema(elemTypeSchema as any, last, x2)) {
          return last;
        }
        (target2 as any)[p] = x2;
        return (target2 as any)[p];
      }
      return Reflect.get(target, p, receiver);
    },
    set(target, p, newValue, receiver) {
      if (typeof p !== "symbol" && !Number.isNaN(Number.parseInt(p))) {
        (target2 as any)[p] = newValue;
        let x = saveToJsonViaTypeSchema(elemTypeSchema as any, newValue);
        changeJson((json2: any) => (json2[p] = x));
        return true;
      }
      return Reflect.set(target, p, newValue, receiver);
    },
  }) as A;
  arrProjectionMap.set(json, projection);
  return ok(projection);
}
