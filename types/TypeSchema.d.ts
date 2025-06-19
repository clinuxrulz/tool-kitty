import { Result } from './kitty-demo/Result';
import { Vec2 } from './math/Vec2';
interface TypeSchemaMaybeUndefined<A> {
    type: "MaybeUndefined";
    element: TypeSchema<A>;
}
interface TypeSchemaMaybeNull<A> {
    type: "MaybeNull";
    element: TypeSchema<A>;
}
interface TypeSchemaBoolean {
    type: "Boolean";
}
interface TypeSchemaNumber {
    type: "Number";
}
interface TypeSchemaString {
    type: "String";
}
interface TypeSchemaUnion<A extends {
    type: string;
    value: unknown;
}> {
    type: "Union";
    parts: {
        [K in A["type"]]: TypeSchema<Extract<A, {
            type: K;
        }>["value"]>;
    };
}
interface TypeSchemaObject<A extends object> {
    type: "Object";
    properties: {
        [K in keyof A]: TypeSchema<A[K]>;
    };
}
interface TypeSchemaArray<A> {
    type: "Array";
    element: TypeSchema<A>;
}
interface TypeSchemaInvariant<A, B> {
    type: "Invariant";
    fromFn: (b: B) => A;
    toFn: (a: A) => B;
    inner: TypeSchema<B>;
}
interface TypeSchemaDefault<A> {
    type: "Default";
    value: A;
    inner: TypeSchema<A>;
}
interface TypeSchemaRecursive<A> {
    type: "Recursive";
    inner: () => TypeSchema<A>;
}
interface TypeSchemaJson {
    type: "Json";
}
export type TypeSchema<A> = TypeSchemaMaybeUndefined<NonNullable<A>> | TypeSchemaMaybeNull<NonNullable<A>> | TypeSchemaBoolean | TypeSchemaNumber | TypeSchemaString | TypeSchemaUnion<Extract<A, {
    type: string;
    value: unknown;
}>> | TypeSchemaObject<Extract<A, object>> | TypeSchemaArray<any> | TypeSchemaInvariant<A, any> | TypeSchemaDefault<A> | TypeSchemaRecursive<A> | TypeSchemaJson;
export type TypeSchemaType<A> = A extends TypeSchemaMaybeUndefined<infer B> ? B | undefined : A extends TypeSchemaMaybeNull<infer B> ? B | null : A extends TypeSchemaBoolean ? boolean : A extends TypeSchemaNumber ? number : A extends TypeSchemaString ? string : A extends TypeSchemaUnion<infer B> ? B : A extends TypeSchemaObject<infer B> ? B : A extends TypeSchemaArray<infer B> ? B[] : A extends TypeSchemaInvariant<infer B, any> ? B : A extends TypeSchemaDefault<A> ? A : A extends TypeSchemaRecursive<A> ? A : A extends TypeSchemaJson ? any : never;
export declare function tsMaybeUndefined<TS>(element: TS): TypeSchemaMaybeUndefined<TypeSchemaType<TS>>;
export declare function tsMaybeNull<TS>(element: TS): TypeSchemaMaybeNull<TypeSchemaType<TS>>;
export declare function tsBoolean(): TypeSchemaBoolean;
export declare function tsNumber(): TypeSchemaNumber;
export declare function tsString(): TypeSchemaString;
export type UnionPart<T extends Record<string, TypeSchema<any>>> = {
    [K in keyof T]: K extends string ? {
        type: K;
        value: TypeSchemaType<T[K]>;
    } : never;
}[keyof T];
export declare function tsUnion<T extends Record<string, TypeSchema<any>>>(parts: T): TypeSchemaUnion<UnionPart<T>>;
export declare function tsObject<T>(properties: T): TypeSchemaObject<{
    [K in keyof T]: TypeSchemaType<T[K]>;
}>;
export declare function tsArray<TS>(element: TS): TypeSchemaArray<TypeSchemaType<TS>>;
export declare function tsInvariant<T, U>(fromFn: (u: U) => T, toFn: (t: T) => U, inner: TypeSchema<U>): TypeSchemaInvariant<T, U>;
export declare function tsDefault<A>(value: A, inner: TypeSchema<A>): TypeSchemaDefault<A>;
export declare function tsRecursive<A>(inner: () => TypeSchema<A>): TypeSchemaRecursive<A>;
export declare function tsJson(): TypeSchemaJson;
export declare const vec2TypeSchema: TypeSchema<Vec2>;
export declare function loadFromJsonViaTypeSchema<A>(typeSchema: TypeSchema<A>, x: any): Result<A>;
export declare function makeDefaultViaTypeSchema<A>(typeSchema: TypeSchema<A>): A;
export declare function saveToJsonViaTypeSchema<A>(typeSchema: TypeSchema<A>, x: A): any;
export declare function equalsViaTypeSchema<A>(typeSchema: TypeSchema<A>, a: A, b: A): boolean;
export declare function createJsonProjectionViaTypeSchemaV2<A>(typeSchema: TypeSchema<A>, json: any, changeJson: (callback: (json: any) => void) => void): Result<A>;
export declare function createJsonProjectionViaTypeSchema<A extends object>(typeSchema: TypeSchema<A>, json: any, changeJson: (callback: (json: any) => void) => void): Result<A>;
export {};
