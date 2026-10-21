import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {join} from 'node:path';
import {storyboard,recipes} from './recipes.mjs';
import {createStudioServer} from './server.mjs';
import {root,listen} from './host.mjs';
const out=join(root,'output/studio3d/tests');await mkdir(out,{recursive:true});
for(const prompt of ['Make masala dosa','Make a vegetable sandwich','Make vegetable sandwiches','Make fluffy pancakes','Make chicken biryani','Make tomato pasta','Make vegetable fried rice'])assert.ok(storyboard({prompt}).actions.length>=8);
assert.throws(()=>storyboard({prompt:''}));
assert.throws(()=>storyboard({prompt:'Make dosa',recipe:'pancakes'}));assert.throws(()=>storyboard({prompt:'Make dosa',format:'4:3'}));assert.throws(()=>storyboard({prompt:'Make dosa',voice:'unknown'}));
const server=await createStudioServer(),url=await listen(server),browser=await chromium.launch({headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader','--renderer-process-limit=1','--num-raster-threads=1']});
const errors=[],failed=[],results=[];
try{
 const ui=await browser.newPage({viewport:{width:1200,height:860}});ui.on('pageerror',e=>errors.push(e.message));await ui.goto(url);await ui.screenshot({path:join(out,'studio-ui.png')});
 await ui.locator('#prompt').fill('Make vegetable fried rice');await ui.locator('#generate').click();assert.equal(await ui.locator('#generate').isDisabled(),false);
 const response=await fetch(url+'/api/generate',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({prompt:''})});assert.equal(response.status,400);
 const catalogue=await fetch(url+'/api/recipes').then(r=>r.json());assert.ok(catalogue.recipes.length>=3);
 for(const recipe of ['masala-dosa','vegetable-sandwich','pancakes']){const r=recipes[recipe];
  const page=await browser.newPage({viewport:{width:854,height:480}});page.on('pageerror',e=>errors.push(e.message));page.on('requestfailed',r=>failed.push(r.url()));
  const lesson={duration:r.actions.length*3,steps:r.actions.map(([key,text],i)=>({key,text,start:i*3,speechEnd:i*3+2.8,end:i*3+3})),captions:[],envelope:[]};
  await page.addInitScript(c=>window.RENDER_CONFIG=c,{width:854,height:480,recipe,lesson,duration:lesson.duration,preview:false,plan:storyboard({prompt:'Make '+r.name})});await page.goto(url+'/studio3d/scene.html');await page.waitForFunction(()=>window.studioReady);
  let count=0,maxGrip=0;
  for(let t=0;t<lesson.duration;t+=1/24){const s=await page.evaluate(t=>window.setFrame(t,false),t);assert.ok(s.perspective&&s.webgl);maxGrip=Math.max(maxGrip,s.gripError);if(recipe==='vegetable-sandwich'){assert.equal(s.steamVisible,false,'A cold sandwich must not steam');assert.ok(s.spreadHeight<=.02,'Chutney must remain a thin layer');}assert.ok(s.handBottom>1.615,`${recipe}: hand intersects counter`);assert.ok(s.gripError<.025,`${recipe} hand support ${JSON.stringify(s)}`);if(recipe==='pancakes'&&s.key==='fold')assert.ok(s.foodBottom>1.83,'Pancake must clear the tawa throughout its half-turn');if(s.landed){if(s.withdraw<.001)assert.ok(Math.abs(s.bladeTop-s.foodBottom)<.012,'Spatula must support food from below');assert.ok(Math.hypot(s.food[0]-s.plate[0],s.food[2]-s.plate[2])+s.foodRadius<s.plateRadius-.04);if(s.withdraw<.001)assert.ok(Math.hypot(s.tool[0]-s.food[0],s.tool[2]-s.food[2])<.001);if(s.withdraw===1)assert.ok(Math.hypot(s.tool[0]-s.food[0],s.tool[2]-s.food[2])>.5);}count++;}
  if(recipe==='masala-dosa'){const foldStep=lesson.steps.find(s=>s.key==='fold');const f=await page.evaluate(t=>window.setFrame(t),foldStep.start+1.4);assert.ok(f.foldAngle>0&&f.foldAngle<Math.PI,'Dosa must fold continuously in 3D');await page.screenshot({path:join(out,'dosa-hinged-fold.png')});}
  await page.evaluate(t=>window.setFrame(t),lesson.duration-.6);await page.screenshot({path:join(out,recipe+'-served.png')});
  const first=await page.evaluate(()=>window.setFrame(4,false));await page.evaluate(()=>window.setFrame(20,false));const second=await page.evaluate(()=>window.setFrame(4,false));assert.deepEqual(first,second);
  results.push({recipe,frames:count,maxGripError:maxGrip,contained:true,deterministic:true});await page.close();
 }
 const measured=JSON.parse(await readFile(join(root,'studio3d/fixtures/dosa-timing.json'),'utf8'));
 const timed=await browser.newPage({viewport:{width:854,height:480}});
 await timed.addInitScript(c=>window.RENDER_CONFIG=c,{width:854,height:480,lesson:measured,recipe:'masala-dosa',plan:storyboard({prompt:'Make Masala Dosa'})});
 await timed.goto(url+'/studio3d/scene.html');await timed.waitForFunction(()=>window.studioReady);
 const serving=measured.segments.filter(s=>s.key==='serve');
 const landing=await timed.evaluate(t=>window.setFrame(t,false),serving[0].end);assert.ok(landing.landed,'Land by the end of the serving sentence');
 const withdrawal=await timed.evaluate(t=>window.setFrame(t,false),serving[1].end);assert.equal(withdrawal.withdraw,1,'Withdraw by the end of the withdrawal sentence');
 const folding=measured.segments.filter(s=>s.key==='fold');
 const beforeFold=await timed.evaluate(t=>window.setFrame(t,false),folding[0].end);assert.ok(beforeFold.foldAngle<.001,'Slide under food before lifting');
 for(const [label,time] of [['serving-start',serving[0].start],['serving-airborne',serving[0].start+1],['serving-landed',serving[0].end],['spatula-withdrawn',serving[1].end]]){await timed.evaluate(t=>window.setFrame(t),time);await timed.screenshot({path:join(out,label+'.png')});}
 await timed.close();
 const portrait=await browser.newPage({viewport:{width:480,height:854}});await portrait.addInitScript(()=>window.RENDER_CONFIG={width:480,height:854,recipe:'masala-dosa',preview:true,duration:8.79,plan:storyboard({prompt:'Make Masala Dosa'})});await portrait.goto(url+'/studio3d/scene.html');await portrait.waitForFunction(()=>window.studioReady);await portrait.evaluate(()=>window.setFrame(8.5));await portrait.screenshot({path:join(out,'portrait.png')});await portrait.close();
 assert.deepEqual(errors,[]);assert.deepEqual(failed,[]);const report={passed:true,sentenceActionTiming:true,promptValidation:true,unsupportedRecipeUI:true,recipeCount:3,results,portraitSceneLoaded:true,browserErrors:errors,failedRequests:failed};await writeFile(join(out,'results.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
}finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
