import { NodesSystem, NodesSystemNode } from "./systems/NodesSystem";

export type CodeGenNode = {
  inputs: { [name: string]: { node: CodeGenNode, pin: string, }, },
  outputs: { [name: string]: { node: CodeGenNode, pin: string, }[], },
  height: number,
  node: NodesSystemNode,
};

export function cloneSubGraph(node: CodeGenNode): CodeGenNode {
  let clonedNodesMap = new Map<CodeGenNode,CodeGenNode>();
  let stack = [ node, ];
  while (true) {
    let atNode = stack.pop();
    if (atNode == undefined) {
      break;
    }
    if (clonedNodesMap.has(atNode)) {
      continue;
    }
    let inputs: { [name: string]: { node: CodeGenNode, pin: string, }, } = {};
    for (let entry of Object.entries(atNode.inputs)) {
      inputs[entry[0]] = { ...entry[1], };
    }
    let newNode: CodeGenNode = {
      inputs,
      outputs: {},
      height: atNode.height,
      node: atNode.node,
    };
    clonedNodesMap.set(atNode, newNode);
    for (let outputs of Object.values(atNode.outputs)) {
      for (let output of outputs) {
        stack.push(output.node);
      }
    }
  }
  for (let clonedNode of clonedNodesMap.values()) {
    for (let entry of Object.entries(clonedNode.inputs)) {
      let node2 = clonedNodesMap.get(entry[1].node);
      if (node2 != undefined) {
        entry[1].node = node2;
      }
    }
  }
  for (let clonedNode of clonedNodesMap.values()) {
    for (let [ name, { node, pin } ] of Object.entries(clonedNode.inputs)) {
      let outputs = node.outputs[pin];
      let toAdd = { node: clonedNode, pin: name, };
      if (outputs == undefined) {
        outputs = [ toAdd, ];
        node.outputs[pin] = outputs;
      } else {
        outputs.push(toAdd);
      }
    }
  }
  return clonedNodesMap.get(node)!;
}

export function generateCode(nodesSystem: NodesSystem) {
  // Duplicate the graph before applying macros
  let codeGenNodes: CodeGenNode[] = [];
  {
    let entityToCodeGenNodeMap = new Map<string,CodeGenNode>();
    let stack1 = [ ...nodesSystem.nodes(), ];
    let stack2: NodesSystemNode[] = [];
    while (true) {
      let node = stack1.pop();
      if (node == undefined) {
        let tmp = stack1;
        stack1 = stack2;
        stack2 = tmp;
        node = stack1.pop();
        if (node == undefined) {
          break;
        }
      }
      let allInputsDefined = true;
      for (let input of node.node.inputPins?.() ?? []) {
        let source = input.source();
        if (source == undefined) {
          continue;
        }
        if (nodesSystem.lookupNodeById(source.target) == undefined) {
          continue;
        }
        if (!entityToCodeGenNodeMap.has(source.target)) {
          allInputsDefined = false;
          break;
        }
      }
      if (!allInputsDefined) {
        stack2.push(node);
        continue;
      }
      let inputs: { [name: string]: { node: CodeGenNode, pin: string, }, } = {};
      for (let input of node.node.inputPins?.() ?? []) {
        let source = input.source();
        if (source == undefined) {
          continue;
        }
        if (nodesSystem.lookupNodeById(source.target) == undefined) {
          continue;
        }
        let node = entityToCodeGenNodeMap.get(source.target)!;
        inputs[input.name] = { node, pin: source.pin, };
      }
      let codeGenNode: CodeGenNode = {
        inputs,
        outputs: {},
        height: 0,
        node,
      };
      entityToCodeGenNodeMap.set(node.node.nodeParams.entity, codeGenNode);
      codeGenNodes.push(codeGenNode);
    }
  }
  for (let codeGenNode of codeGenNodes) {
    for (let [ name, { node, pin } ] of Object.entries(codeGenNode.inputs)) {
      let outputs = node.outputs[pin];
      let toAdd = { node: codeGenNode, pin: name, };
      if (outputs == undefined) {
        outputs = [ toAdd, ];
        node.outputs[pin] = outputs;
      } else {
        outputs.push(toAdd);
      }
    }
  }
  //
  let queue: CodeGenNode[][] = [];
  // Apply macros
  {
    let macroOccured = false;
    let macroDoneSet = new Set<CodeGenNode>();
    while (true) {
      updateHeights(codeGenNodes);
      for (let node of codeGenNodes) {
        let entries = queue[node.height];
        if (entries == undefined) {
          entries = [ node, ];
          queue[node.height] = entries;
        } else {
          entries.push(node);
        }
      }
      for (let i = 0; i < queue.length; ++i) {
        let nodes = queue[i] ?? [];
        for (let node of nodes) {
          if (macroDoneSet.has(node)) {
            continue;
          }
          let node2 = node.node.node;
          if (node2.macro != undefined) {
            node2.macro(node);
            macroDoneSet.add(node);
            macroOccured = true;
            break;
          }
        }
        if (macroOccured) {
          break;
        }
      }
      if (!macroOccured) {
        break;
      }
    }
  }
  // Update heights again, just in case the macros pushed them around
  updateHeights(codeGenNodes);
  // Perform Code Gen
  queue.splice(0, queue.length);
  for (let node of codeGenNodes) {
    let entries = queue[node.height];
    if (entries == undefined) {
      entries = [ node, ];
      queue[node.height] = entries;
    } else {
      entries.push(node);
    }
  }
  for (let i = 0; i < queue.length; ++i) {
    let nodes = queue[i] ?? [];
    for (let node of nodes) {
      let node2 = node.node.node;
      // TODO
    }
  }
}

function updateHeights(nodes: CodeGenNode[]) {
  let doneNodeSet = new Set<CodeGenNode>();
  let stack1 = [ ...nodes, ];
  let stack2: CodeGenNode[] = [];
  while (true) {
    let node = stack1.pop();
    if (node == undefined) {
      let tmp = stack1;
      stack1 = stack2;
      stack2 = tmp;
      node = stack1.pop();
      if (node == undefined) {
        break;
      }
    }
    if (doneNodeSet.has(node)) {
      continue;
    }
    let allInputsDone = true;
    for (let [,{ node: node2, }] of Object.entries(node.inputs)) {
      if (!doneNodeSet.has(node2)) {
        allInputsDone = false;
        break;
      }
    }
    if (!allInputsDone) {
      stack2.push(node);
      continue;
    }
    let height = 0;
    for (let [,{ node: node2, }] of Object.entries(node.inputs)) {
      if (node2.height >= height) {
        height = node2.height + 1;
      }
    }
    node.height = height;
    doneNodeSet.add(node);
  }
}
