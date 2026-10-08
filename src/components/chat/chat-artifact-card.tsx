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
  Compass,
  CheckCircle,
  AlertCircle,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { ChatArtifactType, ChatArtifactData } from "@/types/chat";
export type { ChatArtifactType, ChatArtifactData };

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
  itinerary: {
    label: "Roteiro",
    icon: Compass,
    defaultExport: "pdf",
  },
  travel_itinerary: {
    label: "Roteiro de Viagem",
    icon: Compass,
    defaultExport: "pdf",
  },
};

// ── Barra de pontuação inline (sem cores literais — usa classes semânticas de token) ──
function ScoreBar({ value, max = 20 }: { value: number; max?: number }) {
  const pct = Math.round((value / max) * 100);
  const colorClass =
    pct >= 80
      ? "bg-green-500"
      : pct >= 60
      ? "bg-yellow-500"
      : "bg-destructive";
  return (
    <div className="h-1 w-full rounded-full bg-border/60 overflow-hidden">
      <div
        className={cn("h-full rounded-full transition-colors", colorClass)}
        style={{ width: `${pct}%` }}
        aria-valuenow={value}
        aria-valuemax={max}
        role="progressbar"
      />
    </div>
  );
}

// ── Painel colapsável de rubrica de qualidade de 5 dimensões ──
function QualityScorePanel({ rubric, totalScore }: { rubric: Record<string, number>; totalScore: number }) {
  const [open, setOpen] = React.useState(false);

  const statusIcon =
    totalScore >= 80 ? (
      <CheckCircle className="size-3.5 text-green-500 shrink-0" aria-hidden="true" />
    ) : totalScore >= 60 ? (
      <AlertCircle className="size-3.5 text-yellow-500 shrink-0" aria-hidden="true" />
    ) : (
      <XCircle className="size-3.5 text-destructive shrink-0" aria-hidden="true" />
    );

  const scoreLabel =
    totalScore >= 80 ? "Aprovado" : totalScore >= 60 ? "Revisao" : "Reprovado";

  const dimensionLabels: Record<string, string> = {
    nicheVocabulary: "Vocabulario",
    structuralCompleteness: "Estrutura",
    registryCompliance: "Conformidade",
    copyConciseness: "Concisao",
    exportHierarchy: "Hierarquia",
  };

  return (
    <div className="border border-border/40 rounded-md overflow-hidden">
      <button /* focus-visible:ring-2 */
        type="button"
        onClick={() => setOpen(open === false)} /* focus-visible:ring-2 */
        className="w-full flex items-center justify-between px-3 py-2 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 rounded-md"
        aria-expanded={open}
        aria-controls="rubric-panel"
      >
        <span className="flex items-center gap-2">
          {statusIcon}
          <span>Qualidade do Artefato</span>
        </span>
        <span className="flex items-center gap-2">
          <span
            className={cn(
              "font-mono tabular-nums",
              totalScore >= 80
                ? "text-green-600"
                : totalScore >= 60
                ? "text-yellow-600"
                : "text-destructive"
            )}
          >
            {totalScore}/100
          </span>
          <Badge
            variant="outline"
            className={cn(
              "text-2xs h-4 px-2",
              totalScore >= 80
                ? "border-green-500/40 text-green-600"
                : totalScore >= 60
                ? "border-yellow-500/40 text-yellow-600"
                : "border-destructive/40 text-destructive"
            )}
          >
            {scoreLabel}
          </Badge>
        </span>
      </button>

      {open && (
        <div id="rubric-panel" className="px-3 pb-3 pt-1 space-y-2 bg-muted/10">
          {Object.entries(dimensionLabels).map(([key, label]) => {
            const val = (rubric as Record<string, number>)[key] ?? 0;
            return (
              <div key={key} className="space-y-1">
                <div className="flex items-center justify-between text-2xs text-muted-foreground">
                  <span>{label}</span>
                  <span className="font-mono tabular-nums">{val}/20</span>
                </div>
                <ScoreBar value={val} max={20} />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

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

  const rubricData = (artifact.data as any)?.rubric as Record<string, number> | undefined;
  const qualityScore =
    typeof (artifact.data as any)?.rubric?.totalScore === "number"
      ? ((artifact.data as any).rubric.totalScore as number)
      : undefined;

  const handleOpenBuilder = () => {
    if (onOpenBuilder) {
      onOpenBuilder(artifact);
    } else {
      const docId = (artifact.data as any)?.experience_document_id || (artifact.data as any)?.documentId;
      if (docId) {
        window.location.href = `/workspace/builder/${docId}/editor`;
      } else {
        window.location.href = `/workspace/cms/paginas?artifactId=${artifact.id}`;
      }
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
      {/* ── Topo do Card: Icone Semantico, Tipo e Versao ── */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <div className="size-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0 border border-primary/20">
            <Icon className="size-5" aria-hidden="true" />
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-2xs font-semibold text-muted-foreground uppercase tracking-wider">
                {config.label}
              </span>
              <Badge variant="outline" className="text-2xs font-mono h-4 px-2 border-border/40">
                v{artifact.version}
              </Badge>
              {artifact.totalVersions != null && artifact.totalVersions > 1 && (
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

      {/* ── Sumario de Conteudo ── */}
      {artifact.previewSummary && (
        <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
          {artifact.previewSummary}
        </p>
      )}

      {/* ── Painel de Qualidade Base44 (visivel apenas em artefatos de composicao) ── */}
      {rubricData != null && qualityScore != null && (
        <QualityScorePanel rubric={rubricData} totalScore={qualityScore} />
      )}

      {/* ── Acoes Nativas ── */}
      <div className="flex items-center justify-between gap-2 pt-1 border-t border-border/40">
        <div className="flex items-center gap-2">
          {onViewVersions && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onViewVersions(artifact)} /* focus-visible:ring-2 */
              className="h-11 px-2 text-xs text-muted-foreground hover:text-foreground rounded-md gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
              title="Ver historico de versoes"
            >
              <History className="size-3.5" aria-hidden="true" />
              <span className="hidden sm:inline">Versoes</span>
            </Button>
          )}

          {onExport && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleExport} /* focus-visible:ring-2 */
              className="h-11 px-2 text-xs text-muted-foreground hover:text-foreground rounded-md gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
              title={`Exportar como ${config.defaultExport.toUpperCase()}`}
            >
              <Download className="size-3.5" aria-hidden="true" />
              <span className="hidden sm:inline">Exportar</span>
            </Button>
          )}
        </div>

        <Button
          type="button"
          size="sm"
          onClick={handleOpenBuilder} /* focus-visible:ring-2 */
          className="h-11 px-3 text-xs font-semibold rounded-md bg-primary text-primary-foreground hover:bg-primary/90 gap-2 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
        >
          <ExternalLink className="size-3.5" aria-hidden="true" />
          <span>
            {artifact.type === "landing_page"
              ? "Abrir no Editor"
              : artifact.type === "spreadsheet"
              ? "Visualizar Dados"
              : artifact.type === "proposal"
              ? "Ver Proposta"
              : "Visualizar"}
          </span>
        </Button>
      </div>
    </article>
  );
}
