import React, { useState, useEffect } from "react";
import { User, Phone, Mail, ShoppingBag, ShieldAlert, DollarSign, Calendar, FileText, CheckCircle2, AlertTriangle, ArrowUpRight } from "lucide-react";
import { formatBRL } from "@/lib/utils";
import { formatDate } from "@/lib/datetime";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "@tanstack/react-router";
import { getCustomer360Context } from "@/services/chat.functions";
import { Loader2 } from "lucide-react";

interface Customer360SidebarProps {
 customerId?: string;
 storeId: string;
 className?: string;
}

export const Customer360Sidebar: React.FC<Customer360SidebarProps> = ({
 customerId,
 storeId,
 className,
}) => {
 const [data, setData] = useState<any>(null);
 const [loading, setLoading] = useState(false);

 useEffect(() => {
 if (!customerId || !storeId) return;

 let mounted = true;
 setLoading(true);
 getCustomer360Context({ data: { customerId, storeId } })
 .then((res) => {
 if (mounted) setData(res);
 })
 .catch((err) => {
 console.error("Erro ao carregar Customer 360:", err);
 })
 .finally(() => {
 if (mounted) setLoading(false);
 });

 return () => {
 mounted = false;
 };
 }, [customerId, storeId]);

 if (!customerId) {
 return (
 <div className="p-6 text-center text-muted-foreground text-xs">
 Cliente não cadastrado ou visitante anônimo.
 </div>
 );
 }

 if (loading) {
 return (
 <div className="flex flex-col items-center justify-center p-8 text-muted-foreground gap-2">
 <Loader2 className="size-5 animate-spin text-primary" />
 <span className="text-xs">Carregando Customer 360...</span>
 </div>
 );
 }

 if (!data) return null;

 const { profile, metrics, orders, tickets } = data;

 return (
 <div className="space-y-5 p-4 text-xs font-sans">
 {/* Perfil Header */}
 <div className="flex items-center gap-3 border-b border-border/50 pb-4">
 <div className="size-11 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-extrabold text-sm shrink-0 border border-primary/20">
 {profile?.avatar_url ? (
 <img src={profile.avatar_url} alt="" className="size-full rounded-lg object-cover" />
 ) : (
 (profile?.full_name || "C")[0].toUpperCase()
 )}
 </div>
 <div className="min-w-0 flex-1">
 <h4 className="font-bold text-foreground truncate text-sm">
 {profile?.full_name || "Cliente Waesy"}
 </h4>
 <p className="text-muted-foreground text-[11px] truncate flex items-center gap-1">
 <Mail className="size-3" />
 {profile?.email || "Sem e-mail"}
 </p>
 {profile?.phone && (
 <p className="text-muted-foreground text-[11px] truncate flex items-center gap-1">
 <Phone className="size-3" />
 {profile.phone}
 </p>
 )}
 </div>
 </div>

 {/* Métricas do Cliente (LTV, Pedidos, Tickets) */}
 <div className="grid grid-cols-2 gap-2">
 <div className="p-3 rounded-lg bg-card border border-border/80 space-y-1">
 <span className="text-[10px] text-muted-foreground uppercase font-bold flex items-center gap-1">
 <DollarSign className="size-3 text-success" />
 LTV Total
 </span>
 <p className="text-sm font-extrabold text-foreground">
 {formatBRL((metrics?.ltv_cents || 0) / 100)}
 </p>
 </div>

 <div className="p-3 rounded-lg bg-card border border-border/80 space-y-1">
 <span className="text-[10px] text-muted-foreground uppercase font-bold flex items-center gap-1">
 <ShoppingBag className="size-3 text-primary" />
 Pedidos
 </span>
 <p className="text-sm font-extrabold text-foreground">
 {metrics?.total_orders || 0} compras
 </p>
 </div>
 </div>

 {/* Tickets / Chamados Abertos */}
 {tickets.length > 0 && (
 <div className="space-y-2">
 <div className="flex items-center justify-between">
 <span className="text-[11px] font-bold text-foreground flex items-center gap-2">
 <ShieldAlert className="size-3.5 text-destructive" />
 Ocorrências & SAC ({tickets.length})
 </span>
 </div>

 <div className="space-y-2 max-h-36 overflow-y-auto no-scrollbar pr-1">
 {tickets.map((t: any) => (
 <div key={t.id} className="p-2 rounded-lg bg-muted/40 border border-border/60 text-[11px] space-y-1">
 <div className="flex items-center justify-between">
 <span className="font-bold text-foreground truncate max-w-[140px]">{t.title}</span>
 <Badge variant={t.status === "resolved" ? "default" : "destructive"} className="text-[9px] px-2 py-0 h-4">
 {t.status}
 </Badge>
 </div>
 <p className="text-[10px] text-muted-foreground line-clamp-1">{t.description}</p>
 </div>
 ))}
 </div>
 </div>
 )}

 {/* Histórico Recente de Compras */}
 <div className="space-y-2">
 <div className="flex items-center justify-between">
 <span className="text-[11px] font-bold text-foreground flex items-center gap-2">
 <ShoppingBag className="size-3.5 text-primary" />
 Últimos Pedidos
 </span>
 </div>

 {orders.length === 0 ? (
 <p className="text-[11px] text-muted-foreground italic">Nenhum pedido anterior na loja.</p>
 ) : (
 <div className="space-y-2 max-h-48 overflow-y-auto no-scrollbar pr-1">
 {orders.map((o: any) => (
 <div key={o.id} className="p-2 rounded-lg bg-card border border-border/80 flex items-center justify-between">
 <div>
 <span className="font-bold text-foreground text-xs block">
 #{o.id.slice(0, 8)}
 </span>
 <span className="text-[10px] text-muted-foreground">
 {formatDate(o.created_at)}
 </span>
 </div>
 <div className="text-right">
 <span className="font-extrabold text-xs text-foreground block">
 {formatBRL((o.total_amount_cents || 0) / 100)}
 </span>
 <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 uppercase">
 {o.status}
 </Badge>
 </div>
 </div>
 ))}
 </div>
 )}
 </div>
 </div>
 );
};
