import asyncio,array,hashlib,json,math,subprocess,sys,wave
from pathlib import Path
import edge_tts
ROOT=Path(__file__).resolve().parent.parent
async def main():
 job=Path(sys.argv[1]).resolve();assert job.is_relative_to(ROOT/'output/studio3d')
 plan=json.loads((job/'storyboard.json').read_text(encoding='utf-8-sig'))
 cache=ROOT/'output/studio3d/speech-cache';cache.mkdir(parents=True,exist_ok=True)
 pcm=bytearray();steps=[];segments=[];words=[];cursor=0;rate=24000
 for action in plan['actions']:
  begin=cursor
  for text in action['sentences']:
   key=hashlib.sha256((plan['voice']+'|-8%|+3Hz|'+text).encode()).hexdigest()[:24];mp3=cache/(key+'.mp3');meta=cache/(key+'.json')
   if not (mp3.exists() and meta.exists()):
    chunks=[];audio=bytearray()
    async for c in edge_tts.Communicate(text,plan['voice'],rate='-8%',pitch='+3Hz',boundary='WordBoundary').stream():
     if c['type']=='audio':audio.extend(c['data'])
     elif c['type']=='WordBoundary':chunks.append({'text':c['text'],'start':c['offset']/1e7,'end':(c['offset']+c['duration'])/1e7})
    if not chunks or not audio:raise RuntimeError('No speech or word timestamps received')
    mp3.write_bytes(audio);meta.write_text(json.dumps(chunks),encoding='utf-8')
   raw=subprocess.check_output(['ffmpeg','-v','error','-i',str(mp3),'-f','s16le','-ar',str(rate),'-ac','1','pipe:1'])
   duration=len(raw)/2/rate
   for word in json.loads(meta.read_text()):words.append({**word,'start':word['start']+cursor,'end':word['end']+cursor})
   segments.append({'text':text,'key':action['key'],'start':cursor,'end':cursor+duration,'measuredAudioDuration':duration})
   pcm.extend(raw);pcm.extend(bytes(round(.18*rate)*2));cursor+=duration+.18
   print('Narration:',action['key'],text,flush=True)
  steps.append({'key':action['key'],'text':action['text'],'title':action['key'],'start':begin,'speechEnd':cursor-.18,'end':cursor})
 with wave.open(str(job/'narration.wav'),'wb') as wav:wav.setparams((1,2,rate,0,'NONE','not compressed'));wav.writeframes(pcm)
 samples=array.array('h',pcm);envelope=[]
 for i in range(0,len(samples),480):
  frame=samples[i:i+480];envelope.append(round(min(1,math.sqrt(sum(x*x for x in frame)/len(frame))/32768*10),4))
 captions=[]
 for segment in segments:
  ws=[w for w in words if segment['start']<=w['start']<segment['end']]
  for i in range(0,len(ws),6):
   group=ws[i:i+6];captions.append({'start':group[0]['start'],'end':ws[i+6]['start'] if i+6<len(ws) else min(segment['end'],group[-1]['end']+.2),'text':' '.join(w['text'] for w in group)})
 def stamp(t):
  ms=round(t*1000);return f'{ms//3600000:02}:{ms//60000%60:02}:{ms//1000%60:02},{ms%1000:03}'
 (job/'subtitles.srt').write_text('\n\n'.join(f"{i+1}\n{stamp(c['start'])} --> {stamp(c['end'])}\n{c['text']}" for i,c in enumerate(captions)),encoding='utf-8')
 data={'duration':cursor,'voice':plan['voice'],'steps':steps,'segments':segments,'words':words,'captions':captions,'envelope':envelope,'envelopeInterval':.02}
 (job/'lesson.json').write_text(json.dumps(data),encoding='utf-8');print('AUDIO READY',cursor,flush=True)
if __name__=='__main__':asyncio.run(main())
