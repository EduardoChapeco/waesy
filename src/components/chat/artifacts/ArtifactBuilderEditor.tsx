import React, { useId, useState } from "react";
import {
  FileCode,
  FileText,
  Save,
  ExternalLink,
  Eye,
  Edit3,
  Check,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { exportElementAsPdf } from "@/lib/pdf-export";
import { updateBuilderDocumentFn } from "@/services/builder-copilot-bridge";
import { toast } from "sonner";

export interface ArtifactBuilderEditorProps {
  documentId?: string;
  docType?: string;
  title: string;
  initialContent: Record<string, any>;
  onSave?: (updatedContent: Record<string, any>) => void;
  className?: string;
}

const DOC_TYPE_LABELS: Record<string, string> = {
  document: "Documento",
  spreadsheet: "Planilha Comercial",
  presentation: "Apresentação",
  landing_page: "Página de Apresentação",
  website: "Página de Apresentação",
  social_post: "Publicação para Redes",
  travel_itinerary: "Roteiro de Viagem",
};

export function ArtifactBuilderEditor({
  documentId,
  docType = "document",
  title: initialTitle,
  initialContent,
  onSave,
  className,
}: ArtifactBuilderEditorProps) {
  const [title, setTitle] = useState(initialTitle);
  const [contentJson, setContentJson] = useState(() =>
    JSON.stringify(initialContent, null, 2),
  );
  const [mode, setMode] = useState<"preview" | "edit">("preview");
  const [saved, setSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const uid = useId();
  const previewStageId = `builder-preview-stage-${uid.replace(/[^a-zA-Z0-9_-]/g, "")}`;

  const handleExportPdf = async () => {
    try {
      setIsExportingPdf(true);
      const slug = (title || "documento-waesy").toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 32);
      await exportElementAsPdf(previewStageId, `${slug}.pdf`, "p");
      toast.success("Documento exportado em PDF!");
    } catch (err: any) {
      toast.error(err?.message || "Falha ao exportar PDF do documento.");
    } finally {
      setIsExportingPdf(false);
    }
  };

  const handleSave = async () => {
    try {
      const parsed = JSON.parse(contentJson);
      setErrorMsg(null);
      setIsSaving(true);
      if (documentId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(documentId)) {
        await updateBuilderDocumentFn({
          data: {
            documentId,
            title,
            contentSchema: parsed,
          },
        });
      }
      if (onSave) {
        onSave(parsed);
      }
      setIsSaving(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err: any) {
      setIsSaving(false);
      setSaved(false);
      setErrorMsg(
        err instanceof SyntaxError
          ? "Formato JSON inválido: verifique a estrutura antes de salvar."
          : err?.message || "Não foi possível salvar alterações no servidor."
      );
    }
  };

  const handleOpenFullBuilder = () => {
    if (documentId) {
      window.location.assign(`/workspace/builder?doc=${encodeURIComponent(documentId)}`);
    } else {
      window.location.assign("/workspace/builder");
    }
  };

  return (
    <div className={cn("rounded-lg border border-border/50 bg-card p-4 space-y-3", className)}>
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/40 pb-3">
        <div className="flex items-center gap-2">
          <FileCode className="size-4 text-primary" aria-hidden="true" />
          <h4 className="text-sm font-bold text-foreground leading-snug">Editor Integrado</h4>
          <Badge variant="outline" className="text-2xs font-medium">
            {DOC_TYPE_LABELS[docType] || docType}
          </Badge>
        </div>

        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant={mode === "preview" ? "default" : "outline"}
            size="sm"
            onClick={() => setMode("preview")}
            className="h-11 min-h-11 px-3 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 cursor-pointer flex items-center gap-2"
          >
            <Eye className="size-3.5" />
            <span>Prévia</span>
          </Button>

          <Button
            type="button"
            variant={mode === "edit" ? "default" : "outline"}
            size="sm"
            onClick={() => setMode("edit")}
            className="h-11 min-h-11 px-3 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 cursor-pointer flex items-center gap-2"
          >
            <Edit3 className="size-3.5" />
            <span>Editar</span>
          </Button>
        </div>
      </div>

      {/* Campo de Título */}
      <div className="space-y-1">
        <label className="text-2xs font-semibold text-muted-foreground uppercase">
          Título do Documento
        </label>
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="h-11 text-xs font-semibold text-foreground focus-visible:ring-2 focus-visible:ring-primary/40"
        />
      </div>

      {/* Corpo do Mini-Editor */}
      {mode === "edit" ? (
        <div className="space-y-2">
          <label className="text-2xs font-semibold text-muted-foreground uppercase flex items-center justify-between">
            <span>Estrutura do seu Documento</span>
            {errorMsg && <span className="text-destructive font-normal">{errorMsg}</span>}
          </label>
          <textarea
            value={contentJson}
            onChange={(e) => {
              setContentJson(e.target.value);
              setErrorMsg(null);
            }}
            rows={8}
            className="w-full rounded-md border border-border/50 bg-muted/20 p-3 font-mono text-2xs text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 leading-relaxed resize-y"
          />
        </div>
      ) : (
        <div
          id={previewStageId}
          className="rounded-xl border border-border bg-card p-4 max-h-80 overflow-y-auto text-xs divide-y divide-border/50"
        >
          {initialContent.sections && Array.isArray(initialContent.sections) ? (
            initialContent.sections.map((sec: any, idx: number) => {
              const sectionHeading =
                sec.headline || sec.title || sec.heading || `Seção ${idx + 1}`;
              const sectionSub = sec.subheadline || sec.subtitle;
              const ctaText =
                sec.ctaLabel || sec.content?.ctaPrimaryText;
              const nestedItems =
                Array.isArray(sec.items) ? sec.items : Array.isArray(sec.content?.items) ? sec.content.items : null;

              return (
                <div
                  key={sec.id || idx}
                  className="py-3 first:pt-0 last:pb-0 space-y-2"
                >
                  <div className="flex items-center justify-between gap-2">
                    <h5 className="font-semibold text-foreground text-xs">{sectionHeading}</h5>
                    {sec.type && (
                      <Badge variant="secondary" className="text-3xs">
                        {String(sec.type)}
                      </Badge>
                    )}
                  </div>
                  {sectionSub && (
                    <p className="text-2xs text-muted-foreground leading-relaxed">
                      {sectionSub}
                    </p>
                  )}
                  {sec.content && typeof sec.content === "string" && (
                    <p className="text-2xs text-muted-foreground leading-relaxed">
                      {sec.content}
                    </p>
                  )}
                  {sec.paragraphs?.map((p: string, pIdx: number) => (
                    <p key={pIdx} className="text-2xs text-muted-foreground leading-relaxed">
                      {p}
                    </p>
                  ))}
                  {nestedItems && nestedItems.length > 0 && (
                    <div className="grid grid-cols-1 gap-2 pt-1">
                      {nestedItems.slice(0, 4).map((it: any, iIdx: number) => (
                        <div key={iIdx} className="rounded-lg bg-surface-subtle px-3 py-2 text-2xs">
                          <p className="font-medium text-foreground">
                            {typeof it === "string" ? it : it.title || it.label || `Item ${iIdx + 1}`}
                          </p>
                          {it?.description && (
                            <p className="text-muted-foreground mt-1">{it.description}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                  {ctaText && (
                    <div className="pt-1">
                      <span className="inline-flex items-center px-3 py-1 rounded-lg bg-foreground text-background text-2xs font-medium">
                        {ctaText}
                      </span>
                    </div>
                  )}
                </div>
              );
            })
          ) : initialContent.copyFeed ? (
            <div className="space-y-2">
              <span className="text-2xs font-semibold text-primary block uppercase">Legenda do Feed:</span>
              <p className="text-2xs text-foreground whitespace-pre-wrap">{initialContent.copyFeed}</p>
              {initialContent.hashtags && (
                <div className="flex flex-wrap gap-1">
                  {initialContent.hashtags.map((h: string, hIdx: number) => (
                    <Badge key={hIdx} variant="outline" className="text-2xs font-mono">{h}</Badge>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <pre className="text-2xs font-mono text-muted-foreground whitespace-pre-wrap">
              {contentJson}
            </pre>
          )}
        </div>
      )}

      {/* Ações */}
      <div className="flex flex-col sm:flex-row items-center gap-2 pt-1 border-t border-border/40">
        <Button
          type="button"
          variant="default"
          size="sm"
          disabled={isSaving}
          onClick={handleSave}
          className="w-full sm:flex-1 h-11 min-h-11 px-4 text-xs font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {isSaving ? (
            <>
              <RefreshCw className="size-4 animate-spin motion-reduce:animate-none" />
              <span>Salvando...</span>
            </>
          ) : saved ? (
            <>
              <Check className="size-4" />
              <span>Salvo com Sucesso!</span>
            </>
          ) : (
            <>
              <Save className="size-4" />
              <span>Salvar Alterações</span>
            </>
          )}
        </Button>

        {mode === "preview" && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isExportingPdf}
            onClick={() => void handleExportPdf()}
            className="w-full sm:w-auto h-11 min-h-11 px-4 text-xs font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 cursor-pointer flex items-center justify-center gap-2"
          >
            <FileText className="size-4" />
            <span>{isExportingPdf ? "Gerando PDF..." : "Exportar PDF"}</span>
          </Button>
        )}

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleOpenFullBuilder}
          className="w-full sm:w-auto h-11 min-h-11 px-4 text-xs font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 cursor-pointer flex items-center justify-center gap-2"
        >
          <ExternalLink className="size-4" />
          <span>Abrir Editor Completo</span>
        </Button>
      </div>
    </div>
  );
}
