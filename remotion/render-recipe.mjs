import {bundle} from '@remotion/bundler';
import {renderMedia, selectComposition} from '@remotion/renderer';
import {access, copyFile, mkdir, readFile, rm} from 'node:fs/promises';
import {dirname, join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {browserLaunchOptions} from '../studio3d/runtime.mjs';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = Object.fromEntries(process.argv.slice(2).map(value => {
  const match = /^--([^=]+)=(.*)$/.exec(value);
  return match ? [match[1], match[2]] : [value.replace(/^--/, ''), true];
}));
for (const required of ['plan', 'lesson', 'audio', 'subtitles']) {
  if (!args[required]) throw Error(`Missing --${required}=...`);
  await access(resolve(args[required]));
}

const plan = JSON.parse(await readFile(resolve(args.plan), 'utf8'));
const lesson = JSON.parse(await readFile(resolve(args.lesson), 'utf8'));
const fps = Number(args.fps || 24);
const width = Number(args.width || 1280);
const height = Number(args.height || 720);
const durationInFrames = Math.max(1, Math.ceil(lesson.duration * fps));
const output = resolve(args.output);
const temporary = join(dirname(output), `.remotion-${process.pid}-${Date.now()}`);
const publicDir = join(temporary, 'public');
const bundleDir = join(temporary, 'bundle');
const visual = join(temporary, 'visual.mp4');
await mkdir(publicDir, {recursive: true});
await copyFile(resolve(args.audio), join(publicDir, 'narration.wav'));

const inputProps = {plan, lesson, audioFile: 'narration.wav', fps, width, height, durationInFrames};
const browserExecutable = browserLaunchOptions().executablePath;
let lastProgress = -1;
try {
  const serveUrl = await bundle({
    entryPoint: join(projectRoot, 'remotion/index.jsx'),
    publicDir,
    outDir: bundleDir,
    onProgress: value => {
      const percent = Math.round(value <= 1 ? value * 100 : value);
      if (percent >= lastProgress + 25) { console.log(`Preparing Remotion ${percent}%`); lastProgress = percent; }
    },
  });
  const composition = await selectComposition({serveUrl, id: 'LifeMotionCooking', inputProps, browserExecutable, logLevel: 'warn'});
  let lastFrame = -1;
  await renderMedia({
    composition,
    serveUrl,
    codec: 'h264',
    audioCodec: 'aac',
    pixelFormat: 'yuv420p',
    crf: 20,
    concurrency: 1,
    overwrite: true,
    outputLocation: visual,
    inputProps,
    browserExecutable,
    logLevel: 'warn',
    onProgress: ({progress}) => {
      const rendered = Math.min(durationInFrames, Math.floor(progress * durationInFrames));
      if (rendered === durationInFrames || rendered >= lastFrame + fps) {
        console.log(`Rendering Remotion ${rendered}/${durationInFrames} (${Math.round(progress * 100)}%)`);
        lastFrame = rendered;
      }
    },
  });
  const mux = spawnSync('ffmpeg', [
    '-y', '-v', 'error', '-i', visual, '-i', resolve(args.audio), '-i', resolve(args.subtitles),
    '-map', '0:v:0', '-map', '1:a:0', '-map', '2:0',
    '-c:v', 'copy', '-c:a', 'aac', '-b:a', '128k', '-ac', '1', '-c:s', 'mov_text',
    '-metadata:s:s:0', plan.voice?.startsWith('ta-') ? 'language=tam' : 'language=eng',
    '-t', String(lesson.duration), '-movflags', '+faststart', output,
  ], {encoding: 'utf8'});
  if (mux.status !== 0) throw Error(mux.stderr || String(mux.error));
  console.log(`REMOTION VIDEO READY: ${output}`);
} finally {
  await rm(temporary, {recursive: true, force: true});
}
