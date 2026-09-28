import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Truck, Bike, ShieldCheck, Zap, Users, BadgePercent, Image as ImageIcon, Smartphone, Tablet, Monitor, Loader2, Save, CheckCircle2, Layers, Info } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ImageUpload } from "@/components/ui/image-upload";
import { getLogisticsPresentationSettings, updateLogisticsPresentationSettings, type LogisticsPresentationSettings } from "@/services/master.functions";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin-master/logistica")({
 head: () => ({ meta: [{ title: "CMS Logística e MotoLink | Waesy Master" }] }),
 loader: async () => {
 try {
 const settings = await getLogisticsPresentationSettings();
 return { settings };
 } catch {
 return {
 settings: {
 title: "Logística Integrada e MotoLink",
 subtitle: "Conecte-se aos entregadores autônomos da sua cidade sem intermediários e com zero taxa de frete.",
 badge: "Zero Taxa de Intermediação",
 disclaimer: "O Waesy é uma infraestrutura tecnológica aberta. Não intermediamos pagamentos de fretes nem cobramos comissão entre entregadores e empresas. A relação comercial e operacional é direta e independente entre as partes.",
 image_desktop_url: null,
 image_tablet_url: null,
 image_mobile_url: null,
 motolink_name: "MotoLink",
 features: [
 {
 title: "Zero Comissão de Frete",
 desc: "Economize de 20% a 30% por entrega. O valor acordado vai 100% para o entregador, sem taxas da plataforma.",
 icon: "BadgePercent",
 },
 {
 title: "Ficha Completa e Segurança",
 desc: "Consulte foto, modelo da moto, placa, contato, selo de verificação e avaliações de outros lojistas da região.",
 icon: "ShieldCheck",
 },
 {
 title: "Frota de Confiança e Bloqueio",
 desc: "Favorite seus motoboys parceiros para chamadas prioritárias e bloqueie condutores com histórico inadequado.",
 icon: "Users",
 },
 {
 title: "MotoLink / Magic Link",
 desc: "Despacho em 1 clique com link inteligente de rastreio em tempo real enviado direto no WhatsApp com rota GPS.",
 icon: "Zap",
 },
 ],
 } as LogisticsPresentationSettings,
 };
 }
 },
 component: AdminMasterLogisticaPage,
});

function AdminMasterLogisticaPage() {
 const { settings: initialSettings } = ((Route.useLoaderData?.() as any) || {});
 const router = useRouter();

 const [title, setTitle] = useState(initialSettings.title || "Logística");
 const [subtitle, setSubtitle] = useState(initialSettings.subtitle || "");
 const [badge, setBadge] = useState(initialSettings.badge || "Zero Taxa de Intermediação");
 const [disclaimer, setDisclaimer] = useState(initialSettings.disclaimer || "");
 const [motolinkName, setMotolinkName] = useState(initialSettings.motolink_name || "MotoLink");

 const [imageDesktopUrl, setImageDesktopUrl] = useState<string | null>(
 initialSettings.image_desktop_url || null
 );
 const [imageTabletUrl, setImageTabletUrl] = useState<string | null>(
 initialSettings.image_tablet_url || null
 );
 const [imageMobileUrl, setImageMobileUrl] = useState<string | null>(
 initialSettings.image_mobile_url || null
 );

 const [previewMode, setPreviewMode] = useState<"desktop" | "tablet" | "mobile">("desktop");
 const [isSubmitting, setIsSubmitting] = useState(false);

 const handleSave = async () => {
 if (!title.trim() || !subtitle.trim()) {
 toast.error("Preencha título e subtítulo da apresentação.");
 return;
 }

 setIsSubmitting(true);
 try {
 await updateLogisticsPresentationSettings({
 data: {
 title,
 subtitle,
 badge,
 disclaimer,
 motolink_name: motolinkName,
 image_desktop_url: imageDesktopUrl,
 image_tablet_url: imageTabletUrl,
 image_mobile_url: imageMobileUrl,
 features: initialSettings.features,
 },
 });

 toast.success("Apresentação de Logística & MotoLink atualizada com sucesso!");
 router.invalidate();
 } catch (err: any) {
 toast.error(err.message || "Erro ao salvar configurações.");
 } finally {
 setIsSubmitting(false);
 }
 };

 return (
 <div className="space-y-6 max-w-6xl mx-auto pb-16 animate-in fade-in duration-200">
 {/* ── Topo & Ações ── */}
 <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card p-6 rounded-2xl border border-border/70">
 <div className="space-y-1">
 <div className="flex items-center gap-2">
 <div className="size-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold">
 <Truck className="size-4" />
 </div>
 <h1 className="text-xl font-bold tracking-tight text-foreground">
 CMS de Logística e MotoLink
 </h1>
 <Badge variant="outline" className="text-[10px] bg-muted/40 font-bold">
 Onboarding e Vitrine
 </Badge>
 </div>
 <p className="text-xs text-muted-foreground max-w-xl">
 Configure a apresentação de entrega democratizada, disclaimer de não-intermediação e as 3 imagens responsivas (Mobile, Tablet e Desktop).
 </p>
 </div>

 <Button
 onClick={handleSave}
 disabled={isSubmitting}
 className="rounded-xl text-xs font-bold h-10 px-6 gap-2 shrink-0"
 >
 {isSubmitting ? (
 <>
 <Loader2 className="size-3.5 animate-spin" />
 <span>Salvando...</span>
 </>
 ) : (
 <>
 <Save className="size-3.5" />
 <span>Salvar Alterações</span>
 </>
 )}
 </Button>
 </div>

 <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
 {/* ── Coluna da Esquerda: Formulário de Configuração (7 colunas) ── */}
 <div className="lg:col-span-7 space-y-6">
 {/* 1. Textos Principais */}
 <Card className="p-6 rounded-2xl border border-border/70 space-y-4 bg-card">
 <div className="space-y-0.5 pb-2 border-b border-border/60">
 <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
 <Layers className="size-4 text-primary" />
 <span>Textos da Apresentação</span>
 </h2>
 <p className="text-[11px] text-muted-foreground">
 Exibidos no passo de operação e logística durante o cadastro de novos negócios.
 </p>
 </div>

 <div className="space-y-3">
 <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
 <div className="sm:col-span-2 space-y-1.5">
 <Label className="text-xs font-bold text-foreground">Título Principal</Label>
 <Input
 value={title}
 onChange={(e) => setTitle(e.target.value)}
 className="h-10 rounded-xl text-xs bg-background font-medium"
 placeholder="Logística"
 />
 </div>

 <div className="space-y-1.5">
 <Label className="text-xs font-medium text-muted-foreground">Badge de Destaque</Label>
 <Input
 value={badge}
 onChange={(e) => setBadge(e.target.value)}
 className="h-10 rounded-xl text-xs bg-background font-medium"
 placeholder="Zero Taxa"
 />
 </div>
 </div>

 <div className="space-y-1.5">
 <Label className="text-xs font-bold text-foreground">Subtítulo Explicativo</Label>
 <Input
 value={subtitle}
 onChange={(e) => setSubtitle(e.target.value)}
 className="h-10 rounded-xl text-xs bg-background"
 placeholder="Conecte-se aos motoboys da cidade sem intermediários..."
 />
 </div>

 <div className="space-y-1.5">
 <Label className="text-xs font-medium text-muted-foreground">
 Nome da Solução de Despacho (Ex: MotoLink, Waesy Log)
 </Label>
 <Input
 value={motolinkName}
 onChange={(e) => setMotolinkName(e.target.value)}
 className="h-10 rounded-xl text-xs bg-background font-bold"
 placeholder="MotoLink"
 />
 </div>
 </div>
 </Card>

 {/* 2. Manifesto & Disclaimer Legal de Não-Intermediação */}
 <Card className="p-6 rounded-2xl border border-border/70 space-y-4 bg-card">
 <div className="space-y-0.5 pb-2 border-b border-border/60">
 <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
 <ShieldCheck className="size-4 text-primary" />
 <span>Disclaimer Legal e Não-Intermediação</span>
 </h2>
 <p className="text-[11px] text-muted-foreground">
 Deixa claro para o empreendedor e para os entregadores a proposta de valor sem comissões da plataforma.
 </p>
 </div>

 <div className="space-y-1.5">
 <Label className="text-xs font-medium text-muted-foreground">
 Termo de Esclarecimento de Não-Intermediação
 </Label>
 <textarea
 value={disclaimer}
 onChange={(e) => setDisclaimer(e.target.value)}
 rows={3}
 className="w-full rounded-2xl border border-border bg-background p-3 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary leading-relaxed resize-none"
 placeholder="A Waesy não cobra comissões sobre entregas..."
 />
 </div>
 </Card>

 {/* 3. Upload de 3 Imagens Responsivas (Mobile, Tablet, Desktop) */}
 <Card className="p-6 rounded-2xl border border-border/70 space-y-4 bg-card">
 <div className="space-y-0.5 pb-2 border-b border-border/60">
 <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
 <ImageIcon className="size-4 text-primary" />
 <span>Imagens Ilustrativas em 3 Resoluções</span>
 </h2>
 <p className="text-[11px] text-muted-foreground">
 Carregue imagens com enquadramento perfeito para visualização em computadores, tablets e smartphones.
 </p>
 </div>

 <div className="space-y-5">
 {/* Desktop (Panorâmica 21:9 / 16:9) */}
 <div className="space-y-2">
 <div className="flex items-center justify-between">
 <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
 <Monitor className="size-3.5 text-primary" />
 <span>Imagem Desktop (Panorâmica 21:9)</span>
 </Label>
 <span className="text-[10px] text-muted-foreground">Computadores e Telas Largas</span>
 </div>
 <ImageUpload
 value={imageDesktopUrl || ""}
 onChange={(url) => setImageDesktopUrl(url)}
 onRemove={() => setImageDesktopUrl(null)}
 bucket="cms-media"
 aspectPreset="banner"
 helperText="Proporção panorâmica (21:9). Otimizado para telas desktop."
 />
 </div>

 {/* Tablet (4:3 / 16:10) */}
 <div className="space-y-2">
 <div className="flex items-center justify-between">
 <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
 <Tablet className="size-3.5 text-primary" />
 <span>Imagem Tablet (Médio 4:3)</span>
 </Label>
 <span className="text-[10px] text-muted-foreground">iPads e Tablets</span>
 </div>
 <ImageUpload
 value={imageTabletUrl || ""}
 onChange={(url) => setImageTabletUrl(url)}
 onRemove={() => setImageTabletUrl(null)}
 bucket="cms-media"
 aspectPreset="square"
 className="w-40 h-32"
 helperText="Proporção intermediária (4:3 / 16:10)."
 />
 </div>

 {/* Mobile (1:1 / 9:16) */}
 <div className="space-y-2">
 <div className="flex items-center justify-between">
 <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
 <Smartphone className="size-3.5 text-primary" />
 <span>Imagem Mobile (Quadrado 1:1)</span>
 </Label>
 <span className="text-[10px] text-muted-foreground">Smartphones e Telas Estreitas</span>
 </div>
 <ImageUpload
 value={imageMobileUrl || ""}
 onChange={(url) => setImageMobileUrl(url)}
 onRemove={() => setImageMobileUrl(null)}
 bucket="cms-media"
 aspectPreset="square"
 className="w-28 h-28"
 helperText="Proporção compacta (1:1)."
 />
 </div>
 </div>
 </Card>
 </div>

 {/* ── Coluna da Direita: Truthful Live Preview Responsivo (5 colunas) ── */}
 <div className="lg:col-span-5 space-y-4">
 <Card className="p-5 rounded-2xl border border-border/70 bg-card space-y-4 sticky top-6">
 <div className="flex items-center justify-between pb-2 border-b border-border/60">
 <div className="flex items-center gap-2">
 <Info className="size-4 text-primary" />
 <h3 className="text-xs font-bold text-foreground">Prévia em Tempo Real</h3>
 </div>

 {/* Seletor de Breakpoints para Teste de Tela */}
 <div className="flex items-center gap-1 bg-muted/40 p-1 rounded-xl">
 <button
 type="button"
 onClick={() => setPreviewMode("desktop")}
 className={cn(
 "p-1.5 rounded-lg text-xs transition-all",
 previewMode === "desktop"
 ? "bg-foreground text-background font-bold"
 : "text-muted-foreground hover:text-foreground"
 )}
 title="Prévia Desktop"
 >
 <Monitor className="size-3.5" />
 </button>
 <button
 type="button"
 onClick={() => setPreviewMode("tablet")}
 className={cn(
 "p-1.5 rounded-lg text-xs transition-all",
 previewMode === "tablet"
 ? "bg-foreground text-background font-bold"
 : "text-muted-foreground hover:text-foreground"
 )}
 title="Prévia Tablet"
 >
 <Tablet className="size-3.5" />
 </button>
 <button
 type="button"
 onClick={() => setPreviewMode("mobile")}
 className={cn(
 "p-1.5 rounded-lg text-xs transition-all",
 previewMode === "mobile"
 ? "bg-foreground text-background font-bold"
 : "text-muted-foreground hover:text-foreground"
 )}
 title="Prévia Mobile"
 >
 <Smartphone className="size-3.5" />
 </button>
 </div>
 </div>

 {/* Mockup do Bloco de Logística */}
 <div
 className={cn(
 "rounded-2xl border border-border/80 overflow-hidden bg-background p-4 space-y-3 transition-all",
 previewMode === "mobile" && "max-w-[320px] mx-auto",
 previewMode === "tablet" && "max-w-[420px] mx-auto"
 )}
 >
 {/* Imagem Adaptativa da Prévia */}
 <div className="relative rounded-xl overflow-hidden bg-muted aspect-video border border-border/40">
 <img
 src={
 previewMode === "mobile"
 ? imageMobileUrl || imageDesktopUrl || initialSettings.image_mobile_url || ""
 : previewMode === "tablet"
 ? imageTabletUrl || imageDesktopUrl || initialSettings.image_tablet_url || ""
 : imageDesktopUrl || initialSettings.image_desktop_url || ""
 }
 alt="Ilustração de Entrega"
 className="size-full object-cover"
 />
 <div className="absolute top-2 left-2">
 <Badge className="bg-black/60 backdrop-blur-md text-white border-white/20 text-[9px] font-bold">
 {badge}
 </Badge>
 </div>
 </div>

 {/* Textos da Prévia */}
 <div className="space-y-1">
 <h4 className="text-xs font-bold text-foreground">{title}</h4>
 <p className="text-[11px] text-muted-foreground leading-relaxed">{subtitle}</p>
 </div>

 {/* Ficha Ilustrativa do Motoboy */}
 <div className="p-2.5 rounded-xl bg-muted/20 border border-border/60 space-y-2">
 <p className="text-[10px] font-bold text-foreground flex items-center gap-1">
 <Bike className="size-3 text-primary" />
 <span>Exemplo de Ficha de Motoboy Parceiro</span>
 </p>
 <div className="flex items-center gap-2 text-xs">
 <div className="size-7 rounded-lg bg-primary/15 text-primary flex items-center justify-center font-bold text-[10px]">
 ED
 </div>
 <div className="min-w-0 flex-1">
 <p className="font-bold text-[11px] truncate">Eduardo Silva</p>
 <p className="text-[9px] text-muted-foreground font-mono">Honda CG 160 • ABC-1234</p>
 </div>
 <Badge variant="outline" className="text-[9px] font-bold bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
 ★ 4.9 (142 entregas)
 </Badge>
 </div>
 </div>

 {/* Disclaimer Legal */}
 <div className="p-2 rounded-lg bg-muted/40 text-[9px] text-muted-foreground leading-snug border border-border/40">
 <span className="font-bold text-foreground">Transparência: </span>
 {disclaimer}
 </div>
 </div>
 </Card>
 </div>
 </div>
 </div>
 );
}
