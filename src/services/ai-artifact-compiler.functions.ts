/**
 * ai-artifact-compiler.functions.ts — Fábrica Canônica de Artefatos Reais do Waesy
 * Produz arquivos estruturados e utilizáveis: Planilhas (XLSX/CSV), Documentos (PDF/Markdown),
 * Apresentações de Slides e Patches para o OmniBuilder com versionamento.
 */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getServerClient } from "@/lib/supabase";
import { getServerIdentity } from "@/lib/server-access";

export const compileArtifactSchema = z.object({
  threadId: z.string().uuid().optional(),
  taskId: z.string().uuid().optional(),
  workspaceId: z.string().uuid().optional(),
  artifactType: z.enum([
    "document",
    "spreadsheet",
    "presentation",
    "landing_page",
    "proposal",
    "image",
    "video",
    "omnibuilder",
    "code",
  ]),
  title: z.string().min(2),
  data: z.record(z.any()),
  metadata: z.record(z.any()).default({}),
});

/**
 * Gera a representação CSV/Tabular de uma planilha para exportação imediata
 */
export function formatSpreadsheetAsCsv(columns: string[], rows: (string | number)[][]): string {
  const headerLine = columns.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",");
  const dataLines = rows.map((row) =>
    row.map((val) => `"${String(val ?? "").replace(/"/g, '""')}"`).join(",")
  );
  return [headerLine, ...dataLines].join("\r\n");
}

/**
 * Cria ou atualiza um artefato com versionamento imutável em ai_artifacts e ai_artifact_versions
 */
export const compileAndSaveAiArtifact = createServerFn({ method: "POST" })
  .validator(compileArtifactSchema)
  .handler(async ({ data }) => {
    const db = getServerClient();
    const identity = await getServerIdentity().catch(() => null);

    if (!identity?.id) {
      throw new Error("Usuário não autenticado");
    }

    // Se for planilha, gera versão CSV de exportação nos metadados
    const enrichedData = { ...data.data };
    if (data.artifactType === "spreadsheet" && Array.isArray(enrichedData.columns) && Array.isArray(enrichedData.rows)) {
      enrichedData.csvExport = formatSpreadsheetAsCsv(enrichedData.columns, enrichedData.rows);
    }

    // 1. Inserir ou atualizar registro mestre em ai_artifacts
    const { data: artifact, error: artifactError } = await db
      .from("ai_artifacts")
      .insert({
        user_id: identity.id,
        workspace_id: data.workspaceId || null,
        thread_id: data.threadId || null,
        task_id: data.taskId || null,
        artifact_type: data.artifactType,
        title: data.title,
        current_version: 1,
        data: enrichedData,
        metadata: {
          ...data.metadata,
          compiledAt: new Date().toISOString(),
          authorName: identity.fullName || "Waesy Copilot",
        },
      })
      .select()
      .single();

    if (artifactError || !artifact) {
      throw new Error(`Falha ao compilar artefato de IA: ${artifactError?.message || "erro"}`);
    }

    // 2. Gravar versão inicial imutável em ai_artifact_versions
    await db.from("ai_artifact_versions").insert({
      artifact_id: artifact.id,
      version_number: 1,
      data: enrichedData,
      metadata: artifact.metadata,
      created_by: identity.id,
    });

    return artifact;
  });

/**
 * Obtém a árvore de versões de um artefato
 */
export const listAiArtifactVersions = createServerFn({ method: "GET" })
  .validator(z.object({ artifactId: z.string().uuid() }))
  .handler(async ({ data }) => {
    const db = getServerClient();
    const identity = await getServerIdentity().catch(() => null);

    if (!identity?.id) return [];

    const { data: versions, error } = await db
      .from("ai_artifact_versions")
      .select("id, version_number, storage_path, metadata, created_at")
      .eq("artifact_id", data.artifactId)
      .order("version_number", { ascending: false });

    if (error || !versions) return [];
    return versions;
  });
