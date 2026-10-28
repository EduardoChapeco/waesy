import React, { useState, useEffect } from "react";
import { User, Phone, Mail, ShoppingBag, ShieldAlert, DollarSign, Calendar, FileText, CheckCircle2, AlertTriangle, ArrowUpRight, Plane, Compass, Ticket } from "lucide-react";
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
 <Loader2 className="size-5 animate-spin motion-reduce:animate-none text-primary" />
 <span className="text-xs">Carregando Customer 360...</span>
 </div>
 );
 }

 if (!data) return null;

 const { profile, metrics, orders, tickets, trips = [], credits = [] } = data;

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
 <p className="text-muted-foreground text-xs truncate flex items-center gap-1">
 <Mail className="size-3" />
 {profile?.email || "Sem e-mail"}
 </p>
 {profile?.phone && (
 <p className="text-muted-foreground text-xs truncate flex items-center gap-1">
 <Phone className="size-3" />
 {profile.phone}
 </p>
 )}
 </div>
 </div>

 {/* Métricas do Cliente (LTV, Pedidos, Tickets) */}
 <div className="grid grid-cols-2 gap-2">
 <div className="p-3 rounded-lg bg-card border border-border/80 space-y-1">
 <span className="text-xs text-muted-foreground uppercase font-bold flex items-center gap-1">
 <DollarSign className="size-3 text-success" />
 LTV Total
 </span>
 <p className="text-sm font-extrabold text-foreground">
 {formatBRL((metrics?.ltv_cents || 0) / 100)}
 </p>
 </div>

 <div className="p-3 rounded-lg bg-card border border-border/80 space-y-1">
 <span className="text-xs text-muted-foreground uppercase font-bold flex items-center gap-1">
 <ShoppingBag className="size-3 text-primary" />
 Pedidos
 </span>
 <p className="text-sm font-extrabold text-foreground">
 {metrics?.total_orders || 0} compras
 </p>
 </div>
 </div>

  {/* Viagens & Reservas Ativas (Padrão Blis.ai / Voll) */}
  {(trips.length > 0 || credits.length > 0) && (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-foreground flex items-center gap-2">
          <Plane className="size-3.5 text-sky-500" />
          Viagens & Reservas ({trips.length})
        </span>
        {credits.length > 0 && (
          <Badge variant="outline" className="text-xs font-mono text-emerald-600 bg-emerald-500/10 border-emerald-500/20">
            {credits.length} crédito(s)
          </Badge>
        )}
      </div>

      <div className="space-y-2 max-h-40 overflow-y-auto no-scrollbar pr-1">
        {trips.map((tr: any) => (
          <div key={tr.id} className="p-2 rounded-lg bg-card border border-border/80 text-xs space-y-1">
            <div className="flex items-center justify-between">
              <span className="font-bold text-foreground truncate max-w-40">
                {tr.title || tr.destination_city || `Viagem #${tr.trip_number || tr.id.slice(0, 6)}`}
              </span>
              <Badge variant="outline" className="text-xs px-2 py-0 h-4 uppercase">
                {tr.status}
              </Badge>
            </div>
            <div className="flex items-center justify-between text-muted-foreground text-xs">
              <span>{tr.destination_city || "Destino"}</span>
              <span className="font-semibold text-foreground">
                {formatBRL((tr.total_cents || 0) / 100)}
              </span>
            </div>
          </div>
        ))}

        {credits.map((cr: any) => (
          <div key={cr.id} className="p-2 rounded-lg bg-emerald-500/5 border border-emerald-500/20 text-xs flex items-center justify-between">
            <div className="space-y-1">
              <span className="font-bold text-emerald-700 dark:text-emerald-400 block">
                Crédito {cr.airline} · PNR {cr.original_pnr}
              </span>
              <span className="text-xs text-muted-foreground">
                Expira: {cr.expires_at}
              </span>
            </div>
            <span className="font-extrabold text-emerald-600 text-xs">
              {formatBRL((cr.remaining_amount_cents || 0) / 100)}
            </span>
          </div>
        ))}
      </div>
    </div>
  )}

 {/* Tickets / Chamados Abertos */}
 {tickets.length > 0 && (
 <div className="space-y-2">
 <div className="flex items-center justify-between">
 <span className="text-xs font-bold text-foreground flex items-center gap-2">
 <ShieldAlert className="size-3.5 text-destructive" />
 Ocorrências & SAC ({tickets.length})
 </span>
 </div>

 <div className="space-y-2 max-h-36 overflow-y-auto no-scrollbar pr-1">
 {tickets.map((t: any) => (
 <div key={t.id} className="p-2 rounded-lg bg-muted/40 border border-border/60 text-xs space-y-1">
 <div className="flex items-center justify-between">
 <span className="font-bold text-foreground truncate max-w-36">{t.title}</span>
 <Badge variant={t.status === "resolved" ? "default" : "destructive"} className="text-xs px-2 py-0 h-4">
 {t.status}
 </Badge>
 </div>
 <p className="text-xs text-muted-foreground line-clamp-1">{t.description}</p>
 </div>
 ))}
 </div>
 </div>
 )}

 {/* Histórico Recente de Compras */}
 <div className="space-y-2">
 <div className="flex items-center justify-between">
 <span className="text-xs font-bold text-foreground flex items-center gap-2">
 <ShoppingBag className="size-3.5 text-primary" />
 Últimos Pedidos
 </span>
 </div>

 {orders.length === 0 ? (
 <p className="text-xs text-muted-foreground italic">Nenhum pedido anterior na loja.</p>
 ) : (
 <div className="space-y-2 max-h-48 overflow-y-auto no-scrollbar pr-1">
 {orders.map((o: any) => (
 <div key={o.id} className="p-2 rounded-lg bg-card border border-border/80 flex items-center justify-between">
 <div>
 <span className="font-bold text-foreground text-xs block">
 #{o.id.slice(0, 8)}
 </span>
 <span className="text-xs text-muted-foreground">
 {formatDate(o.created_at)}
 </span>
 </div>
 <div className="text-right">
 <span className="font-extrabold text-xs text-foreground block">
 {formatBRL((o.total_amount_cents || 0) / 100)}
 </span>
 <Badge variant="outline" className="text-xs px-1 py-0 h-4 uppercase">
 {o.status}
 </Badge>
 </div>
 </div>
 ))}
 </div>
 )}
 
  </div>

  {/* Ações Rápidas de Integração CRM & SAC */}
  <div className="pt-2 border-t border-border/50 space-y-2">
    <Button
      asChild
      variant="outline"
      className="w-full h-11 min-h-11 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <Link to="/workspace/clientes/$id" params={{ id: customerId }}>
        <User className="size-4 text-primary" />
        <span>Abrir Dossiê no CRM</span>
        <ArrowUpRight className="size-3.5 ml-auto text-muted-foreground" />
      </Link>
    </Button>

    <Button
      asChild
      variant="ghost"
      className="w-full h-11 min-h-11 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 text-muted-foreground hover:text-foreground cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <Link to="/workspace/suporte">
        <ShieldAlert className="size-4 text-amber-500" />
        <span>Abrir Chamado no SAC</span>
        <ArrowUpRight className="size-3.5 ml-auto text-muted-foreground" />
      </Link>
    </Button>
  </div>
</div>

);
};
