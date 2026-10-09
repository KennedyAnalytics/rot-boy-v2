/**
 * Render-aware inspection. Extracts frames and asks the vision model
 * whether a future state is visible. Calibrated on the known Mara failures.
 *
 *   npx tsx scripts/inspect-render.ts out/prod-builder/film.mp4 out/prod-builder/props.json out/prod-gate/critic-old
 */
import fs from "fs";
import path from "path";
import {createHash} from 'node:crypto';
import { execFileSync } from "child_process";
import { narrationGaps } from "../src/film/hold";
import { loadEnv } from "../server/env";
import {completeVision,visionProviderFromArgs} from '../server/vision';

loadEnv();

const video = path.resolve(process.argv[2] || "out/prod-builder/film.mp4");
const propsPath = path.resolve(process.argv[3] || "out/prod-builder/props.json");
const outDir = path.resolve(process.argv[4] || "out/prod-gate/critic-old");
const manifestPath = process.argv[5]?.startsWith('--') ? undefined : process.argv[5];
const visionProvider=visionProviderFromArgs(process.argv);
const props = JSON.parse(fs.readFileSync(propsPath, "utf8"));
const chapters = props.plan.chapters as {
  name: string;
  start: number;
  end: number;
  beats: { start: number; end: number; mode?: string; state?: string | null; narration: string }[];
}[];

const samples = narrationGaps(chapters).map((gap) => {
  const beats = chapters[gap.chapter].beats;
  const heldState = beats[gap.holdIndex]?.state ?? null;
  return {
    ...gap,
    time: Number(((gap.from + gap.to) / 2).toFixed(3)),
    expect: beats[gap.holdIndex]?.narration ?? "",
    forbidState: beats
      .slice(gap.holdIndex + 1)
      .map((beat) => beat.state)
      .filter((state) => state && state !== heldState)
      .join(", "),
  };
});

const known = [
  { time: 17.8, why: "Trigger gap must not show the chapter's later completed state" },
  { time: 94.6, why: "Tools gap must not show OPEN ACTION or Replacement before that sentence" },
  { time: 128.8, why: "Limits gap must not show IF REFUND during the actual answered beat" },
];

fs.mkdirSync(outDir, { recursive: true });
const input={video,propsPath,videoSha256:createHash('sha256').update(fs.readFileSync(video)).digest('hex'),propsSha256:createHash('sha256').update(fs.readFileSync(propsPath)).digest('hex'),visionProvider};
const inputFile=path.join(outDir,'critic-input.json');
if(fs.existsSync(inputFile) && JSON.stringify(JSON.parse(fs.readFileSync(inputFile,'utf8')))!==JSON.stringify(input))throw new Error('Critic cache belongs to different input/provider; use a new output directory');
fs.writeFileSync(inputFile,JSON.stringify(input,null,2));

const frames: { file: string; time: number; expect: string; forbidState: string; why: string }[] = [];
const targets = manifestPath ? JSON.parse(fs.readFileSync(manifestPath,'utf8')) as {name:string;time:number;expect:string;forbidState:string;why?:string}[] : samples;
if (!targets.length) throw new Error('Tier 3 requires at least one inspection target.');
for (const sample of targets) {
  const file = path.join(outDir, `sample-${sample.name}-${sample.time.toFixed(3).replace(".", "_")}.png`);
  execFileSync("ffmpeg", ["-y", "-ss", String(sample.time), "-i", video, "-frames:v", "1", file], { stdio: "ignore" });
  const knownHit = known.find((item) => Math.abs(item.time - sample.time) < 0.35);
  frames.push({
    file,
    time: sample.time,
    expect: sample.expect,
    forbidState: sample.forbidState,
    why: ('why' in sample ? String(sample.why) : undefined) ?? knownHit?.why ?? "Hold the beat that already finished.",
  });
}

const required=['premature','contradictory','clipped','crowded','collision','rule','referent','repair','notes'];
const schema={type:'object',properties:Object.fromEntries(required.map((key,i)=>[key,{type:i<5?'boolean':'string'}])),required,additionalProperties:false};
const parseReview=(text:string,time:number)=>{
  const start=text.indexOf('{'),end=text.lastIndexOf('}');
  if(start<0||end<=start)throw new Error(`Vision returned no JSON at ${time}`);
  const parsed=JSON.parse(text.slice(start,end+1));
  for(const key of required.slice(0,5))if(typeof parsed[key]!=='boolean')throw new Error(`Vision omitted ${key} at ${time}`);
  return parsed;
};
const look = async (frame: (typeof frames)[number]) => {
  const responseFile=path.join(outDir,`${path.basename(frame.file,'.png')}.response.txt`);
  const requestFile=path.join(outDir,`${path.basename(frame.file,'.png')}.request.json`);
  if(fs.existsSync(responseFile)&&fs.existsSync(requestFile)){
    try{
      const meta=JSON.parse(fs.readFileSync(requestFile,'utf8'));
      if(meta.provider===visionProvider)return {time:frame.time,file:path.basename(frame.file),why:frame.why,provider:meta.provider,model:meta.model,...parseReview(fs.readFileSync(responseFile,'utf8'),frame.time)};
    }catch{fs.copyFileSync(responseFile,`${responseFile}.rejected-${Date.now()}`);}
  }
  const phone=frame.file.replace(/\.png$/,'.phone.png');
  execFileSync('ffmpeg',['-y','-i',frame.file,'-vf','scale=330:-1',phone],{stdio:'ignore'});
  const data = fs.readFileSync(phone).toString("base64");
  const response = await completeVision(
        "You inspect a 330px-wide phone-scale frame of a vertical explainer. Judge only visible visual quality, never deterministic alignment or bounds. Return JSON with premature (only an explicitly forbidden later result is visible), contradictory (two states deny each other, not retained history), clipped (essential label is cropped or truncated), crowded (essential text is squeezed, illegible, or competing in a cramped container), collision (character, caption, or spine covers teaching text), rule (G01-G13), referent (specific object/label), repair (a specific reflow, container, simplification, reveal, or composition change; do not default to smaller type), notes. Actual history can remain visible beside later results. Hypothetical branches must be labeled. Flag meaningful clipping/crowding even when text is technically inside its box.", [
            {
              type: "image",
              source: { type: "base64", media_type: "image/png", data },
            },
            {
              type: "text",
              text: `Time ${frame.time}s. The narration established so far for this moment ends with: "${frame.expect}". States that belong to LATER beats and must not be visible yet: ${frame.forbidState || "none"}. ${frame.why} The established caption engine intentionally displays short aligned phrase chunks. A partial sentence is not clipping unless its glyphs are physically cut off. Do not request caption or persistent-spine redesign. Essential stage labels and state must remain legible.`,
            },
          ], 2000, visionProvider,schema);
  const text = response.text;
  fs.writeFileSync(responseFile,text);
  fs.writeFileSync(requestFile,JSON.stringify({...response,text:undefined},null,2));
  const parsed=parseReview(text,frame.time);
  return { time: frame.time, file: path.basename(frame.file), why: frame.why, provider:response.provider,model:response.model, ...parsed };
};

const findings = [];
try {
  for (let offset=0;offset<frames.length;offset+=3) {
    const batch=frames.slice(offset,offset+3);
    console.log(`inspect ${batch.map(f=>f.time).join(', ')}`);
    const results=await Promise.allSettled(batch.map(look));
    for(const result of results) if(result.status==='fulfilled') findings.push(result.value);
    const error=results.find(r=>r.status==='rejected');
    if(error?.status==='rejected') throw error.reason;
    fs.writeFileSync(path.join(outDir,'critic.json'),JSON.stringify({status:'running',complete:false,frames:frames.length,inspected:findings.length,findings},null,2));
  }
} catch(error) {
  fs.writeFileSync(path.join(outDir,'critic.json'),JSON.stringify({status:'failed',complete:false,frames:frames.length,inspected:findings.length,error:String(error),findings},null,2));
  throw error;
}

const flagged = findings.filter((item) => item.premature || item.contradictory || item.clipped || item.crowded || item.collision);
fs.writeFileSync(path.join(outDir, "critic.json"), JSON.stringify({ status:'complete',complete:true,frames: frames.length,inspected:findings.length,flagged: flagged.length, findings }, null, 2));
console.log(`flagged ${flagged.length} of ${findings.length}`);
