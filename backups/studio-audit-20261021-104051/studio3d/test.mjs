import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {join} from 'node:path';
import {storyboard,recipes} from './recipes.mjs';
import {createStudioServer} from './server.mjs';
import {root,listen} from './host.mjs';
const out=join(root,'output/studio3d/tests');await mkdir(out,{recursive:true});
for(const prompt of ['Make masala dosa','Make a vegetable sandwich','Make fluffy pancakes'])assert.ok(storyboard({prompt}).actions.length>=8);
for(const prompt of ['Make pizza','Make dosa and pancakes',''])assert.throws(()=>storyboard({prompt}));
assert.throws(()=>storyboard({prompt:'Make dosa',recipe:'pancakes'}));assert.throws(()=>storyboard({prompt:'Make dosa',format:'4:3'}));assert.throws(()=>storyboard({prompt:'Make dosa',voice:'unknown'}));
const server=await createStudioServer(),url=await listen(server),browser=await chromium.launch({headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader','--renderer-process-limit=1','--num-raster-threads=1']});
const errors=[],failed=[],results=[];
try{
 const ui=await browser.newPage({viewport:{width:1200,height:860}});ui.on('pageerror',e=>errors.push(e.message));await ui.goto(url);await ui.screenshot({path:join(out,'studio-ui.png')});
 await ui.locator('#prompt').fill('Make pizza please');await ui.locator('#generate').click();await ui.waitForFunction(()=>document.getElementById('status').textContent.includes('supported recipe'));assert.equal(await ui.locator('#generate').isDisabled(),false);
 const response=await fetch(url+'/api/generate',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({prompt:'Make sushi'})});assert.equal(response.status,400);
 const catalogue=await fetch(url+'/api/recipes').then(r=>r.json());assert.equal(catalogue.recipes.length,3);
 for(const [recipe,r] of Object.entries(recipes)){
  const page=await browser.newPage({viewport:{width:854,height:480}});page.on('pageerror',e=>errors.push(e.message));page.on('requestfailed',r=>failed.push(r.url()));
  const lesson={duration:r.actions.length*3,steps:r.actions.map(([key,text],i)=>({key,text,start:i*3,speechEnd:i*3+2.8,end:i*3+3})),captions:[],envelope:[]};
  await page.addInitScript(c=>window.RENDER_CONFIG=c,{width:854,height:480,recipe,lesson,duration:lesson.duration,preview:false});await page.goto(url+'/studio3d/scene.html');await page.waitForFunction(()=>window.studioReady);
  let count=0,maxGrip=0;
  for(let t=0;t<lesson.duration;t+=1/24){const s=await page.evaluate(t=>window.setFrame(t,false),t);assert.ok(s.perspective&&s.webgl);maxGrip=Math.max(maxGrip,s.gripError);assert.ok(s.handBottom>1.615,`${recipe}: hand intersects counter`);assert.ok(s.gripError<.025,`${recipe} hand support ${JSON.stringify(s)}`);if(s.landed){assert.ok(Math.hypot(s.food[0]-s.plate[0],s.food[2]-s.plate[2])+s.foodRadius<s.plateRadius-.04);if(s.withdraw<.001)assert.ok(Math.hypot(s.tool[0]-s.food[0],s.tool[2]-s.food[2])<.001);if(s.withdraw===1)assert.ok(Math.hypot(s.tool[0]-s.food[0],s.tool[2]-s.food[2])>.5);}count++;}
  if(recipe==='masala-dosa'){const foldStep=lesson.steps.find(s=>s.key==='fold');const f=await page.evaluate(t=>window.setFrame(t),foldStep.start+1.4);assert.ok(f.foldAngle>0&&f.foldAngle<Math.PI,'Dosa must fold continuously in 3D');await page.screenshot({path:join(out,'dosa-hinged-fold.png')});}
  await page.evaluate(t=>window.setFrame(t),lesson.duration-.6);await page.screenshot({path:join(out,recipe+'-served.png')});
  const first=await page.evaluate(()=>window.setFrame(4,false));await page.evaluate(()=>window.setFrame(20,false));const second=await page.evaluate(()=>window.setFrame(4,false));assert.deepEqual(first,second);
  results.push({recipe,frames:count,maxGripError:maxGrip,contained:true,deterministic:true});await page.close();
 }
 const portrait=await browser.newPage({viewport:{width:480,height:854}});await portrait.addInitScript(()=>window.RENDER_CONFIG={width:480,height:854,recipe:'masala-dosa',preview:true,duration:8.79});await portrait.goto(url+'/studio3d/scene.html');await portrait.waitForFunction(()=>window.studioReady);await portrait.evaluate(()=>window.setFrame(8.5));await portrait.screenshot({path:join(out,'portrait.png')});await portrait.close();
 assert.deepEqual(errors,[]);assert.deepEqual(failed,[]);const report={passed:true,promptValidation:true,unsupportedRecipeUI:true,recipeCount:3,results,portraitSceneLoaded:true,browserErrors:errors,failedRequests:failed};await writeFile(join(out,'results.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
}finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
