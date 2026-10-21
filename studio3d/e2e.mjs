import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {readFile,writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
import {createStudioServer} from './server.mjs';
import {listen,root} from './host.mjs';
import {browserLaunchOptions} from './runtime.mjs';
const recipe=process.argv.find(a=>a.startsWith('--recipe='))?.slice(9)||'masala-dosa',format=process.argv.find(a=>a.startsWith('--format='))?.slice(9)||'9:16';
const server=await createStudioServer(),url=await listen(server),browser=await chromium.launch(browserLaunchOptions());
try{
 const page=await browser.newPage({viewport:{width:1100,height:900}});const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto(url);
 await page.locator('#prompt').fill(`Make a cheerful 3D cartoon cooking video where MAYA makes ${recipe.replaceAll('-',' ')} in simple English.`);await page.locator('#format').selectOption(format);
 const submitted=page.waitForResponse(r=>r.url().endsWith('/api/generate')&&r.request().method()==='POST');await page.locator('#generate').click();const r=await submitted;assert.equal(r.status(),202);let job=await r.json();console.log('Website generation job:',job.id);const busy=await fetch(url+'/api/generate',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({prompt:`Make ${recipe.replaceAll('-',' ')}`})});assert.equal(busy.status,409,'Reject overlapping generation');
 const start=Date.now();let last='',sawPreview=false;
 while(job.status!=='complete'){
  assert.notEqual(job.status,'failed',job.message);if(Date.now()-start>20*60*1000)throw Error('Generation exceeded 20 minute test limit');
  await new Promise(r=>setTimeout(r,2500));job=await fetch(url+'/api/jobs/'+job.id).then(r=>r.json());if(job.previewUrl&&job.status==='rendering')sawPreview=true;const message=job.status+' '+job.progress+'%';if(message!==last){console.log(message);last=message;}
 }
 await page.waitForFunction(()=>!document.getElementById('download').hidden);await page.screenshot({path:join(root,'output/studio3d/jobs',job.id,'generated-website.png')});
 const range=await fetch(url+job.videoUrl,{headers:{Range:'bytes=0-1023'}});assert.equal(range.status,206);assert.equal((await range.arrayBuffer()).byteLength,1024);
 const download=await fetch(url+job.videoUrl+'?download=1',{method:'GET',headers:{Range:'bytes=0-1'}});assert.ok(download.headers.get('content-disposition').includes('attachment'));
 const dir=join(root,'output/studio3d/jobs',job.id),lesson=JSON.parse(await readFile(join(dir,'lesson.json'),'utf8')),report=JSON.parse(await readFile(join(dir,'final/validation.json'),'utf8'));
 assert.ok(lesson.segments.length>=8);for(const s of lesson.segments){assert.ok(s.measuredAudioDuration>0);assert.ok(Math.abs(s.end-s.start-s.measuredAudioDuration)<.001);}
 assert.equal(report.width,format==='9:16'?720:1280);assert.equal(report.height,format==='9:16'?1280:720);assert.ok(sawPreview,'Preview must be available before final completion');const previewReport=JSON.parse(await readFile(join(dir,'preview/media-checks.json'),'utf8'));const finalReport=JSON.parse(await readFile(join(dir,'final/media-checks.json'),'utf8'));assert.ok(previewReport.passed&&finalReport.passed&&finalReport.subtitleTimingChecked);assert.equal(report.fps,24);assert.equal(report.passed,true);assert.equal(report.maxGripError,0);
 const streams=report.media.streams;assert.ok(streams.some(s=>s.codec_name==='aac'));assert.ok(streams.some(s=>s.codec_name==='mov_text'));assert.ok(Math.abs(Number(report.media.format.duration)-lesson.duration)<.1);assert.deepEqual(errors,[]);
 await writeFile(join(root,'output/studio3d/jobs',job.id,'end-to-end.json'),JSON.stringify({passed:true,job,output:report.output,sentenceSegments:lesson.segments.length,duration:lesson.duration,format,busySubmissionRejected:true,previewFirst:sawPreview,mediaVerification:true,rangeRequests:true,downloadHeaders:true,browserErrors:errors},null,2));console.log('END-TO-END WEBSITE PASSED:',report.output);
}finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
