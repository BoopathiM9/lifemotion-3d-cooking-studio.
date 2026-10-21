import { chromium } from 'playwright';
import { mkdir, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = resolve(import.meta.dirname, '..');
const output = join(root, 'output');
await mkdir(output, { recursive: true });
const framesDir = await mkdtemp(join(tmpdir(), 'lifemotion-frames-'));
let browser;
try {
  browser = await chromium.launch({headless:true});
  const page = await browser.newPage({ viewport:{width:1280,height:720}, deviceScaleFactor:1 });
  await page.goto(pathToFileURL(join(root,'animation','scene.html')).href);
  const fps=24, duration=8;
  for(let i=0;i<fps*duration;i++){
    await page.evaluate(t=>window.setFrame(t),i/fps);
    await page.screenshot({path:join(framesDir,`frame-${String(i).padStart(5,'0')}.png`)});
    if(i%48===0) console.log(`Rendering ${Math.round(i/(fps*duration)*100)}%`);
  }
  await browser.close();browser=null;
  const result=spawnSync('ffmpeg',['-y','-framerate',String(fps),'-i',join(framesDir,'frame-%05d.png'),'-c:v','libx264','-pix_fmt','yuv420p','-movflags','+faststart',join(output,'masala-dosa.mp4')],{stdio:'inherit'});
  if(result.error)throw result.error;
  if(result.status!==0)throw new Error(`FFmpeg failed with code ${result.status}`);
  console.log(`Video ready: ${join(output,'masala-dosa.mp4')}`);
}finally{if(browser)await browser.close();await rm(framesDir,{recursive:true,force:true});}
