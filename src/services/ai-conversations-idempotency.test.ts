import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const source = readFileSync(resolve(process.cwd(), "src/services/ai-conversations.functions.ts"), "utf8");

describe("chat — idempotência concorrente", () => {
  it("relê a mensagem vencedora após conflito de client_message_id", () => {
    const sendBlock = source.slice(
      source.indexOf("export const sendAiConversationMessage"),
      source.indexOf("export const saveAiChatArtifact"),
    );
    expect(sendBlock).toContain('userMsgErr?.code === "23505"');
    expect(sendBlock).toContain("const { data: winner } = await db");
    expect(sendBlock).toContain("const { data: winnerAi } = await db");
    expect(sendBlock).toContain("mapPersistedAiMessage(winnerAi, data.threadId)");
  });

  it("não executa pipeline novamente enquanto o vencedor estiver sending", () => {
    const sendBlock = source.slice(
      source.indexOf("export const sendAiConversationMessage"),
      source.indexOf("export const saveAiChatArtifact"),
    );
    const conflictBlock = sendBlock.slice(sendBlock.indexOf('userMsgErr?.code === "23505"'));
    expect(conflictBlock).toContain('winner.status === "sending"');
    expect(conflictBlock).toContain("Mensagem já está em processamento");
  });

  it("mantém a barreira única por thread e client_message_id", () => {
    const migration = readFileSync(
      resolve(process.cwd(), "supabase/migrations/20270112000001_chat_message_idempotency.sql"),
      "utf8",
    );
    expect(migration).toContain("(thread_id, client_message_id)");
    expect(migration).toContain("WHERE client_message_id IS NOT NULL");
  });
});
