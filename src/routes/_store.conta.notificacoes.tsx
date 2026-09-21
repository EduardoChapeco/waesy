import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Bell,
  CheckCheck,
  Tag,
  Briefcase,
  Store,
  Info,
  ArrowLeft,
  Trash2,
  ExternalLink,
  MailOpen,
  Mail,
  Calendar,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  listUserNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  type NotificationItemDTO,
  type NotificationType,
} from "@/services/notifications.functions";
import { getUserSession } from "@/services/auth.functions";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_store/conta/notificacoes")({
  head: () => ({
    meta: [{ title: "Central de Notificações | Waesy" }],
  }),
  loader: async () => {
    try {
      const session = await getUserSession().catch(() => null);
      return { session };
    } catch (err) {
      console.error("[loader:_store.conta.notificacoes] Unhandled loader error:", err);
      return { session: null };
    }
  },
  component: NotificationsPage,
});

const CATEGORY_TABS = [
  { id: "all", label: "Todas Notificações" },
  { id: "interaction", label: "Interações & Leads" },
  { id: "promotion", label: "Ofertas & Promoções" },
  { id: "opportunity", label: "Vagas & Oportunidades" },
  { id: "system", label: "Avisos do Sistema" },
];

function NotificationsPage() {
  const { session } = ((Route.useLoaderData?.() as any) || {});
  const [activeCategory, setActiveCategory] = useState("all");
  const [selectedNotificationId, setSelectedNotificationId] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { data: notifications = [] } = useQuery({
    queryKey: ["user-notifications-full", activeCategory],
    queryFn: () =>
      listUserNotifications({
        data: {
          type: activeCategory as any,
          limit: 100,
        },
      }),
  });

  const unreadCount = notifications.filter((n) => !n.isRead).length;
  const activeNotification =
    notifications.find((n) => n.id === selectedNotificationId) ||
    notifications[0] ||
    null;

  const markReadMutation = useMutation({
    mutationFn: (id: string) => markNotificationAsRead({ data: { notificationId: id } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-notifications-full"] });
      queryClient.invalidateQueries({ queryKey: ["user-notifications"] });
    },
  });

  const markAllMutation = useMutation({
    mutationFn: () => markAllNotificationsAsRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-notifications-full"] });
      queryClient.invalidateQueries({ queryKey: ["user-notifications"] });
    },
  });

  const handleNotificationSelect = (item: NotificationItemDTO) => {
    setSelectedNotificationId(item.id);
    if (!item.isRead) {
      markReadMutation.mutate(item.id);
    }
  };

  const handleNotificationAction = (item: NotificationItemDTO) => {
    if (!item.isRead) {
      markReadMutation.mutate(item.id);
    }
    if (item.linkUrl) {
      navigate({ to: item.linkUrl });
    }
  };

  const getRelativeTime = (dateStr: string) => {
    try {
      const now = Date.now();
      const diff = Math.max(0, now - new Date(dateStr).getTime());
      const mins = Math.floor(diff / (1000 * 60));
      if (mins < 60) return `há ${Math.max(1, mins)} min`;
      const hours = Math.floor(mins / 60);
      if (hours < 24) return `há ${hours} horas`;
      const days = Math.floor(hours / 24);
      return `há ${days} dias`;
    } catch {
      return "recente";
    }
  };

  const getFullFormattedDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return "";
    }
  };

  const getFallbackIcon = (type: NotificationType) => {
    switch (type) {
      case "promotion":
        return <Tag className="size-5 text-primary" />;
      case "opportunity":
        return <Briefcase className="size-5 text-primary" />;
      case "interaction":
        return <Store className="size-5 text-primary" />;
      default:
        return <Info className="size-5 text-primary" />;
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto space-y-4 sm:space-y-6 pb-20 px-0 sm:px-4 md:px-0">
      {/* ── 1. Clean Minimalist Header ── */}
      <div className="flex items-center justify-between gap-4 border-b border-border/40 pb-4 pt-1">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => (window.history.length > 1 ? window.history.back() : navigate({ to: "/" }))}
            className="p-2 -ml-2 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition-colors active:scale-95"
            aria-label="Voltar"
          >
            <ArrowLeft className="size-5" />
          </button>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
            Notificações
          </h1>
          {unreadCount > 0 && (
            <Badge variant="secondary" className="text-xs font-mono font-bold px-2 py-0.5 rounded-full">
              {unreadCount} novas
            </Badge>
          )}
        </div>

        {unreadCount > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => markAllMutation.mutate()}
            disabled={markAllMutation.isPending}
            className="rounded-xl font-semibold text-xs gap-1.5 h-8 px-3.5 cursor-pointer"
          >
            <CheckCheck className="size-3.5 text-primary" />
            <span>Marcar lidas</span>
          </Button>
        )}
      </div>

      {/* ── 2. Tabs / Filtros Horizontais ── */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
        {CATEGORY_TABS.map((tab) => {
          const isActive = activeCategory === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveCategory(tab.id)}
              className={cn(
                "px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer border",
                isActive
                  ? "bg-primary/10 text-primary border-primary/20 font-bold"
                  : "bg-transparent text-muted-foreground hover:text-foreground hover:bg-muted/50 border-transparent"
              )}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* ── 3. Layout Responsivo: Lista no Mobile vs Split 2 Colunas no Desktop ── */}
      {notifications.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Coluna Esquerda: Lista de Notificações (5 colunas no Desktop) */}
          <div className="lg:col-span-5 space-y-2 lg:max-h-[calc(100vh-220px)] lg:overflow-y-auto lg:pr-1 no-scrollbar">
            {notifications.map((item) => {
              const isSelected = activeNotification?.id === item.id;
              return (
                <div
                  key={item.id}
                  onClick={() => {
                    handleNotificationSelect(item);
                    // No mobile, se tiver link direto, aciona navegação direta
                    if (window.innerWidth < 1024 && item.linkUrl) {
                      handleNotificationAction(item);
                    }
                  }}
                  className={cn(
                    "p-3.5 sm:p-4 rounded-2xl bg-card border flex items-start gap-3.5 transition-all duration-200 cursor-pointer hover:border-foreground/30",
                    isSelected ? "border-primary ring-1 ring-primary bg-primary/5" : "border-border/60",
                    !item.isRead && !isSelected && "bg-muted/30 border-primary/40 font-medium"
                  )}
                >
                  {/* Avatar Squircle */}
                  <div className="size-10 rounded-xl bg-muted overflow-hidden shrink-0 flex items-center justify-center border border-border/40">
                    {item.avatarUrl ? (
                      <img src={item.avatarUrl} alt="" className="size-full object-cover" />
                    ) : (
                      getFallbackIcon(item.type)
                    )}
                  </div>

                  {/* Informações da Notificação */}
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className={cn("text-xs sm:text-sm font-bold text-foreground truncate", !item.isRead && "text-primary")}>
                        {item.title}
                      </h3>
                      <span className="text-[10px] sm:text-[11px] font-mono text-muted-foreground shrink-0">
                        {getRelativeTime(item.createdAt)}
                      </span>
                    </div>

                    <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                      {item.message}
                    </p>

                    {item.authorName && (
                      <span className="text-[10px] font-semibold text-foreground/80 block pt-0.5 truncate">
                        {item.authorName}
                      </span>
                    )}
                  </div>

                  {/* Ponto de Não Lida */}
                  {!item.isRead && (
                    <span className="size-2 rounded-full bg-primary shrink-0 mt-2" />
                  )}
                </div>
              );
            })}
          </div>

          {/* Coluna Direita: Painel de Leitura & Ação no Desktop (7 colunas no Desktop) */}
          <div className="hidden lg:block lg:col-span-7 lg:sticky lg:top-24">
            {activeNotification ? (
              <div className="bg-card rounded-2xl border border-border/70 p-6 sm:p-7 space-y-6 shadow-xs animate-in fade-in duration-200">
                {/* Cabeçalho do Leitor */}
                <div className="flex items-start justify-between gap-4 border-b border-border/40 pb-5">
                  <div className="flex items-center gap-3.5">
                    <div className="size-12 rounded-2xl bg-muted overflow-hidden shrink-0 flex items-center justify-center border border-border/40">
                      {activeNotification.avatarUrl ? (
                        <img src={activeNotification.avatarUrl} alt="" className="size-full object-cover" />
                      ) : (
                        getFallbackIcon(activeNotification.type)
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                          {activeNotification.authorName || "Sistema Waesy"}
                        </span>
                        {!activeNotification.isRead ? (
                          <Badge variant="outline" className="text-[10px] border-primary/40 text-primary">
                            Não Lida
                          </Badge>
                        ) : (
                          <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                            <MailOpen className="size-3" /> Lida
                          </span>
                        )}
                      </div>
                      <h2 className="text-lg sm:text-xl font-black text-foreground tracking-tight mt-0.5">
                        {activeNotification.title}
                      </h2>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-xs font-mono text-muted-foreground block">
                      {getRelativeTime(activeNotification.createdAt)}
                    </span>
                    <span className="text-[11px] text-muted-foreground/80 block mt-0.5">
                      {getFullFormattedDate(activeNotification.createdAt)}
                    </span>
                  </div>
                </div>

                {/* Corpo da Mensagem */}
                <div className="space-y-4">
                  <p className="text-sm text-foreground/90 leading-relaxed whitespace-pre-line font-normal">
                    {activeNotification.message}
                  </p>
                </div>

                {/* Ações do Leitor */}
                <div className="pt-4 border-t border-border/40 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    {activeNotification.linkUrl && (
                      <Button
                        type="button"
                        onClick={() => handleNotificationAction(activeNotification)}
                        className="rounded-xl font-bold text-xs gap-1.5 h-10 px-5 cursor-pointer shadow-xs"
                      >
                        <span>Abrir Conteúdo</span>
                        <ExternalLink className="size-3.5" />
                      </Button>
                    )}
                  </div>

                  <span className="text-[11px] text-muted-foreground">
                    ID: <code className="font-mono text-[10px]">{activeNotification.id.slice(0, 8)}</code>
                  </span>
                </div>
              </div>
            ) : (
              <div className="bg-card rounded-2xl border border-dashed border-border/70 p-12 text-center space-y-2">
                <Bell className="size-8 text-muted-foreground/50 mx-auto" />
                <p className="text-sm font-semibold text-foreground">Nenhuma notificação selecionada</p>
                <p className="text-xs text-muted-foreground">Selecione uma notificação na coluna ao lado para ler.</p>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="py-20 text-center space-y-3 bg-muted/10 rounded-2xl border-0 p-8">
          <Bell className="size-10 text-muted-foreground/40 mx-auto" />
          <h3 className="text-sm font-bold text-foreground">Nenhuma notificação encontrada</h3>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            Você está em dia com todos os seus alertas e novidades da comunidade.
          </p>
        </div>
      )}
    </div>
  );
}
