const fs = require('fs');
const path = require('path');

const target = path.join(__dirname, '../src/routes/_store.index.tsx');
let content = fs.readFileSync(target, 'utf-8');

const target1 = `return {
        banners: banners || [],`;
const repl1 = `return {
        launchSettings: launchSettings || null,
        banners: banners || [],`;

const target2 = `return {
        banners: [],`;
const repl2 = `return {
        launchSettings: null,
        banners: [],`;

// Normalize line endings for replacement
const isCRLF = content.includes('\r\n');
const normalize = (str) => isCRLF ? str.replace(/\r?\n/g, '\r\n') : str.replace(/\r\n/g, '\n');

content = content.replace(normalize(target1), normalize(repl1));
content = content.replace(normalize(target2), normalize(repl2));

fs.writeFileSync(target, content, 'utf-8');
console.log('Successfully patched _store.index.tsx with launchSettings!');
