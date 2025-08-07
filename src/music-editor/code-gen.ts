import { CodeGenCtx } from "./CodeGenCtx";
import { NodesSystem } from "./systems/NodesSystem";

export function generateCode(params: {
  nodesSystem: NodesSystem,
}): string {
  let nodesSystem = params.nodesSystem;
  let entityIdOutputAtomsMap = new Map<
    string,
    {
      outputAtoms: Map<string,string>,
    }[]
  >();
  let codeGenCtx = new CodeGenCtx();
  let stack1 = [ ...nodesSystem.nodes(), ];
  let stack2: typeof stack1 = [];
  while (true) {
    let at = stack1.pop();
    if (at == undefined) {
      let tmp = stack1;
      stack1 = stack2;
      stack2 = tmp;
      at = stack1.pop();
      if (at == undefined) {
        break;
      }
    }
    if (entityIdOutputAtomsMap.has(at.node.nodeParams.entity)) {
      continue;
    }
    let hasStaleChildren = false;
    for (let source of at.node.inputPins?.() ?? []) {
      let source2 = source.source()?.target;
      if (source2 == undefined) {
        continue;
      }
      if (!entityIdOutputAtomsMap.has(source2)) {
        let node = nodesSystem.lookupNodeById(source2);
        if (node != undefined) {
          stack1.push(node);
          hasStaleChildren = true;
        }
      }
    }
    if (hasStaleChildren) {
      stack2.push(at);
    } else {
      let sourceEntityPinInputMap = new Map<string,Map<string,string[]>>();
      for (let source of at.node.inputPins?.() ?? []) {
        let source2 = source.source();
        if (source2 != undefined) {
          let sourceEntity = source2.target;
          let pinInputMap: Map<string,string[]>;
          if (sourceEntityPinInputMap.has(sourceEntity)) {
            pinInputMap = sourceEntityPinInputMap.get(sourceEntity)!;
          } else {
            pinInputMap = new Map<string,string[]>();
            sourceEntityPinInputMap.set(sourceEntity, pinInputMap);
          }
          let outputAtoms = entityIdOutputAtomsMap.get(source2.target) ?? [];
          pinInputMap.set(
            source.name,
            outputAtoms.flatMap((outputAtoms2) => {
              let x = outputAtoms2.outputAtoms.get(source2.pin);
              if (x == undefined) {
                return [];
              }
              return [x];
            })
          );
        }
      }
      let comboGroups: { inputs: { [ name: string ]: string[] }, idx: number, len: number, }[] = [];
      for (let entry of sourceEntityPinInputMap.values()) {
        let comboGroup: { [ name: string ]: string[] } = {};
        for (let entry2 of entry.entries()) {
          comboGroup[entry2[0]] = entry2[1];
        }
        comboGroups.push({ inputs: comboGroup, idx: 0, len: entry.values().next().value!.length, });
      }
      let manyWorldsOutputAtoms: {
        outputAtoms: Map<string,string>,
      }[] = [];
      let doneAll = false;
      while (true) {
        //
        let inputAtoms = new Map<string,string>();
        for (let comboGroup of comboGroups) {
          for (let entry of Object.entries(comboGroup.inputs)) {
            inputAtoms.set(entry[0], entry[1][comboGroup.idx]);
          }
        }
        if (at.node.generateCode != undefined) {
          manyWorldsOutputAtoms.push(...at.node.generateCode({
            ctx: codeGenCtx,
            inputAtoms,
          }));
        }
        // increments comboGroupCounters
        {
          let atI = 0;
          while (true) {
            if (atI >= comboGroups.length) {
              doneAll = true;
              break;
            }
            comboGroups[atI].idx++;
            if (comboGroups[atI].idx >= comboGroups[atI].len) {
              comboGroups[atI].idx = 0;
              atI++;
            } else {
              break;
            }
          }
          if (doneAll) {
            break;
          }
        }
      }
      entityIdOutputAtomsMap.set(
        at.node.nodeParams.entity,
        manyWorldsOutputAtoms,
      );
    }
  }
  return codeGenCtx.code;
}
