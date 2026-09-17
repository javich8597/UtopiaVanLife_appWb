const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const baseDir = 'C:\\Users\\javi_\\Desktop\\Proyectos\\UtopiaVanLife\\Landing Videos-images\\Landing';
const previewDir = 'C:\\Users\\javi_\\Desktop\\Proyectos\\UtopiaVanLife\\UtopiaVanLife_appWb\\temp_previews';

if (!fs.existsSync(previewDir)) {
  fs.mkdirSync(previewDir, { recursive: true });
}

function getFiles(dir, rel = '') {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat && stat.isDirectory()) {
      results = results.concat(getFiles(fullPath, path.join(rel, file)));
    } else {
      results.push({ fullPath, relFolder: rel, file });
    }
  });
  return results;
}

const files = getFiles(baseDir);
console.log(`Found ${files.length} files.`);

const inventory = [];

for (const item of files) {
  const ext = path.extname(item.file).toLowerCase();
  const cleanFolder = item.relFolder.replace(/\\/g, '_').replace(/ /g, '_') || 'root';
  const thumbName = `${cleanFolder}_${item.file}.jpg`;
  const thumbPath = path.join(previewDir, thumbName);

  let thumbGenerated = false;
  try {
    if (['.heic', '.png', '.jpg', '.jpeg'].includes(ext)) {
      execSync(`ffmpeg -y -i "${item.fullPath}" -vf "scale=480:-1" -vframes 1 "${thumbPath}"`, { stdio: 'ignore' });
      thumbGenerated = true;
    } else if (['.mov', '.mp4'].includes(ext)) {
      execSync(`ffmpeg -y -ss 00:00:01 -i "${item.fullPath}" -vf "scale=480:-1" -vframes 1 "${thumbPath}"`, { stdio: 'ignore' });
      thumbGenerated = true;
    }
  } catch (err) {
    console.error(`Error generating thumb for ${item.file}:`, err.message);
  }

  let meta = {};
  try {
    const probeOut = execSync(`ffprobe -v error -select_streams v:0 -show_entries stream=width,height,duration -show_entries format=duration,size -of json "${item.fullPath}"`, { encoding: 'utf-8' });
    const probeData = JSON.parse(probeOut);
    const stream = (probeData.streams && probeData.streams[0]) || {};
    const format = probeData.format || {};
    meta.width = stream.width;
    meta.height = stream.height;
    const dur = stream.duration || format.duration;
    meta.duration = dur ? parseFloat(dur).toFixed(2) : '0';
    meta.sizeMb = (parseInt(format.size || 0, 10) / (1024 * 1024)).toFixed(2);
  } catch (err) {
    meta.error = err.message;
  }

  inventory.push({
    file: item.file,
    relFolder: item.relFolder,
    fullPath: item.fullPath,
    ext,
    meta,
    thumbName,
    thumbGenerated
  });
}

fs.writeFileSync('media_inventory.json', JSON.stringify(inventory, null, 2));
console.log('Finished analyzing media!');
