#!/usr/bin/env node
import { execFileSync } from "node:child_process";

const allowDirty = process.argv.includes("--allow-dirty");
const status = execFileSync("git", ["status", "--porcelain", "--untracked-files=all"], {
  encoding: "utf8",
}).trim();

if (status && !allowDirty) {
  console.error("[release] worktree suja; commit ou remova alterações antes de publicar:");
  console.error(status);
  process.exit(1);
}

if (status) {
  console.warn("[release] aviso: executando gate local com alterações não commitadas (--allow-dirty).");
} else {
  console.log("[release] worktree limpa; candidato reprodutível.");
}

const branch = execFileSync("git", ["branch", "--show-current"], { encoding: "utf8" }).trim();
const sha = execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
console.log(`[release] branch=${branch || "(detached)"} sha=${sha}`);
