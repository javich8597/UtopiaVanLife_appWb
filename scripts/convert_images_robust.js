const fs = require('fs');
const { execSync } = require('child_process');
const path = require('path');

const categorized = JSON.parse(fs.readFileSync('categorized_inventory.json', 'utf8'));
const imagesToConvert = categorized.filter(item => item.cleanName && item.cleanName.startsWith('public/images/'));

console.log('Images to convert:', imagesToConvert.length);

imagesToConvert.forEach((item, index) => {
  const targetWebp = path.resolve(item.cleanName);
  const targetJpg = targetWebp.replace(/\.webp$/, '.jpg');
  const targetDir = path.dirname(targetWebp);

  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  const src = item.fullPath;

  try {
    // Generate WebP
    execSync(`ffmpeg -y -i "${src}" -update 1 -vf "scale=trunc(iw/2)*2:trunc(ih/2)*2" "${targetWebp}"`, { stdio: 'ignore' });
    // Generate JPG fallback
    execSync(`ffmpeg -y -i "${src}" -update 1 -vf "scale=trunc(iw/2)*2:trunc(ih/2)*2" "${targetJpg}"`, { stdio: 'ignore' });
    console.log(`[${index+1}/${imagesToConvert.length}] Converted: ${item.file} -> ${path.basename(targetWebp)} & .jpg`);
  } catch(e) {
    console.error(`Error converting ${item.file}:`, e.message);
  }
});
console.log('Finished converting all images.');
