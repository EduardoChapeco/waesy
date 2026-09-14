import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
 Handshake,
 MessageSquare,
 CheckCircle2,
 XCircle,
 Clock,
 ArrowRight,
 DollarSign,
 FileSignature,
 Loader2,
 Tag,
 User,
 ShieldAlert,
 Calendar,
 MapPin,
 ExternalLink,
 Users,
} from "lucide-react";
import { toast } from "sonner";

import { getDealsByUser, respondToDealProposal } from "@/services/deals.functions";
import { DealDeliveryTrackingCard } from "@/components/commercial/deal-delivery-tracking-card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { CurrencyField } from "@/components/ui/currency-field";
import { formatMoney } from "@/lib/money";
import { formatDate } from "@/lib/datetime";

export const Route = createFileRoute("/_store/conta/negociacoes")({
 head: () => ({ meta: [{ title: "Minhas Negociações & Reservas | Waesy" }] }),
 component: NegociacoesPage,
});

const STATUS_CONFIG: Record<
 string,
 { label: string; variant: "default" | "secondary" | "outline" | "destructive" }
> = {
 negotiating: { label: "Em Negociação", variant: "secondary" },
 accepted: { label: "Aceita / Confirmada", variant: "default" },
 rejected: { label: "Recusada", variant: "destructive" },
 cancelled: { label: "Cancelada", variant: "outline" },
 completed: { label: "Concluída", variant: "default" },
};

function NegociacoesPage() {
 const queryClient = useQueryClient();
 const [selectedDealId, setSelectedDealId] = useState<string | null>(null);
 const [counterPriceCents, setCounterPriceCents] = useState<number | undefined>(undefined);
 const [counterMessage, setCounterMessage] = useState("");
 const [activeTab, setActiveTab] = useState<"all" | "bookings" | "deals">("all");

 const { data: deals, isLoading } = useQuery({
 queryKey: ["user-deals"],
 queryFn: () => getDealsByUser(),
 });

 const respondMutation = useMutation({
 mutationFn: respondToDealProposal,
 onSuccess: () => {
 queryClient.invalidateQueries({ queryKey: ["user-deals"] });
 toast.success("Resposta enviada com sucesso!");
 setSelectedDealId(null);
 setCounterPriceCents(undefined);
 setCounterMessage("");
 },
 onError: (err: any) => {
 toast.error(err?.message || "Erro ao responder proposta.");
 },
 });

 const handleAction = (dealId: string, action: "accept" | "reject" | "counter_proposal") => {
 if (action === "counter_proposal") {
 const counterCents = counterPriceCents;
 if (!counterCents || counterCents <= 0) {
 toast.error("Informe o valor da contraproposta.");
 return;
 }
 respondMutation.mutate({
 data: {
 dealId,
 action: "counter_proposal",
 counterPriceCents: counterCents,
 message: counterMessage.trim() || undefined,
 },
 });
 } else {
 respondMutation.mutate({
 data: {
 dealId,
 action,
 },
 });
 }
 };

 const filteredDeals = (deals || []).filter((deal: any) => {
 if (activeTab === "bookings") {
 return deal.is_direct_booking || deal.deal_type === "rental" || deal.start_date;
 }
 if (activeTab === "deals") {
 return !deal.is_direct_booking && deal.deal_type !== "rental" && !deal.start_date;
 }
 return true;
 });

  return (
    <div className="w-full max-w-5xl mx-auto space-y-4 sm:space-y-5 pb-24 px-0 sm:px-4 md:px-0">
      {/* ── 1. Top Header Limpo & Direto (Apple HIG) ── */}
      <div className="flex items-center justify-between gap-3 border-b border-border/40 pb-3 pt-1">
        <div className="flex items-center gap-2.5">
          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-foreground">
            Negociações
          </h1>
          {deals && deals.length > 0 && (
            <Badge variant="secondary" className="text-xs font-mono font-bold px-2 py-0.5 rounded-full">
              {deals.length}
            </Badge>
          )}
        </div>

        <Button
          asChild
          size="sm"
          variant="outline"
          className="rounded-xl h-9 px-3.5 text-xs font-semibold cursor-pointer hover:bg-muted"
        >
          <Link to="/classificados">Explorar Anúncios</Link>
        </Button>
      </div>

      {/* ── 2. Toolbar: Abas Rápidas em Trilho Horizontal sem Quebra (Anti-Wrapping & Anti-Overflow) ── */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 w-full">
        <button
          type="button"
          onClick={() => setActiveTab("all")}
          className={`h-9 px-3.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all shrink-0 cursor-pointer border ${
            activeTab === "all"
              ? "bg-foreground text-background border-foreground font-bold shadow-2xs"
              : "bg-card text-muted-foreground hover:text-foreground border-border/70 hover:border-border"
          }`}
        >
          Todas ({deals?.length || 0})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("bookings")}
          className={`h-9 px-3.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all shrink-0 cursor-pointer border ${
            activeTab === "bookings"
              ? "bg-foreground text-background border-foreground font-bold shadow-2xs"
              : "bg-card text-muted-foreground hover:text-foreground border-border/70 hover:border-border"
          }`}
        >
          Hospedagens & Diárias
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("deals")}
          className={`h-9 px-3.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all shrink-0 cursor-pointer border ${
            activeTab === "deals"
              ? "bg-foreground text-background border-foreground font-bold shadow-2xs"
              : "bg-card text-muted-foreground hover:text-foreground border-border/70 hover:border-border"
          }`}
        >
          Vendas & Propostas
        </button>
      </div>

 {/* ── Lista de Negociações ─────────────────────────────────── */}
 {isLoading ? (
 <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-2">
 <Loader2 className="size-6 animate-spin text-primary" />
 <p className="text-xs">Carregando negociações e reservas...</p>
 </div>
 ) : filteredDeals.length > 0 ? (
 <div className="space-y-4">
 {filteredDeals.map((deal: any) => {
 const status = STATUS_CONFIG[deal.status] || { label: deal.status, variant: "outline" };
 const isNegotiating = deal.status === "negotiating";
 const isAccepted = deal.status === "accepted";
 const isCountering = selectedDealId === deal.id;
 const isRental = deal.is_direct_booking || deal.deal_type === "rental" || deal.start_date;

 return (
 <div
 key={deal.id}
 className=" bg-card rounded-2xl p-5 space-y-4"
 >
 <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3">
 <div className="space-y-1">
 <div className="flex items-center gap-2">
 <Badge
 variant={status.variant}
 className="text-[10px] font-bold uppercase tracking-wider"
 >
 {status.label}
 </Badge>
 {deal.is_direct_booking && (
 <Badge variant="outline" className="text-[10px] uppercase font-bold text-primary border-primary/30">
 Reserva Direta
 </Badge>
 )}
 <span className="text-xs text-muted-foreground">
 {formatDate(deal.updated_at)}
 </span>
 </div>

 <h2 className="text-base font-bold text-foreground">
 {deal.classified?.title || "Negociação / Reserva"}
 </h2>
 </div>

 <div className="text-right sm:text-right">
 <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider block">
 {isRental ? "Total da Estadia" : "Valor Acordado"}
 </span>
 <span className="text-xl font-black text-primary font-mono">
 {formatMoney(deal.total_price_cents || deal.proposed_price_cents)}
 </span>
 </div>
 </div>

 {/* Detalhes da Reserva / Proposta */}
 <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs bg-muted/20 p-3.5 rounded-xl ">
 <div>
 <span className="text-muted-foreground block text-[10px]">Comprador / Hóspede</span>
 <span className="font-semibold">{deal.buyer?.full_name || "Membro"}</span>
 </div>
 <div>
 <span className="text-muted-foreground block text-[10px]">Anunciante / Anfitrião</span>
 <span className="font-semibold">{deal.seller?.full_name || "Membro"}</span>
 </div>
 <div>
 <span className="text-muted-foreground block text-[10px]">
 {isRental ? "Período & Diárias" : "Condições"}
 </span>
 <span className="font-semibold">
 {isRental && deal.start_date && deal.end_date
 ? `${formatDate(deal.start_date).split(" ")[0]} até ${formatDate(deal.end_date).split(" ")[0]} (${deal.nights_count || 1} noites)`
 : deal.installments_count > 1
 ? `${deal.installments_count}x parcelas`
 : "À vista"}
 </span>
 </div>
 </div>

 {/* Informações Extras de Locação por Temporada */}
 {isRental && (
 <div className="p-3 rounded-xl bg-background text-xs space-y-2">
 <div className="flex flex-wrap items-center justify-between gap-2">
 <div className="flex items-center gap-2 text-foreground font-semibold">
 <Calendar className="size-4 text-primary shrink-0" />
 <span>Check-in: {deal.start_date ? formatDate(deal.start_date).split(" ")[0] : "A definir"}</span>
 <span>•</span>
 <span>Check-out: {deal.end_date ? formatDate(deal.end_date).split(" ")[0] : "A definir"}</span>
 </div>
 {deal.guests_count && (
 <span className="flex items-center gap-1 text-muted-foreground font-medium">
 <Users className="size-3.5" />
 <span>{deal.guests_count} hóspede(s)</span>
 </span>
 )}
 </div>

 {isAccepted && deal.classified?.location_name && (
 <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
 <div className="flex items-center gap-1.5 text-foreground font-medium">
 <MapPin className="size-4 text-emerald-600 shrink-0" />
 <span>{deal.classified.location_name}</span>
 </div>
 <a
 href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(deal.classified.location_name)}`}
 target="_blank"
 rel="noreferrer"
 className="inline-flex items-center gap-1 text-xs text-primary font-bold hover:underline"
 >
 <span>Abrir no Google Maps</span>
 <ExternalLink className="size-3" />
 </a>
 </div>
 )}
 </div>
 )}

 {deal.terms && (
 <p className="text-xs text-foreground/80 bg-background p-3 rounded-xl leading-relaxed">
 <strong className="text-foreground">Termos:</strong> {deal.terms}
 </p>
 )}

 {/* Ações de Negociação */}
 {isNegotiating && !isCountering && (
 <div className="flex flex-wrap items-center gap-2 pt-1">
 <Button
 size="sm"
 onClick={() => handleAction(deal.id, "accept")}
 disabled={respondMutation.isPending}
 className="rounded-xl text-xs font-bold gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
 >
 <CheckCircle2 className="size-3.5" />
 <span>Aceitar Proposta</span>
 </Button>

 <Button
 size="sm"
 variant="outline"
 onClick={() => setSelectedDealId(deal.id)}
 disabled={respondMutation.isPending}
 className="rounded-xl text-xs font-semibold gap-1.5"
 >
 <DollarSign className="size-3.5 text-primary" />
 <span>Fazer Contraproposta</span>
 </Button>

 <Button
 size="sm"
 variant="ghost"
 onClick={() => handleAction(deal.id, "reject")}
 disabled={respondMutation.isPending}
 className="rounded-xl text-xs font-semibold text-destructive hover:bg-destructive/10"
 >
 <XCircle className="size-3.5" />
 <span>Recusar</span>
 </Button>
 </div>
 )}

 {/* Form de Contraproposta */}
 {isCountering && (
 <div className="border border-primary/30 bg-primary/5 rounded-xl p-4 space-y-3">
 <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">
 Enviar Contraproposta
 </h3>

 <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
 <div className="space-y-1">
 <label className="text-[11px] font-medium text-foreground">
 Novo Valor (R$)
 </label>
 <CurrencyField
 value={counterPriceCents}
 onChange={setCounterPriceCents}
 placeholder="0,00"
 className="h-9 rounded-xl text-xs bg-background"
 />
 </div>

 <div className="space-y-1">
 <label className="text-[11px] font-medium text-foreground">
 Mensagem / Justificativa
 </label>
 <Input
 value={counterMessage}
 onChange={(e) => setCounterMessage(e.target.value)}
 placeholder="Ex: Consigo fechar por esse valor com retirada hoje..."
 className="h-9 rounded-xl text-xs bg-background"
 />
 </div>
 </div>

 <div className="flex items-center gap-2 pt-1">
 <Button
 size="sm"
 onClick={() => handleAction(deal.id, "counter_proposal")}
 disabled={respondMutation.isPending}
 className="rounded-xl text-xs font-bold gap-1.5"
 >
 {respondMutation.isPending ? (
 <Loader2 className="size-3.5 animate-spin" />
 ) : (
 <ArrowRight className="size-3.5" />
 )}
 <span>Enviar Contraproposta</span>
 </Button>

 <Button
 size="sm"
 variant="ghost"
 onClick={() => setSelectedDealId(null)}
 className="rounded-xl text-xs"
 >
 Cancelar
 </Button>
 </div>
 </div>
 )}

 {/* Se houver despacho de entrega por motoboy ativo */}
 <DealDeliveryTrackingCard dealId={deal.id} />

 {/* Se a proposta foi aceita */}
 {isAccepted && (
 <div className="border border-emerald-500/30 bg-emerald-500/5 rounded-xl p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
 <div className="flex items-center gap-2">
 <CheckCircle2 className="size-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
 <div>
 <p className="text-xs font-bold text-foreground">
 {isRental ? "Reserva Ativa & Confirmada!" : "Negociação Concluída com Sucesso!"}
 </p>
 <p className="text-[11px] text-muted-foreground">
 {isRental
 ? "Os dados do imóvel e as datas estão registrados na sua agenda."
 : "O acordo foi formalizado entre as partes na plataforma Waesy."}
 </p>
 </div>
 </div>

 {deal.classified && (
 <Button
 asChild
 size="sm"
 variant="outline"
 className="rounded-xl text-xs font-bold shrink-0"
 >
 <Link to="/classificados/$id" params={{ id: deal.classified.id }}>
 <Tag className="size-3.5 mr-1.5" />
 <span>Ver Anúncio</span>
 </Link>
 </Button>
 )}
 </div>
 )}
 </div>
 );
 })}
 </div>
      ) : (
        <div className="border border-border/70 bg-card rounded-2xl p-6 sm:p-12 text-center space-y-3.5 shadow-xs max-w-xl mx-auto w-full">
          <div className="size-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto">
            <Handshake className="size-6" />
          </div>
          <div className="space-y-1">
            <h2 className="text-base sm:text-lg font-bold text-foreground">Nenhuma negociação encontrada</h2>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              Quando você enviar uma proposta para um anúncio ou reservar uma hospedagem, elas aparecerão aqui.
            </p>
          </div>
          <Button asChild size="default" className="rounded-xl h-10 sm:h-11 px-6 text-xs sm:text-sm font-bold gap-2 mt-1 shadow-xs cursor-pointer">
            <Link to="/classificados">
              <Tag className="size-4" />
              <span>Explorar Classificados & Imóveis</span>
            </Link>
          </Button>
        </div>
      )}
 </div>
 );
}
