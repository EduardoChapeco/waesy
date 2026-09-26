import { createFileRoute, Link } from "@tanstack/react-router";
import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Handshake,
  Compass,
  MessageSquare,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowRight,
  DollarSign,
  FileSignature,
  Loader2,
  Tag,
  Calendar,
  MapPin,
  ExternalLink,
  Users,
  Smartphone,
} from "lucide-react";
import { toast } from "sonner";

import { getDealsByUser, respondToDealProposal } from "@/services/deals.functions";
import { getProfile } from "@/services/auth.functions";
import { generateContractFromDeal } from "@/services/contracts.functions";
import { DealDeliveryTrackingCard } from "@/components/commercial/deal-delivery-tracking-card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { NativeBackButton } from "@/components/ui/native-back-button";
import { CurrencyField } from "@/components/ui/currency-field";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DigitalCompanionCard,
  type CompanionCardSectionItem,
  type CompanionRuleItem,
  type CompanionContactItem,
  type CompanionCardNiche,
} from "@/components/documents/digital-companion-card";
import { formatMoney } from "@/lib/money";
import { formatDate } from "@/lib/datetime";

export const Route = createFileRoute("/_store/conta/negociacoes")({
  head: () => ({ meta: [{ title: "Minhas Negociações | Waesy" }] }),
  component: NegociacoesPage,
});

const STATUS_CONFIG: Record<
  string,
  { label: string; variant: "default" | "secondary" | "outline" | "destructive" }
> = {
  negotiating: { label: "Em Negociação", variant: "secondary" },
  accepted: { label: "Confirmada", variant: "default" },
  rejected: { label: "Recusada", variant: "destructive" },
  cancelled: { label: "Cancelada", variant: "outline" },
  completed: { label: "Concluída", variant: "default" },
};

// Timeline de Progresso do Deal (Nielsen Norman: visibilidade do status do sistema)
const DEAL_STEPS = [
  { key: "negotiating", label: "Proposta" },
  { key: "accepted", label: "Aceita" },
  { key: "confirmed", label: "Paga" },
  { key: "completed", label: "Concluída" },
];

function DealTimeline({ status }: { status: string }) {
  const activeIndex = status === "negotiating" ? 0 : status === "accepted" ? 1 : status === "confirmed" ? 2 : status === "completed" ? 3 : -1;
  if (activeIndex < 0) return null;
  return (
    <div className="flex items-center gap-0 w-full py-1" role="progressbar" aria-valuenow={activeIndex} aria-valuemax={3}>
      {DEAL_STEPS.map((step, i) => {
        const isDone = i < activeIndex;
        const isActive = i === activeIndex;
        return (
          <React.Fragment key={step.key}>
            <div className="flex flex-col items-center gap-1 shrink-0">
              <div className={`size-5 rounded-full flex items-center justify-center border-2 transition-all ${
                isDone ? "bg-emerald-500 border-emerald-500 text-white" :
                isActive ? "bg-primary border-primary text-primary-foreground" :
                "bg-muted border-border"
              }`}>
                {isDone ? (
                  <CheckCircle2 className="size-3" />
                ) : (
                  <span className="text-[9px] font-bold">{i + 1}</span>
                )}
              </div>
              <span className={`text-[9px] font-semibold whitespace-nowrap ${
                isDone || isActive ? "text-foreground" : "text-muted-foreground/60"
              }`}>{step.label}</span>
            </div>
            {i < DEAL_STEPS.length - 1 && (
              <div className={`flex-1 h-0.5 mx-1 mb-3.5 rounded-full transition-all ${
                isDone ? "bg-emerald-500" : "bg-border/50"
              }`} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

function NegociacoesPage() {
  const queryClient = useQueryClient();
  const [selectedDealId, setSelectedDealId] = useState<string | null>(null);
  const [counterPriceCents, setCounterPriceCents] = useState<number | undefined>(undefined);
  const [counterMessage, setCounterMessage] = useState("");
  const [activeTab, setActiveTab] = useState<"all" | "purchases" | "sales" | "bookings">("all");
  const [generatingContractId, setGeneratingContractId] = useState<string | null>(null);
  const [selectedCompanionDeal, setSelectedCompanionDeal] = useState<any | null>(null);

  const { data: profile } = useQuery({
    queryKey: ["current-user-profile"],
    queryFn: () => getProfile(),
    retry: 0,
  });

  const { data: deals, isLoading, isError, error } = useQuery({
    queryKey: ["user-deals"],
    queryFn: () => getDealsByUser(),
    retry: 0,
    staleTime: 30_000,
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

  const handleAction = (dealId: string, action: "accept" | "reject" | "counter_proposal" | "complete" | "cancel") => {
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

  const handleGenerateContract = async (dealId: string) => {
    try {
      setGeneratingContractId(dealId);
      const res: any = await generateContractFromDeal({ data: { dealId } });
      if (res?.signingUrl || res?.signUrl || res?.contract) {
        toast.success("Contrato gerado com sucesso!");
        const targetUrl = res.signingUrl || res.signUrl;
        if (targetUrl) {
          window.open(targetUrl, "_blank");
        }
      }
    } catch (err: any) {
      toast.error(err?.message || "Erro ao gerar contrato digital.");
    } finally {
      setGeneratingContractId(null);
    }
  };

  const filteredDeals = (deals || []).filter((deal: any) => {
    if (activeTab === "purchases") {
      return deal.buyer_id === profile?.id;
    }
    if (activeTab === "sales") {
      return deal.seller_id === profile?.id;
    }
    if (activeTab === "bookings") {
      return deal.is_direct_booking || deal.deal_type === "rental" || deal.start_date;
    }
    return true;
  });

  return (
    <div className="w-full max-w-5xl mx-auto space-y-4 sm:space-y-5 pb-24 px-0 sm:px-4 md:px-0">
      {/* ── 1. Top Header Limpo & Direto (Apple HIG) ── */}
      <div className="flex items-center justify-between gap-3 border-b border-border/40 pb-3 pt-1">
        <div className="flex items-center gap-2.5">
          <NativeBackButton fallbackHref="/conta" />
          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-foreground">
            Negociações
          </h1>
          {deals && deals.length > 0 && (
            <Badge variant="secondary" className="text-xs font-mono font-bold px-2 py-0.5 rounded-full">
              {deals.length}
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button
            asChild
            size="sm"
            variant="default"
            className="rounded-xl h-9 px-3 text-xs font-bold gap-1.5 cursor-pointer bg-primary text-primary-foreground shadow-xs"
          >
            <Link to="/conta/viagens">
              <Compass className="size-3.5" />
              <span>Minhas Viagens</span>
            </Link>
          </Button>
          <Button
            asChild
            size="sm"
            variant="outline"
            className="rounded-xl h-9 px-3.5 text-xs font-semibold cursor-pointer hover:bg-muted"
          >
            <Link to="/classificados">Explorar Anúncios</Link>
          </Button>
        </div>
      </div>

      {/* ── 2. Toolbar: Abas Rápidas em Trilho Horizontal (Padrão Botão Grande) ── */}
      <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar py-1 w-full">
        <button
          type="button"
          onClick={() => setActiveTab("all")}
          className={cn(
            "h-10 sm:h-11 px-3.5 sm:px-4 rounded-xl border text-xs sm:text-sm font-semibold whitespace-nowrap shrink-0 cursor-pointer shadow-2xs transition-all select-none active:scale-98",
            activeTab === "all"
              ? "bg-foreground text-background border-foreground font-bold shadow-xs"
              : "bg-card text-muted-foreground hover:text-foreground border-border/70 hover:bg-muted/50"
          )}
        >
          Todas ({deals?.length || 0})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("purchases")}
          className={cn(
            "h-10 sm:h-11 px-3.5 sm:px-4 rounded-xl border text-xs sm:text-sm font-semibold whitespace-nowrap shrink-0 cursor-pointer shadow-2xs transition-all select-none active:scale-98",
            activeTab === "purchases"
              ? "bg-foreground text-background border-foreground font-bold shadow-xs"
              : "bg-card text-muted-foreground hover:text-foreground border-border/70 hover:bg-muted/50"
          )}
        >
          Minhas Compras ({deals?.filter((d: any) => d.buyer_id === profile?.id).length || 0})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("sales")}
          className={cn(
            "h-10 sm:h-11 px-3.5 sm:px-4 rounded-xl border text-xs sm:text-sm font-semibold whitespace-nowrap shrink-0 cursor-pointer shadow-2xs transition-all select-none active:scale-98",
            activeTab === "sales"
              ? "bg-foreground text-background border-foreground font-bold shadow-xs"
              : "bg-card text-muted-foreground hover:text-foreground border-border/70 hover:bg-muted/50"
          )}
        >
          Meus Anúncios ({deals?.filter((d: any) => d.seller_id === profile?.id).length || 0})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("bookings")}
          className={cn(
            "h-10 sm:h-11 px-3.5 sm:px-4 rounded-xl border text-xs sm:text-sm font-semibold whitespace-nowrap shrink-0 cursor-pointer shadow-2xs transition-all select-none active:scale-98",
            activeTab === "bookings"
              ? "bg-foreground text-background border-foreground font-bold shadow-xs"
              : "bg-card text-muted-foreground hover:text-foreground border-border/70 hover:bg-muted/50"
          )}
        >
          Hospedagens & Diárias
        </button>
      </div>

      {/* ── Lista de Negociações ── */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-2">
          <Loader2 className="size-5 animate-spin" />
          <p className="text-xs">Carregando...</p>
        </div>
      ) : isError ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
          <p className="text-sm font-medium text-foreground">Não foi possível carregar as negociações</p>
          <p className="text-xs text-muted-foreground font-mono">{(error as any)?.message || "Erro desconhecido"}</p>
          <Button variant="outline" size="sm" className="rounded-xl h-9 text-xs" onClick={() => window.location.reload()}>Tentar novamente</Button>
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
                className="bg-card rounded-2xl p-5 space-y-4 border border-border/60"
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

                {/* Timeline de Progresso do Deal */}
                {["negotiating", "accepted", "confirmed", "completed"].includes(deal.status) && (
                  <div className="px-0.5">
                    <DealTimeline status={deal.status} />
                  </div>
                )}

                {/* Detalhes da Reserva / Proposta */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs bg-muted/20 p-3.5 rounded-xl">
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
                  <div className="p-3 rounded-xl bg-background text-xs space-y-2 border border-border/40">
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
                      <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-t border-border/40">
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
                  <p className="text-xs text-foreground/80 bg-background p-3 rounded-xl leading-relaxed border border-border/40">
                    <strong className="text-foreground">Termos:</strong> {deal.terms}
                  </p>
                )}

                {/* Ações de Negociação */}
                {isNegotiating && !isCountering && (
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    {deal.seller_id === profile?.id ? (
                      <>
                        <Button
                          size="sm"
                          onClick={() => handleAction(deal.id, "accept")}
                          disabled={respondMutation.isPending}
                          className="rounded-xl text-xs font-bold gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer"
                        >
                          <CheckCircle2 className="size-3.5" />
                          <span>Aceitar Proposta</span>
                        </Button>

                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setSelectedDealId(deal.id)}
                          disabled={respondMutation.isPending}
                          className="rounded-xl text-xs font-semibold gap-1.5 cursor-pointer"
                        >
                          <DollarSign className="size-3.5 text-primary" />
                          <span>Fazer Contraproposta</span>
                        </Button>

                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleAction(deal.id, "reject")}
                          disabled={respondMutation.isPending}
                          className="rounded-xl text-xs font-semibold text-destructive hover:bg-destructive/10 cursor-pointer"
                        >
                          <XCircle className="size-3.5" />
                          <span>Recusar</span>
                        </Button>
                      </>
                    ) : deal.buyer_id === profile?.id ? (
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                          <Clock className="size-3.5 text-amber-500" />
                          Proposta enviada ao anunciante. Aguardando resposta.
                        </span>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleAction(deal.id, "cancel")}
                          disabled={respondMutation.isPending}
                          className="rounded-xl text-xs font-semibold text-destructive hover:bg-destructive/10 cursor-pointer"
                        >
                          <XCircle className="size-3.5" />
                          <span>Cancelar Proposta</span>
                        </Button>
                      </div>
                    ) : (
                      <Button
                        size="sm"
                        onClick={() => handleAction(deal.id, "accept")}
                        disabled={respondMutation.isPending}
                        className="rounded-xl text-xs font-bold gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer"
                      >
                        <CheckCircle2 className="size-3.5" />
                        <span>Aceitar Proposta</span>
                      </Button>
                    )}

                    <Button
                      asChild
                      size="sm"
                      variant="outline"
                      className="rounded-xl text-xs font-semibold gap-1.5 cursor-pointer ml-auto"
                    >
                      <Link to="/conta/conversas">
                        <MessageSquare className="size-3.5 text-primary" />
                        <span>Abrir Chat</span>
                      </Link>
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
                      <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
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
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={generatingContractId === deal.id}
                          onClick={() => handleGenerateContract(deal.id)}
                          className="rounded-xl text-xs font-bold shrink-0 border-indigo-500/30 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-500/10 cursor-pointer shadow-2xs gap-1.5"
                        >
                          {generatingContractId === deal.id ? (
                            <Loader2 className="size-3.5 animate-spin" />
                          ) : (
                            <FileSignature className="size-3.5" />
                          )}
                          <span>
                            {generatingContractId === deal.id
                              ? "Gerando..."
                              : isRental
                              ? "Gerar Contrato de Locação"
                              : "Gerar Contrato Digital"}
                          </span>
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => setSelectedCompanionDeal(deal)}
                          className="rounded-xl text-xs font-bold shrink-0 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 cursor-pointer shadow-2xs gap-1.5"
                          title="Visualizar Guia Digital 9:16"
                        >
                          <Smartphone className="size-3.5" />
                          <span>{isRental ? "Guia do Imóvel 9:16" : "Cartão 9:16"}</span>
                        </Button>
                        {!isRental && deal.status === "accepted" && (
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => handleAction(deal.id, "complete")}
                            disabled={respondMutation.isPending}
                            className="rounded-xl text-xs font-bold shrink-0 bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 cursor-pointer"
                            title="Confirmar que o item foi recebido e liberar o pagamento para o vendedor"
                          >
                            <CheckCircle2 className="size-3.5" />
                            <span>Confirmar Recebimento</span>
                          </Button>
                        )}
                      </div>
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

      {/* ── MODAL DIGITAL COMPANION CARD 9:16 (GUIA DO IMÓVEL / WHATSAPP) ── */}
      <Dialog
        open={Boolean(selectedCompanionDeal)}
        onOpenChange={(open) => {
          if (!open) setSelectedCompanionDeal(null);
        }}
      >
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-4 sm:p-6 rounded-3xl bg-background border border-border shadow-2xl">
          <DialogHeader className="sr-only">
            <DialogTitle>Guia Digital de Acompanhamento</DialogTitle>
          </DialogHeader>
          {selectedCompanionDeal && (
            <div className="w-full">
              <DigitalCompanionCard {...getDealCompanionData(selectedCompanionDeal)} />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function getDealCompanionData(deal: any) {
  const isRental = deal.is_direct_booking || deal.deal_type === "rental" || deal.start_date;
  const niche: CompanionCardNiche = isRental ? "real_estate" : "retail";

  const title = deal.classified?.title || (isRental ? "Reserva de Imóvel" : "Comprovante de Negociação");
  const subtitle = isRental
    ? deal.start_date && deal.end_date
      ? `${formatDate(deal.start_date).split(" ")[0]} até ${formatDate(deal.end_date).split(" ")[0]} (${deal.nights_count || 1} noites)`
      : "Estadia / Temporada"
    : `Total: ${formatMoney(deal.total_price_cents || deal.proposed_price_cents)}`;

  const sections: CompanionCardSectionItem[] = [];

  if (isRental) {
    sections.push({
      type: "hotel",
      badge: "Hospedagem Confirmada",
      title: deal.classified?.title || "Imóvel / Temporada",
      subtitle: deal.classified?.location_name || "Endereço do Imóvel",
      details: [
        {
          label: "Check-in",
          value: deal.start_date ? formatDate(deal.start_date).split(" ")[0] : "A combinar",
          highlight: true,
        },
        {
          label: "Check-out",
          value: deal.end_date ? formatDate(deal.end_date).split(" ")[0] : "A combinar",
        },
        {
          label: "Hóspedes",
          value: deal.guests_count ? `${deal.guests_count} pessoas` : "Conforme reserva",
        },
        {
          label: "Valor Total",
          value: formatMoney(deal.total_price_cents || deal.proposed_price_cents),
        },
      ],
    });
  } else {
    sections.push({
      type: "custom",
      badge: "Acordo Comercial",
      title: deal.classified?.title || "Item Negociado",
      subtitle: `Valor: ${formatMoney(deal.total_price_cents || deal.proposed_price_cents)}`,
      details: [
        { label: "Comprador", value: deal.buyer?.full_name || "Comprador", highlight: true },
        { label: "Vendedor", value: deal.seller?.full_name || "Vendedor" },
        {
          label: "Condições",
          value: deal.installments_count > 1 ? `${deal.installments_count}x parcelas` : "Pagamento à vista",
        },
      ],
    });
  }

  const rules: CompanionRuleItem[] = isRental
    ? [
        {
          title: "Horários de Entrada & Saída",
          description:
            "Respeite o horário padrão de check-in (a partir das 14h) e check-out (até 11h) acordados com o anfitrião.",
          badge: "Horários",
          highlight: true,
        },
        {
          title: "Normas de Convivência & Silêncio",
          description:
            "Respeite a lei do silêncio e o regulamento interno do condomínio/bairro a partir das 22h00.",
          badge: "Condomínio",
        },
        {
          title: "Chaves & Acesso",
          description:
            "Combine previamente com o anfitrião a entrega das chaves físicas ou senha da fechadura eletrônica.",
          badge: "Chaves",
        },
      ]
    : [
        {
          title: "Garantia e Conferência",
          description:
            "Confira o estado do produto ou prestação do serviço no momento da entrega ou retirada acordada.",
          badge: "Conferência",
          highlight: true,
        },
      ];

  const emergencyContacts: CompanionContactItem[] = [
    ...(deal.seller?.full_name
      ? [
          {
            name: deal.seller.full_name,
            category: isRental ? "Anfitrião do Imóvel" : "Vendedor / Anunciante",
            phone: deal.seller.phone || "",
            whatsapp: true,
            is24h: false,
          },
        ]
      : []),
    {
      name: "Central de Apoio Waesy",
      category: "Suporte da Plataforma",
      phone: "0800 000 0000",
      whatsapp: true,
      is24h: true,
    },
  ];

  return {
    niche,
    title,
    subtitle,
    code: `NEG-${deal.id.slice(0, 8).toUpperCase()}`,
    companyName: isRental ? deal.seller?.full_name || "Anfitrião" : "Waesy Negócios",
    participantsLabel: isRental ? "Hóspedes" : "Partes",
    participants: [deal.buyer?.full_name, deal.seller?.full_name].filter(Boolean),
    sections,
    rules,
    emergencyContacts,
    observations: deal.terms || undefined,
  };
}
