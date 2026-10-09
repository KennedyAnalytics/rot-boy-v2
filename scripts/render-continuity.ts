import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {bundle} from '@remotion/bundler';
import {renderMedia,renderStill,selectComposition} from '@remotion/renderer';
import {withAlias} from '../remotion.config';
const props=JSON.parse(fs.readFileSync(process.argv[2],'utf8'));
const out=path.resolve(process.argv[3]);
fs.mkdirSync(path.dirname(out),{recursive:true});
if(process.argv.includes('--offline')) throw new Error('Acceptance renders require production fonts. Offline substitution is prohibited.');
// --chunk-frames=N bounds the frame cache on disk: video renders in N-frame
// segments (each cache is released after encoding), audio renders once, and
// ffmpeg stream-copies them together. No re-encode, same encoder settings.
const chunk=Number(process.argv.find(a=>a.startsWith('--chunk-frames='))?.split('=')[1]??0);
// --public-subset bundles only this film's narration plus the shared house
// assets, instead of every job's audio in public/. Same files, same pixels.
let publicDir:string|undefined;
if(process.argv.includes('--public-subset')){
  publicDir=fs.mkdtempSync(path.join(os.tmpdir(),'film-public-'));
  for(const shared of ['character','sfx','illustrations']) if(fs.existsSync(path.join('public',shared))) fs.cpSync(path.join('public',shared),path.join(publicDir,shared),{recursive:true});
  for(const file of [props.audioFile,props.sound?.music].filter(Boolean) as string[]){
    fs.mkdirSync(path.dirname(path.join(publicDir,file)),{recursive:true});
    fs.copyFileSync(path.join('public',file),path.join(publicDir,file));
  }
}
const serveUrl=await bundle({entryPoint:path.resolve('src/index.ts'),webpackOverride:withAlias,...(publicDir?{publicDir}:{})});
const media={codec:'h264' as const,crf:16,concurrency:4,imageFormat:'jpeg' as const,jpegQuality:95,offthreadVideoCacheSizeInBytes:128*1024*1024,offthreadVideoThreads:2};
fs.writeFileSync(path.join(path.dirname(out),'render-environment.json'),JSON.stringify({offlineFonts:false,font:'production Google fonts',narration:'retained aligned recording',imageFormat:'jpeg',jpegQuality:95,crf:16,offthreadVideoCacheBytes:128*1024*1024,chunkFrames:chunk||null},null,2));
const composition=await selectComposition({serveUrl,id:'StructuredFilm',inputProps:props});
let lastProgress=-1;
const progress=(label:string)=>({progress}:{progress:number})=>{const p=Math.floor(progress*100/10)*10;if(p!==lastProgress){lastProgress=p;console.log(`${label}${p}%`);}};
try{
  if(out.endsWith('.png')) await renderStill({serveUrl,composition,inputProps:props,output:out,frame:Number(process.argv[4]??0)});
  else if(!chunk) await renderMedia({serveUrl,composition,inputProps:props,outputLocation:out,...media,onProgress:progress('')});
  else {
    const work=path.join(path.dirname(out),'.chunks');
    fs.mkdirSync(work,{recursive:true});
    const parts:string[]=[];
    for(let from=0;from<composition.durationInFrames;from+=chunk){
      const to=Math.min(composition.durationInFrames-1,from+chunk-1);
      const part=path.join(work,`video-${String(from).padStart(6,'0')}.mp4`);
      lastProgress=-1;
      await renderMedia({serveUrl,composition,inputProps:props,outputLocation:part,...media,muted:true,frameRange:[from,to],onProgress:progress(`frames ${from}-${to} `)});
      parts.push(part);
    }
    const audio=path.join(work,'audio.aac');
    await renderMedia({serveUrl,composition,inputProps:props,outputLocation:audio,codec:'aac'});
    const list=path.join(work,'parts.txt');
    fs.writeFileSync(list,parts.map(p=>`file '${p.replace(/\\/g,'/')}'`).join('\n'));
    execFileSync('ffmpeg',['-hide_banner','-loglevel','error','-y','-f','concat','-safe','0','-i',list,'-i',audio,'-map','0:v','-map','1:a','-c','copy','-movflags','+faststart',out]);
    fs.rmSync(work,{recursive:true,force:true});
  }
  console.log('Rendered',out);
}finally{
  // Each bundle copies public/ (~0.5 GB); leaving one per render exhausts the disk.
  fs.rmSync(serveUrl,{recursive:true,force:true});
  if(publicDir) fs.rmSync(publicDir,{recursive:true,force:true});
}
