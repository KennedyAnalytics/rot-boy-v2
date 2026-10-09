import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import {execFileSync} from "node:child_process";
import {bundle} from "@remotion/bundler";
import {renderMedia, renderStill, selectComposition} from "@remotion/renderer";
import {withAlias} from "../remotion.config";
import {GALLERY_PAGE_FRAMES, GALLERY_PAGES} from "../src/founding-toolset/gallery";

const output = path.resolve("out/founding-toolset");
fs.mkdirSync(output,{recursive:true});
const serveUrl = await bundle({entryPoint:path.resolve("src/index.ts"),webpackOverride:withAlias});
const composition = await selectComposition({serveUrl,id:"FoundingToolsetGallery"});
const frames = Array.from({length:GALLERY_PAGES},(_,index)=>index*GALLERY_PAGE_FRAMES+54);
const sha = (file:string)=>crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
try {
  for (let index=0;index<frames.length;index++) {
    const file=path.join(output,`gallery-${index+1}.png`);
    await renderStill({serveUrl,composition,output:file,frame:frames[index],imageFormat:"png"});
    console.log(`Rendered ${path.relative(process.cwd(),file)}`);
  }
  const repeat=path.join(output,".determinism-repeat.png");
  await renderStill({serveUrl,composition,output:repeat,frame:frames[1],imageFormat:"png"});
  const first=path.join(output,"gallery-2.png");
  const deterministic=sha(first)===sha(repeat);
  fs.rmSync(repeat,{force:true});
  if(!deterministic) throw new Error("Same-frame gallery render was not byte deterministic");

  const video=path.join(output,"founding-toolset-gallery.mp4");
  let lastProgress=-1;
  await renderMedia({serveUrl,composition,outputLocation:video,codec:"h264",crf:18,imageFormat:"jpeg",jpegQuality:95,concurrency:4,onProgress:({progress})=>{const value=Math.floor(progress*5)*20;if(value!==lastProgress){lastProgress=value;console.log(`Video ${value}%`);}}});

  const inputs=frames.flatMap((_,index)=>["-i",path.join(output,`gallery-${index+1}.png`)]);
  const scales=frames.map((_,index)=>`[${index}:v]scale=330:586:force_original_aspect_ratio=decrease,pad=330:586:(ow-iw)/2:(oh-ih)/2:color=#F3F0E6[v${index}]`).join(";");
  const layout="0_0|330_0|0_586|330_586|0_1172|330_1172";
  execFileSync("ffmpeg",["-hide_banner","-loglevel","error","-y",...inputs,"-filter_complex",`${scales};[v0][v1][v2][v3][v4][v5]xstack=inputs=6:layout=${layout}:fill=#F3F0E6[out]`,"-map","[out]",path.join(output,"phone-contact-sheet.png")]);
  const evidence={status:"pass",composition:{id:composition.id,width:composition.width,height:composition.height,fps:composition.fps,durationInFrames:composition.durationInFrames},frames,determinism:{frame:frames[1],samePngSha256:deterministic,sha256:sha(first)},video:{path:"founding-toolset-gallery.mp4",bytes:fs.statSync(video).size},phoneContactSheet:{path:"phone-contact-sheet.png",cellWidth:330,cellHeight:586},runtimeAssets:"local repository assets only; production fonts loaded through the existing approved Remotion Google Fonts integration"};
  fs.writeFileSync(path.join(output,"render-verification.json"),JSON.stringify(evidence,null,2));
  console.log(JSON.stringify(evidence,null,2));
} finally {
  fs.rmSync(serveUrl,{recursive:true,force:true});
}
