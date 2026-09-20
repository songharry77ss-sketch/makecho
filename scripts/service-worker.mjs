import { readdir, writeFile, readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
async function list(dir){const entries=await readdir(dir,{withFileTypes:true});const files=await Promise.all(entries.map(e=>e.isDirectory()?list(path.join(dir,e.name)):[path.join(dir,e.name)]));return files.flat();}
const files=(await list('dist')).filter(f=>!f.endsWith('sw.js'));
const hash=createHash('sha256');for(const f of files)hash.update(await readFile(f));
const version='makecho-'+hash.digest('hex').slice(0,12);
const urls=files.map(f=>'./'+path.relative('dist',f).split(path.sep).join('/'));
await writeFile('dist/sw.js',`const CACHE=${JSON.stringify(version)};const FILES=${JSON.stringify(['./',...urls])};self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(FILES)).then(()=>self.skipWaiting()))});self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('makecho-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});self.addEventListener('fetch',e=>{if(e.request.method!=='GET'||new URL(e.request.url).origin!==self.location.origin)return;e.respondWith(fetch(e.request).then(r=>{if(r.ok){const copy=r.clone();e.waitUntil(caches.open(CACHE).then(c=>c.put(e.request,copy)))}return r}).catch(()=>caches.match(e.request).then(r=>r||(e.request.mode==='navigate'?caches.match('./index.html'):Response.error()))))});`);
console.log('Offline shell generated:',version,urls.length,'assets');
