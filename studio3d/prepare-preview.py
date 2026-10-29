"""Extract full cooking steps with their original measured audio and captions."""
import array,json,math,sys,wave
from pathlib import Path

source,target=map(Path,sys.argv[1:3])
lesson=json.loads((source/'lesson.json').read_text(encoding='utf-8'))

start = 0.0
end = float(lesson['duration'])

target.mkdir(parents=True,exist_ok=True)
with wave.open(str(source/'narration.wav'),'rb') as wav:
 rate=wav.getframerate(); channels=wav.getnchannels(); width=wav.getsampwidth()
 assert channels==1 and width==2, 'Preview requires mono 16-bit narration'
 begin=round(start*rate);finish=round(end*rate);wav.setpos(begin);pcm=wav.readframes(finish-begin)

duration=len(pcm)/2/rate
with wave.open(str(target/'narration.wav'),'wb') as wav:
 wav.setparams((1,2,rate,0,'NONE','not compressed'));wav.writeframes(pcm)

preview={**lesson,'duration':duration,'sourceOffset':0.0}
(target/'lesson.json').write_text(json.dumps(preview),encoding='utf-8')

# Copy or create subtitles
if (source/'subtitles.srt').exists():
 (target/'subtitles.srt').write_text((source/'subtitles.srt').read_text(encoding='utf-8'),encoding='utf-8')
else:
 def stamp(t):
  ms=round(t*1000);return f'{ms//3600000:02}:{ms//60000%60:02}:{ms//1000%60:02},{ms%1000:03}'
 (target/'subtitles.srt').write_text('\n\n'.join(f"{i+1}\n{stamp(c['start'])} --> {stamp(c['end'])}\n{c['text']}" for i,c in enumerate(preview.get('captions',[]))),encoding='utf-8')

print(json.dumps({'duration':duration,'sourceOffset':0.0,'steps':len(preview.get('steps',[]))}))
