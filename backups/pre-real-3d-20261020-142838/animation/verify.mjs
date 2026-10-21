import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import {resolve,join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {chromium} from 'playwright';
const root=resolve(import.meta.dirname,'..'),out=join(root,'output','cooking-lesson');
const data=JSON.parse(await readFile(join(out,'lesson.json'),'utf8'));
assert.equal(data.steps.length,9);assert.ok(data.words.length>100);assert.ok(data.captions.length>15);
for(const [i,c] of data.captions.entries()){assert.ok(c.start<c.end);assert.ok(c.end<=data.duration);if(i)assert.ok(c.start>=data.captions[i-1].end-.001);}
const browser=await chromium.launch({headless:true,args:['--disable-gpu']});const errors=[];
try{
 const page=await browser.newPage({viewport:{width:1280,height:720}});page.on('pageerror',e=>errors.push(e.message));
 await page.goto(pathToFileURL(join(root,'animation','scene.html')).href);
 assert.equal(await page.locator('header, #step, #label, #progress, #hint, h1').count(),0,'App overlays must be removed');
 assert.ok(!(await page.locator('body').innerText()).includes('AI KIDS'));
 let silent=0,open=0;
 for(let i=0;i<data.envelope.length;i+=9){
  const t=(i+.5)*.02;await page.evaluate(t=>window.setFrame(t),t);
  const state=await page.evaluate(()=>({headTop:document.getElementById('faceRig').getBoundingClientRect().top,ry:+document.getElementById('mouthHole').getAttribute('ry'),caption:document.getElementById('caption').textContent}));
  assert.ok(state.headTop>=0,'Camera must keep the full chef hat in frame');
  if(data.envelope[i]<=.045){assert.equal(state.ry,2);silent++;}else{assert.ok(state.ry>3);open++;}
  assert.equal(state.caption,data.captions.find(c=>t>=c.start&&t<c.end)?.text||'');
 }
 assert.ok(silent>5&&open>20);
 const t=data.steps[4].start+2;
 await page.evaluate(t=>window.setFrame(t),t);const first=await page.locator('svg').innerHTML();
 await page.evaluate(t=>window.setFrame(t),data.duration-.1);await page.evaluate(t=>window.setFrame(t),t);
 assert.equal(await page.locator('svg').innerHTML(),first,'Seeking must be deterministic');assert.deepEqual(errors,[]);
 const outputArg=process.argv.find(v=>v.startsWith('--output=')),videoPath=outputArg?resolve(root,outputArg.slice(9)):join(out,'lifemotion-kids-cooking-final.mp4');
 const result=spawnSync('ffprobe',['-v','error','-show_streams','-show_format','-of','json',videoPath],{encoding:'utf8'});assert.equal(result.status,0,result.stderr);
 const probe=JSON.parse(result.stdout),video=probe.streams.find(s=>s.codec_type==='video'),audio=probe.streams.find(s=>s.codec_type==='audio'),subtitle=probe.streams.find(s=>s.codec_type==='subtitle');
 assert.equal(video.codec_name,'h264');assert.equal(video.width,1280);assert.equal(video.height,720);assert.equal(video.r_frame_rate,'24/1');assert.equal(audio.codec_name,'aac');assert.equal(subtitle.codec_name,'mov_text');assert.ok(Math.abs(+video.duration-data.duration)<.1);assert.ok(Math.abs(+audio.duration-data.duration)<.1);
 const report={passed:true,silentMouthSamples:silent,speakingMouthSamples:open,wordCount:data.words.length,captionCount:data.captions.length,deterministicSeeking:true,appOverlaysRemoved:true,chefFramingPassed:true,browserErrors:errors,streams:probe.streams.map(s=>({type:s.codec_type,codec:s.codec_name,duration:s.duration})),duration:probe.format.duration};
 await writeFile(join(out,'pipeline-checks.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
}finally{await browser.close();}

