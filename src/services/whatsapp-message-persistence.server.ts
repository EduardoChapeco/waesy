import type { getServerClient } from "@/lib/supabase";

export interface PersistWhatsAppMessagesResult<T = Record<string, any>> {
  insertedRows: T[];
  insertedCount: number;
  skippedDuplicates: number;
  errors: string[];
}

export function isUniqueViolationError(error: any): boolean {
  if (!error) return false;
  const code = String(error.code || "");
  const msg = String(error.message || "").toLowerCase();
  return (
    code === "23505" ||
    msg.includes("duplicate key") ||
    msg.includes("unique constraint") ||
    msg.includes("uq_chat_messages_") ||
    msg.includes("chat_messages_provider_message_uq")
  );
}

function isMissingColumnError(error: any): boolean {
  if (!error) return false;
  const code = String(error.code || "");
  const msg = String(error.message || "").toLowerCase();
  return code === "42703" || code === "PGRST204" || msg.includes("column") && msg.includes("does not exist");
}

function stripOptionalWhatsAppColumns(row: Record<string, any>): Record<string, any> {
  const {
    provider_message_id: _pm,
    provider_name: _pn,
    encryption_version: _ev,
    is_encrypted: _ie,
    ...core
  } = row;
  return core;
}

/**
 * Consulta globalmente em `chat_messages` (sem restringir por thread_id) quais
 * `external_message_id` / `provider_message_id` já foram persistidos.
 * Evita que duplicatas cross-thread quebrem inserções em lote.
 */
export async function findExistingMessageExternalIds(
  db: ReturnType<typeof getServerClient>,
  candidateIds: string[],
): Promise<Set<string>> {
  const existing = new Set<string>();
  const uniqueIds = Array.from(new Set(candidateIds.map((id) => String(id || "").trim()).filter(Boolean)));
  if (uniqueIds.length === 0) return existing;

  for (let i = 0; i < uniqueIds.length; i += 150) {
    const chunk = uniqueIds.slice(i, i + 150);
    const [byExtRes, byProvRes] = await Promise.all([
      db
        .from("chat_messages")
        .select("external_message_id")
        .in("external_message_id", chunk),
      db
        .from("chat_messages")
        .select("provider_message_id")
        .in("provider_message_id", chunk),
    ]);

    for (const row of (byExtRes?.data || []) as any[]) {
      if (row?.external_message_id) existing.add(String(row.external_message_id));
    }
    for (const row of (byProvRes?.data || []) as any[]) {
      if (row?.provider_message_id) existing.add(String(row.provider_message_id));
    }
  }

  return existing;
}

/**
 * Persiste mensagens em `chat_messages` de forma estritamente idempotente:
 * 1) Deduplica em memória + checagem global prévia no banco;
 * 2) Tenta inserção em lote de até 100 itens;
 * 3) Se qualquer item do lote falhar (ex.: colisão de índice único ou coluna opcional),
 *    executa fallback item-a-item para jamais descartar mensagens válidas do mesmo lote.
 */
export async function persistWhatsAppMessagesIdempotently<T = Record<string, any>>(
  db: ReturnType<typeof getServerClient>,
  rows: Array<Record<string, any>>,
  options?: {
    selectFields?: string;
    skipGlobalPrecheck?: boolean;
  },
): Promise<PersistWhatsAppMessagesResult<T>> {
  if (!Array.isArray(rows) || rows.length === 0) {
    return { insertedRows: [], insertedCount: 0, skippedDuplicates: 0, errors: [] };
  }

  const selectFields = options?.selectFields || "id";
  const seenLocalExt = new Set<string>();
  const dedupedLocal: Array<Record<string, any>> = [];
  let skippedDuplicates = 0;

  for (const row of rows) {
    const extId = String(row?.external_message_id || row?.provider_message_id || "").trim();
    if (extId) {
      if (seenLocalExt.has(extId)) {
        skippedDuplicates += 1;
        continue;
      }
      seenLocalExt.add(extId);
    }
    dedupedLocal.push(row);
  }

  let rowsToWrite = dedupedLocal;
  if (!options?.skipGlobalPrecheck && seenLocalExt.size > 0) {
    const existingSet = await findExistingMessageExternalIds(db, Array.from(seenLocalExt));
    if (existingSet.size > 0) {
      rowsToWrite = dedupedLocal.filter((row) => {
        const extId = String(row?.external_message_id || "").trim();
        const provId = String(row?.provider_message_id || "").trim();
        if ((extId && existingSet.has(extId)) || (provId && existingSet.has(provId))) {
          skippedDuplicates += 1;
          return false;
        }
        return true;
      });
    }
  }

  if (rowsToWrite.length === 0) {
    return { insertedRows: [], insertedCount: 0, skippedDuplicates, errors: [] };
  }

  const insertedRows: T[] = [];
  let insertedCount = 0;
  const errors: string[] = [];

  for (let i = 0; i < rowsToWrite.length; i += 100) {
    const chunk = rowsToWrite.slice(i, i + 100);
    const { data, error } = await db
      .from("chat_messages")
      .insert(chunk)
      .select(selectFields);

    if (!error) {
      const createdList = Array.isArray(data) ? (data as T[]) : data ? [data as T] : [];
      insertedRows.push(...createdList);
      insertedCount += createdList.length > 0 ? createdList.length : chunk.length;
      continue;
    }

    console.warn("[whatsapp-persistence] Batch insert falhou, executando fallback linha-a-linha:", error.message);

    for (const row of chunk) {
      let rowAttempt = await db
        .from("chat_messages")
        .insert(row)
        .select(selectFields)
        .maybeSingle();

      if (rowAttempt.error && isMissingColumnError(rowAttempt.error)) {
        rowAttempt = await db
          .from("chat_messages")
          .insert(stripOptionalWhatsAppColumns(row))
          .select(selectFields)
          .maybeSingle();
      }

      if (!rowAttempt.error) {
        if (rowAttempt.data) {
          insertedRows.push(rowAttempt.data as T);
        }
        insertedCount += 1;
        continue;
      }

      if (isUniqueViolationError(rowAttempt.error)) {
        skippedDuplicates += 1;
        continue;
      }

      const errMsg = String(rowAttempt.error.message || "Erro desconhecido ao inserir chat_message");
      console.error("[whatsapp-persistence] Falha ao inserir mensagem:", errMsg, {
        threadId: row?.thread_id,
        externalId: row?.external_message_id,
      });
      errors.push(errMsg);
    }
  }

  return {
    insertedRows,
    insertedCount,
    skippedDuplicates,
    errors,
  };
}
