/**
 * notification-bell.tsx — Sino de Notificações em Tempo Real do Workspace
 *
 * Fase F16 do Plano Mestre de Estabilização dos 4 Pilares.
 * Escuta eventos em tempo real via Supabase Realtime para alertar sobre novos
 * pedidos, mensagens e avisos do sistema com flyout interativo.
 */

import { useState, useEffect } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Bell, Check, ExternalLink, ShoppingBag, MessageSquare, Info, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import {
  listNotificationsFn,
  markNotificationReadFn,
  markAllNotificationsAsRead,
  type NotificationItemDTO,
} from "@/services/notifications.functions";
import { getBrowserClient } from "@/lib/supabase";

export interface NotificationBellProps {
  className?: string;
}

export function NotificationBell({ className }: NotificationBellProps) {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: notifications = [], isError } = useQuery({
    queryKey: ["workspace-notifications-bell"],
    queryFn: async () => {
      const res = await listNotificationsFn({ data: { limit: 10 } });
      return res || [];
    },
    staleTime: 30000,
  });

  const markReadMutation = useMutation({
    mutationFn: (notificationId: string) =>
      markNotificationReadFn({ data: { notificationId } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workspace-notifications-bell"] });
    },
  });

  const markAllReadMutation = useMutation({
    mutationFn: () => markAllNotificationsAsRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workspace-notifications-bell"] });
    },
  });

  // Escuta reativa do canal Supabase Realtime
  useEffect(() => {
    if (typeof window === "undefined") return;
    let supabase: any = null;
    try {
      supabase = getBrowserClient();
    } catch {
      return;
    }
    if (Boolean(supabase) === false) return;

    const channel = supabase
      .channel("workspace_realtime_notifications")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["workspace-notifications-bell"] });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const unreadItems = notifications.filter((n: NotificationItemDTO) => Boolean(n.isRead) === false);
  const unreadCount = unreadItems.length;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative min-h-11 min-w-11 rounded-lg focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
          aria-label={`Notificações${unreadCount > 0 ? ` (${unreadCount} novas)` : ""}`}
        >
          <Bell className="h-5 w-5 text-muted-foreground transition-colors hover:text-foreground" />
          {unreadCount > 0 && (
            <Badge
              variant="default"
              className="absolute -top-1 -right-1 h-5 min-w-5 px-2 flex items-center justify-center text-xs rounded-full"
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent
        align="end"
        sideOffset={8}
        className="w-80 sm:w-96 p-0 rounded-lg bg-popover border border-border"
      >
        <div className="flex items-center justify-between p-3 border-b border-border">
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-semibold text-foreground">Notificações</h4>
            {unreadCount > 0 && (
              <Badge variant="secondary" className="text-xs">
                {unreadCount} novas
              </Badge>
            )}
          </div>
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" onClick={() => markAllReadMutation.mutate()} disabled={markAllReadMutation.isPending} className="min-h-11 px-3 text-xs text-muted-foreground hover:text-foreground focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none">
              Marcar lidas
            </Button>
          )}
        </div>

        <div className="max-h-72 overflow-y-auto divide-y divide-border">
          {isError ? (
            <div className="p-6 text-center text-muted-foreground">
              <AlertCircle className="h-8 w-8 mx-auto mb-2 text-destructive opacity-60" />
              <p className="text-xs">Não foi possível carregar notificações</p>
            </div>
          ) : notifications.length === 0 ? (
            <div className="p-6 text-center text-muted-foreground">
              <Bell className="h-8 w-8 mx-auto mb-2 opacity-40" />
              <p className="text-xs">Nenhuma notificação no momento</p>
            </div>
          ) : (
            notifications.slice(0, 5).map((item: NotificationItemDTO) => (
              <div
                key={item.id}
                className="p-3 hover:bg-muted/40 transition-colors flex items-start gap-3"
              >
                <div className="mt-1 shrink-0 p-2 rounded-md bg-muted text-foreground">
                  {item.type === "order" ? (
                    <ShoppingBag className="h-4 w-4 text-primary" />
                  ) : item.type === "interaction" ? (
                    <MessageSquare className="h-4 w-4 text-primary" />
                  ) : (
                    <Info className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <p className="text-xs font-semibold text-foreground truncate">
                      {item.title}
                    </p>
                    {Boolean(item.isRead) === false && (
                      <button type="button" onClick={() => markReadMutation.mutate(item.id)} className="min-h-11 min-w-11 flex items-center justify-center rounded-sm text-muted-foreground hover:text-foreground focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none" title="Marcar como lida">
                        <Check className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                    {item.message}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="p-2 border-t border-border bg-muted/20">
          <Link to="/workspace/notificacoes" onClick={() => setOpen(false)} className="flex items-center justify-center gap-2 w-full min-h-11 py-2 text-xs font-medium text-primary hover:underline focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none">
            <span>Ver todas as notificações</span>
            <ExternalLink className="h-4 w-4" />
          </Link>
        </div>
      </PopoverContent>
    </Popover>
  );
}
