/**
 * ai-connectors-secrets.server.ts — Cofre Criptográfico Server-Only para Conectores de IA
 * SERVIDOR APENAS. Nunca importar estaticamente em componentes client ou rotas públicas.
 */

import * as crypto from "crypto";
import { getServerClient } from "@/lib/supabase";

export type VaultConnectorProvider =
  | "google"
  | "microsoft"
  | "slack"
  | "notion"
  | "github"
  | "vercel"
  | "email"
  | "custom";

export interface EncryptedConnectorEnvelope {
  ciphertext: string;
  iv: string;
  tag: string;
}

export interface DecryptedConnectorRecord {
  connectorId: string;
  provider: VaultConnectorProvider;
  accountIdentifier: string | null;
  scopes: string[];
  credentials: Record<string, any>;
}

function deriveVaultKey(): Buffer {
  const secretKey = process.env.SECRET_ENCRYPTION_KEY?.trim();
  if (!secretKey || secretKey.length < 32) {
    throw new Error(
      "SECRET_ENCRYPTION_KEY ausente ou menor que 32 caracteres; cofre bloqueado.",
    );
  }
  return crypto.createHash("sha256").update(secretKey).digest();
}

export function encryptSecretPayload(
  payload: Record<string, any>,
): EncryptedConnectorEnvelope {
  const key = deriveVaultKey();
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

export function decryptSecretPayload(
  envelope: unknown,
): Record<string, any> {
  if (!envelope || typeof envelope !== "object") {
    throw new Error("Envelope criptográfico inválido.");
  }
  const { ciphertext, iv, tag } = envelope as Partial<EncryptedConnectorEnvelope>;
  if (!ciphertext || !iv || !tag) {
    throw new Error("Credenciais criptografadas incompletas no cofre.");
  }

  const key = deriveVaultKey();
  const decipher = crypto.createDecipheriv(
    "aes-256-gcm",
    key,
    Buffer.from(iv, "hex"),
  );
  decipher.setAuthTag(Buffer.from(tag, "hex"));

  let decrypted = decipher.update(ciphertext, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return JSON.parse(decrypted) as Record<string, any>;
}

export async function getDecryptedConnectorCredentialsForUser(
  userId: string,
  provider: VaultConnectorProvider,
): Promise<DecryptedConnectorRecord | null> {
  if (!userId) return null;
  const db = getServerClient();

  const { data: row, error } = await db
    .from("ai_connectors")
    .select("id, provider, status, scopes, account_identifier, encrypted_credentials")
    .eq("user_id", userId)
    .eq("provider", provider)
    .maybeSingle();

  if (error || !row || row.status !== "connected" || !row.encrypted_credentials) {
    return null;
  }

  const credentials = decryptSecretPayload(row.encrypted_credentials);
  return {
    connectorId: row.id,
    provider: row.provider as VaultConnectorProvider,
    accountIdentifier: row.account_identifier || null,
    scopes: Array.isArray(row.scopes) ? row.scopes : [],
    credentials,
  };
}

export function extractConnectorToken(credentials: Record<string, any>): string {
  const candidate =
    credentials?.apiToken ??
    credentials?.accessToken ??
    credentials?.token ??
    credentials?.botToken ??
    credentials?.secret ??
    "";
  return typeof candidate === "string" ? candidate.trim() : "";
}
