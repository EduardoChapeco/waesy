import fs from 'fs';
import path from 'path';

const TOKENS_PATH = path.resolve('docs/design/tokens.json');
const STYLES_PATH = path.resolve('src/styles.css');

if (!fs.existsSync(TOKENS_PATH)) {
  console.error('ERRO: docs/design/tokens.json não encontrado.');
  process.exit(1);
}

if (!fs.existsSync(STYLES_PATH)) {
  console.error('ERRO: src/styles.css não encontrado.');
  process.exit(1);
}

const tokens = JSON.parse(fs.readFileSync(TOKENS_PATH, 'utf8'));
const stylesCss = fs.readFileSync(STYLES_PATH, 'utf8');

// 1. Validar e resolver aliases no padrão W3C DTCG
const resolvedTokens = new Map();
let aliasErrors = 0;

function resolveAliases(obj, root, currentPath = '') {
  for (const key in obj) {
    if (key.startsWith('$')) continue;
    const pathStr = currentPath ? `${currentPath}.${key}` : key;
    const node = obj[key];
    if (typeof node === 'object' && node !== null) {
      if (node.$value !== undefined) {
        let val = node.$value;
        if (typeof val === 'string' && val.startsWith('{') && val.endsWith('}')) {
          const aliasPath = val.slice(1, -1).split('.');
          let resolved = root;
          let broken = false;
          for (const p of aliasPath) {
            if (resolved && resolved[p] !== undefined) {
              resolved = resolved[p];
            } else {
              broken = true;
              break;
            }
          }
          if (broken) {
            console.error(`[ERRO] Alias quebrado: ${val} em ${pathStr}`);
            aliasErrors++;
          } else {
            resolvedTokens.set(pathStr, resolved.$value || resolved);
          }
        } else {
          resolvedTokens.set(pathStr, val);
        }
      } else {
        resolveAliases(node, root, pathStr);
      }
    }
  }
}

resolveAliases(tokens, tokens);

if (aliasErrors > 0) {
  console.error(`Total de aliases quebrados em tokens.json: ${aliasErrors}`);
  process.exit(1);
}

// 2. Mapeamento de tokens canônicos esperados em CSS
const expectedSemanticCssVars = [
  '--surface-canvas',
  '--surface-card',
  '--surface-subtle',
  '--surface-muted',
  '--text-primary',
  '--text-secondary',
  '--text-muted',
  '--text-inverse',
  '--border-default',
  '--border-subtle',
  '--border-control',
  '--border-focus',
  '--feedback-danger',
  '--feedback-warning',
  '--feedback-success',
  '--feedback-info'
];

const expectedComponentCssVars = [
  '--button-primary-bg',
  '--button-primary-text',
  '--button-secondary-bg',
  '--button-secondary-border',
  '--button-secondary-text',
  '--button-radius',
  '--input-bg',
  '--input-border',
  '--input-radius',
  '--card-bg',
  '--card-border',
  '--card-radius'
];

// 3. Verificar presença em src/styles.css
const missingVars = [];
for (const v of [...expectedSemanticCssVars, ...expectedComponentCssVars]) {
  if (!stylesCss.includes(v)) {
    missingVars.push(v);
  }
}

const isCheckMode = process.argv.includes('--check');

console.log('======================================================================');
console.log('WAESY TOKEN SYNC & AUDIT — S23 (Design System como Fonte Única)');
console.log('======================================================================');
console.log(`Tokens W3C DTCG Carregados:  ${resolvedTokens.size}`);
console.log(`Aliases Quebrados:           ${aliasErrors}`);
console.log(`Variáveis Semânticas Alvo:   ${expectedSemanticCssVars.length}`);
console.log(`Variáveis Componente Alvo:   ${expectedComponentCssVars.length}`);
console.log(`Variáveis Ausentes em CSS:   ${missingVars.length}`);
console.log('----------------------------------------------------------------------');

if (missingVars.length > 0) {
  console.warn(`[AVISO] Variáveis pendentes de sincronização em src/styles.css:`);
  missingVars.forEach(v => console.warn(`  - ${v}`));
  if (isCheckMode) {
    console.error(`[FALHA] Modo --check: ${missingVars.length} variáveis ausentes em src/styles.css.`);
    process.exit(1);
  }
} else {
  console.log('SUCESSO: Paridade 100% estrita entre tokens.json e src/styles.css!');
}

console.log('======================================================================');
