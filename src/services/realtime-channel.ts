/**
 * @fileoverview Cliente de Realtime Canônico (Waesy BigTech S09).
 * Encapsula subscrições WebSocket de presença e postgres_changes de forma tipada,
 * blindando rotas e páginas de acoplamento direto com a infraestrutura Supabase.
 */

import { getBrowserClient } from "@/lib/supabase";

export interface RealtimeSubscriptionOptions<T = any> {
  channelName: string;
  table: string;
  schema?: string;
  event?: "INSERT" | "UPDATE" | "DELETE" | "*";
  filter?: string;
  onPayload: (payload: { new: T; old: T; eventType: string }) => void;
}

/**
 * Cria uma subscrição segura ao canal de mudanças Postgres no client.
 * Retorna uma função de cleanup para ser invocada no useEffect.
 */
export function subscribeToTableChanges<T = any>(options: RealtimeSubscriptionOptions<T>): () => void {
  const supabase = getBrowserClient();
  if (!supabase) return () => {};

  const channel = supabase
    .channel(options.channelName)
    .on(
      "postgres_changes" as any,
      {
        event: options.event || "*",
        schema: options.schema || "public",
        table: options.table,
        filter: options.filter,
      },
      (payload: any) => {
        options.onPayload({
          new: payload.new as T,
          old: payload.old as T,
          eventType: payload.eventType,
        });
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

/**
 * Cria um canal customizado de presença ou broadcast no client.
 */
export function getRealtimeChannel(channelName: string, config?: any) {
  const supabase = getBrowserClient();
  if (!supabase) {
    return {
      channel: null,
      unsubscribe: () => {},
    };
  }
  const channel = supabase.channel(channelName, config);
  return {
    channel,
    unsubscribe: () => {
      supabase.removeChannel(channel);
    },
  };
}
