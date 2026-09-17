const fs = require('fs');
const { execSync } = require('child_process');
const path = require('path');

const originalInv = JSON.parse(fs.readFileSync('media_inventory.json', 'utf8'));
const categorized = JSON.parse(fs.readFileSync('categorized_inventory.json', 'utf8'));

const imagesToConvert = categorized.filter(item => item.cleanName && item.cleanName.startsWith('public/images/'));

console.log('Images to process:', imagesToConvert.length);

imagesToConvert.forEach((item, index) => {
  const orig = originalInv.find(x => x.file === item.file && (x.relFolder || 'ROOT') === item.relFolder);
  if (!orig) return;

  const src = orig.fullPath;
  const targetWebp = path.resolve(item.cleanName);
  const targetJpg = targetWebp.replace(/\.webp$/, '.jpg');
  const targetDir = path.dirname(targetWebp);

  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  try {
    // 1. Generate full-res JPG directly from source
    execSync(`ffmpeg -y -i "${src}" -update 1 "${targetJpg}"`, { stdio: 'ignore' });
    // 2. Convert JPG to optimized WebP
    execSync(`ffmpeg -y -i "${targetJpg}" -c:v libwebp -q:v 82 "${targetWebp}"`, { stdio: 'ignore' });
    console.log(`[${index+1}/${imagesToConvert.length}] Success: ${item.file} -> ${path.basename(targetWebp)} & .jpg`);
  } catch(e) {
    console.error(`[${index+1}/${imagesToConvert.length}] Failed ${item.file}:`, e.message);
  }
});
console.log('Image conversion complete.');
