/**
 * ai-connectors-vault.functions.ts — Central de Conectores Seguros de IA (Server-Side Secret Vault)
 * Gerencia credenciais e tokens de integração externa (Google, Microsoft, Slack, Notion, GitHub, Vercel, E-mail)
 * com blindagem Zero-Trust: tokens nunca são transmitidos para o frontend.
 */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getServerClient } from "@/lib/supabase";
import { getServerIdentity } from "@/lib/server-access";

const ConnectorProviderSchema = z.enum([
  "google",
  "microsoft",
  "slack",
  "notion",
  "github",
  "vercel",
  "email",
  "custom",
]);

export type ConnectorProvider = z.infer<typeof ConnectorProviderSchema>;

export interface PublicConnectorDTO {
  id: string;
  provider: ConnectorProvider;
  status: "connected" | "disconnected" | "error" | "needs_reauth";
  scopes: string[];
  accountIdentifier?: string | null;
  lastSyncedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

const saveConnectorSchema = z.object({
  provider: ConnectorProviderSchema,
  accountIdentifier: z.string().min(2),
  scopes: z.array(z.string()).default([]),
  credentials: z.record(z.any()),
});

const providerOnlySchema = z.object({
  provider: ConnectorProviderSchema,
});

/**
 * Lista todos os conectores do usuário (retornando apenas dados públicos e mascarados)
 */
export const listUserConnectors = createServerFn({ method: "GET" }).handler(
  async (): Promise<PublicConnectorDTO[]> => {
    const db = getServerClient();
    const identity = await getServerIdentity().catch(() => null);

    if (!identity?.id) return [];

    const { data: rows, error } = await db
      .from("ai_connectors")
      .select("id, provider, status, scopes, account_identifier, last_synced_at, created_at, updated_at")
      .eq("user_id", identity.id);

    if (error || !rows) return [];

    return rows.map((r: any) => ({
      id: r.id,
      provider: r.provider,
      status: r.status,
      scopes: r.scopes || [],
      accountIdentifier: r.account_identifier,
      lastSyncedAt: r.last_synced_at,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    }));
  },
);

/**
 * Salva ou atualiza as credenciais de um conector no cofre criptografado
 */
export const saveConnectorCredentials = createServerFn({ method: "POST" })
  .validator(saveConnectorSchema)
  .handler(async ({ data }) => {
    const db = getServerClient();
    const identity = await getServerIdentity().catch(() => null);

    if (!identity?.id) {
      throw new Error("Usuário não autenticado");
    }

    const { encryptSecretPayload } = await import("./ai-connectors-secrets.server");
    const encrypted = encryptSecretPayload(data.credentials);

    const { data: saved, error } = await db
      .from("ai_connectors")
      .upsert(
        {
          user_id: identity.id,
          provider: data.provider,
          status: "connected",
          scopes: data.scopes,
          account_identifier: data.accountIdentifier,
          encrypted_credentials: encrypted,
          last_synced_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,provider" },
      )
      .select("id, provider, status, scopes, account_identifier, updated_at")
      .single();

    if (error || !saved) {
      throw new Error(`Falha ao registrar conector no cofre: ${error?.message || "erro"}`);
    }

    return {
      success: true,
      connector: saved,
    };
  });

/**
 * Testa conectividade real da credencial salva no cofre criptografado
 */
export const testAiConnectorConnection = createServerFn({ method: "POST" })
  .validator(providerOnlySchema)
  .handler(async ({ data }) => {
    const db = getServerClient();
    const identity = await getServerIdentity().catch(() => null);
    if (!identity?.id) {
      throw new Error("Usuário não autenticado");
    }

    const { getDecryptedConnectorCredentialsForUser, extractConnectorToken } = await import(
      "./ai-connectors-secrets.server"
    );
    const record = await getDecryptedConnectorCredentialsForUser(identity.id, data.provider);
    if (!record) {
      return {
        ok: false,
        status: "disconnected" as const,
        message: `Conector "${data.provider}" não está configurado.`,
      };
    }

    const token = extractConnectorToken(record.credentials);
    let ok = false;
    let message = "";

    try {
      if (data.provider === "github") {
        if (!token) throw new Error("Personal Access Token GitHub ausente.");
        const res = await fetch("https://api.github.com/user", {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/vnd.github+json",
            "User-Agent": "Waesy-Copilot-Agent/1.0",
          },
        });
        if (!res.ok) throw new Error(`GitHub retornou HTTP ${res.status}.`);
        const gh = (await res.json()) as { login?: string };
        ok = true;
        message = `GitHub autenticado como @${gh.login || record.accountIdentifier || "usuario"}.`;
      } else if (data.provider === "vercel") {
        if (!token) throw new Error("API Token Vercel ausente.");
        const res = await fetch("https://api.vercel.com/v2/user", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error(`Vercel retornou HTTP ${res.status}.`);
        const vc = (await res.json()) as { user?: { username?: string } };
        ok = true;
        message = `Vercel autenticada (${vc.user?.username || record.accountIdentifier || "conta"}).`;
      } else if (data.provider === "notion") {
        if (!token) throw new Error("Internal Integration Token do Notion ausente.");
        const res = await fetch("https://api.notion.com/v1/users/me", {
          headers: {
            Authorization: `Bearer ${token}`,
            "Notion-Version": "2022-06-28",
          },
        });
        if (!res.ok) throw new Error(`Notion retornou HTTP ${res.status}.`);
        ok = true;
        message = "Integração Notion validada com sucesso.";
      } else if (data.provider === "slack") {
        if (!token) throw new Error("Bot Token Slack ausente.");
        const res = await fetch("https://slack.com/api/auth.test", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const slackJson = (await res.json()) as { ok?: boolean; error?: string; team?: string };
        if (!res.ok || !slackJson?.ok) {
          throw new Error(slackJson?.error || `Slack retornou HTTP ${res.status}.`);
        }
        ok = true;
        message = `Slack conectado ao workspace ${slackJson.team || record.accountIdentifier || "ativo"}.`;
      } else {
        ok = Boolean(token || record.credentials?.account || record.accountIdentifier);
        message = ok
          ? `Credenciais de ${data.provider} íntegras e decifradas com sucesso.`
          : `Credencial de ${data.provider} incompleta.`;
      }
    } catch (err: any) {
      ok = false;
      message = err?.message || `Falha ao validar ${data.provider}.`;
    }

    await db
      .from("ai_connectors")
      .update({
        status: ok ? "connected" : "error",
        last_synced_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", identity.id)
      .eq("provider", data.provider);

    return {
      ok,
      status: ok ? ("connected" as const) : ("error" as const),
      message,
    };
  });

/**
 * Desconecta e revoga as credenciais de um conector
 */
export const disconnectConnector = createServerFn({ method: "POST" })
  .validator(providerOnlySchema)
  .handler(async ({ data }) => {
    const db = getServerClient();
    const identity = await getServerIdentity().catch(() => null);

    if (!identity?.id) {
      throw new Error("Usuário não autenticado");
    }

    const { error } = await db
      .from("ai_connectors")
      .update({
        status: "disconnected",
        encrypted_credentials: null,
        account_identifier: null,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", identity.id)
      .eq("provider", data.provider);

    if (error) {
      throw new Error("Falha ao desconectar conector");
    }

    return { success: true };
  });

export const disconnectUserConnector = disconnectConnector;
