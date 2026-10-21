"""Extract complete cooking steps with their original measured audio and captions."""
import array,json,math,sys,wave
from pathlib import Path
source,target=map(Path,sys.argv[1:3])
lesson=json.loads((source/'lesson.json').read_text(encoding='utf-8'))
cooking_steps=[s for s in lesson['steps'] if s['key'] not in ('welcome','safe','ingredients')]
first=cooking_steps[0] if cooking_steps else lesson['steps'][0]
following=next((s for s in lesson['steps'] if s['start']>=first['end']-0.001), first)
start,end=first['start'],following['end']
target.mkdir(parents=True,exist_ok=True)
with wave.open(str(source/'narration.wav'),'rb') as wav:
 rate=wav.getframerate(); channels=wav.getnchannels(); width=wav.getsampwidth()
 assert channels==1 and width==2, 'Preview requires mono 16-bit narration'
 begin=round(start*rate);finish=round(end*rate);wav.setpos(begin);pcm=wav.readframes(finish-begin)
start=begin/rate;duration=len(pcm)/2/rate
with wave.open(str(target/'narration.wav'),'wb') as wav:
 wav.setparams((1,2,rate,0,'NONE','not compressed'));wav.writeframes(pcm)
def shifted(items):
 result=[]
 for item in items:
  if item['start']<end-.001 and item['end']>start+.001:
   copy=dict(item)
   for key in ('start','end','speechEnd'):
    if key in copy:copy[key]=min(duration,max(0,copy[key]-start))
   result.append(copy)
 return result
preview={**lesson,'duration':duration,'sourceOffset':start,'previewActions':[first['key'],following['key']]}
for key in ('steps','segments','words','captions'):preview[key]=shifted(lesson.get(key,[]))
samples=array.array('h',pcm);hop=round(rate*.02)
preview['envelope']=[round(min(1,math.sqrt(sum(x*x for x in samples[i:i+hop])/len(samples[i:i+hop]))/32768*10),4) for i in range(0,len(samples),hop)]
preview['envelopeInterval']=.02
(target/'lesson.json').write_text(json.dumps(preview),encoding='utf-8')
def stamp(t):
 ms=round(t*1000);return f'{ms//3600000:02}:{ms//60000%60:02}:{ms//1000%60:02},{ms%1000:03}'
(target/'subtitles.srt').write_text('\n\n'.join(f"{i+1}\n{stamp(c['start'])} --> {stamp(c['end'])}\n{c['text']}" for i,c in enumerate(preview['captions'])),encoding='utf-8')
print(json.dumps({'duration':duration,'sourceOffset':start,'actions':preview['previewActions']}))
