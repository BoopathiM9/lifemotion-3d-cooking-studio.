"""Validate exported media without changing narration or existing videos."""
import array, hashlib, json, math, subprocess, wave
from pathlib import Path
ROOT=Path(__file__).resolve().parent.parent
QA=ROOT/'output/qa';VIDEO=ROOT/'output/lifemotion-final-tested.mp4';OUT=ROOT/'output/cooking-lesson'
def command(*args):return subprocess.check_output(args,stderr=subprocess.PIPE)
def digest(p):return hashlib.sha256(p.read_bytes()).hexdigest()
assert VIDEO.is_file() and VIDEO.stat().st_size>100000, 'Final MP4 is missing or empty'
probe=json.loads(command('ffprobe','-v','error','-show_streams','-show_format','-of','json',str(VIDEO)))
(QA/'ffprobe-final.json').write_text(json.dumps(probe,indent=2),encoding='utf-8')
streams={s['codec_type']:s for s in probe['streams']}
assert streams['video']['codec_name']=='h264' and streams['video']['width']==1280 and streams['video']['height']==720
assert streams['video']['r_frame_rate']=='24/1' and streams['audio']['codec_name']=='aac' and streams['subtitle']['codec_name']=='mov_text'
command('ffmpeg','-v','error','-i',str(VIDEO),'-f','null','-')
with wave.open(str(OUT/'narration.wav'),'rb') as w:
 rate=w.getframerate();assert w.getnchannels()==1 and w.getsampwidth()==2
 source=array.array('h',w.readframes(w.getnframes()))
decoded=array.array('h',command('ffmpeg','-v','error','-i',str(VIDEO),'-map','0:a:0','-ac','1','-ar',str(rate),'-f','s16le','pipe:1'))
assert abs(len(decoded)-len(source))/rate<.1
# Correlate independent voice windows at the start, middle and end after AAC decoding.
correlations=[]
for seconds in [3,20,40,55,75]:
 start=int(seconds*rate);a=source[start:start+rate:8];b=decoded[start:start+rate:8]
 corr=sum(x*y for x,y in zip(a,b))/math.sqrt(sum(x*x for x in a)*sum(y*y for y in b))
 assert corr>.97, f'Exported voice differs or is shifted at {seconds}s: {corr}'
 correlations.append({'seconds':seconds,'correlation':round(corr,6)})
lesson=json.loads((OUT/'lesson.json').read_text(encoding='utf-8'))
assert abs(float(probe['format']['duration'])-lesson['duration'])<.1
subtitles=command('ffmpeg','-v','error','-i',str(VIDEO),'-map','0:s:0','-f','srt','pipe:1').decode('utf-8').replace('\r','')
blocks=[b.strip().splitlines() for b in subtitles.strip().split('\n\n')]
assert [' '.join(b[2:]) for b in blocks]==[c['text'] for c in lesson['captions']]
backup=Path((QA/'backup-path.txt').read_text(encoding='utf-8'))
preserved={name:digest(OUT/name)==digest(backup/'cooking-lesson'/name) for name in ['narration.wav','subtitles.srt','lesson.json','lesson-data.js','lifemotion-kids-cooking-final.mp4']}
assert all(preserved.values()), f'Original assets changed: {preserved}'
peak=max(abs(v) for v in source)/32768;clipped=sum(v in (-32768,32767) for v in source)
assert clipped==0
report={'passed':True,'finalVideo':str(VIDEO),'bytes':VIDEO.stat().st_size,'duration':probe['format']['duration'],'fullDecodePassed':True,'audioVideoDurationDifferenceSeconds':abs(float(streams['video']['duration'])-float(streams['audio']['duration'])),'voiceCorrelationWindows':correlations,'subtitleCuesPreserved':len(blocks),'sourcePeakDbFS':round(20*math.log10(peak),2),'clippedSourceSamples':clipped,'originalAssetsPreserved':preserved}
(QA/'media-validation.json').write_text(json.dumps(report,indent=2),encoding='utf-8');print(json.dumps(report,indent=2))
