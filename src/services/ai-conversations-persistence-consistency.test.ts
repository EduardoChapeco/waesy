import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const source = readFileSync(
  resolve(process.cwd(), "src/services/ai-conversations.functions.ts"),
  "utf8",
);

describe("chat — consistência de persistência", () => {
  it("não mascara falha ao carregar mensagens ou artifacts", () => {
    const block = source.slice(
      source.indexOf("export const getAiConversationThread"),
      source.indexOf("export const sendAiConversationMessage"),
    );
    expect(block).toContain("error: messagesErr");
    expect(block).toContain("error: artifactsErr");
    expect(block).toContain("Falha ao carregar mensagens da conversa");
    expect(block).toContain("Falha ao carregar artefatos da conversa");
  });

  it("finaliza artefato, resposta, status e memória pela RPC atômica", () => {
    const block = source.slice(
      source.indexOf("// 4–6. Finalizar o exchange"),
      source.indexOf("return {\n      userMessageId"),
    );
    expect(block).toContain('"persist_ai_conversation_exchange_atomic"');
    expect(block).toContain("p_user_message_id: userMsg.id");
    expect(block).toContain("p_updated_memory: execution.updatedMemory");
    expect(block).toContain("Falha ao finalizar exchange do Copilot");
  });

  it("não declara sucesso quando a transação do exchange falha", () => {
    const block = source.slice(
      source.indexOf("const { data: persistedExchange"),
      source.indexOf("return {\n      userMessageId"),
    );
    expect(block).toContain("exchangeError");
    expect(block).toContain("Falha ao finalizar exchange do Copilot");
  });
});
