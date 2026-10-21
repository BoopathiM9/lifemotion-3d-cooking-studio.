import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {createStaticServer,listen} from './host.mjs';
import {storyboard} from './recipes.mjs';

const server=createStaticServer(),url=await listen(server);
let browser;
try {
 browser=await chromium.launch({headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 for(const recipe of ['chicken biryani','masala dosa','vegetable sandwich','pancakes']){
  const plan=storyboard({prompt:'Make '+recipe});
  const lesson={duration:plan.actions.length*3,steps:plan.actions.map((a,i)=>({...a,start:i*3,speechEnd:i*3+2.8,end:i*3+3})),captions:[],envelope:[]};
  const page=await browser.newPage({viewport:{width:854,height:480}});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(c=>window.RENDER_CONFIG=c,{width:854,height:480,plan,lesson});
  await page.goto(url+'/studio3d/scene.html');await page.waitForFunction(()=>window.studioReady);
  // Warm the renderer once so renderer.info describes a drawn scene.
  await page.evaluate(()=>window.setFrame(0));
  const snapshots=await page.evaluate(times=>{
   const snapshot=t=>{
    const state=window.setFrame(t);
    const food=window.studio.food;
    return {state,ingredients:food.children.map(child=>({position:child.position.toArray(),scale:child.scale.toArray(),visible:child.visible})),colors:food.children.flatMap(child=>{const colors=[];child.traverse(m=>{if(m.material?.color)colors.push(m.material.color.getHex());});return colors;})};
   };
   return times.map(t=>{const before=snapshot(t);snapshot(26);snapshot(0);return {before,after:snapshot(t)};});
  },lesson.steps.map(s=>s.start+1.5));
  for(const {before,after} of snapshots){assert.deepEqual(after,before,recipe+': frame must be independent of seek history');assert.ok(before.state.webgl&&before.state.triangles>1000);if(recipe==='chicken biryani')assert.equal(before.state.foldAngle,0,'Biryani must not show a folded dosa');}
  assert.deepEqual(errors,[]);
  await page.evaluate(()=>window.studio.renderer.forceContextLoss());
  await page.waitForFunction(()=>!window.studioReady);
  await assert.rejects(page.evaluate(()=>window.setFrame(1)),/WebGL context lost/);
  await page.close();console.log(recipe+': deterministic frames and context-loss protection passed');
 }
}finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
