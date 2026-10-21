import {chromium} from 'playwright';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {pathToFileURL} from 'node:url';
const root=resolve(import.meta.dirname,'..'),qa=join(root,'output','qa');await mkdir(qa,{recursive:true});
const data=JSON.parse(await readFile(join(root,'output/cooking-lesson/lesson.json'),'utf8'));
const browser=await chromium.launch({headless:true,args:['--disable-gpu']});try{
 const page=await browser.newPage({viewport:{width:1280,height:720}});await page.goto(pathToFileURL(join(root,'animation/scene.html')).href);
 const serve=data.steps.at(-1),results=[];
 for(const p of [0,.15,.3,.45,.6,.8,1]){const t=serve.start+(serve.speechEnd-serve.start)*p;await page.evaluate(t=>window.setFrame(t),t);await page.screenshot({path:join(qa,`before-serve-${Math.round(p*100)}.png`)});results.push(await page.evaluate(()=>({state:window.frameState,foodTransform:document.getElementById('food').getAttribute('transform'),foldedBox:document.getElementById('folded').getBBox().toJSON?.()||null,foodScreen:document.getElementById('folded').getBoundingClientRect().toJSON()})));}
 await writeFile(join(qa,'before-serving.json'),JSON.stringify(results,null,2));
 for(const step of data.steps){console.log(step.key,step.start.toFixed(2),step.speechEnd.toFixed(2));console.log(data.words.filter(w=>w.start>=step.start&&w.start<step.speechEnd).map(w=>`${w.text}@${(w.start-step.start).toFixed(1)}`).join(' '));}
}finally{await browser.close();}
