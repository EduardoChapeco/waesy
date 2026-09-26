import { ProposalShareWhatsappModal } from "@/components/tourism/studio/proposal-share-whatsapp-modal";
import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useState, useCallback } from "react";
import { useMutation } from "@tanstack/react-query";
import {
 ArrowLeft,
 Download,
 Image as ImageIcon,
 Send,
 Check,
 Loader2,
 Copy,
 FileCheck2,
 Compass,
 Maximize2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { NativeBackButton } from "@/components/ui/native-back-button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
 getTravelProposalById,
 updateTravelProposal,
 type TravelProposalDTO,
 type ProposalCanvasFormat,
} from "@/services/travel-proposal.functions";
import { createContractFromProposal } from "@/services/travel-contract.functions";
import { convertProposalToTrip } from "@/services/travel-lifecycle.functions";
import { StudioFrame, CANVAS_DIMENSIONS } from "@/components/tourism/studio/studio-frame";
import { ProposalCanvasRenderer } from "@/components/tourism/studio/proposal-canvas-renderer";
import { StudioSidebarEditor } from "@/components/tourism/studio/studio-sidebar-editor";
import { exportElementAsPdf, exportElementAsImage } from "@/lib/pdf-export";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/workspace/turismo/propostas/$id")({
  head: () => ({ meta: [{ title: "Studio de Propostas & Lâminas | Workspace Waesy" }] }),
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

 // Zoom controls state
 const [zoomScale, setZoomScale] = useState<number | null>(null);
 const [autoFitScale, setAutoFitScale] = useState<number>(0.85);

 const saveMutation = useMutation({
 mutationFn: (patch: Partial<TravelProposalDTO>) =>
 updateTravelProposal({
 data: {
 id: proposal!.id,
 patch,
 },
 }),
 onMutate: () => setIsSaving(true),
 onSettled: () => setIsSaving(false),
 onError: (err: any) => toast.error(err?.message || "Erro ao salvar alterações"),
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
 <div className="h-screen w-screen flex flex-col items-center justify-center bg-background space-y-4">
 <h2 className="text-sm font-bold text-foreground">Proposta não encontrada</h2>
 <Button asChild size="sm" variant="outline" className="rounded-xl">
 <Link to="/workspace/turismo/cotacoes">Voltar para Cotações</Link>
 </Button>
 </div>
 );
 }

 const publicUrl = `${typeof window !== "undefined" ? window.location.origin : ""}/proposta/${proposal.public_token}`;

 const handleCopyLink = () => {
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
 <div className="flex h-screen w-screen flex-col overflow-hidden bg-background select-none font-sans">
 {/* ── 1. BARRA SUPERIOR CANÔNICA (Studio Toolbar Fixo 56px) ── */}
 <header className="h-14 px-4 border-b border-border/80 flex items-center justify-between shrink-0 bg-card z-30 shadow-2xs">
 {/* Esquerda: Voltar + Identificação da Proposta + Status */}
 <div className="flex items-center gap-3">
 <NativeBackButton fallbackHref="/workspace/turismo/cotacoes" />

 <div className="h-4 w-px bg-border/80" />

 <div className="space-y-0.5">
 <div className="flex items-center gap-2">
 <h1 className="text-xs font-bold text-foreground truncate max-w-xs sm:max-w-sm">
 {proposal.title}
 </h1>
 <Badge variant="outline" className="text-[9px] font-mono uppercase font-bold py-0.5 px-2">
 {proposal.status}
 </Badge>
 {isSaving ? (
 <span className="flex items-center gap-1 text-[10px] text-muted-foreground font-mono">
 <Loader2 className="size-3 animate-spin text-primary" /> Salvando...
 </span>
 ) : (
 <span className="flex items-center gap-1 text-[10px] text-emerald-600 font-mono">
 <Check className="size-3" /> Salvo
 </span>
 )}
 </div>
 <p className="text-[10px] text-muted-foreground truncate max-w-xs">
 Cliente: <strong className="text-foreground">{proposal.client_name}</strong> · {proposal.destination_city}
 </p>
 </div>
 </div>

 {/* Centro: Formato + Template + Controles de Zoom */}
 <div className="flex items-center gap-2">
 {/* Seletor de Formato do Canvas */}
 <div className="flex items-center gap-0.5 bg-muted/40 p-0.5 rounded-xl border border-border/50">
 {(["a4-portrait", "a4-landscape", "story-916"] as ProposalCanvasFormat[]).map((fmt) => (
 <button
 key={fmt}
 type="button"
 onClick={() => handleChange({ canvas_format: fmt })}
 className={cn(
 "px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer",
 proposal.canvas_format === fmt
 ? "bg-background text-foreground shadow-2xs"
 : "text-muted-foreground hover:text-foreground"
 )}
 title={CANVAS_DIMENSIONS[fmt]?.label}
 >
 {CANVAS_DIMENSIONS[fmt]?.iconEmoji}{" "}
 <span className="hidden sm:inline">
 {fmt === "a4-portrait" ? "A4" : fmt === "a4-landscape" ? "Paisagem" : "Story"}
 </span>
 </button>
 ))}
 </div>

 {/* Seletor de Template Visual */}
 <div className="flex items-center gap-0.5 bg-muted/40 p-0.5 rounded-xl border border-border/50">
 {[
  { id: "editorial-flat", label: "Clean Apple", icon: "✨" },
  { id: "dark-premium", label: "Dark Luxo", icon: "🌙" },
  { id: "executivo-b2b", label: "Executivo", icon: "💼" },
  { id: "landscape-presentation", label: "Paisagem", icon: "🖥️" },
  { id: "vertical-premium", label: "Vertical", icon: "📜" },
  { id: "group-catalog", label: "Catálogo", icon: "🏷️" },
  ].map((tpl) => (
 <button
 key={tpl.id}
 type="button"
 onClick={() => handleChange({ template: tpl.id } as any)}
 className={cn(
 "px-2 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer",
 currentTemplate === tpl.id
 ? "bg-background text-foreground shadow-2xs"
 : "text-muted-foreground hover:text-foreground"
 )}
 title={`Template ${tpl.label}`}
 >
 <span>{tpl.icon}</span> <span className="hidden md:inline ml-1">{tpl.label}</span>
 </button>
 ))}
 </div>

 {/* Controles de Zoom */}
 <div className="hidden lg:flex items-center gap-1 bg-muted/40 p-0.5 rounded-xl border border-border/50">
 <button
 type="button"
 onClick={() => setZoomScale((prev) => Math.max(0.3, (prev !== null ? prev : autoFitScale) - 0.1))}
 className="size-7 rounded-lg text-xs font-bold text-muted-foreground hover:text-foreground flex items-center justify-center cursor-pointer"
 title="Diminuir Zoom (-)"
 >
 -
 </button>
 <button
 type="button"
 onClick={() => setZoomScale(null)}
 className="px-2 py-0.5 text-[10px] font-mono font-bold text-muted-foreground hover:text-foreground cursor-pointer"
 title="Ajustar à Tela (Fit)"
 >
 {displayZoom}%
 </button>
 <button
 type="button"
 onClick={() => setZoomScale((prev) => Math.min(1.4, (prev !== null ? prev : autoFitScale) + 0.1))}
 className="size-7 rounded-lg text-xs font-bold text-muted-foreground hover:text-foreground flex items-center justify-center cursor-pointer"
 title="Aumentar Zoom (+)"
 >
 +
 </button>
 </div>
 </div>

 {/* Direita: Ações de Exportação, Contrato, WhatsApp */}
 <div className="flex items-center gap-1.5">
 <Button
 type="button"
 size="sm"
 variant="outline"
 disabled={isExportingImage}
 onClick={handleExportImage}
 className="rounded-xl text-xs font-bold gap-1.5 h-8 px-2.5 cursor-pointer"
 title="Exportar Imagem PNG"
 >
 <ImageIcon className="size-3.5" />
 <span className="hidden md:inline">{isExportingImage ? "Exportando..." : "PNG"}</span>
 </Button>

 <Button
 type="button"
 size="sm"
 variant="outline"
 disabled={isExportingPdf}
 onClick={handleExportPdf}
 className="rounded-xl text-xs font-bold gap-1.5 h-8 px-2.5 cursor-pointer"
 title="Exportar Documento PDF"
 >
 <Download className="size-3.5" />
 <span className="hidden md:inline">{isExportingPdf ? "Gerando..." : "PDF"}</span>
 </Button>

 <Button
 type="button"
 size="sm"
 disabled={isConvertingTrip}
 onClick={handleConvertToTrip}
 className="rounded-xl text-xs font-bold gap-1.5 h-8 px-3 bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer shadow-2xs"
 >
 {isConvertingTrip ? <Loader2 className="size-3.5 animate-spin" /> : <Compass className="size-3.5" />}
 <span className="hidden lg:inline">Converter em Viagem</span>
 </Button>

 <Button
 type="button"
 size="sm"
 variant="outline"
 disabled={isCreatingContract}
 onClick={handleGenerateContract}
 className="rounded-xl text-xs font-bold gap-1.5 h-8 px-2.5 cursor-pointer"
 title="Emitir Contrato Oficial"
 >
 {isCreatingContract ? <Loader2 className="size-3.5 animate-spin" /> : <FileCheck2 className="size-3.5" />}
 <span className="hidden xl:inline">Contrato</span>
 </Button>

 <Button
 type="button"
 size="sm"
 onClick={handleCopyLink}
 className="rounded-xl text-xs font-bold gap-1.5 h-8 px-2.5 bg-foreground text-background hover:bg-foreground/90 cursor-pointer"
 title="Copiar link público da proposta"
 >
 <Copy className="size-3.5" />
 </Button>

 {cleanWhatsapp && (
 <Button
 type="button"
 size="sm"
 onClick={() => setWhatsappModalOpen(true)}
 className="rounded-xl text-xs font-bold gap-1.5 h-8 px-2.5 bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer"
 title="Enviar lâmina e proposta para o WhatsApp"
 >
 <Send className="size-3.5" />
 <span className="hidden sm:inline">WhatsApp</span>
 </Button>
 )}
 </div>
 </header>

 {/* ── 2. STUDIO WORKSPACE BODY (Editor 440px + Canvas Centralizado Flex-1) ── */}
 <div className="flex flex-1 min-h-0 overflow-hidden">
 {/* Editor Lateral TravelOS com Scroll Interno Limpo */}
 <aside className="w-[420px] lg:w-[460px] shrink-0 border-r border-border/80 bg-card flex flex-col h-full overflow-hidden shadow-2xs z-20">
 <StudioSidebarEditor proposal={proposal} onChange={handleChange} />
 </aside>

 {/* Truthful Preview Canvas Frame com Scroll Fluido */}
 <main className="flex-1 h-full overflow-hidden flex flex-col bg-muted/30 relative">
 <StudioFrame
 format={proposal.canvas_format}
 zoomScale={zoomScale}
 onAutoFitScaleCalculated={setAutoFitScale}
 >
 <ProposalCanvasRenderer proposal={proposal} />
 </StudioFrame>
 </main>
 </div>
 </div>
 );
}
