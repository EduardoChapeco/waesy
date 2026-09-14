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
 { id: "interaction", label: "Interações & Lojas" },
 { id: "promotion", label: "Ofertas & Promoções" },
 { id: "opportunity", label: "Vagas & Oportunidades" },
 { id: "system", label: "Avisos do Sistema" },
];

function NotificationsPage() {
 const { session } = ((Route.useLoaderData?.() as any) || {});
 const [activeCategory, setActiveCategory] = useState("all");
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

 const handleNotificationClick = (item: NotificationItemDTO) => {
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
    <div className="w-full max-w-5xl mx-auto space-y-4 sm:space-y-6 pb-20 px-0 sm:px-4 md:px-0">
      {/* ── 1. Clean Minimalist Header ── */}
      <div className="flex items-center justify-between gap-4 border-b border-border/40 pb-4 pt-1">
        <div className="flex items-center gap-3">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
            Notificações
          </h1>
          {unreadCount > 0 && (
            <Badge variant="secondary" className="text-xs font-mono font-bold px-2 py-0.5 rounded-full">
              {unreadCount} não lidas
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

 {/* ── 3. Tabs / Filtros Horizontais ── */}
 <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
 {CATEGORY_TABS.map((tab) => {
 const isActive = activeCategory === tab.id;
 return (
 <button
 key={tab.id}
 type="button"
 onClick={() => setActiveCategory(tab.id)}
 className={cn(
 "px-3.5 py-2 rounded-2xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer",
 isActive
 ? "bg-foreground text-background font-bold "
 : "bg-card text-muted-foreground hover:text-foreground hover:bg-muted"
 )}
 >
 {tab.label}
 </button>
 );
 })}
 </div>

 {/* ── 4. Lista Completa de Notificações ── */}
 <div className="space-y-2">
 {notifications.length > 0 ? (
 notifications.map((item) => (
 <div
 key={item.id}
 onClick={() => handleNotificationClick(item)}
 className={cn(
 "p-4 rounded-2xl bg-card flex items-start gap-4 transition-all duration-200 cursor-pointer hover:border-foreground/30 hover:shadow-xs",
 !item.isRead && "bg-muted/20 border-primary/30"
 )}
 >
 {/* Avatar Squircle da Empresa / Remetente */}
 <div className="size-12 rounded-2xl bg-muted overflow-hidden shrink-0 flex items-center justify-center">
 {item.avatarUrl ? (
 <img src={item.avatarUrl} alt="" className="size-full object-cover" />
 ) : (
 <div className="size-full bg-primary/10 text-primary flex items-center justify-center">
 {getFallbackIcon(item.type)}
 </div>
 )}
 </div>

 {/* Informações da Notificação */}
 <div className="min-w-0 flex-1 space-y-1">
 <div className="flex items-center justify-between gap-2">
 <h3 className={cn("text-sm font-bold text-foreground", !item.isRead && "text-primary")}>
 {item.title}
 </h3>
 <span className="text-[11px] font-mono text-muted-foreground shrink-0">
 {getRelativeTime(item.createdAt)}
 </span>
 </div>

 <p className="text-xs text-muted-foreground leading-relaxed">
 {item.message}
 </p>

 {item.authorName && (
 <span className="text-[11px] font-semibold text-foreground/80 block pt-1">
 {item.authorName}
 </span>
 )}
 </div>

 {/* Ponto de Não Lida */}
 {!item.isRead && (
 <span className="size-2.5 rounded-full bg-primary shrink-0 mt-2" />
 )}
 </div>
 ))
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
 </div>
 );
}
