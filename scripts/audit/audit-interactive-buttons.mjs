import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import ts from 'typescript';

const ROOT_DIRS = ['src/routes', 'src/components'];
const EXTENSIONS = ['.tsx'];
const REPORT_PATH = 'scripts/audit/button-ast-audit.json';

const TRANSACTIONAL_LABEL = /\b(salvar|publicar|aprovar|excluir|remover|sincronizar|gerar|enviar|comprar|reservar|agendar|candidatar|solicitar|confirmar|finalizar|pagar|registrar|duplicar|reprocessar|ativar|desativar)\b/i;
const PREVIEW_LANGUAGE = /\b(pr[eé]via|pré-visualiza|preview|demonstra|simulador|simula[cç][aã]o|modo de pr[eé]via)\b/i;
const COPY_SHARE_LANGUAGE = /\b(copiar|compartilhar|clipboard|share|whatsapp|telefone|link)\b/i;
const MUTATION_LANGUAGE = /\b(mutate|mutateAsync|await|fetch\(|createServerFn|serverFn|invalidate|router\.invalidate|queryClient\.invalidate|\.execute\(|\.submit\(|\.insert\(|\.update\(|\.delete\(|\.upsert\(|\.rpc\()\b/i;
const OPEN_FLOW_LANGUAGE = /\b(set[A-Z]\w*Open\(true\)|open[A-Z]\w*\(|setSelected|show[A-Z]\w*\(|onOpenChange|modal|drawer|sheet|dialog)\b/;
const FAKE_TOAST = /toast\.(success|info|warn|error)?\s*\(\s*["'][^"']*(em breve|n[aã]o implementad|funcionalidade futura|pedido simulado|simulado com sucesso|ao ativar|ap[oó]s a publica[cç][aã]o|voucher est[aá] sendo processado|modo de pr[eé]via)[^"']*["']/i;

function walk(dir) {
  const files = [];
  if (!fs.existsSync(dir)) return files;

  for (const file of fs.readdirSync(dir)) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      if (!['node_modules', '.git', 'dist', '__tests__'].includes(file)) {
        files.push(...walk(fullPath));
      }
    } else if (EXTENSIONS.some((ext) => file.endsWith(ext)) && !file.endsWith('.test.tsx')) {
      files.push(fullPath);
    }
  }

  return files;
}

function getJsxName(tag) {
  return tag?.getText ? tag.getText() : '';
}

function getAttributeMap(attributes, sourceFile) {
  const attr = new Map();
  let hasSpread = false;

  for (const prop of attributes.properties) {
    if (ts.isJsxAttribute(prop)) {
      attr.set(prop.name.getText(sourceFile), prop.initializer ? prop.initializer.getText(sourceFile) : true);
    } else if (ts.isJsxSpreadAttribute(prop)) {
      hasSpread = true;
    }
  }

  return { attr, hasSpread };
}

function getTextContent(node, sourceFile) {
  if (!ts.isJsxElement(node)) return '';
  return node.children
    .map((child) => {
      if (ts.isJsxText(child)) return child.getText(sourceFile);
      if (ts.isJsxExpression(child)) return child.getText(sourceFile);
      if (ts.isJsxElement(child)) return getTextContent(child, sourceFile);
      if (ts.isJsxSelfClosingElement(child)) return '';
      return '';
    })
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function unwrapCallback(expression) {
  if (expression && ts.isCallExpression(expression) && /^(useCallback|React\.useCallback)$/.test(expression.expression.getText())) {
    return expression.arguments[0];
  }
  return expression;
}

function resolveCallback(expression, node) {
  expression = unwrapCallback(expression);
  if (!expression || !ts.isIdentifier(expression)) return expression;
  const name = expression.text;
  let scope = node.parent;
  while (scope) {
    if (ts.isBlock(scope) || ts.isSourceFile(scope)) {
      for (const statement of scope.statements) {
        if (ts.isFunctionDeclaration(statement) && statement.name?.text === name) return statement;
        if (ts.isVariableStatement(statement)) {
          const declaration = statement.declarationList.declarations.find((entry) => ts.isIdentifier(entry.name) && entry.name.text === name);
          if (declaration) return unwrapCallback(declaration.initializer);
        }
      }
    }
    scope = scope.parent;
  }
  return expression;
}

function callbackExpression(callback) {
  if (!callback || !(ts.isArrowFunction(callback) || ts.isFunctionExpression(callback) || ts.isFunctionDeclaration(callback))) return undefined;
  if (!callback.body) return undefined;
  if (!ts.isBlock(callback.body)) return callback.body;
  const statements = callback.body.statements.filter((statement) => !ts.isEmptyStatement(statement));
  if (statements.length !== 1) return undefined;
  const statement = statements[0];
  return ts.isReturnStatement(statement) || ts.isExpressionStatement(statement) ? statement.expression : undefined;
}

function isNoOp(callback) {
  if (!callback) return false;
  if (ts.isIdentifier(callback) && callback.text === 'undefined') return true;
  if (!(ts.isArrowFunction(callback) || ts.isFunctionExpression(callback) || ts.isFunctionDeclaration(callback))) return false;
  if (callback.body && ts.isBlock(callback.body)) {
    if (callback.body.statements.every((statement) => ts.isEmptyStatement(statement) || (ts.isReturnStatement(statement) && !statement.expression))) return true;
  }
  const expression = callbackExpression(callback);
  return Boolean(expression && (expression.kind === ts.SyntaxKind.NullKeyword || expression.kind === ts.SyntaxKind.FalseKeyword || (ts.isIdentifier(expression) && expression.text === 'undefined')));
}

function staticDestination(attributes, sourceFile) {
  for (const attribute of attributes.properties) {
    if (!ts.isJsxAttribute(attribute) || !['href', 'to'].includes(attribute.name.getText(sourceFile))) continue;
    let value = attribute.initializer;
    if (value && ts.isJsxExpression(value)) value = value.expression;
    if (value && ts.isStringLiteralLike(value)) return value.text;
  }
  return undefined;
}

function getAncestorFlags(node, sourceFile) {
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
      if (
        parentTag.endsWith('Trigger') ||
        parentTag.includes('Trigger') ||
        parentTag.endsWith('Close') ||
        parentTag.includes('Close')
      ) {
        isInsideTrigger = true;
        break;
      }
    }
    parent = parent.parent;
  }

  return { isInsideLink, isInsideTrigger };
}

function classifyIntent({ tagName, attr, hasSpread, label, isInsideLink, isInsideTrigger }) {
  const onClickText = String(attr.get('onClick') ?? '');
  const disabledText = String(attr.get('disabled') ?? '');
  const roleText = String(attr.get('role') ?? '');
  const typeText = String(attr.get('type') ?? '');
  const hasAsChild = attr.has('asChild') && attr.get('asChild') !== '{false}';
  const hasHref = attr.has('href') || attr.has('to');
  const hasOnClick = attr.has('onClick') || hasSpread;
  const hasReason =
    attr.has('title') ||
    attr.has('aria-label') ||
    attr.has('aria-describedby') ||
    attr.has('aria-busy') ||
    attr.has('data-action-reason');
  const declaredIntent = String(attr.get('data-action-intent') ?? '').replace(/[{}"']/g, '');
  const isStaticDisabled = attr.has('disabled') && (!disabledText || disabledText === 'true' || disabledText === '{true}');

  if (declaredIntent === 'preview-only') return 'preview-only';
  if (isStaticDisabled && hasReason) return 'disabled-with-reason';
  if (typeText.includes('submit')) return 'submit';
  if (hasAsChild || hasHref || isInsideLink) return 'navigate';
  if (roleText.includes('tab') || isInsideTrigger) return 'open-modal-with-continuation';
  if (COPY_SHARE_LANGUAGE.test(label) || COPY_SHARE_LANGUAGE.test(onClickText)) return 'copy-share';
  if (PREVIEW_LANGUAGE.test(label) || PREVIEW_LANGUAGE.test(onClickText)) return 'preview-only';
  if (MUTATION_LANGUAGE.test(onClickText)) return 'mutate';
  if (OPEN_FLOW_LANGUAGE.test(onClickText)) return 'open-modal-with-continuation';
  if (hasOnClick || hasSpread) return 'local-state';

  return 'unknown';
}

function makeIssue(type, severity, control, evidence, expectedFix) {
  return {
    type,
    severity,
    file: control.file,
    line: control.line,
    label: control.label,
    intent: control.intent,
    element: control.tagName,
    snippet: control.snippet,
    evidence,
    expectedFix,
  };
}

function evaluateControl(control) {
  const issues = [];
  const cleanClick = control.resolvedHandler || control.onClickText;

  if (control.destination !== undefined && (!control.destination.trim() || control.destination.trim() === '#' || /^javascript:/i.test(control.destination.trim()))) {
    issues.push(makeIssue('INVALID_LINK_DESTINATION', 'P1', control, `Destino sem fluxo real: ${control.destination}`, 'Informar rota, URL ou ancora existente; usar button para acao local.'));
  }

  if (control.isInsideLink && !control.hasAsChild && (control.tagName === 'Button' || control.tagName === 'button')) {
    issues.push(
      makeIssue(
        'INVALID_LINK_BUTTON_NESTING',
        'P0',
        control,
        'Link ou anchor envolve Button sem asChild.',
        'Use Button asChild com Link interno ou transforme o controle em Link estilizado.',
      ),
    );
  }

  if (control.intent === 'unknown') {
    issues.push(
      makeIssue(
        'DEAD_BUTTON_NO_ACTION',
        'P1',
        control,
        'Controle sem onClick, submit, asChild, href/to, trigger ou intenção declarada.',
        'Conectar navegação/mutação real ou remover a affordance interativa.',
      ),
    );
  }

  if (
    control.isNoOp ||
    control.isToastOnlyTransaction ||
    /alert\s*\(/.test(cleanClick) ||
    /console\.log\s*\(/.test(cleanClick) ||
    FAKE_TOAST.test(cleanClick)
  ) {
    issues.push(
      makeIssue(
        'FAKE_OR_STUB_ACTION',
        'P1',
        control,
        `Handler sem fluxo real: ${cleanClick.slice(0, 120)}`,
        'Substituir por mutação/navegação real, estado local visível ou preview-only desabilitado com razão explícita.',
      ),
    );
  }

  if (control.isStaticDisabled && control.intent !== 'disabled-with-reason' && control.intent !== 'preview-only') {
    issues.push(
      makeIssue(
        'STATIC_DISABLED_BUTTON',
        'P2',
        control,
        'disabled estático sem motivo acessível ou intenção canônica.',
        'Adicionar razão explícita ou vincular disabled a estado de domínio.',
      ),
    );
  }

  return issues;
}

export function analyzeSource(source, filePath = 'inline.tsx') {
  const sourceFile = ts.createSourceFile(filePath, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const controls = [];
  const issues = [];
  const relativePath = path.relative(process.cwd(), filePath).replace(/\\/g, '/');
  const iconNames = new Set();
  for (const statement of sourceFile.statements) {
    if (!ts.isImportDeclaration(statement) || !ts.isStringLiteral(statement.moduleSpecifier)) continue;
    if (!['lucide-react', '@phosphor-icons/react'].includes(statement.moduleSpecifier.text)) continue;
    const bindings = statement.importClause?.namedBindings;
    if (bindings && ts.isNamedImports(bindings)) for (const element of bindings.elements) iconNames.add(element.name.text);
  }

  function visit(node) {
    let tagName = '';
    let attributes = null;

    if (ts.isJsxElement(node)) {
      tagName = node.openingElement.tagName.getText(sourceFile);
      attributes = node.openingElement.attributes;
    } else if (ts.isJsxSelfClosingElement(node)) {
      tagName = node.tagName.getText(sourceFile);
      attributes = node.attributes;
    }

    const roleButton = attributes?.properties.some((prop) => ts.isJsxAttribute(prop) && prop.name.getText(sourceFile) === 'role' && prop.initializer?.getText(sourceFile).includes('button'));
    const isControl = (!iconNames.has(tagName) && ['Button', 'button', 'a', 'Link'].includes(tagName)) || roleButton;

    if (isControl && attributes) {
      const { attr, hasSpread } = getAttributeMap(attributes, sourceFile);
      const { isInsideLink, isInsideTrigger } = getAncestorFlags(node, sourceFile);
      const { line } = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
      const label = getTextContent(node, sourceFile);
      const clickAttribute = attributes.properties.find((prop) => ts.isJsxAttribute(prop) && prop.name.getText(sourceFile) === 'onClick');
      const callback = resolveCallback(clickAttribute?.initializer && ts.isJsxExpression(clickAttribute.initializer) ? clickAttribute.initializer.expression : undefined, node);
      const resolvedHandler = callback?.getText(sourceFile) ?? '';
      const resolvedAttributes = new Map(attr);
      if (resolvedHandler) resolvedAttributes.set('onClick', resolvedHandler);
      const intent = classifyIntent({ tagName, attr: resolvedAttributes, hasSpread, label, isInsideLink, isInsideTrigger });
      const singleExpression = callbackExpression(callback);
      const control = {
        file: relativePath || filePath,
        line: line + 1,
        tagName,
        label,
        intent,
        hasOnClick: attr.has('onClick') || hasSpread,
        hasAsChild: attr.has('asChild') && attr.get('asChild') !== '{false}',
        destination: staticDestination(attributes, sourceFile),
        resolvedHandler,
        isNoOp: isNoOp(callback),
        isToastOnlyTransaction: Boolean(singleExpression && ts.isCallExpression(singleExpression) && singleExpression.expression.getText(sourceFile) === 'toast.success' && TRANSACTIONAL_LABEL.test(label)),
        onClickText: String(attr.get('onClick') ?? ''),
        isStaticDisabled:
          attr.has('disabled') &&
          (!attr.get('disabled') || attr.get('disabled') === true || attr.get('disabled') === '{true}'),
        isInsideLink,
        isInsideTrigger,
        snippet: node.getText(sourceFile).split('\n')[0].slice(0, 120),
      };

      controls.push(control);
      issues.push(...evaluateControl(control));
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return { controls, issues };
}

export function analyzeFiles(files) {
  const allControls = [];
  const allIssues = [];

  for (const file of files) {
    const source = fs.readFileSync(file, 'utf-8');
    const result = analyzeSource(source, file);
    allControls.push(...result.controls);
    allIssues.push(...result.issues);
  }

  const summaryBySeverity = allIssues.reduce((acc, issue) => {
    acc[issue.severity] = (acc[issue.severity] ?? 0) + 1;
    return acc;
  }, {});

  const summaryByIntent = allControls.reduce((acc, control) => {
    acc[control.intent] = (acc[control.intent] ?? 0) + 1;
    return acc;
  }, {});

  const grouped = {
    DEAD_BUTTON_NO_ACTION: allIssues.filter((i) => i.type === 'DEAD_BUTTON_NO_ACTION'),
    FAKE_OR_STUB_ACTION: allIssues.filter((i) => i.type === 'FAKE_OR_STUB_ACTION'),
    INVALID_LINK_BUTTON_NESTING: allIssues.filter((i) => i.type === 'INVALID_LINK_BUTTON_NESTING'),
    STATIC_DISABLED_BUTTON: allIssues.filter((i) => i.type === 'STATIC_DISABLED_BUTTON'),
    INVALID_LINK_DESTINATION: allIssues.filter((i) => i.type === 'INVALID_LINK_DESTINATION'),
  };

  return {
    timestamp: new Date().toISOString(),
    totalFilesScanned: files.length,
    totalButtonsScanned: allControls.length,
    totalControls: allControls.length,
    totalIssues: allIssues.length,
    summary: {
      deadButtons: grouped.DEAD_BUTTON_NO_ACTION.length,
      fakeOrStubActions: grouped.FAKE_OR_STUB_ACTION.length,
      invalidNesting: grouped.INVALID_LINK_BUTTON_NESTING.length,
      staticDisabled: grouped.STATIC_DISABLED_BUTTON.length,
      invalidDestinations: grouped.INVALID_LINK_DESTINATION.length,
    },
    summaryBySeverity,
    summaryByIntent,
    issues: allIssues,
  };
}

function runCli() {
  console.log('Iniciando varredura semantica de acoes em:', ROOT_DIRS.join(', '));
  const files = ROOT_DIRS.flatMap((dir) => walk(dir));
  const output = analyzeFiles(files);

  fs.writeFileSync(REPORT_PATH, JSON.stringify(output, null, 2));

  console.log('Varredura semantica concluida.');
  console.log(`Arquivos: ${output.totalFilesScanned} | Controles: ${output.totalControls}`);
  console.log(`P0: ${output.summaryBySeverity.P0 ?? 0} | P1: ${output.summaryBySeverity.P1 ?? 0} | P2: ${output.summaryBySeverity.P2 ?? 0}`);
  console.log(`Relatorio: ${REPORT_PATH}`);

  if ((output.summaryBySeverity.P0 ?? 0) > 0 || (output.summaryBySeverity.P1 ?? 0) > 0) {
    process.exitCode = 1;
  }
}

const isCli = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (isCli) runCli();
