import React from "react";
import { Bell, Check, Clock, User, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { listCompanyNotifications, markNotificationAsRead } from "@/services/notifications-push.functions";
import { cn } from "@/lib/utils";

export function CompanyNotificationsBell() {
  const queryClient = useQueryClient();

  const { data } = useQuery({
    queryKey: ["company-notifications"],
    queryFn: () => listCompanyNotifications({ data: { limit: 10 } }),
    refetchInterval: 15000, // Atualiza a cada 15s para refletir novos leads
  });

  const markMutation = useMutation({
    mutationFn: (id: string) => markNotificationAsRead({ data: { notificationId: id } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["company-notifications"] });
    },
  });

  const notifications = data?.notifications || [];
  const unreadCount = data?.unreadCount || 0;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="relative size-9 rounded-xl border-border/60 hover:bg-muted/50 cursor-pointer"
          aria-label={`Notificações (${unreadCount} não lidas)`}
        >
          <Bell className="size-4 text-foreground" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 size-4 rounded-full bg-rose-500 text-white text-[9px] font-black flex items-center justify-center animate-pulse">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-80 sm:w-96 p-2 rounded-2xl bg-card border border-border/60 shadow-xl">
        <div className="p-2 border-b border-border/40 flex items-center justify-between">
          <span className="text-xs font-bold text-foreground">Alertas da Empresa</span>
          {unreadCount > 0 && (
            <Badge variant="secondary" className="text-[10px] font-bold">
              {unreadCount} novos
            </Badge>
          )}
        </div>

        <div className="max-h-80 overflow-y-auto py-1 space-y-1 divide-y divide-border/30">
          {notifications.length === 0 ? (
            <div className="p-6 text-center text-xs text-muted-foreground">
              Nenhuma notificação recente
            </div>
          ) : (
            notifications.map((n: any) => (
              <div
                key={n.id}
                onClick={() => {
                  if (!n.is_read) markMutation.mutate(n.id);
                }}
                className={cn(
                  "p-2.5 rounded-xl transition-colors cursor-pointer space-y-1",
                  n.is_read ? "bg-transparent opacity-80" : "bg-muted/40 font-medium"
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="font-bold text-xs text-foreground line-clamp-1">{n.title}</span>
                  <span className="text-[9.5px] text-muted-foreground shrink-0">
                    {new Date(n.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
                <p className="text-[11.5px] text-foreground/80 leading-snug line-clamp-2">
                  {n.message}
                </p>
                {n.author_name && (
                  <div className="flex items-center gap-1 text-[10px] text-muted-foreground pt-0.5">
                    <User className="size-2.5" />
                    <span>{n.author_name}</span>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
