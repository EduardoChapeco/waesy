import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { encryptSecret, decryptSecret, maskSecret, isLegacyBase64 } from "./crypto-vault.server";

describe("crypto-vault.server (AES-256-GCM)", () => {
  const originalKey = process.env.VAULT_MASTER_KEY;

  beforeEach(() => {
    process.env.VAULT_MASTER_KEY = "test-master-key-with-at-least-32-characters-for-aes-256";
  });

  afterEach(() => {
    process.env.VAULT_MASTER_KEY = originalKey;
  });

  it("encrypts and decrypts secret correctly with AES-256-GCM", () => {
    const secret = "sk-test-live-key-1234567890abcdef";
    const encrypted = encryptSecret(secret);

    expect(encrypted).not.toBe(secret);
    expect(encrypted.split(":")).toHaveLength(3); // iv:tag:ciphertext
    expect(isLegacyBase64(encrypted)).toBe(false);

    const decrypted = decryptSecret(encrypted);
    expect(decrypted).toBe(secret);
  });

  it("produces distinct ciphertexts for identical inputs due to random IV", () => {
    const secret = "same-secret-string";
    const enc1 = encryptSecret(secret);
    const enc2 = encryptSecret(secret);

    expect(enc1).not.toBe(enc2);
    expect(decryptSecret(enc1)).toBe(secret);
    expect(decryptSecret(enc2)).toBe(secret);
  });

  it("seamlessly decrypts legacy base64 strings for progressive migration", () => {
    const rawSecret = "legacy-secret-api-key-999";
    const legacyBase64 = Buffer.from(rawSecret).toString("base64");

    expect(isLegacyBase64(legacyBase64)).toBe(true);
    const decrypted = decryptSecret(legacyBase64);
    expect(decrypted).toBe(rawSecret);
  });

  it("fails closed when ciphertext or auth tag is tampered with", () => {
    const encrypted = encryptSecret("tamper-proof-secret");
    const [iv, tag, ciphertext] = encrypted.split(":");
    const tamperedTag = tag.slice(0, -2) + (tag.endsWith("00") ? "11" : "00");
    const tamperedPayload = [iv, tamperedTag, ciphertext].join(":");

    expect(() => decryptSecret(tamperedPayload)).toThrow();
  });

  it("fails closed when VAULT_MASTER_KEY is missing or too short", () => {
    process.env.VAULT_MASTER_KEY = "too-short";
    expect(() => encryptSecret("any-key")).toThrow(/VAULT_MASTER_KEY/);
  });

  it("masks secrets safely preserving only edge characters", () => {
    expect(maskSecret("short")).toBe("***rt");
    expect(maskSecret("sk-1234567890abcdef")).toBe("sk-...cdef");
  });
});
