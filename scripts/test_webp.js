const { execSync } = require('child_process');
const fs = require('fs');

const inv = JSON.parse(fs.readFileSync('media_inventory.json', 'utf8'));
const sample = inv.find(x => x.file === 'IMG_1646.HEIC');

try {
  const res = execSync(`ffmpeg -y -i "${sample.fullPath}" -update 1 test_out.webp 2>&1`).toString();
  console.log('Success:', res.slice(0, 200));
} catch(e) {
  console.log('Error output:', e.stdout ? e.stdout.toString() : e.message);
}
