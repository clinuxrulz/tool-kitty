import { CodeGenCtx, PinValue } from "./CodeGenCtx";
import { NodesSystem, NodesSystemNode } from "tool-kitty-node-editor";
import { NodeExt, NodeTypeExt } from "./NodeExt";
import { Accessor, createMemo } from "solid-js";

export type CodeGenNode = {
  id: number,
  inputs: { [name: string]: { node: CodeGenNode, pin: string, }, },
  outputs: { [name: string]: { node: CodeGenNode, pin: string, }[], },
  height: number,
  node: NodesSystemNode<NodeTypeExt,NodeExt>,
};

export function cloneSubGraph(node: CodeGenNode, recordNewNode: (x: CodeGenNode) => void): CodeGenNode {
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
      id: 0,
      inputs,
      outputs: {},
      height: atNode.height,
      node: atNode.node,
    };
    recordNewNode(newNode);
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

export function generateCode(params: { nodesSystem: NodesSystem<NodeTypeExt,NodeExt>, maxIterations: number, }) {
  let nodesSystem = params.nodesSystem;
  // Duplicate the graph before applying macros
  let codeGenNodes: CodeGenNode[] = [];
  {
    let entityToCodeGenNodeMap = new Map<string,CodeGenNode>();
    for (let node of nodesSystem.nodes()) {
      let codeGenNode: CodeGenNode = {
        id: 0,
        inputs: {},
        outputs: {},
        height: 0,
        node,
      };
      entityToCodeGenNodeMap.set(node.node.nodeParams.entity, codeGenNode);
      codeGenNodes.push(codeGenNode);
    }
    for (let node of entityToCodeGenNodeMap.values()) {
      for (let input of node.node.node.inputPins?.() ?? []) {
        let source = input.source();
        if (source == undefined) {
          continue;
        }
        let target = entityToCodeGenNodeMap.get(source.target);
        if (target == undefined) {
          continue;
        }
        node.inputs[input.name] = { node: target, pin: source.pin, };
      }
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
  /*
  {
    let macroDoneSet = new Set<CodeGenNode>();
    while (true) {
      let macroOccured = false;
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
          if (node2.ext.macro != undefined) {
            node2.ext.macro(
              node,
              (newNode) => codeGenNodes.push(newNode),
            );
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
  */
  // Update heights again, just in case the macros pushed them around
  updateHeights(codeGenNodes);
  // Perform Code Gen
  {
    let nextId = 0;
    for (let node of codeGenNodes) {
      node.id = nextId++;
    }
  }
  let codeGenCtx = new CodeGenCtx();
  /*
  {
    // generate all the init once code
    let visitedNodeTypes = new Set<string>;
    for (let node of nodesSystem.nodes()) {
      let nodeType = node.node.type;
      if (visitedNodeTypes.has(nodeType.componentType.typeName)) {
        continue;
      }
      visitedNodeTypes.add(nodeType.componentType.typeName);
      nodeType.ext.generateInitOnceCode?.({ ctx: codeGenCtx, });
    }
  }
  */
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
  let nodeOutputAtomsMap = new Map<CodeGenNode,Map<string,PinValue>>();
  let onInits: ((params: { gl: WebGLRenderingContext, program: WebGLProgram, rerender: () => void, }) => void)[] = [];
  for (let i = 0; i < queue.length; ++i) {
    let nodes = queue[i] ?? [];
    for (let node of nodes) {
      let node2 = node.node.node;
      let inputAtomsMap = new Map<string,PinValue>();
      for (let input of Object.entries(node.inputs)) {
        let atom = nodeOutputAtomsMap.get(input[1].node)?.get(input[1].pin);
        if (atom != undefined) {
          inputAtomsMap.set(input[0], atom);
        }
      }
      if (node2.ext.generateCode != undefined) {
        let outputAtoms = node2.ext.generateCode({
          ctx: codeGenCtx,
          inputs: inputAtomsMap,
          onInit: (cb) => onInits.push(cb),
        });
        if (outputAtoms != undefined) {
          nodeOutputAtomsMap.set(node, outputAtoms);
        }
      }
    }
  }
  let onInit = (params: { gl: WebGLRenderingContext, program: WebGLProgram, rerender: () => void, }) => {
    for (let onInit2 of onInits) {
      onInit2(params);
    }
  };
  return {
    code: codeGenCtx.genCode({ maxIterations: params.maxIterations, }),
    onInit,
  };
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
    for (let [name, { node: node2, }] of Object.entries(node.inputs)) {
      if (node.node.node.inputPins?.().find((x) => x.name == name)?.isEffectPin ?? false) {
        continue;
      }
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
    for (let [,{ node: node2, pin, }] of Object.entries(node.inputs)) {
      if (node2.node.node.outputPins?.().find(({ name }) => name == pin)?.isEffectPin ?? false) {
        continue;
      }
      if (node2.height >= height) {
        height = node2.height + 1;
      }
    }
    node.height = height;
    doneNodeSet.add(node);
  }
}
