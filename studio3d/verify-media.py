import array
import json
import math
import subprocess
import sys
import wave
from pathlib import Path

video = Path(sys.argv[1]).resolve()
assets = Path(sys.argv[2]).resolve()

def run(*args):
    return subprocess.check_output(args, stderr=subprocess.PIPE)

# --------------------------------------------------
# Probe generated media
# --------------------------------------------------

probe = json.loads(
    run(
        'ffprobe',
        '-v', 'error',
        '-show_streams',
        '-show_format',
        '-of', 'json',
        str(video)
    )
)

lesson = json.loads(
    (assets / 'lesson.json').read_text(encoding='utf-8')
)

v = next(s for s in probe['streams'] if s['codec_type'] == 'video')
a = next(s for s in probe['streams'] if s['codec_type'] == 'audio')
sub = next(s for s in probe['streams'] if s['codec_type'] == 'subtitle')

preview = '--preview' in sys.argv

# --------------------------------------------------
# Video / audio / subtitle validation
# --------------------------------------------------

assert v['codec_name'] == 'h264', 'Video must be H.264'
assert a['codec_name'] == 'aac', 'Audio must be AAC'
assert sub['codec_name'] == 'mov_text', 'Subtitle must be mov_text'

expected_fps = '12/1' if preview else '24/1'
assert v['r_frame_rate'] == expected_fps, (
    f'Unexpected frame rate: {v["r_frame_rate"]}'
)

expected_size = 480 if preview else 720
assert min(v['width'], v['height']) == expected_size, (
    f'Unexpected resolution: {v["width"]}x{v["height"]}'
)

assert abs(float(v['duration']) - lesson['duration']) < .1
assert abs(float(a['duration']) - lesson['duration']) < .1

# --------------------------------------------------
# Make sure entire MP4 can be decoded
# --------------------------------------------------

run(
    'ffmpeg',
    '-v', 'error',
    '-threads', '1',
    '-i', str(video),
    '-f', 'null',
    '-'
)

# --------------------------------------------------
# Load original narration
# --------------------------------------------------

with wave.open(str(assets / 'narration.wav'), 'rb') as w:
    rate = w.getframerate()
    source = array.array(
        'h',
        w.readframes(w.getnframes())
    )

# Decode AAC narration from MP4 back to PCM

decoded = array.array(
    'h',
    run(
        'ffmpeg',
        '-v', 'error',
        '-i', str(video),
        '-map', '0:a:0',
        '-ar', str(rate),
        '-ac', '1',
        '-f', 's16le',
        'pipe:1'
    )
)

# --------------------------------------------------
# Audio verification
#
# AAC is lossy. Do not require near-identical
# PCM samples after AAC encoding.
# --------------------------------------------------

def correlation(x, y):
    count = min(len(x), len(y))

    if count == 0:
        return 0.0

    x = x[:count]
    y = y[:count]

    xx = sum(i * i for i in x)
    yy = sum(i * i for i in y)

    if xx == 0 or yy == 0:
        return 1.0 if xx == 0 and yy == 0 else 0.0

    return sum(i * j for i, j in zip(x, y)) / math.sqrt(xx * yy)


correlations = []

for fraction in [.1, .4, .7, .92]:

    start = int(len(source) * fraction)

    aa = source[start:start + rate:8]
    bb = decoded[start:start + rate:8]

    cor = correlation(aa, bb)

    correlations.append(cor)

    # AAC encoding can alter waveform samples.
    # 0.80 still catches major corruption or shifting.
    assert cor > .80, (
        f'Audio correlation too low at {fraction:.0%}: {cor:.4f}'
    )

# --------------------------------------------------
# Global audio check 
# --------------------------------------------------

aa = source[::8]
bb = decoded[:len(source):8]

count = min(len(aa), len(bb))

aa = aa[:count]
bb = bb[:count]

source_energy = sum(x * x for x in aa)
decoded_energy = sum(x * x for x in bb)

assert source_energy > 0, 'Source narration is silent'
assert decoded_energy > 0, 'Decoded narration is silent'

global_correlation = correlation(aa, bb)

gain = math.sqrt(decoded_energy / source_energy)

assert global_correlation > .80, (
    f'Decoded narration correlation too low: '
    f'{global_correlation:.4f}'
)

assert .75 < gain < 1.25, (
    f'Unexpected narration volume change: {gain:.4f}'
)

# --------------------------------------------------
# Subtitle verification
# --------------------------------------------------

srt = run(
    'ffmpeg',
    '-v', 'error',
    '-i', str(video),
    '-map', '0:s:0',
    '-f', 'srt',
    'pipe:1'
).decode('utf-8').replace('\r', '')

blocks = srt.strip().split('\n\n')

cues = [
    block.splitlines()[2:]
    for block in blocks
]

assert [' '.join(c) for c in cues] == [
    c['text'] for c in lesson['captions']
], 'Subtitle text mismatch'


def timestamp(value):

    h, m, s = value.replace(',', '.').split(':')

    return (
        int(h) * 3600 +
        int(m) * 60 +
        float(s)
    )


previous = 0

for block, caption in zip(blocks, lesson['captions']):

    start, end = map(
        timestamp,
        block.splitlines()[1].split(' --> ')
    )

    assert abs(start - caption['start']) < .003, (
        'Subtitle start time mismatch'
    )

    assert abs(end - caption['end']) < .003, (
        'Subtitle end time mismatch'
    )

    assert 0 <= start < end <= lesson['duration'] + .003, (
        'Invalid subtitle timing'
    )

    assert start >= previous - .003, (
        'Overlapping subtitle'
    )

    previous = end

# --------------------------------------------------
# Narration segment checks
# --------------------------------------------------

for segment in lesson.get('segments', []):

    assert abs(
        segment['end']
        - segment['start']
        - segment['measuredAudioDuration']
    ) < .001

    assert any(
        c['start'] < segment['end']
        and c['end'] > segment['start']
        for c in lesson['captions']
    ), 'Missing sentence caption'

# --------------------------------------------------
# Verification report
# --------------------------------------------------

report = {
    'globalAudioCorrelation': global_correlation,
    'audioGainRatio': gain,
    'subtitleTimingChecked': True,
    'sentenceDurationsChecked':
        len(lesson.get('segments', [])),
    'preview': preview,
    'passed': True,
    'video': str(video),
    'width': v['width'],
    'height': v['height'],
    'fps': v['r_frame_rate'],
    'duration': probe['format']['duration'],
    'fullDecode': True,
    'audioCorrelations': correlations,
    'subtitleCues': len(cues),
    'sourceVoice': lesson['voice']
}

(video.parent / 'media-checks.json').write_text(
    json.dumps(report, indent=2),
    encoding='utf-8'
)

print(json.dumps(report, indent=2))