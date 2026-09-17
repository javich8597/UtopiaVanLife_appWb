const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const previewDir = 'C:\\Users\\javi_\\Desktop\\Proyectos\\UtopiaVanLife\\UtopiaVanLife_appWb\\temp_previews';
const inventory = JSON.parse(fs.readFileSync('media_inventory.json', 'utf-8'));

for (const item of inventory) {
  const thumbPath = path.join(previewDir, item.thumbName);
  if (!fs.existsSync(thumbPath)) {
    if (item.ext === '.heic') {
      const res = spawnSync('ffmpeg', ['-y', '-i', item.fullPath, '-update', '1', thumbPath], { stdio: 'pipe' });
      if (res.status === 0 && fs.existsSync(thumbPath)) {
        console.log(`Successfully converted HEIC: ${item.file}`);
      } else {
        console.error(`Failed ${item.file}: stderr: ${res.stderr.toString().slice(-200)}`);
      }
    }
  }
}
console.log('Done converting all HEIC images!');
