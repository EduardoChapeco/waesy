import { createHash } from "node:crypto";
import { z } from "zod";
import { getServerClient } from "@/lib/supabase";

export const INGEST_FEATURE_KEY = "whatsapp_group_ingest";
export const MAX_ITEMS = 500;

export const IngestPayloadSchema = z
  .object({
    idempotency_key: z.string().trim().min(8).max(128),
    dry_run: z.boolean().default(false),
    items: z
      .array(
        z
          .object({
            phone: z.string().trim().min(8).max(32),
            name: z.string().trim().max(160).optional().default(""),
            group_key: z.string().trim().min(1).max(160),
            group_name: z.string().trim().max(200).optional().default(""),
          })
          .strict(),
      )
      .min(1)
      .max(MAX_ITEMS),
  })
  .strict();

export type IngestAuth =
  | { ok: true; storeId: string; tokenId: string }
  | { ok: false; status: 401 | 403; error: string };

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/**
 * Autentica pelo Bearer token e DERIVA a loja a partir dele (nunca do corpo).
 * Revalida o feature grant. Falhas não revelam qual etapa falhou além de 401/403.
 */
export async function authenticateIngest(request: Request): Promise<IngestAuth> {
  const header = request.headers.get("authorization") || "";
  const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  if (token.length < 32) return { ok: false, status: 401, error: "Unauthorized" };

  const supabase = getServerClient();
  const { data: row } = await supabase
    .from("ingest_tokens")
    .select("id, store_id, expires_at, revoked_at")
    .eq("token_hash", hashToken(token))
    .maybeSingle();

  if (!row || row.revoked_at || (row.expires_at && new Date(row.expires_at) < new Date())) {
    return { ok: false, status: 401, error: "Unauthorized" };
  }

  const { data: grant } = await supabase
    .from("workspace_feature_grants")
    .select("enabled")
    .eq("store_id", row.store_id)
    .eq("feature_key", INGEST_FEATURE_KEY)
    .maybeSingle();

  if (!grant?.enabled) return { ok: false, status: 403, error: "Feature not enabled" };

  // fire-and-forget; falha aqui não bloqueia a requisição
  void supabase
    .from("ingest_tokens")
    .update({ last_used_at: new Date().toISOString() })
    .eq("id", row.id);

  return { ok: true, storeId: row.store_id, tokenId: row.id };
}

