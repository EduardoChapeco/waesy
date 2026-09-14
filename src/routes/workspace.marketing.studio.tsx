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
  Package
} from "lucide-react";
import { 
  InstagramLogo, 
  TiktokLogo, 
  TwitterLogo, 
  WhatsappLogo, 
  FacebookLogo 
} from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/commerce/page-header";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { listAdminProducts } from "@/services/admin-catalog.functions";
import { getStoreSettings } from "@/services/store.functions";
import { formatMoney } from "@/lib/money";

export const Route = createFileRoute("/workspace/marketing/studio")({
  head: () => ({
    meta: [{ title: "Social Studio & Gerador de Peças | Workspace Waesy" }],
  }),
  component: WorkspaceSocialStudioPage,
});

type TemplateType = "travel" | "product" | "quote";
type AspectRatio = "9:16" | "1:1";

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
  const [copied, setCopied] = useState(false);

  const authorName = store?.name || "Minha Loja";
  const authorHandle = `@${store?.slug || "loja"}`;

  const previewRef = useRef<HTMLDivElement>(null);

  // Preencher com produto real do catálogo
  const handleSelectProduct = (productId: string) => {
    const prod = products.find((p: any) => p.id === productId);
    if (!prod) return;

    setTitle(prod.title || "Produto");
    setSubtitle(prod.description?.slice(0, 80) || prod.category?.name || "Disponível na loja");
    setPrice(formatMoney(prod.price_cents || 0));

    // Regra #22: Cálculo de parcelas reais
    const maxInstallments = prod.attributes?.max_installments || 3;
    const installmentCents = Math.round((prod.price_cents || 0) / maxInstallments);
    setInstallments(`${maxInstallments}x sem juros de ${formatMoney(installmentCents)}`);

    setBadgeText(prod.stock_on_hand > 0 ? "Pronta Entrega" : "Edição Limitada");

    const img = prod.images?.[0] || prod.image_url;
    if (img) setImageUrl(img);

    setTemplate("product");
    toast.success(`Dados de "${prod.title}" carregados no Studio!`);
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
      const { exportElementAsImage } = await import("@/lib/pdf-export");
      await exportElementAsImage("social-card-render-target", `card-${template}-${Date.now()}.png`);
      toast.success("Card em alta resolução (PNG) baixado com sucesso!");
    } catch (err: any) {
      toast.error(err.message || "Falha ao gerar arquivo de imagem.");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-6 pb-20 max-w-7xl mx-auto px-0 sm:px-4 md:px-0">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <PageHeader
          eyebrow="Marketing & Criação"
          title="Social Studio"
          description="Crie peças publicitárias em alta resolução para Redes Sociais, Stories e WhatsApp."
        />
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            className="h-11 rounded-xl text-xs font-semibold cursor-pointer"
            onClick={handleShare}
          >
            {copied ? <Check className="size-4 mr-1.5 text-emerald-600" /> : <Share2 className="size-4 mr-1.5" />}
            {copied ? "Copiado!" : "Compartilhar"}
          </Button>
          <Button
            onClick={handleDownload}
            disabled={isExporting}
            className="h-11 rounded-xl text-xs font-bold bg-primary text-primary-foreground cursor-pointer"
          >
            {isExporting ? (
              <RefreshCw className="size-4 mr-1.5 animate-spin" />
            ) : (
              <Download className="size-4 mr-1.5" />
            )}
            {isExporting ? "Renderizando..." : "Baixar Card HD"}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Painel de Controles */}
        <div className="lg:col-span-6 space-y-6">
          {/* Seletor de Produto Real do Catálogo */}
          {products.length > 0 && (
            <div className="p-5 rounded-2xl bg-card border border-border/80 space-y-2">
              <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <Package className="size-4 text-primary" /> Carregar Produto do Catálogo
              </Label>
              <select
                onChange={(e) => handleSelectProduct(e.target.value)}
                defaultValue=""
                className="w-full h-11 px-3 rounded-xl border border-border bg-background text-xs text-foreground cursor-pointer"
              >
                <option value="" disabled>Selecione um produto cadastrado na loja...</option>
                {products.map((p: any) => (
                  <option key={p.id} value={p.id}>
                    {p.title} — {formatMoney(p.price_cents || 0)}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Formato & Template */}
          <div className="p-5 rounded-2xl bg-card border border-border/80 space-y-4">
            <Label className="text-xs font-bold text-foreground">
              Formato & Template
            </Label>
            <div className="grid grid-cols-3 gap-2.5">
              <button
                type="button"
                onClick={() => setTemplate("product")}
                className={cn(
                  "p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col gap-1.5",
                  template === "product"
                    ? "border-primary bg-primary/5 text-primary font-bold"
                    : "border-border hover:bg-muted/30 text-foreground"
                )}
              >
                <ShoppingBag className="size-4" />
                <span className="text-xs">Produto & Oferta</span>
              </button>

              <button
                type="button"
                onClick={() => setTemplate("travel")}
                className={cn(
                  "p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col gap-1.5",
                  template === "travel"
                    ? "border-primary bg-primary/5 text-primary font-bold"
                    : "border-border hover:bg-muted/30 text-foreground"
                )}
              >
                <Plane className="size-4" />
                <span className="text-xs">Roteiro / Experiência</span>
              </button>

              <button
                type="button"
                onClick={() => setTemplate("quote")}
                className={cn(
                  "p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col gap-1.5",
                  template === "quote"
                    ? "border-primary bg-primary/5 text-primary font-bold"
                    : "border-border hover:bg-muted/30 text-foreground"
                )}
              >
                <MessageSquareQuote className="size-4" />
                <span className="text-xs">Frase & Depoimento</span>
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
                  <Smartphone className="size-3.5 mr-1" /> Stories (9:16)
                </Button>
                <Button
                  type="button"
                  variant={ratio === "1:1" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setRatio("1:1")}
                  className="h-9 rounded-lg text-xs cursor-pointer"
                >
                  <Square className="size-3.5 mr-1" /> Feed (1:1)
                </Button>
              </div>
            </div>
          </div>

          {/* Textos */}
          <div className="p-5 rounded-2xl bg-card border border-border/80 space-y-4">
            <Label className="text-xs font-bold text-foreground">
              Textos do Card
            </Label>

            <div className="space-y-3">
              <div className="space-y-1">
                <Label className="text-xs font-medium">Título Principal</Label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="h-11 rounded-xl text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-medium">Subtítulo / Descrição</Label>
                <Input
                  value={subtitle}
                  onChange={(e) => setSubtitle(e.target.value)}
                  className="h-11 rounded-xl text-xs"
                />
              </div>

              {template !== "quote" && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs font-medium">Preço</Label>
                    <Input
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      className="h-11 rounded-xl text-xs font-semibold"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-medium">Condição / Parcelas</Label>
                    <Input
                      value={installments}
                      onChange={(e) => setInstallments(e.target.value)}
                      className="h-11 rounded-xl text-xs"
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
                    className="h-11 rounded-xl text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-medium">Identificador</Label>
                  <Input
                    value={authorHandle}
                    disabled
                    className="h-11 rounded-xl text-xs font-mono bg-muted/40"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-medium">URL da Imagem</Label>
                <Input
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  className="h-11 rounded-xl text-xs font-mono"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Visualizador do Card em Tempo Real */}
        <div className="lg:col-span-6 flex flex-col items-center justify-center p-6 rounded-3xl bg-neutral-900/90 border border-neutral-800 shadow-2xl">
          <div className="w-full flex items-center justify-between text-neutral-400 text-xs mb-4 px-2">
            <span className="flex items-center gap-1.5 font-medium">
              <Eye className="size-3.5" /> Pré-visualização
            </span>
            <span className="font-mono text-[11px] bg-neutral-800 px-2 py-0.5 rounded text-neutral-300">
              {ratio === "9:16" ? "1080 x 1920 (Stories)" : "1080 x 1080 (Feed)"}
            </span>
          </div>

          {/* O Card Renderizado */}
          <div
            ref={previewRef}
            id="social-card-render-target"
            className={cn(
              "relative overflow-hidden rounded-2xl shadow-2xl transition-all select-none flex flex-col justify-between p-6 bg-neutral-950 text-white",
              ratio === "9:16"
                ? "w-[300px] sm:w-[340px] h-[533px] sm:h-[604px]"
                : "w-[300px] sm:w-[380px] h-[300px] sm:h-[380px]"
            )}
            style={{
              backgroundImage: template !== "quote" ? `linear-gradient(to top, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.3) 50%, rgba(0,0,0,0.65) 100%), url(${imageUrl})` : undefined,
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
                  <p className="text-[10px] text-neutral-400 font-mono leading-tight">{authorHandle}</p>
                </div>
              </div>

              {badgeText && (
                <span className="px-2.5 py-1 rounded-full bg-white/15 backdrop-blur-md border border-white/20 text-[10px] font-semibold uppercase tracking-wider text-emerald-300">
                  {badgeText}
                </span>
              )}
            </div>

            {/* Conteúdo */}
            {template === "quote" ? (
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
                  <h3 className="text-lg sm:text-xl font-bold tracking-tight text-white drop-shadow-md leading-snug">
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
                      <span className="text-[11px] text-neutral-300 font-medium">
                        {installments}
                      </span>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Rodapé */}
            <div className="pt-3 border-t border-white/10 flex items-center justify-between text-[10px] text-neutral-400 z-10">
              <span>{store?.name || "Waesy Comércio Local"}</span>
              <span className="font-semibold text-white">Consulte no Catálogo</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
