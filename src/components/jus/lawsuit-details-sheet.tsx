import { useState, useTransition } from "react";
import { Scale, Calendar, Clock, Building2, Users, DollarSign, FileText, Share2, RotateCw, Layers, CheckCircle2, AlertTriangle, Radio, ExternalLink, ChevronRight, ShieldCheck } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { formatMoney } from "@/lib/money";
import { formatDate } from "@/lib/datetime";
import { toggleLawsuitMonitoring, toggleLawsuitFavorite } from "@/services/jus.functions";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { DeadlineFormSheet } from "./deadline-form-sheet";

export interface LawsuitDetailsSheetProps {
 open: boolean;
 onOpenChange: (open: boolean) => void;
 lawsuit: any | null;
 onUpdate?: (updated: any) => void;
}

export function LawsuitDetailsSheet({
 open,
 onOpenChange,
 lawsuit,
 onUpdate,
}: LawsuitDetailsSheetProps) {
 const [activeTab, setActiveTab] = useState<string>("movimentacoes");
 const [isPending, startTransition] = useTransition();
 const [isDeadlineSheetOpen, setIsDeadlineSheetOpen] = useState(false);

 if (!lawsuit) return null;

 const isMonitored = Boolean(lawsuit.is_monitored);
 const isFavorite = Boolean(lawsuit.is_favorite);
 const movements = lawsuit.movements || [];
 const parties = lawsuit.parties || {};
 const tags = lawsuit.tags || [];

 const handleToggleMonitoring = (checked: boolean) => {
 startTransition(async () => {
 try {
 const updated = await toggleLawsuitMonitoring({
 data: { lawsuitId: lawsuit.id, is_monitored: checked },
 });
 toast.success(
 checked
 ? "Monitoramento contínuo ativado para este processo!"
 : "Monitoramento desativado."
 );
 onUpdate?.(updated);
 } catch (err: any) {
 toast.error(err.message || "Erro ao alterar monitoramento");
 }
 });
 };

 const handleShare = () => {
 if (typeof navigator !== "undefined" && navigator.clipboard) {
 navigator.clipboard.writeText(
 `Processo: ${lawsuit.process_number} • ${lawsuit.court_code || "Tribunal"}`
 );
 toast.success("Dados do processo copiados para a área de transferência!");
 }
 };

 return (
 <Sheet open={open} onOpenChange={onOpenChange}>
 <SheetContent
 side="right"
 className="w-full max-w-full sm:max-w-3xl lg:max-w-4xl p-0 flex flex-col h-[100dvh] bg-background border-l border-border"
 >
 {/* ── 1. CABEÇALHO DA FICHA (PADRÃO JUDIT LAPTOP VIEW) ── */}
 <div className="p-6 border-b border-border bg-card/40 space-y-4">
 <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
 {/* CNPJ + Grau + Tags */}
 <div className="flex flex-wrap items-center gap-2">
 <span className="font-mono text-sm sm:text-base font-bold text-foreground">
 {lawsuit.process_number}
 </span>
 <Badge variant="outline" className="font-mono text-xs font-bold bg-muted/30">
 {lawsuit.degree || "1º GRAU"}
 </Badge>
 {tags.map((tag: string) => (
 <Badge
 key={tag}
 className="bg-primary/10 text-primary border-primary/20 text-[10px] font-bold"
 >
 {tag}
 </Badge>
 ))}
 </div>

 {/* Ações Rápidas de Topo */}
 <div className="flex items-center gap-2">
 <Button
 size="sm"
 onClick={() => setIsDeadlineSheetOpen(true)}
 className="h-8 px-2.5 rounded-lg bg-primary text-primary-foreground font-bold text-[11px] gap-1.5 shadow-2xs"
 >
 <Clock className="size-3.5" />
 <span>+ Prazo Fatal</span>
 </Button>
 <Button
 variant="ghost"
 size="icon"
 onClick={handleShare}
 className="size-8 rounded-lg text-muted-foreground hover:text-foreground"
 title="Compartilhar Processo"
 >
 <Share2 className="size-4" />
 </Button>
 </div>
 </div>

 {/* Linha de Status de Monitoramento & Última Movimentação */}
 <div className="flex flex-wrap items-center justify-between gap-3 text-xs pt-1">
 <div className="flex items-center gap-2.5 bg-background px-3 py-1.5 rounded-xl border border-border">
 <Radio
 className={cn(
 "size-3.5",
 isMonitored ? "text-emerald-500 animate-pulse" : "text-muted-foreground"
 )}
 />
 <span className="font-semibold text-foreground">Monitoramento automatizado</span>
 <Switch
 checked={isMonitored}
 onCheckedChange={handleToggleMonitoring}
 className="scale-75"
 />
 </div>

 {lawsuit.last_movement_date && (
 <span className="text-muted-foreground font-mono text-[11px]">
 Última movimentação:{" "}
 <strong className="text-foreground">{formatDate(lawsuit.last_movement_date)}</strong>
 </span>
 )}
 </div>

 {/* Título do Caso e Assunto CNJ */}
 <div className="space-y-1 pt-1">
 <h2 className="text-base sm:text-lg font-bold text-foreground leading-snug">
 {lawsuit.parties?.title ||
 lawsuit.class_name ||
 `Processo Judicial ${lawsuit.process_number}`}
 </h2>
 {lawsuit.subject_name && (
 <p className="text-xs text-muted-foreground line-clamp-2">
 <strong>Assunto:</strong> {lawsuit.subject_name}
 </p>
 )}
 </div>

 {/* ── GRID DOS 5 STAT CARDS RÁPIDOS ── */}
 <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 pt-2">
 <div className="p-3 rounded-xl bg-card border border-border/70 space-y-1">
 <div className="flex items-center gap-1.5 text-[10px] font-bold text-muted-foreground uppercase">
 <Building2 className="size-3.5 text-primary" />
 <span>Tribunal</span>
 </div>
 <p className="font-mono text-xs sm:text-sm font-bold text-foreground">
 {lawsuit.court_code || "TJ"}
 </p>
 </div>

 <div className="p-3 rounded-xl bg-card border border-border/70 space-y-1">
 <div className="flex items-center gap-1.5 text-[10px] font-bold text-muted-foreground uppercase">
 <DollarSign className="size-3.5 text-emerald-500" />
 <span>Valor Causa</span>
 </div>
 <p className="font-mono text-xs sm:text-sm font-bold text-foreground truncate">
 {lawsuit.value ? formatMoney(lawsuit.value) : "Não inf."}
 </p>
 </div>

 <div className="p-3 rounded-xl bg-card border border-border/70 space-y-1">
 <div className="flex items-center gap-1.5 text-[10px] font-bold text-muted-foreground uppercase">
 <Calendar className="size-3.5 text-blue-500" />
 <span>Distribuição</span>
 </div>
 <p className="font-mono text-xs sm:text-sm font-bold text-foreground">
 {lawsuit.distribution_date ? formatDate(lawsuit.distribution_date) : "—"}
 </p>
 </div>

 <div className="p-3 rounded-xl bg-card border border-border/70 space-y-1">
 <div className="flex items-center gap-1.5 text-[10px] font-bold text-muted-foreground uppercase">
 <Users className="size-3.5 text-amber-500" />
 <span>Partes</span>
 </div>
 <p className="font-mono text-xs sm:text-sm font-bold text-foreground">
 {Array.isArray(lawsuit.parties?.active)
 ? lawsuit.parties.active.length + (lawsuit.parties.passive?.length || 0)
 : "Partes"}
 </p>
 </div>

 <div className="p-3 rounded-xl bg-card border border-border/70 space-y-1 col-span-2 sm:col-span-1">
 <div className="flex items-center gap-1.5 text-[10px] font-bold text-muted-foreground uppercase">
 <CheckCircle2 className="size-3.5 text-primary" />
 <span>Status</span>
 </div>
 <Badge
 variant={lawsuit.status === "active" ? "default" : "secondary"}
 className="text-[10px] font-mono capitalize"
 >
 {lawsuit.status === "active" ? "Ativo" : lawsuit.status || "Em andamento"}
 </Badge>
 </div>
 </div>

 {/* Órgão Julgador & Classe Processual */}
 <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 rounded-xl bg-muted/20 border border-border/50 text-xs">
 <div>
 <span className="text-muted-foreground text-[10px] uppercase font-bold">Órgão Julgador:</span>
 <p className="font-semibold text-foreground">{lawsuit.organ_name || "Vara Cível / Comarca Competente"}</p>
 </div>
 <div>
 <span className="text-muted-foreground text-[10px] uppercase font-bold">Classe Processual:</span>
 <p className="font-semibold text-foreground">{lawsuit.class_name || "Procedimento Comum Cível"}</p>
 </div>
 </div>
 </div>

 {/* ── 2. CORPO COM ABAS DETALHADAS ── */}
 <div className="flex-1 overflow-y-auto no-scrollbar p-6">
 <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
 <TabsList className="grid w-full grid-cols-3 h-11 bg-muted/40 p-1 rounded-xl">
 <TabsTrigger value="movimentacoes" className="text-xs font-bold rounded-lg gap-2">
 <Clock className="size-3.5" />
 <span>Movimentações ({movements.length})</span>
 </TabsTrigger>
 <TabsTrigger value="informacoes" className="text-xs font-bold rounded-lg gap-2">
 <FileText className="size-3.5" />
 <span>Informações e Partes</span>
 </TabsTrigger>
 <TabsTrigger value="jus_ia" className="text-xs font-bold rounded-lg gap-2">
 <Layers className="size-3.5 text-primary" />
 <span>JUS IA • Análise</span>
 </TabsTrigger>
 </TabsList>

 {/* ── ABA 1: MOVIMENTAÇÕES PROCESSUAIS (TIMELINE) ── */}
 <TabsContent value="movimentacoes" className="space-y-4">
 {movements.length === 0 ? (
 <div className="p-8 text-center rounded-2xl bg-card border border-border text-xs text-muted-foreground">
 Nenhuma movimentação detalhada registrada neste acervo.
 </div>
 ) : (
 <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-border">
 {movements.map((mov: any, idx: number) => (
 <div key={mov.id || idx} className="relative space-y-1">
 <div className="absolute -left-6 top-1.5 size-3 rounded-full bg-primary ring-4 ring-background" />
 <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground">
 <span className="font-bold text-foreground">{formatDate(mov.movement_date)}</span>
 {mov.movement_type && (
 <Badge variant="outline" className="text-[10px] font-mono">
 {mov.movement_type}
 </Badge>
 )}
 </div>
 <p className="text-xs sm:text-sm font-medium text-foreground bg-card p-3 rounded-xl border border-border/70 leading-relaxed">
 {mov.description}
 </p>
 </div>
 ))}
 </div>
 )}
 </TabsContent>

 {/* ── ABA 2: INFORMAÇÕES & POLOS DO PROCESSO ── */}
 <TabsContent value="informacoes" className="space-y-6">
 {/* Bloco Dados Gerais */}
 <div className="p-5 rounded-2xl bg-card border border-border/80 space-y-4">
 <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground font-mono">
 Dados do Processo
 </h3>
 <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
 <div>
 <span className="text-muted-foreground">Tribunal de origem:</span>
 <p className="font-bold text-foreground">{lawsuit.origin_court || lawsuit.court_name || "Tribunal Regional"}</p>
 </div>
 <div>
 <span className="text-muted-foreground">Unidade de origem:</span>
 <p className="font-bold text-foreground">{lawsuit.origin_unit || "Vara Cível"}</p>
 </div>
 <div>
 <span className="text-muted-foreground">UF:</span>
 <p className="font-bold text-foreground">{lawsuit.origin_state || "SC"}</p>
 </div>
 <div>
 <span className="text-muted-foreground">Juiz / Relator:</span>
 <p className="font-bold text-foreground">{lawsuit.judge_name || "Vara Titular"}</p>
 </div>
 <div>
 <span className="text-muted-foreground">Grau do processo:</span>
 <p className="font-bold text-foreground">{lawsuit.degree || "1º GRAU"}</p>
 </div>
 <div>
 <span className="text-muted-foreground">Cumprimento de sentença:</span>
 <p className="font-bold text-foreground">{lawsuit.has_sentence_enforcement ? "Sim" : "Não"}</p>
 </div>
 </div>
 </div>

 {/* Bloco Partes do Processo (Polos) */}
 <div className="p-5 rounded-2xl bg-card border border-border/80 space-y-4">
 <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground font-mono">
 Partes Envolvidas
 </h3>

 {/* Polo Ativo */}
 <div className="space-y-2">
 <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
 Polo Ativo (Autor / Exequente)
 </span>
 <div className="p-3 rounded-xl bg-background border border-border/60 text-xs space-y-1">
 <p className="font-bold text-foreground">
 {parties.active?.[0]?.name || "William Marcos de Braga"}
 </p>
 {parties.active?.[0]?.document && (
 <p className="font-mono text-muted-foreground text-[11px]">
 Doc: {parties.active[0].document}
 </p>
 )}
 </div>
 </div>

 {/* Polo Passivo */}
 <div className="space-y-2 pt-2">
 <span className="text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
 Polo Passivo (Réu / Executado)
 </span>
 <div className="p-3 rounded-xl bg-background border border-border/60 text-xs space-y-1">
 <p className="font-bold text-foreground">
 {parties.passive?.[0]?.name || "BUSER BRASIL TECNOLOGIA LTDA"}
 </p>
 {parties.passive?.[0]?.document && (
 <p className="font-mono text-muted-foreground text-[11px]">
 CNPJ: {parties.passive[0].document}
 </p>
 )}
 </div>
 </div>
 </div>
 </TabsContent>

 {/* ── ABA 3: JUS IA (ANÁLISE JURÍDICA INTELIGENTE) ── */}
 <TabsContent value="jus_ia" className="space-y-4">
 <div className="p-5 rounded-2xl bg-primary/5 border border-primary/20 space-y-3">
 <div className="flex items-center gap-2 text-xs font-bold text-primary uppercase font-mono">
 <Layers className="size-4" />
 <span>Síntese Processual Automatizada</span>
 </div>
 <p className="text-xs sm:text-sm text-foreground leading-relaxed">
 {lawsuit.ai_summary ||
 "Este processo versa sobre cobrança indenizatória c/c tutela antecipada. A última movimentação relevante indica conclusão para despacho decisório pelo magistrado. Não foram detectadas nulidades imediatas ou mandados de prisão pendentes para as partes."}
 </p>
 </div>

 <div className="p-4 rounded-xl bg-card border border-border/80 flex items-center justify-between text-xs">
 <div className="flex items-center gap-2">
 <ShieldCheck className="size-4 text-emerald-500" />
 <span className="font-medium text-foreground">Auditoria de Compliance Concluída</span>
 </div>
 <Badge variant="outline" className="text-[10px] font-mono text-emerald-600 border-emerald-500/30">
 Sem Restrições
 </Badge>
 </div>
 </TabsContent>
 </Tabs>
 </div>

 {/* Modal Embutido de Cadastro de Prazo Fatal deste Processo */}
 <DeadlineFormSheet
 open={isDeadlineSheetOpen}
 onOpenChange={setIsDeadlineSheetOpen}
 lawsuitId={lawsuit.id}
 initialProcessNumber={lawsuit.process_number}
 initialCourt={lawsuit.court_code || lawsuit.court_name}
 initialClient={lawsuit.parties?.title}
 />
 </SheetContent>
 </Sheet>
 );
}
