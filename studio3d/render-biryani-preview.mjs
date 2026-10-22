import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { createStaticServer, listen, root } from './host.mjs';
import { browserLaunchOptions } from './runtime.mjs';

const jobDir = join(root, 'output/studio3d/jobs/job-1792579678953-hojx6');
const plan = JSON.parse(await readFile(join(jobDir, 'storyboard.json'), 'utf8'));
const lesson = JSON.parse(await readFile(join(jobDir, 'lesson.json'), 'utf8'));
const duration = lesson.duration;
const fps = 12; // Smooth 12 fps web animation
const width = 854;
const height = 480;
const frames = Math.ceil(duration * fps);
const targetVideo = join(root, 'studio3d/assets/sample-preview.mp4');

console.log(`Starting Biryani render: ${frames} frames at ${fps} fps (${duration}s total)...`);

const server = createStaticServer();
const url = await listen(server);
const browser = await chromium.launch(browserLaunchOptions());

try {
  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
  page.on('console', m => { if (m.type() === 'error') console.error('Browser Error:', m.text()); });
  page.on('pageerror', err => console.error('Browser PageError:', err.message));

  await page.addInitScript(c => window.RENDER_CONFIG = c, {
    width,
    height,
    lesson,
    duration,
    preview: true,
    recipe: 'chicken-biryani',
    plan
  });

  await page.goto(url + '/studio3d/scene.html');
  await page.waitForFunction(() => window.studioReady, {}, { timeout: 60000 });
  console.log('3D Studio ready! Launching FFmpeg encoder...');

  const subtitleFile = join(jobDir, 'subtitles.srt');
  const audioFile = join(jobDir, 'narration.wav');

  // Encode with libx264, yuv420p, +faststart for universal browser compatibility
  const encoder = spawn('ffmpeg', [
    '-y',
    '-v', 'warning',
    '-threads', '2',
    '-f', 'image2pipe',
    '-vcodec', 'mjpeg',
    '-framerate', String(fps),
    '-i', 'pipe:0',
    '-i', audioFile,
    '-map', '0:v:0',
    '-map', '1:a:0',
    '-c:v', 'libx264',
    '-pix_fmt', 'yuv420p',
    '-preset', 'fast',
    '-crf', '22',
    '-c:a', 'aac',
    '-b:a', '96k',
    '-t', String(duration),
    '-movflags', '+faststart',
    targetVideo
  ], { stdio: ['pipe', 'inherit', 'inherit'] });

  const completed = once(encoder, 'close');
  encoder.stdin.on('error', err => console.error('Encoder stdin error:', err.message));

  const start = Date.now();
  for (let i = 0; i < frames; i++) {
    const t = i / fps;
    await page.evaluate(t => window.setFrame(t), t);
    const buf = await page.screenshot({ type: 'jpeg', quality: 88 });
    
    if (!encoder.stdin.write(buf)) {
      await once(encoder.stdin, 'drain');
    }

    if (i % 24 === 0 || i === frames - 1) {
      const pct = Math.round((i / frames) * 100);
      const elapsed = ((Date.now() - start) / 1000).toFixed(1);
      console.log(`Render progress: frame ${i}/${frames} (${pct}%) - ${elapsed}s elapsed`);
    }
  }

  encoder.stdin.end();
  const [code] = await completed;
  if (code !== 0) throw new Error('FFmpeg exited with code ' + code);

  console.log(`Successfully rendered Chicken Biryani preview video to: ${targetVideo}`);
} finally {
  await browser.close();
  server.close();
}
