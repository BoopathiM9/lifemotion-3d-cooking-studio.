import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {readFile,writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {createStudioServer} from './server.mjs';
import {listen,root} from './host.mjs';
const job=JSON.parse(await readFile(join(root,'output/studio3d/tests/end-to-end.json'),'utf8')).job;
const server=await createStudioServer(),url=await listen(server),browser=await chromium.launch({headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
try{
 const page=await browser.newPage({viewport:{width:1100,height:1100}});await page.addInitScript(id=>sessionStorage.setItem('mayaJob',id),job.id);await page.goto(url);
 await page.waitForFunction(()=>{const v=document.getElementById('video');return !v.hidden&&v.readyState>=2&&Math.min(v.videoWidth,v.videoHeight)===720},{},{timeout:45000});
 assert.equal(await page.locator('#format').inputValue(),job.format);await page.locator('video').evaluate(v=>v.play());await page.waitForFunction(()=>document.getElementById('video').currentTime>.6,{},{timeout:30000});await page.locator('video').evaluate(v=>v.pause());
 await page.screenshot({path:join(root,'output/studio3d/tests/playback-verified.png')});
 const playback=await page.locator('video').evaluate(v=>({width:v.videoWidth,height:v.videoHeight,time:v.currentTime,duration:v.duration,readyState:v.readyState,error:v.error?.message||null}));assert.ok(!playback.error);assert.ok(playback.time>.6);
 const [download]=await Promise.all([page.waitForEvent('download'),page.locator('#download').click()]);assert.ok(download.suggestedFilename().endsWith('.mp4'));const failure=await download.failure();assert.equal(failure,null);
 const report={passed:true,job:job.id,actualHTML5Playback:playback,actualDownloadCompleted:true,downloadFilename:download.suggestedFilename()};await writeFile(join(root,'output/studio3d/tests/playback.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
}finally{await browser.close();await new Promise(r=>server.close(r));}
