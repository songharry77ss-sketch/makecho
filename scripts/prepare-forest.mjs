import sharp from 'sharp';
await sharp('public/assets/forest-higgsfield.png').resize({width:1536,withoutEnlargement:true}).webp({quality:88}).toFile('public/assets/forest.webp');
