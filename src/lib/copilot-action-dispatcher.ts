import { dispatchAiChatAction } from "@/services/ai-conversations.functions";
import type { AIChatAction } from "@/components/chat/structured-message-view";

const DISPATCHABLE_SERVER_ACTIONS = [
  "add_to_cart",
  "request_travel_quote",
  "submit_legal_demand",
  "publish_ad",
] as const;

export interface DispatchCopilotActionOptions {
  navigate: (opts: { to: string; search?: Record<string, any> }) => void;
  notify?: {
    success: (message: string) => void;
    info: (message: string) => void;
    error: (message: string) => void;
  };
  onAddedToCart?: () => Promise<void> | void;
  onBeforeNavigate?: () => void;
  mode?: "workspace" | "concierge";
}

function getActionSuccessMessage(actionType: string, mode: "workspace" | "concierge"): string {
  if (mode === "workspace") {
    return "Ação executada com sucesso.";
  }
  switch (actionType) {
    case "add_to_cart":
      return "Item adicionado ao carrinho.";
    case "request_travel_quote":
      return "Solicitação de cotação registrada.";
    case "submit_legal_demand":
      return "Demanda encaminhada para o painel jurídico.";
    case "publish_ad":
      return "Anúncio publicado com sucesso.";
    default:
      return "Ação concluída com sucesso.";
  }
}

export async function dispatchCopilotClientAction(
  action: AIChatAction,
  options: DispatchCopilotActionOptions,
) {
  const payload = action?.payload || {};
  const actionType = action?.action_type;
  const mode = options.mode || "workspace";

  if ((DISPATCHABLE_SERVER_ACTIONS as readonly string[]).includes(actionType)) {
    try {
      const result = await dispatchAiChatAction({
        data: {
          action_type: actionType as (typeof DISPATCHABLE_SERVER_ACTIONS)[number],
          payload,
        },
      });
      if (actionType === "add_to_cart" && options.onAddedToCart) {
        await options.onAddedToCart();
      }
      if ((result as { status?: string } | null)?.status === "needs_approval") {
        options.notify?.info("Solicitação registrada e aguardando aprovação humana.");
        return result;
      }
      options.notify?.success(getActionSuccessMessage(actionType, mode));
      return result;
    } catch (error: any) {
      options.notify?.error(error?.message || "Não foi possível executar esta ação.");
      return;
    }
  }

  if (actionType === "open_place") {
    const target = payload.slug || payload.placeId;
    if (typeof target === "string" && target.length > 0) {
      options.onBeforeNavigate?.();
      options.navigate({ to: `/places/${target}` });
      return;
    }
  }

  if (actionType === "call_ride") {
    options.onBeforeNavigate?.();
    options.navigate({ to: "/mobilidade" });
    return;
  }

  if (actionType === "open_checkout") {
    options.onBeforeNavigate?.();
    options.navigate({ to: "/checkout" });
    return;
  }

  if (actionType === "navigate") {
    const href = payload.href || payload.url;
    if (typeof href === "string" && href.startsWith("/") && !href.startsWith("//")) {
      options.onBeforeNavigate?.();
      options.navigate({ to: href });
      return;
    }
  }

  if (typeof payload.href === "string" && payload.href.startsWith("/") && !payload.href.startsWith("//")) {
    options.onBeforeNavigate?.();
    options.navigate({ to: payload.href });
    return;
  }

  options.notify?.info("Esta ação não possui executor disponível neste contexto.");
}
