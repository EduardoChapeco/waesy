import React, { useState } from "react";
import {
  ArrowLeft,
  X,
  Printer,
  Copy,
  ExternalLink,
  Download,
  Check,
  Layers,
  FileText,
  Table,
  Compass,
  Building2,
  FileCode,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { ChatArtifactData } from "@/types/chat";
import {
  ArtifactChart,
  ArtifactInteractiveTable,
  ArtifactBiolinkCluster,
  ArtifactTravelDossier,
  ArtifactBuilderEditor,
} from "./artifacts";

export interface CopilotArtifactPanelProps {
  artifact: ChatArtifactData | null;
  onClose: () => void;
  onOpenBuilder?: (artifact: ChatArtifactData) => void;
  onSave?: (updatedArtifact: ChatArtifactData) => void;
  className?: string;
}

export function CopilotArtifactPanel({
  artifact,
  onClose,
  onOpenBuilder,
  onSave,
  className,
}: CopilotArtifactPanelProps) {
  const [copied, setCopied] = useState(false);

  if (!artifact) {
    return (
      <div className={cn("p-6 text-center text-muted-foreground space-y-2", className)}>
        <Layers className="size-8 text-muted-foreground/30 mx-auto" aria-hidden="true" />
        <h4 className="text-xs font-semibold text-foreground">Painel de Artefatos Vivos</h4>
        <p className="text-2xs max-w-xs mx-auto">
          Nenhum artefato selecionado. Peça ao Copilot para criar planilhas, roteiros, documentos ou gráficos.
        </p>
      </div>
    );
  }

  const handleCopyContent = () => {
    const rawData = JSON.stringify(artifact.data || artifact, null, 2);
    navigator.clipboard.writeText(rawData);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleOpenExternal = () => {
    if (onOpenBuilder) {
      onOpenBuilder(artifact);
    } else {
      const docId = artifact.data?.documentId || artifact.id;
      window.location.assign(`/workspace/builder?doc=${encodeURIComponent(String(docId))}`);
    }
  };

  const data = artifact.data || {};
  const isChart =
    artifact.type === ("chart" as any) ||
    data.chartType ||
    (Array.isArray(data.series) && data.series.length > 0);
  const isTable =
    artifact.type === "spreadsheet" ||
    artifact.type === ("interactive_table" as any) ||
    Boolean(data.headers && (data.rows || data.dataRows));
  const isBiolink =
    artifact.type === ("biolink_cluster" as any) ||
    (Array.isArray(data.places) && data.places.length > 0);
  const isTravel =
    artifact.type === "travel_itinerary" ||
    artifact.type === "itinerary" ||
    artifact.type === ("travel_dossier" as any) ||
    Boolean(data.destination);

  return (
    <div className={cn("flex flex-col h-full bg-card space-y-3", className)}>
      {/* Barra de Topo do Painel */}
      <div className="flex items-center justify-between border-b border-border/40 pb-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onClose}
          className="h-11 min-h-11 px-3 text-xs text-muted-foreground hover:text-foreground flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary cursor-pointer"
        >
          <ArrowLeft className="size-4" />
          <span>Fechar</span>
        </Button>

        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-2xs font-mono h-5">
            v{artifact.version || 1}
          </Badge>
          <Badge variant="secondary" className="text-2xs uppercase tracking-wider font-semibold">
            {artifact.type}
          </Badge>
        </div>
      </div>

      {/* Título e Metadados do Artefato */}
      <div className="px-1">
        <h3 className="text-sm font-bold text-foreground leading-snug">{artifact.title}</h3>
        <p className="text-2xs text-muted-foreground mt-1">
          {artifact.authorName || "Waesy Copilot 3.0"} • {artifact.authorRole || "Artefato Versionado"}
        </p>
      </div>

      {artifact.previewSummary && (
        <div className="rounded-md border border-border/40 bg-muted/20 p-3 text-xs text-muted-foreground leading-relaxed mx-1">
          {artifact.previewSummary}
        </div>
      )}

      {/* Renderizadores de Generative UI conforme o Tipo de Artefato */}
      <div className="flex-1 overflow-y-auto no-scrollbar space-y-3 px-1">
        {isChart ? (
          <ArtifactChart
            title={artifact.title}
            subtitle={artifact.previewSummary}
            chartType={data.chartType || "bar"}
            data={data.chartData || data.data || []}
            xKey={data.xKey || "name"}
            yKey={data.yKey || "value"}
          />
        ) : isTable ? (
          <ArtifactInteractiveTable
            title={artifact.title}
            headers={data.headers || ["Item", "Valor", "Status"]}
            rows={data.dataRows || data.rows || []}
            summary={data.summary}
          />
        ) : isBiolink ? (
          <ArtifactBiolinkCluster
            title={artifact.title}
            subtitle={artifact.previewSummary}
            places={data.places || []}
          />
        ) : isTravel ? (
          <ArtifactTravelDossier
            destination={data.destination || artifact.title}
            daysCount={data.daysCount || 3}
            estimatedBudgetCents={data.estimatedBudgetCents || data.total_cents}
            hotelName={data.hotelName}
            hotelLocation={data.hotelLocation}
            pixKey={data.pixKey}
            pixCode={data.pixCode}
            days={data.days || []}
          />
        ) : (
          <ArtifactBuilderEditor
            documentId={data.documentId || artifact.id}
            docType={data.docType || artifact.type}
            title={artifact.title}
            initialContent={data}
            onSave={(updated) => {
              if (onSave) {
                onSave({
                  ...artifact,
                  data: { ...artifact.data, ...updated },
                });
              }
            }}
          />
        )}
      </div>

      {/* Ações Globais na Base do Painel */}
      <div className="grid grid-cols-2 gap-2 border-t border-border/40 pt-2 px-1">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleCopyContent}
          className="h-11 min-h-11 px-3 text-xs font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 cursor-pointer flex items-center justify-center gap-2"
        >
          {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
          <span>{copied ? "Copiado!" : "Copiar Dados"}</span>
        </Button>

        <Button
          type="button"
          variant="default"
          size="sm"
          onClick={handleOpenExternal}
          className="h-11 min-h-11 px-3 text-xs font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 cursor-pointer flex items-center justify-center gap-2"
        >
          <ExternalLink className="size-4" />
          <span>Abrir no Builder</span>
        </Button>
      </div>
    </div>
  );
}
