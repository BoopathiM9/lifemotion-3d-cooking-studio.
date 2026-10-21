import array,json,math,subprocess,sys,wave
from pathlib import Path
video=Path(sys.argv[1]).resolve();assets=Path(sys.argv[2]).resolve()
def run(*args):return subprocess.check_output(args,stderr=subprocess.PIPE)
probe=json.loads(run('ffprobe','-v','error','-show_streams','-show_format','-of','json',str(video)))
lesson=json.loads((assets/'lesson.json').read_text(encoding='utf-8'))
v=next(s for s in probe['streams'] if s['codec_type']=='video');a=next(s for s in probe['streams'] if s['codec_type']=='audio');sub=next(s for s in probe['streams'] if s['codec_type']=='subtitle')
assert v['codec_name']=='h264' and a['codec_name']=='aac' and sub['codec_name']=='mov_text' and v['r_frame_rate']=='24/1'
assert min(v['width'],v['height'])==720
assert abs(float(v['duration'])-lesson['duration'])<.1 and abs(float(a['duration'])-lesson['duration'])<.1
run('ffmpeg','-v','error','-threads','1','-i',str(video),'-f','null','-')
with wave.open(str(assets/'narration.wav'),'rb') as w:rate=w.getframerate();source=array.array('h',w.readframes(w.getnframes()))
decoded=array.array('h',run('ffmpeg','-v','error','-i',str(video),'-map','0:a:0','-ar',str(rate),'-ac','1','-f','s16le','pipe:1'))
correlations=[]
for fraction in [.1,.4,.7,.92]:
 start=int(len(source)*fraction);aa=source[start:start+rate:8];bb=decoded[start:start+rate:8];den=math.sqrt(sum(x*x for x in aa)*sum(x*x for x in bb));cor=sum(x*y for x,y in zip(aa,bb))/den if den else 1
 assert cor>.97,cor;correlations.append(cor)
srt=run('ffmpeg','-v','error','-i',str(video),'-map','0:s:0','-f','srt','pipe:1').decode('utf-8').replace('\r','')
cues=[b.splitlines()[2:] for b in srt.strip().split('\n\n')]
assert [' '.join(c) for c in cues]==[c['text'] for c in lesson['captions']]
report={'passed':True,'video':str(video),'width':v['width'],'height':v['height'],'fps':v['r_frame_rate'],'duration':probe['format']['duration'],'fullDecode':True,'audioCorrelations':correlations,'subtitleCues':len(cues),'sourceVoice':lesson['voice']}
(video.parent/'media-checks.json').write_text(json.dumps(report,indent=2),encoding='utf-8');print(json.dumps(report,indent=2))
