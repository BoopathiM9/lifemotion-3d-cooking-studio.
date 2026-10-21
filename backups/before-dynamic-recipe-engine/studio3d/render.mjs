import {chromium} from 'playwright';
import {spawn,spawnSync} from 'node:child_process';
import {once} from 'node:events';
import {mkdir,readFile,rename,writeFile,access} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {createStaticServer,listen,root} from './host.mjs';
const jobArg=process.argv.find(a=>a.startsWith('--job=')),job=jobArg?resolve(root,jobArg.slice(6)):null;
const plan=job?JSON.parse(await readFile(join(job,'storyboard.json'),'utf8')):null;
const full=process.argv.includes('--full'),portrait=process.argv.includes('--portrait')||plan?.format==='9:16',fps=full?24:12,width=portrait?(full?720:480):(full?1280:854),height=portrait?(full?1280:854):(full?720:480);
const sourceAssets=job||join(root,'output/cooking-lesson');
const runId=new Date().toISOString().replace(/[:.]/g,'-'),out=job?join(job,full?'final':'preview'):join(root,'output/studio3d',`${full?'full':'milestone1'}-${runId}`);
const staging=join(out,'preview.rendering.mp4'),output=join(out,full?'maya-3d-complete.mp4':'maya-3d-preview-480p.mp4');
for(const file of [staging,output]){let exists=false;try{await access(file);exists=true;}catch(e){if(e.code!=='ENOENT')throw e;}if(exists)throw Error('Preserving existing video: '+file+'. Create a new job directory to render again.');}
await mkdir(join(out,'frames'),{recursive:true});
const assets=full?sourceAssets:join(out,'assets');
if(!full){const prepared=spawnSync('python',['studio3d/prepare-preview.py',sourceAssets,assets],{cwd:root,encoding:'utf8'});if(prepared.status!==0)throw Error(prepared.stderr||String(prepared.error));console.log('Synchronized preview:',prepared.stdout.trim());}
const lesson=JSON.parse(await readFile(join(assets,'lesson.json'),'utf8')),duration=lesson.duration;
const server=createStaticServer(),url=await listen(server),browser=await chromium.launch({headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader','--renderer-process-limit=1','--num-raster-threads=1']});
let encoder;const errors=[],requests=[],frames=Math.ceil(duration*fps),start=Date.now();
try{
 const page=await browser.newPage({viewport:{width,height},deviceScaleFactor:1});page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});page.on('requestfailed',r=>requests.push(r.url()));
 await page.addInitScript(c=>window.RENDER_CONFIG=c,{width,height,lesson,duration,preview:false,recipe:plan?.recipe||'masala-dosa'});
 await page.goto(url+'/studio3d/scene.html');await page.waitForFunction(()=>window.studioReady,{},{timeout:60000});
 const debug=await page.evaluate(()=>{const gl=window.studio.renderer.getContext(),ext=gl.getExtension('WEBGL_debug_renderer_info');return{renderer:ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER),...window.frameState}});console.log('3D renderer:',JSON.stringify(debug));
 const snapshots=full?lesson.steps.map(s=>s.start+(s.speechEnd-s.start)*.7):[.06,.33,.52,.75,.83,.97].map(p=>p*duration);
 for(const t of snapshots){await page.evaluate(t=>window.setFrame(t),t);await page.screenshot({path:join(out,'frames',`scene-${t}.png`)});}
 const subtitleFile=join(out,'subtitles.srt'),srt=await readFile(join(assets,'subtitles.srt'),'utf8');await writeFile(subtitleFile,srt);
 encoder=spawn('ffmpeg',['-v','warning','-threads','1','-filter_threads','1','-f','image2pipe','-vcodec','mjpeg','-framerate',String(fps),'-i','pipe:0','-i',join(assets,'narration.wav'),'-i',subtitleFile,'-map','0:v','-map','1:a','-map','2:s','-c:v','libx264','-threads','1','-preset','ultrafast','-tune','zerolatency','-crf','21','-pix_fmt','yuv420p','-c:a','aac','-b:a','96k','-c:s','mov_text','-t',String(duration),'-movflags','+faststart',staging],{stdio:['pipe','inherit','inherit']});
 const completed=once(encoder,'close');encoder.stdin.on('error',e=>errors.push(e.message));let maxGrip=0,contained=0;
 for(let i=0;i<frames;i++){
  const state=await page.evaluate(t=>window.setFrame(t),i/fps);if(!state.webgl||!state.perspective||state.triangles<1000)throw Error('Not a genuine perspective WebGL 3D render');
  if(plan?.recipe==='vegetable-sandwich'&&state.spreadHeight>.02)throw Error('Chutney layer is too thick');maxGrip=Math.max(maxGrip,state.gripError);if(state.handBottom<=1.615)throw Error('Hand intersects worktop');if(state.gripError>.025)throw Error('Hand cannot reach utensil: '+JSON.stringify(state));
  if(state.landed){const d=Math.hypot(state.food[0]-state.plate[0],state.food[2]-state.plate[2]);if(d+state.foodRadius>state.plateRadius-.04)throw Error('Food leaves plate');contained++;}
  const buffer=await page.screenshot({type:'jpeg',quality:90});if(!encoder.stdin.write(buffer)){const result=await Promise.race([once(encoder.stdin,'drain').then(()=>({drained:true})),completed.then(([code])=>({code}))]);if(!result.drained)throw Error('FFmpeg encoder stopped before draining: '+result.code);}
  if(i%24===0)console.log(`Rendering 3D ${i}/${frames} (${Math.round(i/frames*100)}%)`);
 }
 encoder.stdin.end();const [code]=await completed;if(code!==0)throw Error('FFmpeg failed: '+code);if(errors.length||requests.length)throw Error(JSON.stringify({errors,requests}));
 const decode=spawnSync('ffmpeg',['-v','error','-threads','1','-i',staging,'-f','null','-'],{encoding:'utf8'});if(decode.status!==0)throw Error(decode.stderr||String(decode.error));
 const probe=spawnSync('ffprobe',['-v','error','-show_streams','-show_format','-of','json',staging],{encoding:'utf8'});if(probe.status!==0)throw Error(probe.stderr||String(probe.error));const media=JSON.parse(probe.stdout);
 if(!media.streams.some(s=>s.codec_type==='audio')||!media.streams.some(s=>s.codec_type==='video'))throw Error('Missing audio or video');
 const checked=spawnSync('python',['studio3d/verify-media.py',staging,assets,...(full?[]:['--preview'])],{cwd:root,encoding:'utf8'});if(checked.status!==0)throw Error('Media verification failed: '+(checked.stderr||String(checked.error)));console.log(checked.stdout.trim());
 await rename(staging,output);const mediaChecks=JSON.parse(await readFile(join(out,'media-checks.json'),'utf8'));mediaChecks.video=output;await writeFile(join(out,'media-checks.json'),JSON.stringify(mediaChecks,null,2));const report={passed:true,milestone:full?2:1,output,width,height,fps,frames,duration,softwareRenderer:debug.renderer,threeRevision:debug.threeRevision,triangles:debug.triangles,maxGripError:maxGrip,plateFramesChecked:contained,browserErrors:errors,failedRequests:requests,decodePassed:true,secondsToRender:(Date.now()-start)/1000,media};await writeFile(join(out,'validation.json'),JSON.stringify(report,null,2));await writeFile(join(root,'output/studio3d/latest.json'),JSON.stringify({out,output},null,2));console.log('VERIFIED 3D VIDEO: '+output);
}finally{await browser.close();server.close();if(encoder&&encoder.exitCode===null)encoder.kill();}
