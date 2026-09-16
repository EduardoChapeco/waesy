import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Bell,
  BellRing,
  CheckCheck,
  ShoppingBag,
  MessageCircle,
  AlertTriangle,
  Info,
  CheckCircle2,
  ExternalLink,
  ShieldCheck,
  Sliders,
  Volume2,
  VolumeX,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  listUserNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  type NotificationItemDTO,
} from "@/services/notifications.functions";
import {
  playMessageChime,
  isSoundMuted,
  setSoundMuted,
} from "@/lib/audio-chimes";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/workspace/notificacoes")({
  head: () => ({
    meta: [{ title: "Central de Notificações & Alertas | Workspace Waesy" }],
  }),
  loader: async () => {
    try {
      const data = await listUserNotifications({ data: { limit: 50 } });
      return { initialNotifications: data };
    } catch (err: any) {
      console.error("[loader:workspace.notificacoes] error:", err);
      return { initialNotifications: [] };
    }
  },
  component: WorkspaceNotificationsPage,
});

export default function WorkspaceNotificationsPage() {
  const { initialNotifications } = Route.useLoaderData();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const [activeFilter, setActiveFilter] = useState<"all" | "order" | "interaction" | "system">("all");
  const [pushPermission, setPushPermission] = useState<NotificationPermission>("default");
  const [soundMuted, setSoundMutedState] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setSoundMutedState(isSoundMuted());
      if ("Notification" in window) {
        setPushPermission(Notification.permission);
      }
    }
  }, []);

  const { data: notifications = initialNotifications } = useQuery({
    queryKey: ["workspace-notifications-list"],
    queryFn: () => listUserNotifications({ data: { limit: 50 } }),
    initialData: initialNotifications,
  });

  const markAsReadMutation = useMutation({
    mutationFn: (notificationId: string) => markNotificationAsRead({ data: { notificationId } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workspace-notifications-list"] });
    },
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: () => markAllNotificationsAsRead(),
    onSuccess: () => {
      toast.success("Todas as notificações foram marcadas como lidas!");
      queryClient.invalidateQueries({ queryKey: ["workspace-notifications-list"] });
    },
    onError: () => {
      toast.error("Erro ao marcar notificações como lidas.");
    },
  });

  const handleRequestPush = async () => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      toast.error("Notificações no navegador não são suportadas neste dispositivo.");
      return;
    }

    try {
      const perm = await Notification.requestPermission();
      setPushPermission(perm);
      if (perm === "granted") {
        toast.success("Notificações no navegador ativadas!");
        new Notification("Waesy Workspace", {
          body: "As notificações em tempo real estão ativas no seu dispositivo!",
          icon: "/favicon.ico",
        });
        playMessageChime();
      } else {
        toast.error("Permissão de notificação negada pelo navegador.");
      }
    } catch (e: any) {
      toast.error("Erro ao solicitar permissão de notificações.");
    }
  };

  const handleTestNotification = () => {
    if (pushPermission === "granted") {
      new Notification("🔔 Novo Pedido de Demonstração", {
        body: "Pedido #94821 recebido no valor de R$ 149,90 via PIX.",
        icon: "/favicon.ico",
      });
      playMessageChime();
      toast.success("Alerta de teste enviado!");
    } else {
      handleRequestPush();
    }
  };

  const toggleSound = () => {
    const next = !soundMuted;
    setSoundMuted(next);
    setSoundMutedState(next);
    if (!next) {
      playMessageChime();
      toast.success("Alertas sonoros ativados.");
    } else {
      toast.info("Alertas sonoros silenciados.");
    }
  };

  const filteredNotifications = useMemo(() => {
    return notifications.filter((n: NotificationItemDTO) => {
      if (activeFilter === "all") return true;
      if (activeFilter === "order") return n.type === "order";
      if (activeFilter === "interaction") return n.type === "interaction";
      if (activeFilter === "system") return n.type === "system" || n.type === "opportunity";
      return true;
    });
  }, [notifications, activeFilter]);

  const unreadCount = notifications.filter((n: NotificationItemDTO) => !n.isRead).length;

  return (
    <div className="w-full max-w-7xl mx-auto px-0 sm:px-4 md:px-0 py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/40 pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-2 rounded-xl bg-primary/10 text-primary">
              <Bell className="w-5 h-5" />
            </span>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">
              Central de Notificações & Alertas
            </h1>
            {unreadCount > 0 && (
              <Badge variant="default" className="text-xs">
                {unreadCount} novas
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            Acompanhe alertas de pedidos, estoque, mensagens e ative notificações em segundo plano no navegador.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={toggleSound}
            className="rounded-xl h-10 px-3 text-xs gap-1.5"
            title={soundMuted ? "Ativar som de alertas" : "Silenciar som de alertas"}
          >
            {soundMuted ? (
              <VolumeX className="w-4 h-4 text-muted-foreground" />
            ) : (
              <Volume2 className="w-4 h-4 text-emerald-500" />
            )}
            <span className="hidden sm:inline">{soundMuted ? "Mudo" : "Sons Ativos"}</span>
          </Button>

          {unreadCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => markAllAsReadMutation.mutate()}
              disabled={markAllAsReadMutation.isPending}
              className="rounded-xl h-10 px-4 text-xs gap-1.5"
            >
              <CheckCheck className="w-4 h-4" />
              <span>Marcar todas como lidas</span>
            </Button>
          )}
        </div>
      </div>

      {/* Banner de Status Web Push */}
      <div className="bg-card border border-border/60 rounded-2xl p-5 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="p-2.5 rounded-xl bg-muted text-foreground">
            <BellRing className="w-5 h-5 text-primary" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-foreground">
                Notificações Nativas no Navegador (Web Push)
              </h3>
              {pushPermission === "granted" ? (
                <Badge variant="outline" className="text-[11px] border-emerald-500/40 text-emerald-600 bg-emerald-500/10">
                  Ativas
                </Badge>
              ) : pushPermission === "denied" ? (
                <Badge variant="outline" className="text-[11px] border-rose-500/40 text-rose-600 bg-rose-500/10">
                  Bloqueadas
                </Badge>
              ) : (
                <Badge variant="secondary" className="text-[11px]">
                  Desativadas
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Receba alertas sonoros e notificações de vendas na tela do computador ou celular mesmo com a aba em segundo plano.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          {pushPermission === "granted" ? (
            <Button
              variant="outline"
              size="sm"
              onClick={handleTestNotification}
              className="rounded-xl h-9 text-xs px-3.5 gap-1.5"
            >
              <span>Testar Notificação</span>
            </Button>
          ) : (
            <Button
              size="sm"
              onClick={handleRequestPush}
              className="rounded-xl h-9 text-xs px-4 gap-1.5 shadow-xs"
            >
              <span>Ativar Notificações</span>
            </Button>
          )}
        </div>
      </div>

      {/* Filtros por Categoria */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
        <button
          type="button"
          onClick={() => setActiveFilter("all")}
          className={cn(
            "px-3.5 py-1.5 rounded-xl font-medium transition-colors whitespace-nowrap",
            activeFilter === "all"
              ? "bg-foreground text-background font-semibold"
              : "bg-muted/60 text-muted-foreground hover:text-foreground"
          )}
        >
          Todas ({notifications.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveFilter("order")}
          className={cn(
            "px-3.5 py-1.5 rounded-xl font-medium transition-colors whitespace-nowrap",
            activeFilter === "order"
              ? "bg-foreground text-background font-semibold"
              : "bg-muted/60 text-muted-foreground hover:text-foreground"
          )}
        >
          Pedidos & Vendas ({notifications.filter((n) => n.type === "order").length})
        </button>
        <button
          type="button"
          onClick={() => setActiveFilter("interaction")}
          className={cn(
            "px-3.5 py-1.5 rounded-xl font-medium transition-colors whitespace-nowrap",
            activeFilter === "interaction"
              ? "bg-foreground text-background font-semibold"
              : "bg-muted/60 text-muted-foreground hover:text-foreground"
          )}
        >
          Atendimento & Chat ({notifications.filter((n) => n.type === "interaction").length})
        </button>
        <button
          type="button"
          onClick={() => setActiveFilter("system")}
          className={cn(
            "px-3.5 py-1.5 rounded-xl font-medium transition-colors whitespace-nowrap",
            activeFilter === "system"
              ? "bg-foreground text-background font-semibold"
              : "bg-muted/60 text-muted-foreground hover:text-foreground"
          )}
        >
          Avisos do Sistema ({notifications.filter((n) => n.type === "system" || n.type === "opportunity").length})
        </button>
      </div>

      {/* Lista de Notificações */}
      <div className="space-y-3">
        {filteredNotifications.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border p-12 text-center bg-card">
            <Bell className="w-10 h-10 text-muted-foreground mx-auto mb-3 opacity-30" />
            <h3 className="text-sm font-semibold text-foreground">Nenhuma notificação por aqui</h3>
            <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
              Quando novos pedidos, mensagens ou avisos forem gerados para a sua loja, eles aparecerão nesta lista.
            </p>
          </div>
        ) : (
          filteredNotifications.map((notif: NotificationItemDTO) => (
            <div
              key={notif.id}
              onClick={() => {
                if (!notif.isRead) markAsReadMutation.mutate(notif.id);
                if (notif.linkUrl) navigate({ to: notif.linkUrl as any });
              }}
              className={cn(
                "group relative bg-card border rounded-2xl p-4.5 transition-all cursor-pointer flex items-start gap-4",
                !notif.isRead
                  ? "border-primary/40 bg-primary/2 hover:border-primary/60 shadow-2xs"
                  : "border-border/60 hover:border-border hover:bg-muted/20"
              )}
            >
              {/* Ícone por Tipo */}
              <div
                className={cn(
                  "p-2.5 rounded-xl shrink-0 mt-0.5",
                  notif.type === "order"
                    ? "bg-emerald-500/10 text-emerald-600"
                    : notif.type === "interaction"
                    ? "bg-blue-500/10 text-blue-600"
                    : notif.type === "opportunity"
                    ? "bg-purple-500/10 text-purple-600"
                    : "bg-muted text-muted-foreground"
                )}
              >
                {notif.type === "order" ? (
                  <ShoppingBag className="w-4 h-4" />
                ) : notif.type === "interaction" ? (
                  <MessageCircle className="w-4 h-4" />
                ) : notif.type === "opportunity" ? (
                  <CheckCircle2 className="w-4 h-4" />
                ) : (
                  <Info className="w-4 h-4" />
                )}
              </div>

              {/* Conteúdo */}
              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <h4 className={cn("text-sm tracking-tight truncate", !notif.isRead ? "font-semibold text-foreground" : "font-medium text-foreground/80")}>
                    {notif.title}
                  </h4>
                  <span className="text-[11px] text-muted-foreground shrink-0">
                    {new Date(notif.createdAt).toLocaleDateString("pt-BR", {
                      day: "2-digit",
                      month: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
                  {notif.message}
                </p>

                {notif.linkUrl && (
                  <div className="pt-1 flex items-center gap-1 text-[11px] text-primary font-medium">
                    <span>Ver detalhes</span>
                    <ExternalLink className="w-3 h-3" />
                  </div>
                )}
              </div>

              {/* Ponto indicador de não lida */}
              {!notif.isRead && (
                <div className="w-2.5 h-2.5 rounded-full bg-primary shrink-0 self-center" />
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
