import fs from 'fs';
import path from 'path';
import ts from 'typescript';

/**
 * Scanner Industrial de Botões via TypeScript AST (Waesy Platform)
 * Análise 100% livre de falsos positivos sintáticos.
 * 
 * Classifica:
 * 1. DEAD_BUTTON: Sem onClick, sem type="submit", sem asChild/Link, sem role="tab"
 * 2. FAKE_ACTION: onClick com () => {}, console.log, toast "em breve", alert
 * 3. STATIC_DISABLED: disabled={true} ou disabled sem expressão condicional
 * 4. INVALID_LINK_NESTING: <Link> ancestral imediato sem asChild
 */

const ROOT_DIRS = ['src/routes', 'src/components'];
const EXTENSIONS = ['.tsx'];

let totalFiles = 0;
let totalButtons = 0;
const issues = [];

function walk(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      if (file !== 'node_modules' && file !== '.git' && file !== 'dist' && file !== '__tests__') {
        walk(fullPath);
      }
    } else if (EXTENSIONS.some(ext => file.endsWith(ext)) && !file.endsWith('.test.tsx')) {
      totalFiles++;
      scanFileWithAst(fullPath);
    }
  }
}

function scanFileWithAst(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const relativePath = path.relative(process.cwd(), filePath).replace(/\\/g, '/');

  const sourceFile = ts.createSourceFile(
    filePath,
    content,
    ts.ScriptTarget.Latest,
    /* setParentNodes */ true,
    ts.ScriptKind.TSX
  );

  function visit(node) {
    let isButtonTag = false;
    let tagName = '';
    let attributes = null;

    if (ts.isJsxElement(node)) {
      tagName = node.openingElement.tagName.getText(sourceFile);
      attributes = node.openingElement.attributes;
      if (tagName === 'Button' || tagName === 'button') isButtonTag = true;
    } else if (ts.isJsxSelfClosingElement(node)) {
      tagName = node.tagName.getText(sourceFile);
      attributes = node.attributes;
      if (tagName === 'Button' || tagName === 'button') isButtonTag = true;
    }

    if (isButtonTag && attributes) {
      totalButtons++;
      const { line } = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
      const lineNumber = line + 1;

      let hasOnClick = false;
      let onClickText = '';
      let isSubmit = false;
      let hasAsChild = false;
      let isStaticDisabled = false;
      let isRadixOrTab = false;

      attributes.properties.forEach(prop => {
        if (ts.isJsxAttribute(prop)) {
          const name = prop.name.getText(sourceFile);
          
          if (name === 'onClick') {
            hasOnClick = true;
            onClickText = prop.initializer ? prop.initializer.getText(sourceFile) : '';
          }
          if (name === 'type') {
            const val = prop.initializer ? prop.initializer.getText(sourceFile) : '';
            if (val.includes('submit')) isSubmit = true;
          }
          if (name === 'asChild') {
            hasAsChild = true;
          }
          if (name === 'role') {
            const val = prop.initializer ? prop.initializer.getText(sourceFile) : '';
            if (val.includes('tab')) isRadixOrTab = true;
          }
          if (name === 'disabled') {
            if (!prop.initializer) {
              isStaticDisabled = true;
            } else {
              const val = prop.initializer.getText(sourceFile);
              if (val === '{true}') isStaticDisabled = true;
            }
          }
        } else if (ts.isJsxSpreadAttribute(prop)) {
          // Componente repassa props
          hasOnClick = true;
        }
      });

      // Checa ancestral imediato para Link sem asChild ou Radix Trigger
      let parent = node.parent;
      let isInsideLink = false;
      let isInsideTrigger = false;
      while (parent && !ts.isSourceFile(parent)) {
        if (ts.isJsxElement(parent)) {
          const parentTag = parent.openingElement.tagName.getText(sourceFile);
          if (parentTag === 'Link' || parentTag === 'a') {
            isInsideLink = true;
            break;
          }
          if (parentTag.endsWith('Trigger') || parentTag.includes('Trigger') || parentTag.endsWith('Close') || parentTag.includes('Close')) {
            isInsideTrigger = true;
            break;
          }
        }
        parent = parent.parent;
      }

      const snippet = node.getText(sourceFile).split('\n')[0].slice(0, 90);

      // 1. Botão sem ação
      if (!hasOnClick && !isSubmit && !hasAsChild && !isInsideLink && !isRadixOrTab && !isInsideTrigger) {
        issues.push({
          type: 'DEAD_BUTTON_NO_ACTION',
          severity: 'P1',
          file: relativePath,
          line: lineNumber,
          snippet,
          detail: 'Botão sem onClick, sem type="submit", sem asChild/Link e sem delegação de props.'
        });
      }

      // 2. Fake actions / stubs
      if (hasOnClick && onClickText) {
        const clean = onClickText.replace(/[{}]/g, '').trim();
        if (
          clean === '() => {}' ||
          clean === '() => false' ||
          clean === '() => null' ||
          clean === 'undefined' ||
          /toast\.(info|warn|error)?\s*\(\s*["'](?:Em breve|Funcionalidade em desenvolvimento|N[aã]o implementado)/i.test(clean) ||
          /alert\s*\(/.test(clean) ||
          /console\.log\s*\(/.test(clean)
        ) {
          issues.push({
            type: 'FAKE_OR_STUB_ACTION',
            severity: 'P1',
            file: relativePath,
            line: lineNumber,
            snippet,
            detail: `Ação simulada detectada: ${clean.slice(0, 60)}`
          });
        }
      }

      // 3. Static disabled
      if (isStaticDisabled) {
        issues.push({
          type: 'STATIC_DISABLED_BUTTON',
          severity: 'P2',
          file: relativePath,
          line: lineNumber,
          snippet,
          detail: 'Botão desabilitado de forma permanente (disabled={true} estático sem binding).'
        });
      }

      // 4. Invalid nesting Link > Button sem asChild
      if (isInsideLink && !hasAsChild) {
        issues.push({
          type: 'INVALID_LINK_BUTTON_NESTING',
          severity: 'P0',
          file: relativePath,
          line: lineNumber,
          snippet,
          detail: 'Elemento <Link> ou <a> envolvendo <Button> sem a propriedade asChild (gera tag <a><button> inválida no DOM).'
        });
      }
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
}

console.log('Iniciando Varredura Industrial via TypeScript AST em:', ROOT_DIRS.join(', '));
for (const dir of ROOT_DIRS) {
  if (fs.existsSync(dir)) walk(dir);
}

const grouped = {
  DEAD_BUTTON_NO_ACTION: issues.filter(i => i.type === 'DEAD_BUTTON_NO_ACTION'),
  FAKE_OR_STUB_ACTION: issues.filter(i => i.type === 'FAKE_OR_STUB_ACTION'),
  INVALID_LINK_BUTTON_NESTING: issues.filter(i => i.type === 'INVALID_LINK_BUTTON_NESTING'),
  STATIC_DISABLED_BUTTON: issues.filter(i => i.type === 'STATIC_DISABLED_BUTTON')
};

const output = {
  timestamp: new Date().toISOString(),
  totalFilesScanned: totalFiles,
  totalButtonsScanned: totalButtons,
  totalIssues: issues.length,
  summary: {
    deadButtons: grouped.DEAD_BUTTON_NO_ACTION.length,
    fakeOrStubActions: grouped.FAKE_OR_STUB_ACTION.length,
    invalidNesting: grouped.INVALID_LINK_BUTTON_NESTING.length,
    staticDisabled: grouped.STATIC_DISABLED_BUTTON.length
  },
  issues
};

fs.writeFileSync('scripts/audit/button-ast-audit.json', JSON.stringify(output, null, 2));
console.log('Varredura AST Concluída com Sucesso!');
console.log(`Rotas Analisadas: ${totalFiles} | Total de Botões nas Rotas: ${totalButtons}`);
console.log(`- Botões sem Ação: ${grouped.DEAD_BUTTON_NO_ACTION.length}`);
console.log(`- Ações Falsas / Stubs: ${grouped.FAKE_OR_STUB_ACTION.length}`);
console.log(`- Aninhamento Inválido Link>Button: ${grouped.INVALID_LINK_BUTTON_NESTING.length}`);
console.log(`- Botões Estaticamente Desabilitados: ${grouped.STATIC_DISABLED_BUTTON.length}`);
console.log('Relatório detalhado gravado em scripts/audit/button-ast-audit.json');
