import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';
import { Worker, isMainThread, parentPort, workerData } from 'worker_threads';

const CONFIG_PATH = path.resolve('.designlintrc.json');
const BASELINE_PATH = path.resolve('design-lint.baseline.json');
const REPORT_PATH = path.resolve('design-lint.report.json');
const DASHBOARD_PATH = path.resolve('docs/design/LINT_DASHBOARD.md');

function safeWriteFileSync(filePath, data, encoding = 'utf8') {
  for (let attempt = 1; attempt <= 5; attempt++) {
    try {
      fs.writeFileSync(filePath, data, encoding);
      return;
    } catch (err) {
      if (attempt === 5) throw err;
      const waitMs = attempt * 100;
      const start = Date.now();
      while (Date.now() - start < waitMs) {}
    }
  }
}

const CONFIG_CACHE = new Map();

/**
 * Carrega e valida configuração normativa do Design Lint (.designlintrc.json).
 */
export function loadConfig(configPath = CONFIG_PATH) {
  const resolvedPath = path.resolve(configPath);
  if (!fs.existsSync(resolvedPath)) {
    throw new Error(`ERRO FATAL: Arquivo de configuração ${configPath} não encontrado.`);
  }

  const stat = fs.statSync(resolvedPath);
  const cached = CONFIG_CACHE.get(resolvedPath);
  if (cached && cached.mtimeMs === stat.mtimeMs && cached.size === stat.size) {
    return cached.config;
  }

  const config = JSON.parse(fs.readFileSync(resolvedPath, 'utf8'));

  // Validar Allowlist: toda exceção exige id, file, data ISO, motivo >= 10 chars e validade não expirada
  if (Array.isArray(config.allowlist)) {
    const today = new Date().toISOString().slice(0, 10);
    for (const item of config.allowlist) {
      if (!item.id || typeof item.id !== 'string') {
        throw new Error(`ERRO: Exceção na allowlist rejeitada por ausência de id de regra: ${JSON.stringify(item)}`);
      }
      if (!item.file || typeof item.file !== 'string') {
        throw new Error(`ERRO: Exceção na allowlist rejeitada por ausência de caminho de arquivo: ${JSON.stringify(item)}`);
      }
      if (!item.date || !/^\d{4}-\d{2}-\d{2}$/.test(item.date)) {
        throw new Error(`ERRO: Exceção na allowlist rejeitada por ausência de data ISO válida (YYYY-MM-DD): ${JSON.stringify(item)}`);
      }
      if (!item.reason || typeof item.reason !== 'string' || item.reason.trim().length < 10) {
        throw new Error(`ERRO: Exceção na allowlist rejeitada por motivo ausente ou insuficiente (mínimo 10 caracteres): ${JSON.stringify(item)}`);
      }
      if (item.expiry) {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(item.expiry)) {
          throw new Error(`ERRO: Data de expiração inválida (YYYY-MM-DD) na allowlist: ${JSON.stringify(item)}`);
        }
        if (item.expiry < today) {
          throw new Error(`ERRO: Exceção na allowlist expirada em ${item.expiry}: ${JSON.stringify(item)}`);
        }
      }
    }
  }

  CONFIG_CACHE.set(resolvedPath, { mtimeMs: stat.mtimeMs, size: stat.size, config });
  return config;
}

/**
 * Mapeia arquivo para seu respectivo módulo arquitetural.
 */
export function getModule(filePath) {
  let norm = filePath.replace(/\\/g, '/');
  const srcIdx = norm.indexOf('src/');
  if (srcIdx !== -1) {
    norm = norm.slice(srcIdx);
  }
  if (norm.startsWith('src/routes/')) {
    const rest = norm.slice('src/routes/'.length);
    if (rest.startsWith('_store') || rest.startsWith('store')) return 'routes/store';
    if (rest.startsWith('workspace')) return 'routes/workspace';
    if (rest.startsWith('admin')) return 'routes/admin';
    if (rest.startsWith('creator')) return 'routes/creator';
    if (rest.startsWith('civil')) return 'routes/civil';
    if (rest.startsWith('auth')) return 'routes/auth';
    if (rest.startsWith('api')) return 'routes/api';
    return 'routes/other';
  }
  if (norm.startsWith('src/design-system/')) {
    return 'components/ui';
  }
  if (norm.startsWith('src/components/')) {
    const rest = norm.slice('src/components/'.length);
    if (rest.startsWith('ui/')) return 'components/ui';
    if (rest.startsWith('chat/')) return 'components/chat';
    if (rest.startsWith('builder/')) return 'components/builder';
    if (rest.startsWith('tourism/')) return 'components/tourism';
    return 'components/app';
  }
  if (norm.startsWith('src/services/')) return 'services';
  if (norm.startsWith('src/lib/')) return 'lib';
  if (norm.startsWith('src/hooks/')) return 'hooks';
  if (norm.endsWith('.css')) return 'styles';
  return 'core';
}

const INLINE_EXEMPTION_REGEX = /(?:\/\/|\/\*)\s*design-lint-(?:ignore|disable)\s+([A-Z0-9-]+)(?:\s+reason:"([^"]+)")?(?:\s+expiry:"([^"]+)")?/g;

/**
 * Analisa e extrai exceções declaradas em comentários inline do código fonte:
 * // design-lint-ignore DL-XX reason:"Motivo com mais de 10 caracteres" expiry:"YYYY-MM-DD"
 */
export function parseInlineExemptions(lines) {
  const exemptions = new Map(); // lineIndex -> Array<{ rule: string, reason: string, expiry: string, valid: boolean, error?: string }>
  let hasAnyDirective = false;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('design-lint-')) {
      hasAnyDirective = true;
      break;
    }
  }
  if (!hasAnyDirective) return exemptions;

  const today = new Date().toISOString().slice(0, 10);

  for (let idx = 0; idx < lines.length; idx++) {
    const line = lines[idx];
    if (!line.includes('design-lint-')) continue;
    let match;
    INLINE_EXEMPTION_REGEX.lastIndex = 0;
    while ((match = INLINE_EXEMPTION_REGEX.exec(line)) !== null) {
      const rule = match[1];
      const reason = match[2];
      const expiry = match[3];

      let valid = true;
      let error = null;

      if (!reason || reason.trim().length < 10) {
        valid = false;
        error = 'Motivo ausente ou inferior a 10 caracteres.';
      } else if (!expiry || !/^\d{4}-\d{2}-\d{2}$/.test(expiry)) {
        valid = false;
        error = 'Data de expiração ausente ou em formato inválido (YYYY-MM-DD).';
      } else if (expiry < today) {
        valid = false;
        error = `Exceção expirada em ${expiry}.`;
      }

      const item = { rule, reason, expiry, valid, error, line: idx + 1 };

      // Aplica na linha atual e na próxima (para comentários acima do elemento)
      if (!exemptions.has(idx + 1)) exemptions.set(idx + 1, []);
      exemptions.get(idx + 1).push(item);

      if (!exemptions.has(idx + 2)) exemptions.set(idx + 2, []);
      exemptions.get(idx + 2).push(item);
    }
  }

  return exemptions;
}

/**
 * Analisa o código fonte e extrai blocos de tags JSX de abertura com seus atributos e escopo multi-linha.
 */
export function parseJsxTags(content) {
  const tags = [];
  const len = content.length;
  let pos = 0;
  let line = 1;
  let col = 1;

  while (pos < len) {
    const ch = content[pos];

    if (ch === '\n') {
      line++;
      col = 1;
      pos++;
      continue;
    }

    // Ignora comentários de linha única
    if (ch === '/' && content[pos + 1] === '/') {
      while (pos < len && content[pos] !== '\n') {
        pos++;
      }
      continue;
    }

    // Ignora comentários multi-linha
    if (ch === '/' && content[pos + 1] === '*') {
      pos += 2;
      col += 2;
      while (pos < len && !(content[pos] === '*' && content[pos + 1] === '/')) {
        if (content[pos] === '\n') {
          line++;
          col = 1;
        } else {
          col++;
        }
        pos++;
      }
      pos += 2;
      col += 2;
      continue;
    }

    // Ignora strings literais fora do JSX (aspas simples e duplas)
    if (ch === '"' || ch === "'") {
      const quote = ch;
      pos++;
      col++;
      while (pos < len && content[pos] !== quote) {
        if (content[pos] === '\\') {
          pos += 2;
          col += 2;
          continue;
        }
        if (content[pos] === '\n') {
          line++;
          col = 1;
        } else {
          col++;
        }
        pos++;
      }
      pos++;
      col++;
      continue;
    }

    // Detecta abertura de tag JSX `<TagName`
    if (ch === '<' && /[a-zA-Z]/.test(content[pos + 1])) {
      const tagStartLine = line;
      const tagStartCol = col;
      pos++;
      col++;

      let tagName = '';
      while (pos < len && /[a-zA-Z0-9_.-]/.test(content[pos])) {
        tagName += content[pos];
        pos++;
        col++;
      }

      // Generics TypeScript como `Record<string, unknown>` não são tags JSX
      const afterName = content[pos];
      if (afterName === ',' || afterName === ';') {
        continue;
      }

      const tagBodyStart = pos;
      let braceDepth = 0;
      let inQuote = null;

      while (pos < len) {
        const c = content[pos];

        if (c === '\n') {
          line++;
          col = 1;
          pos++;
          continue;
        }

        if (inQuote) {
          if (c === inQuote && content[pos - 1] !== '\\') {
            inQuote = null;
          }
        } else {
          if (c === '"' || c === "'" || c === '`') {
            inQuote = c;
          } else if (c === '{') {
            braceDepth++;
          } else if (c === '}') {
            if (braceDepth > 0) braceDepth--;
          } else if (c === '>' && braceDepth === 0) {
            pos++;
            col++;
            break;
          }
        }

        pos++;
        col++;
      }

      const tagContent = content.slice(tagBodyStart, pos);

      tags.push({
        tagName,
        tagContent,
        line: tagStartLine,
        col: tagStartCol
      });
      continue;
    }

    pos++;
    col++;
  }

  return tags;
}

/** Extrai o conteúdo de um atributo JSX no nível da tag (null se ausente). */
export function getTopLevelJsxAttributeValue(tagContent, attributeName) {
  let braceDepth = 0;
  let inQuote = null;
  const attrLen = attributeName.length;

  for (let index = 0; index < tagContent.length; index += 1) {
    const character = tagContent[index];
    if (inQuote) {
      if (character === inQuote && tagContent[index - 1] !== "\\") inQuote = null;
      continue;
    }
    if (character === '"' || character === "'" || character === "`") {
      inQuote = character;
      continue;
    }
    if (character === "{") {
      braceDepth += 1;
      continue;
    }
    if (character === "}") {
      braceDepth = Math.max(0, braceDepth - 1);
      continue;
    }
    if (braceDepth === 0 && tagContent.startsWith(attributeName, index)) {
      const previous = index === 0 ? '' : tagContent[index - 1];
      if (!previous || /[\s{/]/.test(previous)) {
        let cursor = index + attrLen;
        while (cursor < tagContent.length && /\s/.test(tagContent[cursor])) {
          cursor += 1;
        }
        if (tagContent[cursor] !== '=') continue;
        cursor += 1;
        while (cursor < tagContent.length && /\s/.test(tagContent[cursor])) {
          cursor += 1;
        }
        const startChar = tagContent[cursor];
        if (startChar === '"' || startChar === "'") {
          let end = cursor + 1;
          while (end < tagContent.length && (tagContent[end] !== startChar || tagContent[end - 1] === '\\')) {
            end += 1;
          }
          return tagContent.slice(cursor + 1, end);
        }
        if (startChar === '{') {
          let depth = 0;
          let quote = null;
          let end = cursor;
          while (end < tagContent.length) {
            const c = tagContent[end];
            if (quote) {
              if (c === quote && tagContent[end - 1] !== '\\') quote = null;
            } else if (c === '"' || c === "'" || c === "`") {
              quote = c;
            } else if (c === '{') {
              depth += 1;
            } else if (c === '}') {
              depth -= 1;
              if (depth === 0) return tagContent.slice(cursor + 1, end);
            }
            end += 1;
          }
          return tagContent.slice(cursor + 1);
        }
        return '';
      }
    }
  }

  return null;
}

/** Detecta atributos JSX no nível da tag, ignorando handlers dentro de props-filhas. */
export function hasTopLevelJsxAttribute(tagContent, attributeName) {
  return getTopLevelJsxAttributeValue(tagContent, attributeName) !== null;
}

const HEX_REGEX = /#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{4}|[0-9a-fA-F]{3})\b/g;
const RGB_REGEX = /\b(?:rgb|hsl)a?\([^)]+\)/g;
const ARBITRARY_CLASS_REGEX = /\b[a-zA-Z0-9_-]+-\[[^\]]+\]/g;
const NON_4PX_SPACING_REGEX = /\b(?:p[xytblr]?|m[xytblr]?|gap(?:-[xy])?|space-[xy])-(?:0\.5|1\.5|2\.5|3\.5)\b/g;
const CSS_BANG_REGEX = /!important|(?:^|[\s"'`])!(?:[a-zA-Z0-9_-]+)/g;
const TAILWIND_BANG_REGEX = /(?:^|[\s"'`])!(?:(?:[a-zA-Z0-9_-]+:)*)(?:p[xytblr]?|m[xytblr]?|bg|text|border|h|w|min-[wh]|max-[wh]|flex|grid|gap|space|rounded|shadow|opacity|z|overflow|font|leading|tracking|items|justify|content|self|place|top|bottom|left|right|inset|col|row|cursor|pointer|transition|duration|animate|rotate|scale|translate|aspect|ring|outline)-[a-zA-Z0-9_[\]/.#%-]+/g;
const TAILWIND_KEYWORD_BANG_REGEX = /(?:^|[\s"'`])!(?:block|inline|hidden|flex|grid|table|static|relative|absolute|fixed|sticky)\b/g;
const INLINE_STYLE_REGEX = /style\s*=\s*\{\{\s*[^}]*(?:color|background|padding|margin|width|height)[^}]*\}\}/gi;
const Z_INDEX_REGEX = /\bz-(?:[6-9]\d|\d{3,})\b|\bz-\[[^\]]+\]/g;
const SHADOW_REGEX = /\bshadow-(?:sm|md|lg|xl|2xl)\b/g;
const GRADIENT_REGEX = /\bbg-gradient-(?:to-[trbl]{1,2}|radial|conic)\b/g;
const RADIUS_REGEX = /\brounded-\[[^\]]+\]/g;
const SMALL_TARGET_REGEX = /\b(?:h|size)-(?:1|2|3|4|5|6|7|8|9|10|3\.5|2\.5|1\.5|0\.5)\b/g;
const LITERAL_WHITE_BLACK_REGEX = /\b(?:text|bg)-(?:white|black)\b/g;
const HEADER_REGEX = /<h[12][^>]*>([^<]{20,})<\/h[12]>/gi;
const EXPLAIN_REGEX = /(?:Esta|Nesta) (?:tela|página|seção) (?:permite|serve|apresenta|você pode|foi desenvolvida)|Aqui você pode (?:visualizar|gerenciar|acessar|conferir)|Bem-vindo ao (?:painel|sistema|portal)/gi;
const EMOJI_REGEX = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu;
const ANIM_ABOVE_300MS_REGEX = /\bduration-(?:[4-9]\d{2}|\d{4,})\b/g;
const GENERIC_TRANSITION_REGEX = /\btransition-all\b/g;
const UNGUARDED_GRID_REGEX = /(?:^|["'\s])(?<!sm:|md:|lg:|xl:|2xl:)grid-cols-(?:[3-9]|1[0-2])\b/g;
const HORIZONTAL_OVERFLOW_REGEX = /\boverflow-x-(?:auto|scroll)\b/g;
const RAW_WARNING_PALETTE_REGEX = /\b(?:bg|text|border(?:-[trblxy])?|ring|fill|stroke|from|to|via|divide|outline|decoration|accent)-(?:amber|yellow|lime)-\d{2,3}\b/g;
const STOP_PROPAGATION_ONLY_REGEX = /^\s*\(?[a-zA-Z_$][\w$]*\)?\s*=>\s*[a-zA-Z_$][\w$]*\.stopPropagation\(\)\s*;?\s*$/;
const DL04_TAILWIND_PREFILTER = /!important|["'`]![a-zA-Z]|(?:^|\s)!(?:block|inline|hidden|flex|grid|table|static|relative|absolute|fixed|sticky|p[xytblr]?-|m[xytblr]?-|bg-|text-|border-|h-|w-|min-|max-|flex-|grid-|gap-|space-|rounded-|shadow-|opacity-|z-|overflow-|font-|leading-|tracking-|items-|justify-|content-|self-|place-|top-|bottom-|left-|right-|inset-|col-|row-|cursor-|pointer-|transition-|duration-|animate-|rotate-|scale-|translate-|aspect-|ring-|outline-|[a-zA-Z0-9_-]+:)/m;

const DS_INTERACTIVE_PRIMITIVES = new Set([
  'DropdownMenuItem',
  'DropdownMenuCheckboxItem',
  'DropdownMenuRadioItem',
  'ContextMenuItem',
  'MenubarItem',
  'SelectItem',
  'TabsTrigger',
  'CommandItem',
  'AlertDialogAction',
  'AlertDialogCancel',
  'AccordionTrigger',
  'DialogTrigger',
  'PopoverTrigger',
  'SheetTrigger',
]);

/**
 * Linta uma string de código fonte e retorna todas as violações encontradas.
 */
export function lintSource(content, filePath, customConfig = null) {
  const config = customConfig || loadConfig();
  const relFile = filePath.replace(/\\/g, '/');
  const fileModule = getModule(relFile);
  const isCss = relFile.endsWith('.css');
  const isPlainTs = /\.ts$/i.test(relFile);
  const hasExemptionDirective = content.includes('design-lint-');
  let linesCache = null;
  const getLines = () => linesCache || (linesCache = content.split('\n'));
  const violations = [];

  const inlineExemptions = hasExemptionDirective ? parseInlineExemptions(getLines()) : new Map();

  // Validar se houve exceções inline inválidas ou expiradas (DL-EXEMPTION P0)
  for (const [lineNum, list] of inlineExemptions.entries()) {
    for (const ex of list) {
      if (!ex.valid && ex.line === lineNum) {
        violations.push({
          id: 'DL-04',
          rule: 'DL-EXEMPTION',
          file: relFile,
          module: fileModule,
          line: lineNum,
          column: 1,
          severity: 'P0',
          match: ex.rule,
          message: `Exceção inline rejeitada: ${ex.error}`
        });
      }
    }
  }

  // Pré-indexação O(1) de allowlist por arquivo para evitar O(lines * rules * allowlist)
  const fileAllowlistRules = new Set();
  if (config.allowlist) {
    for (const a of config.allowlist) {
      if (relFile.includes(a.file.replace(/\\/g, '/'))) {
        fileAllowlistRules.add(a.id);
      }
    }
  }

  function isExempt(ruleId, lineNum) {
    if (fileAllowlistRules.has(ruleId)) return true;
    const exList = inlineExemptions.get(lineNum);
    if (exList) {
      for (const e of exList) {
        if (e.rule === ruleId && e.valid) return true;
      }
    }
    return false;
  }

  function isRuleActive(ruleId) {
    return Boolean(config.rules && config.rules[ruleId]?.enabled);
  }

  function getSeverity(ruleId) {
    return config.rules && config.rules[ruleId]?.severity ? config.rules[ruleId].severity : 'P1';
  }

  // --- REGRAS LINHA A LINHA ---
  const checkDL01 = !isCss && isRuleActive('DL-01') && !fileAllowlistRules.has('DL-01') &&
    (content.includes('#') || content.includes('rgb(') || content.includes('rgba(') || content.includes('hsl(') || content.includes('hsla('));
  const checkDL02 = isRuleActive('DL-02') && !fileAllowlistRules.has('DL-02') && content.includes('-[');
  const checkDL03 = isRuleActive('DL-03') && !fileAllowlistRules.has('DL-03') &&
    (content.includes('-0.5') || content.includes('-1.5') || content.includes('-2.5') || content.includes('-3.5'));
  const checkDL04 = isRuleActive('DL-04') && !fileAllowlistRules.has('DL-04') &&
    content.includes('!') && (isCss || DL04_TAILWIND_PREFILTER.test(content));
  const checkDL05 = !isCss && isRuleActive('DL-05') && !fileAllowlistRules.has('DL-05') &&
    content.includes('style') && content.includes('{{');
  const checkDL06 = isRuleActive('DL-06') && !fileAllowlistRules.has('DL-06') && content.includes('z-');
  const checkDL07 = isRuleActive('DL-07') && !fileAllowlistRules.has('DL-07') && content.includes('shadow-');
  const checkDL08 = !isCss && isRuleActive('DL-08') && !fileAllowlistRules.has('DL-08') && content.includes('bg-gradient-');
  const checkDL09 = isRuleActive('DL-09') && !fileAllowlistRules.has('DL-09') && content.includes('rounded-[');
  const checkDL18 = isRuleActive('DL-18') && !fileAllowlistRules.has('DL-18') &&
    (content.includes('-white') || content.includes('-black'));
  const checkDL19 = isRuleActive('DL-19') && !fileAllowlistRules.has('DL-19') && /<[hH][12]\b/.test(content);
  let checkDL21 = false;
  if (
    isRuleActive('DL-21') &&
    !fileAllowlistRules.has('DL-21') &&
    (content.includes('Esta ') || content.includes('Nesta ') || content.includes('Aqui você pode') || content.includes('Bem-vindo ao'))
  ) {
    EXPLAIN_REGEX.lastIndex = 0;
    checkDL21 = EXPLAIN_REGEX.test(content);
    EXPLAIN_REGEX.lastIndex = 0;
  }
  let checkDL23 = false;
  if (isRuleActive('DL-23') && !fileAllowlistRules.has('DL-23')) {
    EMOJI_REGEX.lastIndex = 0;
    checkDL23 = EMOJI_REGEX.test(content);
    EMOJI_REGEX.lastIndex = 0;
  }
  const checkDL25 = isRuleActive('DL-25') && !fileAllowlistRules.has('DL-25') && content.includes('variant="default"');
  const checkDL26 = isRuleActive('DL-26') && !fileAllowlistRules.has('DL-26') && content.includes('duration-');
  const checkDL27 = isRuleActive('DL-27') && !fileAllowlistRules.has('DL-27') && content.includes('transition-all');
  const checkDL29 = isRuleActive('DL-29') && !fileAllowlistRules.has('DL-29') && content.includes('grid-cols-');
  const checkDL30 = isRuleActive('DL-30') && !fileAllowlistRules.has('DL-30') && content.includes('overflow-x-');
  const checkDL33 = !isCss && isRuleActive('DL-33') && !fileAllowlistRules.has('DL-33') &&
    (content.includes('amber-') || content.includes('yellow-') || content.includes('lime-'));

  const needsLineLoop =
    checkDL01 || checkDL02 || checkDL03 || checkDL04 || checkDL05 || checkDL06 ||
    checkDL07 || checkDL08 || checkDL09 || checkDL18 || checkDL19 || checkDL21 ||
    checkDL23 || checkDL25 || checkDL26 || checkDL27 || checkDL29 || checkDL30 || checkDL33;

  let primaryActionCount = 0;
  const lines = needsLineLoop ? getLines() : [];

  for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
    const line = lines[lineIdx];
    const lineNum = lineIdx + 1;
    const trimmed = line.trim();
    if (!trimmed) continue;
    const isCommentLine = trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*');
    if (isCommentLine) continue;

    // DL-01: Hex / RGB fora de token
    if (checkDL01 && (line.includes('#') || line.includes('rgb') || line.includes('hsl')) && !isExempt('DL-01', lineNum)) {
      let m;
      if (line.includes('#')) {
        HEX_REGEX.lastIndex = 0;
        while ((m = HEX_REGEX.exec(line)) !== null) {
          // Ignorar entidades numéricas HTML como &#123; e &#160;
          if (m.index > 0 && line[m.index - 1] === '&') continue;
          // Ignorar códigos numéricos de pedido/referência (#8596, #8921) fora de sintaxe CSS/cor
          const isNumericRef = /^#\d{4}$/.test(m[0]) && line[m.index - 1] !== '[' && !/(?:color|bg|fill|stroke|stop|border|shadow)/i.test(line);
          if (isNumericRef) continue;
          violations.push({
            id: 'DL-01',
            rule: 'DL-01',
            file: relFile,
            module: fileModule,
            line: lineNum,
            column: m.index + 1,
            severity: getSeverity('DL-01'),
            match: m[0],
            message: `Cor hexadecimal literal "${m[0]}" fora da camada de token.`
          });
        }
      }
      if (line.includes('(') && (line.includes('rgb') || line.includes('hsl'))) {
        RGB_REGEX.lastIndex = 0;
        while ((m = RGB_REGEX.exec(line)) !== null) {
          violations.push({
            id: 'DL-01',
            rule: 'DL-01',
            file: relFile,
            module: fileModule,
            line: lineNum,
            column: m.index + 1,
            severity: getSeverity('DL-01'),
            match: m[0],
            message: `Cor RGB/HSL literal "${m[0]}" fora da camada de token.`
          });
        }
      }
    }

    // DL-02: Classes arbitrárias entre colchetes
    if (checkDL02 && line.includes('-[') && !isExempt('DL-02', lineNum)) {
      let m;
      ARBITRARY_CLASS_REGEX.lastIndex = 0;
      while ((m = ARBITRARY_CLASS_REGEX.exec(line)) !== null) {
        // Preserve Tailwind CSS state/attribute selector variants (data-[...], aria-[...], group-[...], peer-[...], has-[...], in-[...], not-[...])
        const isAttributeVariant = /(?:data|aria|supports|group|peer|has|in|not)-\[/.test(m[0]);
        // Ignorar classes de caracteres em expressões regulares JS (ex: bsk-[A-Za-z0-9], VRF-[0-9A-Z])
        const isRegexRange = /-\[(?:[A-Z]-[A-Z]|[a-z]-[a-z]|[0-9]-[0-9])/.test(m[0]);
        if (isAttributeVariant || isRegexRange) continue;
        violations.push({
          id: 'DL-02',
          rule: 'DL-02',
          file: relFile,
          module: fileModule,
          line: lineNum,
          column: m.index + 1,
          severity: getSeverity('DL-02'),
          match: m[0],
          message: `Classe arbitrária com colchetes "${m[0]}". Use tokens canônicos.`
        });
      }
    }

    // DL-03: Espaçamento fora da grade de 4px
    if (checkDL03 && (line.includes('-0.5') || line.includes('-1.5') || line.includes('-2.5') || line.includes('-3.5')) && !isExempt('DL-03', lineNum)) {
      let m;
      NON_4PX_SPACING_REGEX.lastIndex = 0;
      while ((m = NON_4PX_SPACING_REGEX.exec(line)) !== null) {
        violations.push({
          id: 'DL-03',
          rule: 'DL-03',
          file: relFile,
          module: fileModule,
          line: lineNum,
          column: m.index + 1,
          severity: getSeverity('DL-03'),
          match: m[0],
          message: `Espaçamento "${m[0]}" viola a grade estrita de múltiplos de 4px.`
        });
      }
    }

    // DL-04: !important ou modificadores de força bruta
    if (checkDL04 && line.includes('!') && !isExempt('DL-04', lineNum)) {
      if (line.includes('!important')) {
        violations.push({
          id: 'DL-04',
          rule: 'DL-04',
          file: relFile,
          module: fileModule,
          line: lineNum,
          column: line.indexOf('!important') + 1,
          severity: getSeverity('DL-04'),
          match: '!important',
          message: `Uso proibido de especificidade forçada "!important".`
        });
      } else if (isCss) {
        let m;
        CSS_BANG_REGEX.lastIndex = 0;
        while ((m = CSS_BANG_REGEX.exec(line)) !== null) {
          violations.push({
            id: 'DL-04',
            rule: 'DL-04',
            file: relFile,
            module: fileModule,
            line: lineNum,
            column: m.index + 1,
            severity: getSeverity('DL-04'),
            match: m[0].trim(),
            message: `Uso proibido de especificidade forçada "${m[0].trim()}".`
          });
        }
      } else if (/(?:^|[\s"'`])![a-zA-Z]/.test(line)) {
        const hasClassOrString = /className|class|cn\(|cva\(|clsx\(|["'`]/.test(line);
        if (hasClassOrString) {
          let m;
          TAILWIND_BANG_REGEX.lastIndex = 0;
          while ((m = TAILWIND_BANG_REGEX.exec(line)) !== null) {
            violations.push({
              id: 'DL-04',
              rule: 'DL-04',
              file: relFile,
              module: fileModule,
              line: lineNum,
              column: m.index + 1,
              severity: getSeverity('DL-04'),
              match: m[0].trim(),
              message: `Uso proibido de especificidade forçada "${m[0].trim()}".`
            });
          }
          TAILWIND_KEYWORD_BANG_REGEX.lastIndex = 0;
          while ((m = TAILWIND_KEYWORD_BANG_REGEX.exec(line)) !== null) {
            violations.push({
              id: 'DL-04',
              rule: 'DL-04',
              file: relFile,
              module: fileModule,
              line: lineNum,
              column: m.index + 1,
              severity: getSeverity('DL-04'),
              match: m[0].trim(),
              message: `Uso proibido de especificidade forçada "${m[0].trim()}".`
            });
          }
        }
      }
    }

    // DL-05: Inline style com cor, padding ou margin
    if (checkDL05 && line.includes('style') && !isExempt('DL-05', lineNum)) {
      let m;
      INLINE_STYLE_REGEX.lastIndex = 0;
      while ((m = INLINE_STYLE_REGEX.exec(line)) !== null) {
        violations.push({
          id: 'DL-05',
          rule: 'DL-05',
          file: relFile,
          module: fileModule,
          line: lineNum,
          column: m.index + 1,
          severity: getSeverity('DL-05'),
          match: m[0],
          message: `Atributo style inline contendo propriedades visuais proibidas.`
        });
      }
    }

    // DL-06: Z-index arbitrário ou acima de 50
    if (checkDL06 && line.includes('z-') && !isExempt('DL-06', lineNum)) {
      let m;
      Z_INDEX_REGEX.lastIndex = 0;
      while ((m = Z_INDEX_REGEX.exec(line)) !== null) {
        violations.push({
          id: 'DL-06',
          rule: 'DL-06',
          file: relFile,
          module: fileModule,
          line: lineNum,
          column: m.index + 1,
          severity: getSeverity('DL-06'),
          match: m[0],
          message: `Z-index arbitrário ou fora da escala (0-50): "${m[0]}".`
        });
      }
    }

    // DL-07: Sombra decorativa em superfícies de aplicação
    if (checkDL07 && line.includes('shadow-') && !isExempt('DL-07', lineNum)) {
      const isOverlayContext = /dialog|popover|dropdown|modal|sheet|tooltip|menu|card-dialog/i.test(line);
      const isCssShadowSuppression =
        isCss &&
        (/^\s*--shadow-(?:sm|md|lg|xl|2xl)\s*:\s*none\b/i.test(line) ||
          (/\.shadow-(?:sm|md|lg|xl|2xl)\b/.test(line) &&
            /box-shadow\s*:\s*none\b/i.test(lines.slice(lineIdx, lineIdx + 4).join(' '))));
      if (!isOverlayContext && !isCssShadowSuppression) {
        let m;
        SHADOW_REGEX.lastIndex = 0;
        while ((m = SHADOW_REGEX.exec(line)) !== null) {
          violations.push({
            id: 'DL-07',
            rule: 'DL-07',
            file: relFile,
            module: fileModule,
            line: lineNum,
            column: m.index + 1,
            severity: getSeverity('DL-07'),
            match: m[0],
            message: `Sombra decorativa "${m[0]}" em superfície de aplicação. Sombras restritas a overlays.`
          });
        }
      }
    }

    // DL-08: Gradiente decorativo em superfície utilitária
    if (checkDL08 && line.includes('bg-gradient-') && !isExempt('DL-08', lineNum)) {
      let m;
      GRADIENT_REGEX.lastIndex = 0;
      while ((m = GRADIENT_REGEX.exec(line)) !== null) {
        violations.push({
          id: 'DL-08',
          rule: 'DL-08',
          file: relFile,
          module: fileModule,
          line: lineNum,
          column: m.index + 1,
          severity: getSeverity('DL-08'),
          match: m[0],
          message: `Gradiente decorativo "${m[0]}" em superfície utilitária de aplicação.`
        });
      }
    }

    // DL-09: Raios não-canônicos
    if (checkDL09 && line.includes('rounded-[') && !isExempt('DL-09', lineNum)) {
      let m;
      RADIUS_REGEX.lastIndex = 0;
      while ((m = RADIUS_REGEX.exec(line)) !== null) {
        violations.push({
          id: 'DL-09',
          rule: 'DL-09',
          file: relFile,
          module: fileModule,
          line: lineNum,
          column: m.index + 1,
          severity: getSeverity('DL-09'),
          match: m[0],
          message: `Raio de curvatura arbitrário "${m[0]}". Use os tokens canônicos de tokens.json.`
        });
      }
    }

    // DL-14: Alvo de toque < 44px delegado para análise multi-linha de blocos JSX (parseJsxTags)


    // DL-18: Texto ou fundo branco/preto literal
    if (checkDL18 && (line.includes('-white') || line.includes('-black')) && !isExempt('DL-18', lineNum)) {
      let m;
      LITERAL_WHITE_BLACK_REGEX.lastIndex = 0;
      while ((m = LITERAL_WHITE_BLACK_REGEX.exec(line)) !== null) {
        violations.push({
          id: 'DL-18',
          rule: 'DL-18',
          file: relFile,
          module: fileModule,
          line: lineNum,
          column: m.index + 1,
          severity: getSeverity('DL-18'),
          match: m[0],
          message: `Cor literal hardcoded "${m[0]}". Use tokens semânticos text-foreground/bg-background.`
        });
      }
    }

    // DL-19: Título de tela composto (> 6 palavras)
    if (checkDL19 && (line.includes('<h') || line.includes('<H')) && !isExempt('DL-19', lineNum)) {
      let m;
      HEADER_REGEX.lastIndex = 0;
      while ((m = HEADER_REGEX.exec(line)) !== null) {
        const text = m[1].replace(/<[^>]+>/g, '').trim();
        const wordCount = text.split(/\s+/).filter(Boolean).length;
        if (wordCount > 6) {
          violations.push({
            id: 'DL-19',
            rule: 'DL-19',
            file: relFile,
            module: fileModule,
            line: lineNum,
            column: m.index + 1,
            severity: getSeverity('DL-19'),
            match: text,
            message: `Título de cabeçalho com ${wordCount} palavras (> 6 palavras permitidas).`
          });
        }
      }
    }

    // DL-21: Texto que explica a própria tela
    if (checkDL21 && (line.includes('Esta ') || line.includes('Nesta ') || line.includes('Aqui ') || line.includes('Bem-vindo')) && !isExempt('DL-21', lineNum)) {
      let m;
      EXPLAIN_REGEX.lastIndex = 0;
      while ((m = EXPLAIN_REGEX.exec(line)) !== null) {
        violations.push({
          id: 'DL-21',
          rule: 'DL-21',
          file: relFile,
          module: fileModule,
          line: lineNum,
          column: m.index + 1,
          severity: getSeverity('DL-21'),
          match: m[0],
          message: `Texto redundante explicando a própria tela: "${m[0]}".`
        });
      }
    }

    // DL-23: Emojis na interface
    if (checkDL23 && !isExempt('DL-23', lineNum)) {
      let m;
      EMOJI_REGEX.lastIndex = 0;
      while ((m = EMOJI_REGEX.exec(line)) !== null) {
        violations.push({
          id: 'DL-23',
          rule: 'DL-23',
          file: relFile,
          module: fileModule,
          line: lineNum,
          column: m.index + 1,
          severity: getSeverity('DL-23'),
          match: m[0],
          message: `Emoji proibido na interface do produto: "${m[0]}". Substitua por Phosphor/Lucide.`
        });
      }
    }

    // DL-25: Mais de uma ação primária por superfície
    if (checkDL25 && line.includes('variant="default"') && !isExempt('DL-25', lineNum)) {
      primaryActionCount++;
      if (primaryActionCount > 1) {
        violations.push({
          id: 'DL-25',
          rule: 'DL-25',
          file: relFile,
          module: fileModule,
          line: lineNum,
          column: line.indexOf('variant="default"') + 1,
          severity: getSeverity('DL-25'),
          match: 'variant="default"',
          message: `Mais de uma ação primária (variant="default") na mesma superfície/componente.`
        });
      }
    }

    // DL-26: Animação acima de 300ms
    if (checkDL26 && line.includes('duration-') && !isExempt('DL-26', lineNum)) {
      let m;
      ANIM_ABOVE_300MS_REGEX.lastIndex = 0;
      while ((m = ANIM_ABOVE_300MS_REGEX.exec(line)) !== null) {
        violations.push({
          id: 'DL-26',
          rule: 'DL-26',
          file: relFile,
          module: fileModule,
          line: lineNum,
          column: m.index + 1,
          severity: getSeverity('DL-26'),
          match: m[0],
          message: `Duração de animação superior a 300ms: "${m[0]}".`
        });
      }
    }

    // DL-27: Transição genérica transition-all
    if (checkDL27 && line.includes('transition-all') && !isExempt('DL-27', lineNum)) {
      let m;
      GENERIC_TRANSITION_REGEX.lastIndex = 0;
      while ((m = GENERIC_TRANSITION_REGEX.exec(line)) !== null) {
        violations.push({
          id: 'DL-27',
          rule: 'DL-27',
          file: relFile,
          module: fileModule,
          line: lineNum,
          column: m.index + 1,
          severity: getSeverity('DL-27'),
          match: m[0],
          message: `Uso de transition-all proibido. Especifique propriedades: transition-transform, transition-opacity, transition-colors.`
        });
      }
    }

    // DL-29: Grid fixo sem guarda de janela
    if (checkDL29 && line.includes('grid-cols-') && !isExempt('DL-29', lineNum)) {
      let m;
      UNGUARDED_GRID_REGEX.lastIndex = 0;
      while ((m = UNGUARDED_GRID_REGEX.exec(line)) !== null) {
        violations.push({
          id: 'DL-29',
          rule: 'DL-29',
          file: relFile,
          module: fileModule,
          line: lineNum,
          column: m.index + 1,
          severity: getSeverity('DL-29'),
          match: m[0].trim(),
          message: `Grid de 3 ou mais colunas "${m[0].trim()}" aplicado sem prefixo responsivo (sm:/md:/lg:), quebrando telas móveis.`
        });
      }
    }

    // DL-30: Overflow horizontal em superfície de app
    if (checkDL30 && line.includes('overflow-x-') && !isExempt('DL-30', lineNum)) {
      const isScrollAreaContext = /scroll-area|ScrollArea|table|Table|carousel|Embla|tab-list|tablist|tab-strip|TabsList/i.test(line);
      if (!isScrollAreaContext) {
        let m;
        HORIZONTAL_OVERFLOW_REGEX.lastIndex = 0;
        while ((m = HORIZONTAL_OVERFLOW_REGEX.exec(line)) !== null) {
          violations.push({
            id: 'DL-30',
            rule: 'DL-30',
            file: relFile,
            module: fileModule,
            line: lineNum,
            column: m.index + 1,
            severity: getSeverity('DL-30'),
            match: m[0],
            message: `Overflow horizontal "${m[0]}" em superfície de aplicação fora de tabela/carrossel.`
          });
        }
      }
    }

    // DL-33: Paleta Tailwind crua de aviso (amber|yellow|lime) fora dos tokens warning/warning-strong
    if (checkDL33 && (line.includes('amber-') || line.includes('yellow-') || line.includes('lime-')) && !isExempt('DL-33', lineNum)) {
      let m;
      RAW_WARNING_PALETTE_REGEX.lastIndex = 0;
      while ((m = RAW_WARNING_PALETTE_REGEX.exec(line)) !== null) {
        violations.push({
          id: 'DL-33',
          rule: 'DL-33',
          file: relFile,
          module: fileModule,
          line: lineNum,
          column: m.index + 1,
          severity: getSeverity('DL-33'),
          match: m[0],
          message: `Paleta Tailwind crua "${m[0]}". Use os tokens semânticos warning e warning-strong.`
        });
      }
    }
  }

  // DL-14 e DL-15: Análise de blocos JSX multi-linha para elementos interativos (.tsx / .jsx apenas)
  if (!isCss && !isPlainTs && (isRuleActive('DL-14') || isRuleActive('DL-15'))) {
    const mightHaveInteractiveJsx =
      content.includes('onClick') ||
      content.includes('<button') ||
      content.includes('Button') ||
      content.includes('<a') ||
      content.includes('<Link') ||
      content.includes('<NavLink') ||
      content.includes('MenuItem') ||
      content.includes('Trigger') ||
      content.includes('SelectItem') ||
      content.includes('CommandItem') ||
      content.includes('AlertDialog');
    const jsxTags = mightHaveInteractiveJsx ? parseJsxTags(content) : [];
    for (let ti = 0; ti < jsxTags.length; ti++) {
      const tag = jsxTags[ti];
      const prevTag = ti > 0 ? jsxTags[ti - 1] : null;
      const isNativeButton = tag.tagName.toLowerCase() === 'button';
      const isDsButton = tag.tagName === 'Button' || tag.tagName.endsWith('Button');
      const isDsPrimitive = DS_INTERACTIVE_PRIMITIVES.has(tag.tagName);
      const isNativeDomElement = tag.tagName[0] === tag.tagName[0].toLowerCase();
      const isLink = (tag.tagName.toLowerCase() === 'a' || tag.tagName === 'Link' || tag.tagName === 'NavLink') && tag.tagName !== 'ExternalLink';
      const onClickValue = tag.tagContent.includes('onClick') ? getTopLevelJsxAttributeValue(tag.tagContent, 'onClick') : null;
      const hasOnClick = onClickValue !== null && !STOP_PROPAGATION_ONLY_REGEX.test(onClickValue);
      const isCheckboxOrRadio = tag.tagName.toLowerCase() === 'input' && tag.tagContent.includes('type') && /type\s*=\s*["'](?:checkbox|radio)["']/.test(tag.tagContent);
      const inheritsButtonAsChild =
        Boolean(prevTag) &&
        (prevTag.tagName === 'Button' || prevTag.tagName.endsWith('Button') || DS_INTERACTIVE_PRIMITIVES.has(prevTag.tagName)) &&
        !prevTag.tagContent.trimEnd().endsWith('/>') &&
        /\basChild\b/.test(prevTag.tagContent);

      const isActionElement = isNativeButton || isDsButton || isLink || (hasOnClick && (isNativeDomElement || isDsPrimitive));

      // DL-14: Alvo de toque < 44px (inspeção no className da própria tag interativa)
      if (isRuleActive('DL-14') && isActionElement && !isCheckboxOrRadio && tag.tagContent.includes('class')) {
        const ownClassAttr = getTopLevelJsxAttributeValue(tag.tagContent, 'className') ?? getTopLevelJsxAttributeValue(tag.tagContent, 'class') ?? '';
        if (ownClassAttr) {
          SMALL_TARGET_REGEX.lastIndex = 0;
          let m;
          while ((m = SMALL_TARGET_REGEX.exec(ownClassAttr)) !== null) {
            if (ownClassAttr.includes('min-h-11') || /\bh-11\b/.test(ownClassAttr) || /\bh-(?:1[1-9]|[2-9]\d)\b/.test(ownClassAttr)) continue;
            if (isExempt('DL-14', tag.line)) continue;

            // Tenta localizar linha exata do match no tagContent
            const classAttrOffset = tag.tagContent.indexOf(ownClassAttr);
            const approxOffset = classAttrOffset >= 0 ? classAttrOffset + m.index : 0;
            const textBefore = tag.tagContent.slice(0, approxOffset);
            const lineOffset = (textBefore.match(/\n/g) || []).length;
            const matchLine = tag.line + lineOffset;
            const lineOfMatch = getLines()[matchLine - 1] || '';
            if (lineOfMatch.trim().startsWith('//') || lineOfMatch.trim().startsWith('*') || lineOfMatch.trim().startsWith('/*')) continue;
            if (lineOfMatch.includes('min-h-11') || /\bh-11\b/.test(lineOfMatch) || isExempt('DL-14', matchLine)) continue;

            const lastNewlinePos = textBefore.lastIndexOf('\n');
            const matchCol = lastNewlinePos === -1 ? tag.col + approxOffset : (approxOffset - lastNewlinePos);

            violations.push({
              id: 'DL-14',
              rule: 'DL-14',
              file: relFile,
              module: fileModule,
              line: matchLine,
              column: matchCol,
              severity: getSeverity('DL-14'),
              match: m[0],
              message: `Alvo de toque com altura/dimensão inferior a 44px ("${m[0]}"). Exige min-h-11 (44px).`
            });
          }
        }
      }

      // DL-15: Interativo sem focus-visible
      if (isRuleActive('DL-15')) {
        const needsFocusRing = isNativeButton || (hasOnClick && (isNativeDomElement || isLink));
        if (needsFocusRing && !isDsButton && !isDsPrimitive && !inheritsButtonAsChild && !isExempt('DL-15', tag.line)) {
          const ownClassAttr = tag.tagContent.includes('class')
            ? (getTopLevelJsxAttributeValue(tag.tagContent, 'className') ?? getTopLevelJsxAttributeValue(tag.tagContent, 'class') ?? tag.tagContent)
            : tag.tagContent;
          const hasFocusVisible = ownClassAttr.includes('focus-visible:');
          if (!hasFocusVisible) {
            violations.push({
              id: 'DL-15',
              rule: 'DL-15',
              file: relFile,
              module: fileModule,
              line: tag.line,
              column: tag.col,
              severity: getSeverity('DL-15'),
              match: isNativeButton ? '<button sem focus-visible' : 'onClick sem focus-visible',
              message: `Elemento interativo sem anel de foco teclado (:focus-visible).`
            });
          }
        }
      }
    }
  }

  // --- REGRAS EM NÍVEL DE ARQUIVO (FILE-LEVEL CHECKS) ---

  const normRel = relFile.replace(/\\/g, '/');
  const isViewRoute = normRel.endsWith('.tsx') && (normRel.includes('src/routes/') || normRel.includes('src/components/'));

  if (isViewRoute && !isExempt('DL-11', 1)) {
    // DL-11: Superfície de dados assíncrona sem skeleton/loading
    if (isRuleActive('DL-11') && (content.includes('useQuery(') || content.includes('useSuspenseQuery(') || content.includes('useInfiniteQuery('))) {
      const hasLoadingState = content.includes('isLoading') || content.includes('isPending') || content.includes('Skeleton') || content.includes('loading');
      if (!hasLoadingState) {
        violations.push({
          id: 'DL-11',
          rule: 'DL-11',
          file: relFile,
          module: fileModule,
          line: 1,
          column: 1,
          severity: getSeverity('DL-11'),
          match: 'useQuery sem loading/skeleton',
          message: `Superfície de consulta assíncrona sem verificação de isLoading ou componente Skeleton.`
        });
      }
    }

    // DL-12: Superfície de dados sem estado vazio
    if (isRuleActive('DL-12') && /[a-zA-Z0-9_$)]\s*\??\.map\(/.test(content) && (content.includes('useQuery(') || /\bdata\?\./.test(content))) {
      const hasEmptyState = content.includes('length === 0') || content.includes('.length === 0') || content.includes('!length') || content.includes('EmptyState') || /\b(?:empty|nenhum|nenhuma|sem itens|vazio|vazia|não encontrad[oa]s?)\b/i.test(content);
      if (!hasEmptyState && !isExempt('DL-12', 1)) {
        violations.push({
          id: 'DL-12',
          rule: 'DL-12',
          file: relFile,
          module: fileModule,
          line: 1,
          column: 1,
          severity: getSeverity('DL-12'),
          match: '.map() sem verificação vazia',
          message: `Listagem de dados sem renderização condicional de estado vazio (Empty State).`
        });
      }
    }

    // DL-13: Superfície de dados sem estado de erro
    if (isRuleActive('DL-13') && (content.includes('useQuery(') || content.includes('useSuspenseQuery('))) {
      const hasErrorState = content.includes('isError') || content.includes('error') || content.includes('catch') || content.includes('ErrorBoundary');
      if (!hasErrorState && !isExempt('DL-13', 1)) {
        violations.push({
          id: 'DL-13',
          rule: 'DL-13',
          file: relFile,
          module: fileModule,
          line: 1,
          column: 1,
          severity: getSeverity('DL-13'),
          match: 'useQuery sem error state',
          message: `Superfície assíncrona sem captura e diagnóstico de erro (isError / ErrorBoundary).`
        });
      }
    }

    // DL-24: Barra fixa sem reserva de espaço no padding inferior
    if (isRuleActive('DL-24') && /(?:fixed|sticky)\s+bottom-0\b/.test(content)) {
      const hasPaddingBottomClearance = /\bpb-(?:1[2-9]|[2-9]\d|\d{3,})\b/.test(content) || /paddingBottom/.test(content);
      if (!hasPaddingBottomClearance && !isExempt('DL-24', 1)) {
        violations.push({
          id: 'DL-24',
          rule: 'DL-24',
          file: relFile,
          module: fileModule,
          line: 1,
          column: 1,
          severity: getSeverity('DL-24'),
          match: 'fixed/sticky bottom-0 sem pb clearance',
          message: `Barra fixa inferior sem folga de conteúdo (pb-16+ / paddingBottom) para evitar sobreposição.`
        });
      }
    }

    // DL-28: Ausência de respeito a movimento reduzido
    if (isRuleActive('DL-28') && /\banimate-(?:spin|pulse|bounce|ping)\b/.test(content)) {
      const hasMotionReduce = content.includes('motion-reduce:');
      if (!hasMotionReduce && !isExempt('DL-28', 1)) {
        violations.push({
          id: 'DL-28',
          rule: 'DL-28',
          file: relFile,
          module: fileModule,
          line: 1,
          column: 1,
          severity: getSeverity('DL-28'),
          match: 'animate-* sem motion-reduce',
          message: `Animação ativa sem tratamento para preferências de movimento reduzido (motion-reduce:transition-none).`
        });
      }
    }

    // DL-31: Containeritis / Card dentro de Card (Aninhamento redundante de superfícies)
    if (isRuleActive('DL-31') && content.includes('Card')) {
      const cardInCardRegex = /<div[^>]*className=["'][^"']*(?:rounded-[a-z0-9]+|border)[^"']*(?:bg-card|border-border)[^"']*["'][^>]*>\s*<(?:IFoodStoreFeedCard|OfferCard|StoreCard|ClassifiedItemCard|NewsCard|DirectoryBusinessCard)[^>]*>/g;
      let m;
      while ((m = cardInCardRegex.exec(content)) !== null) {
        const textBefore = content.slice(0, m.index);
        const matchLine = (textBefore.match(/\n/g) || []).length + 1;
        if (!isExempt('DL-31', matchLine)) {
          violations.push({
            id: 'DL-31',
            rule: 'DL-31',
            file: relFile,
            module: fileModule,
            line: matchLine,
            column: 1,
            severity: getSeverity('DL-31'),
            match: m[0].replace(/\s+/g, ' ').slice(0, 80),
            message: `Containeritis detectado: contêiner com borda/bg-card envolve diretamente componente de card já delimitado. Adote a Single Surface Rule.`
          });
        }
      }
    }

    // DL-32: Grade com mais de 2 colunas para cards de layout horizontal
    if (isRuleActive('DL-32') && content.includes('IFoodStoreFeedCard')) {
      const horizontalCardDenseGridRegex = /<div[^>]*className=["'][^"']*\bgrid\b[^"']*(?:grid-cols-3|grid-cols-4|lg:grid-cols-3|lg:grid-cols-4|md:grid-cols-3)[^"']*["'][^>]*>[\s\S]{1,400}?<(?:IFoodStoreFeedCard[^>]*variant=["']list["'])/g;
      let m;
      while ((m = horizontalCardDenseGridRegex.exec(content)) !== null) {
        const textBefore = content.slice(0, m.index);
        const matchLine = (textBefore.match(/\n/g) || []).length + 1;
        if (!isExempt('DL-32', matchLine)) {
          violations.push({
            id: 'DL-32',
            rule: 'DL-32',
            file: relFile,
            module: fileModule,
            line: matchLine,
            column: 1,
            severity: getSeverity('DL-32'),
            match: m[0].replace(/\s+/g, ' ').slice(0, 80),
            message: `Cards de layout horizontal operando em 3+ colunas comprimem o conteúdo útil. Use no máximo grid-cols-1 lg:grid-cols-2.`
          });
        }
      }
    }
  }

  return violations;
}

/**
 * Escaneia lista de caminhos de arquivos.
 */
export function lintFiles(files, config = null) {
  const loadedConfig = config || loadConfig();
  const allViolations = [];

  for (const file of files) {
    try {
      const content = fs.readFileSync(file, 'utf8');
      const fileViolations = lintSource(content, file, loadedConfig);
      allViolations.push(...fileViolations);
    } catch (err) {
      console.error(`Erro ao ler/lintar arquivo ${file}:`, err.message);
    }
  }

  return allViolations;
}

/**
 * Escaneia lista de caminhos de arquivos com I/O assíncrono concorrente preservando ordem determinística.
 */
export async function lintFilesAsync(files, config = null, concurrency = 64) {
  const loadedConfig = config || loadConfig();
  if (!files || files.length === 0) return [];
  const results = new Array(files.length);
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < files.length) {
      const idx = nextIndex++;
      const file = files[idx];
      try {
        const content = await fs.promises.readFile(file, 'utf8');
        results[idx] = lintSource(content, file, loadedConfig);
      } catch (err) {
        console.error(`Erro ao ler/lintar arquivo ${file}:`, err.message);
        results[idx] = [];
      }
    }
  }

  const workerCount = Math.min(concurrency, files.length);
  await Promise.all(Array.from({ length: workerCount }, () => worker()));
  return results.flat();
}

/**
 * Escaneia grandes lotes de arquivos em múltiplas worker threads (CPU + I/O paralelos).
 */
export async function lintFilesParallel(files, config = null) {
  const loadedConfig = config || loadConfig();
  if (!files || files.length === 0) return [];
  if (files.length < 200) {
    return lintFilesAsync(files, loadedConfig, 64);
  }

  const cpuCount = typeof os.availableParallelism === 'function' ? os.availableParallelism() : os.cpus().length;
  const workerCount = Math.max(2, Math.min(4, cpuCount || 2));
  const chunkSize = Math.ceil(files.length / workerCount);
  const selfUrl = fileURLToPath(import.meta.url);

  try {
    const chunks = [];
    for (let i = 0; i < files.length; i += chunkSize) {
      const slice = files.slice(i, i + chunkSize);
      if (slice.length > 0) chunks.push(slice);
    }

    const chunkResults = await Promise.all(
      chunks.map(
        (chunk) =>
          new Promise((resolve, reject) => {
            const w = new Worker(selfUrl, {
              workerData: { __waesyLintWorker: true, files: chunk, config: loadedConfig }
            });
            w.on('message', resolve);
            w.on('error', reject);
            w.on('exit', (code) => {
              if (code !== 0) reject(new Error(`Worker finalizado com código ${code}`));
            });
          })
      )
    );
    return chunkResults.flat();
  } catch {
    return lintFilesAsync(files, loadedConfig, 128);
  }
}

/**
 * Agrupa violações por severidade, regra e módulo.
 */
export function aggregateViolations(violations, filesCount = 0) {
  const counts = { P0: 0, P1: 0, P2: 0, P3: 0 };
  const byRule = {};
  const byModule = {};
  const filesWithViolationsSet = new Set();

  for (const v of violations) {
    filesWithViolationsSet.add(v.file);

    if (counts[v.severity] !== undefined) counts[v.severity]++;
    else counts[v.severity] = 1;

    byRule[v.id] = (byRule[v.id] || 0) + 1;

    if (!byModule[v.module]) {
      byModule[v.module] = { total: 0, P0: 0, P1: 0, P2: 0, P3: 0 };
    }
    byModule[v.module].total++;
    if (byModule[v.module][v.severity] !== undefined) {
      byModule[v.module][v.severity]++;
    }
  }

  return {
    totalViolations: violations.length,
    bySeverity: counts,
    byRule,
    byModule,
    filesWithViolations: filesWithViolationsSet.size,
    filesCount
  };
}

/**
 * Salva a baseline congelada em design-lint.baseline.json.
 */
export function updateBaseline(baselinePath = BASELINE_PATH, violations = [], filesCount = 0) {
  const agg = aggregateViolations(violations, filesCount);
  const baselineData = {
    version: '2.0.0',
    timestamp: new Date().toISOString(),
    totalViolations: agg.totalViolations,
    filesInspected: filesCount,
    filesWithViolations: agg.filesWithViolations,
    bySeverity: agg.bySeverity,
    byRule: agg.byRule,
    byModule: agg.byModule
  };

  safeWriteFileSync(baselinePath, JSON.stringify(baselineData, null, 2), 'utf8');
  return baselineData;
}

/**
 * Validação de catraca (ratchet): proíbe qualquer aumento de violações em relação à baseline.
 */
export function evaluateRatchet(currentAgg, baselineData) {
  const regressions = [];

  // 1. Total geral
  if (currentAgg.totalViolations > baselineData.totalViolations) {
    regressions.push({
      dimension: 'Total Geral',
      target: 'totalViolations',
      baseline: baselineData.totalViolations,
      current: currentAgg.totalViolations,
      delta: `+${currentAgg.totalViolations - baselineData.totalViolations}`
    });
  }

  // 2. Severidades impeditivas P0 e P1
  if (currentAgg.bySeverity.P0 > baselineData.bySeverity.P0) {
    regressions.push({
      dimension: 'Severidade P0',
      target: 'P0 (Bloqueia Entrega)',
      baseline: baselineData.bySeverity.P0,
      current: currentAgg.bySeverity.P0,
      delta: `+${currentAgg.bySeverity.P0 - baselineData.bySeverity.P0}`
    });
  }

  if (currentAgg.bySeverity.P1 > baselineData.bySeverity.P1) {
    regressions.push({
      dimension: 'Severidade P1',
      target: 'P1 (Bloqueia Merge)',
      baseline: baselineData.bySeverity.P1,
      current: currentAgg.bySeverity.P1,
      delta: `+${currentAgg.bySeverity.P1 - baselineData.bySeverity.P1}`
    });
  }

  // 3. Regras individuais
  for (const [ruleId, currCount] of Object.entries(currentAgg.byRule)) {
    const baseCount = baselineData.byRule[ruleId] || 0;
    if (currCount > baseCount) {
      regressions.push({
        dimension: 'Regra Específica',
        target: ruleId,
        baseline: baseCount,
        current: currCount,
        delta: `+${currCount - baseCount}`
      });
    }
  }

  // 4. Módulos individuais
  for (const [modName, currMod] of Object.entries(currentAgg.byModule)) {
    const baseModTotal = baselineData.byModule[modName]?.total || 0;
    if (currMod.total > baseModTotal) {
      regressions.push({
        dimension: 'Módulo Específico',
        target: modName,
        baseline: baseModTotal,
        current: currMod.total,
        delta: `+${currMod.total - baseModTotal}`
      });
    }
  }

  const isPassed = regressions.length === 0;
  const isReduced = currentAgg.totalViolations < baselineData.totalViolations;

  return {
    passed: isPassed,
    reduced: isReduced,
    reductionAmount: isReduced ? baselineData.totalViolations - currentAgg.totalViolations : 0,
    regressions
  };
}

/**
 * Gera artefato Markdown com o painel visual de saúde do design system.
 */
export function generateDashboard(reportData, baselineData, outputPath = DASHBOARD_PATH) {
  let md = `# LINT_DASHBOARD.md — Painel Canônico de Saúde Visual e Catraca\n\n`;
  md += `> Gerado automaticamente pelo Design Lint V2 em: \`${reportData.timestamp}\`\n\n`;

  md += `## 1. Resumo Executivo\n\n`;
  md += `| Métrica | Atual | Baseline Congelada | Status Catraca |\n`;
  md += `| :--- | :--- | :--- | :--- |\n`;
  md += `| **Total de Arquivos** | ${reportData.inspectedFiles} | ${baselineData.filesInspected || '-'} | Estável |\n`;
  md += `| **Arquivos com Débito** | ${reportData.summary.filesWithViolations} | ${baselineData.filesWithViolations || '-'} | Monitorado |\n`;
  md += `| **Total de Violações** | **${reportData.totalViolations}** | **${baselineData.totalViolations}** | ${reportData.totalViolations <= baselineData.totalViolations ? 'PASS (<= Baseline)' : 'FAIL (Regressão)'} |\n`;
  md += `| **P0 (Bloqueia Entrega)** | **${reportData.summary.bySeverity.P0}** | ${baselineData.bySeverity.P0} | ${reportData.summary.bySeverity.P0 <= baselineData.bySeverity.P0 ? 'PASS' : 'FAIL'} |\n`;
  md += `| **P1 (Bloqueia Merge)** | **${reportData.summary.bySeverity.P1}** | ${baselineData.bySeverity.P1} | ${reportData.summary.bySeverity.P1 <= baselineData.bySeverity.P1 ? 'PASS' : 'FAIL'} |\n`;
  md += `| **P2 (Fila de Correção)** | ${reportData.summary.bySeverity.P2} | ${baselineData.bySeverity.P2} | Acompanhamento |\n`;
  md += `| **P3 (Polimento)** | ${reportData.summary.bySeverity.P3} | ${baselineData.bySeverity.P3} | Acompanhamento |\n\n`;

  md += `## 2. Débito Visual por Módulo\n\n`;
  md += `| Módulo | Total | P0 | P1 | P2 | P3 |\n`;
  md += `| :--- | :--- | :--- | :--- | :--- | :--- |\n`;
  for (const [mod, stats] of Object.entries(reportData.summary.byModule).sort((a, b) => b[1].total - a[1].total)) {
    md += `| \`${mod}\` | ${stats.total} | ${stats.P0} | ${stats.P1} | ${stats.P2} | ${stats.P3} |\n`;
  }
  md += `\n`;

  md += `## 3. Débito Visual por Regra Normativa (DL-01 a DL-33)\n\n`;
  md += `| Regra | Descrição Sumária | Severidade | Ocorrências |\n`;
  md += `| :--- | :--- | :--- | :--- |\n`;
  for (const [ruleId, count] of Object.entries(reportData.summary.byRule).sort((a, b) => b[1] - a[1])) {
    const sev = reportData.config.rules[ruleId]?.severity || '-';
    md += `| **${ruleId}** | Diretriz do Catálogo | \`${sev}\` | ${count} |\n`;
  }
  md += `\n`;

  safeWriteFileSync(outputPath, md, 'utf8');
}

/**
 * Identifica arquivos de teste, specs, stubs ou gerados automaticamente que não compõem UI de produção.
 */
export function isTestOrGeneratedFile(filePath) {
  const norm = filePath.replace(/\\/g, '/');
  return (
    norm.endsWith('/routeTree.gen.ts') ||
    norm === 'src/routeTree.gen.ts' ||
    norm.endsWith('/integrations/supabase/types.ts') ||
    norm === 'src/integrations/supabase/types.ts' ||
    norm.includes('/__tests__/') ||
    norm.includes('/__mocks__/') ||
    /\.(?:test|spec)\.[jt]sx?$/i.test(norm) ||
    /\.d\.ts$/i.test(norm)
  );
}

/**
 * Coleta lista de arquivos para varredura.
 */
export function getFilesToScan(isChangedOnly = false) {
  if (isChangedOnly) {
    try {
      const output = execSync('git status --porcelain', { encoding: 'utf8' });
      const changedFiles = output
        .split('\n')
        .map(line => line.slice(3).trim())
        .filter(f => f && (f.endsWith('.tsx') || f.endsWith('.ts') || f.endsWith('.jsx') || f.endsWith('.js') || f.endsWith('.css')))
        .filter(f => f.startsWith('src/') && !isTestOrGeneratedFile(f))
        .map(f => path.resolve(f))
        .filter(f => fs.existsSync(f));
      return changedFiles;
    } catch {
      console.warn('Aviso: git status falhou. Recorrendo à varredura completa.');
    }
  }

  function walk(dir) {
    let results = [];
    const list = fs.readdirSync(dir, { withFileTypes: true });
    for (const item of list) {
      const full = path.join(dir, item.name);
      if (item.isDirectory()) {
        if (!['node_modules', 'dist', '.git', 'legacy_quarantine', '__tests__', '__mocks__'].includes(item.name)) {
          results = results.concat(walk(full));
        }
      } else if (
        ['.tsx', '.ts', '.jsx', '.js', '.css'].some(ext => item.name.endsWith(ext)) &&
        !isTestOrGeneratedFile(full)
      ) {
        results.push(full);
      }
    }
    return results;
  }

  return walk(path.resolve('src'));
}

// --- EXECUÇÃO WORKER THREAD ---
if (!isMainThread && workerData && workerData.__waesyLintWorker && parentPort) {
  const violations = await lintFilesAsync(workerData.files, workerData.config, 32);
  parentPort.postMessage(violations);
}

// --- EXECUÇÃO CLI PRINCIPAL ---
const isMain = isMainThread && process.argv[1] && (path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url)));

if (isMain) {
  const isRatchet = process.argv.includes('--ratchet');
  const isUpdateBaseline = process.argv.includes('--update-baseline');
  const isChangedOnly = process.argv.includes('--changed');

  const config = loadConfig();
  const files = getFilesToScan(isChangedOnly);

  console.log(`\n======================================================================`);
  console.log(`WAESY DESIGN LINT V2 — Auditoria Determinística e Catraca de CI`);
  console.log(`Arquivos sob inspeção: ${files.length} | Modo: ${isChangedOnly ? '--changed' : 'completo'}`);
  console.log(`======================================================================\n`);

  const violations = await lintFilesAsync(files, config, 64);
  const summary = aggregateViolations(violations, files.length);

  // Atualizar Baseline se solicitado
  if (isUpdateBaseline) {
    const updated = updateBaseline(BASELINE_PATH, violations, files.length);
    console.log(`BASELINE CONGELADA COM SUCESSO:`);
    console.log(`----------------------------------------------------------------------`);
    console.log(`Arquivo gravado: ${path.relative(process.cwd(), BASELINE_PATH)}`);
    console.log(`Total de violações congeladas: ${updated.totalViolations}`);
    console.log(`P0: ${updated.bySeverity.P0} | P1: ${updated.bySeverity.P1} | P2: ${updated.bySeverity.P2} | P3: ${updated.bySeverity.P3}`);
    console.log(`----------------------------------------------------------------------\n`);
  }

  // Relatório terminal sumário
  console.log(`RESUMO DETERMINÍSTICO DE ACHADOS:`);
  console.log(`----------------------------------------------------------------------`);
  console.log(`Severidade P0 (Bloqueia Entrega): ${summary.bySeverity.P0}`);
  console.log(`Severidade P1 (Bloqueia Merge):   ${summary.bySeverity.P1}`);
  console.log(`Severidade P2 (Fila de Correção): ${summary.bySeverity.P2}`);
  console.log(`Severidade P3 (Polimento):        ${summary.bySeverity.P3}`);
  console.log(`Total Geral de Violações:         ${summary.totalViolations}`);
  console.log(`Arquivos com Débito:              ${summary.filesWithViolations} de ${files.length}`);
  console.log(`----------------------------------------------------------------------\n`);

  // Gravar relatório JSON
  const reportData = {
    version: '2.0.0',
    timestamp: new Date().toISOString(),
    inspectedFiles: files.length,
    totalViolations: summary.totalViolations,
    summary,
    config,
    violationsSample: violations.slice(0, 150)
  };
  safeWriteFileSync(REPORT_PATH, JSON.stringify(reportData, null, 2), 'utf8');

  // Carregar baseline para comparar se existir
  let baseline = null;
  if (fs.existsSync(BASELINE_PATH)) {
    baseline = JSON.parse(fs.readFileSync(BASELINE_PATH, 'utf8'));
    generateDashboard(reportData, baseline, DASHBOARD_PATH);
    console.log(`Painel de saúde gerado em: ${path.relative(process.cwd(), DASHBOARD_PATH)}`);
  }

  // Avaliação da Catraca (Ratchet)
  if (isRatchet) {
    if (!baseline) {
      console.error(`ERRO: Modo --ratchet exige baseline congelada em ${BASELINE_PATH}.`);
      console.error(`Execute primeiro 'node scripts/design-lint.mjs --update-baseline'.`);
      process.exit(1);
    }

    const result = evaluateRatchet(summary, baseline);

    if (!result.passed) {
      console.error(`\n======================================================================`);
      console.error(`FALHA NA CATRACA (REGRESSÃO DETECTADA): Nenhuma violação nova pode entrar!`);
      console.error(`======================================================================\n`);
      console.error(`| Dimensão | Alvo da Regressão | Baseline Congelada | Valor Atual | Variação |`);
      console.error(`| :--- | :--- | :--- | :--- | :--- |`);
      for (const reg of result.regressions) {
        console.error(`| ${reg.dimension} | ${reg.target} | ${reg.baseline} | ${reg.current} | ${reg.delta} |`);
      }
      console.error(`\nEntrega/PR bloqueados para impedir aumento de dívida técnica visual.`);
      process.exit(1);
    }

    if (result.reduced) {
      console.log(`\n======================================================================`);
      console.log(`CATRACA ATIVA: Débito visual reduzido em ${result.reductionAmount} violações!`);
      console.log(`Execute 'npm run lint:design:update-baseline' para abaixar permanentemente o teto.`);
      console.log(`======================================================================\n`);
    } else {
      console.log(`CATRACA APROVADA: Zero regressões visuais em relação à baseline congelada.`);
    }

    process.exit(0);
  }

  // Sem flag ratchet, se for update-baseline encerra com sucesso
  if (isUpdateBaseline) {
    process.exit(0);
  }

  // Modo padrão sem ratchet: avisa sobre violações P0/P1
  if (summary.bySeverity.P0 > 0 || summary.bySeverity.P1 > 0) {
    console.log(`Aviso: Foram detectadas ${summary.bySeverity.P0} violações P0 e ${summary.bySeverity.P1} violações P1.`);
    console.log(`No fluxo de CI automatizado, a verificação utiliza '--ratchet' para impedir regressões.`);
  }
}
