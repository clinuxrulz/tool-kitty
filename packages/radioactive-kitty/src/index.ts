export type Accessor<A> = () => A;
export type Setter<A> = (a: A) => void;
export type Signal<A> = [ get: Accessor<A>, set: Setter<A>, ];

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
      "Stale",
      new Set(),
      new Set(),
      update,
    );
  }
}

let observer: ((x: Node) => void) | undefined = undefined;
let cursorSet = new Set<Node>();
let cursorStack: Node[] = [];
let transactionDepth: number = 0;
let returnSet = new Set<Node>();
let returnStack: Node[] = [];
let cleanSet = new Set<Node>();

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
    let cursor = cursorStack.pop();
    if (cursor == undefined) {
      cursor = returnStack.pop();
      if (cursor == undefined) {
        break;
      }
      returnSet.delete(cursor);
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
          cursorStack.push(source);
          hasStaleOrDirtySources = true;
        }
      }
    }
    if (!hasStaleOrDirtySources) {
      if (cursor.state == "Stale") {
        cursor.state = "Clean";
        continue;
      } else if (cursor.state == "Dirty") {
        for (let source of cursor.sources) {
          source.sinks.delete(cursor);
        }
        cursor.sources.clear();
        let changed: boolean;
        let oldObserver = observer;
        try {
          observer = (node) => {
            node.sinks.add(cursor);
            cursor.sources.add(node);
          };
          changed = cursor.update();
        } finally {
          observer = oldObserver;
        }
        cursor.state = "Clean";
        if (changed) {
          for (let sink of cursor.sinks) {
            sink.state = "Dirty";
            if (!(cursorSet.has(sink) || returnSet.has(sink))) {
              cursorSet.add(sink);
              cursorStack.push(sink);
            }
          }
        }
        continue;
      } else {
        let x: never = cursor.state;
        throw new Error(`Unreachable: ${x}`);
      }
    } else {
      if (!returnSet.has(cursor)) {
        returnSet.add(cursor);
        returnStack.push(cursor);
      }
    }
  }
  for (let node of cleanSet) {
    node.state = "Stale";
  }
  cleanSet.clear();
}

function dirtyTheNode(node: Node) {
  transaction(() => {
    node.state = "Dirty";
    if (!cursorSet.has(node)) {
      cursorSet.add(node);
      cursorStack.push(node);
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

export function createMemo<A>(k: () => A): Accessor<A> {
  let value: A;
  let sources = new Set<Node>();
  let oldObserver = observer;
  observer = (node) => {
    sources.add(node);
  };
  try {
    value = k();
  } finally {
    observer = oldObserver;
  }
  let node = new Node(
    "Stale",
    sources,
    new Set(),
    () => {
      let oldValue = value;
      value = k();
      return value !== oldValue;
    },
  );
  for (let source of sources) {
    source.sinks.add(node);
  }
  return () => {
    observeNode(node);
    return value;
  };
}

export function untrack<A>(k: () => A): A {
  let oldObserver = observer;
  observer = () => {};
  let result: A;
  try {
    result = k();
  } finally {
    observer = oldObserver;
  }
  return result;
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
  let node = Node.create(() => true);
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
