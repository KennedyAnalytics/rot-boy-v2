import type { MaterialDefinition } from "./types";
import { foundingMaterials, materialById } from "./registry";

const p = (path: string) => `src/${path}`;

/**
 * Expansion past the frozen founding set. Each id is a new explanatory
 * grammar, not a reskin of the house glyph. The founding registry stays at
 * its approved count; FilmSpec may reference either set.
 */
export const arsenalMaterials: readonly MaterialDefinition[] = [
  {id:"arsenal.browser-capture",name:"Browser capture frame",source:"arsenal",categories:["browser","capture","container"],intents:["real webpage","public site","browser evidence"],visualRole:"stage",stateful:true,choreographable:true,phoneSafe:true,persistentIdentity:true,inputs:["source id","crop","highlight","url"],animation:"Crop and highlight follow the shot clock",limitations:["Public https sources only; the studio never invents a page"],provenance:"Studio capture contract",localPath:p("film/grammars.tsx")},
  {id:"arsenal.interface-capture",name:"Interface capture frame",source:"arsenal",categories:["browser","capture","app-window"],intents:["software screenshot","dashboard crop","annotated UI"],visualRole:"stage",stateful:true,choreographable:true,phoneSafe:true,persistentIdentity:true,inputs:["source id","crop","highlight"],animation:"Highlight settles on the teaching target",limitations:["Login-walled products are not captured"],provenance:"Studio capture contract",localPath:p("film/grammars.tsx")},
  {id:"arsenal.process-diagram",name:"Process diagram",source:"arsenal",categories:["diagram","workflow"],intents:["causal steps","system map","how a mechanism moves"],visualRole:"stage",stateful:true,choreographable:true,phoneSafe:true,persistentIdentity:true,inputs:["nodes","edges","active id"],animation:"Nodes appear at their cue and the active step marks",limitations:["Six nodes; this is not the house glyph stage"],provenance:"Studio diagram grammar",localPath:p("film/grammars.tsx")},
  {id:"arsenal.numeric-stage",name:"Numeric visualization",source:"arsenal",categories:["chart","metric"],intents:["one narrated number","comparison of magnitudes","count"],visualRole:"stage",stateful:true,choreographable:true,phoneSafe:true,persistentIdentity:false,inputs:["hero","rows"],animation:"Bars reveal with landed states",limitations:["Numbers must be spoken or declared; nothing is estimated"],provenance:"Studio numeric grammar",localPath:p("film/grammars.tsx")},
  {id:"arsenal.document-page",name:"Document page",source:"arsenal",categories:["document","form"],intents:["quote","contract","note","form","pdf"],visualRole:"stage",stateful:true,choreographable:true,phoneSafe:true,persistentIdentity:true,inputs:["title","lines"],animation:"Lines reveal with cues",limitations:["One page; not a scrolling document dump"],provenance:"Studio document grammar",localPath:p("film/grammars.tsx")},
  {id:"arsenal.conversation",name:"Conversation thread",source:"arsenal",categories:["conversation","message"],intents:["text thread","outreach reply","two voices"],visualRole:"stage",stateful:true,choreographable:true,phoneSafe:true,persistentIdentity:true,inputs:["messages"],animation:"Bubbles arrive at cues",limitations:["Four bubbles; inbox list remains a different grammar"],provenance:"Studio conversation grammar",localPath:p("film/grammars.tsx")},
  {id:"arsenal.comparison-split",name:"Comparison split",source:"arsenal",categories:["comparison"],intents:["two outcomes","before and after","actual versus alternative"],visualRole:"stage",stateful:true,choreographable:true,phoneSafe:true,persistentIdentity:true,inputs:["left","right"],animation:"Columns hold; the active side marks",limitations:["Two columns only"],provenance:"Studio comparison grammar",localPath:p("film/grammars.tsx")},
  {id:"arsenal.timeline-rail",name:"Event timeline",source:"arsenal",categories:["timeline","workflow"],intents:["ordered history","process over time","milestones"],visualRole:"stage",stateful:true,choreographable:true,phoneSafe:true,persistentIdentity:true,inputs:["events","active index"],animation:"The rail extends to the current cue",limitations:["Five events; distinct from the horizontal workflow lane"],provenance:"Studio timeline grammar",localPath:p("film/grammars.tsx")},
  {id:"arsenal.map-schematic",name:"Schematic map",source:"arsenal",categories:["map"],intents:["places","territory","where work sits"],visualRole:"stage",stateful:true,choreographable:true,phoneSafe:true,persistentIdentity:true,inputs:["pins"],animation:"Pins appear at cues",limitations:["Schematic pins, not a geographic tile map"],provenance:"Studio map grammar",localPath:p("film/grammars.tsx")},
  {id:"arsenal.device-frame",name:"Device frame",source:"arsenal",categories:["device","container"],intents:["phone","laptop","product in a device"],visualRole:"foundation",stateful:false,choreographable:true,phoneSafe:true,persistentIdentity:false,inputs:["label","inner"],animation:"Host-controlled",limitations:["Frame only; the interior is another grammar or a capture"],provenance:"Studio device grammar",localPath:p("film/grammars.tsx")},
  {id:"arsenal.product-still",name:"Product still",source:"arsenal",categories:["capture","card"],intents:["product photo","packaging","real object"],visualRole:"stage",stateful:false,choreographable:true,phoneSafe:true,persistentIdentity:true,inputs:["source id","label"],animation:"Still framed with one annotation",limitations:["Requires a supplied still; the studio does not invent a product photo"],provenance:"Studio product grammar",localPath:p("film/grammars.tsx")},
  {id:"arsenal.text-treatment",name:"Animated statement",source:"arsenal",categories:["text-treatment"],intents:["one claim","turn","title thought"],visualRole:"stage",stateful:false,choreographable:true,phoneSafe:true,persistentIdentity:false,inputs:["line","support"],animation:"The line settles in over the shot",limitations:["One sentence-scale line; not a caption replacement"],provenance:"Studio text grammar",localPath:p("film/grammars.tsx")},
  {id:"arsenal.mixed-annotation",name:"Capture plus annotation",source:"arsenal",categories:["capture","annotation"],intents:["screenshot with a teaching callout","mixed media"],visualRole:"stage",stateful:true,choreographable:true,phoneSafe:true,persistentIdentity:true,inputs:["source id","callout"],animation:"Callout arrives with the cue",limitations:["The capture stays inside the house frame"],provenance:"Studio mixed grammar",localPath:p("film/grammars.tsx")},
];

const arsenalIds = new Set(arsenalMaterials.map((material) => material.id));
if (arsenalMaterials.some((material) => materialById.has(material.id))) {
  throw new Error("An arsenal id collides with the founding registry.");
}
if (arsenalIds.size !== arsenalMaterials.length) throw new Error("Arsenal ids are not unique.");

export const arsenalById = new Map(arsenalMaterials.map((material) => [material.id, material]));

/** Founding ids plus expansion ids. This is the set FilmSpec may name. */
export const executableMaterials: readonly MaterialDefinition[] = [...foundingMaterials, ...arsenalMaterials];
export const executableMaterialById = new Map(executableMaterials.map((material) => [material.id, material]));

export const executableMaterialIndex = executableMaterials.map((material) => ({
  id: material.id,
  name: material.name,
  intent: material.intents[0] ?? material.name,
}));
