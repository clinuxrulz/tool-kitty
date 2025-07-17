import { err, ok, Result } from "control-flow-as-value";
import {
  Accessor,
  createComputed,
  createMemo,
  EffectFunction,
  mapArray,
} from "solid-js";

type ResultOkType<A> = A extends { type: "Ok"; value: infer A2 } ? A2 : never;
type ResultErrType<A> = A extends { type: "Err"; message: infer E } ? E : never;

export class Cont<A> {
  private fn: (k: (a: A) => void) => void;

  private constructor(fn: (k: (a: A) => void) => void) {
    this.fn = fn;
  }

  static of<A>(fn: (k: (a: A) => void) => void): Cont<A> {
    return new Cont(fn);
  }

  static readonly nop: Cont<void> = Cont.of((k) => k());

  /**
   * Lifts a plain value into a Cont.
   * @param a the value to lift into a Cont.
   * @returns `Cont<A>`
   */
  static unit<A>(a: A): Cont<A> {
    return Cont.of((k) => k(a));
  }

  /**
   * Lifts a promise into a Cont.
   * @param a the promise to lift into a Cont
   * @returns `Cont<Result<A,any>>`
   */
  static liftPromise<A>(a: Promise<A>): Cont<Result<A, any>> {
    return Cont.of((k: (a: Result<A, any>) => void) =>
      a.then((b) => k(ok(b))).catch((e) => k(err(e))),
    );
  }

  /**
   * Lowers a Cont into a promise.
   * This method expects its generic type
   * to be a `Result<..>` type.
   * @returns `Promise<ResultOkType<A>>`
   */
  lowerPromise(): Promise<ResultOkType<A>> {
    return new Promise((resolve, reject) =>
      this.run((a) => {
        let a2: Result<ResultOkType<A>, ResultErrType<A>> = a as Result<
          ResultOkType<A>,
          ResultErrType<A>
        >;
        if (a2.type == "Ok") {
          resolve(a2.value);
        } else {
          reject(a2.message);
        }
      }),
    );
  }

  /**
   * Lifts an accessor/memo into a Cont.
   * @param a the accessor/memo to lift into a Cont
   * @returns `Cont<A>`
   */
  static liftAccessor<A>(a: Accessor<A>): Cont<A> {
    return Cont.of((k) => k(a()));
  }

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
  lowerAccessor(initValue?: A): Accessor<A | undefined> {
    let value: A | undefined = initValue;
    return createMemo(() => {
      this.run((a) => (value = a));
      return value;
    });
  }

  /**
   * Creates a computed and lifts it into a Cont.
   * @param fn the callback to use inside the computed, the callback returns what will be passed to the continuation.
   * @returns `Cont<A>`
   */
  static liftCC<A>(fn: EffectFunction<undefined | NoInfer<A>, A>): Cont<A> {
    return Cont.of((k: (a: A) => void) =>
      createComputed(() => {
        k(fn(undefined));
      }),
    );
  }

  /**
   * Creates a computed mapArray and lifts it into a Cont.
   * @param a the accessor of an array to feed to mapArray
   * @returns `Cont<A>`
   */
  static liftCCMA<A>(a: Accessor<A[]>): Cont<A> {
    return Cont.of((k: (a: A) => void) => createComputed(mapArray(a, k)));
  }

  static callCC<A>(fn: (k: (a: A) => Cont<never>) => Cont<A>): Cont<A> {
    return Cont.of((k) => fn((a: A) => Cont.of((_) => k(a))).run(k));
  }

  map<B>(fn: (a: A) => B): Cont<B> {
    return Cont.of((k: (b: B) => void) => this.fn((a) => k(fn(a))));
  }

  filter(cond: (a: A) => boolean): Cont<A> {
    return Cont.of((k) =>
      this.run((a) => {
        if (cond(a)) {
          k(a);
        }
      }),
    );
  }

  filterNonNullable(): Cont<NonNullable<A>> {
    return Cont.of((k: (a: NonNullable<A>) => void) =>
      this.fn((a) => {
        if (a !== undefined && a !== null) {
          k(a);
        }
      }),
    );
  }

  then<B>(fn: (a: A) => Cont<B>): Cont<B> {
    return Cont.of((k) => this.run((a) => fn(a).run(k)));
  }

  run(k?: (a: A) => void) {
    this.fn(k ?? (() => {}));
  }
}

/*
//Example:

let [ value1, setValue1, ] = createSignal(1);
let [ value2, setValue2, ] = createSignal(1);
let [ value3, setValue3, ] = createSignal(1);

function example() {
    Cont
      .liftCC(() => value1() + 5)
      .then((a) => Cont.liftCC(() =>
        a + value2() * 2
      ))
      .then((a) => Cont.liftCC(() =>
        a + value3() - 1
      ))
      .run();
}
*/
