export function opToArr<A>(x: A | undefined): A[] {
  if (x == undefined) {
    return [];
  }
  return [x];
}
