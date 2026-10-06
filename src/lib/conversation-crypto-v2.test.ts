import { describe, expect, it, vi } from "vitest";

let keyRow: any = null;
vi.mock("@/lib/supabase", () => ({
  getServerClient: () => ({
    from: (table: string) => {
      if (table === "chat_conversation_keys") {
        const query: any = {
          select: () => query,
          eq: () => query,
          is: () => query,
          order: () => query,
          limit: () => query,
          maybeSingle: async () => ({ data: keyRow, error: null }),
          insert: (payload: any) => ({ select: () => ({ single: async () => { keyRow = { id: "key-1", key_version: 1, ...payload }; return { data: keyRow, error: null }; } }) }),
        };
        return query;
      }
      return { update: () => ({ eq: () => ({ eq: () => ({ is: async () => ({ data: null, error: null }) }) }) }) };
    },
  }),
}));

import { decryptConversationMessageForThread, encryptConversationMessageForThread, isConversationMessageV2 } from "./conversation-crypto.server";

describe("conversation crypto v2", () => {
  it("usa uma DEK por conversa e autentica o thread_id como AAD", async () => {
    process.env.VAULT_MASTER_KEY = "test-master-key-with-at-least-32-characters";
    keyRow = null;
    const encrypted = await encryptConversationMessageForThread("store-1", "thread-1", "segredo");
    expect(isConversationMessageV2(encrypted)).toBe(true);
    expect(await decryptConversationMessageForThread("store-1", "thread-1", encrypted)).toBe("segredo");
    await expect(decryptConversationMessageForThread("store-1", "thread-2", encrypted)).rejects.toThrow();
  });
});
