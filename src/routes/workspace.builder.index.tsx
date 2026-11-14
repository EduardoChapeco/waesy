import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  FileText,
  Globe,
  ExternalLink,
  Download,
  Code2,
  Save,
  ArrowLeft,
  Layers,
  Loader2,
  Plus,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/commerce/page-header";
import { EmptyState, ErrorState } from "@/components/state/states";
import { LoadingState } from "@/components/state/loading";
import {
  getBuilderDocumentFn,
  listUnifiedBuilderDocumentsFn,
  updateBuilderDocumentFn,
  createBuilderDocumentFn,
} from "@/services/builder-copilot-bridge";
import { ArtifactCreativePost } from "@/components/chat/artifacts/ArtifactCreativePost";
import { ArtifactInteractiveTable } from "@/components/chat/artifacts/ArtifactInteractiveTable";
import { ArtifactTravelDossier } from "@/components/chat/artifacts/ArtifactTravelDossier";
import { exportElementAsImage, exportElementAsPdf } from "@/lib/pdf-export";

export const Route = createFileRoute("/workspace/builder/")({
  head: () => ({ meta: [{ title: "Builder Unificado | Workspace Waesy" }] }),
  validateSearch: (search: Record<string, unknown>) => ({
    doc: typeof search.doc === "string" ? search.doc : undefined,
  }),
  component: WorkspaceBuilderIndexPage,
});

function WorkspaceBuilderIndexPage() {
  const { doc: selectedDocId } = Route.useSearch();
  const navigate = useNavigate();

  const {
    data: docs = [],
    isLoading: isListLoading,
    isError: isListError,
    refetch: refetchDocs,
  } = useQuery({
    queryKey: ["unified-builder-documents"],
    queryFn: () => listUnifiedBuilderDocumentsFn(),
  });

  const matchingExperienceDoc = docs.find(
    (d) => d.id === selectedDocId && d.source === "experience_page"
  );

  const isUuid =
    Boolean(selectedDocId) &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(selectedDocId!);

  const {
    data: activeDoc,
    isLoading: isDocLoading,
    refetch: refetchActiveDoc,
  } = useQuery({
    queryKey: ["workspace-builder-doc", selectedDocId],
    enabled: Boolean(isUuid && !matchingExperienceDoc),
    queryFn: () => getBuilderDocumentFn({ data: { documentId: selectedDocId! } }),
  });

  const [editTitle, setEditTitle] = useState("");
  const [editJson, setEditJson] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    if (activeDoc) {
      setEditTitle(activeDoc.title || "");
      setEditJson(JSON.stringify(activeDoc.contentSchema || {}, null, 2));
    }
  }, [activeDoc]);

  const handleSaveChanges = async () => {
    if (!activeDoc) return;
    try {
      const parsed = JSON.parse(editJson);
      setIsSaving(true);
      await updateBuilderDocumentFn({
        data: {
          documentId: activeDoc.id,
          title: editTitle || activeDoc.title,
          contentSchema: parsed,
        },
      });
      await Promise.all([refetchActiveDoc(), refetchDocs()]);
      toast.success("Documento atualizado e salvo com sucesso.");
    } catch (err: any) {
      toast.error(err?.message || "Verifique o JSON e tente salvar novamente.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreateQuickDoc = async () => {
    try {
      setIsSaving(true);
      const created = await createBuilderDocumentFn({
        data: {
          docType: "document",
          title: "Novo Documento Executivo",
          contentSchema: {
            sections: [
              {
                heading: "1. Objetivo",
                paragraphs: ["Descreva aqui os objetivos e entregas deste documento."],
              },
            ],
          },
          isPublic: false,
        },
      });
      await refetchDocs();
      if (created?.id) {
        navigate({ to: "/workspace/builder", search: { doc: created.id } });
      }
      toast.success("Documento criado no Builder Unificado.");
    } catch (err: any) {
      toast.error(err?.message || "Não foi possível criar o documento.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleExportPdf = async () => {
    try {
      setIsExporting(true);
      const slug = (activeDoc?.title || "documento-waesy")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .slice(0, 32);
      await exportElementAsPdf("unified-builder-preview", `${slug}.pdf`, "p");
      toast.success("PDF gerado com sucesso.");
    } catch (err: any) {
      toast.error(err?.message || "Erro ao gerar PDF.");
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportPng = async () => {
    try {
      setIsExporting(true);
      const slug = (activeDoc?.title || "documento-waesy")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .slice(0, 32);
      await exportElementAsImage("unified-builder-preview", {
        filename: `${slug}.png`,
        scale: 2,
      });
      toast.success("Imagem PNG gerada com sucesso.");
    } catch (err: any) {
      toast.error(err?.message || "Erro ao gerar PNG.");
    } finally {
      setIsExporting(false);
    }
  };

  if (isListLoading) {
    return <LoadingState label="Carregando documentos do Builder Unificado…" />;
  }

  if (isListError) {
    return (
      <ErrorState
        title="Não foi possível carregar o Builder"
        description="Tente recarregar a página para sincronizar seus documentos."
      />
    );
  }

  const schema: any = activeDoc?.contentSchema || {};

  return (
    <div className="space-y-6 pb-20 w-full px-0 sm:px-4 md:px-0">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <PageHeader
          eyebrow="Workspace Builders"
          title={activeDoc ? activeDoc.title : "Builder Unificado"}
        />

        <div className="flex flex-wrap items-center gap-2">
          <Button
            asChild
            variant="outline"
            className="h-11 min-h-11 rounded-lg text-xs font-semibold gap-2"
          >
            <Link to="/workspace/copilot">
              <ArrowLeft className="size-4" />
              <span>Copilot</span>
            </Link>
          </Button>
          <Button
            type="button"
            disabled={isSaving}
            onClick={handleCreateQuickDoc}
            className="h-11 min-h-11 rounded-lg text-xs font-semibold gap-2"
          >
            <Plus className="size-4" />
            <span>Novo Documento</span>
          </Button>
        </div>
      </div>

      {matchingExperienceDoc && (
        <div className="rounded-xl border border-primary/40 bg-primary/5 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <p className="text-sm font-bold text-foreground">{matchingExperienceDoc.title}</p>
            <p className="text-xs text-muted-foreground">
              Este item é uma página visual do Omni Builder. Abra no editor visual completo de arrastar e soltar.
            </p>
          </div>
          <Button asChild className="h-11 min-h-11 px-4 text-xs font-semibold gap-2">
            <Link
              to="/workspace/builder/$documentId/editor"
              params={{ documentId: matchingExperienceDoc.id }}
            >
              <ExternalLink className="size-4" />
              <span>Abrir Editor</span>
            </Link>
          </Button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Lista de Documentos & Páginas */}
        <div className="lg:col-span-4 space-y-3">
          <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Documentos e Páginas ({docs.length})
          </h2>

          {docs.length === 0 ? (
            <EmptyState
              title="Nenhum documento salvo"
              description="Crie documentos, posts ou páginas pelo Copilot ou clique em Novo Documento."
            />
          ) : (
            <div className="space-y-2">
              {docs.map((item) => {
                const isSelected = item.id === selectedDocId;
                return (
                  <div
                    key={item.id}
                    className={`rounded-lg border p-4 transition-colors flex items-center justify-between gap-3 ${
                      isSelected
                        ? "border-primary bg-primary/5"
                        : "border-border bg-card hover:bg-muted/30"
                    }`}
                  >
                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center gap-2">
                        {item.source === "experience_page" ? (
                          <Globe className="size-3.5 text-primary shrink-0" />
                        ) : (
                          <FileText className="size-3.5 text-primary shrink-0" />
                        )}
                        <p className="text-xs font-bold text-foreground truncate">{item.title}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-2xs">
                          {item.docType}
                        </Badge>
                        <span className="text-2xs text-muted-foreground">
                          {item.source === "experience_page" ? "Omni Site" : "Documento IA"}
                        </span>
                      </div>
                    </div>

                    {item.source === "experience_page" ? (
                      <Button
                        asChild
                        size="sm"
                        variant="outline"
                        className="h-11 min-h-11 px-3 text-xs font-semibold"
                      >
                        <Link
                          to="/workspace/builder/$documentId/editor"
                          params={{ documentId: item.id }}
                        >
                          Editar Site
                        </Link>
                      </Button>
                    ) : (
                      <Button
                        asChild
                        size="sm"
                        variant={isSelected ? "default" : "outline"}
                        className="h-11 min-h-11 px-3 text-xs font-semibold"
                      >
                        <Link to="/workspace/builder" search={{ doc: item.id }}>
                          Abrir
                        </Link>
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Visualizador + Editor Unificado do Documento Ativo */}
        <div className="lg:col-span-8 space-y-4">
          {isDocLoading ? (
            <LoadingState label="Abrindo documento selecionado…" />
          ) : !activeDoc ? (
            <div className="rounded-xl border border-border bg-card p-8 text-center space-y-2">
              <Layers className="size-8 text-muted-foreground/40 mx-auto" />
              <h3 className="text-sm font-bold text-foreground">Selecione um Documento</h3>
              <p className="text-xs text-muted-foreground max-w-md mx-auto">
                Escolha um item ao lado para editar conteúdo estruturado, visualizar em alta definição ou exportar em PNG e PDF.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Barra de Ações do Documento */}
              <div className="rounded-xl border border-border bg-card p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <Input
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="h-11 min-h-11 text-sm font-bold flex-1"
                />
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    disabled={isExporting}
                    onClick={handleExportPng}
                    className="h-11 min-h-11 px-3 text-xs font-semibold gap-2"
                  >
                    <Download className="size-3.5" />
                    <span>PNG</span>
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={isExporting}
                    onClick={handleExportPdf}
                    className="h-11 min-h-11 px-3 text-xs font-semibold gap-2"
                  >
                    <FileText className="size-3.5" />
                    <span>PDF</span>
                  </Button>
                  <Button
                    type="button"
                    disabled={isSaving}
                    onClick={handleSaveChanges}
                    className="h-11 min-h-11 px-4 text-xs font-semibold gap-2"
                  >
                    {isSaving ? (
                      <Loader2 className="size-3.5 animate-spin motion-reduce:animate-none" />
                    ) : (
                      <Save className="size-3.5" />
                    )}
                    <span>Salvar</span>
                  </Button>
                </div>
              </div>

              {/* Renderização Nativa por Tipo */}
              <div
                id="unified-builder-preview"
                className="rounded-xl border border-border bg-card p-5 space-y-4"
              >
                {activeDoc.docType === "social_post" || schema.headline ? (
                  <ArtifactCreativePost
                    title={editTitle || activeDoc.title}
                    headline={schema.headline || activeDoc.title}
                    subheadline={schema.copyFeed || schema.subheadline}
                    ctaText={schema.callToAction || schema.ctaText}
                    hashtags={schema.hashtags}
                    caption={schema.copyFeed || schema.caption}
                    imageUrl={schema.imageUrl}
                  />
                ) : activeDoc.docType === "spreadsheet" && Array.isArray(schema.columns) ? (
                  <ArtifactInteractiveTable
                    title={editTitle || activeDoc.title}
                    headers={schema.columns}
                    rows={schema.rows || []}
                    summary={schema.summary}
                  />
                ) : activeDoc.docType === "travel_itinerary" ? (
                  <ArtifactTravelDossier
                    destination={schema.destination || activeDoc.title}
                    daysCount={schema.days?.length || 3}
                    estimatedBudgetCents={schema.estimatedBudgetCents}
                    days={schema.days || []}
                    pixCode={schema.pixCode}
                  />
                ) : (
                  <div className="space-y-4">
                    <h2 className="text-lg font-extrabold text-foreground">
                      {editTitle || activeDoc.title}
                    </h2>
                    {Array.isArray(schema.sections) ? (
                      schema.sections.map((sec: any, idx: number) => (
                        <div key={idx} className="space-y-2 border-t border-border/40 pt-3">
                          <h3 className="text-sm font-bold text-foreground">{sec.heading}</h3>
                          {Array.isArray(sec.paragraphs) &&
                            sec.paragraphs.map((p: string, pIdx: number) => (
                              <p key={pIdx} className="text-xs text-muted-foreground leading-relaxed">
                                {p}
                              </p>
                            ))}
                        </div>
                      ))
                    ) : (
                      <pre className="text-xs font-mono text-muted-foreground whitespace-pre-wrap">
                        {JSON.stringify(schema, null, 2)}
                      </pre>
                    )}
                  </div>
                )}
              </div>

              {/* Editor Estruturado JSON */}
              <div className="rounded-xl border border-border bg-card p-4 space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-foreground">
                  <Code2 className="size-4 text-primary" />
                  <span>Estrutura Editável (JSON)</span>
                </div>
                <textarea
                  value={editJson}
                  onChange={(e) => setEditJson(e.target.value)}
                  rows={10}
                  spellCheck={false}
                  className="w-full rounded-lg border border-border bg-muted/20 p-3 text-xs font-mono text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
