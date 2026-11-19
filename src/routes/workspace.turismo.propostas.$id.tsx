import { ProposalShareWhatsappModal } from "@/components/tourism/studio/proposal-share-whatsapp-modal";
import { HotOfferPublisherDialog } from "@/components/tourism/studio/hot-offer-publisher-dialog";
import {
  evaluateProposalHistoricalOfferEligibilityFn,
  type HotOfferEligibilityEvaluationResult,
} from "@/services/hot-offers.functions";
import { createFileRoute, Link, redirect, useNavigate, useRouter } from "@tanstack/react-router";
import { useState, useCallback, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Download, Image as ImageIcon, Send, Check, Loader2, Copy, FileCheck2, Compass, Maximize2, SlidersHorizontal, ExternalLink, FileText, Globe, Monitor, Smartphone, Flame, TrendingDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NativeBackButton } from "@/components/ui/native-back-button";
import { Badge } from "@/components/ui/badge";
import { CrudActionsMenu } from "@/components/ui/crud-actions-menu";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
  getTravelProposalById,
  updateTravelProposal,
  duplicateTravelProposal,
  deleteTravelProposal,
  type TravelProposalDTO,
  type ProposalCanvasFormat,
} from "@/services/travel-proposal.functions";
import { createContractFromProposal } from "@/services/travel-contract.functions";
import { issueCustomizedContractFromProposal } from "@/services/contract-compiler.functions";
import { ADVANCED_CONTRACT_TEMPLATES } from "@/lib/data/advanced-contract-templates";
import { convertProposalToTrip } from "@/services/travel-lifecycle.functions";
import { StudioFrame, CANVAS_DIMENSIONS } from "@/components/tourism/studio/studio-frame";
import { ProposalCanvasRenderer } from "@/components/tourism/studio/proposal-canvas-renderer";
import { ProposalWebShowcase } from "@/components/tourism/studio/proposal-web-showcase";
import { StudioSidebarEditor } from "@/components/tourism/studio/studio-sidebar-editor";
import { resolveProposalCanvasTheme } from "@/lib/tourism/proposal-theme-palettes";
import { exportElementAsPdf, exportElementAsImage } from "@/lib/pdf-export";
import { validateProposalForExport } from "@/lib/tourism/proposal-validation";
import { DocumentExportMenu } from "@/components/documents/DocumentExportMenu";
import { cn } from "@/lib/utils";

type EditableProposalPatch = Omit<Partial<TravelProposalDTO>, "status" | "web_page"> & {
  status?: Exclude<TravelProposalDTO["status"], "approved">;
};

function toEditableProposalPatch(patch: Partial<TravelProposalDTO>): EditableProposalPatch {
  const { status, selected_customer_label: _ignoredLabel, web_page: _ignoredWebPage, ...rest } = patch;
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
  const router = useRouter();
  const queryClient = useQueryClient();
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
 const [stageViewMode, setStageViewMode] = useState<"canvas" | "web">("canvas");
 const [webViewport, setWebViewport] = useState<"desktop" | "mobile">("desktop");
 const [sidebarTabOverride, setSidebarTabOverride] = useState<string | undefined>(undefined);

 // Zoom controls state
 const [zoomScale, setZoomScale] = useState<number | null>(null);
 const [autoFitScale, setAutoFitScale] = useState<number>(0.85);
 const [isHotOfferDialogOpen, setIsHotOfferDialogOpen] = useState(false);
 const [hotOfferEvaluation, setHotOfferEvaluation] = useState<HotOfferEligibilityEvaluationResult | null>(null);

 useEffect(() => {
   if (!proposal?.store_id || !proposal?.destination_city) return;
   const totalCents = Math.max(0, Number(proposal.pricing?.total_price_cents || (proposal.pricing as any)?.final_total_cents || 0));
   if (totalCents <= 0) return;

   let cancelled = false;
   evaluateProposalHistoricalOfferEligibilityFn({
     data: {
       storeId: proposal.store_id,
       proposalId: proposal.id,
       title: proposal.title,
       destinationCity: proposal.destination_city,
       originCity: proposal.flights?.[0]?.origin_city || null,
       originIata: proposal.flights?.[0]?.origin_iata || (proposal.flights?.[0] as any)?.origin_code || null,
       destinationIata: proposal.flights?.[0]?.destination_iata || (proposal.flights?.[0] as any)?.destination_code || null,
       departureDate: proposal.travel_start_date || null,
       returnDate: proposal.travel_end_date || null,
       adultsCount: Math.max(1, proposal.adults_count || 2),
       totalPriceCents: totalCents,
       installmentsMax: Math.max(1, Number(proposal.pricing?.installments_options?.[0]?.installments_count || (proposal.pricing as any)?.installments_max || 10)),
       hotelHeadline: proposal.hotels?.[0]?.hotel_name || null,
       includesHeadline: proposal.includes || [],
       excludeLeadId: proposal.lead_id || null,
     },
   })
     .then((res) => {
       if (!cancelled) setHotOfferEvaluation(res);
     })
     .catch(() => {
       // Non-blocking background check
     });

   return () => {
     cancelled = true;
   };
 }, [proposal?.id, proposal?.store_id, proposal?.destination_city, proposal?.pricing?.total_price_cents]);

 const syncProposalCaches = useCallback(async () => {
   await Promise.all([
     queryClient.invalidateQueries({ queryKey: ["agency-proposals"] }),
     queryClient.invalidateQueries({ queryKey: ["tourism-cockpit-leads"] }),
     queryClient.invalidateQueries({ queryKey: ["crm-leads"] }),
     router.invalidate(),
   ]);
 }, [queryClient, router]);

 const saveMutation = useMutation({
 mutationFn: (patch: Partial<TravelProposalDTO>) =>
 updateTravelProposal({
 data: {
 id: proposal!.id,
 patch: toEditableProposalPatch(patch),
 },
 }),
 onMutate: () => setIsSaving(true),
 onSuccess: () => {
   void queryClient.invalidateQueries({ queryKey: ["agency-proposals"] });
 },
 onSettled: () => setIsSaving(false),
 onError: (err: any) => toast.error(err?.message || "Erro ao salvar alterações"),
 });

 const publishMutation = useMutation({
   mutationFn: () => {
     const validUntil = proposal?.valid_until && Date.parse(proposal.valid_until) > Date.now()
       ? proposal.valid_until
       : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
     return updateTravelProposal({
       data: {
         id: proposal!.id,
         patch: { status: "sent", valid_until: validUntil },
       },
     });
   },
   onSuccess: () => {
     setProposal((current) => current ? { ...current, status: "sent" } : current);
     toast.success("Proposta publicada para aceite. Reserva e pagamento ainda dependem de confirmação separada.");
     void syncProposalCaches();
   },
   onError: (err: any) => toast.error(err?.message || "Não foi possível publicar a proposta."),
 });

 const duplicateMutation = useMutation({
   mutationFn: () => duplicateTravelProposal({ data: { id: proposal!.id } }),
   onSuccess: async (res) => {
     toast.success("Proposta duplicada! Abrindo nova versão no Studio...");
     await syncProposalCaches();
     if (res?.id) {
       navigate({ to: "/workspace/turismo/propostas/$id", params: { id: res.id } });
     }
   },
   onError: (err: any) => toast.error(err?.message || "Erro ao duplicar proposta."),
 });

 const deleteMutation = useMutation({
   mutationFn: () => deleteTravelProposal({ data: { id: proposal!.id } }),
   onSuccess: async () => {
     toast.success("Proposta excluída permanentemente!");
     await syncProposalCaches();
     navigate({ to: "/workspace/turismo/propostas" });
   },
   onError: (err: any) => toast.error(err?.message || "Erro ao excluir proposta."),
 });

 const handleChange = useCallback(
 (patch: Partial<TravelProposalDTO>) => {
 if (!proposal) return;
 const next = { ...proposal, ...patch };
 setProposal(next);
 const cleanPatch = toEditableProposalPatch(patch);
 if (Object.keys(cleanPatch).length > 0) {
   saveMutation.mutate(patch);
 }
 },
 [proposal, saveMutation]
 );

 const handlePublishForAcceptance = () => {
   if (!proposal) return;
   const validUntil = proposal.valid_until ? Date.parse(proposal.valid_until) : Number.NaN;
   if (proposal.valid_until && Number.isFinite(validUntil) && validUntil <= Date.now()) {
     toast.error("A validade definida está no passado. Ajuste a data de validade antes de publicar.");
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
 toast.success(`Viagem gerada (${res.tripNumber})! Aguardando emissões, uploads e assinatura de contrato.`);
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

 const handleCopyLink = async () => {
   let publishedNow = false;
   if (proposal.status === "draft") {
     try {
       await publishMutation.mutateAsync();
       publishedNow = true;
     } catch {
       return;
     }
   }
   if (typeof navigator !== "undefined") {
     await navigator.clipboard.writeText(publicUrl);
     toast.success(
       publishedNow
         ? "Proposta publicada e link público copiado!"
         : "Link público da proposta copiado!",
     );
   }
 };

 const handleExportPdf = async () => {
  const check = validateProposalForExport(proposal);
  if (!check.ok) {
    toast.error(check.errors[0]);
    return;
  }
  try {
    setIsExportingPdf(true);
 if (stageViewMode !== "canvas") {
   setStageViewMode("canvas");
   await new Promise<void>((resolve) =>
     requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
   );
 }
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
 if (stageViewMode !== "canvas") {
   setStageViewMode("canvas");
   await new Promise<void>((resolve) =>
     requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
   );
 }
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
 const proposalExportMarkdown = [
 `# ${proposal.title}`,
 "",
 `**Cliente:** ${proposal.client_name}`,
 `**Destino:** ${proposal.destination_city || "A definir"}`,
 proposal.travel_start_date
 ? `**Período:** ${proposal.travel_start_date} a ${proposal.travel_end_date || ""}`
 : "",
 proposal.subtitle ? `\n## Apresentação\n${proposal.subtitle}` : "",
 proposal.special_notes ? `\n## Observações & Roteiro\n${proposal.special_notes}` : "",
 proposal.includes?.length
 ? `\n## Itens Inclusos\n${proposal.includes.map((item: string) => `- ${item}`).join("\n")}`
 : "",
 proposal.pricing?.payment_terms
 ? `\n## Condições Comerciais\n${proposal.pricing.payment_terms}`
 : "",
 ]
 .filter(Boolean)
 .join("\n");

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

 {/* Centro: Seletor Lâmina PDF / Página Web + Zoom ou Viewport */}
 <div className="flex items-center gap-2">
 <div className="flex items-center gap-1 bg-muted/40 p-1 rounded-lg border border-border/50">
   <button
     type="button"
     onClick={() => setStageViewMode("canvas")}
     className={cn(
       "min-h-11 px-3 rounded-lg text-xs font-bold flex items-center gap-2 cursor-pointer focus-visible:ring-2 focus-visible:ring-ring",
       stageViewMode === "canvas" ? "bg-card text-foreground border border-border" : "text-muted-foreground hover:text-foreground",
     )}
     title="Visualizar e editar Lâmina PDF"
   >
     <FileText className="size-3.5" />
     <span className="hidden waesy-expanded-flex">Lâmina PDF</span>
   </button>
   <button
     type="button"
     onClick={() => {
       setStageViewMode("web");
       setSidebarTabOverride("web");
     }}
     className={cn(
       "min-h-11 px-3 rounded-lg text-xs font-bold flex items-center gap-2 cursor-pointer focus-visible:ring-2 focus-visible:ring-ring",
       stageViewMode === "web" ? "bg-card text-foreground border border-border" : "text-muted-foreground hover:text-foreground",
     )}
     title="Construir e visualizar Página Web"
   >
     <Globe className="size-3.5" />
     <span className="hidden waesy-expanded-flex">Página Web</span>
   </button>
 </div>

 {stageViewMode === "canvas" ? (
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
 ) : (
 <div className="flex items-center gap-1 bg-muted/40 p-1 rounded-lg border border-border/50">
   <button
     type="button"
     onClick={() => setWebViewport("desktop")}
     aria-label="Preview Desktop"
     className={cn(
       "min-h-11 min-w-11 rounded-lg flex items-center justify-center cursor-pointer focus-visible:ring-2 focus-visible:ring-ring",
       webViewport === "desktop" ? "bg-card text-foreground border border-border" : "text-muted-foreground hover:text-foreground",
     )}
     title="Visualização Desktop"
   >
     <Monitor className="size-4" />
   </button>
   <button
     type="button"
     onClick={() => setWebViewport("mobile")}
     aria-label="Preview Mobile"
     className={cn(
       "min-h-11 min-w-11 rounded-lg flex items-center justify-center cursor-pointer focus-visible:ring-2 focus-visible:ring-ring",
       webViewport === "mobile" ? "bg-card text-foreground border border-border" : "text-muted-foreground hover:text-foreground",
     )}
     title="Visualização Mobile"
   >
     <Smartphone className="size-4" />
   </button>
 </div>
 )}
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

 <DocumentExportMenu
 filenameBase={proposal.title || `proposta-${proposal.id.slice(0, 8)}`}
 title={proposal.title}
 subtitle={`${proposal.client_name} · ${proposal.destination_city || ""}`}
 agencyName={proposal.agency_name || "Organização Emissora"}
 elementId="proposal-canvas"
 markdownContent={proposalExportMarkdown}
 pageFormat={proposal.canvas_format}
 compact
 />

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
 asChild
 type="button"
 size="sm"
 variant="outline"
 className="rounded-lg text-xs font-bold gap-2 h-11 min-h-11 px-3 cursor-pointer"
 title="Abrir Página Web da Proposta"
 >
   <a href={`/proposta/${proposal.public_token}`} target="_blank" rel="noreferrer">
     <ExternalLink className="size-3.5 text-primary" />
     <span className="hidden waesy-expanded-flex">Ver Web</span>
   </a>
 </Button>

 <Button
 type="button"
 size="sm"
 disabled={publishMutation.isPending}
 onClick={handleCopyLink}
 className="rounded-lg text-xs font-bold gap-2 h-11 min-h-11 px-3 bg-foreground text-background hover:bg-foreground/90 cursor-pointer"
 title={proposal.status === "draft" ? "Publicar e copiar link público da proposta" : "Copiar link público da proposta"}
 >
 <Copy className="size-3.5" />
 </Button>

 {cleanWhatsapp && (
 <Button
 type="button"
 size="sm"
 onClick={async () => {
   if (proposal.status === "draft") {
     try {
       await publishMutation.mutateAsync();
     } catch {
       return;
     }
   }
   setWhatsappModalOpen(true);
 }}
 className="rounded-lg text-xs font-bold gap-2 h-11 min-h-11 px-3 bg-primary hover:bg-primary/90 text-primary-foreground cursor-pointer"
 title="Enviar Proposta WhatsApp"
 >
 <Send className="size-3.5" />
 <span className="hidden waesy-expanded-flex">WhatsApp</span>
 </Button>
 )}

 <Button
 type="button"
 size="sm"
 variant="outline"
 onClick={() => setIsHotOfferDialogOpen(true)}
 className="rounded-lg text-xs font-bold gap-2 h-11 min-h-11 px-3 cursor-pointer"
 title="Transformar em Oferta Pública / Story Hot"
 >
 <Flame className="size-3.5 text-primary" />
 <span className="hidden waesy-expanded-flex">Oferta Hot</span>
 </Button>

 <CrudActionsMenu
   entityName="Proposta"
   viewUrl={`/proposta/${proposal.public_token}`}
   viewLabel="Ver Página Web"
   onDuplicate={() => duplicateMutation.mutate()}
   onDelete={async () => {
     await deleteMutation.mutateAsync();
   }}
   deleteConfirmTitle={`Excluir proposta "${proposal.title}"?`}
   deleteConfirmDescription="Esta ação removerá permanentemente a proposta do Studio e do CRM."
 />
 </div>
 </header>

 {hotOfferEvaluation?.isEligible ? (
   <div className="px-4 py-2 border-b border-border/80 bg-muted/40 flex flex-wrap items-center justify-between gap-3 shrink-0 z-20">
     <div className="flex items-center gap-2 text-xs text-foreground">
       <TrendingDown className="size-4 text-primary shrink-0" />
       <span>
         {hotOfferEvaluation.historicalCheck.historicalSavingsPct &&
         hotOfferEvaluation.historicalCheck.historicalSavingsPct >= 5
           ? `Tarifa vantajosa detectada: ${Math.round(
               hotOfferEvaluation.historicalCheck.historicalSavingsPct
             )}% abaixo da média histórica para ${proposal.destination_city}`
           : `Oportunidade detectada para ${proposal.destination_city}`}
         {hotOfferEvaluation.matchedLeadsCount > 0
           ? ` · ${hotOfferEvaluation.matchedLeadsCount} lead(s) compatível(is) no Radar IA.`
           : "."}
       </span>
     </div>
     <Button
       type="button"
       size="sm"
       variant="outline"
       onClick={() => setIsHotOfferDialogOpen(true)}
       className="h-11 min-h-11 px-3 text-xs font-bold gap-2 cursor-pointer"
     >
       <Flame className="size-3.5 text-primary" />
       Transformar em Oferta Pública / Story Hot
     </Button>
   </div>
 ) : null}

 {/* ── 2. STUDIO WORKSPACE BODY (Bifurcação Desktop vs Mobile - V119) ── */}
 <div className="flex flex-1 min-h-0 overflow-hidden relative">
 {/* Editor Lateral no Desktop (md+) */}
 <aside className="hidden waesy-expanded-flex waesy-proposal-editor-pane shrink-0 border-r border-border/80 bg-card flex-col h-full overflow-hidden z-20">
 <StudioSidebarEditor
   proposal={proposal}
   onChange={handleChange}
   activeTabOverride={sidebarTabOverride}
   onTabChange={(tab) => {
     setSidebarTabOverride(tab);
     if (tab === "web") setStageViewMode("web");
   }}
 />
 </aside>

 {/* Truthful Preview Canvas Frame ou Vitrine Web Interativa */}
 <main className="flex-1 h-full overflow-hidden flex flex-col bg-muted/30 relative">
 {stageViewMode === "web" ? (
   <div className="flex-1 overflow-y-auto p-4 sm:p-6">
     <div
       className={cn(
         "mx-auto",
         webViewport === "mobile"
           ? "max-w-sm rounded-2xl border border-border bg-background p-3"
           : "max-w-5xl",
       )}
     >
       <ProposalWebShowcase
         proposal={proposal}
         webPage={proposal.web_page}
         compactPreview={webViewport === "mobile"}
       />
     </div>
   </div>
 ) : (
   <StudioFrame
     format={proposal.canvas_format}
     zoomScale={zoomScale}
     canvasBgColor={activeCanvasTheme.canvasBg}
     onAutoFitScaleCalculated={setAutoFitScale}
   >
     <ProposalCanvasRenderer proposal={proposal} />
   </StudioFrame>
 )}
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
 <StudioSidebarEditor
   proposal={proposal}
   onChange={handleChange}
   activeTabOverride={sidebarTabOverride}
   onTabChange={(tab) => {
     setSidebarTabOverride(tab);
     if (tab === "web") setStageViewMode("web");
   }}
 />
 </div>
 </SheetContent>
 </Sheet>
 <ProposalShareWhatsappModal
   isOpen={whatsappModalOpen}
   onClose={() => setWhatsappModalOpen(false)}
   proposal={proposal}
 />
 <HotOfferPublisherDialog
   open={isHotOfferDialogOpen}
   onOpenChange={setIsHotOfferDialogOpen}
   proposal={proposal}
   initialEvaluation={hotOfferEvaluation}
   onPublishedSuccess={() => {
     void syncProposalCaches();
   }}
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
