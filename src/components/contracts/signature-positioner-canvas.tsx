import React, { useState, useRef, useEffect, useMemo } from "react";
import { FileText, Trash2, Copy, Layers, Calendar, User, Hash, CheckSquare, PenTool, Upload, ArrowRight, RefreshCw, Info, ExternalLink, GripHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getDocumentThemeCanvasStyle } from "@/lib/builder/block-data-resolver";
import { TOKEN_HEX } from "@/lib/design-tokens";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { type SignatureFieldDTO } from "@/services/contracts.functions";
import { ContractMarkdownRenderer } from "@/components/contracts/contract-markdown-renderer";
import { paginateContractMarkdown } from "@/lib/contracts/document-file-parser";

export interface SignerVisualInfo {
  index: number;
  name: string;
  email: string;
  phone?: string;
  role: string;
  colorCode: string;
}

interface SignaturePositionerCanvasProps {
  signers: SignerVisualInfo[];
  fields: SignatureFieldDTO[];
  pageCount: number;
  currentPage: number;
  onPageChange: (page: number) => void;
  onFieldsChange: (fields: SignatureFieldDTO[]) => void;
  onAdvance?: () => void;
  onChangeFile?: () => void;
  onMergeFile?: () => void;
  documentTitle?: string;
  contentMarkdown?: string;
  sourceFileSignedUrl?: string | null;
  sourceFileMime?: string | null;
  sourceFileName?: string | null;
  hideSidePanel?: boolean;
  selectedSignerIndex?: number;
  onSelectedSignerIndexChange?: (idx: number) => void;
  readOnly?: boolean;
  isEditingInPage?: boolean;
  onContentMarkdownChange?: (text: string) => void;
}

export const FIELD_TAGS = [
  { type: "signature" as const, label: "Assinatura", icon: PenTool, defaultW: 24, defaultH: 8 },
  { type: "initials" as const, label: "Rubrica", icon: Layers, defaultW: 16, defaultH: 6 },
  { type: "name" as const, label: "Nome", icon: User, defaultW: 28, defaultH: 5 },
  { type: "cpf" as const, label: "CPF", icon: Hash, defaultW: 22, defaultH: 5 },
  { type: "date" as const, label: "Data", icon: Calendar, defaultW: 18, defaultH: 5 },
  { type: "checkbox" as const, label: "Botão de opção", icon: CheckSquare, defaultW: 12, defaultH: 5 },
];

export function SignaturePositionerCanvas({
  signers,
  fields,
  pageCount = 1,
  currentPage = 1,
  onPageChange,
  onFieldsChange,
  onAdvance,
  onChangeFile,
  onMergeFile,
  documentTitle,
  contentMarkdown,
  sourceFileSignedUrl,
  sourceFileMime,
  sourceFileName,
  hideSidePanel = false,
  selectedSignerIndex,
  onSelectedSignerIndexChange,
  readOnly = false,
  isEditingInPage = false,
  onContentMarkdownChange,
}: SignaturePositionerCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const fieldsRef = useRef(fields);
  fieldsRef.current = fields;

  const [internalSignerIndex, setInternalSignerIndex] = useState<number>(0);
  const activeSignerIndex =
    selectedSignerIndex !== undefined ? selectedSignerIndex : internalSignerIndex;
  const setActiveSignerIndex = (idx: number) => {
    if (onSelectedSignerIndexChange) onSelectedSignerIndexChange(idx);
    else setInternalSignerIndex(idx);
  };

  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);
  const [dragState, setDragState] = useState<{
    mode: "drag" | "resize";
    fieldId: string;
    startClientX: number;
    startClientY: number;
    origX: number;
    origY: number;
    origW: number;
    origH: number;
  } | null>(null);

  // Modal de repetição de campo
  const [repeatModalOpen, setRepeatModalOpen] = useState(false);
  const [pendingFieldToRepeat, setPendingFieldToRepeat] = useState<SignatureFieldDTO | null>(null);
  const [repeatOption, setRepeatOption] = useState<"page" | "all" | "all_except_last">("page");

  const paginatedPages = useMemo(
    () => paginateContractMarkdown(contentMarkdown || ""),
    [contentMarkdown],
  );
  const effectivePageCount = Math.max(pageCount, paginatedPages.length, 1);

  const isPdfSource = Boolean(
    sourceFileSignedUrl &&
      (sourceFileMime?.toLowerCase().includes("pdf") ||
        sourceFileName?.toLowerCase().endsWith(".pdf")),
  );
  const isImageSource = Boolean(
    sourceFileSignedUrl && sourceFileMime?.toLowerCase().startsWith("image/"),
  );

  useEffect(() => {
    if (!dragState || readOnly) return;

    const handlePointerMove = (e: PointerEvent) => {
      const container = containerRef.current;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;

      const deltaXPct = ((e.clientX - dragState.startClientX) / rect.width) * 100;
      const deltaYPct = ((e.clientY - dragState.startClientY) / rect.height) * 100;

      const updated = fieldsRef.current.map((f) => {
        if (f.id !== dragState.fieldId) return f;
        if (dragState.mode === "drag") {
          const nextX = Math.max(2, Math.min(98 - f.width, Number((dragState.origX + deltaXPct).toFixed(2))));
          const nextY = Math.max(4, Math.min(95 - f.height, Number((dragState.origY + deltaYPct).toFixed(2))));
          return { ...f, x: nextX, y: nextY };
        }
        const nextW = Math.max(10, Math.min(75, Number((dragState.origW + deltaXPct).toFixed(2))));
        const nextH = Math.max(4, Math.min(30, Number((dragState.origH + deltaYPct).toFixed(2))));
        return { ...f, width: nextW, height: nextH };
      });
      onFieldsChange(updated);
    };

    const handlePointerUp = () => {
      setDragState(null);
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    window.addEventListener("pointercancel", handlePointerUp);
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("pointercancel", handlePointerUp);
    };
  }, [dragState, onFieldsChange, readOnly]);

  const currentSigner = signers[activeSignerIndex] || signers[0] || {
    index: 0,
    name: "Signatário 1",
    email: "",
    colorCode: TOKEN_HEX.blue600,
  };

  // Adicionar campo ao clicar numa tag
  const handleAddTag = (tagType: SignatureFieldDTO["type"]) => {
    if (readOnly) return;
    const tagConfig = FIELD_TAGS.find((t) => t.type === tagType);
    const newField: SignatureFieldDTO = {
      id: `field_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      signerIndex: currentSigner.index,
      signerEmail: currentSigner.email,
      type: tagType,
      page: currentPage,
      x: 35 + (fields.length % 5) * 4,
      y: 40 + (fields.length % 5) * 4,
      width: tagConfig?.defaultW || 22,
      height: tagConfig?.defaultH || 6,
      repeatMode: "page",
      label: tagConfig?.label,
    };

    if (tagType === "initials" && pageCount > 1) {
      setPendingFieldToRepeat(newField);
      setRepeatOption("all_except_last");
      setRepeatModalOpen(true);
    } else {
      onFieldsChange([...fields, newField]);
      setSelectedFieldId(newField.id);
    }
  };

  const applyRepeatModal = () => {
    if (!pendingFieldToRepeat) return;
    const updated = { ...pendingFieldToRepeat, repeatMode: repeatOption };

    if (repeatOption === "all") {
      // Cria réplicas em todas as páginas
      const replicas: SignatureFieldDTO[] = [];
      for (let p = 1; p <= pageCount; p++) {
        replicas.push({
          ...updated,
          id: `field_${Date.now()}_p${p}_${Math.random().toString(36).substr(2, 4)}`,
          page: p,
        });
      }
      onFieldsChange([...fields, ...replicas]);
    } else if (repeatOption === "all_except_last") {
      // Cria réplicas em todas exceto a última
      const replicas: SignatureFieldDTO[] = [];
      for (let p = 1; p < pageCount; p++) {
        replicas.push({
          ...updated,
          id: `field_${Date.now()}_p${p}_${Math.random().toString(36).substr(2, 4)}`,
          page: p,
        });
      }
      if (pageCount === 1) {
        replicas.push({ ...updated, page: 1 });
      }
      onFieldsChange([...fields, ...replicas]);
    } else {
      onFieldsChange([...fields, updated]);
    }

    setPendingFieldToRepeat(null);
    setRepeatModalOpen(false);
  };

  const handleDeleteField = (fieldId: string) => {
    onFieldsChange(fields.filter((f) => f.id !== fieldId));
    if (selectedFieldId === fieldId) setSelectedFieldId(null);
  };

  // Filtrar campos visíveis na página atual
  const visibleFields = fields.filter((f) => f.page === currentPage);

  return (
    <div className="flex flex-col h-full w-full bg-background rounded-lg border border-border/80 overflow-hidden select-none">
      {/* Topo do Posicionador */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/70 bg-card">
        <div className="flex items-center gap-3">
          <div className="size-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
            <PenTool className="size-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-foreground">Posicionar Assinaturas e Rubricas</h2>
            <p className="text-2xs text-muted-foreground">
              {documentTitle || "Arraste ou clique nas marcações para posicionar no documento"}
            </p>
          </div>
        </div>

        {/* Seletor de Páginas */}
        <div className="flex flex-wrap items-center gap-2">
          {sourceFileSignedUrl && (
            <a
              href={sourceFileSignedUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-3 h-11 sm:h-8 rounded-lg border border-border bg-background hover:bg-muted text-xs font-medium text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <ExternalLink className="size-3.5" />
              <span>Abrir original</span>
            </a>
          )}
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 px-3 rounded-lg text-xs min-h-11 sm:min-h-0"
            disabled={currentPage <= 1}
            onClick={() => onPageChange(currentPage - 1)}
          >
            Anterior
          </Button>
          <span className="text-xs font-semibold px-2 py-1 bg-muted rounded-md text-foreground">
            Pág. {currentPage} de {effectivePageCount}
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 px-3 rounded-lg text-xs min-h-11 sm:min-h-0"
            disabled={currentPage >= effectivePageCount}
            onClick={() => onPageChange(currentPage + 1)}
          >
            Próxima
          </Button>
        </div>
      </div>

      {/* Grid Central: Barra Lateral de Signatários + Canvas do Documento */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden min-h-0">
        {!hideSidePanel && (
          <aside className="w-full md:w-80 border-b md:border-b-0 md:border-r border-border/70 bg-muted/20 p-4 space-y-5 overflow-y-auto">
          <div>
            <Label className="text-xs uppercase tracking-wider font-bold text-muted-foreground mb-3 block">
              1. Escolha quem vai assinar
            </Label>
            <div className="space-y-2">
              {signers.map((s, idx) => {
                const isSelected = activeSignerIndex === idx;
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setActiveSignerIndex(idx)}
                    className={`w-full text-left p-3 rounded-lg border transition-colors duration-200 text-xs sm:text-sm flex items-center justify-between min-h-11 cursor-pointer ${
                      isSelected
                        ? "bg-card border-primary/50 shadow-xs ring-1 ring-primary/20 font-semibold"
                        : "bg-background/70 border-border/70 hover:border-border hover:bg-background"
                    } focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className="size-3.5 rounded-full shrink-0 waesy-dyn-bg"
                        style={{ "--dyn-bg": s.colorCode || "var(--color-blue-600)" } as React.CSSProperties}
                      />
                      <div className="truncate">
                        <p className="font-semibold text-foreground truncate">{s.name || `Signatário ${idx + 1}`}</p>
                        <p className="text-xs text-muted-foreground truncate">{s.email || s.phone || "Contato cadastrado"}</p>
                      </div>
                    </div>
                    <Badge variant="outline" className="text-xs font-medium capitalize shrink-0 ml-2">
                      {s.role === "witness" ? "Testemunha" : "Assinante"}
                    </Badge>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <Label className="text-xs uppercase tracking-wider font-bold text-muted-foreground mb-3 block">
              2. Toque para Adicionar o Campo
            </Label>
            <div className="grid grid-cols-2 gap-2">
              {FIELD_TAGS.map((tag) => {
                const Icon = tag.icon;
                return (
                  <button
                    key={tag.type}
                    type="button"
                    disabled={readOnly}
                    onClick={() => handleAddTag(tag.type)}
                    className="flex items-center gap-3 p-3 rounded-lg border border-border/80 bg-card hover:bg-muted/60 transition-colors duration-200 text-left text-xs sm:text-sm font-semibold text-foreground hover:border-primary/40 active:scale-98 min-h-11 cursor-pointer shadow-2xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <Icon className="size-4 text-primary shrink-0" />
                    <span className="truncate">{tag.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="p-4 rounded-lg bg-card border border-border/70 space-y-2 text-xs text-muted-foreground">
            <div className="flex items-center gap-2 font-bold text-foreground">
              <Info className="size-4 text-primary shrink-0" />
              <span>Dica de Posicionamento</span>
            </div>
            <p className="leading-relaxed">
              Arraste os campos sobre a folha para posicionar ou use as setas do teclado para ajuste fino.
            </p>
          </div>
        </aside>
        )}

        {/* Canvas de Visualização do Documento A4 Real */}
        <main className="flex-1 bg-muted/40 p-4 md:p-8 flex items-start justify-center overflow-auto">
          <div
            ref={containerRef}
            data-builder-canvas-isolated="light"
            style={getDocumentThemeCanvasStyle({ backgroundColor: TOKEN_HEX.white }, { forceIsolate: true })}
            className="relative w-full max-w-175 aspect-a4-portrait bg-background text-foreground rounded-lg border border-border/80 flex flex-col justify-between overflow-hidden shrink-0"
          >
            {/* Header da Folha A4 */}
            <div className="px-8 pt-6 pb-3 border-b border-border/40 flex items-center justify-between text-xs text-muted-foreground relative z-10 bg-background/95">
              <span className="font-semibold uppercase tracking-wider truncate">
                {sourceFileName || documentTitle || "INSTRUMENTO CONTRATUAL"}
              </span>
              <span className="shrink-0">Página {currentPage}</span>
            </div>

            {/* Floating toolbar when in-page editing is enabled */}
            {isEditingInPage && !readOnly && onContentMarkdownChange && !isPdfSource && !isImageSource && (
              <div className="px-4 py-2 border-b border-border/60 bg-muted/40 flex flex-wrap items-center justify-between gap-2 text-xs relative z-10">
                <span className="text-2xs font-semibold text-primary uppercase tracking-wider">
                  Redação Direta na Folha
                </span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => onContentMarkdownChange((contentMarkdown || "") + "\n## Nova Cláusula\n")}
                    className="h-11 min-h-11 sm:h-8 sm:min-h-0 px-2 rounded-md border border-border bg-card text-2xs font-semibold hover:bg-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    + Cláusula
                  </button>
                  <button
                    type="button"
                    onClick={() => onContentMarkdownChange((contentMarkdown || "") + "\n**Texto em destaque** ")}
                    className="h-11 min-h-11 sm:h-8 sm:min-h-0 px-2 rounded-md border border-border bg-card text-2xs font-bold hover:bg-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    B
                  </button>
                  <button
                    type="button"
                    onClick={() => onContentMarkdownChange((contentMarkdown || "") + "\n*Texto em itálico* ")}
                    className="h-11 min-h-11 sm:h-8 sm:min-h-0 px-2 rounded-md border border-border bg-card text-2xs italic hover:bg-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    I
                  </button>
                  <button
                    type="button"
                    onClick={() => onContentMarkdownChange((contentMarkdown || "") + "\n| Item | Valor |\n| :--- | ---: |\n| Item 01 | R$ 0,00 |\n")}
                    className="h-11 min-h-11 sm:h-8 sm:min-h-0 px-2 rounded-md border border-border bg-card text-2xs font-semibold hover:bg-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    Tabela
                  </button>
                </div>
              </div>
            )}

            {/* Conteúdo Real da Folha: PDF Nativo, Imagem Digitalizada ou Minuta Renderizada / Editável */}
            <div className="relative flex-1 overflow-hidden">
              {isPdfSource && sourceFileSignedUrl ? (
                <iframe
                  key={`${sourceFileSignedUrl}#page=${currentPage}`}
                  src={`${sourceFileSignedUrl}#page=${currentPage}&toolbar=0&navpanes=0&view=FitH`}
                  title={sourceFileName || documentTitle || "Documento PDF"}
                  className="w-full h-full border-0 pointer-events-none"
                />
              ) : isImageSource && sourceFileSignedUrl ? (
                <div className="w-full h-full p-6 flex items-center justify-center">
                  <img
                    src={sourceFileSignedUrl}
                    alt={sourceFileName || documentTitle || "Documento anexado"}
                    className="max-w-full max-h-full object-contain pointer-events-none"
                  />
                </div>
              ) : isEditingInPage && onContentMarkdownChange && !readOnly ? (
                <div className="h-full px-8 py-6 flex flex-col">
                  <textarea
                    value={contentMarkdown || ""}
                    onChange={(e) => onContentMarkdownChange(e.target.value)}
                    placeholder="Comece a redigir o contrato diretamente nesta folha A4..."
                    className="w-full h-full resize-none bg-transparent border-0 focus:outline-none font-serif text-sm text-foreground/90 leading-relaxed"
                  />
                </div>
              ) : (paginatedPages[currentPage - 1] || "").trim().length > 0 ? (
                <div className="h-full px-8 py-6 overflow-hidden pointer-events-none">
                  <ContractMarkdownRenderer content={paginatedPages[currentPage - 1]} />
                </div>
              ) : (
                <div className="h-full px-8 py-12 flex flex-col items-center justify-center text-center text-muted-foreground gap-2">
                  <FileText className="size-8 opacity-40" />
                  <p className="text-sm font-medium text-foreground">Página em branco</p>
                  <p className="text-xs max-w-sm">
                    Redija as cláusulas na aba Documento ou envie um arquivo PDF, Word (.docx) ou Markdown para preencher esta folha A4.
                  </p>
                </div>
              )}
            </div>

            {/* Bounding Boxes Arrastáveis & Redimensionáveis Sobre a Folha */}
            {visibleFields.map((field) => {
              const signer = signers.find((s) => s.index === field.signerIndex) || currentSigner;
              const isSelected = selectedFieldId === field.id;

              return (
                <div
                  key={field.id}
                  role="button"
                  tabIndex={0}
                  onPointerDown={(e) => {
                    setSelectedFieldId(field.id);
                    if (readOnly) return;
                    e.preventDefault();
                    setDragState({
                      mode: "drag",
                      fieldId: field.id,
                      startClientX: e.clientX,
                      startClientY: e.clientY,
                      origX: field.x,
                      origY: field.y,
                      origW: field.width,
                      origH: field.height,
                    });
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setSelectedFieldId(field.id);
                      return;
                    }
                    if (readOnly) return;
                    if (e.key === "Delete" || e.key === "Backspace") {
                      e.preventDefault();
                      handleDeleteField(field.id);
                      return;
                    }
                    const step = e.shiftKey ? 5 : 1;
                    let nextX = field.x;
                    let nextY = field.y;
                    if (e.key === "ArrowLeft") nextX = Math.max(2, field.x - step);
                    else if (e.key === "ArrowRight") nextX = Math.min(98 - field.width, field.x + step);
                    else if (e.key === "ArrowUp") nextY = Math.max(4, field.y - step);
                    else if (e.key === "ArrowDown") nextY = Math.min(95 - field.height, field.y + step);
                    else return;
                    e.preventDefault();
                    onFieldsChange(
                      fields.map((item) => (item.id === field.id ? { ...item, x: nextX, y: nextY } : item)),
                    );
                  }}
                  onClick={() => setSelectedFieldId(field.id)}
                  style={{
                    left: `${field.x}%`,
                    top: `${field.y}%`,
                    width: `${field.width}%`,
                    height: `${field.height}%`,
                    borderColor: signer.colorCode || TOKEN_HEX.blue600,
                  }}
                  className={`absolute z-20 border-2 rounded-lg flex items-center justify-between px-2 transition-colors duration-150 bg-card/95 shadow-xs touch-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                    readOnly ? "cursor-default" : "cursor-grab active:cursor-grabbing"
                  } ${
                    isSelected ? "ring-2 ring-primary/50" : "hover:border-primary"
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0 pointer-events-none">
                    <span
                      className="size-2.5 rounded-full shrink-0 waesy-dyn-bg"
                      style={{ "--dyn-bg": signer.colorCode || TOKEN_HEX.blue600 } as React.CSSProperties}
                    />
                    <span className="text-xs font-semibold truncate text-foreground">
                      {field.label || field.type}
                    </span>
                  </div>

                  {!readOnly && (
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        aria-label={`Remover campo ${field.label || field.type}`}
                        onPointerDown={(e) => e.stopPropagation()}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteField(field.id);
                        }}
                        className="text-muted-foreground hover:text-destructive p-1 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                      <span
                        role="separator"
                        aria-label="Redimensionar campo"
                        onPointerDown={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                          setSelectedFieldId(field.id);
                          setDragState({
                            mode: "resize",
                            fieldId: field.id,
                            startClientX: e.clientX,
                            startClientY: e.clientY,
                            origX: field.x,
                            origY: field.y,
                            origW: field.width,
                            origH: field.height,
                          });
                        }}
                        className="cursor-nwse-resize text-muted-foreground hover:text-primary p-1"
                      >
                        <GripHorizontal className="size-3" />
                      </span>
                    </div>
                  )}
                </div>
              );
            })}

            {/* Rodapé A4 com Autenticação Eletrônica */}
            <div className="px-8 py-3 border-t border-border/40 flex items-center justify-between text-xs text-muted-foreground relative z-10 bg-background/95">
              <span className="truncate">Autenticação Digital Waesy · SHA-256</span>
              <span>Pág. {currentPage}/{effectivePageCount}</span>
            </div>
          </div>
        </main>
      </div>

      {/* Barra de Ações Inferior (Trocar Arquivo / Mesclar / Avançar) */}
      <div className="px-4 py-3 border-t border-border/70 bg-card flex items-center justify-between">
        <div className="flex items-center gap-2">
          {onChangeFile && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onChangeFile}
              className="h-10 px-4 rounded-lg text-xs min-h-11 sm:min-h-0"
            >
              <RefreshCw className="size-3.5 mr-2" />
              Trocar arquivo
            </Button>
          )}
          {onMergeFile && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onMergeFile}
              className="h-10 px-4 rounded-lg text-xs min-h-11 sm:min-h-0"
            >
              <Layers className="size-3.5 mr-2" />
              Mesclar arquivo
            </Button>
          )}
        </div>

        {onAdvance && (
          <Button
            type="button"
            size="sm"
            onClick={onAdvance}
            className="h-11 px-6 rounded-lg text-xs sm:text-sm font-bold min-h-11 gap-2 shadow-xs cursor-pointer"
          >
            <span>Avançar para Envio</span>
            <ArrowRight className="size-4" />
          </Button>
        )}
      </div>

      {/* Modal Canônico de Repetição de Campo */}
      <Dialog open={repeatModalOpen} onOpenChange={setRepeatModalOpen}>
        <DialogContent className="sm:max-w-md rounded-lg p-6">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-foreground">Repetir campo</DialogTitle>
          </DialogHeader>

          <RadioGroup
            value={repeatOption}
            onValueChange={(v: any) => setRepeatOption(v)}
            className="space-y-3 py-3"
          >
            <div className="flex items-center space-x-3 p-3 rounded-lg border border-border/70 hover:bg-muted/40 cursor-pointer">
              <RadioGroupItem value="page" id="r1" />
              <Label htmlFor="r1" className="text-xs font-medium cursor-pointer text-foreground">
                Apenas nesta página
              </Label>
            </div>

            <div className="flex items-center space-x-3 p-3 rounded-lg border border-border/70 hover:bg-muted/40 cursor-pointer">
              <RadioGroupItem value="all" id="r2" />
              <Label htmlFor="r2" className="text-xs font-medium cursor-pointer text-foreground">
                Repetir em todas as páginas
              </Label>
            </div>

            <div className="flex items-center space-x-3 p-3 rounded-lg border border-border/70 hover:bg-muted/40 cursor-pointer">
              <RadioGroupItem value="all_except_last" id="r3" />
              <Label htmlFor="r3" className="text-xs font-medium cursor-pointer text-foreground">
                Repetir em todas as páginas exceto a última
              </Label>
            </div>
          </RadioGroup>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setRepeatModalOpen(false)}
              className="rounded-lg text-xs h-10 min-h-11 sm:min-h-0"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={applyRepeatModal}
              className="rounded-lg text-xs h-10 font-semibold min-h-11 sm:min-h-0"
            >
              Aplicar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
