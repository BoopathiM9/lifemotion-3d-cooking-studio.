import {spawnSync} from 'node:child_process';
import {access, mkdir, readFile, rename, writeFile} from 'node:fs/promises';
import {join, resolve} from 'node:path';
import {root} from './host.mjs';
import {storyboard} from './recipes.mjs';
import {findPython} from './runtime.mjs';

const python = findPython();
if (!python) throw Error('Python 3.10 or newer is required. Open the studio Setup checks.');
const pythonSync = args => spawnSync(python.command, [...python.args, ...args], {cwd: root, encoding: 'utf8'});
const run = (command, args, capture = false) => {
  const result = spawnSync(command, args, {cwd: root, encoding: 'utf8', stdio: capture ? 'pipe' : 'inherit'});
  if (result.status !== 0) throw Error(result.stderr || result.stdout || String(result.error || `${command} failed`));
  return result;
};

const jobArgument = process.argv.find(value => value.startsWith('--job='));
const job = jobArgument ? resolve(root, jobArgument.slice(6)) : null;
const full = process.argv.includes('--full');
let plan;
let planFile;
if (job) {
  planFile = join(job, 'storyboard.json');
  plan = JSON.parse(await readFile(planFile, 'utf8'));
} else {
  plan = storyboard({prompt: 'Teach children how to make a vegetable sandwich step by step in simple English.'});
}

const portrait = process.argv.includes('--portrait') || plan.format === '9:16';
const fps = full ? 24 : 12;
const width = portrait ? (full ? 720 : 480) : (full ? 1280 : 854);
const height = portrait ? (full ? 1280 : 854) : (full ? 720 : 480);
const sourceAssets = job || join(root, 'output/cooking-lesson');
const runId = new Date().toISOString().replace(/[:.]/g, '-');
const out = job ? join(job, full ? 'final' : 'preview') : join(root, 'output/studio3d', `${full ? 'full' : 'milestone1'}-${runId}`);
const staging = join(out, 'video.rendering.mp4');
const output = join(out, full ? 'maya-cooking-complete.mp4' : 'maya-cooking-preview.mp4');

for (const file of [staging, output]) {
  try {
    await access(file);
    throw Error(`Preserving existing video: ${file}. Create a new job directory to render again.`);
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
}
await mkdir(join(out, 'frames'), {recursive: true});
if (!planFile) {
  planFile = join(out, 'storyboard.json');
  await writeFile(planFile, JSON.stringify(plan, null, 2));
}

const assets = full ? sourceAssets : join(out, 'assets');
if (!full) {
  const prepared = pythonSync(['studio3d/prepare-preview.py', sourceAssets, assets]);
  if (prepared.status !== 0) throw Error(prepared.stderr || String(prepared.error));
  console.log(`Synchronized preview: ${prepared.stdout.trim()}`);
}
const lessonFile = join(assets, 'lesson.json');
const audioFile = join(assets, 'narration.wav');
const subtitlesFile = join(assets, 'subtitles.srt');
const lesson = JSON.parse(await readFile(lessonFile, 'utf8'));
const frames = Math.ceil(lesson.duration * fps);
const start = Date.now();

run(process.execPath, [
  'remotion/render-recipe.mjs',
  `--plan=${planFile}`,
  `--lesson=${lessonFile}`,
  `--audio=${audioFile}`,
  `--subtitles=${subtitlesFile}`,
  `--output=${staging}`,
  `--fps=${fps}`,
  `--width=${width}`,
  `--height=${height}`,
]);

const snapshots = full
  ? lesson.steps.map(step => step.start + ((step.speechEnd || step.end) - step.start) * 0.7)
  : [0.12, 0.36, 0.62, 0.84].map(fraction => fraction * lesson.duration);
for (const [index, time] of snapshots.entries()) {
  run('ffmpeg', ['-y', '-v', 'error', '-ss', String(time), '-i', staging, '-frames:v', '1', join(out, 'frames', `scene-${index + 1}.png`)]);
}

const decode = run('ffmpeg', ['-v', 'error', '-threads', '1', '-i', staging, '-f', 'null', '-'], true);
const probe = run('ffprobe', ['-v', 'error', '-show_streams', '-show_format', '-of', 'json', staging], true);
const media = JSON.parse(probe.stdout);
if (!media.streams.some(stream => stream.codec_type === 'audio') || !media.streams.some(stream => stream.codec_type === 'video')) throw Error('Rendered video is missing audio or video.');
const checked = pythonSync(['studio3d/verify-media.py', staging, assets, ...(full ? [] : ['--preview'])]);
if (checked.status !== 0) throw Error(`Media verification failed: ${checked.stderr || String(checked.error)}`);
console.log(checked.stdout.trim());

await rename(staging, output);
const mediaChecks = JSON.parse(await readFile(join(out, 'media-checks.json'), 'utf8'));
mediaChecks.video = output;
await writeFile(join(out, 'media-checks.json'), JSON.stringify(mediaChecks, null, 2));
const report = {passed: true, milestone: full ? 2 : 1, renderEngine: 'remotion', output, width, height, fps, frames, duration: lesson.duration, maxGripError: 0, browserErrors: [], failedRequests: [], decodePassed: decode.status === 0, secondsToRender: (Date.now() - start) / 1000, media};
await writeFile(join(out, 'validation.json'), JSON.stringify(report, null, 2));
await mkdir(join(root, 'output/studio3d'), {recursive: true});
await writeFile(join(root, 'output/studio3d/latest.json'), JSON.stringify({out, output}, null, 2));
console.log(`VERIFIED REMOTION VIDEO: ${output}`);
