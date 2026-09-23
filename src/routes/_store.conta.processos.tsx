/**
 * _store.conta.processos.tsx — Meus Processos & Demandas Jurídicas (Módulo JUS)
 * Consulta de processos unificados por CPF e acompanhamento de demandas com advogados.
 */

import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useTransition } from "react";
import { 
 Scales, 
 FileText, 
 Plus, 
 Clock, 
 CheckCircle, 
 WarningCircle, 
 MagnifyingGlass, 
 Buildings,
 ShieldCheck,
 ArrowSquareOut,
  Spinner,
} from "@phosphor-icons/react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { listMyLawsuits, createJusDemand,
  harvestDataJudProcessFn, getMyDemands } from "@/services/jus.functions";
import { useMasterLocation } from "@/components/location/location-master-pill";
import { LawsuitDetailsSheet } from "@/components/jus/lawsuit-details-sheet";
import { MediaUploader } from "@/components/ui/media-uploader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export const Route = createFileRoute("/_store/conta/processos")({
 head: () => ({ meta: [{ title: "Meus Processos & Demandas | Waesy" }] }),
 component: UserLawsuitsPage,
});

function UserLawsuitsPage() {
 const { location: masterLoc } = useMasterLocation();
 const [activeTab, setActiveTab] = useState<"lawsuits" | "demands" | "new_demand">("lawsuits");
 const [selectedLawsuit, setSelectedLawsuit] = useState<any | null>(null);
 const [isPending, startTransition] = useTransition();
  const queryClient = useQueryClient();
  const [isTrackModalOpen, setIsTrackModalOpen] = useState(false);
  const [cnjInput, setCnjInput] = useState("");
  const [isTracking, setIsTracking] = useState(false);

  const handleTrackLawsuit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cnjInput.trim()) {
      toast.error("Informe o número CNJ do processo");
      return;
    }

    setIsTracking(true);
    try {
      const res = await harvestDataJudProcessFn({
        data: {
          process_number: cnjInput.trim(),
        },
      });

      toast.success(res.message || "Processo sincronizado com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["jus_lawsuits_user"] });
      setIsTrackModalOpen(false);
      setCnjInput("");
    } catch (err: any) {
      toast.error(err?.message || "Erro ao consultar processo no DataJud");
    } finally {
      setIsTracking(false);
    }
  };

 // New Demand Form State
 const [title, setTitle] = useState("");
 const [legalArea, setLegalArea] = useState<any>("civel");
 const [description, setDescription] = useState("");
 const [urgency, setUrgency] = useState<"low" | "normal" | "high" | "urgent">("normal");
 const [isAnonymous, setIsAnonymous] = useState(false);
 const [documents, setDocuments] = useState<string[]>([]);

 // Queries
 const { data: lawsuits, isLoading: loadingLawsuits } = useQuery({
 queryKey: ["jus_lawsuits_user"],
 queryFn: () => listMyLawsuits(),
 });

 const { data: demands, isLoading: loadingDemands } = useQuery({
 queryKey: ["jus_demands_user"],
 queryFn: () => getMyDemands(),
 });

 const handleCreateDemand = (e: React.FormEvent) => {
 e.preventDefault();
 if (!title.trim() || !description.trim()) {
 toast.error("Preencha o título e a descrição do seu caso");
 return;
 }

 startTransition(async () => {
 try {
 await createJusDemand({
 data: {
 title,
 legal_area: legalArea,
 description,
 urgency,
 is_anonymous: isAnonymous,
 city: (masterLoc.city && masterLoc.city.toLowerCase() !== "global") ? masterLoc.city : "Regional",
 state: masterLoc.state || "SC",
 documents: documents,
 },
 });
 toast.success("Demanda jurídica publicada com sucesso! Advogados da região poderão enviar propostas.");
 setTitle("");
 setDescription("");
 setDocuments([]);
 setActiveTab("demands");
 } catch (err: any) {
 toast.error(err.message || "Erro ao publicar demanda");
 }
 });
 };

  return (
    <div className="w-full max-w-5xl mx-auto space-y-4 sm:space-y-6 pb-20 px-0 sm:px-4 md:px-0">
      {/* ── 1. Clean Minimalist Header ── */}
      <div className="flex items-center justify-between gap-4 border-b border-border/40 pb-4 pt-1">
        <div className="flex items-center gap-3">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
            Processos
          </h1>
          {lawsuits && lawsuits.length > 0 && (
            <Badge variant="secondary" className="text-xs font-mono font-bold px-2 py-0.5 rounded-full">
              {lawsuits.length}
            </Badge>
          )}
        </div>

        <Button
          size="sm"
          onClick={() => setActiveTab(activeTab === "new_demand" ? "lawsuits" : "new_demand")}
          className="rounded-xl h-8 px-3.5 text-xs font-semibold gap-1.5 bg-foreground text-background hover:bg-foreground/90 shrink-0 shadow-xs cursor-pointer"
        >
          <Plus className="size-3.5" />
          <span>{activeTab === "new_demand" ? "Ver Processos" : "Solicitar Advogado"}</span>
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
        <button
          onClick={() => setActiveTab("lawsuits")}
          className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
            activeTab === "lawsuits"
              ? "bg-foreground text-background font-bold shadow-xs"
              : "bg-muted/40 hover:bg-muted text-muted-foreground hover:text-foreground"
          }`}
        >
          <Scales className="size-3.5" />
          <span>Meus Processos ({lawsuits?.length || 0})</span>
        </button>
        <button
          onClick={() => setActiveTab("demands")}
          className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
            activeTab === "demands"
              ? "bg-foreground text-background font-bold shadow-xs"
              : "bg-muted/40 hover:bg-muted text-muted-foreground hover:text-foreground"
          }`}
        >
          <FileText className="size-3.5" />
          <span>Demandas Publicadas ({demands?.length || 0})</span>
        </button>

        <Link
          to="/conta/contratos"
          className="inline-flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-semibold bg-primary/10 hover:bg-primary/20 text-primary transition-all ml-auto"
        >
          <ShieldCheck className="size-3.5" />
          <span>Procurações & Contratos Digitais</span>
        </Link>
      </div>

 {/* Tab 1: Lista de Processos Sincronizados */}
 {activeTab === "lawsuits" && (
 <div className="space-y-4">
 {!lawsuits || lawsuits.length === 0 ? (
 <div className="rounded-2xl border border-border bg-card p-8 text-center sm:p-12">
 <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
 <Scales className="h-7 w-7" />
 </div>
 <h3 className="mt-4 text-base font-bold text-foreground">Nenhum processo em andamento</h3>
 <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
 Seus processos judiciais vinculados ao CPF aparecerão aqui automaticamente com notificações de prazos e movimentações.
 </p>
 <div className="mt-6 flex flex-wrap justify-center gap-3">
 <button
 onClick={() => setActiveTab("new_demand")}
 className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-all hover:bg-primary/90"
 >
 <Plus className="h-4 w-4" />
 Publicar Demanda para Advogados
 </button>
 <Link
 to="/diretorio"
 search={{ categoria: "advocacia" }}
 className="inline-flex items-center gap-2 rounded-xl border border-border bg-background px-4 py-2.5 text-sm font-semibold text-foreground transition-all hover:bg-accent"
 >
 <MagnifyingGlass className="h-4 w-4" />
 Buscar Escritórios na Cidade
 </Link>
 </div>
 </div>
 ) : (
 <div className="grid gap-4">
 {lawsuits?.map((lawsuit: any) => (
 <div
 key={lawsuit.id}
 onClick={() => setSelectedLawsuit(lawsuit)}
 className="rounded-2xl border border-border bg-card p-5 transition-all hover:border-primary/40 cursor-pointer shadow-xs"
 >
 <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
 <div>
 <div className="flex items-center gap-2">
 <span className="rounded-lg bg-primary/10 px-2.5 py-0.5 text-xs font-bold text-primary">
 {lawsuit.court_code || "TJSC"}
 </span>
 <span className="font-mono text-sm font-bold text-foreground">
 {lawsuit.process_number}
 </span>
 </div>
 <h3 className="mt-2 text-base font-semibold text-foreground">
 {lawsuit.class_name || lawsuit.subject_name || "Ação Judicial Cível"}
 </h3>
 <p className="mt-1 text-xs text-muted-foreground">
 Última movimentação: {lawsuit.last_movement_text || "Aguardando manifestação judicial"}
 </p>
 </div>

 <div className="flex items-center gap-2">
 <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-500">
 <CheckCircle className="h-3.5 w-3.5" />
 Ativo
 </span>
 </div>
 </div>

 {lawsuit.movements && lawsuit.movements.length > 0 && (
 <div className="mt-4 border-t border-border/60 pt-3">
 <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
 Histórico de Andamentos
 </h4>
 <div className="mt-2 space-y-2">
 {lawsuit.movements.slice(0, 3).map((mov: any) => (
 <div key={mov.id} className="flex items-start gap-2 text-xs text-muted-foreground">
 <Clock className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-primary" />
 <div>
 <span className="font-medium text-foreground">
 {new Date(mov.movement_date).toLocaleDateString("pt-BR")}:
 </span>{" "}
 {mov.description}
 </div>
 </div>
 ))}
 </div>
 </div>
 )}
 </div>
 ))}
 </div>
 )}
 </div>
 )}

 {/* Tab 2: Formulário de Nova Demanda Jurídica */}
 {activeTab === "new_demand" && (
 <div className="rounded-2xl border border-border bg-card p-6 sm:p-8">
 <div className="mb-6 flex items-center gap-3">
 <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
 <Scales className="h-5 w-5" />
 </div>
 <div>
 <h2 className="text-lg font-bold text-foreground">Solicitar Assessoria Jurídica</h2>
 <p className="text-xs text-muted-foreground">
 Seu caso será apresentado para advogados com OAB verificada na sua região.
 </p>
 </div>
 </div>

 <form onSubmit={handleCreateDemand} className="space-y-4">
 <div>
 <label className="text-xs font-bold text-foreground">Título Resumido da Demanda</label>
 <input
 type="text"
 placeholder="Ex: Ação de cobrança indevida, divórcio consensual, revisão de contrato..."
 value={title}
 onChange={(e) => setTitle(e.target.value)}
 className="mt-1.5 w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
 required
 />
 </div>

 <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
 <div>
 <label className="text-xs font-bold text-foreground">Área do Direito</label>
 <select
 value={legalArea}
 onChange={(e) => setLegalArea(e.target.value)}
 className="mt-1.5 w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm text-foreground focus:border-primary focus:outline-none"
 >
 <option value="Trabalhista">Direito Trabalhista</option>
 <option value="Cível">Direito Cível & Contratos</option>
 <option value="Família">Direito de Família & Sucessões</option>
 <option value="Consumidor">Direito do Consumidor</option>
 <option value="Previdenciário">Direito Previdenciário (INSS)</option>
 <option value="Tributário">Direito Tributário & Fiscal</option>
 <option value="Empresarial">Direito Empresarial & B2B</option>
 <option value="Imobiliário">Direito Imobiliário</option>
 </select>
 </div>

 <div>
 <label className="text-xs font-bold text-foreground">Nível de Urgência</label>
 <select
 value={urgency}
 onChange={(e) => setUrgency(e.target.value as any)}
 className="mt-1.5 w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm text-foreground focus:border-primary focus:outline-none"
 >
 <option value="normal">Normal (Até 5 dias úteis)</option>
 <option value="high">Alta (Até 48 horas)</option>
 <option value="urgent">Urgente (Prazo fatal / Liminar)</option>
 </select>
 </div>
 </div>

 <div>
 <label className="text-xs font-bold text-foreground">Relato dos Fatos</label>
 <textarea
 rows={4}
 placeholder="Explique o que aconteceu, datas relevantes, valores envolvidos e o que você busca solucionar..."
 value={description}
 onChange={(e) => setDescription(e.target.value)}
 className="mt-1.5 w-full rounded-xl border border-input bg-background p-3.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
 required
 />
 </div>

 <div>
 <MediaUploader
 value={documents}
 onChange={setDocuments}
 maxFiles={4}
 bucket="post-media"
 folder="jus-documents"
 label="Anexar Comprovantes ou Documentos do Caso (Opcional)"
 accept="image"
 />
 </div>

 <div className="flex items-center gap-2 pt-2">
 <input
 type="checkbox"
 id="anonymous"
 checked={isAnonymous}
 onChange={(e) => setIsAnonymous(e.target.checked)}
 className="h-4 w-4 rounded border-input text-primary focus:ring-primary"
 />
 <label htmlFor="anonymous" className="text-xs text-muted-foreground cursor-pointer">
 Publicar em modo anônimo (seus dados de contato só serão revelados ao aceitar uma proposta).
 </label>
 </div>

 <div className="flex justify-end gap-3 pt-4">
 <button
 type="button"
 onClick={() => setActiveTab("lawsuits")}
 className="rounded-xl border border-border bg-background px-4 py-2.5 text-sm font-semibold text-foreground transition-all hover:bg-accent"
 >
 Cancelar
 </button>
 <button
 type="submit"
 disabled={isPending}
 className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground transition-all hover:bg-primary/90 disabled:opacity-50"
 >
 {isPending ? "Publicando..." : "Publicar Demanda"}
 </button>
 </div>
 </form>
 </div>
 )}

 {/* Ficha 360° do Processo Judicial */}
 <LawsuitDetailsSheet
 open={Boolean(selectedLawsuit)}
 onOpenChange={(open) => !open && setSelectedLawsuit(null)}
 lawsuit={selectedLawsuit}
 />
      {/* Modal de Rastreamento de Processo CNJ DataJud */}
      <Dialog open={isTrackModalOpen} onOpenChange={setIsTrackModalOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl bg-card border border-border/60">
          <DialogHeader>
            <div className="flex items-center gap-2 mb-1">
              <span className="p-2 rounded-xl bg-primary/10 text-primary">
                <Scales className="size-5" />
              </span>
              <DialogTitle className="text-base sm:text-lg font-bold">
                Rastrear Processo Judicial
              </DialogTitle>
            </div>
            <DialogDescription className="text-xs text-muted-foreground">
              Digite o número único CNJ padronizado (20 dígitos). O Waesy consultará a base pública nacional do DataJud e sincronizará os andamentos em tempo real.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleTrackLawsuit} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">
                Número do Processo (CNJ)
              </label>
              <Input
                placeholder="Ex: 0001234-56.2024.8.24.0067"
                value={cnjInput}
                onChange={(e) => setCnjInput(e.target.value)}
                className="font-mono text-xs rounded-xl h-10"
                required
              />
              <p className="text-[11px] text-muted-foreground">
                Suporta Tribunais Estaduais (TJSC, TJSP, etc.), Federais (TRFs) e do Trabalho (TRTs).
              </p>
            </div>

            <DialogFooter className="gap-2 sm:gap-0 pt-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setIsTrackModalOpen(false)}
                className="rounded-xl text-xs h-9 cursor-pointer"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isTracking || !cnjInput.trim()}
                className="rounded-xl text-xs h-9 font-semibold gap-1.5 cursor-pointer"
              >
                {isTracking ? (
                  <Spinner className="size-3.5 animate-spin" />
                ) : (
                  <MagnifyingGlass className="size-3.5" />
                )}
                Sincronizar DataJud
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}