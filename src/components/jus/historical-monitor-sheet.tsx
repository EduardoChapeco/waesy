import { useState, useTransition } from "react";
import { Calendar, Trash2, Plus, SlidersHorizontal, X, Check, Building2, Tag, Users, Clock, ShieldAlert } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { saveLawsuitMonitor } from "@/services/jus.functions";
import { cn } from "@/lib/utils";

export interface HistoricalMonitorSheetProps {
 open: boolean;
 onOpenChange: (open: boolean) => void;
 onSuccess?: () => void;
}

const PRESET_TAGS = [
 "Criminal",
 "Falências",
 "Seguradoras",
 "Trabalhista",
 "Tributário",
 "Cível",
 "Família",
 "Consumidor",
 "Ambiental",
 "Execução Fiscal",
];

const PRESET_COURTS = [
 "TJSP",
 "TRF4",
 "TJRJ",
 "TRCE",
 "TRRN",
 "TRF1",
 "TRF3",
 "TJMG",
 "STJ",
 "TST",
 "TJSC",
 "TJPR",
 "TJRS",
];

export function HistoricalMonitorSheet({
 open,
 onOpenChange,
 onSuccess,
}: HistoricalMonitorSheetProps) {
 const [isPending, startTransition] = useTransition();

 // Form States
 const [title, setTitle] = useState("");
 const [docInput, setDocInput] = useState("");
 const [documentKeys, setDocumentKeys] = useState<string[]>([
 "52.746.143/0021-88",
 "SP1950566",
 "144.005.987-58",
 ]);

 // Filters States
 const [selectedTags, setSelectedTags] = useState<string[]>(["Criminal", "Falências", "Seguradoras"]);
 const [selectedCourts, setSelectedCourts] = useState<string[]>([
 "TJSP",
 "TRF4",
 "TJRJ",
 "TRCE",
 "TRRN",
 "TRF1",
 "TRF3",
 "TJMG",
 ]);
 const [partiesFilter, setPartiesFilter] = useState("");
 const [partySide, setPartySide] = useState<"all" | "active" | "passive" | "third_party">("all");
 const [dateFrom, setDateFrom] = useState("2019-03-11");
 const [dateTo, setDateTo] = useState("2024-04-10");

 const handleAddDocument = () => {
 const trimmed = docInput.trim();
 if (!trimmed) return;
 if (documentKeys.includes(trimmed)) {
 toast.error("Documento já adicionado.");
 return;
 }
 setDocumentKeys([...documentKeys, trimmed]);
 setDocInput("");
 };

 const handleRemoveDocument = (doc: string) => {
 setDocumentKeys(documentKeys.filter((d) => d !== doc));
 };

 const toggleTag = (tag: string) => {
 if (selectedTags.includes(tag)) {
 setSelectedTags(selectedTags.filter((t) => t !== tag));
 } else {
 setSelectedTags([...selectedTags, tag]);
 }
 };

 const toggleCourt = (court: string) => {
 if (selectedCourts.includes(court)) {
 setSelectedCourts(selectedCourts.filter((c) => c !== court));
 } else {
 setSelectedCourts([...selectedCourts, court]);
 }
 };

 const handleClearFilters = () => {
 setSelectedTags([]);
 setSelectedCourts([]);
 setPartiesFilter("");
 setPartySide("all");
 setDateFrom("");
 setDateTo("");
 };

 const appliedFiltersCount =
 (selectedTags.length > 0 ? 1 : 0) +
 (selectedCourts.length > 0 ? 1 : 0) +
 (partiesFilter ? 1 : 0) +
 (partySide !== "all" ? 1 : 0) +
 (dateFrom || dateTo ? 1 : 0);

 const handleSubmit = () => {
 if (!title.trim()) {
 toast.error("Informe um nome para identificar este monitoramento.");
 return;
 }
 if (documentKeys.length === 0) {
 toast.error("Insira ao menos um documento (CPF, CNPJ ou OAB).");
 return;
 }

 startTransition(async () => {
 try {
 await saveLawsuitMonitor({
 data: {
 title: title.trim(),
 document_keys: documentKeys,
 tags: selectedTags,
 courts: selectedCourts,
 parties_filter: partiesFilter || undefined,
 party_side: partySide,
 date_from: dateFrom || undefined,
 date_to: dateTo || undefined,
 },
 });

 toast.success(`Monitoramento "${title}" iniciado com sucesso!`);
 onOpenChange(false);
 onSuccess?.();
 } catch (err: any) {
 toast.error(err.message || "Erro ao iniciar monitoramento.");
 }
 });
 };

 return (
 <Sheet open={open} onOpenChange={onOpenChange}>
 <SheetContent
 side="right" size="wide" className="w-full max-w-full sm:max-w-3xl md:max-w-4xl lg:max-w-[70vw] xl:max-w-[70vw] lg:max-w-3xl p-0 flex flex-col h-[100dvh] bg-background border-l border-border"
 >
 {/* Topo do Sheet */}
 <SheetHeader className="p-6 border-b border-border/80 bg-card/40">
 <div className="flex items-center gap-2 text-xs font-bold text-primary uppercase tracking-wider font-mono">
 <Calendar className="size-4" />
 <span>Consulta Histórica e Monitoramento Contínuo</span>
 </div>
 <SheetTitle className="text-xl font-bold tracking-tight text-foreground">
 Novo Monitoramento Judicial
 </SheetTitle>
 <SheetDescription className="text-xs text-muted-foreground">
 Descubra todos os processos já distribuídos no passado até a data atual e receba alertas de novas movimentações.
 </SheetDescription>
 </SheetHeader>

 {/* Corpo com Grid Dividido (Formulário + Filtros Especializados) */}
 <div className="flex-1 overflow-y-auto no-scrollbar p-6 grid grid-cols-1 md:grid-cols-12 gap-6">
 {/* Coluna 1: Documentos & Identificação (5 Colunas no Desktop) */}
 <div className="md:col-span-6 space-y-5">
 <div className="space-y-2">
 <Label className="text-xs font-bold uppercase tracking-wider text-foreground">
 Identificação do Monitoramento
 </Label>
 <Input
 placeholder="Ex: Auditoria Fornecedores 2026, OAB Dr. Carlos..."
 value={title}
 onChange={(e) => setTitle(e.target.value)}
 className="h-11 rounded-lg bg-card text-xs font-medium"
 />
 </div>

 <div className="space-y-2">
 <Label className="text-xs font-bold uppercase tracking-wider text-foreground">
 Insira um ou mais documentos
 </Label>
 <div className="flex items-center gap-2">
 <Input
 placeholder="CPF, CNPJ ou OAB (ex: SP1950566)"
 value={docInput}
 onChange={(e) => setDocInput(e.target.value)}
 onKeyDown={(e) => {
 if (e.key === "Enter") {
 e.preventDefault();
 handleAddDocument();
 }
 }}
 className="h-11 rounded-lg bg-card text-xs font-mono font-medium"
 />
 <Button
 type="button"
 onClick={handleAddDocument}
 size="icon"
 className="size-11 shrink-0 rounded-lg bg-primary text-primary-foreground font-bold"
 >
 <Plus className="size-4" />
 </Button>
 </div>
 </div>

 {/* Lista de Documentos Inseridos */}
 <div className="space-y-2 pt-2">
 <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-muted-foreground font-mono">
 <span>Monitoramento de {documentKeys.length} documento(s)</span>
 </div>

 {documentKeys.length === 0 ? (
 <div className="p-6 rounded-lg border border-dashed border-border/80 bg-muted/20 text-center text-xs text-muted-foreground">
 Nenhum documento adicionado ainda. Insira CPFs, CNPJs ou OABs acima.
 </div>
 ) : (
 <div className="space-y-2 max-h-56 overflow-y-auto no-scrollbar pr-1">
 {documentKeys.map((doc) => (
 <div
 key={doc}
 className="flex items-center justify-between p-3 rounded-lg bg-card border border-border/80 text-xs font-mono font-medium"
 >
 <span className="text-foreground">{doc}</span>
 <Button
 type="button"
 variant="ghost"
 size="icon"
 onClick={() => handleRemoveDocument(doc)}
 className="size-7 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10"
 >
 <Trash2 className="size-3.5" />
 </Button>
 </div>
 ))}
 </div>
 )}
 </div>
 </div>

 {/* Coluna 2: Filtros Especializados (6 Colunas no Desktop) */}
 <div className="md:col-span-6 space-y-5 rounded-lg bg-card/60 p-5 border border-border/80">
 <div className="flex items-center justify-between">
 <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-foreground">
 <SlidersHorizontal className="size-4 text-primary" />
 <span>Filtros do Processo</span>
 </div>
 {appliedFiltersCount > 0 && (
 <Badge variant="secondary" className="text-[10px] font-mono px-2 py-1">
 {appliedFiltersCount} ativo(s)
 </Badge>
 )}
 </div>

 {/* Tags */}
 <div className="space-y-2">
 <Label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
 Por Tags / Áreas
 </Label>
 <div className="flex flex-wrap gap-2">
 {PRESET_TAGS.map((tag) => {
 const isSelected = selectedTags.includes(tag);
 return (
 <button
 key={tag}
 type="button"
 onClick={() => toggleTag(tag)}
 className={cn(
 "px-3 py-1 rounded-lg text-[11px] font-semibold transition-colors border",
 isSelected
 ? "bg-primary text-primary-foreground border-primary"
 : "bg-background text-muted-foreground border-border hover:text-foreground"
 )}
 >
 {tag}
 {isSelected && <span className="ml-1 text-[10px]">×</span>}
 </button>
 );
 })}
 </div>
 </div>

 {/* Tribunais */}
 <div className="space-y-2">
 <Label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
 Por Tribunal
 </Label>
 <div className="flex flex-wrap gap-2">
 {PRESET_COURTS.map((court) => {
 const isSelected = selectedCourts.includes(court);
 return (
 <button
 key={court}
 type="button"
 onClick={() => toggleCourt(court)}
 className={cn(
 "px-3 py-1 rounded-lg text-[11px] font-mono font-bold transition-colors border",
 isSelected
 ? "bg-primary text-primary-foreground border-primary"
 : "bg-background text-muted-foreground border-border hover:text-foreground"
 )}
 >
 {court}
 {isSelected && <span className="ml-1 text-[10px]">×</span>}
 </button>
 );
 })}
 </div>
 </div>

 {/* Intervalo de Datas de Distribuição */}
 <div className="space-y-2">
 <Label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
 Data de Distribuição
 </Label>
 <div className="grid grid-cols-2 gap-2">
 <div>
 <span className="text-[10px] text-muted-foreground">De:</span>
 <Input
 type="date"
 value={dateFrom}
 onChange={(e) => setDateFrom(e.target.value)}
 className="h-9 rounded-lg bg-background text-xs"
 />
 </div>
 <div>
 <span className="text-[10px] text-muted-foreground">Até:</span>
 <Input
 type="date"
 value={dateTo}
 onChange={(e) => setDateTo(e.target.value)}
 className="h-9 rounded-lg bg-background text-xs"
 />
 </div>
 </div>
 </div>
 </div>
 </div>

 {/* Rodapé Fixo */}
 <SheetFooter className="p-4 sm:p-6 border-t border-border bg-card/80 flex flex-row items-center justify-between gap-3">
 <Button
 type="button"
 variant="ghost"
 size="sm"
 onClick={handleClearFilters}
 className="text-xs text-muted-foreground hover:text-foreground h-11 px-4"
 >
 Limpar Filtros
 </Button>

 <Button
 type="button"
 onClick={handleSubmit}
 disabled={isPending}
 className="h-11 px-6 rounded-lg bg-primary text-primary-foreground font-bold text-xs gap-2"
 >
 {isPending ? "Processando..." : "Realizar Monitoramento"}
 </Button>
 </SheetFooter>
 </SheetContent>
 </Sheet>
 );
}
