import {readFile,writeFile,mkdir,readdir,stat} from 'node:fs/promises';
import {createReadStream} from 'node:fs';
import {join} from 'node:path';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {createStaticServer,root} from './host.mjs';
import {recipes,voices,storyboard} from './recipes.mjs';
import {inspectRuntime,publicRuntime,generationFailure} from './runtime.mjs';
import {analyzeWithBedrock,analyzeWithGemini,enrichWithFreeRecipe,translateActionsToTamil,translateActionsWithFreeService,translateActionsWithLocalTamil} from './free-recipe-lookup.mjs';

try { process.loadEnvFile(); } catch {}

export async function createStudioServer({runtimeInspector=inspectRuntime}={}){

 const jobs=new Map();let busy=false,cachedRuntime,runtimeTime=0;
 const server=createStaticServer(),staticHandler=server.listeners('request')[0];
 server.removeAllListeners('request');
 const base=join(root,'output/studio3d/jobs');await mkdir(base,{recursive:true});
 const setup=(refresh=false)=>{
  if(refresh||!cachedRuntime||Date.now()-runtimeTime>30000){cachedRuntime=runtimeInspector();runtimeTime=Date.now();}
  return cachedRuntime;
 };
 const persist=job=>writeFile(join(base,job.id,'status.json'),JSON.stringify(job,null,2));
 const jobTime=job=>Date.parse(job.createdAt)||Number(job.id.match(/^job-(\d+)-/)?.[1])||0;
 const view=job=>({...job,message:job.status==='failed'?generationFailure(Error(job.failureDetail||job.message),job.phase||'narration'):job.message,failureDetail:undefined});
 async function command(cmd,args,job,phase){
  job.phase=phase;
  await new Promise((resolve,reject)=>{
   const child=spawn(cmd,args,{cwd:root,stdio:['ignore','pipe','pipe'],windowsHide:true});let tail='';
   const log=buffer=>{
    const text=buffer.toString();tail=(tail+text).slice(-6000);
    const match=text.match(/Rendering Remotion (\d+)\/(\d+)/);
    if(match){job.progress=Math.round((phase==='preview'?12:30)+Number(match[1])/Number(match[2])*(phase==='preview'?15:65));job.message=phase==='preview'?'Rendering your short preview':'Animating and encoding your full film';}
    if(phase==='narration'&&text.includes('Narration:')){job.narratedSegments=(job.narratedSegments||0)+(text.match(/Narration:/g)||[]).length;job.message=`Recording sentence ${job.narratedSegments} of ${job.totalSegments}`;}
   };
   child.stdout.on('data',log);child.stderr.on('data',log);
   child.once('error',reject);
   child.once('close',code=>code===0?resolve():reject(Error(tail||`${phase} exited with code ${code}`)));
  });
 }
 async function generate(job,python){
  try{
   const dir=join(base,job.id);job.status='narration';job.progress=3;job.message='Preparing your narration';await persist(job);
   await command(python.command,[...python.args,'studio3d/narrate.py',dir],job,'narration');
   job.status='preview';job.progress=12;job.message='Creating your first look';await persist(job);
   await command(process.execPath,['--max-old-space-size=512','studio3d/render.mjs','--job='+dir],job,'preview');
   job.previewUrl=`/media/${job.id}/preview`;job.status='rendering';job.progress=30;job.message='Your preview is ready. Rendering the full film';await persist(job);
   await command(process.execPath,['--max-old-space-size=512','studio3d/render.mjs','--full','--job='+dir],job,'final');
   job.status='complete';job.progress=100;job.videoUrl=`/media/${job.id}/final`;job.message='Your cooking film is ready to watch and download.';
  }catch(error){job.status='failed';job.failureDetail=String(error.message);job.message=generationFailure(error,job.phase);}
  finally{busy=false;job.updatedAt=new Date().toISOString();await persist(job);}
 }
 server.on('request',async(req,res)=>{
  const url=new URL(req.url,'http://localhost');
  const json=(status,value)=>{res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(value));};
  try{
   if(req.method==='GET'&&url.pathname==='/'){res.writeHead(200,{'Content-Type':'text/html','Cache-Control':'no-store'});res.end(await readFile(join(root,'studio3d/index.html')));return;}
   if(req.method==='GET'&&url.pathname==='/api/health'){json(200,{application:'lifemotion-studio',ready:true});return;}
   if(req.method==='GET'&&url.pathname==='/api/setup'){json(200,publicRuntime(setup(url.searchParams.has('refresh'))));return;}
   if(req.method==='GET'&&url.pathname==='/api/recipes'){json(200,{recipes:Object.entries(recipes).map(([id,r])=>({id,name:r.name,prompt:`Teach children how to make ${r.title.toLowerCase()} step by step in simple English.`})),voices,formats:['16:9','9:16'],busy});return;}
   if(req.method==='GET'&&url.pathname==='/api/jobs'){json(200,{busy,jobs:[...jobs.values()].sort((a,b)=>jobTime(b)-jobTime(a)).slice(0,12).map(view)});return;}
   if(req.method==='GET'&&url.pathname.startsWith('/api/jobs/')){const job=jobs.get(url.pathname.split('/').at(-1));json(job?200:404,job?view(job):{error:'This video is no longer available. Create a new film.'});return;}
   if(req.method==='POST'&&['/api/plan','/api/generate'].includes(url.pathname)){
    if(req.headers.origin&&req.headers.origin!==`http://${req.headers.host}`){json(403,{error:'Use the local studio page to create videos.'});return;}
    let body='';for await(const chunk of req){body+=chunk;if(Buffer.byteLength(body)>8192){json(413,{error:'Your recipe is too long. Use up to 2000 characters.'});return;}}
    if(url.pathname==='/api/generate'&&busy){json(409,{error:'A film is already being created. Please wait for it to finish.'});return;}
    let input,plan,source='local';try{input=JSON.parse(body);plan=storyboard(input);const hasBedrockKey=Boolean(process.env.AWS_ACCESS_KEY_ID?.trim() || process.env.BEDROCK_ENABLED === 'true' || process.env.AWS_PROFILE);
     if(hasBedrockKey&&typeof input.prompt==='string'&&!input.prompt.trim().startsWith('{')){
      const bedrockRecipe=await analyzeWithBedrock(input.prompt);
      if(bedrockRecipe){try{plan=storyboard({...input,prompt:bedrockRecipe});source='Studio Plan';}catch{}}
     }
     if(plan.genericVisualization){
      const enriched=await enrichWithFreeRecipe(input.prompt);
      if(enriched){try{plan=storyboard({...input,prompt:enriched});source='MealDB Recipe';}catch{source='local';}}
     }
     if(input.voice==='ta-IN-PallaviNeural'){
      const tamil=await translateActionsToTamil(plan.actions)||await translateActionsWithFreeService(plan.actions)||translateActionsWithLocalTamil(plan.actions,plan.title);
      plan.actions.forEach((action,index)=>{action.text=tamil[index];action.sentences=[tamil[index]];});
      if(!plan.title.includes('(')&&!plan.title.includes('செய்முறை')){
        plan.title=`${plan.title} (செய்முறை)`;
      }
      source=source==='local'?'Tamil narration':source;
     }
    }catch(error){json(400,{error:error instanceof SyntaxError?'The recipe request could not be read. Please try again.':error.message});return;}
    if(url.pathname==='/api/plan'){json(200,{title:plan.title,recipe:plan.recipe,generic:plan.genericVisualization,source,limitations:plan.genericVisualization?'Generic cooking visualization. Add more recipe details to customize your video.':null,steps:plan.actions.map(a=>({key:a.key,text:a.text,action:a.action})),ingredients:plan.ingredients.map(i=>i.name)});return;}
    if(busy){json(409,{error:'A film is already being created. Please wait for it to finish.'});return;}
    const runtime=setup();
    if(!runtime.ready){json(503,{error:'Finish the setup checks before creating a film.',setup:publicRuntime(runtime)});return;}
    busy=true;
    const id='job-'+Date.now()+'-'+Math.random().toString(36).slice(2,7),dir=join(base,id);
    try{await mkdir(dir,{recursive:true});await writeFile(join(dir,'storyboard.json'),JSON.stringify(plan,null,2));}catch(error){busy=false;throw error;}
    const job={id,recipe:plan.recipe,title:plan.title,generic:plan.genericVisualization,format:plan.format,voice:plan.voice,prompt:plan.prompt||plan.title,status:'queued',progress:0,message:'Your film is queued',totalSegments:plan.actions.reduce((n,a)=>n+a.sentences.length,0),createdAt:new Date().toISOString()};
    jobs.set(id,job);json(202,view(job));void generate(job,runtime.python);return;
   }
   if(req.method==='GET'&&url.pathname.startsWith('/media/')){
    const [,prefix,id,type]=url.pathname.split('/');const job=jobs.get(id);
    if(!job||!['preview','final'].includes(type)||!(type==='final'?job.videoUrl:job.previewUrl)){res.writeHead(404);res.end();return;}
    const file=join(base,id,type,type==='final'?'maya-cooking-complete.mp4':'maya-cooking-preview.mp4'),size=(await stat(file)).size,range=req.headers.range;
    const headers={'Content-Type':'video/mp4','Accept-Ranges':'bytes'};
    if(url.searchParams.has('download'))headers['Content-Disposition']=`attachment; filename="maya-${job.recipe}-${job.format.replace(':','x')}.mp4"`;
    if(range){const match=/^bytes=(\d+)-(\d*)$/.exec(range);if(!match){res.writeHead(416,{'Content-Range':`bytes */${size}`});res.end();return;}
     const start=Number(match[1]),end=Math.min(size-1,match[2]?Number(match[2]):size-1);
     if(start>=size||end<start){res.writeHead(416,{'Content-Range':`bytes */${size}`});res.end();return;}
     res.writeHead(206,{...headers,'Content-Range':`bytes ${start}-${end}/${size}`,'Content-Length':end-start+1});createReadStream(file,{start,end}).pipe(res);
    }else{res.writeHead(200,{...headers,'Content-Length':size});createReadStream(file).pipe(res);}return;
   }
   if(req.method!=='GET'){json(405,{error:'Method not allowed'});return;}staticHandler(req,res);
  }catch{if(!res.headersSent)json(500,{error:'The studio could not finish this request. Please try again.'});else res.end();}
 });
 for(const name of await readdir(base)){
  try{
   const job=JSON.parse(await readFile(join(base,name,'status.json'),'utf8'));
   if(job.id!==name)continue;
   if(!['complete','failed'].includes(job.status)){job.status='failed';job.message='The studio restarted before this film finished. Create the film again.';job.phase='interrupted';}
   jobs.set(job.id,job);
  }catch{}
 }
 return server;
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 const server=await createStudioServer(),port=Number(process.env.LIFEMOTION_PORT||4173);
 if(!Number.isInteger(port)||port<1||port>65535){console.error('LIFEMOTION_PORT must be an integer from 1 to 65535.');process.exitCode=1;}
 else{
  const address=`http://127.0.0.1:${port}`;
  server.once('error',async error=>{
   if(error.code==='EADDRINUSE'){
    try{const response=await fetch(address+'/api/health',{signal:AbortSignal.timeout(2000)});const health=await response.json();if(response.ok&&health.application==='lifemotion-studio'&&health.ready===true){console.log(`LifeMotion is already running. Open ${address}`);return;}}catch{}
    console.error(`Port ${port} is already in use. Stop the existing server, then run npm run studio again.`);
   }else console.error(`Failed to start server: ${error.message}`);
   process.exitCode=1;
  });
  server.listen(port,'127.0.0.1',()=>{
    console.log(`LifeMotion Cooking Studio: ${address}`);
    if (process.env.AWS_ACCESS_KEY_ID?.trim() || process.env.BEDROCK_ENABLED === 'true') {
      console.log(`✓ Amazon Bedrock (GenAI): Active (${process.env.BEDROCK_MODEL_ID || 'amazon.nova-micro-v1:0'})`);
    } else {
      console.log(`ℹ To use Amazon Bedrock GenAI as your recipe planner, set AWS credentials in .env: BEDROCK_MODEL_ID=amazon.nova-micro-v1:0`);
    }
   });
 }
}
