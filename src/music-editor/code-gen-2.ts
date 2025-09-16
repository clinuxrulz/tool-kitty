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
  // Apply Macros
  // TODO
  // Perform Code Gen
  // TODO
}
