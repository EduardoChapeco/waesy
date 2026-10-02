/**
 * scripts/generate-changelog.mjs
 *
 * Gerador determinístico de CHANGELOG.md e sincronizador do ROADMAP_VIVO.md
 * Fase F19 do Plano Mestre de Estabilização dos 4 Pilares.
 */

import fs from "fs";
import path from "path";
import { execSync } from "child_process";

const rootDir = process.cwd();
const changelogPath = path.join(rootDir, "CHANGELOG.md");
const decisionsPath = path.join(rootDir, "docs", "design", "DECISIONS.md");

function getGitCommits() {
  try {
    const raw = execSync('git log -n 50 --pretty=format:"%h%x09%s%x09%ad" --date=short', {
      encoding: "utf8",
    });
    return raw
      .trim()
      .split("\n")
      .map((line) => {
        const [hash, subject, date] = line.split("\t");
        return { hash, subject, date };
      })
      .filter((c) => Boolean(c.hash) && Boolean(c.subject));
  } catch (err) {
    console.warn("[changelog] Aviso: Falha ao ler commits do Git:", err.message);
    return [];
  }
}

function getDecisions() {
  if (fs.existsSync(decisionsPath) === false) return [];
  const content = fs.readFileSync(decisionsPath, "utf8");
  const regex = /##\s+(DEC-\d+):\s+([^\r\n]+)/g;
  const decisions = [];
  let match;
  while ((match = regex.exec(content)) !== null) {
    decisions.push({ id: match[1], title: match[2].trim() });
  }
  return decisions.slice(-20).reverse();
}

function buildChangelogMarkdown(commits, decisions) {
  const dateStr = new Date().toISOString().split("T")[0];
  const lines = [
    "# Changelog Canônico — Waesy",
    "",
    "Todas as alterações notáveis deste projeto são documentadas deterministicamente neste arquivo.",
    "O formato é baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/).",
    "",
    `## [2.0.0] - ${dateStr}`,
    "",
    "### Principais Marcos & Decisões Arquiteturais (DEC)",
    "",
  ];

  if (decisions.length === 0) {
    lines.push("- Sem novas decisões registradas no período.");
  } else {
    for (const dec of decisions) {
      lines.push(`- **${dec.id}**: ${dec.title}`);
    }
  }

  lines.push("", "### Alterações do Repositório (Git Commits Recentes)", "");

  const feats = commits.filter((c) => c.subject.startsWith("feat"));
  const fixes = commits.filter((c) => c.subject.startsWith("fix"));
  const docs = commits.filter((c) => c.subject.startsWith("docs"));
  const security = commits.filter((c) => c.subject.startsWith("security"));
  const chores = commits.filter((c) => c.subject.startsWith("chore") || c.subject.startsWith("refactor"));

  if (feats.length > 0) {
    lines.push("#### Funcionalidades Adicionadas (Features)");
    for (const c of feats) {
      lines.push(`- \`${c.hash}\`: ${c.subject} (${c.date})`);
    }
    lines.push("");
  }

  if (fixes.length > 0) {
    lines.push("#### Correções de Estabilidade (Fixes)");
    for (const c of fixes) {
      lines.push(`- \`${c.hash}\`: ${c.subject} (${c.date})`);
    }
    lines.push("");
  }

  if (security.length > 0) {
    lines.push("#### Segurança e RLS (Security)");
    for (const c of security) {
      lines.push(`- \`${c.hash}\`: ${c.subject} (${c.date})`);
    }
    lines.push("");
  }

  if (docs.length > 0) {
    lines.push("#### Documentação e Especificações (Docs)");
    for (const c of docs) {
      lines.push(`- \`${c.hash}\`: ${c.subject} (${c.date})`);
    }
    lines.push("");
  }

  if (chores.length > 0) {
    lines.push("#### Tarefas de Infraestrutura e Governança (Chores)");
    for (const c of chores) {
      lines.push(`- \`${c.hash}\`: ${c.subject} (${c.date})`);
    }
    lines.push("");
  }

  return lines.join("\n");
}

function main() {
  console.log("[generate-changelog] Extraindo commits e decisões...");
  const commits = getGitCommits();
  const decisions = getDecisions();
  const md = buildChangelogMarkdown(commits, decisions);

  fs.writeFileSync(changelogPath, md, "utf8");
  console.log(`[generate-changelog] CHANGELOG.md atualizado com ${commits.length} commits e ${decisions.length} decisões.`);
}

main();
