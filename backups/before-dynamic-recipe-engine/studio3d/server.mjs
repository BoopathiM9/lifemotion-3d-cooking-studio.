import {readFile,writeFile,mkdir,readdir,stat} from 'node:fs/promises';
import {createReadStream} from 'node:fs';
import {join} from 'node:path';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {createStaticServer,root} from './host.mjs';
import {recipes,voices,storyboard} from './recipes.mjs';
export async function createStudioServer(){
 const jobs=new Map();let busy=false;const staticServer=createStaticServer(),staticHandler=staticServer.listeners('request')[0];staticServer.removeAllListeners('request');
 const base=join(root,'output/studio3d/jobs');await mkdir(base,{recursive:true});
 async function persist(job){await writeFile(join(base,job.id,'status.json'),JSON.stringify(job,null,2));}
 async function command(cmd,args,job,phase){await new Promise((resolve,reject)=>{
  const p=spawn(cmd,args,{cwd:root,stdio:['ignore','pipe','pipe']});let tail='';
  const log=buffer=>{const text=buffer.toString();tail=(tail+text).slice(-6000);job.message=text.trim().slice(-200);const m=text.match(/Rendering 3D (\d+)\/(\d+)/);if(m)job.progress=Math.round((phase==='preview'?12:30)+Number(m[1])/Number(m[2])*(phase==='preview'?15:65));};
  p.stdout.on('data',log);p.stderr.on('data',log);p.once('error',reject);p.once('close',code=>code===0?resolve():reject(Error(`${cmd} ${args.join(' ')} failed (${code}): ${tail}`)));
 });}
 async function generate(job){busy=true;try{
  const dir=join(base,job.id);job.status='narration';job.progress=3;job.message='Preparing English narration';await persist(job);
  await command('python',['studio3d/narrate.py',dir],job,'narration');
  job.status='preview';job.progress=12;await persist(job);await command(process.execPath,['--max-old-space-size=128','--max-semi-space-size=4','studio3d/render.mjs','--job='+dir],job,'preview');
  job.previewUrl=`/media/${job.id}/preview`;job.status='rendering';job.progress=30;await persist(job);
  await command(process.execPath,['--max-old-space-size=128','--max-semi-space-size=4','studio3d/render.mjs','--full','--job='+dir],job,'final');
  job.status='complete';job.progress=100;job.videoUrl=`/media/${job.id}/final`;job.message='Your verified 3D video is ready.';
 }catch(e){job.status='failed';job.message=e.message;}finally{busy=false;await persist(job);}}
 staticServer.on('request',async(req,res)=>{const url=new URL(req.url,'http://localhost');const json=(status,value)=>{res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(value));};try{
  if(req.method==='GET'&&url.pathname==='/'){res.writeHead(200,{'Content-Type':'text/html'});res.end(await readFile(join(root,'studio3d/index.html')));return;}
  if(req.method==='GET'&&url.pathname==='/api/recipes'){json(200,{recipes:Object.entries(recipes).map(([id,r])=>({id,name:r.name})),voices,formats:['16:9','9:16'],busy});return;}
  if(req.method==='GET'&&url.pathname.startsWith('/api/jobs/')){const job=jobs.get(url.pathname.split('/').at(-1));json(job?200:404,job||{error:'Job not found'});return;}
  if(req.method==='POST'&&url.pathname==='/api/generate'){
   if(req.headers.origin&&req.headers.origin!==`http://${req.headers.host}`){json(403,{error:'Use the local studio page to generate videos.'});return;}
   let body='';for await(const chunk of req){body+=chunk;if(body.length>8192){json(413,{error:'Prompt is too long'});return;}}
   let plan;try{plan=storyboard(JSON.parse(body));}catch(e){json(400,{error:e.message});return;}
   if(busy){json(409,{error:'One video is already rendering. Please wait for it to finish.'});return;}
   busy=true; // Reserve before filesystem awaits so simultaneous submissions cannot both start.
   const id='job-'+Date.now()+'-'+Math.random().toString(36).slice(2,7),dir=join(base,id);try{await mkdir(dir,{recursive:true});await writeFile(join(dir,'storyboard.json'),JSON.stringify(plan,null,2));}catch(e){busy=false;throw e;}
   const job={id,recipe:plan.recipe,title:plan.title,format:plan.format,voice:plan.voice,status:'queued',progress:0,message:'Queued'};jobs.set(id,job);busy=true;json(202,job);void generate(job);return;
  }
  if(req.method==='GET'&&url.pathname.startsWith('/media/')){
   const [,prefix,id,type]=url.pathname.split('/');const job=jobs.get(id);if(!job||!['preview','final'].includes(type)||!(type==='final'?job.videoUrl:job.previewUrl)){res.writeHead(404);res.end();return;}
   const file=join(base,id,type,type==='final'?'maya-3d-complete.mp4':'maya-3d-preview-480p.mp4'),size=(await stat(file)).size,range=req.headers.range;
   const headers={'Content-Type':'video/mp4','Accept-Ranges':'bytes'};if(url.searchParams.has('download'))headers['Content-Disposition']=`attachment; filename="maya-${job.recipe}-${job.format.replace(':','x')}.mp4"`;
   if(range){const m=/^bytes=(\d+)-(\d*)$/.exec(range);if(!m){res.writeHead(416);res.end();return;}const start=Number(m[1]),end=Math.min(size-1,m[2]?Number(m[2]):size-1);if(start>=size||end<start){res.writeHead(416);res.end();return;}res.writeHead(206,{...headers,'Content-Range':`bytes ${start}-${end}/${size}`,'Content-Length':end-start+1});createReadStream(file,{start,end}).pipe(res);}
   else{res.writeHead(200,{...headers,'Content-Length':size});createReadStream(file).pipe(res);}return;
  }
  if(req.method!=='GET'){json(405,{error:'Method not allowed'});return;}staticHandler(req,res);
 }catch(e){if(!res.headersSent)json(500,{error:e.message});else res.end();}});
 for(const name of await readdir(base)){try{const job=JSON.parse(await readFile(join(base,name,'status.json'),'utf8'));if(job.status==='complete')jobs.set(job.id,job);}catch{}}
 return staticServer;
}
if(process.argv[1]===fileURLToPath(import.meta.url)){const server=await createStudioServer();const port=Number(process.env.LIFEMOTION_PORT||4173);server.listen(port,'127.0.0.1',()=>console.log(`LifeMotion 3D Cooking Studio: http://127.0.0.1:${port}`));}
