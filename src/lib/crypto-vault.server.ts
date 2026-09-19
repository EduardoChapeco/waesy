/**
 * crypto-vault.server.ts — Módulo de Criptografia AES-256-GCM para Cofre de Credenciais
 *
 * SERVER ONLY — nunca importar em componentes React ou código cliente.
 *
 * Implementa criptografia simétrica real (AES-256-GCM) com autenticação (AEAD).
 * Substitui o uso indevido de base64 como "criptografia" no secret_vault.
 *
 * Padrão de segurança: NIST SP 800-38D (AES-GCM)
 * - Chave mestra: 256 bits (32 bytes) derivada de VAULT_MASTER_KEY env var
 * - IV: 96 bits (12 bytes) gerado aleatoriamente por operação
 * - Auth Tag: 128 bits (16 bytes) — garante integridade e autenticidade
 *
 * Formato de armazenamento: `iv_hex:authtag_hex:ciphertext_hex`
 * (tudo hex para máxima compatibilidade com TEXT no Postgres)
 */

import { createCipheriv, createDecipheriv, randomBytes, createHash } from "crypto";

// ─── Constantes ──────────────────────────────────────────────────────────────

const ALGORITHM = "aes-256-gcm" as const;
const IV_LENGTH = 12; // 96 bits — NIST recomendado para AES-GCM
const TAG_LENGTH = 16; // 128 bits auth tag
const SEPARATOR = ":";

// ─── Derivação da Chave Mestra ────────────────────────────────────────────────

/**
 * Deriva a chave AES-256 a partir da env var VAULT_MASTER_KEY.
 * Usa SHA-256 para normalizar qualquer comprimento para exatos 32 bytes.
 * Lança erro se a env var não estiver configurada (falha rápida e explícita).
 */
function getMasterKey(): Buffer {
  const rawKey = process.env.VAULT_MASTER_KEY;
  if (!rawKey || rawKey.length < 16) {
    throw new Error(
      "[crypto-vault] VAULT_MASTER_KEY não configurada ou muito curta (mínimo 16 chars). " +
        "Configure esta variável de ambiente no Cloudflare Pages / .env.local",
    );
  }
  // SHA-256 para garantir exatos 32 bytes independente do comprimento da env var
  return createHash("sha256").update(rawKey).digest();
}

// ─── Criptografia ─────────────────────────────────────────────────────────────

/**
 * Criptografa um texto plano usando AES-256-GCM com IV aleatório.
 *
 * @param plaintext — Texto a ser criptografado (ex: chave de API sk-proj-xxx)
 * @returns String no formato "iv_hex:authtag_hex:ciphertext_hex" para armazenamento
 */
export function encryptSecret(plaintext: string): string {
  const key = getMasterKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);

  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();

  // Armazenar como hex separado por ":" para legibilidade e auditoria
  return [iv.toString("hex"), authTag.toString("hex"), encrypted.toString("hex")].join(SEPARATOR);
}

// ─── Descriptografia ──────────────────────────────────────────────────────────

/**
 * Descriptografa um texto cifrado no formato produzido por `encryptSecret()`.
 * Valida o auth tag automaticamente — qualquer adulteração lança erro.
 *
 * @param encryptedPayload — String "iv_hex:authtag_hex:ciphertext_hex"
 * @returns Texto plano original
 */
export function decryptSecret(encryptedPayload: string): string {
  // Suporta legado base64 para migração suave dos registros antigos
  if (!encryptedPayload.includes(SEPARATOR)) {
    // Legado: tenta decodificar como base64 simples (será migrado no próximo save)
    try {
      const decoded = Buffer.from(encryptedPayload, "base64").toString("utf-8");
      if (decoded.trim().length > 0) return decoded.trim();
    } catch {
      // fallthrough
    }
    throw new Error("[crypto-vault] Payload inválido: não é AES-GCM nem base64 legado");
  }

  const parts = encryptedPayload.split(SEPARATOR);
  if (parts.length !== 3) {
    throw new Error(
      `[crypto-vault] Formato de payload inválido (esperado 3 partes, recebido ${parts.length})`,
    );
  }

  const [ivHex, authTagHex, ciphertextHex] = parts;
  const key = getMasterKey();
  const iv = Buffer.from(ivHex, "hex");
  const authTag = Buffer.from(authTagHex, "hex");
  const ciphertext = Buffer.from(ciphertextHex, "hex");

  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag); // Valida integridade — lança se adulterado

  const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return decrypted.toString("utf-8");
}

// ─── Utilitários ──────────────────────────────────────────────────────────────

/**
 * Retorna true se o payload está no formato AES-GCM (novo) ou base64 legado.
 * Útil para migrations progressivas sem downtime.
 */
export function isLegacyBase64(encryptedPayload: string): boolean {
  return !encryptedPayload.includes(SEPARATOR);
}

/**
 * Cria a máscara de exibição segura de uma chave (ex: "sk-...ab12").
 * Nunca expõe mais de 7 caracteres da chave original.
 */
export function maskSecret(rawKey: string): string {
  const key = rawKey.trim();
  if (key.length <= 8) return `***${key.slice(-2)}`;
  return `${key.slice(0, 3)}...${key.slice(-4)}`;
}
