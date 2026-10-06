import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";
import { z } from "zod";
import { executeAiCoreGatewayStream } from "@/services/ai-core-gateway.functions";
import { createAiSseHeaders, encodeAiSseEvent } from "@/lib/ai/sse";

const streamRequestSchema = z.object({
  task: z.enum(["chat", "resumo", "classificacao", "extracao", "geracao_texto", "imagem", "video", "embedding", "ocr", "codigo"]).default("chat"),
  prompt: z.string().min(1),
  systemPrompt: z.string().optional(),
  module: z.string().optional(),
  promptVersion: z.string().optional(),
  constraints: z.object({ maxTokens: z.number().int().positive().optional(), temperature: z.number().min(0).max(2).optional(), responseFormat: z.enum(["json_object", "text"]).optional(), timeoutMs: z.number().int().positive().optional() }).optional(),
});

export const Route = createFileRoute("/api/ai/stream")({
  server: {
    handlers: {
      POST: async ({ request }: { request: Request }) => {
        let input: z.infer<typeof streamRequestSchema>;
        try {
          input = streamRequestSchema.parse(await request.json());
        } catch {
          return new Response(JSON.stringify({ error: "Payload SSE inválido" }), { status: 400, headers: { "Content-Type": "application/json" } });
        }

        const encoder = new TextEncoder();
        const stream = new ReadableStream<Uint8Array>({
          start(controller) {
            const send = (event: Parameters<typeof encodeAiSseEvent>[0]) => {
              if (!request.signal.aborted) controller.enqueue(encoder.encode(encodeAiSseEvent(event)));
            };
            const run = async () => {
              try {
                send({ type: "status", phase: "planning", message: "Solicitação validada; planejando execução." });
                send({ type: "status", phase: "running", message: "Executando no gateway canônico de IA." });
                const result = await executeAiCoreGatewayStream({
                  task: input.task,
                  mode: "stream",
                  prompt: input.prompt,
                  systemPrompt: input.systemPrompt,
                  constraints: input.constraints,
                  module: input.module,
                  promptVersion: input.promptVersion,
                  authContext: {},
                }, (text) => send({ type: "delta", text, final: false }));
                if (!result.success) {
                  send({ type: "error", code: result.error?.code || "AI_EXECUTION_FAILED", message: result.error?.message || "Falha na execução." });
                  return;
                }
                send({ type: "status", phase: "verifying", message: "Resposta recebida; verificando resultado." });
                send({ type: "done", callId: result.metadata.callId, provider: result.metadata.provider, model: result.metadata.model });
              } catch (error) {
                send({ type: "error", code: "AI_STREAM_FAILED", message: error instanceof Error ? error.message : String(error) });
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
