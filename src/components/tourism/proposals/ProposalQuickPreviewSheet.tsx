import React, { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  Copy,
  Download,
  ExternalLink,
  FileCode2,
  FileText,
  Globe,
  Image as ImageIcon,
  KeyRound,
  LayoutTemplate,
  Lock,
  MessageCircle,
  PenSquare,
  Send,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { TravelProposalDTO, TravelProposalOptionDTO } from "@/services/travel-proposal.functions";
import { ProposalCanvasRenderer } from "@/components/tourism/studio/proposal-canvas-renderer";
import { StudioFrame } from "@/components/tourism/studio/studio-frame";
import { EditorialShowcaseView } from "@/components/classifieds/editorial-showcase-view";
import { proposalToEditorialClassified } from "@/lib/tourism/proposal-editorial-mapper";
import {
  formatProposalDateRange,
  formatProposalPaxSummary,
  formatProposalTotalAndRange,
  getProposalStatusMeta,
  getProposalVisibilityMeta,
} from "./proposal-ui-helpers";
import { cn } from "@/lib/utils";

interface ProposalQuickPreviewSheetProps {
  proposal: TravelProposalDTO | null;
  exportingKey?: string | null;
  onClose: () => void;
  onCopyLink: (proposal: TravelProposalDTO) => void;
  onPublishDraft: (proposal: TravelProposalDTO) => void;
  onOpenSecurityDialog: (proposal: TravelProposalDTO) => void;
  onOpenWhatsappModal: (proposal: TravelProposalDTO) => void;
  onExportPdf: (proposal: TravelProposalDTO) => void;
  onExportPng: (proposal: TravelProposalDTO) => void;
  onExportJson: (proposal: TravelProposalDTO) => void;
}

/**
 * Instant Quick Preview slide-over Sheet triggered by clicking any row icon, thumbnail, or preview button.
 * Lets staff inspect both the high-resolution Studio Lâmina Canvas and client Editorial Showcase
 * and export PDF/PNG, copy link, publish, or jump to Studio without leaving the list page.
 */
export function ProposalQuickPreviewSheet({
  proposal,
  exportingKey,
  onClose,
  onCopyLink,
  onPublishDraft,
  onOpenSecurityDialog,
  onOpenWhatsappModal,
  onExportPdf,
  onExportPng,
  onExportJson,
}: ProposalQuickPreviewSheetProps) {
  const [previewMode, setPreviewMode] = useState<"canvas" | "editorial">("canvas");
  const [selectedOptionIdx, setSelectedOptionIdx] = useState(0);

  const options: TravelProposalOptionDTO[] = useMemo(
    () => (Array.isArray(proposal?.options) ? proposal.options : []),
    [proposal?.options],
  );

  const activeProposal = useMemo(() => {
    if (!proposal) return null;
    if (options.length === 0) return proposal;
    const chosen = options[selectedOptionIdx] || options[0];
    if (!chosen) return proposal;
    return {
      ...proposal,
      flights: chosen.flights && chosen.flights.length > 0 ? chosen.flights : proposal.flights,
      hotels: chosen.hotels && chosen.hotels.length > 0 ? chosen.hotels : proposal.hotels,
      itinerary:
        chosen.itinerary && chosen.itinerary.length > 0 ? chosen.itinerary : proposal.itinerary,
      includes: chosen.includes && chosen.includes.length > 0 ? chosen.includes : proposal.includes,
      excludes: chosen.excludes && chosen.excludes.length > 0 ? chosen.excludes : proposal.excludes,
      pricing: chosen.pricing || proposal.pricing,
    };
  }, [proposal, options, selectedOptionIdx]);

  const editorialClassified = useMemo(() => {
    if (!activeProposal) return null;
    return proposalToEditorialClassified(activeProposal);
  }, [activeProposal]);

  if (!proposal || !activeProposal) return null;

  const statusMeta = getProposalStatusMeta(proposal);
  const visibilityMeta = getProposalVisibilityMeta(proposal);
  const priceInfo = formatProposalTotalAndRange(activeProposal);
  const publicHref = `/proposta/${proposal.public_token}`;
  const isExporting =
    exportingKey === `${proposal.id}:pdf` || exportingKey === `${proposal.id}:png`;

  return (
    <Sheet open={Boolean(proposal)} onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        size="wide"
        className="w-full sm:max-w-3xl lg:max-w-5xl p-0 flex flex-col h-full bg-card overflow-hidden overscroll-contain"
      >
        <SheetHeader className="px-6 py-4 border-b border-border/60 bg-muted/30 shrink-0 space-y-3">
          <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-3 pr-8">
            <div className="space-y-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <Badge
                  variant={statusMeta.badgeVariant}
                  className={cn("text-xs font-semibold", statusMeta.badgeClassName)}
                >
                  {statusMeta.label}
                </Badge>
                <Badge
                  variant="outline"
                  className={cn("text-xs font-medium", visibilityMeta.toneClassName)}
                >
                  {proposal.visibility_mode === "password" ? (
                    <KeyRound className="size-3 mr-1" aria-hidden />
                  ) : proposal.visibility_mode === "private" ? (
                    <Lock className="size-3 mr-1" aria-hidden />
                  ) : (
                    <Globe className="size-3 mr-1" aria-hidden />
                  )}
                  {visibilityMeta.label}
                </Badge>
                <span className="text-xs font-mono font-bold text-foreground tabular-nums">
                  {priceInfo.primaryPrice}
                </span>
              </div>

              <SheetTitle className="text-base font-bold text-foreground break-words whitespace-normal">
                {proposal.title}
              </SheetTitle>
              <SheetDescription className="text-xs text-muted-foreground break-words whitespace-normal">
                {proposal.client_name || "Cliente"} ·{" "}
                {proposal.destination_city || "Destino a definir"} ·{" "}
                {formatProposalDateRange(proposal.travel_start_date, proposal.travel_end_date)} ·{" "}
                {formatProposalPaxSummary(proposal.adults_count, proposal.children_count)}
              </SheetDescription>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              {proposal.status === "draft" && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onPublishDraft(proposal)}
                  className="h-11 min-h-11 px-3 rounded-lg text-xs font-semibold gap-2 cursor-pointer focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <Send className="size-3.5" />
                  <span>Publicar</span>
                </Button>
              )}

              <Button
                type="button"
                variant="outline"
                onClick={() => onCopyLink(proposal)}
                className="h-11 min-h-11 px-3 rounded-lg text-xs font-semibold gap-2 cursor-pointer focus-visible:ring-2 focus-visible:ring-ring"
              >
                <Copy className="size-3.5" />
                <span>Copiar Link</span>
              </Button>

              <Button
                asChild
                variant="outline"
                className="h-11 min-h-11 px-3 rounded-lg text-xs font-semibold gap-2 cursor-pointer focus-visible:ring-2 focus-visible:ring-ring"
              >
                <a href={publicHref} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="size-3.5" />
                  <span>Abrir Página</span>
                </a>
              </Button>

              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenWhatsappModal(proposal)}
                className="h-11 min-h-11 px-3 rounded-lg text-xs font-semibold gap-2 cursor-pointer focus-visible:ring-2 focus-visible:ring-ring"
              >
                <MessageCircle className="size-3.5 text-emerald-600" />
                <span>WhatsApp</span>
              </Button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={isExporting}
                    className="h-11 min-h-11 px-3 rounded-lg text-xs font-semibold gap-2 cursor-pointer focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <Download className="size-3.5" />
                    <span>{isExporting ? "Exportando..." : "Exportar"}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-52 rounded-xl">
                  <DropdownMenuItem
                    onClick={() => onExportPdf(activeProposal)}
                    className="min-h-11 cursor-pointer gap-2"
                  >
                    <FileText className="size-4 text-rose-600 dark:text-rose-400" />
                    <span>Exportar PDF (Alta Res)</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => onExportPng(activeProposal)}
                    className="min-h-11 cursor-pointer gap-2"
                  >
                    <ImageIcon className="size-4 text-primary" />
                    <span>Exportar PNG (Imagem)</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => onExportJson(activeProposal)}
                    className="min-h-11 cursor-pointer gap-2"
                  >
                    <FileCode2 className="size-4 text-muted-foreground" />
                    <span>Exportar JSON</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <Button
                asChild
                variant="default"
                className="h-11 min-h-11 px-4 rounded-lg text-xs font-semibold gap-2 cursor-pointer focus-visible:ring-2 focus-visible:ring-ring"
              >
                <Link to="/workspace/turismo/propostas/$id" params={{ id: proposal.id }}>
                  <PenSquare className="size-3.5" />
                  <span>Abrir Studio</span>
                </Link>
              </Button>
            </div>
          </div>

          {/* Seletor de Modo de Preview + Opções Multi-Cotação */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
            <div className="flex items-center gap-1 bg-background p-1 rounded-xl border border-border/60">
              <button
                type="button"
                onClick={() => setPreviewMode("canvas")}
                className={cn(
                  "h-11 min-h-11 px-3 rounded-lg text-xs font-semibold inline-flex items-center gap-2 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  previewMode === "canvas"
                    ? "bg-foreground text-background"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <LayoutTemplate className="size-3.5" />
                <span>Lâmina Studio</span>
              </button>
              <button
                type="button"
                onClick={() => setPreviewMode("editorial")}
                className={cn(
                  "h-11 min-h-11 px-3 rounded-lg text-xs font-semibold inline-flex items-center gap-2 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  previewMode === "editorial"
                    ? "bg-foreground text-background"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Globe className="size-3.5" />
                <span>Página do Cliente</span>
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {options.length > 1 &&
                options.map((opt, idx) => (
                  <button
                    key={opt.id || idx}
                    type="button"
                    onClick={() => setSelectedOptionIdx(idx)}
                    className={cn(
                      "h-11 min-h-11 px-3 rounded-lg text-xs font-semibold border transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      selectedOptionIdx === idx
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-background text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {opt.name || `Opção ${idx + 1}`}
                  </button>
                ))}

              <Button
                type="button"
                variant="ghost"
                onClick={() => onOpenSecurityDialog(proposal)}
                className="h-11 min-h-11 px-3 rounded-lg text-xs font-medium gap-2 cursor-pointer focus-visible:ring-2 focus-visible:ring-ring"
              >
                <KeyRound className="size-3.5" />
                <span>Configurar Senha/Acesso</span>
              </Button>
            </div>
          </div>
        </SheetHeader>

        {/* Área de Preview */}
        <div className="flex-1 min-h-0 overflow-y-auto bg-muted/40 flex flex-col">
          {previewMode === "canvas" ? (
            <StudioFrame
              format={activeProposal.canvas_format || "a4-portrait"}
              canvasId="quick-preview-proposal-canvas"
            >
              <ProposalCanvasRenderer proposal={activeProposal} />
            </StudioFrame>
          ) : editorialClassified ? (
            <div className="p-4 sm:p-6">
              <EditorialShowcaseView classified={editorialClassified} isOwner />
            </div>
          ) : null}
        </div>
      </SheetContent>
    </Sheet>
  );
}
