import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,extname,relative} from 'node:path';
export const root=resolve(import.meta.dirname,'..');
export function createStaticServer(){return http.createServer(async(req,res)=>{try{
 const url=new URL(req.url,'http://localhost'),path=decodeURIComponent(url.pathname);
 let file=path.startsWith('/vendor/')?resolve(root,'node_modules/three/build',path.slice(8)):resolve(root,'.'+path);
 if(relative(root,file).startsWith('..')||!(path.startsWith('/studio3d/')||path.startsWith('/vendor/'))){res.writeHead(404);res.end();return;}
 const type={'.html':'text/html','.mjs':'text/javascript','.js':'text/javascript','.json':'application/json','.css':'text/css','.jpg':'image/jpeg','.png':'image/png','.svg':'image/svg+xml'}[extname(file)]||'application/octet-stream';const bytes=await readFile(file);res.writeHead(200,{'Content-Type':type,'Cache-Control':'no-store'});res.end(bytes);
 }catch{res.writeHead(404);res.end('Not found');}});}
export async function listen(server){await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve)});return `http://127.0.0.1:${server.address().port}`;}
