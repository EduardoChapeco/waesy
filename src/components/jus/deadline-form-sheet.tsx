/**
 * deadline-form-sheet.tsx — Cadastro & Edição de Prazos Processuais Fatais (Módulo JUS)
 * Preclusão, audiências, recursos e protocolo judicial.
 */

import { useState, useEffect } from "react";
import { useRouter } from "@tanstack/react-router";
import { toast } from "sonner";
import { Calendar, Clock, Scale, AlertTriangle, FileText, User, Building2, CheckCircle2 } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { saveLawsuitDeadline } from "@/services/jus.functions";

interface DeadlineFormSheetProps {
 open: boolean;
 onOpenChange: (open: boolean) => void;
 lawsuitId?: string | null;
 initialProcessNumber?: string | null;
 initialCourt?: string | null;
 initialClient?: string | null;
}

export function DeadlineFormSheet({
 open,
 onOpenChange,
 lawsuitId,
 initialProcessNumber,
 initialCourt,
 initialClient,
}: DeadlineFormSheetProps) {
 const router = useRouter();
 const [isSubmitting, setIsSubmitting] = useState(false);

 // Form State
 const [title, setTitle] = useState("");
 const [deadlineType, setDeadlineType] = useState<
 "contestacao" | "recurso" | "audiencia" | "pericia" | "manifestacao" | "cumprimento" | "pagamento" | "outro"
 >("manifestacao");
 const [dueDate, setDueDate] = useState("");
 const [priority, setPriority] = useState<"normal" | "high" | "urgent" | "fatal">("normal");
 const [processNumber, setProcessNumber] = useState(initialProcessNumber || "");
 const [courtName, setCourtName] = useState(initialCourt || "");
 const [clientName, setClientName] = useState(initialClient || "");
 const [notes, setNotes] = useState("");

 useEffect(() => {
 if (open) {
 if (initialProcessNumber) setProcessNumber(initialProcessNumber);
 if (initialCourt) setCourtName(initialCourt);
 if (initialClient) setClientName(initialClient);

 // Default due date: 15 dias corridos às 18:00
 const defaultDate = new Date();
 defaultDate.setDate(defaultDate.getDate() + 15);
 defaultDate.setHours(18, 0, 0, 0);
 const isoLocal = defaultDate.toISOString().slice(0, 16);
 setDueDate(isoLocal);
 }
 }, [open, initialProcessNumber, initialCourt, initialClient]);

 const handleSubmit = async (e: React.FormEvent) => {
 e.preventDefault();
 if (!title.trim()) {
 toast.error("Informe o título do prazo ou audiência");
 return;
 }
 if (!dueDate) {
 toast.error("Defina a data e horário fatal do prazo");
 return;
 }

 setIsSubmitting(true);
 try {
 await saveLawsuitDeadline({
 data: {
 lawsuit_id: lawsuitId || null,
 title: title.trim(),
 deadline_type: deadlineType,
 due_date: new Date(dueDate).toISOString(),
 priority,
 process_number: processNumber.trim() || null,
 court_name: courtName.trim() || null,
 client_name: clientName.trim() || null,
 notes: notes.trim() || null,
 },
 });

 toast.success("Prazo processual cadastrado com sucesso na agenda!");
 onOpenChange(false);
 setTitle("");
 setNotes("");
 router.invalidate();
 } catch (err: any) {
 toast.error(err.message || "Erro ao salvar prazo");
 } finally {
 setIsSubmitting(false);
 }
 };

 return (
 <Sheet open={open} onOpenChange={onOpenChange}>
 <SheetContent side="right" size="wide" className="w-full sm:max-w-3xl md:max-w-4xl lg:max-w-[70vw] xl:max-w-[70vw] p-0 flex flex-col justify-between">
 <SheetHeader className="p-6 border-b border-border/80">
 <div className="flex items-center gap-2 text-xs font-bold font-mono text-primary uppercase tracking-wider">
 <Calendar className="size-4" />
 <span>Prazos & Preclusão • Agenda Jurídica</span>
 </div>
 <SheetTitle className="text-base font-bold text-foreground">
 Novo Prazo Processual Fatal
 </SheetTitle>
 <SheetDescription className="text-xs text-muted-foreground">
 Cadastre prazos de contestação, recursos, audiências ou manifestações com controle de contagem regressiva.
 </SheetDescription>
 </SheetHeader>

 <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto no-scrollbar p-6 space-y-4">
 {/* Título do Prazo */}
 <div className="space-y-2">
 <label className="text-xs font-bold text-muted-foreground uppercase font-mono">
 Título do Prazo / Ato Processual *
 </label>
 <Input
 value={title}
 onChange={(e) => setTitle(e.target.value)}
 placeholder="Ex: Contestação com Preliminares, Recurso de Apelação..."
 className="h-11 rounded-lg bg-background font-medium text-xs sm:text-sm"
 required
 />
 </div>

 {/* Tipo de Prazo e Prioridade */}
 <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
 <div className="space-y-2">
 <label className="text-xs font-bold text-muted-foreground uppercase font-mono">
 Tipo de Ato
 </label>
 <select
 value={deadlineType}
 onChange={(e) => setDeadlineType(e.target.value as any)}
 className="w-full h-11 rounded-lg border border-border bg-background px-3 text-xs font-semibold focus:ring-1 focus:ring-primary outline-none"
 >
 <option value="contestacao">Contestação</option>
 <option value="recurso">Recurso (Apelação / Agravo / Embargos)</option>
 <option value="audiencia">Audiência (Conciliação / Instrução)</option>
 <option value="manifestacao">Manifestação / Petição Simples</option>
 <option value="cumprimento">Cumprimento de Sentença</option>
 <option value="pericia">Quesitos / Perícia Técnica</option>
 <option value="pagamento">Pagamento de Custas / Condenação</option>
 <option value="outro">Outro Ato Fatal</option>
 </select>
 </div>

 <div className="space-y-2">
 <label className="text-xs font-bold text-muted-foreground uppercase font-mono">
 Gravidade do Prazo
 </label>
 <select
 value={priority}
 onChange={(e) => setPriority(e.target.value as any)}
 className="w-full h-11 rounded-lg border border-border bg-background px-3 text-xs font-semibold focus:ring-1 focus:ring-primary outline-none"
 >
 <option value="normal">Normal (Fluxo regular)</option>
 <option value="high">Alta (Requer atenção)</option>
 <option value="urgent">Urgente (Risco de dano)</option>
 <option value="fatal">Fatal (Preclusão / Perda de direito)</option>
 </select>
 </div>
 </div>

 {/* Data Fatal com Hora */}
 <div className="space-y-2">
 <label className="text-xs font-bold text-muted-foreground uppercase font-mono flex items-center justify-between">
 <span>Data e Hora Fatal *</span>
 <span className="text-[10px] text-amber-600 dark:text-amber-400 font-normal">
 Limite até as 23:59 do dia final
 </span>
 </label>
 <Input
 type="datetime-local"
 value={dueDate}
 onChange={(e) => setDueDate(e.target.value)}
 className="h-11 rounded-lg bg-background font-mono text-xs sm:text-sm font-bold"
 required
 />
 </div>

 {/* Processo CNJ e Tribunal */}
 <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
 <div className="space-y-2">
 <label className="text-xs font-bold text-muted-foreground uppercase font-mono">
 Nº do Processo (CNJ)
 </label>
 <Input
 value={processNumber}
 onChange={(e) => setProcessNumber(e.target.value)}
 placeholder="Ex: 5001234-88.2026.8.24.0067"
 className="h-10 rounded-lg bg-background font-mono text-xs"
 />
 </div>

 <div className="space-y-2">
 <label className="text-xs font-bold text-muted-foreground uppercase font-mono">
 Tribunal / Vara
 </label>
 <Input
 value={courtName}
 onChange={(e) => setCourtName(e.target.value)}
 placeholder="Ex: TJSC - 2ª Vara Cível"
 className="h-10 rounded-lg bg-background text-xs"
 />
 </div>
 </div>

 {/* Nome do Cliente */}
 <div className="space-y-2">
 <label className="text-xs font-bold text-muted-foreground uppercase font-mono">
 Cliente / Assistido
 </label>
 <Input
 value={clientName}
 onChange={(e) => setClientName(e.target.value)}
 placeholder="Ex: João da Silva ou Razão Social..."
 className="h-10 rounded-lg bg-background text-xs"
 />
 </div>

 {/* Observações e Estratégia */}
 <div className="space-y-2">
 <label className="text-xs font-bold text-muted-foreground uppercase font-mono">
 Orientações e Tese Defensiva
 </label>
 <textarea
 rows={3}
 value={notes}
 onChange={(e) => setNotes(e.target.value)}
 placeholder="Descreva argumentos centrais, documentos necessários para anexar ou testemunhas da audiência..."
 className="w-full rounded-lg border border-border bg-background p-3 text-xs focus:ring-1 focus:ring-primary outline-none"
 />
 </div>
 </form>

 <SheetFooter className="p-6 border-t border-border/80 flex sm:flex-row gap-2 justify-end">
 <Button
 type="button"
 variant="outline"
 onClick={() => onOpenChange(false)}
 className="h-11 px-5 rounded-lg text-xs font-bold"
 >
 Cancelar
 </Button>
 <Button
 type="submit"
 disabled={isSubmitting}
 onClick={handleSubmit}
 className="h-11 px-6 rounded-lg bg-primary text-primary-foreground text-xs font-bold shadow-xs gap-2"
 >
 <CheckCircle2 className="size-4" />
 <span>{isSubmitting ? "Salvando..." : "Salvar Prazo na Agenda"}</span>
 </Button>
 </SheetFooter>
 </SheetContent>
 </Sheet>
 );
}
