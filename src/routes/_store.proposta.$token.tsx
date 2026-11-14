import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useState, useMemo, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Download, MessageCircle, ShieldCheck, Star, Bot, Send, Loader2, LayoutTemplate, FileText, Globe, Lock, KeyRound, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { toast } from "sonner";
import {
  getPublicTravelProposalByToken,
  verifyTravelProposalAccessPin,
  askProposalSalesAdvisorAI,
  updateTravelProposal,
  type TravelProposalDTO,
  type TravelProposalOptionDTO,
  type ProposalStatus,
} from "@/services/travel-proposal.functions";
import { ProposalCanvasRenderer } from "@/components/tourism/studio/proposal-canvas-renderer";
import { TravelProposalCheckoutModal } from "@/components/tourism/studio/travel-proposal-checkout-modal";
import { EditorialShowcaseView } from "@/components/classifieds/editorial-showcase-view";
import { proposalToEditorialClassified } from "@/lib/tourism/proposal-editorial-mapper";
import { exportElementAsPdf } from "@/lib/pdf-export";
import { formatMoney } from "@/lib/money";

export const Route = createFileRoute("/_store/proposta/$token")({
  head: ({ loaderData }: { loaderData?: { proposal: TravelProposalDTO | null; loadError?: boolean } }) => ({
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
      return { proposal, loadError: false };
    } catch (err) {
      console.error("[loader:_store.proposta.$token] Unhandled loader error:", err);
      return { proposal: null, loadError: true };
    }
  },
  component: PublicTravelProposalPage,
});

function PublicTravelProposalPage() {
  const { proposal: loaderProposal, loadError } = ((Route.useLoaderData?.() as any) || {});
  const [unlockedProposal, setUnlockedProposal] = useState<TravelProposalDTO | null>(null);
  const proposal: TravelProposalDTO | null = unlockedProposal || loaderProposal || null;
  const [pinInput, setPinInput] = useState("");
  const [showPin, setShowPin] = useState(false);
  const [unlockError, setUnlockError] = useState<string | null>(null);
  const [isUnlocking, setIsUnlocking] = useState(false);
  const router = useRouter();
  const queryClient = useQueryClient();
  const [viewMode, setViewMode] = useState<"editorial" | "studio">("editorial");
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [isAccepted, setIsAccepted] = useState(proposal?.acceptance_status === "accepted");
  const [localStatus, setLocalStatus] = useState<string>(proposal?.status || "sent");
  const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false);
  const [selectedOptionIndex, setSelectedOptionIndex] = useState(() => {
    const acceptedIndex = proposal?.options?.findIndex((option: { id?: string }) => option.id === proposal?.accepted_option_id) ?? -1;
    return acceptedIndex >= 0 ? acceptedIndex : 0;
  });

  useEffect(() => {
    setUnlockedProposal(null);
    setIsAccepted(loaderProposal?.acceptance_status === "accepted");
    setLocalStatus(loaderProposal?.status || "sent");
    const acceptedIndex =
      loaderProposal?.options?.findIndex((option: { id?: string }) => option.id === loaderProposal?.accepted_option_id) ?? -1;
    setSelectedOptionIndex(acceptedIndex >= 0 ? acceptedIndex : 0);
  }, [loaderProposal?.id, loaderProposal?.updated_at, loaderProposal?.status, loaderProposal?.acceptance_status, loaderProposal?.accepted_option_id]);

  // ── AI Sales Advisor (SDR) States ──
  const [isAdvisorOpen, setIsAdvisorOpen] = useState(false);
  const [advisorInput, setAdvisorInput] = useState("");
  const buildAdvisorGreeting = (agency?: string | null, city?: string | null) =>
    `Olá! Sou o Consultor de Viagens Inteligente da ${agency || "sua agência"}. Estou aqui para esclarecer qualquer detalhe dos voos, hotéis, localização, clima e passeios para ${city || "sua viagem"}. Como posso te ajudar hoje?`;
  const [messages, setMessages] = useState<Array<{ role: "user" | "assistant"; content: string }>>(() => [
    {
      role: "assistant",
      content: buildAdvisorGreeting(proposal?.agency_name, proposal?.destination_city),
    },
  ]);

  useEffect(() => {
    setMessages((prev) => {
      if (prev.length === 1 && prev[0]?.role === "assistant") {
        return [
          {
            role: "assistant",
            content: buildAdvisorGreeting(proposal?.agency_name, proposal?.destination_city),
          },
        ];
      }
      return prev;
    });
  }, [proposal?.public_token, proposal?.agency_name, proposal?.destination_city, proposal?.access_locked]);

  const options: TravelProposalOptionDTO[] = useMemo(() => {
    return Array.isArray(proposal?.options) && proposal.options.length > 0 ? proposal.options : [];
  }, [proposal?.options]);

  const effectiveProposal = useMemo<TravelProposalDTO | null>(() => {
    if (!proposal) return null;
    const statusValue = (localStatus || proposal.status || "sent") as ProposalStatus;
    if (options.length === 0) return { ...proposal, status: statusValue };

    const currentOpt = options[selectedOptionIndex] || options[0];
    if (!currentOpt) return { ...proposal, status: statusValue };

    const optLabel = String((currentOpt as any).name || (currentOpt as any).title || "").trim();
    return {
      ...proposal,
      status: statusValue,
      title: optLabel ? `${proposal.title} — ${optLabel}` : proposal.title,
      subtitle: (currentOpt as any).subtitle || proposal.subtitle,
      flights: currentOpt.flights && currentOpt.flights.length > 0 ? currentOpt.flights : proposal.flights,
      hotels: currentOpt.hotels && currentOpt.hotels.length > 0 ? currentOpt.hotels : proposal.hotels,
      itinerary: currentOpt.itinerary && currentOpt.itinerary.length > 0 ? currentOpt.itinerary : proposal.itinerary,
      transfers: currentOpt.transfers && currentOpt.transfers.length > 0 ? currentOpt.transfers : proposal.transfers,
      tours: currentOpt.tours && currentOpt.tours.length > 0 ? currentOpt.tours : proposal.tours,
      rooms: Array.isArray((currentOpt as any).rooms) && (currentOpt as any).rooms.length > 0 ? (currentOpt as any).rooms : (proposal as any).rooms,
      includes: currentOpt.includes && currentOpt.includes.length > 0 ? currentOpt.includes : proposal.includes,
      excludes: currentOpt.excludes && currentOpt.excludes.length > 0 ? currentOpt.excludes : proposal.excludes,
      pricing: currentOpt.pricing || proposal.pricing,
    };
  }, [proposal, options, selectedOptionIndex, localStatus]);

  const editorialClassified = useMemo(() => {
    if (!effectiveProposal) return null;
    return proposalToEditorialClassified(effectiveProposal);
  }, [effectiveProposal]);

  const publishMutation = useMutation({
    mutationFn: () =>
      updateTravelProposal({
        data: {
          id: proposal!.id || proposal!.public_token,
          patch: { status: "sent" },
        },
      }),
    onSuccess: async () => {
      setLocalStatus("sent");
      toast.success("Proposta publicada! O cliente já pode visualizar e aceitar online.");
      await queryClient.invalidateQueries({ queryKey: ["agency-proposals"] });
      await router.invalidate();
    },
    onError: (err: any) => {
      toast.error(err?.message || "Não foi possível publicar a proposta.");
    },
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

  const handleUnlockPin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!proposal || !pinInput.trim() || isUnlocking) return;
    try {
      setIsUnlocking(true);
      setUnlockError(null);
      const res = await verifyTravelProposalAccessPin({
        data: { token: proposal.public_token, pin: pinInput.trim() },
      });
      if (!res.unlocked || !res.proposal) {
        setUnlockError(res.message || "Senha incorreta. Confira com a agência.");
        return;
      }
      setUnlockedProposal(res.proposal);
      setIsAccepted(res.proposal.acceptance_status === "accepted");
      setLocalStatus(res.proposal.status || "sent");
      const acceptedIdx =
        res.proposal.options?.findIndex(
          (opt: { id?: string }) => opt.id === res.proposal?.accepted_option_id,
        ) ?? -1;
      if (acceptedIdx >= 0) setSelectedOptionIndex(acceptedIdx);
      toast.success("Proposta desbloqueada!");
    } catch (err: any) {
      setUnlockError(err?.message || "Erro ao validar senha de acesso.");
    } finally {
      setIsUnlocking(false);
    }
  };

  if (proposal?.access_locked) {
    const cleanAgencyWa = (proposal.agency_whatsapp || "").replace(/\D/g, "");
    const agencyWaUrl = cleanAgencyWa
      ? `https://wa.me/${cleanAgencyWa.startsWith("55") ? cleanAgencyWa : `55${cleanAgencyWa}`}`
      : null;

    if (proposal.lock_reason === "private" || proposal.lock_reason === "hidden") {
      return (
        <div className="max-w-md mx-auto py-20 px-4 text-center space-y-5">
          <div className="size-14 rounded-2xl bg-muted border border-border/60 flex items-center justify-center mx-auto text-muted-foreground">
            <Lock className="size-6" aria-hidden />
          </div>
          <div className="space-y-2">
            <h2 className="text-lg font-bold text-foreground">Proposta de acesso restrito</h2>
            <p className="text-sm text-muted-foreground">
              Esta proposta está marcada como privada ou foi ocultada pela agência emissora.
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-2">
            {agencyWaUrl && (
              <Button asChild variant="outline" className="h-11 min-h-11 rounded-xl gap-2">
                <a href={agencyWaUrl} target="_blank" rel="noopener noreferrer">
                  <MessageCircle className="size-4 text-emerald-600" />
                  <span>Falar com {proposal.agency_name}</span>
                </a>
              </Button>
            )}
            <Button asChild variant="ghost" className="h-11 min-h-11 rounded-xl">
              <Link to="/turismo">Explorar outros destinos</Link>
            </Button>
          </div>
        </div>
      );
    }

    if (proposal.lock_reason === "pin_required" || proposal.access_locked) {
      return (
      <div className="max-w-md mx-auto py-16 px-4">
        <div className="rounded-2xl border border-border bg-card p-6 space-y-5">
          <div className="flex items-center gap-3">
            {proposal.agency_logo_url ? (
              <img
                src={proposal.agency_logo_url}
                alt=""
                className="size-11 rounded-xl object-cover border border-border/60"
              />
            ) : (
              <div className="size-11 rounded-xl bg-warning/10 border border-warning/30 flex items-center justify-center text-warning-strong shrink-0">
                <KeyRound className="size-5" aria-hidden />
              </div>
            )}
            <div className="min-w-0">
              <p className="text-xs font-medium text-muted-foreground">{proposal.agency_name}</p>
              <h1 className="text-base font-bold text-foreground break-words whitespace-normal">
                {proposal.title || "Proposta protegida por senha"}
              </h1>
            </div>
          </div>

          <p className="text-sm text-muted-foreground">
            {proposal.client_name
              ? `Olá, ${proposal.client_name}. Digite a senha de acesso enviada pela agência para abrir seu roteiro${proposal.destination_city ? ` para ${proposal.destination_city}` : ""}.`
              : "Digite a senha de acesso enviada pela agência para abrir esta proposta."}
          </p>

          <form onSubmit={handleUnlockPin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="public-proposal-pin" className="text-xs font-semibold">
                Senha / PIN de Acesso
              </Label>
              <div className="flex items-center gap-2">
                <Input
                  id="public-proposal-pin"
                  type={showPin ? "text" : "password"}
                  value={pinInput}
                  onChange={(e) => setPinInput(e.target.value)}
                  placeholder="Digite o PIN informado"
                  autoFocus
                  className="h-11 min-h-11 font-mono tracking-wider"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowPin((v) => !v)}
                  aria-label={showPin ? "Ocultar senha" : "Mostrar senha"}
                  className="size-11 min-h-11 min-w-11 shrink-0 p-0 cursor-pointer focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {showPin ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </Button>
              </div>
              {unlockError && (
                <p role="alert" className="text-xs font-medium text-rose-600 dark:text-rose-400">
                  {unlockError}
                </p>
              )}
            </div>

            <Button
              type="submit"
              disabled={isUnlocking || !pinInput.trim()}
              className="w-full h-11 min-h-11 rounded-xl font-semibold gap-2 cursor-pointer focus-visible:ring-2 focus-visible:ring-ring"
            >
              {isUnlocking ? (
                <>
                  <Loader2 className="size-4 animate-spin motion-reduce:animate-none" />
                  <span>Verificando...</span>
                </>
              ) : (
                <>
                  <KeyRound className="size-4" />
                  <span>Desbloquear Proposta</span>
                </>
              )}
            </Button>
          </form>

          {agencyWaUrl && (
            <div className="pt-2 border-t border-border/50 text-center">
              <a
                href={agencyWaUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-medium text-muted-foreground hover:text-foreground inline-flex items-center gap-2 min-h-11 px-3 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <MessageCircle className="size-3.5 text-emerald-600" />
                <span>Esqueci a senha — solicitar no WhatsApp</span>
              </a>
            </div>
          )}
        </div>
      </div>
      );
    }
  }

  if (!proposal || !effectiveProposal || !editorialClassified) {
    const unavailableTitle = loadError ? "Proposta indisponível" : "Proposta não encontrada";
    return (
      <div className="max-w-md mx-auto py-20 px-4 text-center space-y-4" role={loadError ? "alert" : undefined}>
        <h2 className="text-lg font-bold text-foreground">{unavailableTitle}</h2>
        <p className="text-sm text-muted-foreground">
          {loadError ? "Não foi possível carregar esta proposta. Tente novamente." : "A proposta pode ter expirado ou o link informado está incorreto."}
        </p>
        {loadError ? (
          <Button type="button" size="sm" variant="outline" className="h-11 min-h-11 focus-visible:ring-2 focus-visible:ring-ring" onClick={() => window.location.reload()}>
            Tentar novamente
          </Button>
        ) : (
          <Button asChild size="sm" variant="outline" className="h-11 min-h-11 rounded-lg focus-visible:ring-2 focus-visible:ring-ring">
            <Link to="/turismo">Explorar outros destinos</Link>
          </Button>
        )}
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

  const whatsappDigits = (proposal.agency_whatsapp || "").replace(/\D/g, "");
  const cleanWhatsapp = whatsappDigits ? (whatsappDigits.startsWith("55") ? whatsappDigits : `55${whatsappDigits}`) : "";
  const proposalValidUntil = proposal.valid_until ? Date.parse(proposal.valid_until) : Number.NaN;
  const isProposalExpired = !Number.isFinite(proposalValidUntil) || proposalValidUntil <= Date.now();
  const currentStatus = localStatus || proposal.status;
  const cannotAccept = isAccepted || currentStatus !== "sent" || !proposal.snapshot_hash || isProposalExpired;
  const waConfirmMessage = encodeURIComponent(
    `Olá! Gostei da proposta #${proposal.public_token} para ${proposal.destination_city} e quero conversar sobre os próximos passos. Entendo que reserva, disponibilidade e emissão ainda dependem da confirmação da agência.`
  );

  const activeOption = options[selectedOptionIndex] || null;
  const primaryCtaLabel = isAccepted
    ? "Aceite registrado"
    : isProposalExpired
      ? "Validade encerrada"
      : currentStatus !== "sent"
        ? "Publicação pendente"
        : "Aceitar Orçamento e Reservar";

  return (
    <div className="max-w-7xl mx-auto py-3 sm:py-5 px-2 sm:px-4 space-y-4 pb-28 sm:pb-10">
      {/* ── 0. FAIXA DE PRÉ-VISUALIZAÇÃO DA AGÊNCIA (RASCUNHO) ── */}
      {currentStatus === "draft" && (
        <div className="rounded-xl border border-warning bg-warning/15 p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start sm:items-center gap-3">
            <Globe className="size-4 text-warning-strong shrink-0 mt-1 sm:mt-0" />
            <div className="space-y-1">
              <p className="text-xs font-bold text-foreground">
                Modo Pré-visualização da Agência (Rascunho)
              </p>
              <p className="text-2xs text-muted-foreground">
                Clientes externos ainda não podem abrir este link até você publicar a proposta.
              </p>
            </div>
          </div>
          <Button
            type="button"
            size="sm"
            disabled={publishMutation.isPending}
            onClick={() => publishMutation.mutate()}
            className="h-11 min-h-11 px-4 rounded-lg text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/90 shrink-0 cursor-pointer focus-visible:ring-2 focus-visible:ring-ring"
          >
            {publishMutation.isPending ? "Publicando..." : "Publicar para Cliente"}
          </Button>
        </div>
      )}
      
      {/* ── 1. HEADER TABS MULTI-OPÇÃO (QUANDO EXISTIREM 2+ COTAÇÕES) ── */}
      {options.length > 1 && (
        <div className="bg-card border border-border rounded-lg p-3">
          <div className="flex items-center justify-between gap-2 mb-2 px-1">
            <span className="text-2xs font-bold tracking-tight text-foreground uppercase flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse motion-reduce:animate-none" />
              Opções de Cotação Preparadas para Você ({options.length})
            </span>
            <span className="text-2xs text-muted-foreground">Toque para alternar</span>
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
                  className={`relative text-left p-3 rounded-lg border transition-colors duration-200 duration-150 cursor-pointer ${
                    isSelected
                      ? "border-emerald-600 bg-emerald-500/10 "
                      : "border-border/60 bg-background hover:bg-muted/40"
                  } focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-xs font-bold text-foreground line-clamp-1">{opt.name || `Opção ${idx + 1}`}</span>
                    {opt.is_recommended && (
                      <Badge className="bg-warning text-foreground text-3xs px-2 py-0 shrink-0 font-bold">
                        Recomendada
                      </Badge>
                    )}
                    {opt.badge && !opt.is_recommended && (
                      <Badge variant="outline" className="text-3xs px-2 py-0 shrink-0 font-medium">
                        {opt.badge}
                      </Badge>
                    )}
                  </div>

                  <p className="text-2xs text-muted-foreground mt-1 line-clamp-1">
                    {opt.hotel_name || opt.hotels?.[0]?.hotel_name || "Hospedagem Selecionada"}
                  </p>

                  <div className="mt-2 flex items-baseline justify-between">
                    <span className="text-xs font-bold text-foreground">{formatMoney(optPrice)}</span>
                    <span className="text-2xs text-muted-foreground">
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
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 p-3 sm:p-4 rounded-xl bg-card border border-border sticky top-3 z-20">
        <div className="space-y-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs sm:text-sm font-bold text-foreground truncate">
              {activeOption ? `${activeOption.name} · ${proposal.destination_city}` : proposal.title}
            </span>
            {isAccepted ? (
              <Badge variant="secondary" className="text-2xs font-bold">
                Aceite registrado
              </Badge>
            ) : (
              <Badge variant="outline" className="text-2xs font-mono font-bold">
                {isProposalExpired
                  ? "Validade encerrada"
                  : currentStatus !== "sent"
                    ? "Aguardando publicação"
                    : proposal.snapshot_hash
                      ? "Aguardando decisão"
                      : "Revisão necessária"}
              </Badge>
            )}
          </div>
          <p className="text-2xs text-muted-foreground">
            Consultoria por: <span className="font-bold text-foreground">{proposal.agency_name}</span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Alternador Editorial Interativo vs Lâmina PDF */}
          <div className="inline-flex items-center rounded-lg border border-border bg-muted/40 p-1 gap-1">
            <Button
              type="button"
              size="sm"
              variant={viewMode === "editorial" ? "secondary" : "ghost"}
              onClick={() => setViewMode("editorial")}
              className="h-11 min-h-11 px-3 rounded-md text-xs font-bold gap-2 cursor-pointer focus-visible:ring-2 focus-visible:ring-ring"
            >
              <LayoutTemplate className="size-3.5" />
              <span>Editorial</span>
            </Button>
            <Button
              type="button"
              size="sm"
              variant={viewMode === "studio" ? "secondary" : "ghost"}
              onClick={() => setViewMode("studio")}
              className="h-11 min-h-11 px-3 rounded-md text-xs font-bold gap-2 cursor-pointer focus-visible:ring-2 focus-visible:ring-ring"
            >
              <FileText className="size-3.5" />
              <span>Lâmina PDF</span>
            </Button>
          </div>

          {/* Botão do Consultor IA (SDR) */}
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => setIsAdvisorOpen(true)}
            className="rounded-lg text-xs font-bold gap-2 h-11 min-h-11 px-3 border-warning/40 text-warning-strong bg-warning/20 hover:bg-warning/30 cursor-pointer focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Star className="size-3.5 text-warning-strong" />
            <span>Consultor IA</span>
          </Button>

          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={isExportingPdf}
            onClick={handleExportPdf}
            className="rounded-lg text-xs font-bold gap-2 h-11 min-h-11 px-3 cursor-pointer focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Download className="size-3.5" />
            <span>{isExportingPdf ? "Gerando..." : "Baixar PDF"}</span>
          </Button>

          {cleanWhatsapp && viewMode === "studio" && (
            <Button
              asChild
              size="sm"
              variant="outline"
              className="rounded-lg text-xs font-bold gap-2 h-11 min-h-11 px-3 border-emerald-500/40 text-emerald-700 hover:bg-emerald-50 dark:text-emerald-400 cursor-pointer focus-visible:ring-2 focus-visible:ring-ring"
            >
              <a
                href={`https://wa.me/${cleanWhatsapp}?text=${waConfirmMessage}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <MessageCircle className="size-4 text-emerald-600" />
                <span>WhatsApp</span>
              </a>
            </Button>
          )}

          {/* No modo Lâmina PDF mantém o botão de aceite visível na barra; no modo Editorial o CTA principal vive na vitrine */}
          {viewMode === "studio" && (
            <Button
              type="button"
              size="sm"
              onClick={() => setIsCheckoutModalOpen(true)}
              disabled={cannotAccept}
              className="rounded-lg text-xs font-bold gap-2 min-h-11 h-11 px-4 bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer focus-visible:ring-2 focus-visible:ring-ring"
            >
              <ShieldCheck className="size-4" />
              <span>{isAccepted ? "Aceite registrado" : "Registrar aceite"}</span>
            </Button>
          )}
        </div>
      </div>

      {!proposal.snapshot_hash && !isAccepted && (
        <p role="status" className="text-xs text-muted-foreground px-1">
          A agência precisa atualizar esta proposta antes que o aceite online possa ser registrado.
        </p>
      )}
      {isProposalExpired && !isAccepted && (
        <p role="status" className="text-sm text-muted-foreground px-1">
          A validade terminou ou não está definida. Solicite uma proposta atualizada à agência.
        </p>
      )}
      {currentStatus !== "sent" && !isAccepted && !isProposalExpired && (
        <p role="status" className="text-sm text-muted-foreground px-1">
          A agência precisa publicar a proposta antes que ela possa receber um aceite.
        </p>
      )}

      {/* ── 3. RENDERIZAÇÃO DA PROPOSTA WEB (EDITORIAL INTERATIVO OU LÂMINA STUDIO) ── */}
      {viewMode === "editorial" ? (
        <EditorialShowcaseView
          classified={editorialClassified}
          onOpenBookingModal={() => {
            if (cannotAccept) {
              toast.info(primaryCtaLabel);
              return;
            }
            setIsCheckoutModalOpen(true);
          }}
          ctaLabelOverride={primaryCtaLabel}
          ctaDisabled={cannotAccept}
        />
      ) : null}

      {/* Mantém a lâmina A4 sempre montada para visualização Studio ou exportação PDF em alta fidelidade */}
      <div
        id="public-proposal-canvas"
        aria-hidden={viewMode === "editorial" ? true : undefined}
        className={
          viewMode === "studio"
            ? "max-w-4xl mx-auto rounded-lg border border-border overflow-hidden bg-card"
            : "fixed top-0 pointer-events-none w-full max-w-4xl"
        }
        style={viewMode === "editorial" ? { left: "-10000px", opacity: 1, zIndex: -50 } : undefined}
      >
        <ProposalCanvasRenderer proposal={effectiveProposal} />
      </div>

      {/* ── 4. BARRA FIXA MOBILE (APENAS NO MODO STUDIO; NO EDITORIAL O COMPONENT JÁ POSSUI BARRA PRÓPRIA) ── */}
      {viewMode === "studio" && (
        <div className="sm:hidden fixed bottom-0 left-0 right-0 p-3 pb-safe bg-background border-t border-border/70 z-30 flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => setIsAdvisorOpen(true)}
            className="h-11 min-h-11 px-3 rounded-lg text-xs font-bold shrink-0 border-warning/40 text-warning-strong bg-warning/20 cursor-pointer focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Star className="size-4 text-warning-strong mr-1" />
            <span>IA</span>
          </Button>

          {cleanWhatsapp && (
            <Button
              asChild
              variant="outline"
              size="icon"
              className="h-11 min-h-11 w-11 rounded-lg shrink-0 border-emerald-500/40 text-emerald-700 cursor-pointer focus-visible:ring-2 focus-visible:ring-ring"
            >
              <a
                href={`https://wa.me/${cleanWhatsapp}?text=${waConfirmMessage}`}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="WhatsApp da agência"
              >
                <MessageCircle className="size-5 text-emerald-600" />
              </a>
            </Button>
          )}

          <Button
            type="button"
            onClick={() => setIsCheckoutModalOpen(true)}
            disabled={cannotAccept}
            className="flex-1 min-h-11 h-11 rounded-lg text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer focus-visible:ring-2 focus-visible:ring-ring"
          >
            <ShieldCheck className="size-4 mr-2" />
            <span>{isAccepted ? "Aceite registrado" : "Registrar aceite"}</span>
          </Button>
        </div>
      )}

      {/* ── 5. SHEET DO CONSULTOR DE VENDAS / SDR DE IA ── */}
      <Sheet open={isAdvisorOpen} onOpenChange={setIsAdvisorOpen}>
        <SheetContent side="right" className="w-full sm:max-w-md p-0 flex flex-col h-full bg-background">
          <SheetHeader className="p-4 border-b border-border/60 shrink-0 bg-muted/20">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-warning/10 border border-warning/30 flex items-center justify-center text-warning-strong">
                <Star className="size-5" />
              </div>
              <div>
                <SheetTitle className="text-sm font-bold text-foreground">Consultor de Viagens IA</SheetTitle>
                <SheetDescription className="text-2xs text-muted-foreground">
                  Especialista da {proposal.agency_name} para {proposal.destination_city}
                </SheetDescription>
              </div>
            </div>
          </SheetHeader>

          {/* Chat Messages */}
          <div className="flex-1 min-h-0 overflow-y-auto scrollbar-waesy p-4 space-y-3">
            {messages.map((m, idx) => (
              <div
                key={idx}
                className={`flex gap-3 ${m.role === "user" ? "justify-end" : "justify-start"}`}
              >
                {m.role === "assistant" && (
                  <div className="h-7 w-7 rounded-lg bg-warning/10 border border-warning/20 flex items-center justify-center shrink-0 text-warning-strong mt-1">
                    <Bot className="size-4" />
                  </div>
                )}
                <div
                  className={`p-3 rounded-lg text-xs leading-relaxed max-w-17/20 ${
                    m.role === "user"
                      ? "bg-foreground text-background font-medium rounded-tr-sm"
                      : "bg-muted/50 border border-border/60 text-foreground rounded-tl-sm space-y-2"
                  }`}
                >
                  <AdvisorFormattedMessage content={m.content} />
                </div>
              </div>
            ))}

            {advisorMutation.isPending && (
              <div className="flex gap-3 justify-start">
                <div className="h-7 w-7 rounded-lg bg-warning/10 border border-warning/20 flex items-center justify-center shrink-0 text-warning-strong">
                  <Loader2 className="size-4 animate-spin motion-reduce:animate-none" />
                </div>
                <div className="p-3 rounded-lg bg-muted/50 border border-border/60 text-xs text-muted-foreground">
                  Pesquisando informações públicas do hotel, destino e opções cotadas...
                </div>
              </div>
            )}
          </div>

          {/* Quick Suggestions Chips */}
          <div className="p-3 border-t border-border/40 bg-muted/10 shrink-0 space-y-2">
            <span className="text-2xs font-bold text-muted-foreground uppercase tracking-wider block px-1">
              Perguntas Frequentes
            </span>
            <div className="flex flex-wrap gap-2">
              {options.length > 1 && (
                <button
                  type="button"
                  onClick={() => handleSendMessage("Qual a diferença principal entre as opções cotadas e qual vale mais a pena?")}
                  className="text-2xs min-h-11 sm:min-h-10 px-3 py-2 rounded-lg border border-border/60 bg-background hover:bg-muted text-foreground cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  Comparar as Opções
                </button>
              )}
              <button
                type="button"
                onClick={() => handleSendMessage("Como é a localização do hotel e a distância da praia ou centro?")}
                className="text-2xs min-h-11 sm:min-h-10 px-3 py-2 rounded-lg border border-border/60 bg-background hover:bg-muted text-foreground cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                Localização do Hotel
              </button>
              <button
                type="button"
                onClick={() => handleSendMessage("Como é o clima nesta época do ano no destino e o que levar?")}
                className="text-2xs min-h-11 sm:min-h-10 px-3 py-2 rounded-lg border border-border/60 bg-background hover:bg-muted text-foreground cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
              className="h-11 sm:h-10 text-base md:text-sm rounded-lg flex-1"
            />
            <Button
              type="submit"
              size="icon"
              aria-label="Enviar pergunta ao consultor"
              disabled={!advisorInput.trim() || advisorMutation.isPending}
              className="size-11 min-h-11 min-w-11 sm:size-10 sm:min-h-0 sm:min-w-0 rounded-lg bg-primary hover:opacity-90 text-primary-foreground shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
        selectedOptionId={activeOption?.id || null}
        onSuccess={() => {
          setIsAccepted(true);
          setLocalStatus("approved");
          setIsCheckoutModalOpen(false);
        }}
      />
    </div>
  );
}

/** Renderiza texto rico seguro (**negrito** e links https://) sem exibir asteriscos crus. */
function AdvisorFormattedMessage({ content }: { content: string }) {
  const tokenRegex = /(\*\*[^*]+\*\*|https?:\/\/[^\s)<>]+)/g;
  const lines = String(content || "").split(/\r?\n/);

  return (
    <div className="space-y-2 break-words">
      {lines.map((line, lineIdx) => {
        if (!line.trim()) return <div key={lineIdx} className="h-1" aria-hidden />;
        const segments: React.ReactNode[] = [];
        let lastIndex = 0;
        let match: RegExpExecArray | null;
        tokenRegex.lastIndex = 0;

        while ((match = tokenRegex.exec(line)) !== null) {
          if (match.index > lastIndex) {
            segments.push(line.slice(lastIndex, match.index));
          }
          const token = match[0];
          if (token.startsWith("**") && token.endsWith("**")) {
            segments.push(
              <strong key={`${lineIdx}-${match.index}`} className="font-semibold">
                {token.slice(2, -2)}
              </strong>,
            );
          } else if (token.startsWith("http://") || token.startsWith("https://")) {
            const cleanedUrl = token.replace(/[.,;:!?]+$/, "");
            const trailingPunct = token.slice(cleanedUrl.length);
            segments.push(
              <a
                key={`${lineIdx}-${match.index}`}
                href={cleanedUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="underline underline-offset-2 font-medium break-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
              >
                {cleanedUrl}
              </a>,
            );
            if (trailingPunct) segments.push(trailingPunct);
          }
          lastIndex = match.index + token.length;
        }

        if (lastIndex < line.length) {
          segments.push(line.slice(lastIndex));
        }

        return (
          <p key={lineIdx} className="leading-relaxed">
            {segments.length > 0 ? segments : line}
          </p>
        );
      })}
    </div>
  );
}
