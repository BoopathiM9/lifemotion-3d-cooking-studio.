import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {pathToFileURL} from 'node:url';
import vm from 'node:vm';
const root=resolve(import.meta.dirname,'..'),qa=join(root,'output/qa');await mkdir(qa,{recursive:true});
const html=await readFile(join(root,'animation/scene.html'),'utf8');
for(const match of html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g))if(match[1].trim())new vm.Script(match[1]);
const data=JSON.parse(await readFile(join(root,'output/cooking-lesson/lesson.json'),'utf8'));
const normalize=s=>s.toLowerCase().replace(/[^a-z0-9]/g,'');
assert.deepEqual(data.words.map(w=>normalize(w.text)),data.steps.flatMap(s=>s.text.split(/\s+/).map(normalize)),'Every narrated word must have a subtitle timing');
assert.deepEqual(data.captions.flatMap(c=>c.text.split(/\s+/).map(normalize)),data.words.map(w=>normalize(w.text)),'Subtitles must cover every word once');
const errors=[],failures=[],consoleErrors=[],browser=await chromium.launch({headless:true,args:['--disable-gpu']});
let serveFrames=0,landedFrames=0,maxEllipse=0,maxJump=0,checkedFrames=0;
try{
 const page=await browser.newPage({viewport:{width:1280,height:720}});
 page.on('pageerror',e=>errors.push(e.message));page.on('requestfailed',r=>failures.push({url:r.url(),error:r.failure()}));page.on('console',m=>{if(m.type()==='error')consoleErrors.push(m.text())});
 await page.goto(pathToFileURL(join(root,'animation/scene.html')).href);await page.evaluate(()=>document.fonts.ready);
 const required=['stage','faceRig','eyes','gaze','mouthHole','tongue','smile','leftHand','arm','hand','tool','spatula','ladle','food','folded','dosa','plateInner','chutney','filling','steam','stoveLight'];
 for(const id of required)assert.equal(await page.locator('#'+id).count(),1,`Required element ${id}`);
 const snaps=[['intro',1.8],...data.steps.slice(1).map(s=>[s.key,s.start+(s.speechEnd-s.start)*.65]),['pour-active',data.steps[3].start+5.75],['fill-scoop',data.steps[6].start+1.4],['fold-start',data.steps[7].start+4.76],['fold-mid',data.steps[7].start+5.3],['fold-end',data.steps[7].end-.01],['final',data.duration-.03]];
 const serving=data.steps.at(-1);for(const seconds of [0,.15,.4,.8,1.2,1.6,1.9,2,2.3,2.8,3.4,5,9])snaps.push([`serve-${seconds.toFixed(2)}`,serving.start+seconds]);
 for(const [name,time] of snaps){await page.evaluate(t=>window.setFrame(t),time);await page.screenshot({path:join(qa,`${name}.png`)});}
 let previous=null;
 for(let i=0;i<Math.ceil(data.duration*24);i++){
  const t=Math.min(data.duration-.001,i/24);await page.evaluate(t=>window.setFrame(t),t);
  const state=await page.evaluate(()=>{
   const $=id=>document.getElementById(id),s=window.frameState,rect=$('caption').getBoundingClientRect(),plate=$('plateInner'),path=$('folded'),matrix=path.getScreenCTM(),inverse=plate.getScreenCTM().inverse();
   let ellipse=0,chutneyClear=true;
   if(s.key==='serve'){
    const length=path.getTotalLength();
    for(let n=0;n<=96;n++){
     const pt=path.getPointAtLength(length*n/96),p=new DOMPoint(pt.x,pt.y).matrixTransform(matrix).matrixTransform(inverse);
     // Include the food stroke as four offset samples, rather than just the path centerline.
     for(const [dx,dy] of [[0,0],[-1.5,0],[1.5,0],[0,-1.5],[0,1.5]])ellipse=Math.max(ellipse,((p.x+dx-1100)/144)**2+((p.y+dy-551)/36)**2);
     if(((p.x-1215)/21)**2+((p.y-530)/14)**2<1)chutneyClear=false;
    }
   }
   return {...s,ellipse,chutneyClear,headTop:$('faceRig').getBoundingClientRect().top,captionFits:!$('caption').textContent||(rect.left>=0&&rect.right<=1280&&rect.bottom<=720&&$('caption').scrollWidth<=$('caption').clientWidth),foodAbovePlate:!!(plate.compareDocumentPosition(path)&Node.DOCUMENT_POSITION_FOLLOWING),stoveOff:$('stoveLight').getAttribute('fill')==='#a7b1a2'};
  });checkedFrames++;
  assert.ok(state.headTop>=0,`Chef cropped at ${t}`);assert.ok(state.captionFits,`Subtitle clipped at ${t}`);
  if(previous){const jump=Math.hypot((state.x+state.shift)-(previous.x+previous.shift),state.y-previous.y);maxJump=Math.max(maxJump,jump);assert.ok(jump<35,`Wrist jumps ${jump}px at ${t}`);}
  if(state.key==='serve'){
   serveFrames++;assert.ok(state.foodAbovePlate,'Plate must not occlude the food');
   const e=t-serving.start;
   if(e>=2){landedFrames++;maxEllipse=Math.max(maxEllipse,state.ellipse);assert.ok(state.ellipse<=1,`Dosa outside plate inner ellipse (${state.ellipse}) at ${t}`);assert.ok(state.chutneyClear,`Dosa overlaps chutney at ${t}`);assert.ok(Math.abs(state.foodX-1095)<.00001&&Math.abs(state.foodY-554)<.00001,'Landed food must stay still');}
   if(e>=3.25)assert.ok(state.withdraw===1,'Spatula must withdraw after plating');if(e>=3.2)assert.ok(state.stoveOff,'Stove indicator must be off');
   if(e<=2.1){assert.ok(Math.abs(state.x+state.shift-state.foodX)<.001,'Spatula must support moving food');}
  }
  previous=state;
 }
 assert.deepEqual(errors,[]);assert.deepEqual(failures,[]);assert.deepEqual(consoleErrors,[]);
 const report={passed:true,inlineJavaScriptSyntax:true,requiredElements:required.length,checkedFrames,serveFrames,landedFrames,maxPlateEllipseValue:maxEllipse,plateLimit:1,maxWristJumpPixels:maxJump,allNarrationWordsCaptioned:true,failedRequests:failures,browserErrors:errors,consoleErrors,screenshots:snaps.length,transferNote:'Food travels above the counter on its spatula, then is fully contained inside the plate from 2.0 seconds into serving onward.'};
 await writeFile(join(qa,'scene-regression.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
}finally{await browser.close();}
