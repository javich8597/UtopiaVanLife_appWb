const fs = require('fs');
const path = require('path');

const srcDir = path.resolve('temp_previews');
const targetDir = 'C:/Users/javi_/.gemini/antigravity/brain/d05c25c8-54d8-4069-b310-6d8658c7ab27';

const neoThumbs = fs.readdirSync(srcDir).filter(f => f.startsWith('NEO_'));
neoThumbs.forEach(f => {
  fs.copyFileSync(path.join(srcDir, f), path.join(targetDir, f));
});
console.log('Copied', neoThumbs.length, 'NEO thumbnails to artifact dir');
