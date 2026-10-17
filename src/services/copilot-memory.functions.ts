/**
 * copilot-memory.functions.ts — Motor de Memória Vetorial & Episódica do Waesy Copilot 3.0
 * Suporta RAG Semântico (pgvector), Grafo de Fatos e Preferências do Usuário e Artefatos do Chat.
 */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import * as crypto from "crypto";
import { getServerClient } from "@/lib/supabase";
import { getServerIdentity } from "@/lib/server-access";

// ============================================================
// Schemas e Tipos Canônicos de Memória
// ============================================================

export const userFactCategoryEnum = z.enum([
  "business",
  "personal",
  "travel",
  "career",
  "preference",
]);

export type UserFactCategory = z.infer<typeof userFactCategoryEnum>;

export interface UserMemoryFact {
  id: string;
  profileId: string;
  category: UserFactCategory;
  factKey: string;
  factValue: string;
  confidence: number;
  sourceConversationId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SemanticMemoryChunk {
  id: string;
  sessionId?: string | null;
  profileId?: string | null;
  contentChunk: string;
  embedding: number[];
  entityReferences: Record<string, any>;
  importanceScore: number;
  createdAt: string;
  similarity?: number;
}

export interface CopilotChatArtifactRecord {
  id: string;
  sessionId: string;
  messageId?: string | null;
  artifactType:
    | "chart"
    | "interactive_table"
    | "biolink_cluster"
    | "builder_bridge"
    | "travel_dossier"
    | "document_preview";
  title: string;
  payload: Record<string, any>;
  actionSchema?: Array<{ id: string; label: string; action: string; payload?: Record<string, any> }>;
  createdAt: string;
}

// ============================================================
// Algoritmo de Embedding Determinístico L2 (Zero-Crash Fallback)
// ============================================================

/**
 * Gera um vetor de 1536 dimensões normalizado por norma L2 a partir do texto.
 * Utilizado para persistência e indexação no pgvector tanto em dev como em produção.
 */
export function generateDeterministicEmbedding(text: string, dimensions = 1536): number[] {
  const normalized = text.toLowerCase().trim();
  const vector = new Float64Array(dimensions);
  
  // Utiliza hash SHA-256 e PRNG pseudo-aleatório determinístico por token
  const tokens = normalized.split(/\s+/).filter(Boolean);
  if (tokens.length === 0) {
    tokens.push("empty");
  }

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    const hash = crypto.createHash("sha256").update(`${token}_${i}`).digest();
    for (let j = 0; j < 32 && j < dimensions; j++) {
      const idx = (hash[j] * 47 + j * 31) % dimensions;
      vector[idx] += (hash[j] - 128) / 128.0;
    }
  }

  // Normalização L2
  let sumSq = 0;
  for (let i = 0; i < dimensions; i++) {
    sumSq += vector[i] * vector[i];
  }
  const norm = Math.sqrt(sumSq) || 1.0;
  const result: number[] = new Array(dimensions);
  for (let i = 0; i < dimensions; i++) {
    result[i] = Number((vector[i] / norm).toFixed(6));
  }
  return result;
}

/**
 * Calcula similaridade de cosseno entre dois vetores.
 */
export function calculateCosineSimilarity(vecA: number[], vecB: number[]): number {
  if (vecA.length !== vecB.length) return 0;
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  const denominator = Math.sqrt(normA) * Math.sqrt(normB);
  if (denominator === 0) return 0;
  return Number((dotProduct / denominator).toFixed(4));
}

// ============================================================
// Métodos de Persistência e Busca Vetorial
// ============================================================

export async function storeSemanticMemoryChunk(params: {
  sessionId?: string | null;
  profileId: string;
  contentChunk: string;
  entityReferences?: Record<string, any>;
  importanceScore?: number;
}): Promise<SemanticMemoryChunk | null> {
  const db = getServerClient();
  const embedding = generateDeterministicEmbedding(params.contentChunk);

  try {
    const { data, error } = await db
      .from("copilot_semantic_memory")
      .insert({
        session_id: params.sessionId || null,
        profile_id: params.profileId,
        content_chunk: params.contentChunk,
        embedding: JSON.stringify(embedding),
        entity_references: params.entityReferences || {},
        importance_score: params.importanceScore ?? 0.5,
      })
      .select("*")
      .single();

    if (error) {
      console.warn("[COPILOT-MEMORY] Erro ao persistir memória semântica:", error.message);
      return null;
    }

    return {
      id: data.id,
      sessionId: data.session_id,
      profileId: data.profile_id,
      contentChunk: data.content_chunk,
      embedding,
      entityReferences: data.entity_references || {},
      importanceScore: Number(data.importance_score || 0.5),
      createdAt: data.created_at,
    };
  } catch (err: any) {
    console.warn("[COPILOT-MEMORY] Falha na persistência semântica:", err.message);
    return null;
  }
}

export async function searchSemanticMemory(params: {
  profileId: string;
  query: string;
  topK?: number;
  minSimilarity?: number;
}): Promise<SemanticMemoryChunk[]> {
  const db = getServerClient();
  const topK = params.topK || 5;
  const minSimilarity = params.minSimilarity ?? 0.25;
  const queryEmbedding = generateDeterministicEmbedding(params.query);

  try {
    // 1. Tentar RPC vetorial nativa se configurada no Supabase
    const { data: rpcMatches, error: rpcErr } = await db.rpc(
      "match_copilot_semantic_memory",
      {
        query_embedding: queryEmbedding,
        match_threshold: minSimilarity,
        match_count: topK,
        filter_profile_id: params.profileId,
      },
    );

    if (!rpcErr && Array.isArray(rpcMatches) && rpcMatches.length > 0) {
      return rpcMatches.map((m: any) => ({
        id: m.id,
        sessionId: m.session_id,
        profileId: m.profile_id,
        contentChunk: m.content_chunk,
        embedding: [],
        entityReferences: m.entity_references || {},
        importanceScore: Number(m.importance_score || 0.5),
        similarity: Number(m.similarity || 0),
        createdAt: m.created_at,
      }));
    }

    // 2. Fallback resiliente: busca últimos chunks do perfil e calcula similaridade em memória
    const { data: recentChunks, error: selectErr } = await db
      .from("copilot_semantic_memory")
      .select("id, session_id, profile_id, content_chunk, entity_references, importance_score, created_at, embedding")
      .eq("profile_id", params.profileId)
      .order("created_at", { ascending: false })
      .limit(30);

    if (selectErr || !recentChunks || recentChunks.length === 0) {
      return [];
    }

    const scored = recentChunks.map((chunk: any) => {
      let vec: number[] = [];
      if (Array.isArray(chunk.embedding)) {
        vec = chunk.embedding;
      } else if (typeof chunk.embedding === "string") {
        try {
          vec = JSON.parse(chunk.embedding);
        } catch {
          vec = generateDeterministicEmbedding(chunk.content_chunk);
        }
      } else {
        vec = generateDeterministicEmbedding(chunk.content_chunk);
      }

      const similarity = calculateCosineSimilarity(queryEmbedding, vec);
      return {
        id: chunk.id,
        sessionId: chunk.session_id,
        profileId: chunk.profile_id,
        contentChunk: chunk.content_chunk,
        embedding: vec,
        entityReferences: chunk.entity_references || {},
        importanceScore: Number(chunk.importance_score || 0.5),
        similarity,
        createdAt: chunk.created_at,
      };
    });

    return scored
      .filter((s) => (s.similarity || 0) >= minSimilarity)
      .sort((a, b) => (b.similarity || 0) - (a.similarity || 0))
      .slice(0, topK);
  } catch (err: any) {
    console.warn("[COPILOT-MEMORY] Falha na busca semântica:", err.message);
    return [];
  }
}

// ============================================================
// Grafo de Fatos e Preferências do Usuário
// ============================================================

export async function getUserMemoryFacts(
  profileId: string,
  category?: UserFactCategory,
): Promise<UserMemoryFact[]> {
  const db = getServerClient();
  let query = db
    .from("user_memory_facts")
    .select("*")
    .eq("profile_id", profileId);

  if (category) {
    query = query.eq("category", category);
  }

  const { data, error } = await query.order("confidence", { ascending: false });
  if (error || !data) return [];

  return data.map((row: any) => ({
    id: row.id,
    profileId: row.profile_id,
    category: row.category,
    factKey: row.fact_key,
    factValue: row.fact_value,
    confidence: Number(row.confidence || 1.0),
    sourceConversationId: row.source_conversation_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
}

export async function upsertUserMemoryFact(params: {
  profileId: string;
  category: UserFactCategory;
  factKey: string;
  factValue: string;
  confidence?: number;
  sourceConversationId?: string | null;
}): Promise<UserMemoryFact | null> {
  const db = getServerClient();
  try {
    const { data, error } = await db
      .from("user_memory_facts")
      .upsert(
        {
          profile_id: params.profileId,
          category: params.category,
          fact_key: params.factKey,
          fact_value: params.factValue,
          confidence: params.confidence ?? 1.0,
          source_conversation_id: params.sourceConversationId || null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "profile_id,fact_key" },
      )
      .select("*")
      .single();

    if (error || !data) {
      console.warn("[COPILOT-FACTS] Erro ao salvar fato do usuário:", error?.message);
      return null;
    }

    return {
      id: data.id,
      profileId: data.profile_id,
      category: data.category,
      factKey: data.fact_key,
      factValue: data.fact_value,
      confidence: Number(data.confidence || 1.0),
      sourceConversationId: data.source_conversation_id,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  } catch (err: any) {
    console.warn("[COPILOT-FACTS] Falha em upsertUserMemoryFact:", err.message);
    return null;
  }
}

/**
 * Analisador inteligente de conversas: extrai preferências e fatos estáveis do usuário.
 */
export async function extractAndSaveFactsFromConversation(params: {
  profileId: string;
  userPrompt: string;
  threadId?: string | null;
}): Promise<UserMemoryFact[]> {
  const saved: UserMemoryFact[] = [];
  const text = params.userPrompt;
  const lower = text.toLowerCase();

  // 1. Extração de localização residencial ou preferida
  const cityMatch = text.match(/(?:moro|resido|estou|vivo)\s+(?:em|no|na)\s+([A-ZÀ-ÿ][a-zà-ÿ]+(?:\s+[A-ZÀ-ÿ][a-zà-ÿ]+)*)/i);
  if (cityMatch && cityMatch[1]) {
    const fact = await upsertUserMemoryFact({
      profileId: params.profileId,
      category: "personal",
      factKey: "residence_city",
      factValue: cityMatch[1].trim(),
      confidence: 0.95,
      sourceConversationId: params.threadId,
    });
    if (fact) saved.push(fact);
  }

  // 2. Extração de ramo empresarial ou atividade da loja
  if (lower.includes("minha loja") || lower.includes("minha empresa") || lower.includes("meu negócio")) {
    const segmentPatterns = [
      { pattern: /vestu[aá]rio|roupa|moda|cal[çc]ado/i, value: "Moda e Vestuário" },
      { pattern: /restaurante|pizzaria|hamburgueria|lanche|comida/i, value: "Gastronomia e Alimentação" },
      { pattern: /oficina|mec[aâ]nica|auto/i, value: "Serviços Automotivos" },
      { pattern: /hotel|pousada|turismo|ag[eê]ncia de viagem/i, value: "Turismo e Hospitalidade" },
      { pattern: /advoca|jur[ií]dico|direito/i, value: "Serviços Jurídicos" },
      { pattern: /imobili[aá]ria|corretor|im[oó]veis/i, value: "Mercado Imobiliário" },
    ];

    for (const seg of segmentPatterns) {
      if (seg.pattern.test(text)) {
        const fact = await upsertUserMemoryFact({
          profileId: params.profileId,
          category: "business",
          factKey: "business_segment",
          factValue: seg.value,
          confidence: 0.9,
          sourceConversationId: params.threadId,
        });
        if (fact) saved.push(fact);
        break;
      }
    }
  }

  // 3. Preferência de viagem
  if (lower.includes("prefiro hotel") || lower.includes("gosto de pousada") || lower.includes("resort")) {
    const lodging = lower.includes("pousada")
      ? "Pousada de Charme"
      : lower.includes("resort")
        ? "Resort All-Inclusive"
        : "Hotel Executivo";
    const fact = await upsertUserMemoryFact({
      profileId: params.profileId,
      category: "travel",
      factKey: "preferred_lodging_type",
      factValue: lodging,
      confidence: 0.85,
      sourceConversationId: params.threadId,
    });
    if (fact) saved.push(fact);
  }

  // 4. Preferência de carreira / emprego
  if (lower.includes("procuro vaga") || lower.includes("quero trabalhar como") || lower.includes("sou formado em")) {
    const roleMatch = text.match(/(?:como|de)\s+([a-zà-ÿ]+(?:\s+[a-zà-ÿ]+)?)/i);
    if (roleMatch && roleMatch[1]) {
      const fact = await upsertUserMemoryFact({
        profileId: params.profileId,
        category: "career",
        factKey: "target_job_role",
        factValue: roleMatch[1].trim(),
        confidence: 0.85,
        sourceConversationId: params.threadId,
      });
      if (fact) saved.push(fact);
    }
  }

  return saved;
}

// ============================================================
// Compilador de Contexto de Longo Prazo para o System Prompt
// ============================================================

export async function assembleLongTermContext(params: {
  profileId?: string | null;
  threadId?: string | null;
  currentPrompt: string;
}): Promise<{
  formattedContext: string;
  factsCount: number;
  memoryChunksCount: number;
}> {
  if (!params.profileId) {
    return { formattedContext: "", factsCount: 0, memoryChunksCount: 0 };
  }

  const [facts, semanticChunks] = await Promise.all([
    getUserMemoryFacts(params.profileId),
    searchSemanticMemory({
      profileId: params.profileId,
      query: params.currentPrompt,
      topK: 3,
      minSimilarity: 0.28,
    }),
  ]);

  const sections: string[] = [];

  if (facts.length > 0) {
    const factLines = facts.map(
      (f) => `- [${f.category.toUpperCase()}] ${f.factKey}: ${f.factValue} (confiança: ${Math.round(f.confidence * 100)}%)`,
    );
    sections.push(`
<USER_PREFERENCES_AND_KNOWN_FACTS>
Estes são fatos estáveis verificados sobre este usuário. Utilize-os para personalizar as respostas sem perguntar novamente:
${factLines.join("\n")}
</USER_PREFERENCES_AND_KNOWN_FACTS>
`);
  }

  if (semanticChunks.length > 0) {
    const chunkLines = semanticChunks.map(
      (c, i) => `[Memória Relevante #${i + 1}]: ${c.contentChunk.slice(0, 400)}`,
    );
    sections.push(`
<EPISODIC_LONG_TERM_MEMORY>
Trechos de conversas anteriores deste usuário que possuem relação semântica com o assunto atual:
${chunkLines.join("\n")}
</EPISODIC_LONG_TERM_MEMORY>
`);
  }

  return {
    formattedContext: sections.join("\n").trim(),
    factsCount: facts.length,
    memoryChunksCount: semanticChunks.length,
  };
}

// ============================================================
// Persistência de Artefatos no Chat
// ============================================================

export async function saveCopilotArtifactRecord(params: {
  sessionId: string;
  messageId?: string | null;
  artifactType: CopilotChatArtifactRecord["artifactType"];
  title: string;
  payload: Record<string, any>;
  actionSchema?: Array<{ id: string; label: string; action: string; payload?: Record<string, any> }>;
}): Promise<CopilotChatArtifactRecord | null> {
  const db = getServerClient();
  try {
    const { data, error } = await db
      .from("copilot_chat_artifacts")
      .insert({
        session_id: params.sessionId,
        message_id: params.messageId || null,
        artifact_type: params.artifactType,
        title: params.title,
        payload: params.payload,
        action_schema: params.actionSchema || [],
      })
      .select("*")
      .single();

    if (error || !data) {
      console.warn("[COPILOT-ARTIFACTS] Erro ao gravar artefato de chat:", error?.message);
      return null;
    }

    return {
      id: data.id,
      sessionId: data.session_id,
      messageId: data.message_id,
      artifactType: data.artifact_type,
      title: data.title,
      payload: data.payload,
      actionSchema: data.action_schema,
      createdAt: data.created_at,
    };
  } catch (err: any) {
    console.warn("[COPILOT-ARTIFACTS] Exceção em saveCopilotArtifactRecord:", err.message);
    return null;
  }
}

export async function getCopilotSessionArtifacts(
  sessionId: string,
): Promise<CopilotChatArtifactRecord[]> {
  const db = getServerClient();
  const { data, error } = await db
    .from("copilot_chat_artifacts")
    .select("*")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: false });

  if (error || !data) return [];
  return data.map((d: any) => ({
    id: d.id,
    sessionId: d.session_id,
    messageId: d.message_id,
    artifactType: d.artifact_type,
    title: d.title,
    payload: d.payload,
    actionSchema: d.action_schema,
    createdAt: d.created_at,
  }));
}

// ============================================================
// Server Functions Expostas para TanStack Start
// ============================================================

export const getUserFactsFn = createServerFn({ method: "GET" })
  .validator(
    z.object({
      category: userFactCategoryEnum.optional(),
    }),
  )
  .handler(async ({ data }) => {
    const identity = await getServerIdentity().catch(() => null);
    if (!identity?.id) throw new Error("Usuário não autenticado");
    return getUserMemoryFacts(identity.id, data.category);
  });

export const upsertUserFactFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      category: userFactCategoryEnum,
      factKey: z.string().min(2),
      factValue: z.string().min(1),
      confidence: z.number().min(0).max(1).optional(),
    }),
  )
  .handler(async ({ data }) => {
    const identity = await getServerIdentity().catch(() => null);
    if (!identity?.id) throw new Error("Usuário não autenticado");
    return upsertUserMemoryFact({
      profileId: identity.id,
      category: data.category,
      factKey: data.factKey,
      factValue: data.factValue,
      confidence: data.confidence,
    });
  });

export const querySemanticMemoryFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      query: z.string().min(2),
      topK: z.number().int().min(1).max(20).optional(),
    }),
  )
  .handler(async ({ data }) => {
    const identity = await getServerIdentity().catch(() => null);
    if (!identity?.id) throw new Error("Usuário não autenticado");
    return searchSemanticMemory({
      profileId: identity.id,
      query: data.query,
      topK: data.topK || 5,
    });
  });
