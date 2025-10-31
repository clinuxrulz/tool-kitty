import { saveToJsonViaTypeSchema, TypeSchema } from "tool-kitty-type-schema";
import { NodesSystem, NodesSystemNode } from "./systems/NodesSystem";

export function convertToTs<TYPE_EXT,INST_EXT>(params: {
  nodesSystem: NodesSystem<TYPE_EXT,INST_EXT>,
}) {
  let { nodesSystem, } = params;
  let nextId = 0;
  let allocVar = () => `x${nextId++}`;
  let nodeOutputPinVarMap = new Map<string,Map<string,string>>();
  let lookupNodeOutPinVar = (params2: { nodeId: string, outPinName: string, }) => {
    return nodeOutputPinVarMap.get(params2.nodeId)?.get(params2.outPinName);
  };
  let setNodeOutPinVar = (params2: { nodeId: string, outPinName: string, varName: string, }) => {
    let outPinVarMap = nodeOutputPinVarMap.get(params2.nodeId);
    if (outPinVarMap == undefined) {
      outPinVarMap = new Map<string,string>();
      nodeOutputPinVarMap.set(params2.nodeId, outPinVarMap);
    }
    outPinVarMap.set(params2.outPinName, params2.varName);
  };
  let stack: NodesSystemNode<TYPE_EXT,INST_EXT>[] = [ ...nodesSystem.nodes(), ];
  let stack2: NodesSystemNode<TYPE_EXT,INST_EXT>[] = [];
  let code: string[] = [];
  while (true) {
    let node = stack.pop();
    if (node == undefined) {
      let tmp = stack;
      stack = stack2;
      stack2 = tmp;
      node = stack.pop();
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
      if (
        lookupNodeOutPinVar({
          nodeId: source.target,
          outPinName: source.pin,
        }) == undefined
      ) {
        allInputsDefined = false;
        break;
      }
    }
    if (!allInputsDefined) {
      stack2.push(node);
      continue;
    }
    let inputs: Record<string,string> = {};
    let allInputKeySet = new Set<string>();
    for (let input of node.node.inputPins?.() ?? []) {
      allInputKeySet.add(input.name);
      let source = input.source();
      if (source == undefined) {
        continue;
      }
      let inputVarName = lookupNodeOutPinVar({
        nodeId: source.target,
        outPinName: source.pin,
      })!;
      inputs[input.name] = inputVarName;
    }
    let outputs: Record<string,string> = {};
    let outputPins = node.node.outputPins?.() ?? [];
    let allOutputKeySet = new Set<string>();
    for (let output of outputPins) {
      allOutputKeySet.add(output.name);
      let varName = allocVar();
      outputs[output.name] = varName;
      setNodeOutPinVar({ nodeId: node.node.nodeParams.entity, outPinName: output.name, varName, });
    }
    let internalState: Record<string, string> = {};
    {
      let typeSchema = node.node.type.componentType.typeSchema;
      if (typeSchema.type == "Object") {
        for (let key of Object.keys(typeSchema.properties)) {
          if (allInputKeySet.has(key) || allOutputKeySet.has(key)) {
            continue;
          }
          let fieldValueTypeSchema = typeSchema.properties[key];
          let fieldValue = saveToJsonViaTypeSchema(fieldValueTypeSchema, node.node.nodeParams.state[key]);
          internalState[key] = JSON.stringify(fieldValue);
        }
      }
    }
    // put the internal state parameters before the pin input parameters
    let assignedInputCount = 0;
    {
      let inputs2: Record<string, string> = {};
      for (let [ key, value, ] of Object.entries(internalState)) {
        inputs2[key] = value;
        ++assignedInputCount;
      }
      for (let [ key, value, ] of Object.entries(inputs)) {
        inputs2[key] = value;
        ++assignedInputCount;
      }
      inputs = inputs2;
    }
    //
    let outputVars: string | undefined;
    if (outputPins.length == 0) {
      outputVars = undefined;
    } else if (outputPins.length == 1) {
      outputVars = Object.values(outputs)[0]!;
    } else {
      outputVars = Object.entries(outputs).map(([ key, varName ]) =>
        `${key}: ${varName}`
      ).join(", ");
    }
    code.push(`${
      outputVars == undefined ? "" :
        `let ${
          outputPins.length > 1 ? "{ " : ""
        }${outputVars != undefined ? outputVars : ""}${
          outputPins.length > 1 ? " }" : ""
        } = `
    }${firstLetterToLowerCase(node.node.type.componentType.typeName)}(${
      assignedInputCount == 0 ?
        "{}" :
        `{ ${
          Object.entries(inputs).map(([ key, varName ]) =>
            `${key}: ${varName}`
          ).join(", ")
        }, }`
    });`);
  }
  return code.join("\r\n");
}

function firstLetterToLowerCase(x: string): string {
  return x.slice(0, 1).toLowerCase() + x.slice(1);
}