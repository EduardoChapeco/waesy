import React from "react";
import { Link } from "@tanstack/react-router";
import { Package, Truck, CheckCircle2, AlertTriangle, ArrowUpRight, Copy, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatBRL } from "@/lib/utils";
import { toast } from "sonner";

interface OrderMessageCardProps {
 order: {
 id: string;
 status: string;
 total_amount_cents: number;
 payment_method?: string;
 created_at?: string;
 items?: Array<{ product_name: string; quantity: number; price_cents: number }>;
 };
 onOpenRmaModal?: () => void;
 isStaff?: boolean;
}

const STATUS_LABELS: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
 pending: { label: "Aguardando Pagamento", variant: "outline" },
 paid: { label: "Pago / Confirmado", variant: "default" },
 preparing: { label: "Em Preparação", variant: "secondary" },
 in_transit: { label: "Saiu para Entrega", variant: "secondary" },
 delivered: { label: "Entregue", variant: "default" },
 cancelled: { label: "Cancelado", variant: "destructive" },
 refunded: { label: "Estornado / Devolvido", variant: "destructive" },
};

export const OrderMessageCard: React.FC<OrderMessageCardProps> = ({
 order,
 onOpenRmaModal,
 isStaff = false,
}) => {
 const statusConfig = STATUS_LABELS[order.status] || { label: order.status, variant: "outline" };

 const copyOrderId = () => {
 navigator.clipboard.writeText(order.id);
 toast.success("Código do pedido copiado!");
 };

 return (
 <div className="my-2 rounded-2xl border border-border/80 bg-card p-4 space-y-3 max-w-sm sm:max-w-md w-full">
 {/* Top Header */}
 <div className="flex items-center justify-between gap-2 border-b border-border/50 pb-2.5">
        <div className="flex items-center gap-2 min-w-0">
          <Package className="size-5 text-foreground shrink-0" strokeWidth={1.75} />
          <div className="min-w-0">
 <div className="flex items-center gap-1.5">
 <span className="text-xs font-bold text-foreground truncate">
 Pedido #{order.id.slice(0, 8)}
 </span>
 <button
 onClick={copyOrderId}
 type="button"
 className="text-muted-foreground hover:text-foreground transition-colors p-0.5 cursor-pointer"
 title="Copiar ID"
 >
 <Copy className="size-3" />
 </button>
 </div>
 <span className="text-[10px] text-muted-foreground">
 {order.payment_method?.toUpperCase() || "PIX / CARTÃO"}
 </span>
 </div>
 </div>
 <Badge variant={statusConfig.variant} className="text-[10px] uppercase font-bold shrink-0">
 {statusConfig.label}
 </Badge>
 </div>

 {/* Itens do Pedido */}
 {order.items && order.items.length > 0 && (
 <div className="space-y-1.5 py-1">
 {order.items.slice(0, 3).map((item, idx) => (
 <div key={idx} className="flex items-center justify-between text-xs">
 <span className="text-muted-foreground truncate max-w-[200px]">
 {item.quantity}x {item.product_name}
 </span>
 <span className="font-semibold text-foreground shrink-0">
 {formatBRL((item.price_cents * item.quantity) / 100)}
 </span>
 </div>
 ))}
 {order.items.length > 3 && (
 <p className="text-[10px] text-muted-foreground text-center pt-0.5">
 + {order.items.length - 3} outro(s) item(ns)
 </p>
 )}
 </div>
 )}

 {/* Total e Ações */}
 <div className="flex items-center justify-between pt-2 border-t border-border/50">
 <div>
 <span className="text-[10px] text-muted-foreground uppercase font-bold">Total do Pedido</span>
 <p className="text-sm font-extrabold text-foreground">
 {formatBRL(order.total_amount_cents / 100)}
 </p>
 </div>

 <div className="flex items-center gap-1.5">
 {!isStaff && onOpenRmaModal && (
 <Button
 variant="outline"
 size="sm"
 onClick={onOpenRmaModal}
 className="h-8 text-xs font-bold rounded-xl border-destructive/40 text-destructive hover:bg-destructive/10"
 >
 <AlertTriangle className="size-3.5 mr-1" />
 Troca / Ajuda
 </Button>
 )}

 <Button
 asChild
 variant="secondary"
 size="sm"
 className="h-8 text-xs font-bold rounded-xl"
 >
 <a href={`/conta/pedidos/${order.id}`} target="_blank" rel="noreferrer">
 Ver Detalhes
 <ArrowUpRight className="size-3 ml-1" />
 </a>
 </Button>
 </div>
 </div>
 </div>
 );
};
