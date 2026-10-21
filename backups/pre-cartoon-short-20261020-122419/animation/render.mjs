import { chromium } from 'playwright';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
const root=resolve(import.meta.dirname,'..'), out=join(root,'output','cooking-lesson');
async function command(cmd,args){const p=spawn(cmd,args,{cwd:root,stdio:'inherit'});const [code]=await once(p,'close');if(code!==0)throw Error(`${cmd} failed (${code})`);}
if(!process.argv.includes('--reuse-audio'))await command('python',[join(root,'animation','narrate.py')]);
const data=JSON.parse(await readFile(join(out,'lesson.json'),'utf8'));
await mkdir(join(out,'previews'),{recursive:true});
const fps=24, frames=Math.ceil(data.duration*fps), errors=[];
const browser=await chromium.launch({headless:true});let encoder;
try{
 const page=await browser.newPage({viewport:{width:1280,height:720},deviceScaleFactor:1});
 page.on('pageerror',e=>errors.push(e.message));
 await page.goto(pathToFileURL(join(root,'animation','scene.html')).href);
 await page.evaluate(()=>document.fonts.ready);
 const checks=[];
 for(const step of data.steps){
  const time=step.start+(step.speechEnd-step.start)*.65;
  await page.evaluate(t=>window.setFrame(t),time);
  const state=await page.evaluate(()=>window.frameState);
  if(state.key!==step.key)throw Error(`Wrong step: ${step.key}`);
  await page.screenshot({path:join(out,'previews',`${step.key}.png`)});checks.push(state);
 }
 const output=join(out,'lifemotion-kids-cooking-final.mp4');
 encoder=spawn('ffmpeg',['-y','-v','warning','-f','image2pipe','-vcodec','mjpeg','-framerate',String(fps),'-i','pipe:0','-i',join(out,'narration.wav'),'-i',join(out,'subtitles.srt'),'-map','0:v','-map','1:a','-map','2:s','-c:v','libx264','-preset','fast','-crf','20','-pix_fmt','yuv420p','-c:a','aac','-b:a','160k','-c:s','mov_text','-metadata:s:s:0','language=eng','-metadata','title=LifeMotion Kids - Chef Maya Dosa Lesson','-movflags','+faststart','-t',String(data.duration),output],{stdio:['pipe','inherit','inherit']});
 const completion=once(encoder,'close');encoder.stdin.on('error',e=>errors.push(e.message));
 for(let i=0;i<frames;i++){
  await page.evaluate(t=>window.setFrame(t),i/fps);
  const buffer=await page.screenshot({type:'jpeg',quality:92});
  if(!encoder.stdin.write(buffer))await once(encoder.stdin,'drain');
  if(i%240===0)console.log(`Rendering ${Math.round(i/frames*100)}% (${i}/${frames})`);
 }
 encoder.stdin.end();const [code]=await completion;if(code!==0)throw Error('FFmpeg encode failed');
 if(errors.length)throw Error(errors.join('\n'));
 await command('ffmpeg',['-v','error','-i',output,'-f','null','-']);
 const report={passed:true,frames,fps,duration:data.duration,voice:data.voice,steps:checks,browserErrors:errors,output};
 await writeFile(join(out,'validation.json'),JSON.stringify(report,null,2));console.log(`Validated video: ${output}`);
}finally{await browser.close();if(encoder&&encoder.exitCode===null)encoder.kill();}
