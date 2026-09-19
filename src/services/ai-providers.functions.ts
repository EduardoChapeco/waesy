import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getServerClient } from "@/lib/supabase";
import { getServerIdentity, assertStoreAccess } from "@/lib/server-access";

// ---------------------------------------------------------------------------
// Types & Schemas
// ---------------------------------------------------------------------------

export type AiProviderType = "openai" | "anthropic" | "gemini" | "deepseek" | "groq" | "openrouter" | "custom";

export interface TenantAiProviderItem {
  id: string;
  store_id: string;
  provider: AiProviderType;
  model_name: string;
  api_key_masked: string;
  is_active: boolean;
  monthly_token_limit?: number | null;
  last_tested_at?: string | null;
  status: "untested" | "active" | "error";
  created_at: string;
  updated_at: string;
}

export const SaveAiProviderSchema = z.object({
  store_id: z.string().uuid(),
  provider: z.enum(["openai", "anthropic", "gemini", "deepseek", "groq", "openrouter", "custom"]),
  model_name: z.string().min(2, "Nome do modelo é obrigatório"),
  api_key: z.string().min(5, "Chave de API inválida"),
  monthly_token_limit: z.number().int().optional().nullable(),
  is_active: z.boolean().default(true),
});

export const TestAiProviderSchema = z.object({
  store_id: z.string().uuid(),
  provider: z.enum(["openai", "anthropic", "gemini", "deepseek", "groq", "openrouter", "custom"]),
});

function maskApiKey(key: string): string {
 if (!key || key.length < 8) return "••••••••";
 const start = key.substring(0, 4);
 const end = key.substring(key.length - 4);
 return `${start}••••••••${end}`;
}

// ---------------------------------------------------------------------------
// Server Functions
// ---------------------------------------------------------------------------

export const listTenantAiProviders = createServerFn({ method: "GET" })
 .validator(z.object({ store_id: z.string().uuid() }))
 .handler(async ({ data }): Promise<TenantAiProviderItem[]> => {
 const identity = await getServerIdentity();
 assertStoreAccess(identity);

 const db = getServerClient();
 const { data: rows, error } = await db
 .from("tenant_ai_providers")
 .select("*")
 .eq("store_id", data.store_id)
 .order("created_at", { ascending: true });

 if (error) throw error;

 return (rows || []).map((r) => ({
 id: r.id,
 store_id: r.store_id,
 provider: r.provider,
 model_name: r.model_name,
 api_key_masked: maskApiKey(r.api_key),
 is_active: r.is_active,
 monthly_token_limit: r.monthly_token_limit,
 last_tested_at: r.last_tested_at,
 status: r.status,
 created_at: r.created_at,
 updated_at: r.updated_at,
 }));
 });

export const saveTenantAiProvider = createServerFn({ method: "POST" })
  .validator(SaveAiProviderSchema)
  .handler(async ({ data }) => {
    const identity = await getServerIdentity();
    assertStoreAccess(identity);
    if (data.store_id !== identity.storeId && !identity.isPlatformAdmin) {
      throw new Error("Acesso não autorizado para esta organização.");
    }

    const db = getServerClient();
    const { data: saved, error } = await db
      .from("tenant_ai_providers")
      .upsert(
        {
          store_id: data.store_id,
          provider: data.provider,
          model_name: data.model_name.trim(),
          api_key: data.api_key.trim(),
          is_active: data.is_active,
          monthly_token_limit: data.monthly_token_limit || null,
          status: "untested",
          updated_at: new Date().toISOString(),
        },
        { onConflict: "store_id,provider" }
      )
      .select()
      .single();

    if (error) throw error;
    return saved;
  });

export const deleteTenantAiProvider = createServerFn({ method: "POST" })
  .validator(z.object({ store_id: z.string().uuid(), provider: z.string() }))
  .handler(async ({ data }) => {
    const identity = await getServerIdentity();
    assertStoreAccess(identity);
    if (data.store_id !== identity.storeId && !identity.isPlatformAdmin) {
      throw new Error("Acesso não autorizado para esta organização.");
    }

    const db = getServerClient();
    const { error } = await db
      .from("tenant_ai_providers")
      .delete()
      .eq("store_id", data.store_id)
      .eq("provider", data.provider);

    if (error) throw error;
    return { success: true };
  });

export const testAiProviderConnection = createServerFn({ method: "POST" })
  .validator(TestAiProviderSchema)
  .handler(async ({ data }) => {
    const identity = await getServerIdentity();
    assertStoreAccess(identity);
    if (data.store_id !== identity.storeId && !identity.isPlatformAdmin) {
      throw new Error("Acesso não autorizado para esta organização.");
    }

    const db = getServerClient();
 const { data: row, error: fetchErr } = await db
 .from("tenant_ai_providers")
 .select("*")
 .eq("store_id", data.store_id)
 .eq("provider", data.provider)
 .single();

 if (fetchErr || !row) throw new Error("Provedor não encontrado.");

 const startTime = Date.now();
 let isSuccess = false;
 let errorMessage = "";

 try {
    if (row.provider === "openai" || row.provider === "groq" || row.provider === "deepseek" || row.provider === "openrouter") {
      const baseUrl =
        row.provider === "groq"
          ? "https://api.groq.com/openai/v1/models"
          : row.provider === "deepseek"
          ? "https://api.deepseek.com/models"
          : row.provider === "openrouter"
          ? "https://openrouter.ai/api/v1/models"
          : "https://api.openai.com/v1/models";

      const res = await fetch(baseUrl, {
        headers: { Authorization: `Bearer ${row.api_key}` },
      });

 if (res.ok) {
 isSuccess = true;
 } else {
 const errData = await res.json().catch(() => ({}));
 errorMessage = errData?.error?.message || `HTTP ${res.status}`;
 }
 } else if (row.provider === "anthropic") {
 const res = await fetch("https://api.anthropic.com/v1/models", {
 headers: {
 "x-api-key": row.api_key,
 "anthropic-version": "2023-06-01",
 },
 });
 if (res.ok) {
 isSuccess = true;
 } else {
 const errData = await res.json().catch(() => ({}));
 errorMessage = errData?.error?.message || `HTTP ${res.status}`;
 }
 } else if (row.provider === "gemini") {
 const res = await fetch(
 `https://generativelanguage.googleapis.com/v1beta/models?key=${row.api_key}`
 );
 if (res.ok) {
 isSuccess = true;
 } else {
 const errData = await res.json().catch(() => ({}));
 errorMessage = errData?.error?.message || `HTTP ${res.status}`;
 }
 } else {
 // Custom
 isSuccess = true;
 }
 } catch (e: any) {
 errorMessage = e?.message || "Erro ao contactar API";
 }

 const latencyMs = Date.now() - startTime;
 const finalStatus = isSuccess ? "active" : "error";

 await db
 .from("tenant_ai_providers")
 .update({
 status: finalStatus,
 last_tested_at: new Date().toISOString(),
 })
 .eq("id", row.id);

 if (!isSuccess) {
 throw new Error(`Falha no teste de conexão: ${errorMessage}`);
 }

 return {
 success: true,
 latencyMs,
 provider: row.provider,
 status: finalStatus,
 };
 });
