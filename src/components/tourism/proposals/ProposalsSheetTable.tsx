import React, { useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  Archive,
  ArchiveRestore,
  Briefcase,
  CheckCircle2,
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
  ShieldCheck,
  Users,
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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

export interface ProposalActionHandlers {
  selectedIds: string[];
  exportingKey?: string | null;
  onToggleSelect: (id: string) => void;
  onToggleSelectAll?: () => void;
  isAllSelected?: boolean;
  onPreview: (proposal: TravelProposalDTO) => void;
  onRenameTitle: (id: string, title: string) => Promise<void> | void;
  onCopyLink: (proposal: TravelProposalDTO) => void;
  onTogglePrivate: (proposal: TravelProposalDTO) => void;
  onToggleHidden: (proposal: TravelProposalDTO) => void;
  onOpenSecurityDialog: (proposal: TravelProposalDTO) => void;
  onPublishDraft: (proposal: TravelProposalDTO) => void;
  onDuplicate: (proposal: TravelProposalDTO) => void;
  onOpenWhatsappModal: (proposal: TravelProposalDTO) => void;
  onExportPdf: (proposal: TravelProposalDTO) => void;
  onExportPng: (proposal: TravelProposalDTO) => void;
  onExportJson: (proposal: TravelProposalDTO) => void;
  onConvertToTrip: (proposal: TravelProposalDTO) => void;
  onDelete: (id: string) => Promise<void> | void;
}

/**
 * Dense Apple-style Spreadsheet (Sheet) table for Travel Proposals.
 * One row per package with inline title rename, instant visibility/privacy toggles,
 * quick preview on icon click, fast PDF/PNG/JSON export, and overflow CrudActionsMenu.
 */
export function ProposalsSheetTable({
  proposals,
  selectedIds,
  exportingKey,
  onToggleSelect,
  onToggleSelectAll,
  isAllSelected = false,
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
}: ProposalActionHandlers & { proposals: TravelProposalDTO[] }) {
  const [originUrl] = useState(() =>
    typeof window !== "undefined" ? window.location.origin : "",
  );

  return (
    <div className="rounded-2xl border border-border/70 bg-card overflow-hidden">
      <div className="overflow-x-auto scroll-area-carousel native-scroll">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40 hover:bg-muted/40">
              <TableHead className="w-12 text-center">
                <Checkbox
                  checked={isAllSelected}
                  onCheckedChange={() => onToggleSelectAll?.()}
                  aria-label="Selecionar todas as propostas"
                />
              </TableHead>
              <TableHead className="w-14 text-center">Lâmina</TableHead>
              <TableHead>Proposta &amp; Roteiro (duplo clique edita)</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Valor &amp; Validade</TableHead>
              <TableHead>Acesso &amp; Privacidade</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações &amp; Exportar</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {proposals.map((proposal) => {
              const isSelected = selectedIds.includes(proposal.id);
              const statusMeta = getProposalStatusMeta(proposal);
              const visibilityMeta = getProposalVisibilityMeta(proposal);
              const priceInfo = formatProposalTotalAndRange(proposal);
              const validity = getProposalValidityLabel(proposal);
              const dateRange = formatProposalDateRange(
                proposal.travel_start_date,
                proposal.travel_end_date,
              );
              const paxLabel = formatProposalPaxSummary(
                proposal.adults_count,
                proposal.children_count,
              );
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
                  id: "whatsapp-modal",
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
                <TableRow
                  key={proposal.id}
                  className={cn(
                    "transition-colors",
                    isSelected ? "bg-primary/5 hover:bg-primary/10" : "hover:bg-muted/30",
                    isHidden && "opacity-75",
                  )}
                >
                  {/* 1. Seleção */}
                  <TableCell className="text-center align-middle">
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => onToggleSelect(proposal.id)}
                      aria-label={`Selecionar ${proposal.title}`}
                    />
                  </TableCell>

                  {/* 2. Ícone / Miniatura -> Visualização Rápida ao Clicar */}
                  <TableCell className="text-center align-middle">
                    <button
                      type="button"
                      onClick={() => onPreview(proposal)}
                      title="Visualizar proposta rapidamente"
                      aria-label={`Visualizar rapidamente ${proposal.title}`}
                      className="size-11 min-h-11 min-w-11 rounded-xl overflow-hidden border border-border/70 bg-muted/50 hover:border-primary/50 hover:bg-primary/10 inline-flex items-center justify-center transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      {proposal.cover_image_url ? (
                        <img
                          src={proposal.cover_image_url}
                          alt=""
                          className="size-11 object-cover"
                        />
                      ) : (
                        <Plane className="size-4 text-primary" aria-hidden />
                      )}
                    </button>
                  </TableCell>

                  {/* 3. Título Inline Editável & Contexto de Viagem */}
                  <TableCell className="max-w-sm align-middle py-3">
                    <div className="space-y-1">
                      <ProposalInlineTitle
                        proposalId={proposal.id}
                        initialTitle={proposal.title}
                        onSaveTitle={onRenameTitle}
                      />
                      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        <span className="font-medium text-foreground">
                          {proposal.destination_city || "Destino a definir"}
                        </span>
                        <span aria-hidden>·</span>
                        <span className="font-mono tabular-nums">{dateRange}</span>
                        <span aria-hidden>·</span>
                        <span className="inline-flex items-center gap-1">
                          <Users className="size-3" aria-hidden />
                          {paxLabel}
                        </span>
                        {proposal.options && proposal.options.length > 1 && (
                          <Badge variant="secondary" className="text-xs px-2 py-0 font-mono">
                            <Layers className="size-3 mr-1" aria-hidden />
                            {proposal.options.length} opções
                          </Badge>
                        )}
                        {proposal.quote_id && proposal.quote_id !== proposal.id && (
                          <Badge variant="outline" className="text-xs px-2 py-0">
                            Cotação vinculada
                          </Badge>
                        )}
                      </div>
                    </div>
                  </TableCell>

                  {/* 4. Cliente / Contato */}
                  <TableCell className="align-middle">
                    <div className="space-y-1 max-w-48">
                      <div className="text-sm font-medium text-foreground break-words whitespace-normal">
                        {proposal.client_name || "Cliente não informado"}
                      </div>
                      {proposal.client_whatsapp ? (
                        <a
                          href={waShareUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs font-mono text-emerald-700 dark:text-emerald-300 hover:underline inline-flex items-center gap-1 min-h-11 -my-2 py-2 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          title="Enviar mensagem no WhatsApp"
                        >
                          <MessageCircle className="size-3 shrink-0" aria-hidden />
                          <span>{proposal.client_whatsapp}</span>
                        </a>
                      ) : (
                        <span className="text-xs text-muted-foreground block">Sem WhatsApp</span>
                      )}
                    </div>
                  </TableCell>

                  {/* 5. Valor & Validade */}
                  <TableCell className="align-middle">
                    <div className="space-y-1">
                      <div className="text-sm font-bold font-mono tabular-nums text-foreground">
                        {priceInfo.primaryPrice}
                      </div>
                      {priceInfo.optionsHint && (
                        <div className="text-xs text-muted-foreground">
                          {priceInfo.optionsHint}
                        </div>
                      )}
                      <div
                        className={cn(
                          "text-xs font-mono tabular-nums",
                          validity.isExpired
                            ? "text-rose-600 dark:text-rose-400 font-semibold"
                            : "text-muted-foreground",
                        )}
                      >
                        {validity.label}
                      </div>
                    </div>
                  </TableCell>

                  {/* 6. Controles Diretos de Privacidade, Ocultar e Senha */}
                  <TableCell className="align-middle">
                    <div className="flex items-center gap-1">
                      <Button
                        type="button"
                        variant={isPrivate ? "outline" : "ghost"}
                        onClick={() => onTogglePrivate(proposal)}
                        title={
                          isPrivate
                            ? "Proposta privada (clique para tornar pública)"
                            : "Tornar privada (bloqueia acesso externo)"
                        }
                        aria-label={isPrivate ? "Tornar pública" : "Privar proposta"}
                        className={cn(
                          "size-11 min-h-11 min-w-11 p-0 rounded-lg cursor-pointer focus-visible:ring-2 focus-visible:ring-ring",
                          isPrivate
                            ? "border-rose-500/40 bg-rose-500/10 text-rose-700 dark:text-rose-300"
                            : "text-muted-foreground hover:text-foreground",
                        )}
                      >
                        {isPrivate ? <Lock className="size-4" /> : <Globe className="size-4" />}
                      </Button>

                      <Button
                        type="button"
                        variant={isHidden ? "outline" : "ghost"}
                        onClick={() => onToggleHidden(proposal)}
                        title={
                          isHidden
                            ? "Proposta oculta (clique para reexibir)"
                            : "Ocultar proposta da lista ativa"
                        }
                        aria-label={isHidden ? "Reexibir proposta" : "Ocultar proposta"}
                        className={cn(
                          "size-11 min-h-11 min-w-11 p-0 rounded-lg cursor-pointer focus-visible:ring-2 focus-visible:ring-ring",
                          isHidden
                            ? "border-border bg-muted text-foreground"
                            : "text-muted-foreground hover:text-foreground",
                        )}
                      >
                        {isHidden ? <ArchiveRestore className="size-4" /> : <EyeOff className="size-4" />}
                      </Button>

                      <Button
                        type="button"
                        variant={isPassword ? "outline" : "ghost"}
                        onClick={() => onOpenSecurityDialog(proposal)}
                        title={
                          isPassword
                            ? "Protegida com senha (clique para editar PIN)"
                            : "Restringir apenas com senha (PIN)"
                        }
                        aria-label={isPassword ? "Gerenciar senha da proposta" : "Definir senha da proposta"}
                        className={cn(
                          "size-11 min-h-11 min-w-11 p-0 rounded-lg cursor-pointer focus-visible:ring-2 focus-visible:ring-ring",
                          isPassword
                            ? "border-warning/40 bg-warning/10 text-warning-strong"
                            : "text-muted-foreground hover:text-foreground",
                        )}
                      >
                        <KeyRound className="size-4" />
                      </Button>
                    </div>
                  </TableCell>

                  {/* 7. Status & Acessos */}
                  <TableCell className="align-middle">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge
                          variant={statusMeta.badgeVariant}
                          className={cn("text-xs font-semibold", statusMeta.badgeClassName)}
                        >
                          {statusMeta.label}
                        </Badge>
                        {(isPrivate || isPassword || proposal.visibility_mode === "link_only") && (
                          <Badge
                            variant="outline"
                            className={cn("text-xs font-medium", visibilityMeta.toneClassName)}
                          >
                            {visibilityMeta.shortLabel}
                          </Badge>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground font-mono tabular-nums">
                        {(proposal.views_count || 0) > 0
                          ? `${proposal.views_count} acessos`
                          : "Sem acessos ainda"}
                      </div>
                    </div>
                  </TableCell>

                  {/* 8. Ações Rápidas & Exportação */}
                  <TableCell className="align-middle text-right">
                    <div className="inline-flex items-center justify-end gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => onPreview(proposal)}
                        title="Visualização rápida sem sair da página"
                        aria-label={`Visualizar ${proposal.title}`}
                        className="size-11 min-h-11 min-w-11 p-0 rounded-lg text-muted-foreground hover:text-foreground cursor-pointer focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        <Eye className="size-4" />
                      </Button>

                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => onCopyLink(proposal)}
                        title="Copiar link da proposta"
                        aria-label={`Copiar link de ${proposal.title}`}
                        className="size-11 min-h-11 min-w-11 p-0 rounded-lg text-muted-foreground hover:text-foreground cursor-pointer focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        <Copy className="size-4" />
                      </Button>

                      <Button
                        asChild
                        variant="ghost"
                        title="Abrir página própria do cliente em nova aba"
                        className="size-11 min-h-11 min-w-11 p-0 rounded-lg text-muted-foreground hover:text-foreground cursor-pointer focus-visible:ring-2 focus-visible:ring-ring"
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
                            title="Exportar rápido (PDF / PNG / JSON)"
                            aria-label={`Exportar ${proposal.title}`}
                            className="size-11 min-h-11 min-w-11 p-0 rounded-lg text-muted-foreground hover:text-foreground cursor-pointer focus-visible:ring-2 focus-visible:ring-ring"
                          >
                            <Download className="size-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-52 rounded-xl">
                          <DropdownMenuLabel className="text-xs text-muted-foreground">
                            Exportação Rápida
                          </DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => onExportPdf(proposal)}
                            className="min-h-11 cursor-pointer gap-2"
                          >
                            <FileText className="size-4 text-rose-600 dark:text-rose-400" />
                            <span>Baixar PDF (Lâmina)</span>
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => onExportPng(proposal)}
                            className="min-h-11 cursor-pointer gap-2"
                          >
                            <ImageIcon className="size-4 text-primary" />
                            <span>Baixar PNG (Imagem)</span>
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => onExportJson(proposal)}
                            className="min-h-11 cursor-pointer gap-2"
                          >
                            <FileCode2 className="size-4 text-muted-foreground" />
                            <span>Baixar JSON Estruturado</span>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>

                      <Button
                        asChild
                        variant="outline"
                        title="Editar layout e itens no Studio completo"
                        className="h-11 min-h-11 px-3 rounded-lg text-xs font-semibold gap-2 cursor-pointer focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        <Link
                          to="/workspace/turismo/propostas/$id"
                          params={{ id: proposal.id }}
                        >
                          <PenSquare className="size-3.5" />
                          <span className="hidden xl:inline">Studio</span>
                        </Link>
                      </Button>

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
                        statusIcon={proposal.status === "draft" ? Send : CheckCircle2}
                        onArchive={() => onToggleHidden(proposal)}
                        archiveLabel={isHidden ? "Reexibir na Lista" : "Ocultar / Arquivar"}
                        customActions={customMenuActions}
                        onDelete={() => onDelete(proposal.id)}
                        deleteTitle="Excluir proposta permanentemente?"
                        deleteDescription={`Tem certeza que deseja excluir "${proposal.title}"? Propostas já aceitas são preservadas por segurança fiscal.`}
                        triggerClassName="size-11 min-h-11 min-w-11 rounded-lg"
                      />
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
