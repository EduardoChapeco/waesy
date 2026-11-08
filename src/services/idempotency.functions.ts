import { createServerFn } from "@tanstack/react-start";
import { getServerClient } from "@/lib/supabase";
import { getServerIdentity } from "@/lib/server-access";
import { z } from "zod";

export const BeginIdempotentEventSchema = z.object({
  eventId: z.string().min(1, "ID do evento é obrigatório"),
  scope: z.string().min(1, "Escopo do evento é obrigatório"),
});

/**
 * Carimbo da Lotérica: Inicia a verificação de idempotência no banco de dados.
 * Retorna se o evento já foi processado e concluído com sucesso ("Carimbou PAGO, não paga de novo").
 */
export const beginIdempotentEvent = createServerFn({ method: "POST" })
  .validator(BeginIdempotentEventSchema)
  .handler(async ({ data: { eventId, scope } }) => {
    const supabase = getServerClient();
    const identity = await getServerIdentity().catch(() => ({ id: null }));

    const { data, error } = await supabase.rpc("idempotent_event_begin", {
      p_event_id: eventId,
      p_scope: scope,
      p_actor_id: identity.id ?? null,
    });

    if (error) {
      console.error("[beginIdempotentEvent] Erro na RPC:", error);
      throw new Error(error.message || "Falha ao registrar idempotência do evento.");
    }

    return data as {
      status: "acquired" | "completed" | "processing";
      already_processed: boolean;
      already_processing?: boolean;
      is_retry?: boolean;
      result?: any;
      message?: string;
    };
  });

export const CompleteIdempotentEventSchema = z.object({
  eventId: z.string().min(1, "ID do evento é obrigatório"),
  result: z.record(z.string(), z.any()),
});

/**
 * Carimbo da Lotérica: Conclui definitivamente o processamento de um evento,
 * gravando o resultado serializado para que replays nunca reexecutem a lógica.
 */
export const completeIdempotentEvent = createServerFn({ method: "POST" })
  .validator(CompleteIdempotentEventSchema)
  .handler(async ({ data: { eventId, result } }) => {
    const supabase = getServerClient();

    const { data, error } = await supabase.rpc("idempotent_event_complete", {
      p_event_id: eventId,
      p_result: result,
    });

    if (error) {
      console.error("[completeIdempotentEvent] Erro na RPC:", error);
      throw new Error(error.message || "Falha ao carimbar conclusão do evento.");
    }

    return data as { status: "completed"; event_id: string };
  });

export const FailIdempotentEventSchema = z.object({
  eventId: z.string().min(1, "ID do evento é obrigatório"),
  error: z.string().min(1, "Mensagem de erro obrigatória"),
});

/**
 * Carimbo da Lotérica: Registra falha na execução do evento para permitir retentativas auditadas.
 */
export const failIdempotentEvent = createServerFn({ method: "POST" })
  .validator(FailIdempotentEventSchema)
  .handler(async ({ data: { eventId, error } }) => {
    const supabase = getServerClient();

    const { data, error: rpcErr } = await supabase.rpc("idempotent_event_fail", {
      p_event_id: eventId,
      p_error: error,
    });

    if (rpcErr) {
      console.error("[failIdempotentEvent] Erro na RPC:", rpcErr);
    }

    return data as { status: "failed"; event_id: string; error: string };
  });

/**
 * Wrapper de Alta Confiabilidade para Execução Idempotente ("Carimbou PAGO").
 * Garante atomicidade:
 * 1. Se o evento já foi processado -> retorna imediatamente o payload cacheado sem tocar no backend.
 * 2. Se está em andamento -> rejeita execução concorrente duplicada.
 * 3. Se for a primeira vez -> executa o handler, carimba o resultado e retorna. Em caso de falha, carimba o erro.
 */
export async function executeWithIdempotency<T extends Record<string, any>>(
  eventId: string,
  scope: string,
  handler: () => Promise<T>,
): Promise<{ data: T; isIdempotentReplay: boolean }> {
  const supabase = getServerClient();
  const identity = await getServerIdentity().catch(() => ({ id: null }));

  const { data: init, error: initErr } = await supabase.rpc("idempotent_event_begin", {
    p_event_id: eventId,
    p_scope: scope,
    p_actor_id: identity.id ?? null,
  });

  if (initErr) {
    throw new Error(`Falha de inicialização de idempotência: ${initErr.message}`);
  }

  const beginResult = init as {
    status: string;
    already_processed: boolean;
    already_processing?: boolean;
    result?: T;
    message?: string;
  };

  // Se já foi carimbado como concluído ("Carimbou PAGO, não paga de novo")
  if (beginResult.already_processed && beginResult.result) {
    return {
      data: beginResult.result,
      isIdempotentReplay: true,
    };
  }

  // Se já está sendo processado simultaneamente por outro nó/worker
  if (beginResult.already_processing) {
    throw new Error(beginResult.message || "Evento transacional em processamento simultâneo.");
  }

  try {
    const result = await handler();

    await supabase.rpc("idempotent_event_complete", {
      p_event_id: eventId,
      p_result: result,
    });

    return {
      data: result,
      isIdempotentReplay: false,
    };
  } catch (err: any) {
    await supabase.rpc("idempotent_event_fail", {
      p_event_id: eventId,
      p_error: err?.message || String(err),
    });
    throw err;
  }
}
