import asyncio, json, subprocess, wave, array, math
from pathlib import Path
import edge_tts
ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / 'output' / 'cooking-lesson'
STEPS = [
 ('welcome', 'Hello, little chefs!', "Hello, little chefs! I'm Chef Maya. Let's make a crispy masala dosa together!"),
 ('safe', 'First, cook safely', 'Wash your hands first. Ask a grown-up to use the hot stove and utensils. We can watch and learn!'),
 ('ingredients', 'Our ingredients', 'We need dosa batter, cooked potato filling, a little oil, and chutney. Everything is ready!'),
 ('pour', '1 / Pour the batter', 'Our grown-up warms a lightly oiled pan. Scoop up the batter, then gently pour it into the middle.'),
 ('spread', '2 / Make a spiral', 'Use the back of the ladle. Move in gentle circles, from the middle outwards. Round and round!'),
 ('cook', '3 / Cook until golden', 'Add a little oil around the edge. Let the dosa cook until the edges look golden and lift easily.'),
 ('fill', '4 / Add potato filling', 'Spoon the cooked potato filling onto one side. Leave room around the edge so we can fold it.'),
 ('fold', '5 / Lift and fold', 'Slide the spatula under the empty half. Lift it gently, and fold it over the yummy filling.'),
 ('serve', '6 / Serve and enjoy', 'Slide our dosa onto a plate. Turn off the stove. Let it cool before tasting. Great cooking, little chefs!')
]
def run(*args):
    return subprocess.check_output(args)
def stamp(t):
    ms=round(t*1000); return f'{ms//3600000:02}:{ms//60000%60:02}:{ms//1000%60:02},{ms%1000:03}'
async def main():
    OUT.mkdir(parents=True, exist_ok=True)
    timeline=[]; words=[]; pcm=bytearray(); rate=24000; cursor=0
    for index,(key,title,text) in enumerate(STEPS):
        mp3=OUT / f'{index:02}-{key}.mp3'; meta=mp3.with_suffix('.json')
        if not (mp3.exists() and meta.exists()):
            boundaries=[]
            voice=edge_tts.Communicate(text, 'en-US-JennyNeural', rate='-8%', pitch='+3Hz', boundary='WordBoundary')
            with mp3.open('wb') as audio:
                async for chunk in voice.stream():
                    if chunk['type']=='audio': audio.write(chunk['data'])
                    elif chunk['type']=='WordBoundary': boundaries.append({'start':chunk['offset']/1e7,'end':(chunk['offset']+chunk['duration'])/1e7,'text':chunk['text']})
            if not boundaries: raise RuntimeError('Edge TTS returned no word timings')
            meta.write_text(json.dumps(boundaries), encoding='utf-8')
        boundaries=json.loads(meta.read_text(encoding='utf-8'))
        raw=run('ffmpeg','-v','error','-i',str(mp3),'-f','s16le','-ar',str(rate),'-ac','1','pipe:1')
        start=cursor; duration=len(raw)/2/rate
        for w in boundaries: words.append({**w,'start':w['start']+start,'end':w['end']+start})
        timeline.append({'key':key,'title':title,'text':text,'start':start,'speechEnd':start+duration,'end':start+duration+0.65})
        pcm.extend(raw); pcm.extend(bytes(round(.65*rate)*2)); cursor+=duration+.65
        print(f'Voice ready: {key} ({duration:.1f}s)', flush=True)
    with wave.open(str(OUT/'narration.wav'),'wb') as wav:
        wav.setparams((1,2,rate,0,'NONE','not compressed')); wav.writeframes(pcm)
    samples=array.array('h',pcm); envelope=[]
    for i in range(0,len(samples),480):
        frame=samples[i:i+480]; rms=math.sqrt(sum(v*v for v in frame)/len(frame))/32768
        envelope.append(round(min(1,rms*10),4))
    captions=[]
    for step in timeline:
        current=[w for w in words if step['start']<=w['start']<step['speechEnd']]
        for i in range(0,len(current),7):
            group=current[i:i+7]
            captions.append({'start':group[0]['start'],'end':min(step['end'],current[i+7]['start'] if i+7<len(current) else group[-1]['end']+.25),'text':' '.join(w['text'] for w in group)})
    data={'duration':cursor,'voice':'en-US-JennyNeural','steps':timeline,'words':words,'captions':captions,'envelope':envelope,'envelopeInterval':.02}
    (OUT/'lesson.json').write_text(json.dumps(data),encoding='utf-8')
    (OUT/'lesson-data.js').write_text('window.LESSON = '+json.dumps(data)+';',encoding='utf-8')
    (OUT/'subtitles.srt').write_text('\n\n'.join(f"{i+1}\n{stamp(c['start'])} --> {stamp(c['end'])}\n{c['text']}" for i,c in enumerate(captions)),encoding='utf-8')
    print(f'Lesson duration: {cursor:.2f}s',flush=True)
if __name__=='__main__': asyncio.run(main())
