import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";
import { z } from "zod";
import { executeAiCoreGatewayStream } from "@/services/ai-core-gateway.functions";
import {
  executeAiCopilotPipeline,
  prepareCopilotExchangeContext,
  finalizeCopilotExchange,
  finalizeResumedCopilotExchange,
} from "@/services/ai-conversations.functions";
import { loadCopilotExecutionForContinue } from "@/services/copilot-execution-persistence";
import { createAiSseHeaders, encodeAiSseEvent, type AiSseEvent } from "@/lib/ai/sse";
import { normalizeActiveCity, resolveActiveCity } from "@/lib/city-helper";
import { enforceRateLimit } from "@/lib/rate-limiter";
import { getServerIdentity } from "@/lib/server-access";
import { getServerClient } from "@/lib/supabase";
import { searchPlatformForCopilot, shouldSearchPlatform } from "@/services/copilot-internal-search";

const streamRequestSchema = z
  .object({
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
    prompt: z.string().optional(),
    message: z.string().min(1).max(4000).optional(),
    copilotMode: z.boolean().optional(),
    guest: z.boolean().optional(),
    threadId: z.string().uuid().optional(),
    clientMessageId: z.string().uuid().optional(),
    replyToId: z.string().uuid().optional(),
    attachments: z.array(z.string().url()).optional(),
    quickToolMode: z
      .enum(["default", "website_builder", "interactive_map", "document", "creative_post"])
      .optional(),
    storeId: z.string().uuid().optional(),
    folderId: z.string().uuid().nullish(),
    projectId: z.string().uuid().nullish(),
    userLat: z.number().optional(),
    userLng: z.number().optional(),
    city: z.string().max(120).optional(),
    state: z.string().max(60).optional(),
    systemPrompt: z.string().optional(),
    module: z.string().optional(),
    promptVersion: z.string().optional(),
    continueExecutionId: z.string().uuid().optional(),
    userGuidance: z.string().max(2000).optional(),
    constraints: z
      .object({
        maxTokens: z.number().int().positive().optional(),
        temperature: z.number().min(0).max(2).optional(),
        responseFormat: z.enum(["json_object", "text"]).optional(),
        timeoutMs: z.number().int().positive().optional(),
      })
      .optional(),
  })
  .refine((v) => Boolean((v.message || v.prompt || "").trim() || v.continueExecutionId), {
    message: "Informe message, prompt ou continueExecutionId.",
  });

export async function handleAiStreamRequest(
  request: Request,
): Promise<Response> {
        let input: z.infer<typeof streamRequestSchema>;
        try {
          input = streamRequestSchema.parse(await request.json());
        } catch {
          return new Response(JSON.stringify({ error: "Payload SSE inválido" }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
          });
        }

        const effectivePrompt = (input.message || input.prompt || "").trim();
        const isCopilotFlow = Boolean(
          input.copilotMode || input.threadId || input.guest || input.continueExecutionId,
        );

        let identity: Awaited<ReturnType<typeof getServerIdentity>> | null = null;
        try {
          identity = await getServerIdentity().catch(() => null);
          if (input.guest && !identity?.id) {
            enforceRateLimit("guest", "ai_generation");
            if (
              /\b(minerar|mineração|leads?|planilha|vagas?|eventos?|cnpj|processo)\b/i.test(
                effectivePrompt,
              )
            ) {
              return new Response(
                JSON.stringify({ error: "A busca avançada exige uma sessão autenticada." }),
                { status: 401, headers: { "Content-Type": "application/json" } },
              );
            }
          } else {
            if (!identity?.id) throw new Error("Autenticação necessária para usar o Copilot.");
            enforceRateLimit(identity.id, "ai_generation");
          }
        } catch (error) {
          return new Response(
            JSON.stringify({ error: error instanceof Error ? error.message : "Não autorizado" }),
            { status: 401, headers: { "Content-Type": "application/json" } },
          );
        }

        const encoder = new TextEncoder();
        let closed = false;
        const stream = new ReadableStream<Uint8Array>({
          start(controller) {
            let emittedDelta = false;
            const send = (event: AiSseEvent) => {
              if (closed || request.signal.aborted) return;
              if (event.type === "delta" && event.text) {
                emittedDelta = true;
              }
              try {
                controller.enqueue(encoder.encode(encodeAiSseEvent(event)));
              } catch {
                closed = true;
              }
            };
            const closeStream = () => {
              if (!closed) {
                closed = true;
                try {
                  controller.close();
                } catch {
                  /* stream already closed */
                }
              }
            };

            const run = async () => {
              try {
                if (isCopilotFlow) {
                  if (input.continueExecutionId) {
                    if (!identity?.id || input.guest) {
                      send({
                        type: "error",
                        code: "UNAUTHORIZED",
                        message: "Sessão autenticada necessária para retomar execução.",
                      });
                      return;
                    }
                    const loaded = await loadCopilotExecutionForContinue({
                      executionId: input.continueExecutionId,
                      userId: identity.id,
                      storeId: identity.store_id,
                    });
                    if (!loaded) {
                      send({
                        type: "error",
                        code: "NOT_FOUND",
                        message: "Checkpoint não encontrado ou acesso negado.",
                      });
                      return;
                    }
                    const execRow = loaded.execution;
                    const originalPrompt =
                      String(execRow.state?.userPrompt || effectivePrompt || "Continuar execução").trim();
                    const resolvedThreadId = execRow.thread_id || input.threadId;
                    const resolvedStoreId = execRow.store_id || input.storeId || undefined;

                    send({
                      type: "status",
                      phase: "running",
                      message: "Retomando execução a partir do checkpoint salvo.",
                    });

                    const resumedExecution = await executeAiCopilotPipeline(
                      originalPrompt,
                      {},
                      {
                        threadId: resolvedThreadId,
                        userId: identity.id,
                        storeId: resolvedStoreId,
                        quickToolMode: input.quickToolMode,
                        city: normalizeActiveCity(input.city) ?? resolveActiveCity(),
                        state: input.state,
                        signal: request.signal,
                        streamReact: true,
                        continueExecutionId: input.continueExecutionId,
                        userGuidance: input.userGuidance,
                        onEvent: send,
                      },
                    );

                    if (resumedExecution.checkpoint?.hasMore) {
                      send({
                        type: "done",
                        executionId: resumedExecution.executionId,
                        aiMessage: {
                          id: crypto.randomUUID(),
                          text: "",
                          activitySteps: resumedExecution.activitySteps,
                          executionId: resumedExecution.executionId,
                          artifact: resumedExecution.artifact,
                          plan: resumedExecution.plan,
                          vfsFiles: resumedExecution.vfsFiles,
                          checkpoint: resumedExecution.checkpoint,
                          status: "sending",
                          createdAt: new Date().toISOString(),
                        },
                      });
                      return;
                    }

                    if (!emittedDelta && resumedExecution.responseMessage) {
                      send({ type: "delta", text: resumedExecution.responseMessage, final: true });
                    }

                    if (resolvedThreadId) {
                      const finalized = await finalizeResumedCopilotExchange({
                        threadId: resolvedThreadId,
                        userId: identity.id,
                        storeId: resolvedStoreId || null,
                        clientMessageId: input.clientMessageId,
                        userPrompt: originalPrompt,
                        execution: resumedExecution,
                      });
                      send({
                        type: "done",
                        executionId: resumedExecution.executionId,
                        aiMessage: finalized.aiMessage as unknown as Record<string, unknown>,
                        updatedWorkingMemory: finalized.updatedWorkingMemory,
                      });
                      return;
                    }

                    send({
                      type: "done",
                      executionId: resumedExecution.executionId,
                      aiMessage: {
                        id: crypto.randomUUID(),
                        text: resumedExecution.responseMessage,
                        activitySteps: resumedExecution.activitySteps,
                        executionId: resumedExecution.executionId,
                        artifact: resumedExecution.artifact,
                        structuredPayload: resumedExecution.structuredPayload,
                        sources: resumedExecution.sources || [],
                        plan: resumedExecution.plan || [],
                        vfsFiles: resumedExecution.vfsFiles || [],
                        createdAt: new Date().toISOString(),
                        status: "delivered",
                        fsmPhase: resumedExecution.fsmPhase,
                      },
                      updatedWorkingMemory: resumedExecution.updatedMemory,
                    });
                    return;
                  }

                  if (input.threadId && identity?.id && !input.guest) {
                    const exchangeData = {
                      threadId: input.threadId,
                      clientMessageId: input.clientMessageId,
                      message: effectivePrompt,
                      replyToId: input.replyToId,
                      attachments: input.attachments ?? [],
                      quickToolMode: input.quickToolMode,
                      userLat: input.userLat,
                      userLng: input.userLng,
                      city: input.city,
                    };
                    const prepared = await prepareCopilotExchangeContext(exchangeData, identity);
                    if ("alreadyPersisted" in prepared && prepared.alreadyPersisted) {
                      const cachedAi = prepared.alreadyPersisted.aiMessage;
                      if (cachedAi.artifact) {
                        send({
                          type: "artifact_ready",
                          artifact: cachedAi.artifact as unknown as Record<string, unknown>,
                        });
                      }
                      if (cachedAi.structuredPayload) {
                        send({
                          type: "structured",
                          source: "platform",
                          payload: cachedAi.structuredPayload as Record<string, unknown>,
                        });
                      }
                      send({ type: "delta", text: cachedAi.text, final: true });
                      send({
                        type: "done",
                        executionId: cachedAi.executionId,
                        aiMessage: cachedAi as unknown as Record<string, unknown>,
                        updatedWorkingMemory: prepared.alreadyPersisted.updatedWorkingMemory,
                      });
                      return;
                    }

                    send({
                      type: "status",
                      phase: "planning",
                      message: "Planejando execução e reunindo contexto ativo.",
                    });

                    const execution = await executeAiCopilotPipeline(
                      effectivePrompt,
                      prepared.resolvedWorkingMemory,
                      {
                        threadId: input.threadId,
                        userId: identity.id,
                        storeId: prepared.resolvedStoreId || input.storeId,
                        folderId: prepared.resolvedFolderId ?? input.folderId,
                        projectId: prepared.resolvedProjectId ?? input.projectId,
                        quickToolMode: input.quickToolMode,
                        userLat: input.userLat,
                        userLng: input.userLng,
                        city: normalizeActiveCity(input.city) ?? resolveActiveCity(),
                        state: input.state,
                        attachments: input.attachments ?? [],
                        recentMessages: prepared.recentMessages,
                        signal: request.signal,
                        streamReact: true,
                        onEvent: send,
                      },
                    );

                    if (execution.checkpoint?.hasMore) {
                      send({
                        type: "done",
                        executionId: execution.executionId,
                        aiMessage: {
                          id: crypto.randomUUID(),
                          text: "",
                          activitySteps: execution.activitySteps,
                          executionId: execution.executionId,
                          artifact: execution.artifact,
                          plan: execution.plan || [],
                          vfsFiles: execution.vfsFiles || [],
                          checkpoint: execution.checkpoint,
                          status: "sending",
                          createdAt: new Date().toISOString(),
                        },
                      });
                      return;
                    }

                    if (!emittedDelta && execution.responseMessage) {
                      send({ type: "delta", text: execution.responseMessage, final: true });
                    }

                    send({
                      type: "status",
                      phase: "verifying",
                      message: "Persistindo histórico e artefatos da conversa.",
                    });

                    const finalized = await finalizeCopilotExchange({
                      db: prepared.db,
                      data: exchangeData,
                      identityId: identity.id,
                      isAiThread: prepared.isAiThread,
                      resolvedStoreId: prepared.resolvedStoreId,
                      userMsg: prepared.userMsg,
                      execution,
                    });

                    send({
                      type: "done",
                      executionId: execution.executionId,
                      aiMessage: finalized.aiMessage as unknown as Record<string, unknown>,
                      updatedWorkingMemory: finalized.updatedWorkingMemory,
                    });
                    return;
                  }

                  // Fluxo Copilot visitante (guest) ou efêmero sem threadId
                  send({
                    type: "status",
                    phase: "planning",
                    message: "Consultando registros verificados em tempo real.",
                  });
                  const execution = await executeAiCopilotPipeline(
                    effectivePrompt,
                    {},
                    {
                      userId: identity?.id || undefined,
                      storeId: input.storeId,
                      quickToolMode: input.quickToolMode,
                      userLat: input.userLat,
                      userLng: input.userLng,
                      city: normalizeActiveCity(input.city) ?? resolveActiveCity(),
                      state: input.state,
                      attachments: input.attachments ?? [],
                      signal: request.signal,
                      streamReact: true,
                      onEvent: send,
                    },
                  );
                  if (!emittedDelta && execution.responseMessage) {
                    send({ type: "delta", text: execution.responseMessage, final: true });
                  }
                  send({
                    type: "done",
                    executionId: execution.executionId,
                    aiMessage: {
                      id: crypto.randomUUID(),
                      text: execution.responseMessage,
                      activitySteps: execution.activitySteps,
                      executionId: execution.executionId,
                      artifact: execution.artifact,
                      structuredPayload: execution.structuredPayload,
                      sources: execution.sources || [],
                      createdAt: new Date().toISOString(),
                      status: "delivered",
                      fsmPhase: execution.fsmPhase,
                      fsmState: execution.fsmState,
                      toolCalls: execution.toolCalls || [],
                    },
                    updatedWorkingMemory: execution.updatedMemory,
                  });
                  return;
                }

                // Fluxo legado direto de streaming do Gateway AI Core
                const platformSearch = shouldSearchPlatform(effectivePrompt)
                  ? await searchPlatformForCopilot(getServerClient(), effectivePrompt)
                  : null;
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
                    prompt: effectivePrompt,
                    systemPrompt: input.systemPrompt,
                    constraints: input.constraints,
                    module: input.module,
                    promptVersion: input.promptVersion,
                    authContext: {
                      userId: identity?.id ?? undefined,
                      storeId: identity?.store_id ?? undefined,
                    },
                    signal: request.signal,
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
                closeStream();
              }
            };
            void run();
          },
          cancel() {
            closed = true;
          },
        });
        return new Response(stream, { status: 200, headers: createAiSseHeaders() });
}

export const Route = createFileRoute("/api/ai/stream")({
  server: {
    handlers: {
      POST: async ({ request }: { request: Request }) =>
        handleAiStreamRequest(request),
    },
  },
} as never);
