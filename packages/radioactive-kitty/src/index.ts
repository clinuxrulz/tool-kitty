export type Accessor<A> = () => A;
export type Setter<A> = (a: A) => void;
export type Signal<A> = [ get: Accessor<A>, set: Setter<A>, ];

type NodeState = "Clean" | "Stale" | "Dirty";

interface Node {
  state: NodeState;
  eagar: boolean;
  readonly children?: Set<Node>;
  readonly cleanups?: (() => void)[];
  readonly sources?: Set<Node>;
  readonly sinks?: Set<Node>;
  /**
   * The update function.
   * Returns true if the node changed in value.
   */
  readonly update?: () => boolean;
}

let owner: Node | undefined = undefined;
let observer: Node | undefined = undefined;
let cursorSet = new Set<Node>();
let transactionDepth = 0;

function transaction<A>(k: () => A): A {
  ++transactionDepth;
  let result: A;
  try {
    result = k();
  } finally {
    --transactionDepth;
  }
  if (transactionDepth == 0) {
    flush();
  }
  return result;
}

function flush() {
  while (cursorSet.size != 0) {
    let cursors = [...cursorSet];
    cursorSet.clear();
    for (let cursor of cursors) {
      resolveNode(cursor);
    }
  }
}

function useOwner<A>(innerOwner: Node, k: () => A): A {
  let oldOwner = owner;
  owner = innerOwner;
  let result: A;
  try {
    result = k();
  } finally {
    owner = oldOwner;
  }
  return result;
}

function useObserver<A>(innerObserver: Node | undefined, k: () => A): A {
  let oldObserver = observer;
  observer = innerObserver;
  let result: A;
  try {
    result = k();
  } finally {
    observer = oldObserver;
  }
  return result;
}

function useOwnerAndObserver<A>(innerOwnerAndObserver: Node | undefined, k: () => A): A {
  let oldOwner = owner;
  let oldObserver = observer;
  let result: A;
  owner = innerOwnerAndObserver;
  observer = innerOwnerAndObserver;
  try {
    result = k();
  } finally {
    owner = oldOwner;
    observer = oldObserver;
  }
  return result;
}

function dirtyTheSinks(node: Node) {
  if (node.sinks == undefined) {
    return;
  }
  for (let sink of node.sinks) {
    if (sink.state != "Dirty") {
      sink.state = "Dirty";
      if (sink.eagar) {
        cursorSet.add(sink);
      }
      dirtyTheSinks(sink);
    }
  }
}

function resolveNode(node: Node) {
  if (node.state == "Clean") {
    return;
  }
  let dirtyOrStaleSources: Node[] = [];
  if (node.sources != undefined) {
    for (let source of node.sources) {
      if (source.state == "Dirty" || source.state == "Stale") {
        dirtyOrStaleSources.push(source);
      }
    }
  }
  for (let node of dirtyOrStaleSources) {
    resolveNode(node);
  }
  if (node.state == "Stale") {
    node.state = "Clean";
  } else if (node.state == "Dirty") {
    let changed = false;
    if (node.update != undefined) {
      cleanupNode(node);
      changed = node.update();
    }
    node.state = "Clean";
    if (changed) {
      dirtyTheSinks(node);
    }
  }
}

function cleanupNode(node: Node) {
  let stack = [ node, ];
  while (true) {
    let atNode = stack.pop();
    if (atNode == undefined) {
      break;
    }
    if (atNode.sources != undefined) {
      for (let source of atNode.sources) {
        if (source.sinks != undefined) {
          source.sinks.delete(atNode);
        }
      }
      atNode.sources.clear();
    }
    if (atNode.cleanups != undefined) {
      for (let cleanup of atNode.cleanups) {
        cleanup();
      }
      atNode.cleanups.splice(0, atNode.cleanups.length);
    }
    if (atNode.children != undefined) {
      stack.push(...atNode.children);
      atNode.children.clear();
    }
  }
}

export function batch<A>(k: () => A): A {
  return transaction(k);
}

export function createMemo<A>(
  k: () => A,
  options?: {
    equals: (a: A, b: A) => boolean,
  },
): Accessor<A> {
  if (owner == undefined) {
    throw new Error("Creating a memo outside owner is not supported.");
  }
  let equals = options?.equals ?? ((a, b) => a === b);
  let value: A | undefined = undefined;
  let children = new Set<Node>();
  let cleanups: (() => void)[] = [];
  let sources = new Set<Node>();
  let sinks = new Set<Node>();
  let node: Node = {
    state: "Dirty",
    eagar: false,
    children,
    cleanups,
    sources,
    sinks,
    update: () => {
      let oldValue = value;
      value = useOwnerAndObserver(node, k);
      return oldValue == undefined ?
        false :
        equals(value, oldValue);
    },
  };
  owner.children?.add(node);
  return () => {
    if (observer != undefined) {
      observer.sources?.add(node);
      sinks.add(observer);
    }
    resolveNode(node);
    return value!;
  };
}

export function createEffect(k: () => void) {
  if (owner == undefined) {
    throw new Error("Creating an effect outside owner is not supported.");
  }
  let children = new Set<Node>();
  let cleanups: (() => void)[] = [];
  let sources = new Set<Node>();
  let sinks = new Set<Node>();
  let node: Node = {
    state: "Dirty",
    eagar: true,
    children,
    cleanups,
    sources,
    sinks,
    update: () => {
      useOwnerAndObserver(node, k);
      return false;
    },
  };
  owner.children?.add(node);
  transaction(() => cursorSet.add(node));
}

export function onCleanup(k: () => void) {
  if (owner == undefined) {
    throw new Error("Creating a cleanup outside owner is not supported.");
  }
  owner.cleanups?.push(k);
}

export function untrack<A>(k: () => A): A {
  return useObserver(undefined, k);
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
  let sinks = new Set<Node>();
  let node: Node = {
    state: "Clean",
    eagar: true,
    sinks,
  };
  return [
    () => {
      if (observer != undefined) {
        observer.sources?.add(node);
        sinks.add(observer);
      }
      return value;
    },
    (x) => {
      transaction(() => {
        value = x;
        dirtyTheSinks(node);
      });
    },
  ];
}

export function createRoot<A>(k: (dispose: () => void) => A): A {
  let children = new Set<Node>();
  let cleanups: (() => void)[] = [];
  let node: Node = {
    state: "Clean",
    eagar: true,
    children,
    cleanups,
  };
  let dispose = () => cleanupNode(node);
  return useOwner(node, () => k(dispose));
}

export function createHalfEdge<A>(a: Accessor<A>): Accessor<void> {
  if (owner == undefined) {
    throw new Error("Creating a half edge outside owner is not supported.");
  }
  let children = new Set<Node>();
  let cleanups: (() => void)[] = [];
  let sources = new Set<Node>();
  let node: Node = {
    state: "Dirty",
    eagar: true,
    children,
    cleanups,
    sources,
    update: () => {
      useOwnerAndObserver(node, a);
      return false;
    },
  };
  transaction(() => cursorSet.add(node));
  return () => {
    if (observer != undefined) {
      observer.sources?.add(node);
    }
  };
}

export function createSelector<A>(selection: Accessor<A | undefined>): (key: A) => boolean {
  let map = new Map<A,{
    s: Signal<boolean>,
    refCount: number,
  }>();
  let lastSelection: A | undefined = undefined;
  let halfEdge = createHalfEdge(() => {
    let selection2 = selection();
    if (lastSelection != undefined) {
      let entry = map.get(lastSelection);
      if (entry != undefined) {
        entry.s[1](false);
      }
    }
    if (selection2 != undefined) {
      let entry = map.get(selection2);
      if (entry != undefined) {
        entry.s[1](true);
      }
    }
  });
  return (key) => {
    halfEdge();
    let entry = map.get(key);
    if (entry == undefined) {
      entry = {
        s: createSignal(untrack(() => selection() === key)),
        refCount: 1,
      };
      map.set(key, entry);
    } else {
      entry.refCount++;
    }
    onCleanup(() => {
      entry.refCount--;
      if (entry.refCount == 0) {
        queueMicrotask(() => {
          if (entry.refCount == 0) {
            map.delete(key);
          }
        });
      }
    });
    return entry.s[0]();
  };
}
