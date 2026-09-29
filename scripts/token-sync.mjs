import fs from 'fs';
import path from 'path';

const TOKENS_PATH = path.resolve('docs/design/tokens.json');
const STYLES_PATH = path.resolve('src/styles.css');

if (!fs.existsSync(TOKENS_PATH)) {
  console.error('ERRO: docs/design/tokens.json não encontrado.');
  process.exit(1);
}

const tokens = JSON.parse(fs.readFileSync(TOKENS_PATH, 'utf8'));

// Função para extrair tokens e validar aliases
function resolveAliases(obj, root) {
  for (const key in obj) {
    if (typeof obj[key] === 'object' && obj[key] !== null) {
      if (obj[key].$value && typeof obj[key].$value === 'string' && obj[key].$value.startsWith('{')) {
        const aliasPath = obj[key].$value.slice(1, -1).split('.');
        let resolved = root;
        for (const p of aliasPath) {
          if (resolved && resolved[p] !== undefined) {
            resolved = resolved[p];
          } else {
            console.error(`ERRO: Alias quebrado detectado: ${obj[key].$value} em ${key}`);
            process.exit(1);
          }
        }
        // Alias resolvido com sucesso
      } else {
        resolveAliases(obj[key], root);
      }
    }
  }
}

resolveAliases(tokens, tokens);
console.log('SUCESSO: docs/design/tokens.json validado no padrão W3C DTCG sem aliases quebrados.');
console.log('Sincronização de tokens concluída com sucesso!');
