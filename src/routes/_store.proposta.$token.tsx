import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useMutation } from "@tanstack/react-query";
import {
  Download,
  Share2,
  CheckCircle,
  MessageCircle,
  ShieldCheck,
  MapPin,
  Clock,
  Sparkles,
  Bot,
  Send,
  Loader2,
  ArrowRight,
  Info,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { toast } from "sonner";
import {
  getPublicTravelProposalByToken,
  approveTravelProposal,
  askProposalSalesAdvisorAI,
  type TravelProposalDTO,
  type TravelProposalOptionDTO,
} from "@/services/travel-proposal.functions";
import { ProposalCanvasRenderer } from "@/components/tourism/studio/proposal-canvas-renderer";
import { TravelProposalCheckoutModal } from "@/components/tourism/studio/travel-proposal-checkout-modal";
import { exportElementAsPdf } from "@/lib/pdf-export";
import { formatMoney } from "@/lib/money";

export const Route = createFileRoute("/_store/proposta/$token")({
  head: ({ loaderData }: { loaderData?: { proposal: TravelProposalDTO | null } }) => ({
    meta: [
      {
        title: loaderData?.proposal
          ? `Proposta de Viagem: ${loaderData.proposal.destination_city} — Waesy`
          : "Proposta de Viagem — Waesy",
      },
      {
        name: "description",
        content: "Visualize seu roteiro exclusivo, malha aérea, hospedagem e condições especiais de viagem.",
      },
    ],
  }),
  loader: async ({ params }) => {
    try {
      const proposal = await getPublicTravelProposalByToken({ data: { token: params.token } });
      return { proposal };
    } catch (err) {
      console.error("[loader:_store.proposta.$token] Unhandled loader error:", err);
      return { proposal: null };
    }
  },
  component: PublicTravelProposalPage,
});

function PublicTravelProposalPage() {
  const { proposal } = ((Route.useLoaderData?.() as any) || {});
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [isApproved, setIsApproved] = useState(proposal?.status === "approved");
  const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false);
  const [selectedOptionIndex, setSelectedOptionIndex] = useState(0);

  // ── AI Sales Advisor (SDR) States ──
  const [isAdvisorOpen, setIsAdvisorOpen] = useState(false);
  const [advisorInput, setAdvisorInput] = useState("");
  const [messages, setMessages] = useState<Array<{ role: "user" | "assistant"; content: string }>>([
    {
      role: "assistant",
      content: `Olá! Sou o Consultor de Viagens Inteligente da **${proposal?.agency_name || "sua agência"}**. Estou aqui para esclarecer qualquer detalhe dos voos, hotéis, passeios e ajudá-lo a escolher a melhor opção para ${proposal?.destination_city || "sua viagem"}. Como posso te ajudar hoje?`,
    },
  ]);

  const options: TravelProposalOptionDTO[] = useMemo(() => {
    return Array.isArray(proposal?.options) && proposal.options.length > 0 ? proposal.options : [];
  }, [proposal?.options]);

  const effectiveProposal = useMemo(() => {
    if (!proposal) return null;
    if (options.length === 0) return proposal;

    const currentOpt = options[selectedOptionIndex] || options[0];
    if (!currentOpt) return proposal;

    return {
      ...proposal,
      flights: currentOpt.flights && currentOpt.flights.length > 0 ? currentOpt.flights : proposal.flights,
      hotels: currentOpt.hotels && currentOpt.hotels.length > 0 ? currentOpt.hotels : proposal.hotels,
      itinerary: currentOpt.itinerary && currentOpt.itinerary.length > 0 ? currentOpt.itinerary : proposal.itinerary,
      includes: currentOpt.includes && currentOpt.includes.length > 0 ? currentOpt.includes : proposal.includes,
      excludes: currentOpt.excludes && currentOpt.excludes.length > 0 ? currentOpt.excludes : proposal.excludes,
      pricing: currentOpt.pricing || proposal.pricing,
    };
  }, [proposal, options, selectedOptionIndex]);

  const approveMutation = useMutation({
    mutationFn: () => approveTravelProposal({ data: { token: proposal!.public_token } }),
    onSuccess: (res) => {
      setIsApproved(true);
      toast.success(res.message);
    },
    onError: (err: any) => toast.error(err?.message || "Erro ao aprovar proposta."),
  });

  const advisorMutation = useMutation({
    mutationFn: (question: string) =>
      askProposalSalesAdvisorAI({
        data: {
          token: proposal!.public_token,
          question,
          currentOptionId: options[selectedOptionIndex]?.id,
          conversationHistory: messages.map((m) => ({ role: m.role, content: m.content })),
        },
      }),
    onSuccess: (res) => {
      setMessages((prev) => [...prev, { role: "assistant", content: res.reply }]);
    },
    onError: (err: any) => {
      toast.error("O consultor IA não conseguiu responder no momento. Tente novamente.");
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Tive uma instabilidade rápida de conexão com o servidor. Você também pode tirar dúvidas diretamente com o agente humano no WhatsApp!",
        },
      ]);
    },
  });

  const handleSendMessage = (textToSend?: string) => {
    const text = (textToSend || advisorInput).trim();
    if (!text || advisorMutation.isPending) return;

    setMessages((prev) => [...prev, { role: "user", content: text }]);
    setAdvisorInput("");
    advisorMutation.mutate(text);
  };

  if (!proposal || !effectiveProposal) {
    return (
      <div className="max-w-md mx-auto py-20 px-4 text-center space-y-4">
        <h2 className="text-lg font-bold text-foreground">Proposta não encontrada</h2>
        <p className="text-xs text-muted-foreground">
          Esta proposta pode ter expirado ou o link informado está incorreto.
        </p>
        <Button asChild size="sm" variant="outline" className="rounded-xl">
          <Link to="/turismo">Explorar Outros Destinos</Link>
        </Button>
      </div>
    );
  }

  const handleExportPdf = async () => {
    try {
      setIsExportingPdf(true);
      await exportElementAsPdf("public-proposal-canvas", `${proposal.title.replace(/\s+/g, "_")}.pdf`);
      toast.success("PDF da proposta baixado com sucesso!");
    } catch (err: any) {
      toast.error(err?.message || "Erro ao gerar PDF.");
    } finally {
      setIsExportingPdf(false);
    }
  };

  const cleanWhatsapp = (proposal.agency_whatsapp || "").replace(/\D/g, "");
  const waConfirmMessage = encodeURIComponent(
    `Olá! Gostei muito da proposta #${proposal.public_token} para ${proposal.destination_city} e gostaria de prosseguir com a reserva e emissão dos vouchers!`
  );

  const activeOption = options[selectedOptionIndex] || null;

  return (
    <div className="max-w-5xl mx-auto py-4 sm:py-6 px-2 sm:px-4 space-y-4 sm:space-y-6 pb-28 sm:pb-8 animate-in fade-in duration-200">
      
      {/* ── 1. HEADER TABS MULTI-OPÇÃO (QUANDO EXISTIREM 2+ COTAÇÕES) ── */}
      {options.length > 1 && (
        <div className="bg-card/90 backdrop-blur-md border border-border/80 rounded-2xl p-2.5 shadow-sm">
          <div className="flex items-center justify-between gap-2 mb-2 px-1">
            <span className="text-[11px] font-bold tracking-tight text-foreground uppercase flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              Opções de Cotação Preparadas para Você ({options.length})
            </span>
            <span className="text-[11px] text-muted-foreground">Toque para alternar</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
            {options.map((opt, idx) => {
              const isSelected = selectedOptionIndex === idx;
              const optPrice = opt.pricing?.total_price_cents || 0;
              const installmentsCount = opt.pricing?.installments_options?.[1]?.installments_count || 10;
              const installmentVal = opt.pricing?.installments_options?.[1]?.installment_value_cents || (optPrice > 0 ? Math.round(optPrice / installmentsCount) : 0);

              return (
                <button
                  key={opt.id || idx}
                  type="button"
                  onClick={() => setSelectedOptionIndex(idx)}
                  className={`relative text-left p-3 rounded-xl border transition-all duration-150 cursor-pointer ${
                    isSelected
                      ? "border-emerald-600 bg-emerald-500/10 shadow-sm"
                      : "border-border/60 bg-background hover:bg-muted/40"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-xs font-bold text-foreground line-clamp-1">{opt.name || `Opção ${idx + 1}`}</span>
                    {opt.is_recommended && (
                      <Badge className="bg-amber-500 text-white text-[9px] px-1.5 py-0 shrink-0 font-bold">
                        Recomendada
                      </Badge>
                    )}
                    {opt.badge && !opt.is_recommended && (
                      <Badge variant="outline" className="text-[9px] px-1.5 py-0 shrink-0 font-medium">
                        {opt.badge}
                      </Badge>
                    )}
                  </div>

                  <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">
                    {opt.hotel_name || opt.hotels?.[0]?.hotel_name || "Hospedagem Selecionada"}
                  </p>

                  <div className="mt-2 flex items-baseline justify-between">
                    <span className="text-xs font-bold text-foreground">{formatMoney(optPrice)}</span>
                    <span className="text-[10px] text-muted-foreground">
                      {installmentsCount}x {formatMoney(installmentVal)}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ── 2. BARRA DE AÇÕES PRINCIPAL (DESKTOP E TABLET) ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-card border border-border/80 sticky top-4 z-20 shadow-md">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <span className="text-xs sm:text-sm font-bold text-foreground truncate">
              {activeOption ? `${activeOption.name} · ${proposal.destination_city}` : proposal.title}
            </span>
            {isApproved ? (
              <Badge className="bg-emerald-600 text-white text-[10px] font-bold">
                ✓ Aprovada
              </Badge>
            ) : (
              <Badge variant="outline" className="text-[10px] font-mono font-bold">
                Aguardando Decisão
              </Badge>
            )}
          </div>
          <p className="text-[11px] text-muted-foreground">
            Consultoria por: <span className="font-bold text-foreground">{proposal.agency_name}</span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Botão do Consultor IA (SDR) */}
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => setIsAdvisorOpen(true)}
            className="rounded-xl text-xs font-bold gap-1.5 h-10 border-amber-500/40 text-amber-700 bg-amber-50/50 hover:bg-amber-100/60 dark:bg-amber-950/20 dark:text-amber-300 cursor-pointer shadow-sm"
          >
            <Sparkles className="size-3.5 text-amber-600 dark:text-amber-400" />
            <span>Consultor IA</span>
          </Button>

          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={isExportingPdf}
            onClick={handleExportPdf}
            className="rounded-xl text-xs font-bold gap-1.5 h-10 cursor-pointer"
          >
            <Download className="size-3.5" />
            <span>{isExportingPdf ? "Gerando..." : "Baixar PDF"}</span>
          </Button>

          {cleanWhatsapp && (
            <Button
              asChild
              size="sm"
              variant="outline"
              className="rounded-xl text-xs font-bold gap-1.5 h-10 border-emerald-500/40 text-emerald-700 hover:bg-emerald-50 dark:text-emerald-400 cursor-pointer"
            >
              <a
                href={`https://wa.me/55${cleanWhatsapp}?text=${waConfirmMessage}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <MessageCircle className="size-4 text-emerald-600" />
                <span>WhatsApp</span>
              </a>
            </Button>
          )}

          {/* Botão de Reserva e Confirmação */}
          <Button
            type="button"
            size="sm"
            onClick={() => setIsCheckoutModalOpen(true)}
            className="rounded-xl text-xs font-bold gap-1.5 h-10 px-4 bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm cursor-pointer"
          >
            <ShieldCheck className="size-4" />
            <span>{isApproved ? "Concluir Reserva" : "Escolher & Reservar"}</span>
          </Button>
        </div>
      </div>

      {/* ── 3. RENDERIZAÇÃO DA LÂMINA EDITORIAL DA PROPOSTA ── */}
      <div id="public-proposal-canvas" className="rounded-2xl border border-border/80 shadow-lg overflow-hidden bg-white">
        <ProposalCanvasRenderer proposal={effectiveProposal} />
      </div>

      {/* ── 4. BARRA FIXA MOBILE (Thumb Zone Ergonomics - Regra 12) ── */}
      <div className="sm:hidden fixed bottom-0 left-0 right-0 p-2.5 bg-background/95 backdrop-blur-md border-t border-border/70 z-30 flex items-center gap-2 shadow-lg">
        <Button
          type="button"
          variant="outline"
          onClick={() => setIsAdvisorOpen(true)}
          className="h-11 px-3 rounded-xl text-xs font-bold shrink-0 border-amber-500/40 text-amber-700 bg-amber-50/50 cursor-pointer"
        >
          <Sparkles className="size-4 text-amber-600 mr-1" />
          <span>IA</span>
        </Button>

        {cleanWhatsapp && (
          <Button
            asChild
            variant="outline"
            size="icon"
            className="h-11 w-11 rounded-xl shrink-0 border-emerald-500/40 text-emerald-700 cursor-pointer"
          >
            <a
              href={`https://wa.me/55${cleanWhatsapp}?text=${waConfirmMessage}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <MessageCircle className="size-5 text-emerald-600" />
            </a>
          </Button>
        )}

        <Button
          type="button"
          onClick={() => setIsCheckoutModalOpen(true)}
          className="flex-1 h-11 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-md cursor-pointer"
        >
          <ShieldCheck className="size-4 mr-1.5" />
          <span>{isApproved ? "Concluir Reserva" : "Escolher Opção"}</span>
        </Button>
      </div>

      {/* ── 5. SHEET DO CONSULTOR DE VENDAS / SDR DE IA ── */}
      <Sheet open={isAdvisorOpen} onOpenChange={setIsAdvisorOpen}>
        <SheetContent side="right" className="w-full sm:max-w-md p-0 flex flex-col h-full bg-background">
          <SheetHeader className="p-4 border-b border-border/60 shrink-0 bg-muted/20">
            <div className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-600">
                <Sparkles className="size-5" />
              </div>
              <div>
                <SheetTitle className="text-sm font-bold text-foreground">Consultor de Viagens IA</SheetTitle>
                <SheetDescription className="text-[11px] text-muted-foreground">
                  Especialista da {proposal.agency_name} para {proposal.destination_city}
                </SheetDescription>
              </div>
            </div>
          </SheetHeader>

          {/* Chat Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.map((m, idx) => (
              <div
                key={idx}
                className={`flex gap-2.5 ${m.role === "user" ? "justify-end" : "justify-start"}`}
              >
                {m.role === "assistant" && (
                  <div className="h-7 w-7 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0 text-amber-600 mt-0.5">
                    <Bot className="size-4" />
                  </div>
                )}
                <div
                  className={`p-3 rounded-2xl text-xs leading-relaxed max-w-[85%] ${
                    m.role === "user"
                      ? "bg-foreground text-background font-medium rounded-tr-sm"
                      : "bg-muted/50 border border-border/60 text-foreground rounded-tl-sm space-y-1.5"
                  }`}
                >
                  <p className="whitespace-pre-wrap">{m.content}</p>
                </div>
              </div>
            ))}

            {advisorMutation.isPending && (
              <div className="flex gap-2.5 justify-start">
                <div className="h-7 w-7 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0 text-amber-600">
                  <Loader2 className="size-4 animate-spin" />
                </div>
                <div className="p-3 rounded-2xl bg-muted/50 border border-border/60 text-xs text-muted-foreground">
                  Consultando base de turismo e analisando as opções cotadas...
                </div>
              </div>
            )}
          </div>

          {/* Quick Suggestions Chips */}
          <div className="p-2.5 border-t border-border/40 bg-muted/10 shrink-0 space-y-1.5">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block px-1">
              Perguntas Frequentes
            </span>
            <div className="flex flex-wrap gap-1.5">
              {options.length > 1 && (
                <button
                  type="button"
                  onClick={() => handleSendMessage("Qual a diferença principal entre as opções cotadas e qual vale mais a pena?")}
                  className="text-[11px] px-2.5 py-1 rounded-lg border border-border/60 bg-background hover:bg-muted text-foreground cursor-pointer transition-colors"
                >
                  Comparar as Opções
                </button>
              )}
              <button
                type="button"
                onClick={() => handleSendMessage("Como é a localização do hotel e a distância da praia ou centro?")}
                className="text-[11px] px-2.5 py-1 rounded-lg border border-border/60 bg-background hover:bg-muted text-foreground cursor-pointer transition-colors"
              >
                Localização do Hotel
              </button>
              <button
                type="button"
                onClick={() => handleSendMessage("Como é o clima nesta época do ano no destino e o que levar?")}
                className="text-[11px] px-2.5 py-1 rounded-lg border border-border/60 bg-background hover:bg-muted text-foreground cursor-pointer transition-colors"
              >
                Clima e Bagagem
              </button>
            </div>
          </div>

          {/* Input Bar */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="p-3 border-t border-border/60 bg-background shrink-0 flex items-center gap-2"
          >
            <Input
              value={advisorInput}
              onChange={(e) => setAdvisorInput(e.target.value)}
              placeholder="Digite sua dúvida sobre a viagem..."
              disabled={advisorMutation.isPending}
              className="h-10 text-xs rounded-xl flex-1"
            />
            <Button
              type="submit"
              size="icon"
              disabled={!advisorInput.trim() || advisorMutation.isPending}
              className="h-10 w-10 rounded-xl bg-amber-600 hover:bg-amber-700 text-white shrink-0 cursor-pointer"
            >
              <Send className="size-4" />
            </Button>
          </form>
        </SheetContent>
      </Sheet>

      {/* ── 6. MODAL DE CHECKOUT, MANIFESTO E SINAL ── */}
      <TravelProposalCheckoutModal
        isOpen={isCheckoutModalOpen}
        onClose={() => setIsCheckoutModalOpen(false)}
        proposal={effectiveProposal}
        onSuccess={() => setIsApproved(true)}
      />
    </div>
  );
}
