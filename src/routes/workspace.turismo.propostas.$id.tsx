import { ProposalShareWhatsappModal } from "@/components/tourism/studio/proposal-share-whatsapp-modal";
import { createFileRoute, Link, redirect, useNavigate } from "@tanstack/react-router";
import { useState, useCallback } from "react";
import { useMutation } from "@tanstack/react-query";
import { ArrowLeft, Download, Image as ImageIcon, Send, Check, Loader2, Copy, FileCheck2, Compass, Maximize2, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NativeBackButton } from "@/components/ui/native-back-button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { getTravelProposalById, updateTravelProposal, type TravelProposalDTO, type ProposalCanvasFormat } from "@/services/travel-proposal.functions";
import { createContractFromProposal } from "@/services/travel-contract.functions";
import { issueCustomizedContractFromProposal } from "@/services/contract-compiler.functions";
import { ADVANCED_CONTRACT_TEMPLATES } from "@/lib/data/advanced-contract-templates";
import { convertProposalToTrip } from "@/services/travel-lifecycle.functions";
import { StudioFrame, CANVAS_DIMENSIONS } from "@/components/tourism/studio/studio-frame";
import { ProposalCanvasRenderer } from "@/components/tourism/studio/proposal-canvas-renderer";
import { StudioSidebarEditor } from "@/components/tourism/studio/studio-sidebar-editor";
import { resolveProposalCanvasTheme } from "@/lib/tourism/proposal-theme-palettes";
import { exportElementAsPdf, exportElementAsImage } from "@/lib/pdf-export";
import { cn } from "@/lib/utils";

type EditableProposalPatch = Omit<Partial<TravelProposalDTO>, "status"> & {
  status?: Exclude<TravelProposalDTO["status"], "approved">;
};

function toEditableProposalPatch(patch: Partial<TravelProposalDTO>): EditableProposalPatch {
  const { status, ...rest } = patch;
  return status === "approved" ? rest : { ...rest, status };
}

export const Route = createFileRoute("/workspace/turismo/propostas/$id")({
  head: () => ({ meta: [{ title: "Proposta Comercial | Workspace Waesy" }] }),
  loader: async ({ params }) => {
    if (params.id === "novo" || params.id === "new") {
      throw redirect({
        to: "/workspace/turismo/propostas",
        search: { new: true },
      });
    }
    try {
      const proposal = await getTravelProposalById({ data: { id: params.id } });
      return { proposal };
    } catch (err) {
      console.error("[loader:workspace.turismo.propostas.$id] Unhandled loader error:", err);
      return { proposal: null };
    }
  },
  component: WorkspaceProposalStudioPage,
});

function WorkspaceProposalStudioPage() {
  const { proposal: initialProposal } = ((Route.useLoaderData?.() as any) || {});
  const navigate = useNavigate();
  const [proposal, setProposal] = useState<TravelProposalDTO | null>(initialProposal || null);
 const [isExportingPdf, setIsExportingPdf] = useState(false);
 const [isExportingImage, setIsExportingImage] = useState(false);
 const [isCreatingContract, setIsCreatingContract] = useState(false);
 const [isContractDialogOpen, setIsContractDialogOpen] = useState(false);
 const [contractTemplateId, setContractTemplateId] = useState<string>("template-turismo-pacote-viagem");
 const [contractCustomTitle, setContractCustomTitle] = useState<string>("");
 const [contractClientDocument, setContractClientDocument] = useState<string>(
   String(((initialProposal as any)?.pricing?.client_document as string) || ""),
 );
 const [contractSections, setContractSections] = useState({
   showItemsTable: true,
   showSpecsTable: true,
   showItineraryTable: true,
   showPassengersTable: true,
   showFinancialTable: true,
   showCustomFieldsTable: true,
   includeLegalClauses: true,
 });
 const [isConvertingTrip, setIsConvertingTrip] = useState(false);
 const [isSaving, setIsSaving] = useState(false);
 const [whatsappModalOpen, setWhatsappModalOpen] = useState(false);
 const [isMobileEditorOpen, setIsMobileEditorOpen] = useState(false);

 // Zoom controls state
 const [zoomScale, setZoomScale] = useState<number | null>(null);
 const [autoFitScale, setAutoFitScale] = useState<number>(0.85);

 const saveMutation = useMutation({
 mutationFn: (patch: Partial<TravelProposalDTO>) =>
 updateTravelProposal({
 data: {
 id: proposal!.id,
 patch: toEditableProposalPatch(patch),
 },
 }),
 onMutate: () => setIsSaving(true),
 onSettled: () => setIsSaving(false),
 onError: (err: any) => toast.error(err?.message || "Erro ao salvar alterações"),
 });

 const publishMutation = useMutation({
   mutationFn: () => updateTravelProposal({ data: { id: proposal!.id, patch: { status: "sent" } } }),
   onSuccess: () => {
     setProposal((current) => current ? { ...current, status: "sent" } : current);
     toast.success("Proposta publicada para aceite. Reserva e pagamento ainda dependem de confirmação separada.");
   },
   onError: (err: any) => toast.error(err?.message || "Não foi possível publicar a proposta."),
 });

 const handleChange = useCallback(
 (patch: Partial<TravelProposalDTO>) => {
 if (!proposal) return;
 const next = { ...proposal, ...patch };
 setProposal(next);
 saveMutation.mutate(patch);
 },
 [proposal, saveMutation]
 );

 const handlePublishForAcceptance = () => {
   if (!proposal) return;
   const validUntil = proposal.valid_until ? Date.parse(proposal.valid_until) : Number.NaN;
   if (!proposal.snapshot_hash) {
     toast.error("Identificador único da proposta não encontrado. Salve as alterações e tente novamente.");
     return;
   }
   if (!Number.isFinite(validUntil) || validUntil <= Date.now()) {
     toast.error("Defina uma validade futura antes de publicar a proposta.");
     return;
   }
   publishMutation.mutate();
 };

 const handleGenerateContract = async () => {
 if (!proposal) return;
 setIsCreatingContract(true);
 try {
 const res = await createContractFromProposal({
 data: {
 proposalId: proposal.id,
 },
 });
 if (res?.success) {
 setIsContractDialogOpen(false);
 toast.success("Contrato oficial gerado com sucesso! Redirecionando para contratos...");
 if (typeof window !== "undefined") {
 window.location.href = `/workspace/turismo/contratos`;
 }
 }
 } catch (err: any) {
 toast.error(err?.message || "Erro ao emitir contrato da proposta.");
 } finally {
 setIsCreatingContract(false);
 }
 };

 const handleGenerateCustomizedContract = async () => {
   if (!proposal) return;
   setIsCreatingContract(true);
   try {
     const res = await issueCustomizedContractFromProposal({
       data: {
         proposalId: proposal.id,
         templateId: contractTemplateId || undefined,
         customTitle: contractCustomTitle.trim() || undefined,
         clientDocument: contractClientDocument.trim() || undefined,
         sectionConfig: contractSections,
       },
     });
     if (res?.success) {
       setIsContractDialogOpen(false);
       toast.success(`Contrato tabular gerado (${res.templateTitle})! Abrindo editor...`);
       navigate({ to: "/workspace/contratos/$id/editor", params: { id: res.contractId } });
     }
   } catch (err: any) {
     toast.error(err?.message || "Erro ao personalizar e emitir contrato da proposta.");
   } finally {
     setIsCreatingContract(false);
   }
 };

 const handleConvertToTrip = async () => {
 if (!proposal) return;
 setIsConvertingTrip(true);
 try {
 const res = await convertProposalToTrip({
 data: {
 proposalId: proposal.id,
 },
 });
 if (res?.success && res.tripId) {
 toast.success(`Viagem confirmada (${res.tripNumber})! Reserva, vouchers e contratos gerados com sucesso.`);
 if (typeof window !== "undefined") {
 window.location.href = `/workspace/turismo/viagens/${res.tripId}`;
 }
 }
 } catch (err: any) {
 toast.error(err?.message || "Erro ao converter proposta em viagem.");
 } finally {
 setIsConvertingTrip(false);
 }
 };

 if (!proposal) {
 return (
 <div className="h-dvh w-screen flex flex-col items-center justify-center bg-background space-y-4">
 <h2 className="text-sm font-bold text-foreground">Proposta não encontrada</h2>
 <Button asChild  variant="outline" className="rounded-lg h-11 min-h-11 px-3 text-xs">
 <Link to="/workspace/turismo/cotacoes">Voltar para Cotações</Link>
 </Button>
 </div>
 );
 }

 const publicUrl = `${typeof window !== "undefined" ? window.location.origin : ""}/proposta/${proposal.public_token}`;

 const handleCopyLink = () => {
   if (proposal.status !== "sent") {
     toast.info("Publique a proposta para habilitar o aceite antes de compartilhar o link.");
     return;
   }
   if (typeof navigator !== "undefined") {
 navigator.clipboard.writeText(publicUrl);
 toast.success("Link público da proposta copiado!");
 }
 };

 const handleExportPdf = async () => {
 try {
 setIsExportingPdf(true);
 await exportElementAsPdf("proposal-canvas", `${proposal.title.replace(/\s+/g, "_")}.pdf`);
 toast.success("PDF gerado e baixado com sucesso!");
 } catch (err: any) {
 toast.error(err?.message || "Erro ao exportar PDF.");
 } finally {
 setIsExportingPdf(false);
 }
 };

 const handleExportImage = async () => {
 try {
 setIsExportingImage(true);
 await exportElementAsImage("proposal-canvas", `${proposal.title.replace(/\s+/g, "_")}.png`);
 toast.success("Imagem PNG gerada e baixada com sucesso!");
 } catch (err: any) {
 toast.error(err?.message || "Erro ao exportar imagem.");
 } finally {
 setIsExportingImage(false);
 }
 };

 const cleanWhatsapp = (proposal.client_whatsapp || "").replace(/\D/g, "");
 const waMessage = encodeURIComponent(
 `Olá ${proposal.client_name}! Preparamos a sua proposta personalizada de viagem para ${proposal.destination_city}. Você pode visualizá-la online no link:\n\n${publicUrl}`
 );

 const currentTemplate = proposal.template_theme || (proposal as any).template || "editorial-flat";
 const activeCanvasTheme = resolveProposalCanvasTheme(proposal as unknown as Record<string, any>);
 const displayZoom = Math.round((zoomScale !== null ? zoomScale : autoFitScale) * 100);

 return (
 <div className="flex h-dvh w-screen flex-col overflow-hidden bg-background select-none font-sans">
 {/* ── 1. BARRA SUPERIOR CANÔNICA (Studio Toolbar Fixo 56px) ── */}
 <header className="h-14 px-4 border-b border-border/80 flex items-center justify-between shrink-0 bg-card z-30">
 {/* Esquerda: Voltar + Identificação da Proposta + Status */}
 <div className="flex items-center gap-3">
 <NativeBackButton fallbackHref="/workspace/turismo/cotacoes" />

 <div className="h-4 w-px bg-border/80" />

 <div className="space-y-1">
 <div className="flex items-center gap-2">
 <h1 className="text-xs font-bold text-foreground truncate max-w-xs sm:max-w-sm">
 {proposal.title}
 </h1>
 <Badge variant="outline" className="text-xs font-mono uppercase font-bold py-1 px-2">
 {proposal.status}
 </Badge>
 {isSaving ? (
 <span className="flex items-center gap-1 text-xs text-muted-foreground font-mono">
 <Loader2 className="size-3 animate-spin motion-reduce:animate-none motion-reduce:transition-none text-primary" /> Salvando...
 </span>
 ) : (
 <span className="flex items-center gap-1 text-xs text-emerald-600 font-mono">
 <Check className="size-3" /> Salvo
 </span>
 )}
 </div>
 <p className="text-xs text-muted-foreground truncate max-w-xs">
 Cliente: <strong className="text-foreground">{proposal.client_name}</strong> · {proposal.destination_city}
 </p>
 </div>
 </div>

 {/* Centro: Controles de Zoom do Canvas */}
 <div className="flex items-center gap-2">


 {/* Controles de Zoom */}
 <div className="flex items-center gap-1 bg-muted/40 p-1 rounded-lg border border-border/50">
 <button
 type="button"
 onClick={() => setZoomScale((prev) => Math.max(0.3, (prev !== null ? prev : autoFitScale) - 0.1))}
 className="min-h-11 min-w-11 rounded-lg text-xs font-bold text-muted-foreground hover:text-foreground flex items-center justify-center cursor-pointer focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
 title="Diminuir Zoom (-)"
 >
 -
 </button>
 <button
 type="button"
 onClick={() => setZoomScale(null)}
 className="min-h-11 px-2 py-1 text-xs font-mono font-bold text-muted-foreground hover:text-foreground cursor-pointer focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
 title="Ajustar à Tela (Fit)"
 >
 {displayZoom}%
 </button>
 <button
 type="button"
 onClick={() => setZoomScale((prev) => Math.min(1.4, (prev !== null ? prev : autoFitScale) + 0.1))}
 className="min-h-11 min-w-11 rounded-lg text-xs font-bold text-muted-foreground hover:text-foreground flex items-center justify-center cursor-pointer focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
 title="Aumentar Zoom (+)"
 >
 +
 </button>
 </div>
 </div>

 {/* Direita: Ações de Exportação, Contrato, WhatsApp */}
 <div className="flex items-center gap-2">
 <Button
 type="button"
 size="sm"
 variant="outline"
 disabled={isExportingImage}
 onClick={handleExportImage}
 className="rounded-lg text-xs font-bold gap-2 h-11 px-3 cursor-pointer"
 title="Exportar Imagem PNG"
 >
 <ImageIcon className="size-3.5" />
 <span className="hidden waesy-expanded-flex">{isExportingImage ? "Exportando..." : "PNG"}</span>
 </Button>

 <Button
 type="button"
 size="sm"
 variant="outline"
 disabled={isExportingPdf}
 onClick={handleExportPdf}
 className="rounded-lg text-xs font-bold gap-2 h-11 px-3 cursor-pointer"
 title="Exportar Documento PDF"
 >
 <Download className="size-3.5" />
 <span className="hidden waesy-expanded-flex">{isExportingPdf ? "Gerando..." : "PDF"}</span>
 </Button>

 <Button
 type="button"
 size="sm"
 disabled={isConvertingTrip}
 onClick={handleConvertToTrip}
 className="rounded-lg text-xs font-bold gap-2 h-11 px-3 bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer"
 >
 {isConvertingTrip ? <Loader2 className="size-3.5 animate-spin motion-reduce:animate-none motion-reduce:transition-none" /> : <Compass className="size-3.5" />}
 <span className="hidden waesy-expanded-flex">Converter em Viagem</span>
 </Button>

 {proposal.status === "draft" || proposal.status === "rejected" || proposal.status === "expired" ? (
   <Button
     type="button"
     size="sm"
     variant="outline"
     disabled={publishMutation.isPending}
     onClick={handlePublishForAcceptance}
     className="rounded-lg text-xs font-bold gap-2 h-11 px-3 cursor-pointer"
     title="Publicar a versão atual para aceite do cliente"
   >
     {publishMutation.isPending ? <Loader2 className="size-3.5 animate-spin motion-reduce:animate-none motion-reduce:transition-none" /> : <Check className="size-3.5" />}
     <span className="hidden waesy-expanded-flex">Publicar para aceite</span>
   </Button>
 ) : null}

 <Button
 type="button"
 size="sm"
 variant="outline"
 disabled={isCreatingContract}
 onClick={() => setIsContractDialogOpen(true)}
 className="rounded-lg text-xs font-bold gap-2 h-11 px-3 cursor-pointer"
 title="Configurar e Emitir Contrato Tabular"
 >
 {isCreatingContract ? <Loader2 className="size-3.5 animate-spin motion-reduce:animate-none motion-reduce:transition-none" /> : <FileCheck2 className="size-3.5" />}
 <span className="hidden waesy-expanded-flex">Contrato</span>
 </Button>

 <Button
 type="button"
 size="sm"
 disabled={proposal.status !== "sent"}
 onClick={handleCopyLink}
 className="rounded-lg text-xs font-bold gap-2 h-11 px-3 bg-foreground text-background hover:bg-foreground/90 cursor-pointer"
 title={proposal.status === "sent" ? "Copiar link público da proposta" : "Publique a proposta antes de compartilhar o link"}
 >
 <Copy className="size-3.5" />
 </Button>

 {cleanWhatsapp && (
 <Button
 type="button"
 size="sm"
 disabled={proposal.status !== "sent"}
 onClick={() => {
   if (proposal.status !== "sent") {
     toast.info("Publique a proposta para habilitar o aceite antes de compartilhar.");
     return;
   }
   setWhatsappModalOpen(true);
 }}
 className="rounded-lg text-xs font-bold gap-2 h-11 px-3 bg-primary hover:bg-primary/90 text-primary-foreground cursor-pointer"
 title="Enviar Proposta WhatsApp"
 >
 <Send className="size-3.5" />
 <span className="hidden waesy-expanded-flex">WhatsApp</span>
 </Button>
 )}
 </div>
 </header>

 {/* ── 2. STUDIO WORKSPACE BODY (Bifurcação Desktop vs Mobile - V119) ── */}
 <div className="flex flex-1 min-h-0 overflow-hidden relative">
 {/* Editor Lateral no Desktop (md+) */}
 <aside className="hidden waesy-expanded-flex waesy-proposal-editor-pane shrink-0 border-r border-border/80 bg-card flex-col h-full overflow-hidden z-20">
 <StudioSidebarEditor proposal={proposal} onChange={handleChange} />
 </aside>

 {/* Truthful Preview Canvas Frame com Scroll Fluido (Full Width no Mobile) */}
 <main className="flex-1 h-full overflow-hidden flex flex-col bg-muted/30 relative">
 <StudioFrame
 format={proposal.canvas_format}
 zoomScale={zoomScale}
 canvasBgColor={activeCanvasTheme.canvasBg}
 onAutoFitScaleCalculated={setAutoFitScale}
 >
 <ProposalCanvasRenderer proposal={proposal} />
 </StudioFrame>
 </main>

 {/* FAB Mobile: Abre Editor em Bottom Sheet (< md) */}
 <Sheet open={isMobileEditorOpen} onOpenChange={setIsMobileEditorOpen}>
 <SheetTrigger asChild>
 <button
 type="button"
 className="waesy-compact-medium-only fixed bottom-20 right-4 z-50 flex items-center justify-center size-12 rounded-lg bg-primary text-primary-foreground cursor-pointer focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
 aria-label="Abrir editor da proposta"
 >
 <SlidersHorizontal className="size-5" />
 </button>
 </SheetTrigger>
 <SheetContent side="bottom" className="waesy-sheet-responsive max-w-none p-0 overflow-hidden rounded-t-lg">
 <div className="h-full flex flex-col">
 <StudioSidebarEditor proposal={proposal} onChange={handleChange} />
 </div>
 </SheetContent>
 </Sheet>
 <ProposalShareWhatsappModal
   isOpen={whatsappModalOpen}
   onClose={() => setWhatsappModalOpen(false)}
   proposal={proposal}
 />
 <Dialog open={isContractDialogOpen} onOpenChange={setIsContractDialogOpen}>
   <DialogContent size="lg">
     <DialogHeader>
       <DialogTitle>Emitir Contrato da Proposta</DialogTitle>
       <DialogDescription>
         Personalize o modelo jurídico e as tabelas incluídas antes de abrir o editor oficial.
       </DialogDescription>
     </DialogHeader>

     <div className="space-y-4 py-2">
       <div className="space-y-2">
         <Label htmlFor="proposal-contract-template">Modelo de Minuta</Label>
         <select
           id="proposal-contract-template"
           value={contractTemplateId}
           onChange={(e) => setContractTemplateId(e.target.value)}
           className="w-full h-11 min-h-11 rounded-lg border border-border bg-background px-3 text-xs font-medium text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
         >
           {ADVANCED_CONTRACT_TEMPLATES.map((tpl) => (
             <option key={tpl.id} value={tpl.id}>
               {tpl.title}
             </option>
           ))}
         </select>
       </div>

       <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
         <div className="space-y-2">
           <Label htmlFor="proposal-contract-title">Título do Contrato (opcional)</Label>
           <Input
             id="proposal-contract-title"
             value={contractCustomTitle}
             onChange={(e) => setContractCustomTitle(e.target.value)}
             placeholder={proposal.title}
             className="h-11 min-h-11"
           />
         </div>
         <div className="space-y-2">
           <Label htmlFor="proposal-contract-doc">CPF / CNPJ do Contratante (opcional)</Label>
           <Input
             id="proposal-contract-doc"
             value={contractClientDocument}
             onChange={(e) => setContractClientDocument(e.target.value)}
             placeholder="Somente números ou deixe em branco"
             className="h-11 min-h-11"
           />
         </div>
       </div>

       <div className="space-y-2 pt-2 border-t border-border/60">
         <span className="text-xs font-semibold text-foreground block">
           Tabelas e Seções Incluídas
         </span>
         <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
           {[
             { key: "showItemsTable", label: "Itens, Voos e Hospedagens" },
             { key: "showSpecsTable", label: "Ficha Técnica e Inclusões" },
             { key: "showItineraryTable", label: "Roteiro Dia a Dia" },
             { key: "showPassengersTable", label: "Manifesto de Passageiros" },
             { key: "showFinancialTable", label: "Cronograma Financeiro" },
             { key: "showCustomFieldsTable", label: "Campos Personalizados" },
             { key: "includeLegalClauses", label: "Cláusulas Jurídicas Completas" },
           ].map((item) => {
             const k = item.key as keyof typeof contractSections;
             return (
               <div key={item.key} className="flex items-center justify-between gap-2 py-1">
                 <Label htmlFor={`prop-sec-${item.key}`} className="text-xs font-medium cursor-pointer">
                   {item.label}
                 </Label>
                 <Switch
                   id={`prop-sec-${item.key}`}
                   checked={contractSections[k]}
                   onCheckedChange={(checked) =>
                     setContractSections((prev) => ({ ...prev, [k]: checked }))
                   }
                 />
               </div>
             );
           })}
         </div>
       </div>
     </div>

     <DialogFooter className="gap-2 flex-wrap">
       <Button
         type="button"
         variant="outline"
         disabled={isCreatingContract}
         onClick={handleGenerateContract}
         className="h-11 min-h-11"
       >
         Emissão Rápida Padrão
       </Button>
       <Button
         type="button"
         disabled={isCreatingContract}
         onClick={handleGenerateCustomizedContract}
         className="h-11 min-h-11 gap-2"
       >
         {isCreatingContract && <Loader2 className="size-4 animate-spin motion-reduce:animate-none" />}
         <span>Gerar Contrato Tabular</span>
       </Button>
     </DialogFooter>
   </DialogContent>
 </Dialog>
 </div>
 </div>
 );
}
