import assert from 'node:assert/strict';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import http from 'node:http';
import test from 'node:test';
import {createStudioServer} from './server.mjs';
import {root} from './host.mjs';

const run=promisify(execFile);
const launch=port=>run(process.execPath,['studio3d/server.mjs'],{
 cwd:root,env:{...process.env,LIFEMOTION_PORT:String(port)},timeout:6000
});
const listen=server=>new Promise(resolve=>server.listen(0,'127.0.0.1',()=>resolve(server.address().port)));
const close=server=>new Promise(resolve=>server.close(resolve));

test('a duplicate startup exits and directs the user to the existing studio',async()=>{
 const server=await createStudioServer();
 const port=await listen(server);
 try{
  const result=await launch(port);
  assert.match(result.stdout,/already running/);
  assert.ok(result.stdout.includes(`http://127.0.0.1:${port}`));
  assert.doesNotMatch(result.stdout,/trying/);
  const health=await fetch(`http://127.0.0.1:${port}/api/health`).then(r=>r.json());
  assert.equal(health.ready,true,'The original studio must still work');
 }finally{await close(server);}
});

test('an unrelated occupied port fails without starting another portal',async()=>{
 const server=http.createServer((req,res)=>res.end('Another application'));
 const port=await listen(server);
 try{await assert.rejects(launch(port),error=>{
  assert.equal(error.code,1);
  assert.match(error.stderr,/already in use/);
  assert.doesNotMatch(error.stdout,/LifeMotion Cooking Studio:/);
  return true;
 });}finally{await close(server);}
});

test('invalid port settings produce a useful error',async()=>{
 for(const port of ['invalid',0,65536])await assert.rejects(launch(port),error=>{
  assert.equal(error.code,1);
  assert.match(error.stderr,/LIFEMOTION_PORT must be/);
  return true;
 });
});
