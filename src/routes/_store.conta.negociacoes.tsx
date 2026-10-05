import { createFileRoute, Link } from "@tanstack/react-router";
import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Handshake, Compass, MessageSquare, CheckCircle2, XCircle, Clock, ArrowRight, DollarSign, FileSignature, Loader2, Tag, Calendar, MapPin, ExternalLink, Users, Smartphone } from "lucide-react";
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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DigitalCompanionCard, type CompanionCardSectionItem, type CompanionRuleItem, type CompanionContactItem, type CompanionCardNiche } from "@/components/documents/digital-companion-card";
import { formatMoney } from "@/lib/money";
import { formatDate } from "@/lib/datetime";

import { FrostedCard, FrostedCardContent } from "@/components/ui/frosted-card";
import { NativeMobileHeader } from "@/components/navigation/native-mobile-header";

export const Route = createFileRoute("/_store/conta/negociacoes")({
  head: () => ({ meta: [{ title: "Minhas Negociações | Waesy" }] }),
  errorComponent: NegociacoesErrorComponent,
  component: NegociacoesPage,
});

function NegociacoesErrorComponent({ error, reset }: { error: any; reset: () => void }) {
  return (
    <div className="mx-auto max-w-2xl px-4 py-20 text-center space-y-4">
      <div className="inline-flex size-16 items-center justify-center rounded-lg bg-destructive/10 text-destructive mb-2">
        <XCircle className="size-8" />
      </div>
      <h2 className="text-2xl font-bold text-foreground">Instabilidade ao carregar negociações</h2>
      <p className="text-sm text-muted-foreground max-w-md mx-auto">
        {error?.message || "Não foi possível carregar o histórico de propostas e negociações."}
      </p>
      <div className="flex items-center justify-center gap-3">
        <Button onClick={reset} className="rounded-lg font-bold h-11">
          Tentar Novamente
        </Button>
        <Button asChild variant="outline" className="rounded-lg font-bold h-11">
          <Link to="/conta">Voltar para Conta</Link>
        </Button>
      </div>
    </div>
  );
}

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

// Tracker de E-commerce Nativo: Barras de Progresso Contínuas com Cor Primária (V117 Fase 3)
const DEAL_STEPS = [
  { key: "negotiating", label: "Proposta" },
  { key: "accepted", label: "Aceita" },
  { key: "confirmed", label: "Confirmada" },
  { key: "completed", label: "Concluída" },
];

function DealTimeline({ status }: { status: string }) {
  const activeIndex =
    status === "negotiating"
      ? 0
      : status === "accepted"
      ? 1
      : status === "confirmed"
      ? 2
      : status === "completed"
      ? 3
      : -1;
  if (activeIndex < 0) return null;

  return (
    <div
      className="w-full space-y-2 py-1"
      role="progressbar"
      aria-valuenow={activeIndex + 1}
      aria-valuemax={4}
    >
      <div className="grid grid-cols-4 gap-2 w-full">
        {DEAL_STEPS.map((step, i) => {
          const isReached = i <= activeIndex;
          const isCurrent = i === activeIndex;
          return (
            <div key={step.key} className="space-y-2">
              <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                <div
                  className={cn(
                    "h-full rounded-full transition-all duration-500",
                    isReached ? "w-full bg-primary" : "w-0 bg-transparent",
                    isCurrent && "animate-pulse"
                  )}
                />
              </div>
              <div className="flex items-center justify-between">
                <span
                  className={cn(
                    "text-[11px] font-semibold tracking-tight truncate",
                    isReached ? "text-foreground font-bold" : "text-muted-foreground/60"
                  )}
                >
                  {step.label}
                </span>
              </div>
            </div>
          );
        })}
      </div>
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
      {/* ── 1. Cabeçalho Universal (Apple HIG / ML-Style) ── */}
      <NativeMobileHeader
        fallbackHref="/conta"
        title="Negociações"
        centerTitle={true}
        badge={
          deals && deals.length > 0 ? (
            <Badge variant="secondary" className="text-xs font-mono font-bold px-2 py-1 rounded-full">
              {deals.length}
            </Badge>
          ) : null
        }
      />

      {/* ── 1.1 Desktop Inpage Header (Apple HIG) ── */}
      <div className="hidden md:flex items-center justify-between pb-4 border-b border-border/40">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold tracking-tight text-foreground">Minhas Negociações</h1>
          {deals && deals.length > 0 && (
            <Badge variant="secondary" className="text-xs font-mono font-bold px-2 py-1 rounded-full">
              {deals.length}
            </Badge>
          )}
        </div>
      </div>

      {/* ── 2. Toolbar: Abas Rápidas com Física Horizontal Snap ── */}
      <div className="flex items-center gap-2 overflow-x-auto snap-x snap-mandatory scrollbar-hide no-scrollbar py-1 px-4 sm:px-0 w-full">
        <button
          type="button"
          onClick={() => setActiveTab("all")}
          className={cn(
            "snap-start h-11 px-4 rounded-lg border text-xs sm:text-sm font-semibold whitespace-nowrap shrink-0 cursor-pointer shadow-2xs transition-all select-none active:scale-98",
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
            "snap-start h-11 px-4 rounded-lg border text-xs sm:text-sm font-semibold whitespace-nowrap shrink-0 cursor-pointer shadow-2xs transition-all select-none active:scale-98",
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
            "snap-start h-11 px-4 rounded-lg border text-xs sm:text-sm font-semibold whitespace-nowrap shrink-0 cursor-pointer shadow-2xs transition-all select-none active:scale-98",
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
            "snap-start h-11 px-4 rounded-lg border text-xs sm:text-sm font-semibold whitespace-nowrap shrink-0 cursor-pointer shadow-2xs transition-all select-none active:scale-98",
            activeTab === "bookings"
              ? "bg-foreground text-background border-foreground font-bold shadow-xs"
              : "bg-card text-muted-foreground hover:text-foreground border-border/70 hover:bg-muted/50"
          )}
        >
          Hospedagens e Diárias
        </button>
      </div>

      {/* ── 3. Lista de Negociações com <FrostedCard> (Valor Acordado, Condições e Ações) ── */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-2">
          <Loader2 className="size-5 animate-spin" />
          <p className="text-xs">Carregando negociações...</p>
        </div>
      ) : isError ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-center px-4">
          <p className="text-sm font-medium text-foreground">Não foi possível carregar as negociações</p>
          <p className="text-xs text-muted-foreground font-mono">{(error as any)?.message || "Erro desconhecido"}</p>
          <Button variant="outline" className="rounded-lg h-11 text-xs" onClick={() => window.location.reload()}>
            Tentar novamente
          </Button>
        </div>
      ) : filteredDeals.length > 0 ? (
        <div className="px-4 sm:px-0 space-y-4">
          {filteredDeals.map((deal: any) => {
            const status = STATUS_CONFIG[deal.status] || { label: deal.status, variant: "outline" };
            const isNegotiating = deal.status === "negotiating";
            const isAccepted = deal.status === "accepted";
            const isCountering = selectedDealId === deal.id;
            const isRental = deal.is_direct_booking || deal.deal_type === "rental" || deal.start_date;

            return (
              <div
                key={deal.id}
                className="rounded-lg p-4 sm:p-5 space-y-4 border border-border/60 bg-card shadow-2xs"
              >
                {/* BLOCO 1 (<FrostedCard>): VALOR ACORDADO & TIMELINE */}
                <FrostedCard intensity="standard" className="p-4 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
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
                        {deal.classified?.title || "Negociação Comercial"}
                      </h2>
                    </div>

                    <div className="sm:text-right">
                      <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider block">
                        {isRental ? "Total da Estadia" : "Valor Acordado"}
                      </span>
                      <span className="text-xl font-black text-primary font-mono">
                        {formatMoney(deal.total_price_cents || deal.proposed_price_cents)}
                      </span>
                    </div>
                  </div>

                  {["negotiating", "accepted", "confirmed", "completed"].includes(deal.status) && (
                    <DealTimeline status={deal.status} />
                  )}
                </FrostedCard>

                {/* BLOCO 2 (<FrostedCard>): CONDIÇÕES E PARTICIPANTES */}
                <FrostedCard intensity="subtle" className="p-4 space-y-3">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                    Condições Acordadas
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                    <div>
                      <span className="text-muted-foreground block text-[10px]">Comprador / Hóspede</span>
                      <span className="font-semibold text-foreground">{deal.buyer?.full_name || "Membro"}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-[10px]">Anunciante / Anfitrião</span>
                      <span className="font-semibold text-foreground">{deal.seller?.full_name || "Membro"}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-[10px]">
                        {isRental ? "Período e Diárias" : "Modalidade"}
                      </span>
                      <span className="font-semibold text-foreground">
                        {isRental && deal.start_date && deal.end_date
                          ? `${formatDate(deal.start_date).split(" ")[0]} até ${formatDate(deal.end_date).split(" ")[0]} (${deal.nights_count || 1} noites)`
                          : deal.installments_count > 1
                          ? `${deal.installments_count}x parcelas`
                          : "À vista"}
                      </span>
                    </div>
                  </div>

                  {deal.terms && (
                    <p className="text-xs text-foreground/80 bg-background/60 p-3 rounded-lg leading-relaxed border border-border/40">
                      <strong className="text-foreground">Termos:</strong> {deal.terms}
                    </p>
                  )}
                </FrostedCard>

                {/* BLOCO 3 (<FrostedCard>): AÇÕES DE NEGOCIAÇÃO */}
                {isNegotiating && !isCountering && (
                  <FrostedCard intensity="subtle" className="p-4 flex flex-wrap items-center gap-2">
                    {deal.seller_id === profile?.id ? (
                      <>
                        <Button
                          onClick={() => handleAction(deal.id, "accept")}
                          disabled={respondMutation.isPending}
                          className="min-h-11 h-11 px-4 rounded-lg text-xs font-bold gap-2 bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer"
                        >
                          <CheckCircle2 className="size-4" />
                          <span>Aceitar Proposta</span>
                        </Button>

                        <Button
                          variant="outline"
                          onClick={() => setSelectedDealId(deal.id)}
                          disabled={respondMutation.isPending}
                          className="h-11 px-4 rounded-lg text-xs font-semibold gap-2 cursor-pointer"
                        >
                          <DollarSign className="size-4 text-primary" />
                          <span>Fazer Contraproposta</span>
                        </Button>

                        <Button
                          variant="ghost"
                          onClick={() => handleAction(deal.id, "reject")}
                          disabled={respondMutation.isPending}
                          className="h-11 px-4 rounded-lg text-xs font-semibold text-destructive hover:bg-destructive/10 cursor-pointer"
                        >
                          <XCircle className="size-4" />
                          <span>Recusar</span>
                        </Button>
                      </>
                    ) : deal.buyer_id === profile?.id ? (
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs text-muted-foreground flex items-center gap-2">
                          <Clock className="size-3.5 text-amber-500" />
                          Proposta enviada ao anunciante. Aguardando resposta.
                        </span>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleAction(deal.id, "cancel")}
                          disabled={respondMutation.isPending}
                          className="rounded-lg text-xs font-semibold text-destructive hover:bg-destructive/10 cursor-pointer"
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
                        className="min-h-11 px-4 rounded-lg text-xs font-bold gap-2 bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer"
                      >
                        <CheckCircle2 className="size-3.5" />
                        <span>Aceitar Proposta</span>
                      </Button>
                    )}

                    <Button
                      asChild
                      size="sm"
                      variant="outline"
                      className="rounded-lg text-xs font-semibold gap-2 cursor-pointer ml-auto"
                    >
                      <Link to="/conta/conversas">
                        <MessageSquare className="size-3.5 text-primary" />
                        <span>Abrir Chat</span>
                      </Link>
                    </Button>
                  </FrostedCard>
                )}

                {/* Form de Contraproposta */}
                {isCountering && (
                  <div className="border border-primary/30 bg-primary/5 rounded-lg p-4 space-y-3">
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
                          className="h-9 rounded-lg text-xs bg-background"
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
                          className="h-9 rounded-lg text-xs bg-background"
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      <Button
                        size="sm"
                        onClick={() => handleAction(deal.id, "counter_proposal")}
                        disabled={respondMutation.isPending}
                        className="rounded-lg text-xs font-bold gap-2"
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
                        className="rounded-lg text-xs"
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
                  <div className="border border-emerald-500/30 bg-emerald-500/5 rounded-lg p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
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
                          className="rounded-lg text-xs font-bold shrink-0"
                        >
                          <Link to="/classificados/$id" params={{ id: deal.classified.id }}>
                            <Tag className="size-3.5 mr-2" />
                            <span>Ver Anúncio</span>
                          </Link>
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={generatingContractId === deal.id}
                          onClick={() => handleGenerateContract(deal.id)}
                          className="rounded-lg text-xs font-bold shrink-0 border-indigo-500/30 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-500/10 cursor-pointer shadow-2xs gap-2"
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
                          className="rounded-lg text-xs font-bold shrink-0 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 cursor-pointer shadow-2xs gap-2"
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
                            className="min-h-11 px-4 rounded-lg text-xs font-bold shrink-0 bg-primary text-primary-foreground hover:bg-primary/90 gap-2 cursor-pointer"
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
        <div className="border border-border/70 bg-card rounded-lg p-6 sm:p-12 text-center space-y-4 shadow-xs max-w-xl mx-auto w-full">
          <div className="size-12 rounded-lg bg-primary/10 text-primary flex items-center justify-center mx-auto">
            <Handshake className="size-6" />
          </div>
          <div className="space-y-1">
            <h2 className="text-base sm:text-lg font-bold text-foreground">Nenhuma negociação encontrada</h2>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              Quando você enviar uma proposta para um anúncio ou reservar uma hospedagem, elas aparecerão aqui.
            </p>
          </div>
          <Button asChild size="default" className="rounded-lg h-10 sm:h-11 px-6 text-xs sm:text-sm font-bold gap-2 mt-1 shadow-xs cursor-pointer">
            <Link to="/classificados">
              <Tag className="size-4" />
              <span>Explorar Classificados e Imóveis</span>
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
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-4 sm:p-6 rounded-lg bg-background border border-border shadow-2xl">
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
          title: "Horários de Entrada e Saída",
          description:
            "Respeite o horário padrão de check-in (a partir das 14h) e check-out (até 11h) acordados com o anfitrião.",
          badge: "Horários",
          highlight: true,
        },
        {
          title: "Normas de Convivência e Silêncio",
          description:
            "Respeite a lei do silêncio e o regulamento interno do condomínio/bairro a partir das 22h00.",
          badge: "Condomínio",
        },
        {
          title: "Chaves e Acesso",
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
