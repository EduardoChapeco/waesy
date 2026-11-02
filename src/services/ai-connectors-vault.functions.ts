/**
 * ai-connectors-vault.functions.ts — Central de Conectores Seguros de IA (Server-Side Secret Vault)
 * Gerencia credenciais e tokens de integração externa (Google, Microsoft, Slack, Notion, GitHub, E-mail)
 * com blindagem Zero-Trust: tokens nunca são transmitidos para o frontend.
 */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import * as crypto from "crypto";
import { getServerClient } from "@/lib/supabase";
import { getServerIdentity } from "@/lib/server-access";

const ConnectorProviderSchema = z.enum([
  "google",
  "microsoft",
  "slack",
  "notion",
  "github",
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
  accountIdentifier: z.string().min(3),
  scopes: z.array(z.string()).default([]),
  credentials: z.record(z.any()), // Tokens OAuth, chaves de API ou SMTP
});

const disconnectConnectorSchema = z.object({
  provider: ConnectorProviderSchema,
});

/**
 * Criptografia simétrica defensiva para credenciais em repouso no cofre
 */
function encryptSecretPayload(payload: Record<string, any>): Record<string, any> {
  const secretKey = process.env.SECRET_ENCRYPTION_KEY?.trim();
  if (!secretKey || secretKey.length < 32) {
    throw new Error("SECRET_ENCRYPTION_KEY ausente ou menor que 32 caracteres; cofre bloqueado.");
  }
  const key = crypto.createHash("sha256").update(secretKey).digest();
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);

  const jsonStr = JSON.stringify(payload);
  let encrypted = cipher.update(jsonStr, "utf8", "hex");
  encrypted += cipher.final("hex");
  const authTag = cipher.getAuthTag().toString("hex");

  return {
    ciphertext: encrypted,
    iv: iv.toString("hex"),
    tag: authTag,
  };
}

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
 * Desconecta e revoga as credenciais de um conector
 */
export const disconnectConnector = createServerFn({ method: "POST" })
  .validator(disconnectConnectorSchema)
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
