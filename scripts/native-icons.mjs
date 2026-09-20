import sharp from 'sharp';
import { readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
async function list(dir){const entries=await readdir(dir,{withFileTypes:true});return (await Promise.all(entries.map(e=>e.isDirectory()?list(path.join(dir,e.name)):[path.join(dir,e.name)]))).flat();}
const logo=await readFile('public/favicon.svg');
const files=[...await list('android/app/src/main/res'),...await list('ios/App/App/Assets.xcassets')].filter(f=>f.endsWith('.png'));
for(const file of files){const {width,height}=await sharp(file).metadata();let buffer;if(file.includes('splash')){const mark=await sharp(logo).resize(Math.round(Math.min(width,height)*.2)).png().toBuffer();buffer=await sharp({create:{width,height,channels:4,background:'#f7f9f6'}}).composite([{input:mark,gravity:'centre'}]).png().toBuffer();}else if(file.includes('foreground')){const size=Math.round(width*.6);const mark=await sharp(logo).resize(size,size).png().toBuffer();buffer=await sharp({create:{width,height,channels:4,background:'#244c3d'}}).composite([{input:mark,gravity:'centre'}]).png().toBuffer();}else{buffer=await sharp(logo).resize(width,height).flatten({background:'#244c3d'}).png().toBuffer();}await writeFile(file,buffer);}
console.log('Updated native app icons and splash images:',files.length);
