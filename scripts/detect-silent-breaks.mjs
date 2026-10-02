#!/usr/bin/env node
/**
 * ============================================================================
 * Waesy Platform — Scanner Estático de Quebras Silenciosas (Fase S34)
 * ============================================================================
 * Detecta blocos catch vazios, supressões de exceção sem log e handlers
 * assíncronos desarmados em src/
 */

import fs from 'fs';
import path from 'path';

const SRC_DIR = path.resolve('src');
const REPORT_PATH = path.resolve('docs/audit/SILENT_BREAKS_REPORT.json');

const PATTERNS = [
  {
    id: 'SB-01',
    name: 'Bloco catch completamente vazio',
    regex: /catch\s*(?:\([a-zA-Z0-9_$,\s]*\))?\s*\{\s*\}/g,
    severity: 'P1',
  },
  {
    id: 'SB-02',
    name: 'Bloco catch contendo apenas comentários',
    // Procura catch com apenas comentários (//... ou /*...*/)
    regex: /catch\s*(?:\([a-zA-Z0-9_$,\s]*\))?\s*\{\s*(?:\/\/[^\n]*\s*|\/\*[\s\S]*?\*\/\s*)+\}/g,
    severity: 'P1',
  },
  {
    id: 'SB-03',
    name: 'Promessa com .catch(() => {}) vazio',
    regex: /\.catch\s*\(\s*(?:\(\s*[a-zA-Z0-9_$,\s]*\s*\)|[a-zA-Z0-9_$]+)\s*=>\s*\{\s*\}\s*\)/g,
    severity: 'P1',
  },
  {
    id: 'SB-04',
    name: 'Promessa com .catch(() => null) sem telemetria',
    regex: /\.catch\s*\(\s*(?:\(\s*[a-zA-Z0-9_$,\s]*\s*\)|[a-zA-Z0-9_$]+)\s*=>\s*(?:null|undefined)\s*\)/g,
    severity: 'P2',
  },
];

function scanDirectory(dir, fileList = []) {
  if (!fs.existsSync(dir)) return fileList;
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      if (['node_modules', 'dist', '.git', 'coverage'].includes(entry.name)) {
        continue;
      }
      scanDirectory(fullPath, fileList);
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name);
      if (['.ts', '.tsx', '.js', '.jsx'].includes(ext)) {
        // Ignorar arquivos de teste unitário
        if (!entry.name.endsWith('.test.ts') && !entry.name.endsWith('.spec.ts')) {
          fileList.push(fullPath);
        }
      }
    }
  }

  return fileList;
}

function analyzeFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const relPath = path.relative(process.cwd(), filePath).replace(/\\/g, '/');
  const findings = [];

  const lines = content.split('\n');

  for (const pattern of PATTERNS) {
    let match;
    const regex = new RegExp(pattern.regex.source, pattern.regex.flags);

    while ((match = regex.exec(content)) !== null) {
      // Determinar o número da linha correspondente ao índice
      const prefix = content.slice(0, match.index);
      const lineNumber = prefix.split('\n').length;
      const snippet = match[0].slice(0, 100).replace(/\r?\n/g, ' ');

      findings.push({
        ruleId: pattern.id,
        ruleName: pattern.name,
        severity: pattern.severity,
        file: relPath,
        line: lineNumber,
        snippet,
      });
    }
  }

  return findings;
}

export function runSilentBreakAudit() {
  const files = scanDirectory(SRC_DIR);
  const allFindings = [];

  for (const file of files) {
    const fileFindings = analyzeFile(file);
    if (fileFindings.length > 0) {
      allFindings.push(...fileFindings);
    }
  }

  const summary = {
    scannedFiles: files.length,
    totalFindings: allFindings.length,
    bySeverity: {
      P1: allFindings.filter((f) => f.severity === 'P1').length,
      P2: allFindings.filter((f) => f.severity === 'P2').length,
    },
    byRule: PATTERNS.reduce((acc, p) => {
      acc[p.id] = allFindings.filter((f) => f.ruleId === p.id).length;
      return acc;
    }, {}),
    timestamp: new Date().toISOString(),
    findings: allFindings,
  };

  const outputDir = path.dirname(REPORT_PATH);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  fs.writeFileSync(REPORT_PATH, JSON.stringify(summary, null, 2), 'utf8');

  console.log('='.repeat(70));
  console.log(' Auditoria Estática de Quebras Silenciosas — Waesy Platform');
  console.log('='.repeat(70));
  console.log(`Arquivos escaneados: ${summary.scannedFiles}`);
  console.log(`Total de ocorrências: ${summary.totalFindings}`);
  console.log(`  P1 (Catch vazio / Promessa não tratada): ${summary.bySeverity.P1}`);
  console.log(`  P2 (Supressão para null sem telemetria): ${summary.bySeverity.P2}`);
  console.log(`Relatório salvo em: ${path.relative(process.cwd(), REPORT_PATH)}`);
  console.log('='.repeat(70));

  return summary;
}

if (process.argv[1] && process.argv[1].endsWith('detect-silent-breaks.mjs')) {
  runSilentBreakAudit();
}
