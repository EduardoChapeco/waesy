import { createServer } from "vite";
import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const projectRoot = process.cwd();
const outputArg = process.argv.find((arg) => arg.startsWith("--output="))?.slice("--output=".length);
const outputPath = path.resolve(projectRoot, outputArg || "docs/builder/template-audit-report.json");
const server = await createServer({
  configFile: path.resolve(projectRoot, "vite.config.ts"),
  root: projectRoot,
  server: { middlewareMode: true },
  appType: "custom",
  logLevel: "error",
});

try {
  const module = await server.ssrLoadModule("/src/lib/builder/studio-template-audit.ts");
  const report = module.auditAllStudioTemplates();
  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");

  console.log(`Auditoria Waesy Studio: ${report.summary.total} templates`);
  console.log(`PASS ${report.summary.passed} | WARN ${report.summary.warnings} | FAIL ${report.summary.failed}`);
  console.log(`REVISÃO HUMANA ${report.summary.reviewRequired} | FALHAS EM APROVADOS ${report.summary.publishableFailed}`);
  console.log(`Relatório: ${path.relative(projectRoot, outputPath)}`);
  for (const template of report.templates) {
    const errors = template.findings.filter((finding) => finding.severity === "error").length;
    const warnings = template.findings.filter((finding) => finding.severity === "warning").length;
    console.log(`${template.status.toUpperCase().padEnd(4)} ${template.templateId} — ${errors} erros, ${warnings} avisos, score ${template.score}`);
  }

  if (report.summary.publishableFailed > 0) process.exitCode = 1;
} finally {
  await server.close();
}
