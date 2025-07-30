type Accessor<A> = () => A;
type Setter<A> = (a: A) => void;
type Signal<A> = [ get: Accessor<A>, set: Setter<A>, ];

type NodeState = "Clean" | "Stale" | "Dirty";

class Node {
  state: NodeState;
  sources: Set<Node>;
  sinks: Set<Node>;
  /**
   * The update function.
   * Returns true if the node changed in value.
   */
  update: () => boolean;

  constructor(
    state: NodeState,
    sources: Set<Node>,
    sinks: Set<Node>,
    update: () => boolean,
  ) {
    this.state = state;
    this.sources = sources;
    this.sinks = sinks;
    this.update = update;
  }

  static create(update: () => boolean): Node {
    return new Node(
      "Clean",
      new Set(),
      new Set(),
      update,
    );
  }
}

let observer: ((x: Node) => void) | undefined = undefined;
let cursorSet = new Set<Node>();
let cursors: Node[] = [];
let transactionDepth: number = 0;
let returnStack: Node[] = [];
let cleanStack: Node[] = [];

function transaction<A>(k: () => A): A {
  let result: A;
  try {
    ++transactionDepth;
    result = k();
  } finally {
    --transactionDepth;
  }
  if (transactionDepth == 0) {
    propergate();
  }
  return result;
}

function propergate() {
  while (true) {
    let cursor = cursors.pop();
    if (cursor == undefined) {
      break;
    }
    cursorSet.delete(cursor);
    if (cursor.state == "Clean") {
      continue;
    }
    let hasStaleOrDirtySources = false;
    for (let source of cursor.sources) {
      if (source.state == "Dirty" || source.state == "Stale") {
        if (!cursorSet.has(source)) {
          cursorSet.add(source);
          cursors.push(source);
          hasStaleOrDirtySources = true;
        }
      }
    }
    returnStack.push(cursor);
    // TODO
  }
  while (true) {
    let node = cleanStack.pop();
    if (node == undefined) {
      break;
    }
    node.state = "Stale";
  }
}

function dirtyTheNode(node: Node) {
  transaction(() => {
    node.state = "Dirty";
    if (!cursorSet.has(node)) {
      cursorSet.add(node);
      cursors.push(node);
    }
  });
}

function observeNode(node: Node) {
  if (observer == undefined) {
    return;
  }
  observer(node);
}

export function batch<A>(k: () => A): A {
  return transaction(k);
}

export function createSignal<A>(): Signal<A | undefined>;
export function createSignal<A>(a: A): Signal<A>;
export function createSignal<A>(a?: A): Signal<A> | Signal<A | undefined> {
  if (a == undefined) {
    return createSignal2<A | undefined>(undefined);
  } else {
    return createSignal2<A>(a);
  }
}

function createSignal2<A>(a: A): Signal<A> {
  let value = a;
  let node = Node.create(() => false);
  return [
    () => {
      observeNode(node);
      return value;
    },
    (x) => {
      value = x;
      dirtyTheNode(node);
    },
  ];
}
