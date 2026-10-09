import type { Presenter, BeatMode, StructuredPlan } from './structure-types';
import type { ActionVerb } from './action-stage';
import { splitSentences } from '../timing';

export type Cue = { phrase: string; sentence: number };
export const OBJECT_KINDS = ['message', 'agent', 'document', 'package', 'boundary', 'sheet'] as const;
export const OUTCOMES = ['progress', 'complete', 'refused'] as const;
export type DirectionObject = { id: string; label: string; kind: (typeof OBJECT_KINDS)[number]; introduced: Cue; detail: string };
/** `outcome` is optional and authored; without it the renderer reads polarity from the state text. */
export type DirectionEvent = { objectId: string; cue: Cue; mode: BeatMode; state: string; detail: string; action: ActionVerb; from: string | null; outcome?: (typeof OUTCOMES)[number] };
export type DirectionShot = { chapterId: string; cue: Cue; boundary: 'carry' | 'transform' | 'reframe' | 'reset'; composition: 'detail' | 'system' | 'comparison' | 'recap'; objectIds: string[]; focus: string; presenter: Presenter; recapRefs: string[] };
/** `caseObjectId` names the object whose actual state is the worked example's live status chip. */
export type FilmDirection = { version: 1; throughLine: string; objects: DirectionObject[]; events: DirectionEvent[]; shots: DirectionShot[]; caseObjectId?: string };

// Direction cues are exact phrases. A fuzzy match can anchor "the shop's policy"
// to an earlier "the agent" in the same sentence and expose later information.
const alignedPhraseTime = (words: {text:string;start:number}[], phrase:string) => {
  const token=(text:string)=>text.toLowerCase().replace(/[^a-z0-9]/g,'');
  const need=phrase.split(/\s+/).map(token).filter(Boolean);
  const tokens=words.map(w=>({...w,token:token(w.text)})).filter(w=>w.token);
  if(!need.length)return null;
  for(let i=0;i<=tokens.length-need.length;i++)if(need.every((part,j)=>tokens[i+j].token===part))return tokens[i].start;
  return null;
};

/** Sentence scope prevents an earlier repeated phrase from opening a later state. */
export const cueTime = (cue: Cue, words: {text: string; start: number}[], chapters: {beats: {sentenceIndexes: number[]; start: number; end: number; narration?: string}[]}[]) => {
  const beat = chapters.flatMap(c => c.beats).find(b => b.sentenceIndexes.includes(cue.sentence));
  if (!beat) return null;
  const scoped = words.filter(w => w.start >= beat.start - 0.001 && w.start <= beat.end);
  if (!beat.narration) return alignedPhraseTime(scoped,cue.phrase);
  const sentences = splitSentences(beat.narration);
  const index=beat.sentenceIndexes.indexOf(cue.sentence);
  const count=(s:string)=>s.trim().split(/\s+/).length;
  const before=sentences.slice(0,index).reduce((n,s)=>n+count(s),0);
  const length=sentences[index] ? count(sentences[index]) : 0;
  return alignedPhraseTime(scoped.slice(before,before+length),cue.phrase);
};

export const directionFrom = (raw: unknown, plan: Pick<StructuredPlan, 'chapters'>, sentences: string[]): FilmDirection => {
  const d = raw as FilmDirection;
  if (d?.version !== 1 || !d.throughLine || !Array.isArray(d.objects) || !Array.isArray(d.events) || !Array.isArray(d.shots)) throw new Error('Invalid FilmDirection');
  // A cue's sentence is an index. A model sometimes writes the sentence text or
  // a numeric string; both identify exactly one sentence, so normalize them.
  const index = (cue: Cue) => {
    const raw = cue?.sentence as unknown;
    if (typeof raw === 'string') {
      const trimmed = raw.trim();
      const exact = /^\d+$/.test(trimmed) ? Number(trimmed) : sentences.findIndex(s => s.trim() === trimmed);
      if (exact >= 0) cue.sentence = exact;
    }
  };
  d.objects.forEach(o => index(o.introduced));
  d.events.forEach(e => index(e.cue));
  d.shots.forEach(s => index(s.cue));
  const ids = new Set(d.objects.map(o => o.id));
  if (ids.size !== d.objects.length || !ids.size || ids.size > 12) throw new Error('Direction requires 1–12 unique objects');
  if (d.caseObjectId != null && !ids.has(d.caseObjectId)) throw new Error(`caseObjectId ${d.caseObjectId} is not an object`);
  const checkCue = (cue: Cue) => {
    const s = sentences[cue?.sentence];
    const clean = (v: string) => v.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
    if (typeof cue?.sentence !== 'number' || !s) throw new Error(`cue.sentence must be the integer number of a script sentence; got ${JSON.stringify(cue?.sentence)} for phrase "${cue?.phrase}"`);
    if (!cue.phrase || !clean(s).includes(clean(cue.phrase))) throw new Error(`Phrase "${cue?.phrase}" is not an exact contiguous phrase of sentence ${cue.sentence}: "${s}"`);
  };
  d.objects.forEach(o => {checkCue(o.introduced); if (!(OBJECT_KINDS as readonly string[]).includes(o.kind) || o.label.length > 28) throw new Error(`Unsupported object kind/label: ${o.id} ${o.kind} "${o.label}"`);});
  d.events.forEach(e => {checkCue(e.cue); if (!ids.has(e.objectId) || (e.from && !ids.has(e.from)) || !['actual','hypothetical','recap'].includes(e.mode) || !['traverse','return','transform'].includes(e.action) || (e.outcome != null && !(OUTCOMES as readonly string[]).includes(e.outcome))) throw new Error(`Unsupported event: ${e.objectId} "${e.state}"`);});
  for (const chapter of plan.chapters) {
    if (!d.shots.some(s => s.chapterId === chapter.id)) throw new Error(`No direction for ${chapter.id}`);
  }
  d.shots.forEach(s => {
    checkCue(s.cue);
    const chapter = plan.chapters.find(c => c.id === s.chapterId);
    if (!chapter?.sentenceIndexes.includes(s.cue.sentence) || !ids.has(s.focus) || !s.objectIds.includes(s.focus) || s.objectIds.length > 6 || [...s.objectIds,...s.recapRefs].some(id => !ids.has(id)) || !['carry','transform','reframe','reset'].includes(s.boundary) || !['detail','system','comparison','recap'].includes(s.composition) || !['lead','beside','away','address'].includes(s.presenter)) throw new Error(`Unsupported shot channel: ${s.chapterId} "${s.cue.phrase}"`);
    if (s.recapRefs.some(id => !s.objectIds.includes(id))) throw new Error('Recap reference must retrieve a visible object');
  });
  return d;
};

export const directionSystem = `Direct the WHOLE supplied film before chapter stages or beats are finalized. Return FilmDirection JSON with version:1, throughLine:string, objects:[], events:[], shots:[]. Choose a film-specific visual through-line, not a universal metaphor. Stable objects survive chapter boundaries and actual state never resets during a conditional or recap. Use only these implemented renderer channels:
objects: {id,label (max 28 chars),kind:message|agent|document|package|boundary|sheet,introduced:{phrase,sentence},detail (max 70 chars)}. These are designed SVG objects, not cards. Limit to 8 when possible. Each kind draws one fixed picture, so choose the kind whose picture the viewer will read as the referent: message = an envelope (a lead, inquiry, email, text, notification); agent = a small robot (ONLY automated software, an AI worker or bot; never a person, company or customer); document = a paper page (a form, quote, record, offer, contract, plan on paper); package = a box (a product, deliverable, packaged service or offer you sell); boundary = a doorway (an organization, place, inbox, queue or gate that things enter or wait at; a closed door can hold or refuse); sheet is a software window with a table (spreadsheet, CRM record, list, form, schedule): every actual event on a sheet appears as a new typed row, so give a sheet one event per row the viewer should watch appear, and keep those states short and concrete.
events: {objectId,cue:{phrase,sentence},mode:actual|hypothetical|recap,state (max 26 chars),detail (max 70 chars),action:traverse|return|transform,from:objectId|null,outcome?:progress|complete|refused}. Actual events update the persistent ledger. Hypotheticals are transient dashed branches. Recap events never mutate history. An action travels from its referent to this object or visibly transforms it; from must be a different object, or null for a change in place. Route action by its shape. No future result in an initial label/detail. outcome: refused only when an action is actually stopped, blocked, rejected, lost or held; complete when a result is finished; otherwise omit it. A rhetorical negation that defines something by contrast ("not a chatbot", "no rebuild") is not a refusal of the object: state what is true instead.
Every label, state and detail is on-screen text the viewer reads beside the object at phone size. Write detail as a short plain explanation of what the state means for the viewer, never as a stage direction about how the picture looks or moves.
shots: {chapterId,cue:{phrase,sentence},boundary:carry|transform|reframe|reset,composition:detail|system|comparison|recap,objectIds:[],focus:objectId,presenter:lead|beside|away|address,recapRefs:[]}. Every chapter has an entry shot; additional cue-aligned shots may reframe within it. Detail enlarges focus while related objects form context; system pulls back to related objects; comparison separates actual from conditional; recap retrieves earlier object IDs and final states. Max six objects per shot. Retrieve familiar metaphors, do not invent a new metaphor each chapter. Presenter address speaks straight to the viewer (larger, eye contact, sparse stage beside him) for lines addressed directly to the viewer; lead opens/closes, beside supports, away gives teaching canvas to the mechanism. Existing presenter gestures face right toward the stage. Avoid all shots with the same rhythm. ThroughLine is the visible label above the persistent stage; keep it short (8 words).
caseObjectId (optional): the object whose actual state is the worked example's live status, shown in a chip for the whole film once it has a state; choose the object that carries the case's progress, not one that is left behind.
Honor creatorNotes on pacing, opening and presenter use wherever the script supports them. When creatorNotes ask for a visual hook, the first sentence must already perform the narration's tension: cue an event in its first clause, and when the line contrasts two things (not X, but Y) show both as objects rather than one object changing labels. Through any opening the notes ask to front-load, do not hold one object alone on stage for more than one sentence when the narration introduces new things.
All cues copy an EXACT contiguous phrase from the specified numbered sentence. Use sufficiently specific phrases to disambiguate within that sentence. Introduce only narrated facts and objects, preserve negation. Events happen at their aligned phrase, not chapter mount. Later shots must depend on previous objects and states. No coordinates, colours, camera fields without execution, or aspirational metadata. No narration edits.`;
