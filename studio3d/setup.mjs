import {spawnSync,execFileSync} from 'node:child_process';
import {existsSync,writeFileSync} from 'node:fs';
import {join,resolve,dirname} from 'node:path';

const root=resolve(import.meta.dirname,'..');
const windows=process.platform==='win32';
function run(command,args){
 const result=spawnSync(command,args,{cwd:root,stdio:'inherit',windowsHide:true});
 if(result.error||result.status!==0)throw Error(`Setup stopped: ${command} failed. Read the message above before retrying.`);
}
function refreshPath(){
 if(!windows)return;
 const path=execFileSync('powershell.exe',['-NoProfile','-Command',"[Environment]::GetEnvironmentVariable('Path','Machine') + ';' + [Environment]::GetEnvironmentVariable('Path','User')"],{encoding:'utf8'}).trim();
 process.env.PATH=path+';'+process.env.PATH;
}
function installWindows(id){
 console.log(`Installing ${id} with Windows Package Manager…`);
 run('winget',['install','--id',id,'-e','--source','winget','--accept-package-agreements','--accept-source-agreements']);
 refreshPath();
}
try{
 console.log('\nLifeMotion setup — preparing your cooking studio\n');
 if(!process.env.npm_execpath)throw Error('Run this helper using npm run setup from the project folder.');
 run(process.execPath,[process.env.npm_execpath,'ci']);
 const {findPython,inspectRuntime}=await import('./runtime.mjs');
 let python=findPython();
 if(!python&&windows){installWindows('Python.Python.3.12');python=findPython();}
 if(!python)throw Error('Install Python 3.10 or newer, restart your terminal, then run npm run setup again.');
 if(!existsSync(join(root,'.venv')))run(python.command,[...python.args,'-m','venv',join(root,'.venv')]);
 const local=join(root,'.venv',windows?'Scripts/python.exe':'bin/python');
 if(!existsSync(local))throw Error('The existing .venv folder is incomplete. Repair it before continuing.');
 run(local,['-m','pip','install','edge-tts==7.3.1']);
 const ffmpeg=spawnSync('ffmpeg',['-version'],{stdio:'ignore',windowsHide:true});
 const ffprobe=spawnSync('ffprobe',['-version'],{stdio:'ignore',windowsHide:true});
 if((ffmpeg.status!==0||ffprobe.status!==0)&&windows)installWindows('Gyan.FFmpeg');
 if(windows){
  const binaryDirectories=[...new Set(['ffmpeg','ffprobe'].map(tool=>dirname(execFileSync('where.exe',[tool],{encoding:'utf8'}).trim().split(/\r?\n/)[0])))];
  writeFileSync(join(root,'.venv/lifemotion-tools.json'),JSON.stringify({binaryDirectories},null,2));
 }
 if(!inspectRuntime().checks.find(check=>check.id==='browser')?.ok)run(process.execPath,[join(root,'node_modules/playwright/cli.js'),'install','chromium']);
 else console.log('Using the installed Chromium renderer.');
 const runtime=inspectRuntime();
 for(const check of runtime.checks)console.log(`${check.ok?'OK':'MISSING'}  ${check.label}: ${check.message}`);
 if(!runtime.ready)throw Error('Some tools are still missing. Restart your terminal and check the studio setup panel.');
 console.log('\nSetup complete. Run npm run studio and open the address it prints.\n');
}catch(error){console.error('\n'+error.message);process.exitCode=1;}
