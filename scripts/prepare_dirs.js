const fs = require('fs');
const path = require('path');

// Ensure target directories exist
const dirs = [
  'public/images/campers/neo/exterior',
  'public/images/campers/neo/interior',
  'public/images/campers/neo/details',
  'public/images/campers/space/exterior',
  'public/images/campers/space/interior',
  'public/images/campers/space/details',
  'public/images/hero',
  'public/images/lifestyle',
  'public/videos/campers/neo',
  'public/videos/campers/space',
  'public/videos/lifestyle',
  'public/videos/hero'
];

dirs.forEach(d => {
  if (!fs.existsSync(d)) {
    fs.mkdirSync(d, { recursive: true });
    console.log('Created dir:', d);
  }
});
console.log('All destination directories are ready.');
