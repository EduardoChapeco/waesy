import fs from 'fs';

const empregosDetail = fs.readFileSync('src/routes/_store.empregos.$id.tsx', 'utf8');
const lines = empregosDetail.split('\n');
console.log('Total lines:', lines.length);
console.log(lines.slice(150, 220).join('\n'));
