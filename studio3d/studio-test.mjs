import assert from 'node:assert/strict';
import test from 'node:test';
import {chromium} from 'playwright';
import {mkdir} from 'node:fs/promises';
import {join} from 'node:path';
import {createStudioServer} from './server.mjs';
import {listen,root} from './host.mjs';
import {findPython,browserLaunchOptions} from './runtime.mjs';

const missing={ready:false,checks:[{id:'python',label:'Python',ok:false,message:'Python was not found. Install it and restart the studio.',fix:'winget install --id Python.Python.3.12 -e --source winget'}],python:null};
const post=body=>({method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});

test('Windows Python launcher is preferred over the Microsoft Store alias',()=>{
 const attempts=[];
 const python=findPython({platform:'win32',env:{},exists:()=>false,run:(command,args)=>{
  attempts.push({command,args});
  return command==='py'?{status:0,stdout:JSON.stringify({version:[3,12,7],edgeTts:true})}:{status:9009};
 }});
 assert.equal(python.command,'py');assert.deepEqual(python.args,['-3']);assert.equal(attempts.length,1);
});
test('Python selection prefers an interpreter with speech dependencies',()=>{
 const python=findPython({platform:'linux',env:{},exists:()=>false,run:command=>({status:0,stdout:JSON.stringify({version:[3,12,7],edgeTts:command==='python3'})})});
 assert.equal(python.command,'python3');
});
test('an explicit Python path is respected and invalid paths do not use an unexpected fallback',()=>{
 let attempts=0;
 const python=findPython({platform:'win32',env:{LIFEMOTION_PYTHON:'C:\\Tools\\Python\\python.exe'},exists:()=>false,run:()=>{attempts++;return {status:1};}});
 assert.equal(python,null);assert.equal(attempts,1);
});

test('recipe preview accepts the exact biriyani prompt; missing tools block generation without creating a job',async()=>{
 const server=await createStudioServer({runtimeInspector:()=>missing}),url=await listen(server);
 try{
  const before=await fetch(url+'/api/jobs').then(r=>r.json());
  const input={prompt:'Teach children how to make chicken biriyani step by step in simple English.'};
  const plan=await fetch(url+'/api/plan',post(input)).then(r=>r.json());
  assert.equal(plan.recipe,'chicken-biryani');assert.equal(plan.generic,false);assert.equal(plan.steps.length,9);assert.ok(plan.ingredients.includes('Chicken Pieces'));
  const generic=await fetch(url+'/api/plan',post({prompt:'Make Galactic Space Crunch'})).then(r=>r.json());assert.equal(generic.generic,true);assert.match(generic.limitations,/generic/i);
  const response=await fetch(url+'/api/generate',post(input));assert.equal(response.status,503);const failed=await response.json();assert.equal(failed.setup.ready,false);assert.doesNotMatch(failed.error,/Traceback|C:\\/);
  const after=await fetch(url+'/api/jobs').then(r=>r.json());assert.deepEqual(after,before);
  assert.equal((await fetch(url+'/api/plan',post({prompt:'x'.repeat(2001)}))).status,400);
 }finally{await new Promise(resolve=>server.close(resolve));}
});

test('the website works on desktop and mobile, exposes recipe commands, and guides missing setup',async()=>{
 const server=await createStudioServer({runtimeInspector:()=>missing}),url=await listen(server);
 const browser=await chromium.launch(browserLaunchOptions());
 try{
  const page=await browser.newPage({viewport:{width:1440,height:1100}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(url);await page.waitForFunction(()=>document.getElementById('toolStatus').textContent==='Setup needed');
  assert.equal(await page.locator('#setupPanel').isVisible(),true);assert.equal(await page.locator('#generate').isDisabled(),true);
  assert.match(await page.locator('#setupChecks').innerText(),/winget install/);
  await page.locator('#prompt').fill('Teach children how to make chicken biriyani step by step in simple English.');
  await page.locator('#previewPlan').click();await page.waitForFunction(()=>!document.getElementById('planPanel').hidden);
  assert.equal(await page.locator('#planTitle').innerText(),'Chicken Biryani');assert.equal(await page.locator('#planSteps li').count(),9);
  await page.getByRole('button',{name:'Use Fluffy Pancakes recipe',exact:true}).click();
  assert.match(await page.locator('#prompt').inputValue(),/pancakes/i);
  await page.setViewportSize({width:390,height:844});
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,'Mobile layout must not scroll horizontally');
  await page.locator('#previewPlan').click();await page.waitForFunction(()=>document.getElementById('planTitle').textContent==='Fluffy Pancakes');
  assert.deepEqual(errors,[]);
 }finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
});

test('a healthy studio displays the redesigned desktop and mobile layouts',async()=>{
 const healthy={ready:true,checks:[{id:'python',label:'Python',ok:true,message:'Python is available'}]};
 const server=await createStudioServer({runtimeInspector:()=>healthy}),url=await listen(server);
 const browser=await chromium.launch(browserLaunchOptions());
 try{
  const page=await browser.newPage({viewport:{width:1440,height:1100}});
  await page.goto(url);await page.waitForFunction(()=>!document.getElementById('generate').disabled);
  assert.equal(await page.locator('#setupPanel').isVisible(),false);
  assert.equal(await page.locator('.recipe-card').count(),10);
  assert.equal(await page.locator('h1').count(),1);
  const images=await page.locator('img').evaluateAll(images=>images.every(i=>i.complete&&i.naturalWidth>0));assert.ok(images,'The kitchen image must load');
  const out=join(root,'output/studio3d/ui-review');await mkdir(out,{recursive:true});
  await page.screenshot({path:join(out,'desktop.png'),fullPage:true});
  await page.setViewportSize({width:390,height:844});await page.screenshot({path:join(out,'mobile.png'),fullPage:true});
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
 }finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
});
