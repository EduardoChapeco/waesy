import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import {
 Megaphone,
 ArrowLeft,
 MapPin,
 DollarSign,
 TrendingUp,
 Loader2,
 CheckCircle2,
 Users,
 Image as ImageIcon,
 MessageCircle,
 ShoppingBag,
 ExternalLink,
 Target,
 Eye,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CurrencyField } from "@/components/ui/currency-field";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { MediaUploader } from "@/components/ui/media-uploader";
import {
 Select,
 SelectContent,
 SelectItem,
 SelectTrigger,
 SelectValue,
} from "@/components/ui/select";
import { createAdCampaign, getStoreAdTargets } from "@/services/ads.functions";
import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/workspace/marketing/anuncios/novo")({
 head: () => ({ meta: [{ title: "Criar Campanha de Anúncio | Waesy" }] }),
 loader: async () => {
 try {
 return await getStoreAdTargets();
 } catch {
 return { products: [], storePhone: null, storeSlug: "" };
 }
 },
 component: NovoAnuncioPage,
});

const AD_FORMATS = [
  {
    id: "post_patrocinado",
    title: "Post no Feed",
    desc: "Aparece intercalado no feed principal.",
    reachMultiplier: 1.0,
    aspect: 1,
    aspectLabel: "1:1",
  },
  {
    id: "banner_destaque",
    title: "Banner",
    desc: "Posição de topo com alta visibilidade.",
    reachMultiplier: 1.4,
    aspect: 21 / 9,
    aspectLabel: "21:9",
  },
  {
    id: "story_patrocinado",
    title: "Stories",
    desc: "Aparece na barra de stories com link direto.",
    reachMultiplier: 1.2,
    aspect: 9 / 16,
    aspectLabel: "9:16",
  },
  {
    id: "stories_sponsor",
    title: "Stories Imersivos",
    desc: "Formato imersivo com direcionamento direto.",
    reachMultiplier: 1.8,
    aspect: 9 / 16,
    aspectLabel: "9:16",
  },
  {
    id: "busca_topo",
    title: "Topo da Busca",
    desc: "Prioridade na pesquisa por termos relacionados.",
    reachMultiplier: 1.8,
    aspect: 1,
    aspectLabel: "1:1",
  },
] as const;

const AD_OBJECTIVES = [
  {
    id: "whatsapp_leads",
    title: "WhatsApp",
    desc: "Direciona clientes para atendimento direto no WhatsApp.",
    icon: MessageCircle,
  },
  {
    id: "direct_sales",
    title: "Vendas Diretas",
    desc: "Abre a página do produto com checkout direto.",
    icon: ShoppingBag,
  },
  {
    id: "brand_awareness",
    title: "Visitas na Vitrine",
    desc: "Gera tráfego direto para a vitrine e catálogo da loja.",
    icon: Target,
  },
] as const;

function NovoAnuncioPage() {
 const navigate = useNavigate();
 const { products, storePhone, storeSlug } = ((Route.useLoaderData?.() as any) || {});

 const [title, setTitle] = useState("");
 const [headline, setHeadline] = useState("");
 const [format, setFormat] = useState<any>("post_patrocinado");
 const [mediaUrls, setMediaUrls] = useState<string[]>([]);
 const [objective, setObjective] = useState<"whatsapp_leads" | "direct_sales" | "brand_awareness">("whatsapp_leads");
 const [destinationType, setDestinationType] = useState<"product" | "post" | "whatsapp" | "custom_url">("whatsapp");
 const [selectedProductId, setSelectedProductId] = useState<string>(products[0]?.id || "");
 const [customUrl, setCustomUrl] = useState("");
 const [location, setLocation] = useState("Toda a Região de Cobertura");
 const [radiusKm, setRadiusKm] = useState(15);
 const [dailyBudgetCents, setDailyBudgetCents] = useState<number | undefined>(2000);
 const [totalBudgetCents, setTotalBudgetCents] = useState<number | undefined>(10000);
 const [isSubmitting, setIsSubmitting] = useState(false);

 const selectedFormatConfig = AD_FORMATS.find((f) => f.id === format) || AD_FORMATS[0];
 const selectedProduct = products.find((p: any) => p.id === selectedProductId);

 // Estimativa de alcance baseada no orçamento diário
 const dailyNum = (dailyBudgetCents || 0) / 100;
 const multiplier = selectedFormatConfig.reachMultiplier || 1.0;
 const estimatedDailyReachMin = Math.round(dailyNum * 45 * multiplier);
 const estimatedDailyReachMax = Math.round(dailyNum * 95 * multiplier);
 const estimatedClicks = Math.round(dailyNum * 3.5 * multiplier);

 const handleSubmit = async (e: React.FormEvent) => {
 e.preventDefault();
 if (!title.trim()) {
 toast.error("Informe o título da campanha.");
 return;
 }

 const dailyCents = dailyBudgetCents || 0;
 const totalCents = totalBudgetCents || 0;

 if (dailyCents < 500) {
 toast.error("O orçamento diário mínimo é de R$ 5,00.");
 return;
 }
 if (totalCents < dailyCents) {
 toast.error("O orçamento total deve ser igual ou superior ao diário.");
 return;
 }

 setIsSubmitting(true);
 try {
 await createAdCampaign({
 data: {
 title,
 headline: headline.trim() || undefined,
 format,
 media_url: mediaUrls[0] || undefined,
 destination_type: objective === "whatsapp_leads" ? "whatsapp" : destinationType,
 destination_id: destinationType === "product" ? selectedProductId : undefined,
 destination_url: destinationType === "custom_url" ? customUrl : undefined,
 objective,
 target_location: location,
 target_radius_km: radiusKm,
 daily_budget_cents: dailyCents,
 total_budget_cents: totalCents,
 },
 });

 toast.success("Campanha criada e ativa para veiculação!");
 navigate({ to: "/workspace/marketing/anuncios" as any });
 } catch (e: unknown) {
 toast.error((e instanceof Error ? e.message : String(e)) || "Erro ao criar campanha.");
 } finally {
 setIsSubmitting(false);
 }
 };

 return (
 <div className="w-full max-w-7xl mx-auto px-0 sm:px-0 space-y-6 pb-20 animate-in fade-in duration-200">
 {/* Topbar Silenciosa */}
 <div className="flex items-center justify-between pb-4 border-b border-border/40">
 <div className="flex items-center gap-3">
 <Button asChild variant="ghost" size="icon" className="rounded-xl size-9">
 <Link to="/workspace/marketing/anuncios">
 <ArrowLeft className="size-4" />
 </Link>
 </Button>
 <div>
 <h1 className="text-xl font-bold text-foreground">Nova Campanha de Anúncio</h1>
 <p className="text-xs text-muted-foreground">
 Formato, criativo com aspect ratio travado, segmentação e destino
 </p>
 </div>
 </div>
 </div>

 <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-6">
 {/* Coluna Esquerda: Formulário de Configuração (7 colunas) */}
 <div className="lg:col-span-7 space-y-5">
 <div className="bg-card rounded-2xl p-5 space-y-4 border border-border/40">
 {/* Título e Headline */}
 <div className="space-y-3">
 <div className="space-y-1.5">
 <Label htmlFor="ad-title" className="text-xs font-semibold">
 Título Interno da Campanha <span className="text-destructive">*</span>
 </Label>
 <Input
 id="ad-title"
 value={title}
 onChange={(e) => setTitle(e.target.value)}
 placeholder="Ex: Campanha Almoço Executivo — Setembro"
 className="h-10 text-xs rounded-xl"
 required
 />
 </div>

 <div className="space-y-1.5">
 <Label htmlFor="ad-headline" className="text-xs font-semibold">
 Chamada Pública / Headline no Anúncio (Opcional)
 </Label>
 <Input
 id="ad-headline"
 value={headline}
 onChange={(e) => setHeadline(e.target.value)}
 placeholder="Ex: 20% OFF no Primeiro Pedido • Entrega Grátis"
 className="h-10 text-xs rounded-xl"
 />
 </div>
 </div>

 {/* Formato do Anúncio */}
 <div className="space-y-2 pt-2 border-t border-border/40">
 <div className="flex items-center justify-between">
 <Label className="text-xs font-semibold">Formato do Anúncio</Label>
 <Badge variant="outline" className="text-[10px] font-mono">
 Aspecto: {selectedFormatConfig.aspectLabel}
 </Badge>
 </div>
 <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
 {AD_FORMATS.map((f) => (
 <button
 key={f.id}
 type="button"
 onClick={() => setFormat(f.id)}
 className={cn(
 "p-3 rounded-xl border text-left flex items-start justify-between transition-all cursor-pointer",
 format === f.id
 ? "border-primary bg-primary/5 ring-1 ring-primary/30"
 : "border-border/60 bg-background hover:bg-muted/40",
 )}
 >
 <div>
 <p className="text-xs font-bold text-foreground">{f.title}</p>
 <p className="text-[11px] text-muted-foreground mt-0.5">{f.desc}</p>
 </div>
 {format === f.id && (
 <CheckCircle2 className="size-4 text-primary shrink-0 ml-2" />
 )}
 </button>
 ))}
 </div>
 </div>

 {/* Upload do Criativo com Cropper Travado */}
 <div className="space-y-2 pt-2 border-t border-border/40">
 <div className="flex items-center justify-between">
 <Label className="text-xs font-semibold flex items-center gap-1.5">
 <ImageIcon className="size-3.5 text-primary" />
 <span>Criativo / Imagem da Campanha</span>
 </Label>
 <span className="text-[10px] text-muted-foreground font-mono">
 Enquadramento travado em {selectedFormatConfig.aspectLabel}
 </span>
 </div>
 <MediaUploader
 value={mediaUrls}
 onChange={setMediaUrls}
 maxFiles={1}
 accept="image"
 aspect={selectedFormatConfig.aspect}
 lockAspect={true}
 bucket="banners"
 folder="anuncios"
 label={`Upload de Banner (${selectedFormatConfig.aspectLabel})`}
 />
 </div>

 {/* Objetivo da Campanha */}
 <div className="space-y-2 pt-2 border-t border-border/40">
 <Label className="text-xs font-semibold">Objetivo da Campanha</Label>
 <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
 {AD_OBJECTIVES.map((obj) => {
 const Icon = obj.icon;
 const isSel = objective === obj.id;
 return (
 <button
 key={obj.id}
 type="button"
 onClick={() => {
 setObjective(obj.id);
 if (obj.id === "whatsapp_leads") setDestinationType("whatsapp");
 if (obj.id === "direct_sales") setDestinationType("product");
 if (obj.id === "brand_awareness") setDestinationType("custom_url");
 }}
 className={cn(
 "p-3 rounded-xl border text-left flex flex-col justify-between gap-2 transition-all cursor-pointer",
 isSel
 ? "border-primary bg-primary/5 ring-1 ring-primary/30"
 : "border-border/60 bg-background hover:bg-muted/40",
 )}
 >
 <div className="flex items-center gap-2">
 <Icon className={cn("size-4", isSel ? "text-primary" : "text-muted-foreground")} />
 <span className="text-xs font-bold text-foreground">{obj.title}</span>
 </div>
 <p className="text-[10px] text-muted-foreground">{obj.desc}</p>
 </button>
 );
 })}
 </div>
 </div>

 {/* Destino do Clique */}
 {objective === "direct_sales" && (
 <div className="space-y-1.5 pt-2 border-t border-border/40">
 <Label className="text-xs font-semibold">Selecione o Produto de Destino</Label>
 {products.length > 0 ? (
 <Select value={selectedProductId} onValueChange={setSelectedProductId}>
 <SelectTrigger className="h-10 text-xs rounded-xl">
 <SelectValue placeholder="Selecione um produto cadastrado" />
 </SelectTrigger>
 <SelectContent>
 {products.map((p: any) => (
 <SelectItem key={p.id} value={p.id} className="text-xs">
 {p.title} • {formatMoney(p.price_cents || 0)}
 </SelectItem>
 ))}
 </SelectContent>
 </Select>
 ) : (
 <p className="text-xs text-muted-foreground">
 Nenhum produto publicado encontrado.{" "}
 <Link to="/workspace/catalogo/produtos/novo" className="text-primary font-bold hover:underline">
 Cadastre um produto primeiro.
 </Link>
 </p>
 )}
 </div>
 )}

 {objective === "brand_awareness" && (
 <div className="space-y-1.5 pt-2 border-t border-border/40">
 <Label htmlFor="ad-dest-url" className="text-xs font-semibold">
 URL de Destino (Opcional - Padrão é sua Vitrine)
 </Label>
 <Input
 id="ad-dest-url"
 value={customUrl}
 onChange={(e) => setCustomUrl(e.target.value)}
 placeholder={`https://usewaesy.com/loja/${storeSlug || "sua-loja"}`}
 className="h-10 text-xs rounded-xl"
 />
 </div>
 )}

 {/* Segmentação de Localização */}
 <div className="space-y-2 pt-2 border-t border-border/40">
 <Label
 htmlFor="ad-location"
 className="text-xs font-semibold flex items-center gap-1.5"
 >
 <MapPin className="size-3.5 text-primary" />
 Localização Alvo & Raio de Alcance
 </Label>
 <Input
 id="ad-location"
 value={location}
 onChange={(e) => setLocation(e.target.value)}
 placeholder="Ex: Cidade / Região ou Bairro"
 className="h-10 text-xs rounded-xl"
 required
 />
 <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
 <span>Raio geográfico de entrega / alcance:</span>
 <span className="font-bold text-foreground">{radiusKm} km</span>
 </div>
 <input
 type="range"
 min="1"
 max="50"
 value={radiusKm}
 onChange={(e) => setRadiusKm(parseInt(e.target.value))}
 className="w-full accent-primary"
 />
 </div>

 {/* Orçamentos */}
 <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-border/40">
 <div className="space-y-1.5">
 <Label htmlFor="ad-daily" className="text-xs font-semibold">
 Orçamento Diário (R$)
 </Label>
 <CurrencyField
 id="ad-daily"
 value={dailyBudgetCents}
 onChange={setDailyBudgetCents}
 placeholder="0,00"
 className="h-10 text-xs rounded-xl"
 required
 />
 </div>

 <div className="space-y-1.5">
 <Label htmlFor="ad-total" className="text-xs font-semibold">
 Orçamento Limite Total (R$)
 </Label>
 <CurrencyField
 id="ad-total"
 value={totalBudgetCents}
 onChange={setTotalBudgetCents}
 placeholder="0,00"
 className="h-10 text-xs rounded-xl"
 required
 />
 </div>
 </div>
 </div>

 <Button
 type="submit"
 disabled={isSubmitting}
 className="w-full h-12 rounded-xl text-sm font-bold bg-primary text-primary-foreground gap-2 cursor-pointer"
 >
 {isSubmitting ? (
 <>
 <Loader2 className="size-4 animate-spin" />
 <span>Ativando Campanha...</span>
 </>
 ) : (
 <>
 <Megaphone className="size-4" />
 <span>Lançar Campanha de Anúncio</span>
 </>
 )}
 </Button>
 </div>

 {/* Coluna Direita: Truthful Mockup Preview & Projeções (5 colunas) */}
 <div className="lg:col-span-5 space-y-4">
 {/* Card de Projeções de Impacto */}
 <div className="bg-card rounded-2xl p-5 space-y-4 border border-border/40">
 <div className="flex items-center gap-2">
 <TrendingUp className="size-4 text-emerald-500" />
 <h3 className="text-xs font-bold text-foreground">Estimativa de Performance</h3>
 </div>

 <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
 <div className="p-3 rounded-xl bg-muted/40 space-y-0.5">
 <span className="text-[10px] text-muted-foreground uppercase font-bold">
 Alcance Diário
 </span>
 <p className="text-sm font-black text-foreground">
 {estimatedDailyReachMin.toLocaleString("pt-BR")} –{" "}
 {estimatedDailyReachMax.toLocaleString("pt-BR")}
 </p>
 <p className="text-[10px] text-muted-foreground">pessoas/dia</p>
 </div>

 <div className="p-3 rounded-xl bg-muted/40 space-y-0.5">
 <span className="text-[10px] text-muted-foreground uppercase font-bold">
 Cliques Estimados
 </span>
 <p className="text-sm font-black text-foreground">
 ~{estimatedClicks.toLocaleString("pt-BR")}
 </p>
 <p className="text-[10px] text-muted-foreground">cliques/dia</p>
 </div>
 </div>
 </div>

 {/* Truthful Preview Card */}
 <div className="bg-card rounded-2xl overflow-hidden border border-border/40 space-y-3 p-4">
 <div className="flex items-center justify-between pb-2 border-b border-border/40">
 <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
 <Eye className="size-3.5 text-primary" />
 Prévia da Vitrine
 </span>
 <Badge variant="secondary" className="text-[10px] font-mono">
 {selectedFormatConfig.title}
 </Badge>
 </div>

 {/* Renderização Fiel do Criativo */}
 <div className="rounded-xl overflow-hidden bg-muted/30 border border-border/40 relative">
 {mediaUrls[0] ? (
 <div
 className="w-full relative overflow-hidden bg-black/5 flex items-center justify-center"
 style={{
 aspectRatio: `${selectedFormatConfig.aspect}`,
 maxHeight: format === "banner_destaque" ? "180px" : "280px",
 }}
 >
 <img
 src={mediaUrls[0]}
 alt={title || "Prévia"}
 className="size-full object-cover"
 />
 <div className="absolute top-2 left-2">
 <Badge className="bg-foreground/80 text-background text-[9px] font-bold">
 Patrocinado
 </Badge>
 </div>
 </div>
 ) : (
 <div
 className="w-full flex flex-col items-center justify-center p-8 text-center text-muted-foreground gap-2"
 style={{
 aspectRatio: `${selectedFormatConfig.aspect}`,
 maxHeight: "220px",
 }}
 >
 <ImageIcon className="size-8 stroke-1 opacity-40" />
 <span className="text-xs">Nenhum criativo enviado ainda</span>
 </div>
 )}
 </div>

 {/* Informações do Anúncio */}
 <div className="space-y-1 pt-1">
 <p className="text-xs font-bold text-foreground line-clamp-1">
 {headline || title || "Título da sua chamada"}
 </p>
 <p className="text-[11px] text-muted-foreground flex items-center gap-1">
 <MapPin className="size-3" />
 <span>{location}</span> • <span>Raio de {radiusKm}km</span>
 </p>
 </div>

 {/* Ação de Conversão */}
 <div className="pt-2">
 <Button
 type="button"
 variant="outline"
 size="sm"
 className="w-full rounded-xl text-xs font-bold gap-1.5 h-9"
 >
 {objective === "whatsapp_leads" && (
 <>
 <MessageCircle className="size-3.5 text-emerald-500" />
 <span>Conversar no WhatsApp</span>
 </>
 )}
 {objective === "direct_sales" && (
 <>
 <ShoppingBag className="size-3.5 text-primary" />
 <span>Comprar {selectedProduct ? `• ${formatMoney(selectedProduct.price_cents || 0)}` : ""}</span>
 </>
 )}
 {objective === "brand_awareness" && (
 <>
 <ExternalLink className="size-3.5" />
 <span>Visitar Vitrine</span>
 </>
 )}
 </Button>
 </div>
 </div>
 </div>
 </form>
 </div>
 );
}
