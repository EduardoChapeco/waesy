/**
 * Criptografia de conteúdo de conversa — SERVER ONLY.
 *
 * v2 usa uma DEK aleatória por thread, armazenada apenas envelopada pelo
 * cofre central. O thread_id participa como AAD, impedindo mover ciphertext
 * para outra conversa sem falha de autenticação. Isto é envelope encryption
 * server-side; não substitui a criptografia E2E do WhatsApp entre dispositivos.
 */
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { decryptSecret, encryptSecret } from "@/lib/crypto-vault.server";
import { getServerClient } from "@/lib/supabase";

const PREFIX_V1 = "waesy-msg:v1:";
const PREFIX_V2 = "waesy-msg:v2:";
const ALGORITHM = "aes-256-gcm";

type ConversationKeyRow = { id: string; wrapped_key: string; key_version: number };

async function getConversationKey(storeId: string, threadId: string, requestedVersion?: number): Promise<{ id: string; key: Buffer; version: number }> {
  const db = getServerClient();
  let keyQuery = db.from("chat_conversation_keys").select("id, wrapped_key, key_version").eq("store_id", storeId).eq("thread_id", threadId);
  if (requestedVersion) keyQuery = keyQuery.eq("key_version", requestedVersion);
  else keyQuery = keyQuery.is("retired_at", null).order("key_version", { ascending: false }).limit(1);
  const existing = await keyQuery.maybeSingle();
  let row = existing.data as ConversationKeyRow | null;
  if (!row) {
    const dek = randomBytes(32);
    const created = await db.from("chat_conversation_keys").insert({ store_id: storeId, thread_id: threadId, key_version: 1, wrapped_key: encryptSecret(dek.toString("base64")), algorithm: ALGORITHM }).select("id, wrapped_key, key_version").single();
    if (created.error && !/duplicate|unique/i.test(created.error.message)) throw new Error(`conversation_key_create_failed:${created.error.message}`);
    row = (created.data || (await db.from("chat_conversation_keys").select("id, wrapped_key, key_version").eq("store_id", storeId).eq("thread_id", threadId).order("key_version", { ascending: false }).limit(1).single()).data) as ConversationKeyRow | null;
  }
  if (!row) throw new Error("conversation_key_unavailable");
  const decoded = Buffer.from(decryptSecret(row.wrapped_key), "base64");
  if (decoded.length !== 32) throw new Error("conversation_key_invalid_length");
  await db.from("chat_threads").update({ conversation_key_id: row.id }).eq("id", threadId).eq("store_id", storeId).is("conversation_key_id", null);
  return { id: row.id, key: decoded, version: row.key_version || 1 };
}

export async function rotateConversationKey(storeId: string, threadId: string): Promise<{ keyId: string; keyVersion: number }> {
  const db = getServerClient();
  const latest = await db.from("chat_conversation_keys").select("key_version").eq("store_id", storeId).eq("thread_id", threadId).order("key_version", { ascending: false }).limit(1).maybeSingle();
  const nextVersion = Number(latest.data?.key_version || 0) + 1;
  const created = await db.from("chat_conversation_keys").insert({ store_id: storeId, thread_id: threadId, key_version: nextVersion, wrapped_key: encryptSecret(randomBytes(32).toString("base64")), algorithm: ALGORITHM }).select("id").single();
  if (created.error || !created.data) throw new Error(`conversation_key_rotation_failed:${created.error?.message || "no_key"}`);
  await db.from("chat_conversation_keys").update({ retired_at: new Date().toISOString() }).eq("store_id", storeId).eq("thread_id", threadId).lt("key_version", nextVersion).is("retired_at", null);
  await db.from("chat_threads").update({ conversation_key_id: created.data.id }).eq("id", threadId).eq("store_id", storeId);
  return { keyId: created.data.id, keyVersion: nextVersion };
}

export async function encryptConversationMessageForThread(storeId: string, threadId: string, plaintext: string): Promise<string> {
  const { key, version } = await getConversationKey(storeId, threadId);
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  cipher.setAAD(Buffer.from(threadId, "utf8"));
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${PREFIX_V2}${version}:${iv.toString("base64url")}:${tag.toString("base64url")}:${ciphertext.toString("base64url")}`;
}

export async function decryptConversationMessageForThread(storeId: string, threadId: string, value: string): Promise<string> {
  if (!value.startsWith(PREFIX_V2)) return decryptConversationMessage(value);
  const [versionText, ivText, tagText, ciphertextText] = value.slice(PREFIX_V2.length).split(":");
  if (!versionText || !ivText || !tagText || !ciphertextText) throw new Error("conversation_ciphertext_malformed");
  const { key, version } = await getConversationKey(storeId, threadId, Number(versionText));
  if (Number(versionText) !== version) throw new Error("conversation_key_version_mismatch");
  const decipher = createDecipheriv(ALGORITHM, key, Buffer.from(ivText, "base64url"));
  decipher.setAAD(Buffer.from(threadId, "utf8"));
  decipher.setAuthTag(Buffer.from(tagText, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(ciphertextText, "base64url")), decipher.final()]).toString("utf8");
}

export function encryptConversationMessage(plaintext: string): string {
  if (!plaintext) return `${PREFIX_V1}${encryptSecret("")}`;
  return `${PREFIX_V1}${encryptSecret(plaintext)}`;
}
export function decryptConversationMessage(value: string): string { if (!value.startsWith(PREFIX_V1)) return value; return decryptSecret(value.slice(PREFIX_V1.length)); }
export function isEncryptedConversationMessage(value: string | null | undefined): boolean { return typeof value === "string" && (value.startsWith(PREFIX_V1) || value.startsWith(PREFIX_V2)); }
export function isConversationMessageV2(value: string | null | undefined): boolean { return typeof value === "string" && value.startsWith(PREFIX_V2); }
const SECRET_KEYS = new Set(["access_token", "token", "api_key", "apikey", "app_secret", "secret", "password", "authorization", "secret_payload_encrypted"]);
const CONTENT_KEYS = new Set(["conversation", "messagebody", "body", "caption", "text", "content", "media", "url", "datauri"]);
const MESSAGE_CONTAINER_KEYS = new Set(["message", "imagemessage", "videomessage", "audiomessage", "documentmessage", "extendedtextmessage"]);

function redactValue(value: unknown, key?: string): unknown {
  const normalizedKey = key?.toLowerCase();
  if (normalizedKey && SECRET_KEYS.has(normalizedKey)) return "[REDACTED]";
  if (normalizedKey && CONTENT_KEYS.has(normalizedKey)) return "[REDACTED_CONTENT]";
  if (normalizedKey && MESSAGE_CONTAINER_KEYS.has(normalizedKey)) {
    if (!value || typeof value !== "object") return "[REDACTED_CONTENT]";
    return { message_type: Object.keys(value as Record<string, unknown>).slice(0, 3) };
  }
  if (Array.isArray(value)) return value.map((item) => redactValue(item));
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value as Record<string, unknown>).map(([childKey, childValue]) => [childKey, redactValue(childValue, childKey)]));
  }
  return value;
}

export function redactConversationPayload(payload: Record<string, unknown> | null | undefined): Record<string, unknown> {
  if (!payload) return {};
  return redactValue(payload) as Record<string, unknown>;
}

/** Sanitiza eventos para inbox/telemetria sem duplicar o conteúdo protegido da conversa. */
export function redactWhatsAppWebhookPayload(payload: Record<string, unknown> | null | undefined): Record<string, unknown> {
  return redactConversationPayload(payload);
}
