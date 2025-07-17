import { Result } from 'control-flow-as-value';
import { Accessor, EffectFunction } from 'solid-js';
type ResultOkType<A> = A extends {
    type: "Ok";
    value: infer A2;
} ? A2 : never;
export declare class Cont<A> {
    private fn;
    private constructor();
    static of<A>(fn: (k: (a: A) => void) => void): Cont<A>;
    static readonly nop: Cont<void>;
    /**
     * Lifts a plain value into a Cont.
     * @param a the value to lift into a Cont.
     * @returns `Cont<A>`
     */
    static unit<A>(a: A): Cont<A>;
    /**
     * Lifts a promise into a Cont.
     * @param a the promise to lift into a Cont
     * @returns `Cont<Result<A,any>>`
     */
    static liftPromise<A>(a: Promise<A>): Cont<Result<A, any>>;
    /**
     * Lowers a Cont into a promise.
     * This method expects its generic type
     * to be a `Result<..>` type.
     * @returns `Promise<ResultOkType<A>>`
     */
    lowerPromise(): Promise<ResultOkType<A>>;
    /**
     * Lifts an accessor/memo into a Cont.
     * @param a the accessor/memo to lift into a Cont
     * @returns `Cont<A>`
     */
    static liftAccessor<A>(a: Accessor<A>): Cont<A>;
    /**
     * Lowers a Cont into an memo.
     * @returns `Accessor<A | undefined>`
     */
    lowerAccessor(): Accessor<A | undefined>;
    /**
     * Lowers a Cont into an memo.
     * @returns `Accessor<A>`
     */
    lowerAccessor(initValue: A): Accessor<A>;
    /**
     * Creates a computed and lifts it into a Cont.
     * @param fn the callback to use inside the computed, the callback returns what will be passed to the continuation.
     * @returns `Cont<A>`
     */
    static liftCC<A>(fn: EffectFunction<undefined | NoInfer<A>, A>): Cont<A>;
    /**
     * Creates a computed mapArray and lifts it into a Cont.
     * @param a the accessor of an array to feed to mapArray
     * @returns `Cont<A>`
     */
    static liftCCMA<A>(a: Accessor<A[]>): Cont<A>;
    static callCC<A>(fn: (k: (a: A) => Cont<never>) => Cont<A>): Cont<A>;
    map<B>(fn: (a: A) => B): Cont<B>;
    filter(cond: (a: A) => boolean): Cont<A>;
    filterNonNullable(): Cont<NonNullable<A>>;
    then<B>(fn: (a: A) => Cont<B>): Cont<B>;
    run(k?: (a: A) => void): void;
}
export {};
