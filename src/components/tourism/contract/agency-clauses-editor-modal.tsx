import React, { useState, useEffect } from "react";
import { toast } from "sonner";
import {
 FileText,
 Plus,
 Trash2,
 Save,
 RotateCcw,
 ChevronDown,
 ChevronUp,
 FileUp,
 Loader2,
} from "lucide-react";
import {
 Sheet,
 SheetContent,
 SheetHeader,
 SheetTitle,
 SheetDescription,
 SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
 Tabs,
 TabsContent,
 TabsList,
 TabsTrigger,
} from "@/components/ui/tabs";
import {
 getAgencyTourismClauses as getAgencyContractTemplate,
 saveAgencyTourismClauses as saveAgencyContractTemplate,
 resetAgencyTourismClauses as resetAgencyContractTemplate,
 CANONICAL_TOURISM_CLAUSES,
 type ContractClauseDTO,
} from "@/services/travel-contract.functions";

interface AgencyClausesEditorModalProps {
 open: boolean;
 onOpenChange: (open: boolean) => void;
 onSaved?: () => void;
 storeId?: string;
}

export function AgencyClausesEditorModal({
 open,
 onOpenChange,
 onSaved,
}: AgencyClausesEditorModalProps) {
 const [clauses, setClauses] = useState<ContractClauseDTO[]>([]);
 const [isCustom, setIsCustom] = useState(false);
 const [isLoading, setIsLoading] = useState(false);
 const [isSaving, setIsSaving] = useState(false);
 const [rawTextImport, setRawTextImport] = useState("");
 const [activeTab, setActiveTab] = useState<"editor" | "import">("editor");

 const loadTemplate = async () => {
 setIsLoading(true);
 try {
 const res = await getAgencyContractTemplate();
 const loadedClauses = Array.isArray(res) && res.length > 0 ? res : CANONICAL_TOURISM_CLAUSES;
 setClauses(loadedClauses);
 setIsCustom(Array.isArray(res) && res.length > 0);
 } catch {
 toast.error("Erro ao carregar minuta da agência.");
 setClauses(CANONICAL_TOURISM_CLAUSES);
 } finally {
 setIsLoading(false);
 }
 };

 useEffect(() => {
 if (open) {
 loadTemplate();
 }
 }, [open]);

 // Atualizar título ou texto de uma cláusula
 const handleUpdateClause = (index: number, field: "section" | "clause_text", value: string) => {
 setClauses((prev) => {
 const next = [...prev];
 next[index] = {
 ...next[index],
 [field]: value,
 };
 return next;
 });
 };

 // Adicionar nova cláusula
 const handleAddClause = () => {
 setClauses((prev) => [
 ...prev,
 {
 number: prev.length + 1,
 section: "NOVA CLÁUSULA",
 clause_text: "Descreva aqui os termos e condições aplicáveis...",
 is_mandatory: false,
 },
 ]);
 };

 // Remover cláusula
 const handleRemoveClause = (index: number) => {
 setClauses((prev) => {
 const next = prev.filter((_, i) => i !== index);
 return next.map((c, i) => ({ ...c, number: i + 1 }));
 });
 };

 // Mover cláusula para cima
 const handleMoveUp = (index: number) => {
 if (index === 0) return;
 setClauses((prev) => {
 const next = [...prev];
 const temp = next[index - 1];
 next[index - 1] = next[index];
 next[index] = temp;
 return next.map((c, i) => ({ ...c, number: i + 1 }));
 });
 };

 // Mover cláusula para baixo
 const handleMoveDown = (index: number) => {
 setClauses((prev) => {
 if (index >= prev.length - 1) return prev;
 const next = [...prev];
 const temp = next[index + 1];
 next[index + 1] = next[index];
 next[index] = temp;
 return next.map((c, i) => ({ ...c, number: i + 1 }));
 });
 };

 // Mover cláusula (up / down)
 const handleMoveClause = (index: number, direction: "up" | "down") => {
 if (direction === "up") {
 handleMoveUp(index);
 } else {
 handleMoveDown(index);
 }
 };

 // Importar Texto Livre com Regex de Detecção de Cláusulas

 const handleParseRawText = () => {
 if (!rawTextImport.trim()) {
 toast.error("Cole o texto do contrato para importar.");
 return;
 }

 const lines = rawTextImport.split("\n");
 const parsed: ContractClauseDTO[] = [];
 let currentSection = "CONDIÇÕES GERAIS";
 let currentText = "";

 for (const rawLine of lines) {
 const line = rawLine.trim();
 if (!line) continue;

 const isHeader =
 /^CL[AÁ]USULA\s+[0-9IVXLCDM]+/i.test(line) ||
 /^[0-9]+\.\s+[A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇ\s-]{4,}/i.test(line) ||
 /^(DO OBJETO|DAS OBRIGAÇÕES|DO PREÇO|DO PAGAMENTO|DO CANCELAMENTO|DA DESISTÊNCIA|DAS REGRAS|DA BAGAGEM|DO FORO)/i.test(line);

 if (isHeader) {
 if (currentText.trim()) {
 parsed.push({
 number: parsed.length + 1,
 section: currentSection,
 clause_text: currentText.trim(),
 is_mandatory: parsed.length < 3,
 });
 currentText = "";
 }
 currentSection = line.toUpperCase();
 } else {
 currentText += (currentText ? " " : "") + line;
 }
 }

 if (currentText.trim()) {
 parsed.push({
 number: parsed.length + 1,
 section: currentSection,
 clause_text: currentText.trim(),
 is_mandatory: parsed.length < 3,
 });
 }

 if (parsed.length > 0) {
 setClauses(parsed);
 setActiveTab("editor");
 toast.success(`${parsed.length} cláusulas identificadas e importadas com sucesso! Revise e clique em Salvar.`);
 } else {
 toast.error("Não foi possível identificar cláusulas no texto colado.");
 }
 };

 // Salvar Minuta no Banco de Dados da Loja
 const handleSaveTemplate = async () => {
 setIsSaving(true);
 try {
 const res = await saveAgencyContractTemplate({
 data: {
 clauses,
 },
 });

 if (res?.success) {
 toast.success(`Minuta padrão salva com sucesso! (${clauses.length} cláusulas ativas)`);
 setIsCustom(true);
 onSaved?.();
 onOpenChange(false);
 }
 } catch (err: any) {
 toast.error(err?.message || "Erro ao salvar minuta padrão.");
 } finally {
 setIsSaving(false);
 }
 };

 // Restaurar Cláusulas Canônicas
 const handleResetToCanonical = async () => {
 if (!confirm("Deseja realmente restaurar as cláusulas para o modelo base Embratur/CDC? Suas cláusulas personalizadas serão removidas.")) {
 return;
 }
 setIsSaving(true);
 try {
 await resetAgencyContractTemplate();
 setClauses(CANONICAL_TOURISM_CLAUSES);
 setIsCustom(false);
 toast.success("Minuta restaurada para o padrão oficial!");
 onSaved?.();
 } catch (err: any) {
 toast.error(err?.message || "Erro ao restaurar minuta.");
 } finally {
 setIsSaving(false);
 }
 };

 return (
 <Sheet open={open} onOpenChange={onOpenChange}>
 <SheetContent side="right" size="wide" className="w-full sm:max-w-3xl md:max-w-4xl lg:max-w-[70vw] xl:max-w-[70vw] lg:max-w-3xl flex flex-col p-0 gap-0 overflow-hidden bg-card border-l border-border">
 <SheetHeader className="p-6 pb-4 border-b border-border/60 bg-card">
 <div className="flex items-center justify-between gap-3">
 <div className="flex items-center gap-2">
 <FileText className="size-5 text-primary" />
 <SheetTitle className="text-lg font-bold text-foreground">
 Minuta & Cláusulas Padrão da Agência
 </SheetTitle>
 </div>
 <Badge
 variant={isCustom ? "default" : "outline"}
 className="text-[10px] font-mono uppercase font-bold"
 >
 {isCustom ? "Minuta Personalizada Ativa" : "Padrão Embratur / CDC"}
 </Badge>
 </div>
 <SheetDescription className="text-xs text-muted-foreground mt-1">
 Defina as regras jurídicas, intermediação turística, no-show e cancelamentos que serão aplicados automaticamente em todos os novos contratos e propostas aprovadas.
 </SheetDescription>
 </SheetHeader>

 <Tabs value={activeTab} onValueChange={(v: any) => setActiveTab(v)} className="flex-1 flex flex-col overflow-hidden">
 <div className="px-6 pt-3 border-b border-border/40 bg-muted/20 flex items-center justify-between">
 <TabsList className="bg-muted/60 p-1 rounded-xl h-9">
 <TabsTrigger value="editor" className="text-xs font-bold rounded-lg gap-1.5">
 <FileText className="size-3.5" />
 <span>Editor de Cláusulas ({clauses.length})</span>
 </TabsTrigger>
 <TabsTrigger value="import" className="text-xs font-bold rounded-lg gap-1.5">
 <FileUp className="size-3.5" />
 <span>Colar Minuta Própria</span>
 </TabsTrigger>
 </TabsList>

 <div className="flex items-center gap-2">
 <Button
 type="button"
 variant="ghost"
 size="sm"
 onClick={handleResetToCanonical}
 disabled={isSaving || isLoading}
 className="text-xs text-muted-foreground hover:text-destructive h-8 rounded-lg cursor-pointer"
 >
 <RotateCcw className="size-3.5 mr-1" />
 Restaurar Padrão
 </Button>
 </div>
 </div>

 {/* ABA 1: EDITOR VISUAL DE CLÁUSULAS */}
 <TabsContent value="editor" className="flex-1 overflow-y-auto no-scrollbar p-6 space-y-4 m-0">
 {isLoading ? (
 <div className="py-16 text-center text-xs text-muted-foreground space-y-2">
 <Loader2 className="size-6 animate-spin mx-auto text-primary" />
 <p>Carregando minuta contratual...</p>
 </div>
 ) : (
 <div className="space-y-4">
 {clauses.map((clause, idx) => (
 <div
 key={idx}
 className="p-4 rounded-2xl bg-card border border-border/80 shadow-xs space-y-3 transition-all hover:border-border"
 >
 <div className="flex items-center justify-between gap-2">
 <div className="flex items-center gap-2 flex-1">
 <span className="size-6 rounded-lg bg-primary/10 text-primary flex items-center justify-center text-xs font-bold font-mono">
 {clause.number}
 </span>
 <Input
 value={clause.section}
 onChange={(e) => handleUpdateClause(idx, "section", e.target.value)}
 placeholder="TÍTULO DA CLÁUSULA (EX: DO OBJETO DO CONTRATO)"
 className="h-8 text-xs font-bold font-mono uppercase bg-background rounded-lg flex-1"
 />
 </div>

 <div className="flex items-center gap-1">
 <Button
 type="button"
 variant="ghost"
 size="icon"
 disabled={idx === 0}
 onClick={() => handleMoveClause(idx, "up")}
 className="size-7 rounded-lg"
 title="Mover para cima"
 >
 <ChevronUp className="size-4 text-muted-foreground" />
 </Button>
 <Button
 type="button"
 variant="ghost"
 size="icon"
 disabled={idx === clauses.length - 1}
 onClick={() => handleMoveClause(idx, "down")}
 className="size-7 rounded-lg"
 title="Mover para baixo"
 >
 <ChevronDown className="size-4 text-muted-foreground" />
 </Button>
 <Button
 type="button"
 variant="ghost"
 size="icon"
 onClick={() => handleRemoveClause(idx)}
 className="size-7 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 cursor-pointer"
 title="Excluir cláusula"
 >
 <Trash2 className="size-4" />
 </Button>
 </div>
 </div>

 <Textarea
 value={clause.clause_text}
 onChange={(e) => handleUpdateClause(idx, "clause_text", e.target.value)}
 placeholder="Texto completo da cláusula contratual..."
 rows={3}
 className="text-xs leading-relaxed rounded-xl bg-background border-border/60 resize-y"
 />
 </div>
 ))}

 <Button
 type="button"
 variant="outline"
 onClick={handleAddClause}
 className="w-full h-11 border-dashed border-2 rounded-2xl text-xs font-bold gap-2 text-muted-foreground hover:text-foreground cursor-pointer"
 >
 <Plus className="size-4" />
 <span>Adicionar Nova Cláusula</span>
 </Button>
 </div>
 )}
 </TabsContent>

 {/* ABA 2: IMPORTADOR / COLAR MINUTA PRÓPRIA */}
 <TabsContent value="import" className="flex-1 overflow-y-auto no-scrollbar p-6 space-y-4 m-0">
 <div className="p-4 rounded-2xl bg-primary/5 border border-primary/20 space-y-2">
 <div className="flex items-center gap-2">
 <FileText className="size-4 text-primary" />
 <h3 className="text-xs font-bold text-foreground">Importador Inteligente de Minuta Jurídica</h3>
 </div>
 <p className="text-xs text-muted-foreground">
 Copie o texto completo do contrato da sua agência no Word/PDF e cole abaixo. O sistema identificará automaticamente as cláusulas e parágrafos.
 </p>
 </div>

 <div className="space-y-2">
 <Label className="text-xs font-bold text-muted-foreground">Texto Completo do Contrato da Agência</Label>
 <Textarea
 value={rawTextImport}
 onChange={(e) => setRawTextImport(e.target.value)}
 placeholder={`Cole seu contrato aqui...\n\nExemplo:\nCLÁUSULA 1ª - DO OBJETO\nO presente contrato tem por objeto a intermediação turística...\n\nCLÁUSULA 2ª - DO CANCELAMENTO\nAs regras de cancelamento da operadora e cias aéreas...`}
 rows={12}
 className="text-xs font-mono leading-relaxed rounded-2xl bg-card border-border p-4"
 />
 </div>

 <Button
 type="button"
 onClick={handleParseRawText}
 disabled={!rawTextImport.trim()}
 className="w-full h-11 rounded-xl text-xs font-bold bg-primary text-primary-foreground gap-2 cursor-pointer"
 >
 <FileUp className="size-4" />
 <span>Processar Cláusulas</span>
 </Button>
 </TabsContent>
 </Tabs>

 <SheetFooter className="p-4 border-t border-border/60 bg-card flex flex-row items-center justify-between sm:justify-between">
 <div className="text-[11px] text-muted-foreground hidden sm:block">
 {clauses.length} {clauses.length === 1 ? "cláusula configurada" : "cláusulas configuradas"}
 </div>

 <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
 <Button
 type="button"
 variant="outline"
 onClick={() => onOpenChange(false)}
 className="rounded-xl text-xs font-bold h-10"
 >
 Cancelar
 </Button>
 <Button
 type="button"
 disabled={isSaving || clauses.length === 0}
 onClick={handleSaveTemplate}
 className="rounded-xl text-xs font-bold h-10 bg-primary text-primary-foreground gap-2 cursor-pointer"
 >
 {isSaving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
 <span>{isSaving ? "Salvando..." : "Salvar como Minuta Padrão da Agência"}</span>
 </Button>
 </div>
 </SheetFooter>
 </SheetContent>
 </Sheet>
 );
}
