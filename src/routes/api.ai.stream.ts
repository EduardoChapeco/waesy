import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";
import { z } from "zod";
import { executeAiCoreGatewayStream } from "@/services/ai-core-gateway.functions";
import { createAiSseHeaders, encodeAiSseEvent } from "@/lib/ai/sse";
import { enforceRateLimit } from "@/lib/rate-limiter";
import { getServerIdentity } from "@/lib/server-access";
import { getServerClient } from "@/lib/supabase";
import { searchPlatformForCopilot, shouldSearchPlatform } from "@/services/copilot-internal-search";

const streamRequestSchema = z.object({
  task: z
    .enum([
      "chat",
      "resumo",
      "classificacao",
      "extracao",
      "geracao_texto",
      "imagem",
      "video",
      "embedding",
      "ocr",
      "codigo",
    ])
    .default("chat"),
  prompt: z.string().min(1),
  systemPrompt: z.string().optional(),
  module: z.string().optional(),
  promptVersion: z.string().optional(),
  constraints: z
    .object({
      maxTokens: z.number().int().positive().optional(),
      temperature: z.number().min(0).max(2).optional(),
      responseFormat: z.enum(["json_object", "text"]).optional(),
      timeoutMs: z.number().int().positive().optional(),
    })
    .optional(),
});

export const Route = createFileRoute("/api/ai/stream")({
  server: {
    handlers: {
      POST: async ({ request }: { request: Request }) => {
        let input: z.infer<typeof streamRequestSchema>;
        try {
          input = streamRequestSchema.parse(await request.json());
        } catch {
          return new Response(JSON.stringify({ error: "Payload SSE inválido" }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
          });
        }

        let identity: Awaited<ReturnType<typeof getServerIdentity>>;
        try {
          identity = await getServerIdentity();
          if (!identity?.id) throw new Error("Autenticação necessária para usar o Copilot.");
          enforceRateLimit(identity.id, "ai_generation");
        } catch (error) {
          return new Response(
            JSON.stringify({ error: error instanceof Error ? error.message : "Não autorizado" }),
            { status: 401, headers: { "Content-Type": "application/json" } },
          );
        }

        const platformSearch = shouldSearchPlatform(input.prompt)
          ? await searchPlatformForCopilot(getServerClient(), input.prompt)
          : null;

        const encoder = new TextEncoder();
        const stream = new ReadableStream<Uint8Array>({
          start(controller) {
            const send = (event: Parameters<typeof encodeAiSseEvent>[0]) => {
              if (!request.signal.aborted)
                controller.enqueue(encoder.encode(encodeAiSseEvent(event)));
            };
            const run = async () => {
              try {
                let streamedText = "";
                send({
                  type: "status",
                  phase: "planning",
                  message: "Solicitação validada; planejando execução.",
                });
                send({
                  type: "status",
                  phase: "running",
                  message: "Executando no gateway canônico de IA.",
                });
                if (platformSearch?.cards.length) {
                  const items = platformSearch.cards.map((card) => ({
                    id: card.id,
                    title: card.title,
                    subtitle: [card.kind, card.subtitle, card.location].filter(Boolean).join(" · "),
                    description: card.description,
                    location: card.location,
                    image_url: card.image_url,
                    price_cents: card.price_cents,
                    source_table: card.source_table,
                    source_id: card.source_id,
                    action: card.action,
                  }));
                  send({
                    type: "structured",
                    source: "platform",
                    payload: {
                      blocks: [{
                        type: "card_carousel",
                        data: { title: "Resultados no Waesy", source: "platform", query: platformSearch.query, items },
                      }],
                    },
                  });
                  send({
                    type: "delta",
                    text: `Encontrei ${items.length} resultado(s) na plataforma para “${platformSearch.query}”.`,
                    final: true,
                  });
                  send({ type: "done", provider: "platform", model: "supabase-catalog" });
                  return;
                }
                const result = await executeAiCoreGatewayStream(
                  {
                    task: input.task,
                    mode: "stream",
                    prompt: input.prompt,
                    systemPrompt: input.systemPrompt,
                    constraints: input.constraints,
                    module: input.module,
                    promptVersion: input.promptVersion,
                    authContext: {
                      userId: identity.id ?? undefined,
                      storeId: identity.store_id ?? undefined,
                    },
                  },
                  (text) => {
                    streamedText += text;
                    send({ type: "delta", text, final: false });
                  },
                );
                if (!result.success) {
                  send({
                    type: "error",
                    code: result.error?.code || "AI_EXECUTION_FAILED",
                    message: result.error?.message || "Falha na execução.",
                  });
                  return;
                }
                const residualPayload = result as unknown as { result?: { text?: unknown } };
                const residualText = typeof residualPayload.result?.text === "string" ? residualPayload.result.text.trim() : "";
                if (!streamedText.trim() && residualText) {
                  streamedText = residualText;
                  send({ type: "delta", text: residualText, final: true });
                }
                if (!streamedText.trim()) {
                  send({
                    type: "error",
                    code: "EMPTY_AI_RESPONSE",
                    message: "O gateway concluiu sem conteúdo para exibir.",
                  });
                  return;
                }
                send({
                  type: "status",
                  phase: "verifying",
                  message: "Resposta recebida; verificando resultado.",
                });
                send({
                  type: "done",
                  callId: result.metadata.callId,
                  provider: result.metadata.provider,
                  model: result.metadata.model,
                });
              } catch (error) {
                send({
                  type: "error",
                  code: "AI_STREAM_FAILED",
                  message: error instanceof Error ? error.message : String(error),
                });
              } finally {
                controller.close();
              }
            };
            void run();
          },
          cancel() {
            // O AbortSignal da Request impede novos eventos; o gateway mantém seus timeouts.
          },
        });
        return new Response(stream, { status: 200, headers: createAiSseHeaders() });
      },
    },
  },
} as never);
