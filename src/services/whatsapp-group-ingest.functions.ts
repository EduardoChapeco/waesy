import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { randomBytes } from "node:crypto";
import { getServerClient } from "@/lib/supabase";
import { requireOwner, requireStaff } from "@/lib/server-access";
import { INGEST_FEATURE_KEY, hashToken } from "@/services/whatsapp-group-ingest.server";

export interface IngestStatusDTO {
  isFeatureGranted: boolean;
  hasActiveToken: boolean;
  activeTokenCount: number;
  lastUsedAt: string | null;
}

/** Obtém o status de habilitação e tokens ativos do workspace atual. */
export const getIngestStatusFn = createServerFn({ method: "GET" }).handler(async (): Promise<IngestStatusDTO> => {
  const staff = await requireStaff();
  const supabase = getServerClient();

  const { data: grant } = await supabase
    .from("workspace_feature_grants")
    .select("enabled")
    .eq("store_id", staff.store_id)
    .eq("feature_key", INGEST_FEATURE_KEY)
    .maybeSingle();

  const isFeatureGranted = Boolean(grant?.enabled);

  const { data: tokens } = await supabase
    .from("ingest_tokens")
    .select("id, last_used_at, expires_at, revoked_at")
    .eq("store_id", staff.store_id)
    .is("revoked_at", null);

  const now = new Date();
  const activeTokens = (tokens || []).filter(
    (t) => !t.revoked_at && (!t.expires_at || new Date(t.expires_at) > now)
  );

  let lastUsedAt: string | null = null;
  for (const t of tokens || []) {
    if (t.last_used_at) {
      if (!lastUsedAt || new Date(t.last_used_at) > new Date(lastUsedAt)) {
        lastUsedAt = t.last_used_at;
      }
    }
  }

  return {
    isFeatureGranted,
    hasActiveToken: activeTokens.length > 0,
    activeTokenCount: activeTokens.length,
    lastUsedAt,
  };
});

/** Emite um token de ingestão. O valor em claro é devolvido UMA vez; só o hash é salvo. */
export const issueIngestTokenFn = createServerFn({ method: "POST" })
  .validator(z.object({ label: z.string().trim().max(80).optional() }))
  .handler(async ({ data }) => {
    const owner = await requireOwner();
    const supabase = getServerClient();

    const { data: grant } = await supabase
      .from("workspace_feature_grants")
      .select("enabled")
      .eq("store_id", owner.store_id)
      .eq("feature_key", INGEST_FEATURE_KEY)
      .maybeSingle();
    if (!grant?.enabled) throw new Error("Recurso não habilitado para este workspace.");

    const token = `wae_${randomBytes(32).toString("hex")}`;
    const { error } = await supabase.from("ingest_tokens").insert({
      store_id: owner.store_id,
      token_hash: hashToken(token),
      label: data.label || "Extensão WhatsApp",
      created_by: owner.id,
      expires_at: new Date(Date.now() + 90 * 24 * 3600 * 1000).toISOString(),
    });
    if (error) throw new Error("Falha ao emitir token.");
    return { token };
  });

export const revokeIngestTokensFn = createServerFn({ method: "POST" }).handler(async () => {
  const owner = await requireOwner();
  const { error } = await getServerClient()
    .from("ingest_tokens")
    .update({ revoked_at: new Date().toISOString() })
    .eq("store_id", owner.store_id)
    .is("revoked_at", null);
  if (error) throw new Error("Falha ao revogar tokens.");
  return { ok: true };
});
