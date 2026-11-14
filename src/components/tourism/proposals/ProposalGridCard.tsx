import React, { useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  ArchiveRestore,
  Briefcase,
  Calendar,
  Copy,
  Download,
  ExternalLink,
  Eye,
  EyeOff,
  FileCode2,
  FileText,
  Globe,
  Image as ImageIcon,
  KeyRound,
  Layers,
  Lock,
  MessageCircle,
  PenSquare,
  Plane,
  Send,
  Users,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CrudActionsMenu, type CustomActionItem } from "@/components/ui/crud-actions-menu";
import type { TravelProposalDTO } from "@/services/travel-proposal.functions";
import { ProposalInlineTitle } from "./ProposalInlineTitle";
import type { ProposalActionHandlers } from "./ProposalsSheetTable";
import {
  buildWhatsappProposalShareUrl,
  formatProposalDateRange,
  formatProposalPaxSummary,
  formatProposalTotalAndRange,
  getProposalStatusMeta,
  getProposalValidityLabel,
  getProposalVisibilityMeta,
} from "./proposal-ui-helpers";
import { cn } from "@/lib/utils";

/**
 * Refined Apple HIG squircle card for Travel Proposals (desktop Grid mode and responsive mobile cards).
 * Removes repeated primary CTAs and provides inline title edit, privacy toggles, quick preview, and fast export.
 */
export function ProposalGridCard({
  proposal,
  isSelected,
  exportingKey,
  onToggleSelect,
  onPreview,
  onRenameTitle,
  onCopyLink,
  onTogglePrivate,
  onToggleHidden,
  onOpenSecurityDialog,
  onPublishDraft,
  onDuplicate,
  onOpenWhatsappModal,
  onExportPdf,
  onExportPng,
  onExportJson,
  onConvertToTrip,
  onDelete,
}: Omit<ProposalActionHandlers, "selectedIds" | "onToggleSelectAll" | "isAllSelected"> & {
  proposal: TravelProposalDTO;
  isSelected: boolean;
}) {
  const [originUrl] = useState(() =>
    typeof window !== "undefined" ? window.location.origin : "",
  );
  const statusMeta = getProposalStatusMeta(proposal);
  const visibilityMeta = getProposalVisibilityMeta(proposal);
  const priceInfo = formatProposalTotalAndRange(proposal);
  const validity = getProposalValidityLabel(proposal);
  const dateRange = formatProposalDateRange(proposal.travel_start_date, proposal.travel_end_date);
  const paxLabel = formatProposalPaxSummary(proposal.adults_count, proposal.children_count);
  const isPrivate = proposal.visibility_mode === "private";
  const isPassword = proposal.visibility_mode === "password" || Boolean(proposal.has_access_pin);
  const isHidden = Boolean(proposal.is_hidden);
  const isExporting =
    exportingKey === `${proposal.id}:pdf` || exportingKey === `${proposal.id}:png`;
  const publicHref = `/proposta/${proposal.public_token}`;
  const waShareUrl = buildWhatsappProposalShareUrl(proposal, originUrl);

  const customMenuActions: CustomActionItem[] = [
    {
      id: "quick-preview",
      label: "Visualização Rápida",
      icon: Eye,
      onClick: () => onPreview(proposal),
    },
    {
      id: "whatsapp",
      label: "Enviar WhatsApp / Lâmina",
      icon: MessageCircle,
      onClick: () => onOpenWhatsappModal(proposal),
    },
    {
      id: "security",
      label: isPassword ? "Alterar Senha / Acesso" : "Proteger com Senha",
      icon: KeyRound,
      onClick: () => onOpenSecurityDialog(proposal),
    },
    {
      id: "export-pdf",
      label: "Exportar PDF (Lâmina)",
      icon: FileText,
      onClick: () => onExportPdf(proposal),
    },
    {
      id: "export-png",
      label: "Exportar PNG (Imagem)",
      icon: ImageIcon,
      onClick: () => onExportPng(proposal),
    },
    {
      id: "export-json",
      label: "Exportar JSON",
      icon: FileCode2,
      onClick: () => onExportJson(proposal),
    },
  ];

  if (proposal.status === "approved" && !proposal.converted_trip_id) {
    customMenuActions.push({
      id: "convert-trip",
      label: "Converter em Viagem Ativa",
      icon: Briefcase,
      variant: "primary",
      onClick: () => onConvertToTrip(proposal),
    });
  }

  return (
    <article
      className={cn(
        "rounded-2xl border bg-card flex flex-col justify-between overflow-hidden transition-colors",
        isSelected
          ? "border-primary ring-2 ring-primary/25 bg-primary/5"
          : "border-border/70 hover:border-border",
        isHidden && "opacity-75",
      )}
    >
      {/* Topo Visual Clicável -> Abre Visualização Rápida */}
      <div className="relative bg-muted/40 border-b border-border/50">
        {proposal.cover_image_url ? (
          <button
            type="button"
            onClick={() => onPreview(proposal)}
            aria-label={`Visualizar rapidamente ${proposal.title}`}
            className="w-full aspect-video block relative overflow-hidden group cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <img
              src={proposal.cover_image_url}
              alt=""
              className="w-full h-full object-cover"
            />
            <span className="absolute bottom-3 right-3 h-11 min-h-11 px-3 rounded-xl bg-background/90 text-foreground text-xs font-semibold inline-flex items-center gap-2 border border-border/70">
              <Eye className="size-3.5" aria-hidden />
              <span>Visualizar</span>
            </span>
          </button>
        ) : (
          <div className="p-4 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <Checkbox
                checked={isSelected}
                onCheckedChange={() => onToggleSelect(proposal.id)}
                aria-label={`Selecionar ${proposal.title}`}
              />
              <button
                type="button"
                onClick={() => onPreview(proposal)}
                title="Visualizar proposta rapidamente"
                aria-label={`Visualizar rapidamente ${proposal.title}`}
                className="min-h-11 px-3 rounded-xl bg-background border border-border/70 hover:border-primary/50 text-foreground inline-flex items-center gap-2 text-xs font-semibold cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring min-w-0"
              >
                <Plane className="size-3.5 text-primary shrink-0" aria-hidden />
                <span className="break-words whitespace-normal text-left">
                  {proposal.destination_city || "Destino a definir"}
                </span>
              </button>
            </div>
            <CrudActionsMenu
              entityName="Proposta"
              editUrl={`/workspace/turismo/propostas/${proposal.id}`}
              viewUrl={publicHref}
              viewLabel="Abrir Página Própria"
              onDuplicate={() => onDuplicate(proposal)}
              onToggleStatus={
                proposal.status === "draft" ? () => onPublishDraft(proposal) : undefined
              }
              statusLabel={proposal.status === "draft" ? "Publicar Agora" : undefined}
              statusIcon={proposal.status === "draft" ? Send : undefined}
              onArchive={() => onToggleHidden(proposal)}
              archiveLabel={isHidden ? "Reexibir na Lista" : "Ocultar / Arquivar"}
              customActions={customMenuActions}
              onDelete={() => onDelete(proposal.id)}
              deleteTitle="Excluir proposta permanentemente?"
              deleteDescription={`Tem certeza que deseja excluir "${proposal.title}"?`}
              triggerClassName="size-11 min-h-11 min-w-11 rounded-xl shrink-0"
            />
          </div>
        )}

        {proposal.cover_image_url && (
          <div className="px-4 py-2 flex items-center justify-between gap-2 border-t border-border/40 bg-card/90">
            <div className="flex items-center gap-2">
              <Checkbox
                checked={isSelected}
                onCheckedChange={() => onToggleSelect(proposal.id)}
                aria-label={`Selecionar ${proposal.title}`}
              />
              <span className="text-xs font-semibold text-foreground">
                {proposal.destination_city || "Destino a definir"}
              </span>
            </div>
            <CrudActionsMenu
              entityName="Proposta"
              editUrl={`/workspace/turismo/propostas/${proposal.id}`}
              viewUrl={publicHref}
              viewLabel="Abrir Página Própria"
              onDuplicate={() => onDuplicate(proposal)}
              onToggleStatus={
                proposal.status === "draft" ? () => onPublishDraft(proposal) : undefined
              }
              statusLabel={proposal.status === "draft" ? "Publicar Agora" : undefined}
              statusIcon={proposal.status === "draft" ? Send : undefined}
              onArchive={() => onToggleHidden(proposal)}
              archiveLabel={isHidden ? "Reexibir na Lista" : "Ocultar / Arquivar"}
              customActions={customMenuActions}
              onDelete={() => onDelete(proposal.id)}
              deleteTitle="Excluir proposta permanentemente?"
              deleteDescription={`Tem certeza que deseja excluir "${proposal.title}"?`}
              triggerClassName="size-11 min-h-11 min-w-11 rounded-xl shrink-0"
            />
          </div>
        )}
      </div>

      {/* Corpo Principal */}
      <div className="p-4 space-y-3 flex-1 flex flex-col justify-between">
        <div className="space-y-3">
          {/* Status + Privacidade */}
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
              {visibilityMeta.label}
            </Badge>
            {proposal.options && proposal.options.length > 1 && (
              <Badge variant="secondary" className="text-xs font-mono">
                <Layers className="size-3 mr-1" aria-hidden />
                {proposal.options.length} opções
              </Badge>
            )}
          </div>

          {/* Título Editável Inline via Duplo Clique */}
          <ProposalInlineTitle
            proposalId={proposal.id}
            initialTitle={proposal.title}
            onSaveTitle={onRenameTitle}
          />

          {/* Cliente & Metadados */}
          <div className="space-y-2 text-xs text-muted-foreground">
            <div className="flex items-center justify-between gap-2">
              <span className="font-medium text-foreground break-words whitespace-normal">
                {proposal.client_name || "Cliente não informado"}
              </span>
              {proposal.client_whatsapp && (
                <a
                  href={waShareUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-mono text-emerald-700 dark:text-emerald-300 hover:underline inline-flex items-center gap-1 shrink-0 min-h-11 -my-3 py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
                >
                  <MessageCircle className="size-3" aria-hidden />
                  <span>{proposal.client_whatsapp}</span>
                </a>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-1">
              <span className="inline-flex items-center gap-1 font-mono tabular-nums">
                <Calendar className="size-3.5" aria-hidden />
                {dateRange}
              </span>
              <span className="inline-flex items-center gap-1">
                <Users className="size-3.5" aria-hidden />
                {paxLabel}
              </span>
            </div>
          </div>
        </div>

        {/* Valor & Validade */}
        <div className="pt-3 border-t border-border/50 flex items-end justify-between gap-2">
          <div>
            <span className="text-xs text-muted-foreground block">Investimento</span>
            <span className="text-lg font-bold font-mono tabular-nums text-foreground">
              {priceInfo.primaryPrice}
            </span>
            {priceInfo.optionsHint && (
              <span className="text-xs text-muted-foreground block">{priceInfo.optionsHint}</span>
            )}
          </div>
          <div className="text-right space-y-1">
            <span
              className={cn(
                "text-xs font-mono tabular-nums block",
                validity.isExpired
                  ? "text-rose-600 dark:text-rose-400 font-semibold"
                  : "text-muted-foreground",
              )}
            >
              {validity.label}
            </span>
            {(proposal.views_count || 0) > 0 && (
              <span className="text-xs font-mono text-muted-foreground block">
                {proposal.views_count} visualizações
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Rodapé de Ações Rápidas (Sem Botões Primários Concorrentes) */}
      <div className="px-3 py-2 bg-muted/30 border-t border-border/50 flex items-center justify-between gap-1 flex-wrap">
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant={isPrivate ? "outline" : "ghost"}
            onClick={() => onTogglePrivate(proposal)}
            title={isPrivate ? "Tornar pública" : "Privar proposta"}
            aria-label={isPrivate ? "Tornar pública" : "Privar proposta"}
            className={cn(
              "size-11 min-h-11 min-w-11 p-0 rounded-lg cursor-pointer focus-visible:ring-2 focus-visible:ring-ring",
              isPrivate && "border-rose-500/40 bg-rose-500/10 text-rose-700 dark:text-rose-300",
            )}
          >
            {isPrivate ? <Lock className="size-4" /> : <Globe className="size-4" />}
          </Button>

          <Button
            type="button"
            variant={isHidden ? "outline" : "ghost"}
            onClick={() => onToggleHidden(proposal)}
            title={isHidden ? "Reexibir proposta" : "Ocultar proposta"}
            aria-label={isHidden ? "Reexibir proposta" : "Ocultar proposta"}
            className="size-11 min-h-11 min-w-11 p-0 rounded-lg cursor-pointer focus-visible:ring-2 focus-visible:ring-ring"
          >
            {isHidden ? <ArchiveRestore className="size-4" /> : <EyeOff className="size-4" />}
          </Button>

          <Button
            type="button"
            variant={isPassword ? "outline" : "ghost"}
            onClick={() => onOpenSecurityDialog(proposal)}
            title={isPassword ? "Gerenciar senha" : "Proteger com senha"}
            aria-label="Definir senha"
            className={cn(
              "size-11 min-h-11 min-w-11 p-0 rounded-lg cursor-pointer focus-visible:ring-2 focus-visible:ring-ring",
              isPassword && "border-warning/40 bg-warning/10 text-warning-strong",
            )}
          >
            <KeyRound className="size-4" />
          </Button>
        </div>

        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            onClick={() => onCopyLink(proposal)}
            title="Copiar link público"
            aria-label={`Copiar link de ${proposal.title}`}
            className="size-11 min-h-11 min-w-11 p-0 rounded-lg cursor-pointer focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Copy className="size-4" />
          </Button>

          <Button
            asChild
            variant="ghost"
            title="Abrir página própria"
            className="size-11 min-h-11 min-w-11 p-0 rounded-lg cursor-pointer focus-visible:ring-2 focus-visible:ring-ring"
          >
            <a
              href={publicHref}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Abrir página pública de ${proposal.title}`}
            >
              <ExternalLink className="size-4" />
            </a>
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                disabled={isExporting}
                title="Exportar PDF / PNG / JSON"
                aria-label={`Exportar ${proposal.title}`}
                className="size-11 min-h-11 min-w-11 p-0 rounded-lg cursor-pointer focus-visible:ring-2 focus-visible:ring-ring"
              >
                <Download className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52 rounded-xl">
              <DropdownMenuLabel className="text-xs text-muted-foreground">
                Exportar Proposta
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => onExportPdf(proposal)}
                className="min-h-11 cursor-pointer gap-2"
              >
                <FileText className="size-4 text-rose-600 dark:text-rose-400" />
                <span>Baixar PDF</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => onExportPng(proposal)}
                className="min-h-11 cursor-pointer gap-2"
              >
                <ImageIcon className="size-4 text-primary" />
                <span>Baixar PNG</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => onExportJson(proposal)}
                className="min-h-11 cursor-pointer gap-2"
              >
                <FileCode2 className="size-4 text-muted-foreground" />
                <span>Baixar JSON</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button
            asChild
            variant="outline"
            className="h-11 min-h-11 px-3 rounded-lg text-xs font-semibold gap-2 cursor-pointer focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Link
              to="/workspace/turismo/propostas/$id"
              params={{ id: proposal.id }}
            >
              <PenSquare className="size-3.5" />
              <span>Studio</span>
            </Link>
          </Button>
        </div>
      </div>
    </article>
  );
}
