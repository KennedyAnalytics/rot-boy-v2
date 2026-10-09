"""Extract evidence from actual production MP4s; never renders substitutes."""
import json, pathlib, subprocess, sys, math, hashlib
from PIL import Image, ImageDraw, ImageFont

candidate = pathlib.Path(sys.argv[1])
baseline = pathlib.Path(sys.argv[2])
out = candidate.parent / 'evidence'
out.mkdir(parents=True, exist_ok=True)
props = json.loads((candidate.parent / 'props.json').read_text(encoding='utf-8'))
audit = json.loads((candidate.parent / 'continuity-audit.json').read_text(encoding='utf-8'))
duration = props['plan']['durationSec']
times = [11, 17.8, 33.8, 47, 59.5, 70, 72.3, 83, 85, 90, 94.6, 96, 100.5, 110, 125, 128.8, 133, 141, 150, 158, 173]
if 'frameByFrame' in audit:
    times = [17.8, 32, 49.535, 57, 70, 70.3, 75, 76, 77, 78, 79, 80, 81.8667, 81.9667, 88, 90.6333, 90.7333, 98, 106, 116, 122, 134, 145, 160, 175]
else:
    for s in audit.get('alignedDirection', {}).get('shots', []):
        if s['at'] is not None:
            times += [max(0, s['at']-1/30), s['at']+0.4, s['at']+0.75, s['at']+1.05]
    for e in audit.get('alignedDirection', {}).get('events', []):
        if e['at'] is not None and e['action'] in ('traverse', 'return'):
            times += [max(0, e['at']-1/30), e['at']+0.4, e['at']+1.05]
times = sorted(set(round(t*30)/30 for t in times if 0 <= t < duration))

def extract(video, time, target):
    subprocess.run(['ffmpeg','-hide_banner','-loglevel','error','-y','-ss',str(time),'-i',str(video),'-frames:v','1','-vf','scale=330:-1',str(target)],check=True)

font = ImageFont.truetype('C:/Windows/Fonts/arial.ttf', 18)
targets = []
for i,t in enumerate(times):
    for kind,video in [('before',baseline),('after',candidate)]:
        extract(video,t,out/f'{kind}-{i:03d}-{t:.3f}.png')
    heard = ' '.join(w['text'] for w in props['words'] if w['start'] <= t)
    d = audit.get('alignedDirection', {})
    established = [e['state'] for e in d.get('events', []) if e['at'] <= t]
    future = [e['state'] for e in d.get('events', []) if e['at'] > t and e['mode']=='actual' and e['state'] not in established]
    targets.append({'name':f'frame-{i:03d}','time':t,'expect':heard[-1300:], 'forbidState':', '.join(dict.fromkeys(future)), 'why':'Inspect essential phone-scale labels, teaching hierarchy, stage/presenter collisions and visible state. Retained actual history is legitimate; conditional branches must be explicit.'})

for start in range(0,len(times),6):
    batch=times[start:start+6]
    sheet=Image.new('RGB',(660,len(batch)*619),'#f3f0e6')
    draw=ImageDraw.Draw(sheet)
    for row,t in enumerate(batch):
        i=start+row
        for col,kind in enumerate(['before','after']):
            im=Image.open(out/f'{kind}-{i:03d}-{t:.3f}.png')
            sheet.paste(im,(col*330,row*619+32))
            draw.text((col*330+8,row*619+6),f'{kind.upper()}  {t:.3f}s',font=font,fill='#1c212b')
    sheet.save(out/f'comparison-{start//6+1:02d}.png')

(out/'inspection-targets.json').write_text(json.dumps(targets,indent=2),encoding='utf-8')
(out/'manifest.json').write_text(json.dumps({'candidate':str(candidate.resolve()),'baseline':str(baseline.resolve()),'phoneWidth':330,'times':times,'comparisonSheets':math.ceil(len(times)/6),'candidateSha256':hashlib.sha256(candidate.read_bytes()).hexdigest(),'baselineSha256':hashlib.sha256(baseline.read_bytes()).hexdigest()},indent=2),encoding='utf-8')

if 'frameByFrame' in audit:
    dense=out/'frames-75-80'
    dense.mkdir(exist_ok=True)
    subprocess.run(['ffmpeg','-hide_banner','-loglevel','error','-y','-ss','75','-i',str(candidate),'-frames:v','151','-vf','scale=330:-1',str(dense/'frame-%03d.png')],check=True)
    files=sorted(dense.glob('frame-*.png'))
    assert len(files)==151
    # Preserve all full phone frames; sheets are grouped, not temporal downsampling.
    for start in range(0,len(files),25):
        batch=files[start:start+25]
        sheet=Image.new('RGB',(1650,math.ceil(len(batch)/5)*619),'#f3f0e6')
        draw=ImageDraw.Draw(sheet)
        for n,f in enumerate(batch):
            col,row=n%5,n//5
            sheet.paste(Image.open(f),(col*330,row*619+32))
            draw.text((col*330+8,row*619+6),f'frame {2250+start+n}  {75+(start+n)/30:.3f}s',font=font,fill='#1c212b')
        sheet.save(out/f'frame-by-frame-{start//25+1:02d}.png')
    for kind,video in [('before',baseline),('after',candidate)]:
        subprocess.run(['ffmpeg','-hide_banner','-loglevel','error','-y','-ss','74.5','-i',str(video),'-t','23','-vf','scale=330:-2','-c:v','libx264','-crf','18','-c:a','aac',str(out/f'apply-{kind}.mp4')],check=True)
else:
    for name,start,length in [('tools-action',82,17),('context-boundary',50,12),('limits-branch',123,17),('recap',147,min(24,duration-147))]:
        for kind,video in [('before',baseline),('after',candidate)]:
            subprocess.run(['ffmpeg','-hide_banner','-loglevel','error','-y','-ss',str(start),'-i',str(video),'-t',str(length),'-vf','scale=330:-2','-c:v','libx264','-crf','18','-c:a','aac',str(out/f'{name}-{kind}.mp4')],check=True)
print(f'Extracted {len(times)} before/after samples at 330px and moving-sequence evidence to {out}')
