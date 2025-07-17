import { Cont } from "./Cont";

let doContext: Cont<void> | undefined = undefined;

/**
 * Do notation for Cont
 */
export function do_<A>(fn: () => A): Cont<A> {
  let outer = doContext;
  try {
    doContext = undefined;
    let result = fn();
    if (doContext == undefined) {
      return Cont.unit(result);
    } else {
      let doContent2 = doContext as Cont<void>;
      return doContent2.map((_) => result);
    }
  } finally {
    doContext = outer;
  }
}

/**
 * Adds an instruction to the computation for
 * the Cont do-notation block.
 * @param instr The instruction to add.
 */
export function exec(instr: Cont<void>): void {
  if (doContext == undefined) {
    doContext = instr;
  } else {
    doContext = doContext.then((_) => instr);
  }
}

/**
 * Utility to read a monadic handle to a value
 */
export function read<A>(a: Cont<A>, fn: (a: A) => Cont<void>): void {
  exec(a.then(fn));
}

/**
 * Similiar to `exec` but returns a monadic handle to a result.
 * @param instr The instruction to add that has a result.
 */
export function execR<A>(instr: Cont<A>): Cont<A> {
  let buffer: A[] = [];
  exec(
    instr.then((a: A) =>
      Cont.of((k) => {
        buffer.push(a);
        k();
      }),
    ),
  );
  return Cont.of((k) => {
    for (let a of buffer) {
      k(a);
    }
    buffer = [];
  });
}
