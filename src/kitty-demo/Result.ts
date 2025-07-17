export type Result<A, E = string> =
  | {
      type: "Ok";
      value: A;
    }
  | {
      type: "Err";
      message: E;
    };

export function ok<A>(value: A): Result<A, never> {
  return { type: "Ok", value };
}

export function err<E>(message: E): Result<never, E> {
  return { type: "Err", message };
}
