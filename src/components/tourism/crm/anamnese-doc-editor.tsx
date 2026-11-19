import * as React from "react";
import {
  HeartPulse,
  FileText,
  CheckSquare,
  Sparkles,
  History,
  Printer,
  Copy,
  Plus,
  Save,
  Check,
  ChevronDown,
  RotateCcw,
  Highlighter,
  PenTool,
  Bold,
  Italic,
  Underline,
  List,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export interface AnamneseStructuredData {
  travelStyles: string[];
  lodgingPreferences: string[];
  flightPreferences: string[];
  dietaryRestrictions: string[];
  healthAndAccessibility: string[];
  desiredExperiences: string[];
  consultantNotes: string;
  docHtmlContent?: string;
}

export interface AnamneseVersionRecord {
  id: string;
  versionTitle: string;
  savedAt: string;
  authorName: string;
  data: AnamneseStructuredData;
}

export interface AnamneseDocEditorProps {
  initialData?: Partial<AnamneseStructuredData>;
  history?: AnamneseVersionRecord[];
  clientName?: string;
  destination?: string;
  onSave: (data: AnamneseStructuredData, newVersionTitle?: string) => Promise<void> | void;
  disabled?: boolean;
  className?: string;
}

export const ANAMNESE_TAXONOMY = {
  travelStyles: [
    "Econômica",
    "Conforto",
    "Premium / Luxo",
    "Ecoturismo & Aventura",
    "Lua de Mel / Romântica",
    "Família com Crianças",
    "Corporativo / Negócios",
    "Cruzeiro Marítimo",
    "Terceira Idade / Melhor Idade",
  ],
  lodgingPreferences: [
    "Hotel Central / Urbano",
    "Resort All-Inclusive",
    "Pousada Boutique / Charme",
    "Hotel Fazenda",
    "Apart-Hotel / Flat",
    "Casa / Villa de Temporada",
  ],
  flightPreferences: [
    "Voo Direto Prioritário",
    "Assento Janela",
    "Assento Corredor",
    "Assentos Juntos",
    "Bagagem Despachada (23kg)",
    "Bagagem de Mão Apenas",
    "Classe Executiva / Premium",
  ],
  dietaryRestrictions: [
    "Café da Manhã Incluso",
    "Meia Pensão (MAP)",
    "Pensão Completa (FAP)",
    "All Inclusive",
    "Vegetariano",
    "Vegano",
    "Celíaco (Sem Glúten)",
    "Intolerante a Lactose",
    "Alergia a Frutos do Mar",
  ],
  healthAndAccessibility: [
    "PCD / Cadeira de Rodas",
    "Mobilidade Reduzida",
    "Espectro Autista (TEA)",
    "Medicamentos Controlados",
    "Gestante",
    "Fobia de Voo / Claustrofobia",
    "Necessidade de Oxigênio",
  ],
  desiredExperiences: [
    "Praia & Sol",
    "Gastronomia & Vinhos",
    "Compras & Outlets",
    "Parques Temáticos",
    "Cultura & História",
    "Ecoturismo & Natureza",
    "Neve & Esqui",
  ],
};

export function AnamneseDocEditor({
  initialData,
  history = [],
  clientName = "Passageiro",
  destination = "Destino a definir",
  onSave,
  disabled = false,
  className,
}: AnamneseDocEditorProps) {
  const [viewMode, setViewMode] = React.useState<"checklist" | "doc" | "history">("checklist");
  const [isSaving, setIsSaving] = React.useState(false);
  const [versionNote, setVersionNote] = React.useState("");

  const [data, setData] = React.useState<AnamneseStructuredData>({
    travelStyles: initialData?.travelStyles || [],
    lodgingPreferences: initialData?.lodgingPreferences || [],
    flightPreferences: initialData?.flightPreferences || [],
    dietaryRestrictions: initialData?.dietaryRestrictions || [],
    healthAndAccessibility: initialData?.healthAndAccessibility || [],
    desiredExperiences: initialData?.desiredExperiences || [],
    consultantNotes: initialData?.consultantNotes || "",
    docHtmlContent: initialData?.docHtmlContent || "",
  });

  const toggleItem = (category: keyof typeof ANAMNESE_TAXONOMY, item: string) => {
    setData((prev) => {
      const currentList = prev[category] || [];
      const exists = currentList.includes(item);
      const nextList = exists ? currentList.filter((x) => x !== item) : [...currentList, item];
      return { ...prev, [category]: nextList };
    });
  };

  const handleSaveCurrent = async (asNewVersion = false) => {
    setIsSaving(true);
    try {
      await onSave(data, asNewVersion ? versionNote.trim() || undefined : undefined);
      toast.success(asNewVersion ? "Nova versão da Anamnese registrada no histórico!" : "Anamnese salva com sucesso!");
      setVersionNote("");
    } catch (err: any) {
      toast.error(err?.message || "Erro ao salvar Anamnese.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleRestoreVersion = (ver: AnamneseVersionRecord) => {
    setData(ver.data);
    setViewMode("checklist");
    toast.info(`Anamnese restaurada para a versão de ${new Date(ver.savedAt).toLocaleDateString("pt-BR")}`);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className={cn("space-y-4", className)}>
      {/* ── BARRA SUPERIOR DE MODOS (CHECKLIST / DOC WORD / HISTÓRICO) ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl border border-border/80 bg-card">
        <div className="flex items-center gap-2 p-1 rounded-lg bg-muted/60">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setViewMode("checklist")}
            className={cn(
              "h-11 min-h-11 sm:h-9 sm:min-h-9 px-3 rounded-md text-xs font-semibold gap-2 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
              viewMode === "checklist" ? "bg-background text-foreground shadow-2xs font-bold" : "text-muted-foreground",
            )}
          >
            <CheckSquare className="size-4" />
            <span>Tags & Checklist</span>
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setViewMode("doc")}
            className={cn(
              "h-11 min-h-11 sm:h-9 sm:min-h-9 px-3 rounded-md text-xs font-semibold gap-2 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
              viewMode === "doc" ? "bg-background text-foreground shadow-2xs font-bold" : "text-muted-foreground",
            )}
          >
            <FileText className="size-4" />
            <span>Ficha Doc (Word)</span>
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setViewMode("history")}
            className={cn(
              "h-11 min-h-11 sm:h-9 sm:min-h-9 px-3 rounded-md text-xs font-semibold gap-2 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
              viewMode === "history" ? "bg-background text-foreground shadow-2xs font-bold" : "text-muted-foreground",
            )}
          >
            <History className="size-4" />
            <span>Histórico ({history.length})</span>
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handlePrint}
            className="h-11 min-h-11 sm:h-9 sm:min-h-9 px-3 rounded-lg text-xs font-semibold gap-2 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            title="Imprimir Ficha de Anamnese"
          >
            <Printer className="size-4 text-muted-foreground" />
            <span className="hidden sm:inline">Imprimir PDF</span>
          </Button>

          <Button
            type="button"
            disabled={disabled || isSaving}
            onClick={() => handleSaveCurrent(false)}
            className="h-11 min-h-11 sm:h-9 sm:min-h-9 px-4 text-xs font-bold rounded-lg bg-primary text-primary-foreground gap-2 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <Save className="size-4" />
            <span>{isSaving ? "Salvando..." : "Salvar Anamnese"}</span>
          </Button>
        </div>
      </div>

      {/* ── MODO 1: CHECKLIST & TAGS CONTEXTUAIS POR NICHO ── */}
      {viewMode === "checklist" && (
        <div className="space-y-4">
          {/* Estilo de Viagem */}
          <div className="p-4 rounded-xl border border-border/80 bg-card space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-foreground">
                Estilo de Viagem & Perfil ({data.travelStyles.length})
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {ANAMNESE_TAXONOMY.travelStyles.map((item) => {
                const isSelected = data.travelStyles.includes(item);
                return (
                  <button
                    key={item}
                    type="button"
                    disabled={disabled}
                    onClick={() => toggleItem("travelStyles", item)}
                    className={cn(
                      "h-11 min-h-11 px-4 rounded-lg border text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                      isSelected
                        ? "border-primary bg-primary/10 text-primary font-bold shadow-2xs"
                        : "border-border/70 bg-background text-foreground hover:bg-muted/40",
                    )}
                  >
                    {isSelected && <Check className="size-4" />}
                    <span>{item}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Preferência de Hospedagem */}
          <div className="p-4 rounded-xl border border-border/80 bg-card space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-foreground block">
              Preferência de Hospedagem ({data.lodgingPreferences.length})
            </span>
            <div className="flex flex-wrap gap-2">
              {ANAMNESE_TAXONOMY.lodgingPreferences.map((item) => {
                const isSelected = data.lodgingPreferences.includes(item);
                return (
                  <button
                    key={item}
                    type="button"
                    disabled={disabled}
                    onClick={() => toggleItem("lodgingPreferences", item)}
                    className={cn(
                      "h-11 min-h-11 px-4 rounded-lg border text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                      isSelected
                        ? "border-primary bg-primary/10 text-primary font-bold shadow-2xs"
                        : "border-border/70 bg-background text-foreground hover:bg-muted/40",
                    )}
                  >
                    {isSelected && <Check className="size-4" />}
                    <span>{item}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Voo & Bagagem */}
          <div className="p-4 rounded-xl border border-border/80 bg-card space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-foreground block">
              Preferência de Voo & Bagagem ({data.flightPreferences.length})
            </span>
            <div className="flex flex-wrap gap-2">
              {ANAMNESE_TAXONOMY.flightPreferences.map((item) => {
                const isSelected = data.flightPreferences.includes(item);
                return (
                  <button
                    key={item}
                    type="button"
                    disabled={disabled}
                    onClick={() => toggleItem("flightPreferences", item)}
                    className={cn(
                      "h-11 min-h-11 px-4 rounded-lg border text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                      isSelected
                        ? "border-primary bg-primary/10 text-primary font-bold shadow-2xs"
                        : "border-border/70 bg-background text-foreground hover:bg-muted/40",
                    )}
                  >
                    {isSelected && <Check className="size-4" />}
                    <span>{item}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Alimentação & Restrições Dietéticas */}
          <div className="p-4 rounded-xl border border-border/80 bg-card space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-foreground block">
              Alimentação & Restrições Dietéticas ({data.dietaryRestrictions.length})
            </span>
            <div className="flex flex-wrap gap-2">
              {ANAMNESE_TAXONOMY.dietaryRestrictions.map((item) => {
                const isSelected = data.dietaryRestrictions.includes(item);
                return (
                  <button
                    key={item}
                    type="button"
                    disabled={disabled}
                    onClick={() => toggleItem("dietaryRestrictions", item)}
                    className={cn(
                      "h-11 min-h-11 px-4 rounded-lg border text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                      isSelected
                        ? "border-primary bg-primary/10 text-primary font-bold shadow-2xs"
                        : "border-border/70 bg-background text-foreground hover:bg-muted/40",
                    )}
                  >
                    {isSelected && <Check className="size-4" />}
                    <span>{item}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Saúde, Acessibilidade & Cuidados Especiais */}
          <div className="p-4 rounded-xl border border-border/80 bg-card space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-foreground block">
              Saúde, Acessibilidade & Cuidados Especiais ({data.healthAndAccessibility.length})
            </span>
            <div className="flex flex-wrap gap-2">
              {ANAMNESE_TAXONOMY.healthAndAccessibility.map((item) => {
                const isSelected = data.healthAndAccessibility.includes(item);
                return (
                  <button
                    key={item}
                    type="button"
                    disabled={disabled}
                    onClick={() => toggleItem("healthAndAccessibility", item)}
                    className={cn(
                      "h-11 min-h-11 px-4 rounded-lg border text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                      isSelected
                        ? "border-destructive/60 bg-destructive/10 text-destructive font-bold shadow-2xs"
                        : "border-border/70 bg-background text-foreground hover:bg-muted/40",
                    )}
                  >
                    {isSelected && <Check className="size-4" />}
                    <span>{item}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Experiências & Roteiro Desejado */}
          <div className="p-4 rounded-xl border border-border/80 bg-card space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-foreground block">
              Experiências Desejadas no Roteiro ({data.desiredExperiences.length})
            </span>
            <div className="flex flex-wrap gap-2">
              {ANAMNESE_TAXONOMY.desiredExperiences.map((item) => {
                const isSelected = data.desiredExperiences.includes(item);
                return (
                  <button
                    key={item}
                    type="button"
                    disabled={disabled}
                    onClick={() => toggleItem("desiredExperiences", item)}
                    className={cn(
                      "h-11 min-h-11 px-4 rounded-lg border text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                      isSelected
                        ? "border-primary bg-primary/10 text-primary font-bold shadow-2xs"
                        : "border-border/70 bg-background text-foreground hover:bg-muted/40",
                    )}
                  >
                    {isSelected && <Check className="size-4" />}
                    <span>{item}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Anotações Confidenciais do Consultor */}
          <div className="p-4 rounded-xl border border-border/80 bg-card space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-foreground block">
              Parecer Técnico & Anotações do Consultor
            </span>
            <Textarea
              value={data.consultantNotes}
              onChange={(e) => setData((prev) => ({ ...prev, consultantNotes: e.target.value }))}
              placeholder="Descreva detalhes específicos da entrevista, restrições não listadas, datas flexíveis ou observações cruciais..."
              rows={4}
              className="text-xs rounded-lg"
            />
          </div>

          {/* Salvar como Nova Versão de Histórico */}
          <div className="p-4 rounded-xl border border-dashed border-border/80 bg-muted/20 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="space-y-1">
              <span className="text-xs font-bold text-foreground">Gravar Versão no Histórico</span>
              <p className="text-2xs text-muted-foreground">
                Crie um ponto de restauração congelado desta anamnese para auditoria do atendimento.
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Input
                value={versionNote}
                onChange={(e) => setVersionNote(e.target.value)}
                placeholder="Ex: Entrevista Inicial, Pós-ligação..."
                className="h-11 min-h-11 text-xs rounded-lg w-full sm:w-56 bg-background"
              />
              <Button
                type="button"
                variant="outline"
                disabled={disabled || isSaving}
                onClick={() => handleSaveCurrent(true)}
                className="h-11 min-h-11 px-4 text-xs font-semibold rounded-lg shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                Gravar Versão
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODO 2: FICHA DOC WORD / EDITÁVEL COM MARCA-TEXTO & CANETINHA ── */}
      {viewMode === "doc" && (
        <div className="space-y-4">
          {/* Folha Formal A4 de Anamnese */}
          <div className="p-8 sm:p-12 rounded-2xl border border-border bg-card shadow-2xs space-y-6 max-w-3xl mx-auto">
            {/* Cabeçalho do Documento */}
            <div className="border-b-2 border-foreground pb-4 flex items-start justify-between">
              <div>
                <span className="text-2xs font-mono font-bold uppercase tracking-widest text-primary">
                  Dossiê Clínico & Comercial de Viagem
                </span>
                <h2 className="text-xl font-black uppercase text-foreground tracking-tight mt-1">
                  Ficha de Anamnese — {clientName}
                </h2>
                <p className="text-xs text-muted-foreground">Destino Previsto: {destination}</p>
              </div>
              <div className="text-right text-2xs font-mono text-muted-foreground space-y-1">
                <div>Data: {new Date().toLocaleDateString("pt-BR")}</div>
                <Badge variant="outline" className="text-3xs uppercase font-bold text-emerald-600 border-emerald-500/30">
                  Documento Oficial
                </Badge>
              </div>
            </div>

            {/* Resumo Consolidado das Preferências */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-3 rounded-xl bg-muted/30 border border-border/60 space-y-1">
                <span className="text-2xs font-bold uppercase tracking-wider text-muted-foreground block">
                  Perfil & Estilo
                </span>
                <p className="font-semibold text-foreground">
                  {data.travelStyles.join(", ") || "Não especificado"}
                </p>
              </div>

              <div className="p-3 rounded-xl bg-muted/30 border border-border/60 space-y-1">
                <span className="text-2xs font-bold uppercase tracking-wider text-muted-foreground block">
                  Hospedagem Preferida
                </span>
                <p className="font-semibold text-foreground">
                  {data.lodgingPreferences.join(", ") || "Não especificado"}
                </p>
              </div>

              <div className="p-3 rounded-xl bg-muted/30 border border-border/60 space-y-1">
                <span className="text-2xs font-bold uppercase tracking-wider text-muted-foreground block">
                  Voo & Bagagem
                </span>
                <p className="font-semibold text-foreground">
                  {data.flightPreferences.join(", ") || "Não especificado"}
                </p>
              </div>

              <div className="p-3 rounded-xl bg-muted/30 border border-border/60 space-y-1">
                <span className="text-2xs font-bold uppercase tracking-wider text-muted-foreground block">
                  Alimentação & Restrições
                </span>
                <p className="font-semibold text-foreground">
                  {data.dietaryRestrictions.join(", ") || "Sem restrições"}
                </p>
              </div>
            </div>

            {/* Alerta de Saúde e Cuidados */}
            {data.healthAndAccessibility.length > 0 && (
              <div className="p-4 rounded-xl border border-destructive/40 bg-destructive/5 space-y-1 text-xs">
                <span className="text-2xs font-bold uppercase tracking-wider text-destructive block">
                  Atenção / Cuidados Especiais de Saúde & Acessibilidade:
                </span>
                <p className="font-bold text-destructive">
                  {data.healthAndAccessibility.join(" • ")}
                </p>
              </div>
            )}

            {/* Área de Redação Livre / Anotações com Estilo Doc */}
            <div className="space-y-2 pt-2">
              <div className="flex items-center justify-between pb-1 border-b border-border/50">
                <span className="text-xs font-bold uppercase tracking-wider text-foreground">
                  Observações & Detalhamento da Entrevista
                </span>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-3xs text-muted-foreground uppercase font-mono">Realces Rápidos:</span>
                  <button
                    type="button"
                    onClick={() => {
                      const sample = `\n[DESTAQUE] `;
                      setData((p) => ({ ...p, consultantNotes: p.consultantNotes + sample }));
                    }}
                    className="h-11 min-h-11 px-3 rounded-lg border border-warning/40 bg-warning/10 text-warning text-xs font-bold cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary flex items-center gap-1"
                    title="Realçar em Amarelo"
                  >
                    <span>Destaque</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const sample = `\n[IMPORTANTE] `;
                      setData((p) => ({ ...p, consultantNotes: p.consultantNotes + sample }));
                    }}
                    className="h-11 min-h-11 px-3 rounded-lg border border-emerald-500/40 bg-emerald-500/10 text-emerald-600 text-xs font-bold cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary flex items-center gap-1"
                    title="Realçar em Verde"
                  >
                    <span>Importante</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const sample = `\n[URGENTE] `;
                      setData((p) => ({ ...p, consultantNotes: p.consultantNotes + sample }));
                    }}
                    className="h-11 min-h-11 px-3 rounded-lg border border-rose-500/40 bg-rose-500/10 text-rose-600 text-xs font-bold cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary flex items-center gap-1"
                    title="Realçar em Rosa"
                  >
                    <span>Urgente</span>
                  </button>
                </div>
              </div>

              <Textarea
                value={data.consultantNotes}
                onChange={(e) => setData((prev) => ({ ...prev, consultantNotes: e.target.value }))}
                placeholder="Redija as particularidades da anamnese deste passageiro..."
                rows={8}
                className="text-xs font-mono leading-relaxed rounded-xl border border-border/80 bg-background"
              />
            </div>

            {/* Rodapé do Documento */}
            <div className="pt-6 border-t border-border/60 flex items-center justify-between text-2xs text-muted-foreground">
              <span>Waesy Travel Intelligence &copy; {new Date().getFullYear()}</span>
              <span>Conforme LGPD (Lei 13.709/2018)</span>
            </div>
          </div>
        </div>
      )}

      {/* ── MODO 3: HISTÓRICO DE VERSÕES ANTERIORES ── */}
      {viewMode === "history" && (
        <div className="space-y-3">
          {history.length === 0 ? (
            <div className="p-8 text-center text-xs text-muted-foreground border border-dashed border-border/80 rounded-xl space-y-2 bg-card">
              <History className="size-8 mx-auto text-muted-foreground/60" />
              <p className="font-bold text-foreground">Nenhuma versão anterior gravada no histórico</p>
              <p className="text-2xs text-muted-foreground">
                Ao alterar a anamnese e clicar em &quot;Gravar Versão&quot;, cada snapshot será preservado com data, hora e autor.
              </p>
            </div>
          ) : (
            history.map((ver, idx) => (
              <div
                key={ver.id || idx}
                className="p-4 rounded-xl border border-border/80 bg-card flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-foreground">
                      {ver.versionTitle || `Versão #${history.length - idx}`}
                    </span>
                    <Badge variant="outline" className="text-3xs font-mono">
                      {new Date(ver.savedAt).toLocaleDateString("pt-BR")} às{" "}
                      {new Date(ver.savedAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                    </Badge>
                  </div>
                  <p className="text-2xs text-muted-foreground">
                    Registrado por: <strong className="text-foreground">{ver.authorName || "Consultor"}</strong> ·{" "}
                    {ver.data.travelStyles.length} estilos, {ver.data.lodgingPreferences.length} hospedagens
                  </p>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleRestoreVersion(ver)}
                  className="h-11 min-h-11 sm:h-9 sm:min-h-9 px-3 text-xs font-semibold gap-2 cursor-pointer shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  <RotateCcw className="size-4" />
                  <span>Restaurar Esta Versão</span>
                </Button>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
