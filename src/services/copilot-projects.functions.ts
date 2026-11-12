import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getServerClient } from "@/lib/supabase";
import { getServerIdentity, assertStoreAccess, STAFF_ROLES } from "@/lib/server-access";
import { executeAiCoreGateway } from "./ai-core-gateway.functions";

export interface CopilotFolderDTO {
  id: string;
  user_id: string;
  store_id: string | null;
  name: string;
  icon: string;
  color: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface CopilotProjectDTO {
  id: string;
  folder_id: string | null;
  user_id: string;
  store_id: string | null;
  title: string;
  description: string | null;
  system_instructions: string | null;
  settings: Record<string, any>;
  file_count?: number;
  created_at: string;
  updated_at: string;
}

export interface CopilotProjectFileDTO {
  id: string;
  project_id: string;
  filename: string;
  file_url: string | null;
  file_type: string;
  file_size: number;
  status: "pending" | "indexing" | "ready" | "failed";
  excerpt?: string;
  created_at: string;
  updated_at: string;
}

const MAX_EXTRACTED_TEXT_CHARS = 180_000;
const STOP_WORDS = new Set([
  "para",
  "como",
  "qual",
  "quais",
  "onde",
  "sobre",
  "isso",
  "essa",
  "esse",
  "mais",
  "menos",
  "muito",
  "tudo",
  "aqui",
  "com",
  "sem",
  "por",
  "dos",
  "das",
  "nos",
  "nas",
  "uma",
  "uns",
  "umas",
  "que",
  "the",
  "and",
  "for",
  "with",
]);

function normalizeSearchTokens(text: string): string[] {
  return Array.from(
    new Set(
      String(text || "")
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .split(/[^a-z0-9]+/)
        .map((t) => t.trim())
        .filter((t) => t.length >= 3 && !STOP_WORDS.has(t)),
    ),
  );
}

/** Divide texto de conhecimento do projeto em blocos sobrepostos para indexação RAG. */
export function chunkProjectDocumentText(
  rawText: string,
  chunkSize = 1100,
  overlap = 180,
): string[] {
  const clean = String(rawText || "").replace(/\r\n/g, "\n").trim();
  if (!clean) return [];
  if (clean.length <= chunkSize) return [clean];

  const safeStep = Math.max(200, chunkSize - Math.min(overlap, Math.floor(chunkSize / 2)));
  const chunks: string[] = [];
  let offset = 0;

  while (offset < clean.length && chunks.length < 160) {
    const end = Math.min(clean.length, offset + chunkSize);
    const slice = clean.slice(offset, end).trim();
    if (slice) chunks.push(slice);
    if (end >= clean.length) break;
    offset += safeStep;
  }

  return chunks;
}

/** Ranqueia blocos de arquivos de conhecimento por aderência lexical ao prompt atual. */
export function scoreProjectChunks<
  T extends { content_chunk: string; chunk_index?: number; filename?: string; file_id?: string },
>(query: string, chunks: T[], limit = 5): Array<T & { score: number }> {
  if (!Array.isArray(chunks) || chunks.length === 0) return [];
  const queryTokens = normalizeSearchTokens(query);

  const scored = chunks.map((chunk, idx) => {
    if (queryTokens.length === 0) {
      return { ...chunk, score: 1 / (idx + 1) };
    }
    const normalizedChunk = String(chunk.content_chunk || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
    let matches = 0;
    for (const token of queryTokens) {
      if (normalizedChunk.includes(token)) matches += 1;
    }
    const bonusEarly = 0.01 / ((chunk.chunk_index ?? idx) + 1);
    return {
      ...chunk,
      score: matches > 0 ? matches / queryTokens.length + bonusEarly : bonusEarly,
    };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, Math.max(1, limit));
}

/** Formata instruções do projeto + trechos recuperados em bloco estruturado <PROJECT_KNOWLEDGE_BASE>. */
export function formatProjectKnowledgePromptBlock(params: {
  projectTitle: string;
  systemInstructions?: string | null;
  snippets: Array<{ filename: string; content: string }>;
}): string {
  const cleanTitle = String(params.projectTitle || "Projeto").trim();
  const cleanInstructions = String(params.systemInstructions || "").trim();
  const validSnippets = (params.snippets || []).filter((s) => s.content?.trim());

  if (!cleanInstructions && validSnippets.length === 0) {
    return "";
  }

  const snippetBlock = validSnippets
    .map(
      (s, i) =>
        `[Arquivo ${i + 1}: ${s.filename}]\n${s.content.trim().slice(0, 1800)}`,
    )
    .join("\n\n");

  return [
    "<PROJECT_KNOWLEDGE_BASE>",
    `Projeto Ativo: ${cleanTitle}`,
    cleanInstructions ? `Diretrizes Permanentes do Projeto:\n${cleanInstructions}` : "",
    snippetBlock ? `Trechos da Base de Conhecimento do Projeto:\n${snippetBlock}` : "",
    "</PROJECT_KNOWLEDGE_BASE>",
  ]
    .filter(Boolean)
    .join("\n\n");
}

function stripDisallowedControlChars(input: string): string {
  let out = "";
  for (let i = 0; i < input.length; i += 1) {
    const code = input.charCodeAt(i);
    const isAllowedWhitespace = code === 9 || code === 10 || code === 13;
    const isControl = code < 32 || code === 127;
    out += isControl && !isAllowedWhitespace ? " " : input[i];
  }
  return out;
}

function sanitizeExtractedText(raw: string): string {
  return stripDisallowedControlChars(String(raw || ""))
    .replace(/\s+\n/g, "\n")
    .trim()
    .slice(0, MAX_EXTRACTED_TEXT_CHARS);
}

async function assertCanAccessProject(
  db: ReturnType<typeof getServerClient>,
  projectId: string,
  identity: Awaited<ReturnType<typeof getServerIdentity>>,
) {
  const { data: project, error } = await db
    .from("copilot_projects")
    .select("*")
    .eq("id", projectId)
    .maybeSingle();

  if (error || !project) {
    throw new Error("Projeto Copilot não encontrado.");
  }

  const isMaster = ["platform_admin", "master"].includes(identity.role);
  const isOwner = project.user_id === identity.id;
  if (!isOwner && !isMaster) {
    if (project.store_id) {
      assertStoreAccess(identity, STAFF_ROLES, project.store_id);
    } else {
      throw new Error("Sem permissão para acessar este projeto.");
    }
  }

  return project;
}

/**
 * Recupera contexto e trechos relevantes da Base de Conhecimento de um projeto para injeção no Copilot.
 * Mantém subrequests sob orçamento estrito (no máximo 2 consultas Supabase).
 */
export async function retrieveRelevantProjectKnowledgeContext(
  params: {
    projectId: string;
    query: string;
    userId?: string;
    maxSnippets?: number;
  },
  customDb?: ReturnType<typeof getServerClient>,
): Promise<{
  projectTitle: string;
  systemInstructions: string | null;
  formattedContext: string;
  matchedFilesCount: number;
  snippets: Array<{ filename: string; content: string; score: number }>;
}> {
  if (!params.projectId) {
    return {
      projectTitle: "",
      systemInstructions: null,
      formattedContext: "",
      matchedFilesCount: 0,
      snippets: [],
    };
  }

  const db = customDb || getServerClient();
  const maxSnippets = Math.min(8, Math.max(1, params.maxSnippets || 5));

  const [{ data: project }, { data: files }] = await Promise.all([
    db
      .from("copilot_projects")
      .select("id, title, system_instructions, store_id, user_id")
      .eq("id", params.projectId)
      .maybeSingle(),
    db
      .from("copilot_project_files")
      .select("id, filename, extracted_text, status")
      .eq("project_id", params.projectId)
      .eq("status", "ready")
      .order("created_at", { ascending: false })
      .limit(12),
  ]);

  if (!project) {
    return {
      projectTitle: "",
      systemInstructions: null,
      formattedContext: "",
      matchedFilesCount: 0,
      snippets: [],
    };
  }

  const allChunks: Array<{ filename: string; content_chunk: string; chunk_index: number }> = [];
  for (const f of files || []) {
    const fileText = String((f as any).extracted_text || "").trim();
    if (!fileText) continue;
    const parts = chunkProjectDocumentText(fileText, 1100, 160);
    parts.forEach((part, idx) => {
      allChunks.push({
        filename: String((f as any).filename || "documento.txt"),
        content_chunk: part,
        chunk_index: idx,
      });
    });
  }

  const ranked = scoreProjectChunks(params.query, allChunks, maxSnippets).map((item) => ({
    filename: item.filename,
    content: item.content_chunk,
    score: item.score,
  }));

  const formattedContext = formatProjectKnowledgePromptBlock({
    projectTitle: project.title,
    systemInstructions: project.system_instructions,
    snippets: ranked.map((r) => ({ filename: r.filename, content: r.content })),
  });

  return {
    projectTitle: project.title,
    systemInstructions: project.system_instructions || null,
    formattedContext,
    matchedFilesCount: (files || []).length,
    snippets: ranked,
  };
}

// ============================================================
// Server Functions: Pastas, Projetos e Base de Conhecimento
// ============================================================

export const listCopilotHierarchy = createServerFn({ method: "GET" })
  .validator(z.object({ storeId: z.string().uuid().optional() }).optional())
  .handler(async ({ data }): Promise<{ folders: CopilotFolderDTO[]; projects: CopilotProjectDTO[] }> => {
    const identity = await getServerIdentity().catch(() => null);
    if (!identity?.id) return { folders: [], projects: [] };

    const db = getServerClient();
    const targetStoreId = data?.storeId || identity.store_id || null;
    if (targetStoreId && targetStoreId !== identity.store_id) {
      assertStoreAccess(identity, STAFF_ROLES, targetStoreId);
    }

    let foldersQuery = db
      .from("copilot_folders")
      .select("*")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });

    let projectsQuery = db
      .from("copilot_projects")
      .select("*")
      .order("updated_at", { ascending: false });

    if (targetStoreId) {
      foldersQuery = foldersQuery.or(`user_id.eq.${identity.id},store_id.eq.${targetStoreId}`);
      projectsQuery = projectsQuery.or(`user_id.eq.${identity.id},store_id.eq.${targetStoreId}`);
    } else {
      foldersQuery = foldersQuery.eq("user_id", identity.id);
      projectsQuery = projectsQuery.eq("user_id", identity.id);
    }

    const [{ data: folders, error: folderErr }, { data: projects, error: projErr }] = await Promise.all([
      foldersQuery,
      projectsQuery,
    ]);

    if (folderErr || projErr) {
      return { folders: [], projects: [] };
    }

    const projectIds = (projects || []).map((p: any) => p.id).filter(Boolean);
    const fileCountMap = new Map<string, number>();
    if (projectIds.length > 0) {
      const { data: fileRows } = await db
        .from("copilot_project_files")
        .select("project_id")
        .in("project_id", projectIds);
      for (const row of fileRows || []) {
        const pid = String((row as any).project_id || "");
        if (pid) fileCountMap.set(pid, (fileCountMap.get(pid) || 0) + 1);
      }
    }

    return {
      folders: (folders || []) as CopilotFolderDTO[],
      projects: (projects || []).map((p: any) => ({
        ...p,
        file_count: fileCountMap.get(p.id) || 0,
      })) as CopilotProjectDTO[],
    };
  });

export const createCopilotFolder = createServerFn({ method: "POST" })
  .validator(
    z.object({
      name: z.string().trim().min(2).max(80),
      icon: z.string().trim().max(30).default("folder"),
      color: z.string().trim().max(30).optional(),
      storeId: z.string().uuid().optional(),
    }),
  )
  .handler(async ({ data }): Promise<CopilotFolderDTO> => {
    const identity = await getServerIdentity();
    const db = getServerClient();
    const resolvedStoreId = data.storeId || identity.store_id || null;
    if (resolvedStoreId) {
      assertStoreAccess(identity, STAFF_ROLES, resolvedStoreId);
    }

    const { data: created, error } = await db
      .from("copilot_folders")
      .insert({
        user_id: identity.id,
        store_id: resolvedStoreId,
        name: data.name,
        icon: data.icon,
        color: data.color || null,
      })
      .select()
      .single();

    if (error || !created) {
      throw new Error(`Falha ao criar pasta: ${error?.message || "erro inesperado"}`);
    }
    return created as CopilotFolderDTO;
  });

export const deleteCopilotFolder = createServerFn({ method: "POST" })
  .validator(z.object({ folderId: z.string().uuid() }))
  .handler(async ({ data }) => {
    const identity = await getServerIdentity();
    const db = getServerClient();

    const { data: folder } = await db
      .from("copilot_folders")
      .select("id, user_id, store_id")
      .eq("id", data.folderId)
      .maybeSingle();

    if (!folder) throw new Error("Pasta não encontrada.");
    if (folder.user_id !== identity.id && !["platform_admin", "master"].includes(identity.role)) {
      if (folder.store_id) {
        assertStoreAccess(identity, STAFF_ROLES, folder.store_id);
      } else {
        throw new Error("Sem permissão para remover esta pasta.");
      }
    }

    const { error } = await db.from("copilot_folders").delete().eq("id", data.folderId);
    if (error) throw new Error(`Falha ao remover pasta: ${error.message}`);
    return { deleted: true, folderId: data.folderId };
  });

export const createCopilotProject = createServerFn({ method: "POST" })
  .validator(
    z.object({
      title: z.string().trim().min(2).max(120),
      description: z.string().trim().max(600).optional(),
      systemInstructions: z.string().trim().max(8000).optional(),
      folderId: z.string().uuid().nullish(),
      storeId: z.string().uuid().optional(),
    }),
  )
  .handler(async ({ data }): Promise<CopilotProjectDTO> => {
    const identity = await getServerIdentity();
    const db = getServerClient();
    const resolvedStoreId = data.storeId || identity.store_id || null;
    if (resolvedStoreId) {
      assertStoreAccess(identity, STAFF_ROLES, resolvedStoreId);
    }

    const { data: created, error } = await db
      .from("copilot_projects")
      .insert({
        folder_id: data.folderId || null,
        user_id: identity.id,
        store_id: resolvedStoreId,
        title: data.title,
        description: data.description || null,
        system_instructions: data.systemInstructions || null,
      })
      .select()
      .single();

    if (error || !created) {
      throw new Error(`Falha ao criar projeto: ${error?.message || "erro inesperado"}`);
    }
    return { ...(created as CopilotProjectDTO), file_count: 0 };
  });

export const updateCopilotProject = createServerFn({ method: "POST" })
  .validator(
    z.object({
      projectId: z.string().uuid(),
      title: z.string().trim().min(2).max(120).optional(),
      description: z.string().trim().max(600).nullish(),
      systemInstructions: z.string().trim().max(8000).nullish(),
      folderId: z.string().uuid().nullish(),
    }),
  )
  .handler(async ({ data }): Promise<CopilotProjectDTO> => {
    const identity = await getServerIdentity();
    const db = getServerClient();
    await assertCanAccessProject(db, data.projectId, identity);

    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (data.title !== undefined) patch.title = data.title;
    if (data.description !== undefined) patch.description = data.description;
    if (data.systemInstructions !== undefined) patch.system_instructions = data.systemInstructions;
    if (data.folderId !== undefined) patch.folder_id = data.folderId;

    const { data: updated, error } = await db
      .from("copilot_projects")
      .update(patch)
      .eq("id", data.projectId)
      .select()
      .single();

    if (error || !updated) {
      throw new Error(`Falha ao atualizar projeto: ${error?.message || "erro inesperado"}`);
    }
    return updated as CopilotProjectDTO;
  });

export const deleteCopilotProject = createServerFn({ method: "POST" })
  .validator(z.object({ projectId: z.string().uuid() }))
  .handler(async ({ data }) => {
    const identity = await getServerIdentity();
    const db = getServerClient();
    await assertCanAccessProject(db, data.projectId, identity);

    const { error } = await db.from("copilot_projects").delete().eq("id", data.projectId);
    if (error) throw new Error(`Falha ao excluir projeto: ${error.message}`);
    return { deleted: true, projectId: data.projectId };
  });

export const assignThreadHierarchy = createServerFn({ method: "POST" })
  .validator(
    z.object({
      threadId: z.string().uuid(),
      folderId: z.string().uuid().nullish(),
      projectId: z.string().uuid().nullish(),
    }),
  )
  .handler(async ({ data }) => {
    const identity = await getServerIdentity();
    const db = getServerClient();

    if (data.projectId) {
      await assertCanAccessProject(db, data.projectId, identity);
    }

    const patch = {
      folder_id: data.folderId ?? null,
      project_id: data.projectId ?? null,
      updated_at: new Date().toISOString(),
    };

    const { data: aiUpdated } = await db
      .from("ai_threads")
      .update(patch)
      .eq("id", data.threadId)
      .eq("user_id", identity.id)
      .select("id, folder_id, project_id")
      .maybeSingle();

    if (aiUpdated) return aiUpdated;

    const { data: legacyUpdated, error } = await db
      .from("chat_threads")
      .update(patch)
      .eq("id", data.threadId)
      .select("id, folder_id, project_id")
      .maybeSingle();

    if (error || !legacyUpdated) {
      throw new Error(error?.message || "Conversa não encontrada para mover.");
    }
    return legacyUpdated;
  });

export const listCopilotProjectFiles = createServerFn({ method: "GET" })
  .validator(z.object({ projectId: z.string().uuid() }))
  .handler(async ({ data }): Promise<CopilotProjectFileDTO[]> => {
    const identity = await getServerIdentity();
    const db = getServerClient();
    await assertCanAccessProject(db, data.projectId, identity);

    const { data: rows, error } = await db
      .from("copilot_project_files")
      .select("id, project_id, filename, file_url, file_type, file_size, status, extracted_text, created_at, updated_at")
      .eq("project_id", data.projectId)
      .order("created_at", { ascending: false });

    if (error || !rows) return [];
    return rows.map((row: any) => ({
      id: row.id,
      project_id: row.project_id,
      filename: row.filename,
      file_url: row.file_url,
      file_type: row.file_type,
      file_size: Number(row.file_size || 0),
      status: row.status || "ready",
      excerpt: String(row.extracted_text || "").slice(0, 180),
      created_at: row.created_at,
      updated_at: row.updated_at,
    }));
  });

export const uploadCopilotProjectContextFile = createServerFn({ method: "POST" })
  .validator(
    z.object({
      projectId: z.string().uuid(),
      filename: z.string().trim().min(1).max(160),
      fileType: z.string().trim().max(120).default("text/plain"),
      fileSize: z.number().int().min(0).max(15 * 1024 * 1024).default(0),
      contentText: z.string().min(1, "Informe o conteúdo de texto ou arquivo extraível."),
      fileUrl: z.string().url().optional(),
    }),
  )
  .handler(async ({ data }): Promise<CopilotProjectFileDTO & { chunksCount: number }> => {
    const identity = await getServerIdentity();
    if (!identity.id) throw new Error("Não autorizado");
    const db = getServerClient();
    const project = await assertCanAccessProject(db, data.projectId, identity);

    const sanitizedText = sanitizeExtractedText(data.contentText);
    if (!sanitizedText) {
      throw new Error("Não foi possível extrair conteúdo textual utilizável deste arquivo.");
    }

    const { data: insertedFile, error: fileErr } = await db
      .from("copilot_project_files")
      .insert({
        project_id: data.projectId,
        user_id: identity.id,
        store_id: project.store_id || null,
        filename: data.filename,
        file_url: data.fileUrl || null,
        file_type: data.fileType,
        file_size: data.fileSize || Buffer.byteLength(sanitizedText, "utf8"),
        extracted_text: sanitizedText,
        status: "indexing",
      })
      .select()
      .single();

    if (fileErr || !insertedFile) {
      throw new Error(`Falha ao salvar arquivo no projeto: ${fileErr?.message || "erro"}`);
    }

    const chunks = chunkProjectDocumentText(sanitizedText);
    const embeddingRows: Array<{
      file_id: string;
      project_id: string;
      chunk_index: number;
      content_chunk: string;
      embedding: number[] | null;
    }> = [];

    for (let idx = 0; idx < chunks.length; idx++) {
      let vector: number[] | null = null;
      // Vetorização opcional apenas para os primeiros 3 blocos para manter o Worker abaixo do limite de subrequests
      if (idx < 3) {
        try {
          const gwRes = await executeAiCoreGateway({
            task: "embedding",
            prompt: chunks[idx].slice(0, 3500),
            module: "copilot_project_rag",
            authContext: { userId: identity.id, storeId: project.store_id || undefined },
          });
          const candidateVec = (gwRes as any)?.result?.parsedJson?.embedding;
          if (Array.isArray(candidateVec) && candidateVec.length === 1536) {
            vector = candidateVec;
          }
        } catch {
          vector = null;
        }
      }

      embeddingRows.push({
        file_id: insertedFile.id,
        project_id: data.projectId,
        chunk_index: idx,
        content_chunk: chunks[idx],
        embedding: vector,
      });
    }

    if (embeddingRows.length > 0) {
      const { error: chunkErr } = await db
        .from("copilot_project_embeddings")
        .insert(embeddingRows);

      if (chunkErr) {
        await db
          .from("copilot_project_files")
          .update({ status: "failed", updated_at: new Date().toISOString() })
          .eq("id", insertedFile.id);
        throw new Error(`Falha ao indexar blocos de conhecimento: ${chunkErr.message}`);
      }
    }

    await db
      .from("copilot_project_files")
      .update({ status: "ready", updated_at: new Date().toISOString() })
      .eq("id", insertedFile.id);

    await db
      .from("copilot_projects")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", data.projectId);

    return {
      id: insertedFile.id,
      project_id: insertedFile.project_id,
      filename: insertedFile.filename,
      file_url: insertedFile.file_url,
      file_type: insertedFile.file_type,
      file_size: Number(insertedFile.file_size || 0),
      status: "ready",
      excerpt: sanitizedText.slice(0, 180),
      created_at: insertedFile.created_at,
      updated_at: insertedFile.updated_at,
      chunksCount: embeddingRows.length,
    };
  });

export const deleteCopilotProjectContextFile = createServerFn({ method: "POST" })
  .validator(z.object({ fileId: z.string().uuid() }))
  .handler(async ({ data }) => {
    const identity = await getServerIdentity();
    const db = getServerClient();

    const { data: fileRow, error } = await db
      .from("copilot_project_files")
      .select("id, project_id")
      .eq("id", data.fileId)
      .maybeSingle();

    if (error || !fileRow) {
      throw new Error("Arquivo de contexto não encontrado.");
    }

    await assertCanAccessProject(db, fileRow.project_id, identity);
    const { error: delErr } = await db
      .from("copilot_project_files")
      .delete()
      .eq("id", data.fileId);

    if (delErr) {
      throw new Error(`Falha ao remover arquivo: ${delErr.message}`);
    }

    return { deleted: true, fileId: data.fileId };
  });
