import { ProposalShareWhatsappModal } from "@/components/tourism/studio/proposal-share-whatsapp-modal";
import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useState, useCallback } from "react";
import { useMutation } from "@tanstack/react-query";
import {  ArrowLeft, Download, Image as ImageIcon, Send, Check, Loader2, Copy, FileCheck2, Compass, Maximize2, SlidersHorizontal , LayoutTemplate, Moon, Briefcase, Monitor, FileText, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NativeBackButton } from "@/components/ui/native-back-button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { getTravelProposalById, updateTravelProposal, type TravelProposalDTO, type ProposalCanvasFormat } from "@/services/travel-proposal.functions";
import { createContractFromProposal } from "@/services/travel-contract.functions";
import { convertProposalToTrip } from "@/services/travel-lifecycle.functions";
import { StudioFrame, CANVAS_DIMENSIONS } from "@/components/tourism/studio/studio-frame";
import { ProposalCanvasRenderer } from "@/components/tourism/studio/proposal-canvas-renderer";
import { StudioSidebarEditor } from "@/components/tourism/studio/studio-sidebar-editor";
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
  const [proposal, setProposal] = useState<TravelProposalDTO | null>(initialProposal || null);
 const [isExportingPdf, setIsExportingPdf] = useState(false);
 const [isExportingImage, setIsExportingImage] = useState(false);
 const [isCreatingContract, setIsCreatingContract] = useState(false);
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
     toast.error("A proposta ainda não possui fingerprint canônico. Salve as alterações e tente novamente.");
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
 <Button asChild size="sm" variant="outline" className="rounded-lg">
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

 const currentTemplate = (proposal as any).template || "editorial-flat";
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

 {/* Centro: Formato + Template + Controles de Zoom */}
 <div className="flex items-center gap-2">
 {/* Seletor de Formato do Canvas */}
 <div className="flex items-center gap-1 bg-muted/40 p-1 rounded-lg border border-border/50">
 {(["a4-portrait", "a4-landscape", "story-916"] as ProposalCanvasFormat[]).map((fmt) => (
 <button
 key={fmt}
 type="button"
 onClick={() => handleChange({ canvas_format: fmt })}
 className={cn(
 "min-h-11 px-3 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
 proposal.canvas_format === fmt
 ? "bg-background text-foreground"
 : "text-muted-foreground hover:text-foreground"
 )}
 title={CANVAS_DIMENSIONS[fmt]?.label}
 >
 {CANVAS_DIMENSIONS[fmt]?.iconEmoji}{" "}
 <span className="hidden waesy-expanded-flex">
 {fmt === "a4-portrait" ? "A4" : fmt === "a4-landscape" ? "Paisagem" : "Story"}
 </span>
 </button>
 ))}
 </div>

 {/* Seletor de Template Visual */}
 <div className="flex items-center gap-1 bg-muted/40 p-1 rounded-lg border border-border/50">
 {[
  { id: "editorial-flat", label: "Clean Apple", icon: LayoutTemplate },
  { id: "dark-premium", label: "Dark Luxo", icon: Moon },
  { id: "executivo-b2b", label: "Executivo", icon: Briefcase },
  { id: "landscape-presentation", label: "Paisagem", icon: Monitor },
  { id: "vertical-premium", label: "Vertical", icon: FileText },
  { id: "group-catalog", label: "Catálogo", icon: Tag },
  ].map((tpl) => {
    const TplIcon = tpl.icon;
    return (
      <button
        key={tpl.id}
        type="button"
        onClick={() => handleChange({ template: tpl.id } as any)}
        className={cn(
          "min-h-11 px-2 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          currentTemplate === tpl.id
            ? "bg-background text-foreground"
            : "text-muted-foreground hover:text-foreground"
        )}
        title={`Template ${tpl.label}`}
      >
        <TplIcon className="size-3.5" />
        <span className="hidden waesy-expanded-flex">{tpl.label}</span>
      </button>
    );
  })}
 </div>

 {/* Controles de Zoom */}
 <div className="hidden waesy-expanded-flex items-center gap-1 bg-muted/40 p-1 rounded-lg border border-border/50">
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
 onClick={handleGenerateContract}
 className="rounded-lg text-xs font-bold gap-2 h-11 px-3 cursor-pointer"
 title="Emitir Contrato Oficial"
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
 </div>
 </div>
 );
}
