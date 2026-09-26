const fs = require('fs');

const b64 = fs.readFileSync('public/icons/icon-192x192.png').toString('base64');
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 192 192" width="192" height="192">
  <image width="192" height="192" href="data:image/png;base64,${b64}"/>
</svg>`;

fs.writeFileSync('public/favicon.svg', svg);
fs.writeFileSync('public/icons/icon-192x192.svg', svg);
fs.writeFileSync('public/icons/icon-512x512.svg', svg);
console.log('Synchronized SVG icons with official brand favicon');
