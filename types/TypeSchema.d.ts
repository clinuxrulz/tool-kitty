import { Result } from './kitty-demo/Result';
import { Vec2 } from './math/Vec2';
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
export interface TypeSchemaUnion<A extends {
    [K in Key]: unknown;
}, Key extends string = "type"> {
    type: "Union";
    selector: Key;
    parts: {
        [P in A[Key] & string]: TypeSchemaObject<Extract<A, {
            [Q in Key]: P;
        }>>["properties"];
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
export type TypeSchema<A> = TypeSchemaMaybeUndefined<NonNullable<A>> | TypeSchemaMaybeNull<NonNullable<A>> | TypeSchemaBoolean | TypeSchemaNumber | TypeSchemaString | TypeSchemaUnion<Extract<A, Record<string, unknown>>, any> | TypeSchemaObject<Extract<A, object>> | TypeSchemaArray<any> | TypeSchemaInvarant<A, any> | TypeSchemaDefault<A> | TypeSchemaRecursive<A> | TypeSchemaJson;
export type TypeSchemaType<A> = A extends TypeSchemaMaybeUndefined<infer B> ? B | undefined : A extends TypeSchemaMaybeNull<infer B> ? B | null : A extends TypeSchemaBoolean ? boolean : A extends TypeSchemaNumber ? number : A extends TypeSchemaString ? string : A extends TypeSchemaUnion<infer B, any> ? B : A extends TypeSchemaObject<infer B> ? B : A extends TypeSchemaArray<infer B> ? B[] : A extends TypeSchemaInvarant<infer B, any> ? B : A extends TypeSchemaDefault<A> ? A : A extends TypeSchemaRecursive<A> ? A : A extends TypeSchemaJson ? any : never;
export declare function tsMaybeUndefined<TS>(element: TS): TypeSchemaMaybeUndefined<TypeSchemaType<TS>>;
export declare function tsMaybeNull<TS>(element: TS): TypeSchemaMaybeNull<TypeSchemaType<TS>>;
export declare function tsBoolean(): TypeSchemaBoolean;
export declare function tsNumber(): TypeSchemaNumber;
export declare function tsString(): TypeSchemaString;
type InferObjectSchema<T extends Record<string, TypeSchema<any>>> = {
    [K in keyof T]: TypeSchemaType<T[K]>;
};
export type UnionPart<T extends Record<string, Record<string, TypeSchema<any>>>, Key extends string> = {
    [P in keyof T]: P extends string ? {
        [Q in Key]: P;
    } & InferObjectSchema<T[P]> : never;
}[keyof T];
export declare function tsUnion<T extends {
    [K in keyof T]: Record<string, TypeSchema<any>>;
}, Key extends string = "type">(selector: Key, parts: T): TypeSchemaUnion<UnionPart<T, Key>, Key>;
export declare function tsObject<T>(properties: T): TypeSchemaObject<{
    [K in keyof T]: TypeSchemaType<T[K]>;
}>;
export declare function tsArray<TS>(element: TS): TypeSchemaArray<TypeSchemaType<TS>>;
export declare function tsInvarant<T, U>(fromFn: (u: U) => T, toFn: (t: T) => U, inner: TypeSchema<U>): TypeSchemaInvarant<T, U>;
export declare function tsDefault<A>(value: A, inner: TypeSchema<A>): TypeSchemaDefault<A>;
export declare function tsRecursive<A>(inner: () => TypeSchema<A>): TypeSchemaRecursive<A>;
export declare function tsJson(): TypeSchemaJson;
export declare const vec2TypeSchema: TypeSchemaInvarant<Vec2, {
    x: number;
    y: number;
}>;
export declare function loadFromJsonViaTypeSchema<A>(typeSchema: TypeSchema<A>, x: any): Result<A>;
export declare function makeDefaultViaTypeSchema<A>(typeSchema: TypeSchema<A>): A;
export declare function saveToJsonViaTypeSchema<A>(typeSchema: TypeSchema<A>, x: A): any;
export declare function equalsViaTypeSchema<A>(typeSchema: TypeSchema<A>, a: A, b: A): boolean;
export declare function createJsonProjectionViaTypeSchemaV2<A>(typeSchema: TypeSchema<A>, json: any, changeJson: (callback: (json: any) => void) => void): Result<A>;
export declare function createJsonProjectionViaTypeSchema<A extends object>(typeSchema: TypeSchema<A>, json: any, changeJson: (callback: (json: any) => void) => void): Result<A>;
export {};
