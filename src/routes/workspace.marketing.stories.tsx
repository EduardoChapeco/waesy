import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import {
  ArrowLeft,
  Download,
  Share2,
  Copy,
  Sparkles,
  Smartphone,
  Square,
  Maximize2,
  Image as ImageIcon,
  Check,
  RefreshCw,
  ExternalLink,
} from "lucide-react";
import { WhatsappLogo } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  generateSocialStoryCard,
  type SocialCardResultDTO,
} from "@/services/studio.functions";
import { listAdminProducts } from "@/services/admin-catalog.functions";
import { getStoreSettings } from "@/services/store.functions";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/workspace/marketing/stories")({
  head: () => ({
    meta: [{ title: "Gerador de Stories & Redes Sociais | Workspace Waesy" }],
  }),
  loader: async () => {
    try {
      const [products, store] = await Promise.all([
        listAdminProducts().catch(() => []),
        getStoreSettings().catch(() => null),
      ]);
      return {
        products: (products || []) as any[],
        storeName: store?.name || "Minha Loja",
        storeSlug: store?.slug || "",
      };
    } catch (err) {
      console.error("[loader:workspace.marketing.stories] error:", err);
      return { products: [], storeName: "Minha Loja", storeSlug: "" };
    }
  },
  component: WorkspaceMarketingStoriesPage,
});

export default function WorkspaceMarketingStoriesPage() {
  const { products, storeName: initialStoreName, storeSlug } = Route.useLoaderData();

  const [format, setFormat] = useState<"story_9_16" | "feed_1_1" | "banner_16_9">("story_9_16");
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [title, setTitle] = useState("Oferta Especial Exclusiva");
  const [subtitle, setSubtitle] = useState("Escaneie o QR Code ou acesse o link para comprar");
  const [priceCents, setPriceCents] = useState<number>(14990);
  const [imageUrl, setImageUrl] = useState("");
  const [storeName, setStoreName] = useState(initialStoreName);
  const [targetUrl, setTargetUrl] = useState(() => {
    return typeof window !== "undefined"
      ? `${window.location.origin}/mercado`
      : "https://usewaesy.com";
  });

  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedCard, setGeneratedCard] = useState<SocialCardResultDTO | null>(null);

  // Auto-fill from catalog product
  const handleSelectProduct = (productId: string) => {
    const prod = products.find((p) => p.id === productId);
    if (!prod) return;

    setTitle(prod.title || "");
    setPriceCents(prod.price_cents || 0);
    const media = prod.product_media?.[0]?.url;
    if (media) setImageUrl(media);

    const baseUrl = typeof window !== "undefined" ? window.location.origin : "https://usewaesy.com";
    setTargetUrl(`${baseUrl}/produto/${prod.slug}`);
    toast.success(`Dados preenchidos a partir de "${prod.title}"`);
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const res = await generateSocialStoryCard({
        data: {
          storeName: storeName.trim() || "Waesy Loja",
          title: title.trim(),
          subtitle: subtitle.trim(),
          priceCents: priceCents > 0 ? priceCents : undefined,
          imageUrl: imageUrl.trim() || undefined,
          targetUrl: targetUrl.trim() || "https://usewaesy.com",
          format,
          theme,
        },
      });
      setGeneratedCard(res);
      toast.success("Card social gerado com sucesso!");
    } catch (err: any) {
      toast.error(err?.message || "Erro ao gerar card social.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopySvg = () => {
    if (!generatedCard?.svgMarkup) return;
    navigator.clipboard.writeText(generatedCard.svgMarkup);
    toast.success("SVG copiado para a área de transferência!");
  };

  const handleDownloadSvg = () => {
    if (!generatedCard?.svgMarkup) return;
    const blob = new Blob([generatedCard.svgMarkup], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `waesy-${format}-${Date.now()}.svg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("Arquivo SVG baixado com sucesso!");
  };

  const handleShareWhatsApp = () => {
    if (!generatedCard) return;
    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(generatedCard.whatsappShareText)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const handleNativeShare = async () => {
    if (typeof navigator !== "undefined" && navigator.share && generatedCard) {
      try {
        await navigator.share({
          title: title,
          text: generatedCard.whatsappShareText,
          url: generatedCard.shareUrl,
        });
      } catch (err) {
        // Cancelado pelo usuário
      }
    } else {
      handleCopySvg();
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 md:px-8 space-y-8">
      {/* ── Barra Superior & Navegação ── */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between border-b border-border/50 pb-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Link
              to="/workspace/marketing/pixels"
              className="inline-flex size-8 items-center justify-center rounded-xl bg-muted/60 text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="size-4" />
            </Link>
            <h1 className="text-2xl font-black tracking-tight text-foreground">
              Estúdio de Stories & Redes Sociais
            </h1>
          </div>
          <p className="text-xs text-muted-foreground ml-10">
            Crie artes vetoriais ultra-nítidas no padrão 9:16 (Stories/Status), 1:1 (Feed / Quadrado) e 16:9 (Banners).
          </p>
        </div>

        {/* Formatos Rápidos */}
        <div className="flex items-center gap-2 bg-muted/40 p-1.5 rounded-2xl border border-border/40">
          <button
            type="button"
            onClick={() => setFormat("story_9_16")}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all",
              format === "story_9_16"
                ? "bg-background text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Smartphone className="size-3.5" />
            <span>Story (9:16)</span>
          </button>
          <button
            type="button"
            onClick={() => setFormat("feed_1_1")}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all",
              format === "feed_1_1"
                ? "bg-background text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Square className="size-3.5" />
            <span>Feed (1:1)</span>
          </button>
          <button
            type="button"
            onClick={() => setFormat("banner_16_9")}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all",
              format === "banner_16_9"
                ? "bg-background text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Maximize2 className="size-3.5" />
            <span>Banner (16:9)</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* ── Painel de Configurações (Esquerda) ── */}
        <div className="lg:col-span-6 space-y-6">
          {/* Seletor Rápido de Produtos do Catálogo */}
          {products.length > 0 && (
            <div className="rounded-2xl border border-border/60 bg-card p-5 space-y-3">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Importar Produto do Catálogo
              </Label>
              <select
                aria-label="Selecionar produto do catálogo"
                className="w-full h-11 rounded-xl border border-border bg-background px-3 text-xs font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                onChange={(e) => handleSelectProduct(e.target.value)}
                defaultValue=""
              >
                <option value="" disabled>
                  Selecione um produto para preenchimento automático...
                </option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.title} — {(p.price_cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Dados do Card */}
          <div className="rounded-2xl border border-border/60 bg-card p-6 space-y-5">
            <h2 className="text-sm font-bold text-foreground">Conteúdo da Arte</h2>

            <div className="space-y-4">
              <div>
                <Label htmlFor="storeName" className="text-xs font-bold text-muted-foreground">
                  Nome da Loja / Marca
                </Label>
                <Input
                  id="storeName"
                  value={storeName}
                  onChange={(e) => setStoreName(e.target.value)}
                  className="mt-1.5 h-11 rounded-xl text-xs"
                  placeholder="Nome exibido no topo do card"
                />
              </div>

              <div>
                <Label htmlFor="title" className="text-xs font-bold text-muted-foreground">
                  Título Principal
                </Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="mt-1.5 h-11 rounded-xl text-xs"
                  placeholder="Ex: Tênis Runner Air Max 2026"
                />
              </div>

              <div>
                <Label htmlFor="subtitle" className="text-xs font-bold text-muted-foreground">
                  Chamada / Subtítulo
                </Label>
                <Input
                  id="subtitle"
                  value={subtitle}
                  onChange={(e) => setSubtitle(e.target.value)}
                  className="mt-1.5 h-11 rounded-xl text-xs"
                  placeholder="Ex: Últimas unidades em estoque com frete grátis"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="priceCents" className="text-xs font-bold text-muted-foreground">
                    Preço (Centavos)
                  </Label>
                  <Input
                    id="priceCents"
                    type="number"
                    value={priceCents}
                    onChange={(e) => setPriceCents(Number(e.target.value))}
                    className="mt-1.5 h-11 rounded-xl text-xs"
                    placeholder="Ex: 14990 = R$ 149,90"
                  />
                  <span className="text-[10px] text-muted-foreground mt-1 block">
                    {(priceCents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                  </span>
                </div>

                <div>
                  <Label className="text-xs font-bold text-muted-foreground">Tema Visual</Label>
                  <div className="mt-1.5 flex gap-2">
                    <button
                      type="button"
                      onClick={() => setTheme("dark")}
                      className={cn(
                        "flex-1 h-11 rounded-xl border text-xs font-bold transition-colors",
                        theme === "dark"
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border bg-background text-muted-foreground",
                      )}
                    >
                      Escuro
                    </button>
                    <button
                      type="button"
                      onClick={() => setTheme("light")}
                      className={cn(
                        "flex-1 h-11 rounded-xl border text-xs font-bold transition-colors",
                        theme === "light"
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border bg-background text-muted-foreground",
                      )}
                    >
                      Claro
                    </button>
                  </div>
                </div>
              </div>

              <div>
                <Label htmlFor="imageUrl" className="text-xs font-bold text-muted-foreground">
                  URL da Imagem de Destaque
                </Label>
                <Input
                  id="imageUrl"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  className="mt-1.5 h-11 rounded-xl text-xs"
                  placeholder="https://exemplo.com/foto.jpg"
                />
              </div>

              <div>
                <Label htmlFor="targetUrl" className="text-xs font-bold text-muted-foreground">
                  Link de Destino / Checkout
                </Label>
                <Input
                  id="targetUrl"
                  value={targetUrl}
                  onChange={(e) => setTargetUrl(e.target.value)}
                  className="mt-1.5 h-11 rounded-xl text-xs"
                  placeholder="https://usewaesy.com/produto/tenis-runner"
                />
              </div>
            </div>

            <Button
              type="button"
              onClick={handleGenerate}
              disabled={isGenerating}
              className="w-full h-11 rounded-xl font-bold gap-2 text-xs"
            >
              {isGenerating ? (
                <RefreshCw className="size-4 animate-spin" />
              ) : (
                <Sparkles className="size-4" />
              )}
              <span>Gerar Card Social</span>
            </Button>
          </div>
        </div>

        {/* ── Visualização em Tempo Real (Direita) ── */}
        <div className="lg:col-span-6 space-y-6">
          <div className="rounded-2xl border border-border/60 bg-card p-6 flex flex-col items-center">
            <div className="w-full flex items-center justify-between pb-4 border-b border-border/40">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Prévia Interativa ({format === "story_9_16" ? "9:16" : format === "feed_1_1" ? "1:1" : "16:9"})
              </span>
              {generatedCard && (
                <Badge variant="outline" className="text-[10px] font-bold">
                  {generatedCard.dimensions.width} x {generatedCard.dimensions.height}px
                </Badge>
              )}
            </div>

            {/* Container de Escala do Card */}
            <div className="my-6 flex justify-center w-full">
              {generatedCard?.svgMarkup ? (
                <div
                  className={cn(
                    "overflow-hidden rounded-3xl shadow-xs border border-border/60 bg-black flex items-center justify-center transition-all",
                    format === "story_9_16"
                      ? "w-[270px] h-[480px]"
                      : format === "feed_1_1"
                        ? "w-[340px] h-[340px]"
                        : "w-[440px] h-[247px]",
                  )}
                  dangerouslySetInnerHTML={{ __html: generatedCard.svgMarkup }}
                />
              ) : (
                <div
                  className={cn(
                    "flex flex-col items-center justify-center rounded-3xl border border-dashed border-border/80 bg-muted/20 text-center p-6 transition-all",
                    format === "story_9_16"
                      ? "w-[270px] h-[480px]"
                      : format === "feed_1_1"
                        ? "w-[340px] h-[340px]"
                        : "w-[440px] h-[247px]",
                  )}
                >
                  <ImageIcon className="size-10 text-muted-foreground/50 mb-3" />
                  <p className="text-xs font-bold text-foreground">Aguardando geração</p>
                  <p className="text-[11px] text-muted-foreground mt-1 max-w-[180px]">
                    Preencha os campos ao lado e clique em &quot;Gerar Card Social&quot;.
                  </p>
                </div>
              )}
            </div>

            {/* Botões de Ação Imediata */}
            {generatedCard && (
              <div className="w-full space-y-3 pt-2">
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleDownloadSvg}
                    className="h-11 rounded-xl text-xs font-bold gap-2"
                  >
                    <Download className="size-4" />
                    <span>Baixar SVG</span>
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleCopySvg}
                    className="h-11 rounded-xl text-xs font-bold gap-2"
                  >
                    <Copy className="size-4" />
                    <span>Copiar SVG</span>
                  </Button>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <Button
                    type="button"
                    variant="default"
                    onClick={handleShareWhatsApp}
                    className="h-11 rounded-xl text-xs font-bold gap-2 bg-[#25D366] hover:bg-[#20bd5a] text-black"
                  >
                    <WhatsappLogo className="size-4" weight="bold" />
                    <span>WhatsApp</span>
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={handleNativeShare}
                    className="h-11 rounded-xl text-xs font-bold gap-2"
                  >
                    <Share2 className="size-4" />
                    <span>Compartilhar</span>
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
