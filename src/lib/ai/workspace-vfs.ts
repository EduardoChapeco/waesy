import type { ExecutionPlanStep, WorkspaceVfsFileEntry } from "@/types/chat";

export const MAX_VFS_FILES = 32;
export const MAX_VFS_FILE_BYTES = 200_000;

export type WorkspaceVfsMap = Record<string, WorkspaceVfsFileEntry>;

/**
 * Normaliza caminho relativo do Workspace VFS e bloqueia traversal (`..`, barra inicial, nulos).
 */
export function normalizeVfsPath(rawPath: string): string {
  const clean = String(rawPath || "")
    .replace(/\\/g, "/")
    .replace(/^\/+/, "")
    .replace(/\/{2,}/g, "/")
    .trim();
  if (!clean || clean.includes("..") || clean.includes("\0") || clean.length > 180) {
    throw new Error(`Caminho VFS inválido ou inseguro: "${rawPath}"`);
  }
  return clean;
}

export function inferLanguageFromPath(filePath: string): string {
  const lower = filePath.toLowerCase();
  if (lower.endsWith(".py")) return "python";
  if (lower.endsWith(".ts") || lower.endsWith(".tsx")) return "typescript";
  if (lower.endsWith(".js") || lower.endsWith(".jsx")) return "javascript";
  if (lower.endsWith(".html") || lower.endsWith(".htm")) return "html";
  if (lower.endsWith(".css")) return "css";
  if (lower.endsWith(".json")) return "json";
  if (lower.endsWith(".csv")) return "csv";
  if (lower.endsWith(".sql")) return "sql";
  if (lower.endsWith(".md")) return "markdown";
  return "text";
}

function byteLengthUtf8(text: string): number {
  return new TextEncoder().encode(text).length;
}

export interface VfsMutationResult {
  file: WorkspaceVfsFileEntry;
  originalContent: string;
  diffPreview: string;
}

/**
 * Gera resumo de diff linha-a-linha entre a versao anterior e a nova sem dependencias externas.
 */
export function computeLineDiffSummary(original: string, modified: string, maxLines = 80): string {
  if (!original) {
    const lines = modified.split("\n").slice(0, maxLines);
    return lines.map((l) => `+ ${l}`).join("\n");
  }
  const origLines = original.split("\n");
  const modLines = modified.split("\n");
  const out: string[] = [];
  const maxScan = Math.max(origLines.length, modLines.length);
  for (let i = 0; i < maxScan && out.length < maxLines; i++) {
    const a = origLines[i];
    const b = modLines[i];
    if (a === b) {
      if (a !== undefined && out.length > 0 && out.length < maxLines - 2) {
        out.push(`  ${a}`);
      }
      continue;
    }
    if (a !== undefined) out.push(`- ${a}`);
    if (b !== undefined && out.length < maxLines) out.push(`+ ${b}`);
  }
  return out.length > 0 ? out.join("\n") : "(sem alterações textuais)";
}

/**
 * Escreve ou sobrescreve arquivo no Virtual File System da execucao atual.
 */
export function vfsWriteFile(
  vfs: WorkspaceVfsMap,
  rawPath: string,
  content: string,
  language?: string,
): VfsMutationResult {
  const safePath = normalizeVfsPath(rawPath);
  const safeContent = String(content ?? "");
  const sizeBytes = byteLengthUtf8(safeContent);
  if (sizeBytes > MAX_VFS_FILE_BYTES) {
    throw new Error(`Arquivo "${safePath}" excede o limite de ${MAX_VFS_FILE_BYTES} bytes.`);
  }
  const existing = vfs[safePath];
  if (!existing && Object.keys(vfs).length >= MAX_VFS_FILES) {
    throw new Error(`Limite de ${MAX_VFS_FILES} arquivos no workspace da execução atingido.`);
  }
  const originalContent = existing?.content || "";
  const entry: WorkspaceVfsFileEntry = {
    path: safePath,
    content: safeContent,
    language: language || existing?.language || inferLanguageFromPath(safePath),
    updatedAt: new Date().toISOString(),
    sizeBytes,
    version: (existing?.version || 0) + 1,
  };
  vfs[safePath] = entry;
  return {
    file: entry,
    originalContent,
    diffPreview: computeLineDiffSummary(originalContent, safeContent),
  };
}

/**
 * Aplica substituicao cirurgica em arquivo existente do Workspace VFS.
 */
export function vfsPatchFile(
  vfs: WorkspaceVfsMap,
  rawPath: string,
  search: string,
  replace: string,
): VfsMutationResult {
  const safePath = normalizeVfsPath(rawPath);
  const existing = vfs[safePath];
  if (!existing) {
    throw new Error(`Arquivo "${safePath}" não existe no workspace da execução.`);
  }
  if (!search || !existing.content.includes(search)) {
    throw new Error(`Trecho alvo não encontrado em "${safePath}".`);
  }
  const nextContent = existing.content.replace(search, replace);
  return vfsWriteFile(vfs, safePath, nextContent, existing.language);
}

export function vfsReadFile(vfs: WorkspaceVfsMap, rawPath: string): WorkspaceVfsFileEntry | null {
  const safePath = normalizeVfsPath(rawPath);
  return vfs[safePath] || null;
}

export function vfsListFiles(vfs: WorkspaceVfsMap): Array<{
  path: string;
  language: string;
  sizeBytes: number;
  version: number;
  updatedAt: string;
}> {
  return Object.values(vfs)
    .sort((a, b) => a.path.localeCompare(b.path))
    .map((f) => ({
      path: f.path,
      language: f.language,
      sizeBytes: f.sizeBytes,
      version: f.version,
      updatedAt: f.updatedAt,
    }));
}

/**
 * Serializa o checklist vivo de execucao para o arquivo `plan.md` no estilo Manus `todo.md`.
 */
export function renderExecutionPlanMarkdown(title: string, steps: ExecutionPlanStep[]): string {
  const lines = [`# Plano de Execução: ${title}`, ""];
  for (const step of steps) {
    const mark =
      step.status === "completed"
        ? "x"
        : step.status === "running"
          ? ">"
          : step.status === "failed"
            ? "!"
            : step.status === "skipped"
              ? "-"
              : " ";
    const suffix = step.notes ? ` — ${step.notes}` : "";
    lines.push(`- [${mark}] ${step.title}${suffix}`);
  }
  return lines.join("\n");
}
