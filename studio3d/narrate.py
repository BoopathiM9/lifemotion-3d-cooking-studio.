import asyncio,array,hashlib,json,math,os,re,subprocess,sys,wave
from pathlib import Path
import edge_tts

ROOT = Path(__file__).resolve().parent.parent

VALID_VOICES = {
  'en-US-JennyNeural',
  'en-US-AriaNeural',
  'en-IN-NeerjaNeural',
  'en-IN-NeerjaExpressiveNeural',
  'ta-IN-PallaviNeural'
}

def estimated_words(text, duration):
  tokens = re.findall(r'\S+', text)
  if not tokens:
    return []
  weights = [max(1, len(re.sub(r'\W', '', token, flags=re.UNICODE))) for token in tokens]
  total = sum(weights)
  cursor = 0.0
  result = []
  for token, weight in zip(tokens, weights):
    start = duration * cursor / total
    cursor += weight
    result.append({'text': token, 'start': start, 'end': duration * cursor / total})
  return result

async def synthesize_sentence(text, voice):
  chunks = []
  audio = bytearray()
  communicator = edge_tts.Communicate(
    text,
    voice,
    rate='-8%',
    pitch='+3Hz',
    boundary='WordBoundary',
    proxy=os.environ.get('HTTPS_PROXY') or os.environ.get('https_proxy')
  )
  async for c in communicator.stream():
    if c['type'] == 'audio':
      audio.extend(c['data'])
    elif c['type'] == 'WordBoundary':
      chunks.append({
        'text': c['text'],
        'start': c['offset'] / 1e7,
        'end': (c['offset'] + c['duration']) / 1e7
      })
  return audio, chunks

async def main():
  if len(sys.argv) < 2:
    raise RuntimeError('Usage: narrate.py <job_directory>')
  job = Path(sys.argv[1]).resolve()
  assert job.is_relative_to(ROOT / 'output/studio3d')

  plan_file = job / 'storyboard.json'
  if not plan_file.exists():
    raise RuntimeError(f'Missing storyboard.json in {job}')
  plan = json.loads(plan_file.read_text(encoding='utf-8-sig'))

  voice = plan.get('voice', 'en-US-JennyNeural')
  if voice not in VALID_VOICES:
    print(f"Warning: Unknown voice '{voice}', using en-US-JennyNeural fallback", file=sys.stderr)
    voice = 'en-US-JennyNeural'
    plan['voice'] = voice

  cache = ROOT / 'output/studio3d/speech-cache'
  cache.mkdir(parents=True, exist_ok=True)
  pcm = bytearray()
  steps = []
  segments = []
  words = []
  cursor = 0
  rate = 24000

  for action in plan['actions']:
    begin = cursor
    for text in action['sentences']:
      clean_text = text.strip()
      if not clean_text:
        continue
      key = hashlib.sha256((voice + '|-8%|+3Hz|' + clean_text).encode()).hexdigest()[:24]
      mp3 = cache / (key + '.mp3')
      meta = cache / (key + '.json')

      if not (mp3.exists() and meta.exists()):
        try:
          # Synthesize with 25-second timeout per sentence
          audio, chunks = await asyncio.wait_for(
            synthesize_sentence(clean_text, voice),
            timeout=25.0
          )
          if len(audio) < 512:
            raise RuntimeError('Audio returned from neural speech engine was too short or empty.')
          mp3.write_bytes(audio)
          meta.write_text(json.dumps(chunks), encoding='utf-8')
        except asyncio.TimeoutError:
          raise RuntimeError(f"Edge-TTS timed out while generating voice for: '{clean_text[:40]}...'")
        except Exception as error:
          raise RuntimeError(f"Voice generation failed for '{voice}': {error}. Check connection or voice configuration.")

      source = mp3
      raw = subprocess.check_output(
        ['ffmpeg', '-v', 'error', '-i', str(source), '-f', 's16le', '-ar', str(rate), '-ac', '1', 'pipe:1']
      )
      if len(raw) == 0:
        raise RuntimeError(f"Decoded PCM audio stream was empty for '{clean_text[:40]}'")
      duration = len(raw) / 2 / rate
      if duration <= 0.1:
        raise RuntimeError(f"Audio duration too short ({duration:.2f}s) for '{clean_text[:40]}'")

      if not meta.exists() or meta.stat().st_size == 0:
        meta.write_text(json.dumps(estimated_words(clean_text, duration)), encoding='utf-8')

      try:
        word_data = json.loads(meta.read_text(encoding='utf-8'))
      except Exception:
        word_data = estimated_words(clean_text, duration)

      for word in word_data:
        words.append({**word, 'start': word['start'] + cursor, 'end': word['end'] + cursor})

      segments.append({
        'text': clean_text,
        'key': action['key'],
        'start': cursor,
        'end': cursor + duration,
        'measuredAudioDuration': duration
      })
      pcm.extend(raw)
      pcm.extend(bytes(round(0.18 * rate) * 2))
      cursor += duration + 0.18
      print('Narration:', action['key'], clean_text, flush=True)

    steps.append({
      'key': action['key'],
      'text': action['text'],
      'title': action['key'],
      'start': begin,
      'speechEnd': cursor - 0.18,
      'end': cursor
    })

  if len(pcm) == 0:
    raise RuntimeError('No audio data generated for the lesson.')

  wav_path = job / 'narration.wav'
  with wave.open(str(wav_path), 'wb') as wav:
    wav.setparams((1, 2, rate, 0, 'NONE', 'not compressed'))
    wav.writeframes(pcm)

  if not wav_path.exists() or wav_path.stat().st_size < 1024:
    raise RuntimeError(f'Generated narration.wav file is corrupted or missing ({wav_path})')

  samples = array.array('h', pcm)
  envelope = []
  for i in range(0, len(samples), 480):
    frame = samples[i:i+480]
    envelope.append(round(min(1, math.sqrt(sum(x*x for x in frame)/len(frame))/32768*10), 4))

  captions = []
  for segment in segments:
    ws = [w for w in words if segment['start'] <= w['start'] < segment['end']]
    for i in range(0, len(ws), 6):
      group = ws[i:i+6]
      captions.append({
        'start': group[0]['start'],
        'end': ws[i+6]['start'] if i+6 < len(ws) else min(segment['end'], group[-1]['end'] + 0.2),
        'text': ' '.join(w['text'] for w in group)
      })

  def stamp(t):
    ms = round(t * 1000)
    return f'{ms//3600000:02}:{ms//60000%60:02}:{ms//1000%60:02},{ms%1000:03}'

  srt_path = job / 'subtitles.srt'
  srt_path.write_text(
    '\n\n'.join(f"{i+1}\n{stamp(c['start'])} --> {stamp(c['end'])}\n{c['text']}" for i, c in enumerate(captions)),
    encoding='utf-8'
  )

  data = {
    'duration': cursor,
    'voice': voice,
    'steps': steps,
    'segments': segments,
    'words': words,
    'captions': captions,
    'envelope': envelope,
    'envelopeInterval': 0.02
  }
  lesson_path = job / 'lesson.json'
  lesson_path.write_text(json.dumps(data, indent=2), encoding='utf-8')
  print('AUDIO READY', cursor, flush=True)

if __name__ == '__main__':
  asyncio.run(main())
