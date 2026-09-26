const sharp = require('sharp');
const fs = require('fs');
const svg = fs.readFileSync('public/icon.svg');

Promise.all([
  sharp(svg).resize(192, 192).png().toFile('public/icon-192.png'),
  sharp(svg).resize(512, 512).png().toFile('public/icon-512.png'),
  sharp(svg).resize(512, 512).png().toFile('public/icon-maskable.png'),
  sharp(svg).resize(32, 32).png().toFile('public/favicon.ico')
]).then(() => console.log('DONE')).catch(e => { console.log('ERR:', e.message); process.exit(1); });
