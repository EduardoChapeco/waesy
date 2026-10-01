import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const CONFIG_PATH = path.resolve('.designlintrc.json');
const BASELINE_PATH = path.resolve('design-lint.baseline.json');
const REPORT_PATH = path.resolve('design-lint.report.json');
const DASHBOARD_PATH = path.resolve('docs/design/LINT_DASHBOARD.md');

/**
 * Carrega e valida configuração normativa do Design Lint (.designlintrc.json).
 */
export function loadConfig(configPath = CONFIG_PATH) {
  if (!fs.existsSync(configPath)) {
    throw new Error(`ERRO FATAL: Arquivo de configuração ${configPath} não encontrado.`);
  }

  const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

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

/**
 * Analisa e extrai exceções declaradas em comentários inline do código fonte:
 * // design-lint-ignore DL-XX reason:"Motivo com mais de 10 caracteres" expiry:"YYYY-MM-DD"
 */
export function parseInlineExemptions(lines) {
  const exemptions = new Map(); // lineIndex -> Array<{ rule: string, reason: string, expiry: string, valid: boolean, error?: string }>
  const today = new Date().toISOString().slice(0, 10);
  const regex = /(?:\/\/|\/\*)\s*design-lint-(?:ignore|disable)\s+([A-Z0-9-]+)(?:\s+reason:"([^"]+)")?(?:\s+expiry:"([^"]+)")?/g;

  lines.forEach((line, idx) => {
    let match;
    regex.lastIndex = 0;
    while ((match = regex.exec(line)) !== null) {
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
  });

  return exemptions;
}

/**
 * Linta uma string de código fonte e retorna todas as violações encontradas.
 */
export function lintSource(content, filePath, customConfig = null) {
  const config = customConfig || loadConfig();
  const relFile = filePath.replace(/\\/g, '/');
  const fileModule = getModule(relFile);
  const isCss = relFile.endsWith('.css');
  const lines = content.split('\n');
  const violations = [];

  const inlineExemptions = parseInlineExemptions(lines);

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

  function isExempt(ruleId, lineNum) {
    // 1. Checar allowlist da configuração
    if (config.allowlist) {
      const allowed = config.allowlist.some(a => a.id === ruleId && relFile.includes(a.file.replace(/\\/g, '/')));
      if (allowed) return true;
    }
    // 2. Checar exceções inline
    const exList = inlineExemptions.get(lineNum);
    if (exList) {
      const found = exList.find(e => e.rule === ruleId && e.valid);
      if (found) return true;
    }
    return false;
  }

  function isRuleActive(ruleId) {
    return config.rules && config.rules[ruleId]?.enabled;
  }

  function getSeverity(ruleId) {
    return config.rules && config.rules[ruleId]?.severity ? config.rules[ruleId].severity : 'P1';
  }

  // --- REGRAS LINHA A LINHA ---

  // DL-01: Cores literais fora de token (#hex, rgb(), hsl())
  const hexRegex = /#(?:[0-9a-fA-F]{3,4}){1,2}\b/g;
  const rgbRegex = /\b(?:rgb|hsl)a?\([^)]+\)/g;

  // DL-02: Classes arbitrárias entre colchetes
  const arbitraryClassRegex = /\b[a-zA-Z0-9_-]+-\[[^\]]+\]/g;

  // DL-03: Espaçamento fora da grade de 4px (half-steps e não-múltiplos)
  const non4pxSpacingRegex = /\b(?:p[xytblr]?|m[xytblr]?|gap(?:-[xy])?|space-[xy])-(?:0\.5|1\.5|2\.5|3\.5)\b/g;

  // DL-04: !important ou modificadores de força bruta
  const importantRegex = /!important|(?:^|[\s"'`])!(?:[a-zA-Z0-9_-]+)/g;

  // DL-05: Inline style com estilos visuais arbitrários
  const inlineStyleRegex = /style\s*=\s*\{\{\s*[^}]*(?:color|background|padding|margin|width|height)[^}]*\}\}/gi;

  // DL-06: Z-index arbitrário ou acima de 50
  const zIndexRegex = /\bz-(?:[6-9]\d|\d{3,})\b|\bz-\[[^\]]+\]/g;

  // DL-07: Sombra decorativa em superfícies de aplicação
  const shadowRegex = /\bshadow-(?:sm|md|lg|xl|2xl)\b/g;

  // DL-08: Gradiente decorativo em superfície utilitária
  const gradientRegex = /\bbg-gradient-(?:to-[trbl]{1,2}|radial|conic)\b/g;

  // DL-09: Raios não-canônicos
  const radiusRegex = /\brounded-(?:xl|2xl|3xl)\b|\brounded-\[[^\]]+\]/g;

  // DL-14: Alvo de toque < 44px em elemento interativo
  const smallTargetRegex = /\b(?:h|size)-(?:1|2|3|4|5|6|7|8|9|10|3\.5|2\.5|1\.5|0\.5)\b/g;

  // DL-18: Hardcoded white/black literal
  const literalWhiteBlackRegex = /\b(?:text|bg)-(?:white|black)\b/g;

  // DL-19: Título de cabeçalho com mais de 6 palavras
  const headerRegex = /<h[12][^>]*>([^<]{20,})<\/h[12]>/gi;

  // DL-21: Texto que explica a própria tela (Anti-AI design)
  const explainRegex = /(?:Esta|Nesta) (?:tela|página|seção) (?:permite|serve|apresenta|você pode|foi desenvolvida)|Aqui você pode (?:visualizar|gerenciar|acessar|conferir)|Bem-vindo ao (?:painel|sistema|portal)/gi;

  // DL-23: Emojis na interface
  const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu;

  // DL-26: Animação acima de 300ms
  const animAbove300msRegex = /\bduration-(?:[4-9]\d{2}|\d{4,})\b/g;

  // DL-27: Transição genérica transition-all
  const genericTransitionRegex = /\btransition-all\b/g;

  // DL-29: Grid fixo sem guarda de janela (>= 3 colunas sem sm:/md:/lg:)
  const unguardedGridRegex = /(?:^|["'\s])(?<!sm:|md:|lg:|xl:|2xl:)grid-cols-(?:[3-9]|1[0-2])\b/g;

  // DL-30: Overflow horizontal em superfície de app
  const horizontalOverflowRegex = /\boverflow-x-(?:auto|scroll)\b/g;

  let primaryActionCount = 0;

  lines.forEach((line, lineIdx) => {
    const lineNum = lineIdx + 1;
    const isCommentLine = line.trim().startsWith('//') || line.trim().startsWith('*') || line.trim().startsWith('/*');

    // DL-01: Hex / RGB fora de token
    if (!isCss && isRuleActive('DL-01') && !isCommentLine && !isExempt('DL-01', lineNum)) {
      let m;
      hexRegex.lastIndex = 0;
      while ((m = hexRegex.exec(line)) !== null) {
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
      rgbRegex.lastIndex = 0;
      while ((m = rgbRegex.exec(line)) !== null) {
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

    // DL-02: Classes arbitrárias entre colchetes
    if (isRuleActive('DL-02') && !isCommentLine && !isExempt('DL-02', lineNum)) {
      let m;
      arbitraryClassRegex.lastIndex = 0;
      while ((m = arbitraryClassRegex.exec(line)) !== null) {
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
    if (isRuleActive('DL-03') && !isCommentLine && !isExempt('DL-03', lineNum)) {
      let m;
      non4pxSpacingRegex.lastIndex = 0;
      while ((m = non4pxSpacingRegex.exec(line)) !== null) {
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
    if (isRuleActive('DL-04') && !isCommentLine && !isExempt('DL-04', lineNum)) {
      let m;
      importantRegex.lastIndex = 0;
      while ((m = importantRegex.exec(line)) !== null) {
        violations.push({
          id: 'DL-04',
          rule: 'DL-04',
          file: relFile,
          module: fileModule,
          line: lineNum,
          column: m.index + 1,
          severity: getSeverity('DL-04'),
          match: m[0],
          message: `Uso proibido de especificidade forçada "${m[0]}".`
        });
      }
    }

    // DL-05: Inline style com cor, padding ou margin
    if (!isCss && isRuleActive('DL-05') && !isCommentLine && !isExempt('DL-05', lineNum)) {
      let m;
      inlineStyleRegex.lastIndex = 0;
      while ((m = inlineStyleRegex.exec(line)) !== null) {
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
    if (isRuleActive('DL-06') && !isCommentLine && !isExempt('DL-06', lineNum)) {
      let m;
      zIndexRegex.lastIndex = 0;
      while ((m = zIndexRegex.exec(line)) !== null) {
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
    if (isRuleActive('DL-07') && !isCommentLine && !isExempt('DL-07', lineNum)) {
      const isOverlayContext = /dialog|popover|dropdown|modal|sheet|tooltip|menu|card-dialog/i.test(line);
      if (!isOverlayContext) {
        let m;
        shadowRegex.lastIndex = 0;
        while ((m = shadowRegex.exec(line)) !== null) {
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
    if (!isCss && isRuleActive('DL-08') && !isCommentLine && !isExempt('DL-08', lineNum)) {
      let m;
      gradientRegex.lastIndex = 0;
      while ((m = gradientRegex.exec(line)) !== null) {
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
    if (isRuleActive('DL-09') && !isCommentLine && !isExempt('DL-09', lineNum)) {
      let m;
      radiusRegex.lastIndex = 0;
      while ((m = radiusRegex.exec(line)) !== null) {
        violations.push({
          id: 'DL-09',
          rule: 'DL-09',
          file: relFile,
          module: fileModule,
          line: lineNum,
          column: m.index + 1,
          severity: getSeverity('DL-09'),
          match: m[0],
          message: `Raio de curvatura não-canônico "${m[0]}". Permitidos: none, sm, md, lg, full.`
        });
      }
    }

    // DL-14: Alvo de toque < 44px
    if (isRuleActive('DL-14') && !isCommentLine && !isExempt('DL-14', lineNum)) {
      if (line.includes('onClick') || line.includes('<button') || line.includes('<Button') || line.includes('<a ') || line.includes('<Link')) {
        let m;
        smallTargetRegex.lastIndex = 0;
        while ((m = smallTargetRegex.exec(line)) !== null) {
          violations.push({
            id: 'DL-14',
            rule: 'DL-14',
            file: relFile,
            module: fileModule,
            line: lineNum,
            column: m.index + 1,
            severity: getSeverity('DL-14'),
            match: m[0],
            message: `Alvo de toque com altura/dimensão inferior a 44px ("${m[0]}"). Exige min-h-11 (44px).`
          });
        }
      }
    }

    // DL-15: Interativo sem focus-visible
    if (isRuleActive('DL-15') && !isCommentLine && !isExempt('DL-15', lineNum)) {
      if ((line.includes('onClick') || line.includes('<button')) && !line.includes('focus-visible:') && !line.includes('<Button')) {
        violations.push({
          id: 'DL-15',
          rule: 'DL-15',
          file: relFile,
          module: fileModule,
          line: lineNum,
          column: 1,
          severity: getSeverity('DL-15'),
          match: 'onClick/button sem focus-visible',
          message: `Elemento interativo sem anel de foco teclado (:focus-visible).`
        });
      }
    }

    // DL-18: Texto ou fundo branco/preto literal
    if (isRuleActive('DL-18') && !isCommentLine && !isExempt('DL-18', lineNum)) {
      let m;
      literalWhiteBlackRegex.lastIndex = 0;
      while ((m = literalWhiteBlackRegex.exec(line)) !== null) {
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
    if (isRuleActive('DL-19') && !isCommentLine && !isExempt('DL-19', lineNum)) {
      let m;
      headerRegex.lastIndex = 0;
      while ((m = headerRegex.exec(line)) !== null) {
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
    if (isRuleActive('DL-21') && !isCommentLine && !isExempt('DL-21', lineNum)) {
      let m;
      explainRegex.lastIndex = 0;
      while ((m = explainRegex.exec(line)) !== null) {
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
    if (isRuleActive('DL-23') && !isCommentLine && !isExempt('DL-23', lineNum)) {
      let m;
      emojiRegex.lastIndex = 0;
      while ((m = emojiRegex.exec(line)) !== null) {
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
    if (isRuleActive('DL-25') && !isCommentLine && !isExempt('DL-25', lineNum)) {
      if (line.includes('variant="default"')) {
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
    }

    // DL-26: Animação acima de 300ms
    if (isRuleActive('DL-26') && !isCommentLine && !isExempt('DL-26', lineNum)) {
      let m;
      animAbove300msRegex.lastIndex = 0;
      while ((m = animAbove300msRegex.exec(line)) !== null) {
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
    if (isRuleActive('DL-27') && !isCommentLine && !isExempt('DL-27', lineNum)) {
      let m;
      genericTransitionRegex.lastIndex = 0;
      while ((m = genericTransitionRegex.exec(line)) !== null) {
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
    if (isRuleActive('DL-29') && !isCommentLine && !isExempt('DL-29', lineNum)) {
      let m;
      unguardedGridRegex.lastIndex = 0;
      while ((m = unguardedGridRegex.exec(line)) !== null) {
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
    if (isRuleActive('DL-30') && !isCommentLine && !isExempt('DL-30', lineNum)) {
      const isScrollAreaContext = /scroll-area|ScrollArea|table|Table|carousel|Embla|tab-list|TabsList/i.test(line);
      if (!isScrollAreaContext) {
        let m;
        horizontalOverflowRegex.lastIndex = 0;
        while ((m = horizontalOverflowRegex.exec(line)) !== null) {
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
  });

  // --- REGRAS EM NÍVEL DE ARQUIVO (FILE-LEVEL CHECKS) ---

  const isViewRoute = relFile.endsWith('.tsx') && (relFile.includes('src/routes/') || relFile.includes('src/components/'));

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
    if (isRuleActive('DL-12') && content.includes('.map(') && (content.includes('useQuery(') || content.includes('data?.'))) {
      const hasEmptyState = content.includes('length === 0') || content.includes('.length === 0') || content.includes('EmptyState') || content.includes('empty') || content.includes('nenhum') || content.includes('sem itens') || content.includes('vazio');
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

  fs.writeFileSync(baselinePath, JSON.stringify(baselineData, null, 2), 'utf8');
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

  md += `## 3. Débito Visual por Regra Normativa (DL-01 a DL-30)\n\n`;
  md += `| Regra | Descrição Sumária | Severidade | Ocorrências |\n`;
  md += `| :--- | :--- | :--- | :--- |\n`;
  for (const [ruleId, count] of Object.entries(reportData.summary.byRule).sort((a, b) => b[1] - a[1])) {
    const sev = reportData.config.rules[ruleId]?.severity || '-';
    md += `| **${ruleId}** | Diretriz do Catálogo | \`${sev}\` | ${count} |\n`;
  }
  md += `\n`;

  fs.writeFileSync(outputPath, md, 'utf8');
}

/**
 * Coleta lista de arquivos para varredura.
 */
function getFilesToScan(isChangedOnly = false) {
  if (isChangedOnly) {
    try {
      const output = execSync('git status --porcelain', { encoding: 'utf8' });
      const changedFiles = output
        .split('\n')
        .map(line => line.slice(3).trim())
        .filter(f => f && (f.endsWith('.tsx') || f.endsWith('.ts') || f.endsWith('.jsx') || f.endsWith('.js') || f.endsWith('.css')))
        .filter(f => f.startsWith('src/'))
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
        if (!['node_modules', 'dist', '.git', 'legacy_quarantine'].includes(item.name)) {
          results = results.concat(walk(full));
        }
      } else if (['.tsx', '.ts', '.jsx', '.js', '.css'].some(ext => item.name.endsWith(ext))) {
        results.push(full);
      }
    }
    return results;
  }

  return walk(path.resolve('src'));
}

// --- EXECUÇÃO CLI PRINCIPAL ---
const isMain = process.argv[1] && (path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url)));

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

  const violations = lintFiles(files, config);
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
  fs.writeFileSync(REPORT_PATH, JSON.stringify(reportData, null, 2), 'utf8');

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
