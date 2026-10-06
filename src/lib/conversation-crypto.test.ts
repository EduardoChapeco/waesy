import { afterEach, describe, expect, it } from "vitest";
import { decryptConversationMessage, encryptConversationMessage, isEncryptedConversationMessage, redactConversationPayload } from "./conversation-crypto.server";

const originalKey = process.env.VAULT_MASTER_KEY;

afterEach(() => {
  if (originalKey === undefined) delete process.env.VAULT_MASTER_KEY;
  else process.env.VAULT_MASTER_KEY = originalKey;
});

describe("conversation crypto", () => {
  it("cifra e recupera conteúdo com envelope autenticado", () => {
    process.env.VAULT_MASTER_KEY = "test-master-key-with-at-least-32-characters";
    const encrypted = encryptConversationMessage("conteúdo confidencial");
    expect(isEncryptedConversationMessage(encrypted)).toBe(true);
    expect(encrypted).not.toContain("conteúdo confidencial");
    expect(decryptConversationMessage(encrypted)).toBe("conteúdo confidencial");
  });

  it("rejeita adulteração do ciphertext", () => {
    process.env.VAULT_MASTER_KEY = "test-master-key-with-at-least-32-characters";
    const encrypted = encryptConversationMessage("mensagem");
    expect(() => decryptConversationMessage(`${encrypted}00`)).toThrow();
  });

  it("redige segredos de payload de provider", () => {
    expect(redactConversationPayload({ api_key: "secret", access_token: "token", event: "message" })).toEqual({ api_key: "[REDACTED]", access_token: "[REDACTED]", event: "message" });
  });
});
