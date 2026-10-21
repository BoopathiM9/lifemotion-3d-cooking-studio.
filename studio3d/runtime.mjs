import {existsSync,readFileSync} from 'node:fs';
import {join,delimiter} from 'node:path';
import {spawnSync} from 'node:child_process';
import {chromium} from 'playwright';
import {root} from './host.mjs';

// Remember installer-discovered binary directories without depending on an old terminal's PATH.
try{
 const config=JSON.parse(readFileSync(join(root,'.venv/lifemotion-tools.json'),'utf8'));
 const directories=(config.binaryDirectories||[]).filter(directory=>typeof directory==='string'&&existsSync(directory));
 if(directories.length)process.env.PATH=[...directories,process.env.PATH||''].join(delimiter);
}catch{}

export function findPython({platform=process.platform,env=process.env,run=spawnSync,exists=existsSync}={}){
 const local=join(root,'.venv',platform==='win32'?'Scripts/python.exe':'bin/python');
 const candidates=env.LIFEMOTION_PYTHON?[[env.LIFEMOTION_PYTHON,[]]]:[
  ...(exists(local)?[[local,[]]]:[]),
  ...(platform==='win32'?[['py',['-3']],...(env.LOCALAPPDATA&&exists(join(env.LOCALAPPDATA,'Programs/Python/Python312/python.exe'))?[[join(env.LOCALAPPDATA,'Programs/Python/Python312/python.exe'),[]]]:[])]:[]),['python',[]],['python3',[]]
 ];
 let first;
 for(const [command,args] of candidates){
  const result=run(command,[...args,'-c','import sys,json,importlib.util; print(json.dumps({"version":list(sys.version_info[:3]),"edgeTts":importlib.util.find_spec("edge_tts") is not None}))'],{cwd:root,encoding:'utf8',timeout:4000,windowsHide:true});
  if(result.status!==0)continue;
  try{
   const info=JSON.parse(result.stdout.trim());
   if(info.version[0]!==3||info.version[1]<10)continue;
   const python={command,args,version:info.version.join('.'),edgeTts:info.edgeTts};
   first??=python;
   if(info.edgeTts)return python;
  }catch{}
 }
 return first||null;
}

export function browserLaunchOptions(){
 const options={headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader','--renderer-process-limit=1','--num-raster-threads=1']};
 if(process.env.LIFEMOTION_CHROMIUM)options.executablePath=process.env.LIFEMOTION_CHROMIUM;
 else if(existsSync(chromium.executablePath()))options.executablePath=chromium.executablePath();
 else if(process.platform==='linux'&&existsSync('/usr/bin/chromium'))options.executablePath='/usr/bin/chromium';
 return options;
}

export function inspectRuntime(){
 const python=findPython();
 const windows=process.platform==='win32';
 const pythonInstall=windows?'winget install --id Python.Python.3.12 -e --source winget':'Install Python 3.10 or newer using your system package manager.';
 const pythonCommand=python?[python.command,...python.args].map(s=>s.includes(' ')?`"${s}"`:s).join(' '):(windows?'py -3':'python3');
 const checks=[
  {id:'python',label:'Python',ok:!!python,message:python?`Python ${python.version} found`:'Python 3.10 or newer was not found. Install it, then restart your terminal and studio.',fix:pythonInstall},
  {id:'speech',label:'English narration',ok:!!python?.edgeTts,message:python?.edgeTts?'Speech package installed':'Install the speech package using the Python interpreter shown below.',fix:`${windows&&python?.command.includes(' ')?'& ':''}${pythonCommand} -m pip install edge-tts==7.3.1`}
 ];
 for(const command of ['ffmpeg','ffprobe']){
  const result=spawnSync(command,['-version'],{encoding:'utf8',timeout:4000,windowsHide:true});
  checks.push({id:command,label:command==='ffmpeg'?'Video encoding':'Media validation',ok:result.status===0,message:result.status===0?`${command} is available`:`${command} was not found. Install FFmpeg, then restart the studio.`,fix:windows?'winget install --id Gyan.FFmpeg -e --source winget':'Install ffmpeg using your system package manager.'});
 }
 const executable=browserLaunchOptions().executablePath||chromium.executablePath();
 checks.push({id:'browser',label:'3D renderer',ok:existsSync(executable),message:existsSync(executable)?'Chromium is installed':'Install the browser used for 3D rendering.',fix:'npx playwright install chromium'});
 return {ready:checks.every(c=>c.ok),checks,python,checkedAt:new Date().toISOString()};
}

export function publicRuntime(runtime){
 const {python,...result}=runtime;return result;
}

export function generationFailure(error,phase){
 if(phase==='interrupted')return 'The studio restarted before this film finished. Create the film again.';
 const text=String(error?.message||error);
 if(/python was not found|no module named edge_tts|ENOENT/i.test(text))return 'A required tool is missing. Open Setup checks, install the missing item, then restart the studio.';
 if(/NoAudioReceived|speech.platform|ClientConnector|403|certificate|handshake|timed out|timeout/i.test(text)&&phase==='narration')return 'The speech service could not be reached. Check your internet connection and try again. Previously cached narration can be reused.';
 if(/WebGL|context lost|Target.*closed|browser.*closed|Blank or missing kitchen/i.test(text))return 'The 3D renderer stopped. Close other heavy applications and try again. A blank video will not be marked complete.';
 return phase==='narration'?'Narration could not be created. Check Setup checks and your internet connection, then try again.':'Video rendering could not finish. Check Setup checks, free some memory and try again.';
}
