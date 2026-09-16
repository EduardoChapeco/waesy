import React, { useState, useRef } from "react";
import {
  FileText,
  Trash2,
  Copy,
  Layers,
  Calendar,
  User,
  Hash,
  CheckSquare,
  PenTool,
  Upload,
  ArrowRight,
  RefreshCw,
  Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { type SignatureFieldDTO } from "@/services/contracts.functions";

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
  readOnly?: boolean;
}

const FIELD_TAGS = [
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
  readOnly = false,
}: SignaturePositionerCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeSignerIndex, setActiveSignerIndex] = useState<number>(0);
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);

  // Modal de repetição de campo
  const [repeatModalOpen, setRepeatModalOpen] = useState(false);
  const [pendingFieldToRepeat, setPendingFieldToRepeat] = useState<SignatureFieldDTO | null>(null);
  const [repeatOption, setRepeatOption] = useState<"page" | "all" | "all_except_last">("page");

  const currentSigner = signers[activeSignerIndex] || signers[0] || {
    index: 0,
    name: "Signatário 1",
    email: "",
    colorCode: "#2563eb",
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
    <div className="flex flex-col h-full w-full bg-background rounded-2xl border border-border/80 overflow-hidden select-none">
      {/* Topo do Posicionador */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/70 bg-card">
        <div className="flex items-center gap-3">
          <div className="size-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
            <PenTool className="size-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-foreground">Posicionar Assinaturas e Rubricas</h2>
            <p className="text-[11px] text-muted-foreground">
              {documentTitle || "Arraste ou clique nas marcações para posicionar no documento"}
            </p>
          </div>
        </div>

        {/* Seletor de Páginas */}
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 px-2.5 rounded-lg text-xs"
            disabled={currentPage <= 1}
            onClick={() => onPageChange(currentPage - 1)}
          >
            Anterior
          </Button>
          <span className="text-xs font-semibold px-2 py-1 bg-muted rounded-md text-foreground">
            Pág. {currentPage} de {pageCount}
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 px-2.5 rounded-lg text-xs"
            disabled={currentPage >= pageCount}
            onClick={() => onPageChange(currentPage + 1)}
          >
            Próxima
          </Button>
        </div>
      </div>

      {/* Grid Central: Barra Lateral de Signatários + Canvas do Documento */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        {/* Barra Lateral de Signatários & Tags */}
        <aside className="w-full md:w-80 border-b md:border-b-0 md:border-r border-border/70 bg-muted/20 p-4 space-y-5 overflow-y-auto">
          <div>
            <Label className="text-xs uppercase tracking-wider font-bold text-muted-foreground mb-2.5 block">
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
                    className={`w-full text-left p-3 rounded-xl border transition-all text-xs sm:text-sm flex items-center justify-between min-h-[44px] cursor-pointer ${
                      isSelected
                        ? "bg-card border-primary/50 shadow-xs ring-1 ring-primary/20 font-semibold"
                        : "bg-background/70 border-border/70 hover:border-border hover:bg-background"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className="size-3.5 rounded-full shrink-0"
                        style={{ backgroundColor: s.colorCode || "#2563eb" }}
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
            <Label className="text-xs uppercase tracking-wider font-bold text-muted-foreground mb-2.5 block">
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
                    className="flex items-center gap-2.5 p-3 rounded-xl border border-border/80 bg-card hover:bg-muted/60 transition-all text-left text-xs sm:text-sm font-semibold text-foreground hover:border-primary/40 active:scale-[0.98] min-h-[44px] cursor-pointer shadow-2xs"
                  >
                    <Icon className="size-4 text-primary shrink-0" />
                    <span className="truncate">{tag.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-card border border-border/70 space-y-2 text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5 font-bold text-foreground">
              <Info className="size-4 text-primary shrink-0" />
              <span>Dica de Posicionamento</span>
            </div>
            <p className="leading-relaxed">
              Você pode repetir o campo de <strong>Rubrica</strong> em todas as páginas com 1 toque.
            </p>
          </div>
        </aside>

        {/* Canvas de Visualização do Documento */}
        <main className="flex-1 bg-muted/40 p-4 md:p-8 flex items-center justify-center overflow-auto">
          {/* Folha A4 Representativa */}
          <div
            ref={containerRef}
            className="relative w-full max-w-[700px] aspect-[1/1.414] bg-card text-card-foreground rounded-xl shadow-md border border-border/80 p-8 flex flex-col justify-between overflow-hidden"
          >
            {/* Header Simulado da Página */}
            <div className="border-b border-border/40 pb-3 flex items-center justify-between text-[11px] text-muted-foreground">
              <span className="font-semibold uppercase tracking-wider">{documentTitle || "INSTRUMENTO PARTICULAR"}</span>
              <span>Página {currentPage}</span>
            </div>

            {/* Corpo Representativo / Guia de Linhas */}
            <div className="space-y-3 py-6 text-xs text-muted-foreground/80 leading-relaxed font-serif">
              <div className="h-2.5 bg-muted/70 rounded-full w-3/4" />
              <div className="h-2.5 bg-muted/60 rounded-full w-full" />
              <div className="h-2.5 bg-muted/60 rounded-full w-11/12" />
              <div className="h-2.5 bg-muted/60 rounded-full w-4/5" />
              <div className="h-2.5 bg-muted/70 rounded-full w-full" />
              <div className="h-2.5 bg-muted/50 rounded-full w-2/3" />
              <div className="my-6 border-t border-dashed border-border/50" />
              <div className="h-2.5 bg-muted/60 rounded-full w-full" />
              <div className="h-2.5 bg-muted/70 rounded-full w-5/6" />
              <div className="h-2.5 bg-muted/60 rounded-full w-full" />
              <div className="h-2.5 bg-muted/50 rounded-full w-1/2" />
            </div>

            {/* Bounding Boxes Renderizados Sobre a Folha */}
            {visibleFields.map((field) => {
              const signer = signers.find((s) => s.index === field.signerIndex) || currentSigner;
              const isSelected = selectedFieldId === field.id;

              return (
                <div
                  key={field.id}
                  onClick={() => setSelectedFieldId(field.id)}
                  style={{
                    left: `${field.x}%`,
                    top: `${field.y}%`,
                    width: `${field.width}%`,
                    height: `${field.height}%`,
                    borderColor: signer.colorCode || "#2563eb",
                  }}
                  className={`absolute border-2 rounded-lg flex items-center justify-between px-2 cursor-move transition-all bg-card/95 shadow-xs ${
                    isSelected ? "ring-2 ring-primary/40 shadow-md" : "hover:border-primary"
                  }`}
                >
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span
                      className="size-2 rounded-full shrink-0"
                      style={{ backgroundColor: signer.colorCode }}
                    />
                    <span className="text-[10px] font-bold truncate text-foreground">
                      {field.label || field.type}
                    </span>
                  </div>

                  {!readOnly && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteField(field.id);
                      }}
                      className="text-muted-foreground hover:text-destructive p-0.5"
                    >
                      <Trash2 className="size-3" />
                    </button>
                  )}
                </div>
              );
            })}

            {/* Rodapé Simulado com Autenticação Eletrônica */}
            <div className="border-t border-border/40 pt-3 flex items-center justify-between text-[10px] text-muted-foreground">
              <span className="truncate">Autenticação Digital Waesy Platform · SHA-256</span>
              <span>Pág. {currentPage}/{pageCount}</span>
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
              className="h-10 px-3.5 rounded-xl text-xs"
            >
              <RefreshCw className="size-3.5 mr-1.5" />
              Trocar arquivo
            </Button>
          )}
          {onMergeFile && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onMergeFile}
              className="h-10 px-3.5 rounded-xl text-xs"
            >
              <Layers className="size-3.5 mr-1.5" />
              Mesclar arquivo
            </Button>
          )}
        </div>

        {onAdvance && (
          <Button
            type="button"
            size="sm"
            onClick={onAdvance}
            className="h-11 px-6 rounded-xl text-xs sm:text-sm font-bold min-h-[44px] gap-2 shadow-xs cursor-pointer"
          >
            <span>Avançar para Envio</span>
            <ArrowRight className="size-4" />
          </Button>
        )}
      </div>

      {/* Modal Canônico de Repetição de Campo */}
      <Dialog open={repeatModalOpen} onOpenChange={setRepeatModalOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl p-6">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-foreground">Repetir campo</DialogTitle>
          </DialogHeader>

          <RadioGroup
            value={repeatOption}
            onValueChange={(v: any) => setRepeatOption(v)}
            className="space-y-3 py-3"
          >
            <div className="flex items-center space-x-3 p-3 rounded-xl border border-border/70 hover:bg-muted/40 cursor-pointer">
              <RadioGroupItem value="page" id="r1" />
              <Label htmlFor="r1" className="text-xs font-medium cursor-pointer text-foreground">
                Apenas nesta página
              </Label>
            </div>

            <div className="flex items-center space-x-3 p-3 rounded-xl border border-border/70 hover:bg-muted/40 cursor-pointer">
              <RadioGroupItem value="all" id="r2" />
              <Label htmlFor="r2" className="text-xs font-medium cursor-pointer text-foreground">
                Repetir em todas as páginas
              </Label>
            </div>

            <div className="flex items-center space-x-3 p-3 rounded-xl border border-border/70 hover:bg-muted/40 cursor-pointer">
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
              className="rounded-xl text-xs h-10"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={applyRepeatModal}
              className="rounded-xl text-xs h-10 font-semibold"
            >
              Aplicar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
