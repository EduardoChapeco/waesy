import { createFileRoute } from "@tanstack/react-router";
import { useState, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Download,
  Share2,
  Smartphone,
  Square,
  Eye,
  RefreshCw,
  Plane,
  ShoppingBag,
  MessageSquareQuote,
  Check,
  Package,
  Layers,
  Presentation,
  ChevronLeft,
  ChevronRight,
  FileText,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/commerce/page-header";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { listAdminProducts } from "@/services/admin-catalog.functions";
import { getStoreSettings } from "@/services/store.functions";
import { formatMoney } from "@/lib/money";
import { exportElementAsImage, exportElementAsPdf } from "@/lib/pdf-export";

export const Route = createFileRoute("/workspace/marketing/studio")({
  head: () => ({
    meta: [{ title: "Studio | Workspace Waesy" }],
  }),
  component: WorkspaceSocialStudioPage,
});

type TemplateType = "product" | "travel" | "quote" | "carousel" | "presentation";
type AspectRatio = "9:16" | "1:1" | "16:9";

interface CarouselSlide {
  tag: string;
  headline: string;
  subheadline: string;
  highlightText?: string;
}

const DEFAULT_CAROUSEL_SLIDES: CarouselSlide[] = [
  {
    tag: "Novidade",
    headline: "Coleção Autoral",
    subheadline: "Design exclusivo com acabamento de alta qualidade.",
    highlightText: "Disponível na Loja",
  },
  {
    tag: "Diferencial",
    headline: "Feito para Durar",
    subheadline: "Materiais nobres selecionados para máxima durabilidade e conforto.",
  },
  {
    tag: "Especificações",
    headline: "Pronta Entrega",
    subheadline: "Despacho imediato com garantia oficial e nota fiscal.",
  },
  {
    tag: "Condições",
    headline: "Parcelamento Facilitado",
    subheadline: "Em até 12x no cartão com condições especiais para pagamento via Pix.",
    highlightText: "Consulte Parcelas",
  },
  {
    tag: "Peça Agora",
    headline: "Garanta o Seu",
    subheadline: "Acesse nossa vitrine ou entre em contato pelo WhatsApp para atendimento personalizado.",
    highlightText: "Link na Bio",
  },
];

export default function WorkspaceSocialStudioPage() {
  const [template, setTemplate] = useState<TemplateType>("product");
  const [ratio, setRatio] = useState<AspectRatio>("9:16");

  // Dados da Loja e Catálogo Real
  const { data: store } = useQuery({
    queryKey: ["store-settings"],
    queryFn: () => getStoreSettings(),
  });

  const { data: products = [] } = useQuery({
    queryKey: ["admin-products-studio"],
    queryFn: () => listAdminProducts(),
  });

  // Campos do formulário
  const [title, setTitle] = useState("Coleção Autoral");
  const [subtitle, setSubtitle] = useState("Peças exclusivas com pronta entrega");
  const [price, setPrice] = useState("R$ 189,90");
  const [installments, setInstallments] = useState("3x sem juros de R$ 63,30");
  const [badgeText, setBadgeText] = useState("Destaque • Pronta Entrega");
  const [imageUrl, setImageUrl] = useState("https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=1080&q=80");
  const [isExporting, setIsExporting] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [copied, setCopied] = useState(false);

  // Estado do Carrossel Multilâminas (FASE 3 - V128)
  const [activeSlideIndex, setActiveSlideIndex] = useState(0);
  const [carouselSlides, setCarouselSlides] = useState<CarouselSlide[]>(DEFAULT_CAROUSEL_SLIDES);

  const authorName = store?.name || "Minha Loja";
  const authorHandle = `@${store?.slug || "loja"}`;

  const previewRef = useRef<HTMLDivElement>(null);

  // Preencher com produto real do catálogo (popula post único, carrossel e apresentação)
  const handleSelectProduct = (productId: string) => {
    const prod: any = products.find((p: any) => p.id === productId);
    if (!prod) return;

    const formattedPrice = formatMoney(prod.price_cents || 0);
    const maxInstallments = prod.attributes?.max_installments || 3;
    const installmentCents = Math.round((prod.price_cents || 0) / maxInstallments);
    const formattedInstallments = `${maxInstallments}x sem juros de ${formatMoney(installmentCents)}`;
    const img = prod.images?.[0] || prod.image_url || imageUrl;

    setTitle(prod.title || "Produto");
    setSubtitle(prod.description?.slice(0, 80) || prod.category?.name || "Disponível na vitrine");
    setPrice(formattedPrice);
    setInstallments(formattedInstallments);
    setBadgeText(prod.stock_on_hand > 0 ? "Pronta Entrega" : "Edição Limitada");
    if (img) setImageUrl(img);

    // Preenche as 5 lâminas do Carrossel automaticamente
    setCarouselSlides([
      {
        tag: "Novidade",
        headline: prod.title,
        subheadline: prod.category?.name || "Disponível na vitrine oficial",
        highlightText: formattedPrice,
      },
      {
        tag: "Destaque",
        headline: "Diferenciais Exclusivos",
        subheadline: prod.description?.slice(0, 120) || "Desenvolvido com rigor e padrão de qualidade premium.",
      },
      {
        tag: "Especificações",
        headline: "Pronta Entrega",
        subheadline: prod.stock_on_hand > 0 ? `${prod.stock_on_hand} unidades em estoque com despacho imediato.` : "Disponível para encomenda com frete rápido.",
        highlightText: "Garantia Oficial",
      },
      {
        tag: "Condições",
        headline: formattedPrice,
        subheadline: formattedInstallments,
        highlightText: "Parcele em até 12x",
      },
      {
        tag: "Como Comprar",
        headline: "Peça pelo WhatsApp",
        subheadline: `Acesse ${authorHandle} ou compre direto na vitrine oficial da loja.`,
        highlightText: "Link na Bio",
      },
    ]);

    toast.success(`Dados de "${prod.title}" carregados com sucesso!`);
  };

  const handleUpdateCurrentSlide = (key: keyof CarouselSlide, val: string) => {
    setCarouselSlides((prev) => {
      const copy = [...prev];
      copy[activeSlideIndex] = { ...copy[activeSlideIndex], [key]: val };
      return copy;
    });
  };

  const handleShare = async () => {
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title,
          text: `${title} - ${subtitle} por ${price} (${installments}). Confira na nossa vitrine:`,
          url: typeof window !== "undefined" ? window.location.origin : "",
        });
        toast.success("Conteúdo compartilhado com sucesso!");
      } catch {
        // Usuário cancelou
      }
    } else {
      navigator.clipboard.writeText(`${title} - ${subtitle} por ${price} (${installments})`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.success("Texto copiado para a área de transferência!");
    }
  };

  const handleDownload = async () => {
    setIsExporting(true);
    try {
      const suffix = template === "carousel" ? `-slide-${activeSlideIndex + 1}` : "";
      await exportElementAsImage("social-card-render-target", `card-${template}${suffix}-${Date.now()}.png`);
      toast.success("Imagem em alta resolução (PNG) baixada com sucesso!");
    } catch (err: any) {
      toast.error(err.message || "Falha ao gerar arquivo de imagem.");
    } finally {
      setIsExporting(false);
    }
  };

  const handleDownloadPdf = async () => {
    setIsExportingPdf(true);
    try {
      await exportElementAsPdf(
        "social-card-render-target",
        `apresentacao-${Date.now()}.pdf`,
        ratio === "16:9" ? "l" : "p"
      );
      toast.success("Documento comercial em PDF baixado com sucesso!");
    } catch (err: any) {
      toast.error(err.message || "Falha ao exportar PDF.");
    } finally {
      setIsExportingPdf(false);
    }
  };

  const activeSlide = carouselSlides[activeSlideIndex] || carouselSlides[0];

  return (
    <div className="space-y-6 pb-20 max-w-7xl mx-auto px-0 sm:px-4 md:px-0">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <PageHeader eyebrow="Marketing" title="Studio" />

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            className="h-11 rounded-lg text-xs font-semibold cursor-pointer"
            onClick={handleShare}
          >
            {copied ? <Check className="size-4 mr-2 text-emerald-600" /> : <Share2 className="size-4 mr-2" />}
            {copied ? "Copiado!" : "Compartilhar"}
          </Button>

          {(template === "presentation" || template === "carousel") && (
            <Button
              variant="outline"
              onClick={handleDownloadPdf}
              disabled={isExportingPdf}
              className="h-11 rounded-lg text-xs font-bold gap-2 cursor-pointer"
            >
              {isExportingPdf ? (
                <RefreshCw className="size-4 animate-spin text-primary" />
              ) : (
                <FileText className="size-4 text-primary" />
              )}
              <span>{isExportingPdf ? "Gerando..." : "Baixar PDF"}</span>
            </Button>
          )}

          <Button
            onClick={handleDownload}
            disabled={isExporting}
            className="h-11 rounded-lg text-xs font-bold bg-primary text-primary-foreground cursor-pointer shadow-sm"
          >
            {isExporting ? (
              <RefreshCw className="size-4 mr-2 animate-spin" />
            ) : (
              <Download className="size-4 mr-2" />
            )}
            {isExporting ? "Renderizando..." : "Baixar PNG"}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Painel de Controles */}
        <div className="lg:col-span-6 space-y-6">
          {/* Seletor de Produto Real do Catálogo */}
          {products.length > 0 && (
            <div className="p-5 rounded-lg bg-card border border-border/80 space-y-2">
              <Label className="text-xs font-bold text-foreground flex items-center gap-2">
                <Package className="size-4 text-primary" /> Carregar Produto do Catálogo
              </Label>
              <select
                onChange={(e) => handleSelectProduct(e.target.value)}
                defaultValue=""
                className="w-full h-11 px-3 rounded-lg border border-border bg-background text-xs text-foreground cursor-pointer"
              >
                <option value="" disabled>Selecione um produto cadastrado...</option>
                {products.map((p: any) => (
                  <option key={p.id} value={p.id}>
                    {p.title} — {formatMoney(p.price_cents || 0)}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Formato & Template */}
          <div className="p-5 rounded-lg bg-card border border-border/80 space-y-4">
            <Label className="text-xs font-bold text-foreground">
              Formato e Peça Gráfica
            </Label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => setTemplate("product")}
                className={cn(
                  "p-3 rounded-lg border text-left transition-all cursor-pointer flex flex-col gap-2",
                  template === "product"
                    ? "border-primary bg-primary/5 text-primary font-bold shadow-xs"
                    : "border-border hover:bg-muted/30 text-foreground"
                )}
              >
                <ShoppingBag className="size-4" />
                <span className="text-xs">Post de Produto</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setTemplate("carousel");
                  setRatio("1:1");
                }}
                className={cn(
                  "p-3 rounded-lg border text-left transition-all cursor-pointer flex flex-col gap-2",
                  template === "carousel"
                    ? "border-primary bg-primary/5 text-primary font-bold shadow-xs"
                    : "border-border hover:bg-muted/30 text-foreground"
                )}
              >
                <Layers className="size-4 text-amber-500" />
                <span className="text-xs">Carrossel (5 Lâminas)</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setTemplate("presentation");
                  setRatio("16:9");
                }}
                className={cn(
                  "p-3 rounded-lg border text-left transition-all cursor-pointer flex flex-col gap-2",
                  template === "presentation"
                    ? "border-primary bg-primary/5 text-primary font-bold shadow-xs"
                    : "border-border hover:bg-muted/30 text-foreground"
                )}
              >
                <Presentation className="size-4 text-blue-500" />
                <span className="text-xs">Apresentação B2B</span>
              </button>

              <button
                type="button"
                onClick={() => setTemplate("travel")}
                className={cn(
                  "p-3 rounded-lg border text-left transition-all cursor-pointer flex flex-col gap-2",
                  template === "travel"
                    ? "border-primary bg-primary/5 text-primary font-bold shadow-xs"
                    : "border-border hover:bg-muted/30 text-foreground"
                )}
              >
                <Plane className="size-4" />
                <span className="text-xs">Roteiro & Viagem</span>
              </button>

              <button
                type="button"
                onClick={() => setTemplate("quote")}
                className={cn(
                  "p-3 rounded-lg border text-left transition-all cursor-pointer flex flex-col gap-2",
                  template === "quote"
                    ? "border-primary bg-primary/5 text-primary font-bold shadow-xs"
                    : "border-border hover:bg-muted/30 text-foreground"
                )}
              >
                <MessageSquareQuote className="size-4" />
                <span className="text-xs">Depoimento</span>
              </button>
            </div>

            {/* Proporção */}
            <div className="pt-2 flex items-center gap-3">
              <span className="text-xs text-muted-foreground font-medium">Proporção:</span>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={ratio === "9:16" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setRatio("9:16")}
                  className="h-9 rounded-lg text-xs cursor-pointer"
                >
                  <Smartphone className="size-3.5 mr-1" /> 9:16 (Stories)
                </Button>
                <Button
                  type="button"
                  variant={ratio === "1:1" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setRatio("1:1")}
                  className="h-9 rounded-lg text-xs cursor-pointer"
                >
                  <Square className="size-3.5 mr-1" /> 1:1 (Feed)
                </Button>
                <Button
                  type="button"
                  variant={ratio === "16:9" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setRatio("16:9")}
                  className="h-9 rounded-lg text-xs cursor-pointer"
                >
                  <Presentation className="size-3.5 mr-1" /> 16:9 (Paisagem)
                </Button>
              </div>
            </div>
          </div>

          {/* Navegador de Slides do Carrossel (Se template === carousel) */}
          {template === "carousel" && (
            <div className="p-5 rounded-lg bg-card border border-border/80 space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold text-foreground flex items-center gap-2">
                  <Layers className="size-4 text-primary" /> Lâmina Ativa ({activeSlideIndex + 1} de {carouselSlides.length})
                </Label>
                <div className="flex items-center gap-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    disabled={activeSlideIndex === 0}
                    onClick={() => setActiveSlideIndex((prev) => Math.max(0, prev - 1))}
                    className="size-8 rounded-lg"
                  >
                    <ChevronLeft className="size-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    disabled={activeSlideIndex === carouselSlides.length - 1}
                    onClick={() => setActiveSlideIndex((prev) => Math.min(carouselSlides.length - 1, prev + 1))}
                    className="size-8 rounded-lg"
                  >
                    <ChevronRight className="size-4" />
                  </Button>
                </div>
              </div>

              {/* Botões de Seleção Direta de Lâmina */}
              <div className="grid grid-cols-5 gap-2">
                {carouselSlides.map((slide, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setActiveSlideIndex(idx)}
                    className={cn(
                      "py-2 px-1 rounded-lg text-center border text-xs font-semibold transition-all cursor-pointer",
                      activeSlideIndex === idx
                        ? "border-primary bg-primary text-primary-foreground shadow-xs"
                        : "border-border/80 bg-muted/40 text-muted-foreground hover:text-foreground"
                    )}
                  >
                    Slide {idx + 1}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Editor de Textos do Slide Ativo */}
          <div className="p-5 rounded-lg bg-card border border-border/80 space-y-4">
            <Label className="text-xs font-bold text-foreground">
              {template === "carousel" ? `Conteúdo do Slide ${activeSlideIndex + 1}` : "Textos do Card"}
            </Label>

            {template === "carousel" ? (
              <div className="space-y-3">
                <div className="space-y-1">
                  <Label className="text-xs font-medium">Tag / Selo do Slide</Label>
                  <Input
                    value={activeSlide.tag}
                    onChange={(e) => handleUpdateCurrentSlide("tag", e.target.value)}
                    className="h-11 rounded-lg text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-medium">Título do Slide</Label>
                  <Input
                    value={activeSlide.headline}
                    onChange={(e) => handleUpdateCurrentSlide("headline", e.target.value)}
                    className="h-11 rounded-lg text-xs font-semibold"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-medium">Descrição / Mensagem</Label>
                  <Input
                    value={activeSlide.subheadline}
                    onChange={(e) => handleUpdateCurrentSlide("subheadline", e.target.value)}
                    className="h-11 rounded-lg text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-medium">Destaque de Rodapé (Opcional)</Label>
                  <Input
                    value={activeSlide.highlightText || ""}
                    onChange={(e) => handleUpdateCurrentSlide("highlightText", e.target.value)}
                    placeholder="Ex: R$ 189,90 ou Link na Bio"
                    className="h-11 rounded-lg text-xs"
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="space-y-1">
                  <Label className="text-xs font-medium">Título Principal</Label>
                  <Input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="h-11 rounded-lg text-xs font-semibold"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-medium">Subtítulo / Mensagem</Label>
                  <Input
                    value={subtitle}
                    onChange={(e) => setSubtitle(e.target.value)}
                    className="h-11 rounded-lg text-xs"
                  />
                </div>

                {template !== "quote" && (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs font-medium">Preço</Label>
                      <Input
                        value={price}
                        onChange={(e) => setPrice(e.target.value)}
                        className="h-11 rounded-lg text-xs font-semibold"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs font-medium">Condição / Parcelas</Label>
                      <Input
                        value={installments}
                        onChange={(e) => setInstallments(e.target.value)}
                        className="h-11 rounded-lg text-xs"
                      />
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs font-medium">Selo Superior</Label>
                    <Input
                      value={badgeText}
                      onChange={(e) => setBadgeText(e.target.value)}
                      className="h-11 rounded-lg text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-medium">Identificador</Label>
                    <Input
                      value={authorHandle}
                      disabled
                      className="h-11 rounded-lg text-xs font-mono bg-muted/40"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-medium">URL da Imagem</Label>
                  <Input
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    className="h-11 rounded-lg text-xs font-mono"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Visualizador do Card / Slide em Tempo Real */}
        <div className="lg:col-span-6 flex flex-col items-center justify-center p-6 rounded-lg bg-neutral-900/90 border border-neutral-800 shadow-xs">
          <div className="w-full flex items-center justify-between text-neutral-400 text-xs mb-4 px-2">
            <span className="flex items-center gap-2 font-medium">
              <Eye className="size-3.5" /> Pré-visualização Real
            </span>
            <div className="flex items-center gap-2">
              {template === "carousel" && (
                <span className="font-semibold text-emerald-400 text-xs bg-emerald-500/10 px-2 py-1 rounded border border-emerald-500/20">
                  Slide {activeSlideIndex + 1}/5
                </span>
              )}
              <span className="font-mono text-xs bg-neutral-800 px-2 py-1 rounded text-neutral-300">
                {ratio === "9:16" ? "1080 x 1920" : ratio === "1:1" ? "1080 x 1080" : "1920 x 1080"}
              </span>
            </div>
          </div>

          {/* O Card Renderizado */}
          <div
            ref={previewRef}
            id="social-card-render-target"
            className={cn(
              "relative overflow-hidden rounded-lg shadow-xl transition-all select-none flex flex-col justify-between p-6 bg-neutral-950 text-white",
              ratio === "9:16"
                ? "w-[300px] sm:w-[340px] h-[533px] sm:h-[604px]"
                : ratio === "1:1"
                ? "w-[300px] sm:w-[380px] h-[300px] sm:h-[380px]"
                : "w-full max-w-[520px] aspect-video"
            )}
            style={{
              backgroundImage:
                template !== "quote"
                  ? `linear-gradient(to top, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.35) 50%, rgba(0,0,0,0.7) 100%), url(${imageUrl})`
                  : undefined,
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
          >
            {/* Topo */}
            <div className="flex items-center justify-between z-10">
              <div className="flex items-center gap-2">
                <div className="size-8 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center font-bold text-xs">
                  {authorName.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <p className="text-xs font-bold leading-none tracking-tight">{authorName}</p>
                  <p className="text-xs text-neutral-400 font-mono leading-tight">{authorHandle}</p>
                </div>
              </div>

              {(template === "carousel" ? activeSlide.tag : badgeText) && (
                <span className="px-3 py-1 rounded-full bg-white/15 backdrop-blur-md border border-white/20 text-xs font-semibold uppercase tracking-wider text-emerald-300">
                  {template === "carousel" ? activeSlide.tag : badgeText}
                </span>
              )}
            </div>

            {/* Conteúdo Central */}
            {template === "carousel" ? (
              <div className="my-auto py-4 space-y-3 z-10">
                <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-white leading-snug drop-shadow-sm">
                  {activeSlide.headline}
                </h3>
                <p className="text-xs sm:text-sm text-neutral-200 leading-relaxed drop-shadow-sm">
                  {activeSlide.subheadline}
                </p>
                {activeSlide.highlightText && (
                  <div className="pt-2">
                    <span className="inline-block px-3 py-1 rounded-lg bg-primary text-primary-foreground font-bold text-xs shadow-sm">
                      {activeSlide.highlightText}
                    </span>
                  </div>
                )}
              </div>
            ) : template === "presentation" ? (
              <div className="my-auto py-4 space-y-2 z-10">
                <span className="text-xs font-mono uppercase tracking-wider text-neutral-400">
                  Apresentação Comercial • {store?.name || "Catálogo"}
                </span>
                <h3 className="text-xl sm:text-2xl font-black tracking-tight text-white leading-tight">
                  {title}
                </h3>
                <p className="text-xs text-neutral-300 leading-relaxed max-w-md">
                  {subtitle}
                </p>
                {price && (
                  <div className="pt-2 flex items-baseline gap-2">
                    <span className="text-lg sm:text-xl font-bold text-emerald-400">{price}</span>
                    {installments && <span className="text-xs text-neutral-400">({installments})</span>}
                  </div>
                )}
              </div>
            ) : template === "quote" ? (
              <div className="my-auto py-6 space-y-4 z-10">
                <p className="text-base sm:text-lg font-serif italic leading-relaxed text-neutral-100">
                  "{title}"
                </p>
                <p className="text-xs text-neutral-400 font-sans tracking-wide">
                  — {subtitle}
                </p>
              </div>
            ) : (
              <div className="space-y-3 z-10 mt-auto">
                <div className="space-y-1">
                  <h3 className="text-lg sm:text-xl font-bold tracking-tight text-white drop-shadow-xs leading-snug">
                    {title}
                  </h3>
                  <p className="text-xs text-neutral-300 drop-shadow line-clamp-2">
                    {subtitle}
                  </p>
                </div>

                {price && (
                  <div className="pt-2 border-t border-white/15 flex items-baseline justify-between">
                    <div>
                      <span className="text-xs text-neutral-400 block font-sans">A partir de</span>
                      <span className="text-xl sm:text-2xl font-black text-emerald-400 tracking-tight">
                        {price}
                      </span>
                    </div>
                    {installments && (
                      <span className="text-xs text-neutral-300 font-medium">
                        {installments}
                      </span>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Rodapé com Indicador de Carrossel */}
            <div className="pt-3 border-t border-white/10 flex items-center justify-between text-xs text-neutral-400 z-10">
              <span>{store?.name || "Waesy Comércio Local"}</span>
              {template === "carousel" ? (
                <div className="flex items-center gap-2">
                  {carouselSlides.map((_, i) => (
                    <div
                      key={i}
                      className={cn(
                        "size-1.5 rounded-full transition-all",
                        activeSlideIndex === i ? "bg-white w-3" : "bg-white/30"
                      )}
                    />
                  ))}
                </div>
              ) : (
                <span className="font-semibold text-white">Consulte no Catálogo</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
