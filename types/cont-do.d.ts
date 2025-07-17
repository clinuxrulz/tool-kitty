import { Cont } from './Cont';
/**
 * Do notation for Cont
 */
export declare function do_<A>(fn: () => A): Cont<A>;
/**
 * Adds an instruction to the computation for
 * the Cont do-notation block.
 * @param instr The instruction to add.
 */
export declare function exec(instr: Cont<void>): void;
/**
 * Utility to read a monadic handle to a value
 */
export declare function read<A>(a: Cont<A>, fn: (a: A) => Cont<void>): void;
/**
 * Similiar to `exec` but returns a monadic handle to a result.
 * @param instr The instruction to add that has a result.
 */
export declare function execR<A>(instr: Cont<A>): Cont<A>;
