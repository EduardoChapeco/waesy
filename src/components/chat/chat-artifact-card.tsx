import React from "react";
import {
  FileText,
  Table,
  Presentation,
  Layout,
  FileCheck,
  Image,
  ExternalLink,
  Download,
  History,
  Layers,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export type ChatArtifactType =
  | "document"
  | "spreadsheet"
  | "presentation"
  | "landing_page"
  | "proposal"
  | "image";

export interface ChatArtifactData {
  id: string;
  type: ChatArtifactType;
  title: string;
  version: number;
  totalVersions?: number;
  authorName?: string;
  authorRole?: string;
  updatedAt?: string;
  previewSummary?: string;
  data?: Record<string, any>;
  fileSizeBytes?: number;
}

export interface ChatArtifactCardProps {
  artifact: ChatArtifactData;
  onOpenBuilder?: (artifact: ChatArtifactData) => void;
  onExport?: (artifact: ChatArtifactData, format: "pdf" | "csv" | "json" | "png") => void;
  onViewVersions?: (artifact: ChatArtifactData) => void;
  className?: string;
}

const ARTIFACT_TYPE_CONFIG: Record<
  ChatArtifactType,
  { label: string; icon: React.ElementType; defaultExport: "pdf" | "csv" | "json" | "png" }
> = {
  document: {
    label: "Documento",
    icon: FileText,
    defaultExport: "pdf",
  },
  spreadsheet: {
    label: "Planilha",
    icon: Table,
    defaultExport: "csv",
  },
  presentation: {
    label: "Apresentação",
    icon: Presentation,
    defaultExport: "pdf",
  },
  landing_page: {
    label: "Landing Page",
    icon: Layout,
    defaultExport: "json",
  },
  proposal: {
    label: "Proposta Comercial",
    icon: FileCheck,
    defaultExport: "pdf",
  },
  image: {
    label: "Imagem Gerada",
    icon: Image,
    defaultExport: "png",
  },
};

export function ChatArtifactCard({
  artifact,
  onOpenBuilder,
  onExport,
  onViewVersions,
  className,
}: ChatArtifactCardProps) {
  const config = ARTIFACT_TYPE_CONFIG[artifact.type] || {
    label: "Artefato",
    icon: Layers,
    defaultExport: "json",
  };
  const Icon = config.icon;

  const handleOpenBuilder = () => {
    if (onOpenBuilder) {
      onOpenBuilder(artifact);
    } else {
      window.location.href = `/workspace/builder?artifactId=${artifact.id}`;
    }
  };

  const handleExport = () => {
    if (onExport) {
      onExport(artifact, config.defaultExport);
    }
  };

  return (
    <article
      role="article"
      aria-label={`Artefato: ${artifact.title}`}
      className={cn(
        "rounded-lg border border-border/70 bg-card p-3 space-y-3 text-card-foreground hover:border-border transition-colors",
        className
      )}
    >
      {/* ── Topo do Card: Ícone Semântico, Tipo e Versão ── */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <div className="size-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0 border border-primary/20">
            <Icon className="size-5" />
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-2xs font-semibold text-muted-foreground uppercase tracking-wider">
                {config.label}
              </span>
              <Badge variant="outline" className="text-2xs font-mono h-4 px-2 border-border/40">
                v{artifact.version}
              </Badge>
              {artifact.totalVersions && artifact.totalVersions > 1 && (
                <span className="text-2xs text-muted-foreground font-mono">
                  de {artifact.totalVersions}
                </span>
              )}
            </div>

            <h3 className="text-sm font-semibold text-foreground truncate mt-1">
              {artifact.title}
            </h3>
          </div>
        </div>

        {artifact.authorName && (
          <div className="text-right shrink-0">
            <span className="text-2xs text-muted-foreground block truncate">
              {artifact.authorName}
            </span>
            {artifact.authorRole && (
              <span className="text-2xs text-primary font-medium block truncate">
                {artifact.authorRole}
              </span>
            )}
          </div>
        )}
      </div>

      {/* ── Sumário do Conteúdo / Resumo ── */}
      {artifact.previewSummary && (
        <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
          {artifact.previewSummary}
        </p>
      )}

      {/* ── Ações Nativas: Abrir no Builder e Exportar ── */}
      <div className="flex items-center justify-between gap-2 pt-1 border-t border-border/40">
        <div className="flex items-center gap-2">
          {onViewVersions && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onViewVersions(artifact)} /* focus-visible:ring-2 */
              className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground rounded-md gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
              title="Ver histórico de versões"
            >
              <History className="size-3.5" />
              <span className="hidden sm:inline">Versões</span>
            </Button>
          )}

          {onExport && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleExport} /* focus-visible:ring-2 */
              className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground rounded-md gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
              title={`Exportar como ${config.defaultExport.toUpperCase()}`}
            >
              <Download className="size-3.5" />
              <span className="hidden sm:inline">Exportar</span>
            </Button>
          )}
        </div>

        <Button
          type="button"
          size="sm"
          onClick={handleOpenBuilder} /* focus-visible:ring-2 */
          className="h-8 px-3 text-xs font-semibold rounded-md bg-primary text-primary-foreground hover:bg-primary/90 gap-2 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
        >
          <ExternalLink className="size-3.5" />
          <span>Abrir no Builder</span>
        </Button>
      </div>
    </article>
  );
}
