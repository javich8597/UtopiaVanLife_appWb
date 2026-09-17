const fs = require('fs');
const { execSync } = require('child_process');
const path = require('path');

const categorized = JSON.parse(fs.readFileSync('categorized_inventory.json', 'utf8'));

// Convert only images first: HEIC and PNG
const imagesToConvert = categorized.filter(item => item.cleanName && item.cleanName.startsWith('public/images/'));

console.log('Images to convert:', imagesToConvert.length);

imagesToConvert.forEach((item, index) => {
  const targetWebp = path.resolve(item.cleanName);
  const targetJpg = targetWebp.replace(/\.webp$/, '.jpg');
  const targetDir = path.dirname(targetWebp);
  
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  // Find source file
  const src = item.fullPath || path.resolve('Landing Videos-images/Landing', item.relFolder === 'ROOT' ? '' : item.relFolder, item.file);

  try {
    // Generate WebP
    execSync(`ffmpeg -y -i "${src}" -vf "scale='min(2560,iw)':-2" -q:v 82 "${targetWebp}"`, { stdio: 'ignore' });
    // Generate JPG fallback
    execSync(`ffmpeg -y -i "${src}" -vf "scale='min(2560,iw)':-2" -q:v 3 "${targetJpg}"`, { stdio: 'ignore' });
    console.log(`[${index+1}/${imagesToConvert.length}] Converted: ${item.file} -> ${path.basename(targetWebp)} & .jpg`);
  } catch(e) {
    console.error(`Error converting ${item.file}:`, e.message);
  }
});
console.log('All images converted successfully!');
