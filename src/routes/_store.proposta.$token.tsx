import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useState, useMemo, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Download, MessageCircle, ShieldCheck, Star, Bot, Loader2, FileText, Globe, Lock, KeyRound, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  getPublicTravelProposalByToken,
  verifyTravelProposalAccessPin,
  updateTravelProposal,
  type HotelDTO,
  type TravelProposalDTO,
  type TravelProposalOptionDTO,
  type ProposalStatus,
} from "@/services/travel-proposal.functions";
import { ProposalCanvasRenderer } from "@/components/tourism/studio/proposal-canvas-renderer";
import { ProposalWebShowcase } from "@/components/tourism/studio/proposal-web-showcase";
import { TravelProposalCheckoutModal } from "@/components/tourism/studio/travel-proposal-checkout-modal";
import { TourismProposalAiDrawer } from "@/components/tourism/shared/TourismProposalAiDrawer";
import type { CommercialPaymentPreference } from "@/components/tourism/shared/ProposalCommercialPanel";
import { normalizeProposalOptionsAndHotels } from "@/lib/tourism/proposal-normalization";
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
  const [viewMode, setViewMode] = useState<"web" | "studio">("web");
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [isAccepted, setIsAccepted] = useState(proposal?.acceptance_status === "accepted");
  const [localStatus, setLocalStatus] = useState<string>(proposal?.status || "sent");
  const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false);
  const [prefilledPreference, setPrefilledPreference] = useState<CommercialPaymentPreference | null>(null);
  const [prefilledInstallments, setPrefilledInstallments] = useState<number>(1);
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

  // ── AI Sales Advisor (SDR) Drawer State ──
  const [isAdvisorOpen, setIsAdvisorOpen] = useState(false);

  const normalizedPackage = useMemo(() => {
    if (!proposal) return { hotels: [] as HotelDTO[], options: [] as TravelProposalOptionDTO[] };
    const norm = normalizeProposalOptionsAndHotels(
      proposal.hotels || [],
      proposal.options || [],
    );
    return {
      hotels: norm.hotels as HotelDTO[],
      options: norm.options as TravelProposalOptionDTO[],
    };
  }, [proposal?.hotels, proposal?.options]);

  const options: TravelProposalOptionDTO[] = useMemo(() => {
    return normalizedPackage.options as TravelProposalOptionDTO[];
  }, [normalizedPackage.options]);

  const effectiveProposal = useMemo<TravelProposalDTO | null>(() => {
    if (!proposal) return null;
    const statusValue = (localStatus || proposal.status || "sent") as ProposalStatus;
    const baseHotels = normalizedPackage.hotels.length > 0 ? normalizedPackage.hotels : proposal.hotels;
    if (options.length === 0) {
      return { ...proposal, hotels: baseHotels, status: statusValue };
    }

    const currentOpt = options[selectedOptionIndex] || options[0];
    if (!currentOpt) {
      return { ...proposal, hotels: baseHotels, status: statusValue };
    }

    const optLabel = String((currentOpt as any).name || (currentOpt as any).title || "").trim();
    return {
      ...proposal,
      status: statusValue,
      title: optLabel ? `${proposal.title} — ${optLabel}` : proposal.title,
      subtitle: (currentOpt as any).subtitle || proposal.subtitle,
      flights: currentOpt.flights && currentOpt.flights.length > 0 ? currentOpt.flights : proposal.flights,
      hotels: currentOpt.hotels && currentOpt.hotels.length > 0 ? currentOpt.hotels : baseHotels,
      itinerary: currentOpt.itinerary && currentOpt.itinerary.length > 0 ? currentOpt.itinerary : proposal.itinerary,
      transfers: currentOpt.transfers && currentOpt.transfers.length > 0 ? currentOpt.transfers : proposal.transfers,
      tours: currentOpt.tours && currentOpt.tours.length > 0 ? currentOpt.tours : proposal.tours,
      cruises: Array.isArray((currentOpt as any).cruises) && (currentOpt as any).cruises.length > 0 ? (currentOpt as any).cruises : (proposal as any).cruises,
      rooms: Array.isArray((currentOpt as any).rooms) && (currentOpt as any).rooms.length > 0 ? (currentOpt as any).rooms : (proposal as any).rooms,
      includes: currentOpt.includes && currentOpt.includes.length > 0 ? currentOpt.includes : proposal.includes,
      excludes: currentOpt.excludes && currentOpt.excludes.length > 0 ? currentOpt.excludes : proposal.excludes,
      pricing: currentOpt.pricing || proposal.pricing,
    };
  }, [proposal, normalizedPackage.hotels, options, selectedOptionIndex, localStatus]);

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

  if (!proposal || !effectiveProposal) {
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
      
      {/* ── 1. HEADER TABS MULTI-OPÇÃO (APENAS QUANDO HOUVER 2+ PACOTES/COTAÇÕES DISTINTAS) ── */}
      {options.length > 1 && proposal.web_page?.show_option_tabs !== false && (
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
            <span className="text-xs sm:text-sm font-bold text-foreground break-words">
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
          {/* Alternador Página Web vs Lâmina PDF */}
          <div className="inline-flex items-center rounded-lg border border-border bg-muted/40 p-1 gap-1">
            <Button
              type="button"
              size="sm"
              variant={viewMode === "web" ? "secondary" : "ghost"}
              onClick={() => setViewMode("web")}
              className="h-11 min-h-11 px-3 rounded-md text-xs font-bold gap-2 cursor-pointer focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Globe className="size-3.5" />
              <span>Página Web</span>
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

          {cleanWhatsapp && (
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

      {/* ── 3. RENDERIZAÇÃO DA PROPOSTA WEB (VITRINE INTERATIVA EDITÁVEL OU LÂMINA PDF) ── */}
      {viewMode === "web" ? (
        <ProposalWebShowcase
          proposal={effectiveProposal}
          webPage={proposal.web_page}
          ctaLabel={primaryCtaLabel}
          ctaDisabled={cannotAccept}
          onSelectPayment={(pref, inst) => {
            setPrefilledPreference(pref);
            setPrefilledInstallments(inst);
          }}
          onAcceptClick={(pref, inst) => {
            if (pref) setPrefilledPreference(pref);
            if (inst && inst >= 1) setPrefilledInstallments(inst);
            if (cannotAccept) {
              toast.info(primaryCtaLabel);
              return;
            }
            setIsCheckoutModalOpen(true);
          }}
          onAskAdvisorClick={() => setIsAdvisorOpen(true)}
          whatsappHref={cleanWhatsapp ? `https://wa.me/${cleanWhatsapp}?text=${waConfirmMessage}` : null}
        />
      ) : null}

      {/* Mantém a lâmina A4 sempre montada para visualização Studio ou exportação PDF em alta fidelidade */}
      <div
        id="public-proposal-canvas"
        aria-hidden={viewMode === "web" ? true : undefined}
        className={
          viewMode === "studio"
            ? "max-w-4xl mx-auto rounded-lg border border-border overflow-hidden bg-card"
            : "fixed top-0 pointer-events-none w-full max-w-4xl"
        }
        style={viewMode === "web" ? { left: "-10000px", opacity: 1, zIndex: -50 } : undefined}
      >
        <ProposalCanvasRenderer proposal={effectiveProposal} />
      </div>

      {/* ── 4. BARRA FIXA MOBILE (Z-30 ABAIXO DOS MODAIS Z-50) ── */}
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

      {/* ── 5. DRAWER DO CONSULTOR DE VENDAS / SDR DE IA (PADRÃO INSTAGRAM / DIRECT) ── */}
      <TourismProposalAiDrawer
        isOpen={isAdvisorOpen}
        onClose={() => setIsAdvisorOpen(false)}
        proposal={effectiveProposal}
        customPrompt={proposal.web_page?.ai_advisor_prompt}
        agencyPhone={proposal.web_page?.whatsapp_phone || proposal.agency_whatsapp || proposal.client_whatsapp}
      />

      {/* ── 6. MODAL DE CHECKOUT, MANIFESTO E SINAL ── */}
      <TravelProposalCheckoutModal
        isOpen={isCheckoutModalOpen}
        onClose={() => setIsCheckoutModalOpen(false)}
        proposal={effectiveProposal}
        selectedOptionId={activeOption?.id || null}
        initialPaymentPreference={prefilledPreference}
        initialInstallments={prefilledInstallments}
        onSuccess={() => {
          setIsAccepted(true);
          setLocalStatus("approved");
          setIsCheckoutModalOpen(false);
        }}
      />
    </div>
  );
}
