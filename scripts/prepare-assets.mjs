import sharp from 'sharp';
import { readFile } from 'node:fs/promises';
await Promise.all([192,512].map(size=>sharp('public/favicon.svg').resize(size,size).png().toFile(`public/icon-${size}.png`)));
await sharp('public/assets/garden.png').resize({width:1536,withoutEnlargement:true}).webp({quality:88}).toFile('public/assets/garden.webp');
await sharp('public/assets/momo.png').resize({width:640,withoutEnlargement:true}).webp({quality:90}).toFile('public/assets/momo.webp');
