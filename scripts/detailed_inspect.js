const { execSync } = require('child_process');
const fs = require('fs');

const inv = JSON.parse(fs.readFileSync('media_inventory.json', 'utf8'));

const results = [];

for (const item of inv) {
  let probe = null;
  try {
    const raw = execSync(`ffprobe -v error -select_streams v:0 -show_entries stream=width,height,codec_name,duration,rotation:stream_tags=rotate -of json "${item.fullPath}"`).toString();
    probe = JSON.parse(raw);
  } catch (e) {
    // ignore
  }
  const vStream = (probe && probe.streams && probe.streams[0]) ? probe.streams[0] : {};
  results.push({
    file: item.file,
    relFolder: item.relFolder || 'ROOT',
    ext: item.ext,
    sizeMb: (item.meta && item.meta.sizeMb) ? item.meta.sizeMb : null,
    codec: vStream.codec_name || null,
    width: vStream.width || (item.meta ? item.meta.width : null),
    height: vStream.height || (item.meta ? item.meta.height : null),
    rotate: (vStream.tags && vStream.tags.rotate) || vStream.rotation || 0,
    duration: vStream.duration || (item.meta ? item.meta.duration : 0)
  });
}

fs.writeFileSync('detailed_media_info.json', JSON.stringify(results, null, 2));
console.log('Saved detailed_media_info.json with ' + results.length + ' records');
