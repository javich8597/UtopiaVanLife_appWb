const fs = require('fs');
const path = require('path');

function getFiles(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    const full = path.join(dir, file);
    const stat = fs.statSync(full);
    if (stat && stat.isDirectory()) {
      results = results.concat(getFiles(full));
    } else {
      results.push({ path: full.replace(/\\/g, '/'), sizeKb: (stat.size / 1024).toFixed(1) });
    }
  });
  return results;
}

const files = getFiles('public/images');
console.log('Total files generated in public/images:', files.length);
files.forEach(f => console.log(f.path, '(' + f.sizeKb + ' KB)'));
