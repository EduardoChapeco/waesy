import React from "react";
import { AlertCircle, CheckCircle2, Clock, ShieldAlert, Image as ImageIcon, ExternalLink } from "lucide-react";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface RmaMessageCardProps {
 payload: {
 ticket_id: string;
 ticket_type: string;
 title: string;
 description: string;
 photo_urls?: string[];
 status: string;
 resolution_notes?: string;
 };
 onReviewTicket?: () => void;
 isStaff?: boolean;
}

const TICKET_TYPE_LABELS: Record<string, string> = {
 return_exchange: "Troca / Devolução",
 defect_complaint: "Produto com Avaria",
 missing_item: "Item Faltante",
 delivery_issue: "Problema na Entrega",
 billing_pix: "Financeiro / Cobrança",
 other: "Atendimento Especial",
};

const STATUS_CONFIG: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
 open: { label: "Chamado Aberto", variant: "destructive" },
 under_review: { label: "Em Análise pela Loja", variant: "secondary" },
 action_required: { label: "Ação Necessária", variant: "outline" },
 refunded: { label: "Reembolsado / Estornado", variant: "default" },
 resolved: { label: "Resolvido", variant: "default" },
 rejected: { label: "Recusado", variant: "destructive" },
};

export const RmaMessageCard: React.FC<RmaMessageCardProps> = ({
 payload,
 onReviewTicket,
 isStaff = false,
}) => {
 const statusInfo = STATUS_CONFIG[payload.status] || { label: payload.status, variant: "outline" };

 return (
 <div className="my-2 rounded-2xl border border-destructive/20 bg-card p-4 space-y-3 max-w-sm sm:max-w-md w-full">
 <div className="flex items-center justify-between gap-2 border-b border-border/50 pb-2.5">
 <div className="flex items-center gap-2">
 <ShieldAlert className="size-5 text-destructive shrink-0" strokeWidth={1.75} />
 <div>
 <span className="text-xs font-bold text-foreground block">
 {TICKET_TYPE_LABELS[payload.ticket_type] || "Ocorrência"}
 </span>
 <span className="text-[10px] text-muted-foreground font-mono">
 Chamado #{payload.ticket_id?.slice(0, 8)}
 </span>
 </div>
 </div>
 <Badge variant={statusInfo.variant} className="text-[10px] uppercase font-bold">
 {statusInfo.label}
 </Badge>
 </div>

 <div className="space-y-1">
 <p className="text-xs font-bold text-foreground">{payload.title}</p>
 <p className="text-xs text-muted-foreground leading-relaxed bg-muted/30 p-2.5 rounded-xl">
 "{payload.description}"
 </p>
 </div>

 {payload.photo_urls && payload.photo_urls.length > 0 && (
 <div className="space-y-1.5">
 <span className="text-[10px] font-semibold text-muted-foreground flex items-center gap-1">
 <ImageIcon className="size-3" />
 Evidências anexadas ({payload.photo_urls.length})
 </span>
 <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
 {payload.photo_urls.map((url, idx) => (
 <a
 key={idx}
 href={url}
 target="_blank"
 rel="noreferrer"
 className="size-14 shrink-0 rounded-xl overflow-hidden border border-border/80 hover:border-primary transition-colors group"
 >
 <img src={url} alt="Evidência" className="size-full object-cover group-hover:scale-105 transition-transform" />
 </a>
 ))}
 </div>
 </div>
 )}

 {payload.resolution_notes && (
 <div className="rounded-xl bg-primary/5 border border-primary/20 p-2.5 text-xs text-foreground">
 <span className="font-bold text-primary block text-[10px] uppercase">Parecer da Empresa:</span>
 {payload.resolution_notes}
 </div>
 )}

 {isStaff && onReviewTicket && (
 <div className="pt-2 border-t border-border/50 flex justify-end">
 <Button
 size="sm"
 onClick={onReviewTicket}
 className="h-8 text-xs font-bold rounded-xl"
 >
 Gerenciar Ocorrência
 </Button>
 </div>
 )}
 </div>
 );
};
