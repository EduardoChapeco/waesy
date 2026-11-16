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
import { toast } from "sonner";
import { saveStudioProject } from "@/services/studio.functions";
import { TOKEN_HEX } from "@/lib/design-tokens";
import {
  DEFAULT_TEXT_PROPERTIES,
  type StudioAspectRatio,
  type StudioElement,
} from "@/types/studio";
import {
  ArtifactChart,
  ArtifactInteractiveTable,
  ArtifactBiolinkCluster,
  ArtifactTravelDossier,
  ArtifactBuilderEditor,
  ArtifactDashboard,
  ArtifactInteractiveMap,
  ArtifactCreativePost,
  ArtifactWebPreview,
  ArtifactCodeSandbox,
} from "./artifacts";

export interface CopilotArtifactPanelProps {
  artifact: ChatArtifactData | null;
  onClose: () => void;
  onOpenBuilder?: (artifact: ChatArtifactData) => void;
  onRequestFix?: (errorMessage: string, artifact: ChatArtifactData) => void;
  onSave?: (updatedArtifact: ChatArtifactData) => void;
  className?: string;
}

export const COPILOT_ARTIFACT_TYPE_LABELS: Record<string, string> = {
  spreadsheet: "Planilha Comercial",
  document: "Documento",
  document_preview: "Prévia do Documento",
  presentation: "Apresentação",
  landing_page: "Página de Apresentação",
  website: "Site & Vitrine",
  web_app: "Aplicação Web",
  omnibuilder: "Estrutura Omni Builder",
  code: "Código & Script",
  social_post: "Publicação para Redes",
  creative_post: "Criativo & Publicação",
  carousel: "Carrossel de Criativos",
  image: "Imagem Gerada",
  video: "Vídeo Gerado",
  motion_video: "Vídeo Animado",
  itinerary: "Roteiro de Viagem",
  travel_itinerary: "Roteiro de Viagem",
  travel_dossier: "Dossiê de Viagem",
  biolink_cluster: "Central de Contatos",
  chart: "Gráfico Analítico",
  interactive_table: "Tabela Interativa",
  proposal: "Proposta Comercial",
  builder_bridge: "Estrutura do Documento",
  dashboard: "Painel de Indicadores",
  map_view: "Mapa Interativo",
  simlab_report: "Relatório de Simulação",
  business_plan: "Plano de Negócios",
  schedule_plan: "Plano de Rotinas",
};

const ARTIFACT_FRIENDLY_LABELS = COPILOT_ARTIFACT_TYPE_LABELS;

export function getSafeArtifactMediaUrl(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith("/")) return trimmed;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (/^data:image\/(?:png|jpeg|jpg|webp|gif);base64,/i.test(trimmed)) return trimmed;
  return null;
}

export function CopilotArtifactPanel({
  artifact,
  onClose,
  onOpenBuilder,
  onRequestFix,
  onSave,
  className,
}: CopilotArtifactPanelProps) {
  const [copied, setCopied] = useState(false);

  if (!artifact) {
    return (
      <div className={cn("p-6 text-center text-muted-foreground space-y-2", className)}>
        <Layers className="size-8 text-muted-foreground/30 mx-auto" aria-hidden="true" />
        <h4 className="text-xs font-semibold text-foreground">Painel de Documentos</h4>
        <p className="text-2xs max-w-xs mx-auto">
          Nenhum item selecionado. Peça ao Assessor para criar planilhas, roteiros, propostas comerciais ou documentos.
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

  const handleOpenCreativeInStudio = async (snapshot: Record<string, any>) => {
    try {
      const rawRatio = String(snapshot.aspectRatio || "1:1");
      const aspectRatio: StudioAspectRatio =
        rawRatio === "4:5" || rawRatio === "9:16" || rawRatio === "16:9" || rawRatio === "1.91:1"
          ? rawRatio
          : "1:1";
      const headline = String(snapshot.headline || artifact.title || "Criativo Copilot").slice(0, 140);
      const subheadline = String(snapshot.subheadline || "").slice(0, 280);
      const ctaText = String(snapshot.ctaText || "").slice(0, 60);
      const elements: StudioElement[] = [
        {
          id: `el-headline-${Date.now()}`,
          type: "text",
          layer: 7,
          zIndex: 2,
          position: { x: 50, y: 34 },
          size: { width: 84, height: 22 },
          rotation: 0,
          opacity: 1,
          locked: false,
          visible: true,
          properties: {
            ...DEFAULT_TEXT_PROPERTIES,
            content: headline,
            fontSize: 40,
            fontWeight: 800,
            color: TOKEN_HEX.neutral50,
          },
        },
        ...(subheadline
          ? [
              {
                id: `el-sub-${Date.now() + 1}`,
                type: "text" as const,
                layer: 7 as const,
                zIndex: 3,
                position: { x: 50, y: 58 },
                size: { width: 80, height: 18 },
                rotation: 0,
                opacity: 0.92,
                locked: false,
                visible: true,
                properties: {
                  ...DEFAULT_TEXT_PROPERTIES,
                  content: subheadline,
                  fontSize: 22,
                  fontWeight: 500,
                  color: TOKEN_HEX.neutral200,
                },
              },
            ]
          : []),
        ...(ctaText
          ? [
              {
                id: `el-cta-${Date.now() + 2}`,
                type: "text" as const,
                layer: 7 as const,
                zIndex: 4,
                position: { x: 50, y: 78 },
                size: { width: 55, height: 12 },
                rotation: 0,
                opacity: 1,
                locked: false,
                visible: true,
                properties: {
                  ...DEFAULT_TEXT_PROPERTIES,
                  content: ctaText,
                  fontSize: 20,
                  fontWeight: 700,
                  color: TOKEN_HEX.amber500,
                },
              },
            ]
          : []),
      ];

      const saved = await saveStudioProject({
        data: {
          title: artifact.title || headline.slice(0, 60),
          project_type: "graphic",
          aspect_ratio: aspectRatio,
          canvas_data: {
            background: { type: "color", value: TOKEN_HEX.neutral900 },
            elements,
            aspectRatio,
          },
        },
      });

      toast.success("Criativo transferido para o Waesy Studio!");
      window.location.assign(
        `/workspace/estudio?projectId=${encodeURIComponent(saved.id)}&mode=graphic`,
      );
    } catch (err: any) {
      toast.error(err?.message || "Não foi possível abrir o criativo no Estúdio.");
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
    (artifact.type !== ("map_view" as any) && !data.city && Array.isArray(data.places) && data.places.length > 0);
  const isTravel =
    artifact.type === "travel_itinerary" ||
    artifact.type === "itinerary" ||
    artifact.type === ("travel_dossier" as any) ||
    (!["creative_post", "social_post"].includes(artifact.type) && Boolean(data.destination));
  const isDashboard =
    artifact.type === ("dashboard" as any) ||
    Boolean(data.kpis && Array.isArray(data.kpis));
  const isMap =
    artifact.type === ("map_view" as any) ||
    Boolean(data.mapPlaces || (data.places && !isBiolink));
  const isCreativePost =
    artifact.type === ("creative_post" as any) ||
    artifact.type === "social_post" ||
    artifact.type === "carousel" ||
    Boolean(data.headline && (data.ctaText || data.cta_label || data.hashtags));
  const safeImageMediaUrl = getSafeArtifactMediaUrl(data.imageUrl || data.url);
  const safeVideoMediaUrl = getSafeArtifactMediaUrl(data.videoUrl || data.streamUrl || data.url);
  const isVideoArtifact =
    (artifact.type === "video" || artifact.type === "motion_video") &&
    (Boolean(safeVideoMediaUrl) || Array.isArray(data.frames) || Array.isArray(data.scenes));
  const isImageArtifact = artifact.type === "image" && Boolean(safeImageMediaUrl);
  const isStructuredBriefArtifact =
    (artifact.type === "simlab_report" ||
      artifact.type === "business_plan" ||
      artifact.type === "schedule_plan") &&
    !isDashboard &&
    !isTable &&
    (Array.isArray(data.sections) ||
      Array.isArray(data.recommendations) ||
      Array.isArray(data.scenarios) ||
      Array.isArray(data.steps));
  const isCodeSandbox =
    !isCreativePost &&
    !isTable &&
    !isDashboard &&
    !isMap &&
    !isVideoArtifact &&
    !isImageArtifact &&
    artifact.type === "code" &&
    (Boolean(data.runnableInBrowserSandbox) ||
      (typeof data.code === "string" &&
        !(typeof data.html === "string" && data.html.trim().length > 0)));
  const isWebPreview =
    !isCodeSandbox &&
    !isCreativePost &&
    !isTable &&
    !isDashboard &&
    !isMap &&
    !isVideoArtifact &&
    !isImageArtifact &&
    (artifact.type === ("website" as any) ||
      artifact.type === ("web_app" as any) ||
      artifact.type === "landing_page" ||
      artifact.type === "code" ||
      (typeof data.html === "string" && data.html.trim().length > 0));

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
          <Badge variant="secondary" className="text-2xs font-semibold">
            {ARTIFACT_FRIENDLY_LABELS[artifact.type] || artifact.type}
          </Badge>
        </div>
      </div>

      {/* Título e Metadados do Artefato */}
      <div className="px-1">
        <h3 className="text-sm font-bold text-foreground leading-snug">{artifact.title}</h3>
        <p className="text-2xs text-muted-foreground mt-1">
          {artifact.authorName || "Assessor Executivo Local"} • {artifact.authorRole || "Documento Verificado"}
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
        ) : isDashboard ? (
          <ArtifactDashboard
            title={artifact.title}
            subtitle={artifact.previewSummary}
            kpis={data.kpis || []}
            breakdowns={data.breakdowns || []}
            recentActivities={data.recentActivities || []}
            alerts={data.alerts || []}
          />
        ) : isMap ? (
          <ArtifactInteractiveMap
            title={artifact.title}
            city={data.city || ""}
            state={data.state || ""}
            places={data.mapPlaces || data.places || []}
          />
        ) : isCodeSandbox ? (
          <ArtifactCodeSandbox
            title={artifact.title}
            language={typeof data.language === "string" ? data.language : undefined}
            code={typeof data.code === "string" ? data.code : undefined}
            filename={typeof data.filename === "string" ? data.filename : undefined}
            files={typeof data.files === "object" && data.files ? data.files : undefined}
          />
        ) : isWebPreview ? (
          <ArtifactWebPreview
            title={artifact.title}
            html={typeof data.html === "string" ? data.html : undefined}
            files={typeof data.files === "object" && data.files ? data.files : undefined}
            documentId={data.documentId || artifact.id}
            artifactId={artifact.id}
            storeId={data.storeId}
            onOpenBuilder={(resolvedDocId) => {
              if (onOpenBuilder) {
                onOpenBuilder(artifact);
                return;
              }
              const targetId = resolvedDocId || data.documentId;
              if (targetId) {
                window.location.assign(`/workspace/builder/${encodeURIComponent(String(targetId))}/editor`);
              } else {
                handleOpenExternal();
              }
            }}
            onRequestFix={
              onRequestFix
                ? (errMsg) => onRequestFix(errMsg, artifact)
                : undefined
            }
          />
        ) : isCreativePost ? (
          <ArtifactCreativePost
            title={artifact.title}
            format={data.format}
            aspectRatio={data.aspectRatio || data.aspect_ratio}
            archetype={data.archetype}
            themeId={data.themeId || data.theme_id || data.theme}
            badge={data.badge}
            headline={data.headline}
            subheadline={data.subheadline || data.body_text}
            bullets={data.bullets}
            slides={Array.isArray(data.slides) ? data.slides : undefined}
            quoteAuthor={data.quoteAuthor}
            ctaText={data.ctaText || data.cta_label}
            storeName={data.storeName || data.store_name}
            brandHandle={data.brandHandle}
            logoUrl={data.logoUrl}
            imageUrl={data.imageUrl}
            caption={data.caption}
            hashtags={data.hashtags}
            offerPrice={data.offerPrice || data.offer_price}
            offerBadge={data.offerBadge || data.offer_badge}
            installments={data.installments}
            locationLabel={data.locationLabel || data.location_label}
            onOpenInStudio={handleOpenCreativeInStudio}
          />
        ) : isVideoArtifact ? (
          <div className="space-y-3 rounded-lg border border-border/60 bg-background p-3">
            {safeVideoMediaUrl ? (
              <video
                src={safeVideoMediaUrl}
                controls
                playsInline
                className="w-full rounded-lg border border-border/50 bg-muted aspect-video"
              />
            ) : (
              <div className="space-y-2">
                {(Array.isArray(data.scenes) ? data.scenes : Array.isArray(data.frames) ? data.frames : []).map(
                  (scene: any, idx: number) => (
                    <div
                      key={scene?.id || `scene-${idx}`}
                      className="rounded-md border border-border/50 bg-card p-3 text-xs space-y-1"
                    >
                      <p className="font-semibold text-foreground">
                        Cena {idx + 1}: {scene?.title || scene?.label || "Sequência"}
                      </p>
                      {(scene?.caption || scene?.text || scene?.narration) && (
                        <p className="text-muted-foreground leading-relaxed">
                          {String(scene?.caption || scene?.text || scene?.narration)}
                        </p>
                      )}
                    </div>
                  ),
                )}
              </div>
            )}
            {data.prompt && (
              <p className="text-2xs text-muted-foreground leading-relaxed">
                Direção visual: {String(data.prompt)}
              </p>
            )}
          </div>
        ) : isImageArtifact && safeImageMediaUrl ? (
          <div className="space-y-2 rounded-lg border border-border/60 bg-background p-3">
            <img
              src={safeImageMediaUrl}
              alt={artifact.title}
              className="w-full rounded-lg border border-border/50 object-contain max-h-96 bg-muted/20"
            />
            {(data.revisedPrompt || data.prompt) && (
              <p className="text-2xs text-muted-foreground leading-relaxed">
                {String(data.revisedPrompt || data.prompt)}
              </p>
            )}
          </div>
        ) : isStructuredBriefArtifact ? (
          <div className="space-y-3">
            {(Array.isArray(data.sections)
              ? data.sections
              : Array.isArray(data.scenarios)
                ? data.scenarios
                : Array.isArray(data.steps)
                  ? data.steps
                  : []
            ).map((item: any, idx: number) => (
              <div
                key={item?.id || `sec-${idx}`}
                className="rounded-lg border border-border/50 bg-background p-3 space-y-1"
              >
                <p className="text-xs font-semibold text-foreground">
                  {String(item?.title || item?.name || item?.label || `Etapa ${idx + 1}`)}
                </p>
                {(item?.summary || item?.description || item?.content) && (
                  <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-line">
                    {String(item?.summary || item?.description || item?.content)}
                  </p>
                )}
              </div>
            ))}
            {Array.isArray(data.recommendations) && data.recommendations.length > 0 && (
              <div className="rounded-lg border border-border/50 bg-muted/20 p-3 space-y-2">
                <p className="text-xs font-semibold text-foreground">Recomendações</p>
                <ul className="space-y-1 text-xs text-muted-foreground list-disc pl-4">
                  {data.recommendations.map((rec: unknown, i: number) => (
                    <li key={i}>{typeof rec === "string" ? rec : JSON.stringify(rec)}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
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
          <span>Abrir Editor Completo</span>
        </Button>
      </div>
    </div>
  );
}
