const fs = require('fs');
const inv = JSON.parse(fs.readFileSync('media_inventory.json', 'utf8'));

// List all previews in temp_previews
const previews = fs.readdirSync('temp_previews');
console.log('Total previews in temp_previews:', previews.length);

// Let us map each file to what we visually know and inspect NEO previews
const neoFiles = inv.filter(f => f.relFolder === 'NEO');
console.log('NEO items count:', neoFiles.length);
neoFiles.forEach(f => console.log('NEO:', f.file));

