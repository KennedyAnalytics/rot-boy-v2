"""Verify the decoded stage stays fixed before the real assignment cue."""
import json, pathlib, sys
from PIL import Image, ImageChops, ImageStat

folder=pathlib.Path(sys.argv[1])
frames=sorted((folder/'frames-75-80').glob('frame-*.png'))
assert len(frames)==151, 'All 151 decoded frames are required'
region=(0,110,330,450)  # Stage only: excludes the preserved spine and changing captions.
reference=Image.open(frames[0]).convert('RGB').crop(region)
area=reference.width*reference.height
measurements=[]
def difference(image):
    delta=ImageChops.difference(reference,image.convert('RGB').crop(region))
    threshold=delta.convert('L').point(lambda v:255 if v>12 else 0)
    return {'changedFractionAbove12':threshold.histogram()[255]/area,'meanAbsoluteDifference':sum(ImageStat.Stat(delta).mean)/3}
for index,file in enumerate(frames):
    measurements.append({'frame':2250+index,'time':75+index/30,**difference(Image.open(file))})
maximum=max(m['changedFractionAbove12'] for m in measurements)
assert maximum<0.002, f'Unexpected stage motion before the cue: changed fraction {maximum}'
manifest=json.loads((folder/'manifest.json').read_text(encoding='utf-8'))
afterIndex=min(range(len(manifest['times'])),key=lambda i:abs(manifest['times'][i]-81.9667))
time=manifest['times'][afterIndex]
after=Image.open(folder/f'after-{afterIndex:03d}-{time:.3f}.png')
changed=difference(after)
assert changed['changedFractionAbove12']>0.005, 'The aligned assignment must cause a visible stage change'
report={'ok':True,'frames':151,'range':[75,80],'phoneWidth':330,'region':region,'compressionTolerance':'changed luminance >12 at less than 0.2% of stage pixels before cue','maximumChangedFraction':maximum,'afterCueTime':time,'afterCueChange':changed,'measurements':measurements}
(folder/'frame-by-frame-render-check.json').write_text(json.dumps(report,indent=2),encoding='utf-8')
print(f'151 decoded frames hold before cue; max changed fraction {maximum:.6f}; after cue {changed["changedFractionAbove12"]:.6f}')
