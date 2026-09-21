import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Bell, Check, CheckCheck, Tag, Briefcase, Store, Info, Layers, ArrowRight } from 'lucide-react';
import {
 Popover,
 PopoverContent,
 PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
 listUserNotifications,
 markNotificationAsRead,
 markAllNotificationsAsRead,
 type NotificationItemDTO,
 type NotificationType,
} from "@/services/notifications.functions";
import { cn } from "@/lib/utils";

interface NotificationsPopoverProps {
 session?: any;
}

const FILTER_TABS: { id: string; label: string; type?: NotificationType }[] = [
 { id: "all", label: "Tudo" },
 { id: "interaction", label: "Interações & Leads", type: "interaction" },
 { id: "promotion", label: "Promoções", type: "promotion" },
 { id: "opportunity", label: "Vagas", type: "opportunity" },
 { id: "system", label: "Avisos", type: "system" },
];

export function NotificationsPopover({ session }: NotificationsPopoverProps) {
 const [open, setOpen] = useState(false);
 const [activeTab, setActiveTab] = useState<string>("all");
 const queryClient = useQueryClient();
 const navigate = useNavigate();

 const { data: notifications = [] } = useQuery({
 queryKey: ["user-notifications", activeTab],
 queryFn: () =>
 listUserNotifications({
 data: {
 type: activeTab as any,
 limit: 25,
 },
 }),
 enabled: Boolean(session),
 refetchInterval: 30000,
 });

 const unreadCount = notifications.filter((n) => !n.isRead).length;

 const markReadMutation = useMutation({
 mutationFn: (id: string) => markNotificationAsRead({ data: { notificationId: id } }),
 onSuccess: () => {
 queryClient.invalidateQueries({ queryKey: ["user-notifications"] });
 queryClient.invalidateQueries({ queryKey: ["user-notifications-full"] });
 },
 });

 const markAllMutation = useMutation({
 mutationFn: () => markAllNotificationsAsRead(),
 onSuccess: () => {
 queryClient.invalidateQueries({ queryKey: ["user-notifications"] });
 queryClient.invalidateQueries({ queryKey: ["user-notifications-full"] });
 },
 });

 const handleNotificationClick = (item: NotificationItemDTO) => {
 if (!item.isRead) {
 markReadMutation.mutate(item.id);
 }
 setOpen(false);
 if (item.linkUrl) {
 navigate({ to: item.linkUrl });
 }
 };

 const handleTriggerClick = (e: React.MouseEvent) => {
 if (typeof window !== "undefined" && window.innerWidth < 768) {
 e.preventDefault();
 e.stopPropagation();
 navigate({ to: "/conta/notificacoes" });
 }
 };

 const getRelativeTime = (dateStr: string) => {
 try {
 const now = Date.now();
 const diff = Math.max(0, now - new Date(dateStr).getTime());
 const mins = Math.floor(diff / (1000 * 60));
 if (mins < 60) return `há ${Math.max(1, mins)} min`;
 const hours = Math.floor(mins / 60);
 if (hours < 24) return `há ${hours}h`;
 const days = Math.floor(hours / 24);
 return `há ${days}d`;
 } catch {
 return "recente";
 }
 };

 const getFallbackIcon = (type: NotificationType) => {
 switch (type) {
 case "promotion":
 return <Tag className="size-4 text-primary" />;
 case "opportunity":
 return <Briefcase className="size-4 text-primary" />;
 case "interaction":
 case "new_lead":
 return <Store className="size-4 text-emerald-600" />;
 default:
 return <Info className="size-4 text-primary" />;
 }
 };

 return (
 <Popover open={open} onOpenChange={setOpen}>
 <PopoverTrigger asChild>
 <button
 type="button"
 onClick={handleTriggerClick}
 aria-label="Abrir Notificações"
 className="relative size-10 rounded-full flex items-center justify-center text-foreground hover:bg-muted/80 active:scale-95 transition-all cursor-pointer focus:outline-none"
 >
 <Bell className="size-5" />
 {unreadCount > 0 && (
 <span className="absolute top-1.5 right-1.5 size-2 rounded-full bg-primary ring-2 ring-background animate-pulse" />
 )}
 </button>
 </PopoverTrigger>

 <PopoverContent
 align="end"
 sideOffset={8}
 className="w-[360px] sm:w-[400px] p-0 rounded-2xl bg-card overflow-hidden"
 >
 {/* ── 1. Header do Painel de Notificações ── */}
 <div className="p-4 pb-3 flex items-center justify-between">
 <div className="flex items-center gap-2">
 <h3 className="text-sm font-bold text-foreground">Notificações</h3>
 {unreadCount > 0 && (
 <Badge className="bg-primary text-primary-foreground font-mono text-[10px] px-1.5 py-0 h-4 rounded-full font-bold">
 {unreadCount} novas
 </Badge>
 )}
 </div>

 {unreadCount > 0 && (
 <button
 type="button"
 onClick={() => markAllMutation.mutate()}
 disabled={markAllMutation.isPending}
 className="text-[11px] font-semibold text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1 cursor-pointer"
 >
 <CheckCheck className="size-3.5" />
 <span>Marcar todas</span>
 </button>
 )}
 </div>

 {/* ── 2. Filtros por Categoria em Chips ── */}
 <div className="px-3 py-2 bg-muted/20 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
 {FILTER_TABS.map((tab) => {
 const isActive = activeTab === tab.id;
 return (
 <button
 key={tab.id}
 type="button"
 onClick={() => setActiveTab(tab.id)}
 className={cn(
 "px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer",
 isActive
 ? "bg-primary/10 text-primary border border-primary/25 font-bold"
 : "bg-muted/50 text-muted-foreground hover:text-foreground hover:bg-muted border border-transparent"
 )}
 >
 {tab.label}
 </button>
 );
 })}
 </div>

 {/* ── 3. Lista de Notificações com Scroll Interno Nativo ── */}
 <div className="max-h-[380px] overflow-y-auto divide-y divide-border/40 overscroll-contain">
 {notifications.length > 0 ? (
 <div className="p-1 space-y-0.5">
 {notifications.map((item) => (
 <div
 key={item.id}
 onClick={() => handleNotificationClick(item)}
 className={cn(
 "p-3 rounded-2xl flex items-start gap-3 transition-colors cursor-pointer group text-left",
 item.isRead ? "hover:bg-muted/40" : "bg-muted/30 hover:bg-muted/60"
 )}
 >
 {/* Avatar Squircle da Empresa / Autor */}
 <div className="size-10 rounded-xl bg-card overflow-hidden shrink-0 flex items-center justify-center ">
 {item.avatarUrl ? (
 <img src={item.avatarUrl} alt="" className="size-full object-cover" />
 ) : (
 <div className="size-full bg-primary/10 text-primary flex items-center justify-center">
 {getFallbackIcon(item.type)}
 </div>
 )}
 </div>

 {/* Conteúdo da Notificação */}
 <div className="min-w-0 flex-1 space-y-0.5">
 <div className="flex items-center justify-between gap-2">
 <p className={cn("text-xs line-clamp-1 leading-snug", item.isRead ? "font-semibold text-foreground" : "font-bold text-foreground")}>
 {item.title}
 </p>
 <span className="text-[10px] font-mono text-muted-foreground shrink-0">
 {getRelativeTime(item.createdAt)}
 </span>
 </div>

 <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">
 {item.message}
 </p>

 {item.authorName && (
 <span className="text-[10px] font-medium text-foreground/70 block pt-0.5">
 {item.authorName}
 </span>
 )}
 </div>

 {/* Indicador de Não Lida e Ação Rápida de Marcar como Lida no Desktop Hover */}
 {!item.isRead ? (
 <div className="shrink-0 flex items-center mt-1">
 <button
 type="button"
 title="Marcar como lida"
 aria-label="Marcar como lida"
 onClick={(e) => {
 e.stopPropagation();
 markReadMutation.mutate(item.id);
 }}
 className="hidden sm:group-hover:flex items-center justify-center size-5 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition-all cursor-pointer"
 >
 <Check className="size-3" />
 </button>
 <span className="size-2 rounded-full bg-primary sm:group-hover:hidden" />
 </div>
 ) : null}
 </div>
 ))}
 </div>
 ) : (
 <div className="py-12 px-4 text-center space-y-2">
 <Bell className="size-8 text-muted-foreground/40 mx-auto" />
 <p className="text-xs font-bold text-foreground">Nenhuma notificação no momento</p>
 <p className="text-[11px] text-muted-foreground">
 Avisos de pedidos, interações e ofertas aparecerão aqui.
 </p>
 </div>
 )}
 </div>

 {/* ── 4. Rodapé com Link para Visualização Completa In-Page ── */}
 <div className="p-2.5 bg-muted/10 flex items-center justify-between">
 <Button
 asChild
 variant="ghost"
 size="sm"
 onClick={() => setOpen(false)}
 className="w-full rounded-xl text-xs font-bold h-9 justify-center gap-1.5 text-foreground hover:bg-muted/80"
 >
 <Link to="/conta/notificacoes">
 <span>Ver todas as notificações</span>
 <ArrowRight className="size-3.5" />
 </Link>
 </Button>
 </div>
 </PopoverContent>
 </Popover>
 );
}
