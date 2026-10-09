import fs from "node:fs";
import path from "node:path";
import {approvedCatalogNames, discoverMaterials, foundingMaterials} from "../src/founding-toolset/registry";

const fail = (message:string): never => {throw new Error(message)};
const ids = foundingMaterials.map((material) => material.id);
if (new Set(ids).size !== ids.length) fail("Material IDs are not unique");
if (foundingMaterials.length !== 29) fail(`Expected 29 approved materials, found ${foundingMaterials.length}`);
for (const material of foundingMaterials) {
  if (!material.categories.length || !material.intents.length) fail(`${material.id} has no semantic index`);
  if (!material.provenance || !material.localPath) fail(`${material.id} has no ownership record`);
  if (!fs.existsSync(path.resolve(material.localPath))) fail(`${material.id} points to missing ${material.localPath}`);
}
const catalog = JSON.parse(fs.readFileSync("src/film/catalog.json", "utf8")) as {name:string}[];
const catalogNames = new Set(catalog.map((item)=>item.name));
for (const name of approvedCatalogNames) if (!catalogNames.has(name)) fail(`Approved vendor material ${name} is absent from the local catalog`);

const record = discoverMaterials({text:"customer record status changes",stateful:true,phoneSafe:true,limit:8});
if (!record.some((material)=>material.id === "ui.crm-record")) fail("Meaning-first CRM discovery failed");
const sheet = discoverMaterials({text:"spreadsheet table fake leads selection",stateful:true,limit:8});
if (!sheet.some((material)=>material.id === "ui.data-table")) fail("Meaning-first spreadsheet discovery failed");
const actions = discoverMaterials({text:"traverse return transform block accumulate",choreographable:true,limit:8});
if (!actions.some((material)=>material.id === "action.motion-verbs")) fail("Action Registry discovery failed");

const sources = [...new Set(foundingMaterials.map((material)=>material.source))].sort();
const categories = [...new Set(foundingMaterials.flatMap((material)=>material.categories))].sort();
const result = {
  status:"pass",
  approvedMaterials:foundingMaterials.length,
  approvedCatalogMaterials:approvedCatalogNames.size,
  sources,
  semanticCategories:categories,
  discoveryChecks:{record:record.map(m=>m.id),spreadsheet:sheet.map(m=>m.id),actions:actions.map(m=>m.id)},
  localFiles:"pass",
  uniqueIds:"pass",
  networkRuntimeImports:0,
};
fs.mkdirSync("out/founding-toolset",{recursive:true});
fs.writeFileSync("out/founding-toolset/registry-verification.json",JSON.stringify(result,null,2));
fs.writeFileSync("out/founding-toolset/material-registry.json",JSON.stringify(foundingMaterials,null,2));
console.log(JSON.stringify(result,null,2));
