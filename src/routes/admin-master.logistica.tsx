import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import {
  Truck,
  Bike,
  ShieldCheck,
  Image as ImageIcon,
  Smartphone,
  Tablet,
  Monitor,
  Loader2,
  Save,
  Layers,
  Info,
  Car,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ImageUpload } from "@/components/ui/image-upload";
import {
  getLogisticsPresentationSettings,
  updateLogisticsPresentationSettings,
  type LogisticsPresentationSettings,
} from "@/services/master.functions";
import {
  listMobilityVehicleSprites,
  upsertMobilityVehicleSprite,
  type MobilityVehicleSpriteDTO,
} from "@/services/mobility.functions";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin-master/logistica")({
  head: () => ({ meta: [{ title: "CMS Logística, MotoLink & Sprites 3D | Waesy Master" }] }),
  loader: async () => {
    try {
      const [settings, vehicleSprites] = await Promise.all([
        getLogisticsPresentationSettings().catch(() => null),
        listMobilityVehicleSprites().catch(() => []),
      ]);
      return {
        settings:
          settings ||
          ({
            title: "Logística Integrada e MotoLink",
            subtitle:
              "Conecte-se aos entregadores autônomos da sua cidade sem intermediários e com zero taxa de frete.",
            badge: "Zero Taxa de Intermediação",
            disclaimer:
              "O Waesy é uma infraestrutura tecnológica aberta. Não intermediamos pagamentos de fretes nem cobramos comissão entre entregadores e empresas. A relação comercial e operacional é direta e independente entre as partes.",
            image_desktop_url: null,
            image_tablet_url: null,
            image_mobile_url: null,
            motolink_name: "MotoLink",
            features: [],
          } as LogisticsPresentationSettings),
        vehicleSprites: vehicleSprites || [],
      };
    } catch {
      return {
        settings: {
          title: "Logística Integrada e MotoLink",
          subtitle:
            "Conecte-se aos entregadores autônomos da sua cidade sem intermediários e com zero taxa de frete.",
          badge: "Zero Taxa de Intermediação",
          disclaimer:
            "O Waesy é uma infraestrutura tecnológica aberta. Não intermediamos pagamentos de fretes nem cobramos comissão entre entregadores e empresas.",
          image_desktop_url: null,
          image_tablet_url: null,
          image_mobile_url: null,
          motolink_name: "MotoLink",
          features: [],
        } as LogisticsPresentationSettings,
        vehicleSprites: [] as MobilityVehicleSpriteDTO[],
      };
    }
  },
  component: AdminMasterLogisticaPage,
});

function AdminMasterLogisticaPage() {
  const { settings: initialSettings, vehicleSprites: initialSprites = [] } =
    (Route.useLoaderData?.() as any) || {};
  const router = useRouter();

  const [title, setTitle] = useState(initialSettings?.title || "Logística");
  const [subtitle, setSubtitle] = useState(initialSettings?.subtitle || "");
  const [badge, setBadge] = useState(initialSettings?.badge || "Zero Taxa de Intermediação");
  const [disclaimer, setDisclaimer] = useState(initialSettings?.disclaimer || "");
  const [motolinkName, setMotolinkName] = useState(initialSettings?.motolink_name || "MotoLink");

  const [imageDesktopUrl, setImageDesktopUrl] = useState<string | null>(
    initialSettings?.image_desktop_url || null
  );
  const [imageTabletUrl, setImageTabletUrl] = useState<string | null>(
    initialSettings?.image_tablet_url || null
  );
  const [imageMobileUrl, setImageMobileUrl] = useState<string | null>(
    initialSettings?.image_mobile_url || null
  );

  const [sprites, setSprites] = useState<MobilityVehicleSpriteDTO[]>(initialSprites);
  const [savingSpriteType, setSavingSpriteType] = useState<string | null>(null);

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
          features: initialSettings?.features || [],
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

  const handleSaveSprite = async (sprite: MobilityVehicleSpriteDTO) => {
    setSavingSpriteType(sprite.service_type);
    try {
      await upsertMobilityVehicleSprite({
        data: {
          service_type: sprite.service_type,
          display_label: sprite.display_label,
          sprite_3d_url: sprite.sprite_3d_url,
          map_marker_url: sprite.map_marker_url || sprite.sprite_3d_url,
          scale_factor: sprite.scale_factor || 1.0,
        },
      });
      toast.success(`Sprite 3D (${sprite.display_label}) atualizado no mapa!`);
      router.invalidate();
    } catch (err: any) {
      toast.error(err?.message || "Erro ao salvar sprite 3D.");
    } finally {
      setSavingSpriteType(null);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-16 animate-in fade-in duration-200">
      {/* ── Topo & Ações ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card p-6 rounded-lg border border-border/70">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="size-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold">
              <Truck className="size-4" />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-foreground">
              CMS de Logística, MotoLink & Sprites 3D
            </h1>
            <Badge variant="outline" className="text-xs bg-muted/40 font-bold">
              Onboarding e Mapa
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground max-w-xl">
            Configure a apresentação de entrega democratizada, disclaimer de não-intermediação, imagens responsivas e os modelos 3D dos veículos no mapa Waesy Go.
          </p>
        </div>

        <Button
          variant="default"
          onClick={handleSave}
          disabled={isSubmitting}
          className="rounded-lg text-xs font-bold h-11 min-h-11 px-6 gap-2 shrink-0 focus-visible:ring-2 focus-visible:ring-primary"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="size-4 animate-spin motion-reduce:animate-none" />
              <span>Salvando...</span>
            </>
          ) : (
            <>
              <Save className="size-4" />
              <span>Salvar Alterações</span>
            </>
          )}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* ── Coluna da Esquerda: Formulário de Configuração (7 colunas) ── */}
        <div className="lg:col-span-7 space-y-6">
          {/* 1. Textos Principais */}
          <Card className="p-6 rounded-lg border border-border/70 space-y-4 bg-card">
            <div className="space-y-1 pb-2 border-b border-border/60">
              <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
                <Layers className="size-4 text-primary" />
                <span>Textos da Apresentação</span>
              </h2>
              <p className="text-xs text-muted-foreground">
                Exibidos no passo de operação e logística durante o cadastro de novos negócios.
              </p>
            </div>

            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2 space-y-2">
                  <Label className="text-xs font-bold text-foreground">Título Principal</Label>
                  <Input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="h-11 min-h-11 rounded-lg text-xs bg-background font-medium"
                    placeholder="Logística"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-medium text-muted-foreground">Badge de Destaque</Label>
                  <Input
                    value={badge}
                    onChange={(e) => setBadge(e.target.value)}
                    className="h-11 min-h-11 rounded-lg text-xs bg-background font-medium"
                    placeholder="Zero Taxa"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-bold text-foreground">Subtítulo Explicativo</Label>
                <Input
                  value={subtitle}
                  onChange={(e) => setSubtitle(e.target.value)}
                  className="h-11 min-h-11 rounded-lg text-xs bg-background"
                  placeholder="Conecte-se aos motoboys da cidade sem intermediários..."
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-medium text-muted-foreground">
                  Nome da Solução de Despacho (Ex: MotoLink, Waesy Log)
                </Label>
                <Input
                  value={motolinkName}
                  onChange={(e) => setMotolinkName(e.target.value)}
                  className="h-11 min-h-11 rounded-lg text-xs bg-background font-bold"
                  placeholder="MotoLink"
                />
              </div>
            </div>
          </Card>

          {/* 2. Manifesto & Disclaimer Legal de Não-Intermediação */}
          <Card className="p-6 rounded-lg border border-border/70 space-y-4 bg-card">
            <div className="space-y-1 pb-2 border-b border-border/60">
              <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
                <ShieldCheck className="size-4 text-primary" />
                <span>Disclaimer Legal e Não-Intermediação</span>
              </h2>
              <p className="text-xs text-muted-foreground">
                Deixa claro para o empreendedor e para os entregadores a proposta de valor sem comissões da plataforma.
              </p>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-medium text-muted-foreground">
                Termo de Esclarecimento de Não-Intermediação
              </Label>
              <textarea
                value={disclaimer}
                onChange={(e) => setDisclaimer(e.target.value)}
                rows={3}
                className="w-full rounded-lg border border-border bg-background p-3 text-xs text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary leading-relaxed resize-none"
                placeholder="A Waesy não cobra comissões sobre entregas..."
              />
            </div>
          </Card>

          {/* 3. Sprites 3D de Veículos no Mapa (Waesy Go) */}
          <Card className="p-6 rounded-lg border border-border/70 space-y-4 bg-card">
            <div className="space-y-1 pb-2 border-b border-border/60">
              <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
                <Car className="size-4 text-primary" />
                <span>Sprites 3D de Veículos do Mapa (Waesy Go)</span>
              </h2>
              <p className="text-xs text-muted-foreground">
                Personalize os ícones e sprites 3D exibidos para Carro, Moto, Entrega, Van, Caminhão de Mudança, Carona e Ônibus.
              </p>
            </div>

            <div className="space-y-4">
              {sprites.map((sp, idx) => (
                <div
                  key={sp.service_type}
                  className="p-4 rounded-lg bg-muted/20 border border-border/60 space-y-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <img
                        src={sp.sprite_3d_url}
                        alt={sp.display_label}
                        className="size-10 rounded-lg object-contain bg-background border border-border/50 p-1"
                      />
                      <div>
                        <p className="text-xs font-bold text-foreground">{sp.display_label}</p>
                        <span className="text-xs font-mono text-muted-foreground uppercase">
                          {sp.service_type}
                        </span>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      disabled={savingSpriteType === sp.service_type}
                      onClick={() => handleSaveSprite(sp)}
                      className="h-11 min-h-11 px-4 rounded-lg text-xs font-bold focus-visible:ring-2 focus-visible:ring-primary"
                    >
                      {savingSpriteType === sp.service_type ? "Salvando..." : "Salvar Sprite 3D"}
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs font-semibold">Rótulo do Veículo</Label>
                      <Input
                        value={sp.display_label}
                        onChange={(e) => {
                          const next = [...sprites];
                          next[idx] = { ...sp, display_label: e.target.value };
                          setSprites(next);
                        }}
                        className="h-11 min-h-11 text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs font-semibold">URL do Sprite 3D / SVG</Label>
                      <Input
                        value={sp.sprite_3d_url}
                        onChange={(e) => {
                          const next = [...sprites];
                          next[idx] = { ...sp, sprite_3d_url: e.target.value };
                          setSprites(next);
                        }}
                        className="h-11 min-h-11 text-xs font-mono"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* 4. Upload de 3 Imagens Responsivas (Mobile, Tablet, Desktop) */}
          <Card className="p-6 rounded-lg border border-border/70 space-y-4 bg-card">
            <div className="space-y-1 pb-2 border-b border-border/60">
              <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
                <ImageIcon className="size-4 text-primary" />
                <span>Imagens Ilustrativas em 3 Resoluções</span>
              </h2>
              <p className="text-xs text-muted-foreground">
                Carregue imagens com enquadramento perfeito para visualização em computadores, tablets e smartphones.
              </p>
            </div>

            <div className="space-y-5">
              {/* Desktop (Panorâmica 21:9 / 16:9) */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-bold text-foreground flex items-center gap-2">
                    <Monitor className="size-4 text-primary" />
                    <span>Imagem Desktop (Panorâmica 21:9)</span>
                  </Label>
                  <span className="text-xs text-muted-foreground">Computadores e Telas Largas</span>
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
                  <Label className="text-xs font-bold text-foreground flex items-center gap-2">
                    <Tablet className="size-4 text-primary" />
                    <span>Imagem Tablet (Médio 4:3)</span>
                  </Label>
                  <span className="text-xs text-muted-foreground">iPads e Tablets</span>
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
                  <Label className="text-xs font-bold text-foreground flex items-center gap-2">
                    <Smartphone className="size-4 text-primary" />
                    <span>Imagem Mobile (Quadrado 1:1)</span>
                  </Label>
                  <span className="text-xs text-muted-foreground">Smartphones e Telas Estreitas</span>
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
          <Card className="p-5 rounded-lg border border-border/70 bg-card space-y-4 sticky top-6">
            <div className="flex items-center justify-between pb-2 border-b border-border/60">
              <div className="flex items-center gap-2">
                <Info className="size-4 text-primary" />
                <h3 className="text-xs font-bold text-foreground">Prévia em Tempo Real</h3>
              </div>

              {/* Seletor de Breakpoints para Teste de Tela */}
              <div className="flex items-center gap-1 bg-muted/40 p-1 rounded-lg">
                <button
                  type="button"
                  onClick={() => setPreviewMode("desktop")}
                  className={cn(
                    "size-11 rounded-lg text-xs flex items-center justify-center transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-primary",
                    previewMode === "desktop"
                      ? "bg-foreground text-background font-bold"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                  title="Prévia Desktop"
                >
                  <Monitor className="size-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewMode("tablet")}
                  className={cn(
                    "size-11 rounded-lg text-xs flex items-center justify-center transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-primary",
                    previewMode === "tablet"
                      ? "bg-foreground text-background font-bold"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                  title="Prévia Tablet"
                >
                  <Tablet className="size-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewMode("mobile")}
                  className={cn(
                    "size-11 rounded-lg text-xs flex items-center justify-center transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-primary",
                    previewMode === "mobile"
                      ? "bg-foreground text-background font-bold"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                  title="Prévia Mobile"
                >
                  <Smartphone className="size-4" />
                </button>
              </div>
            </div>

            {/* Mockup do Bloco de Logística */}
            <div
              className={cn(
                "rounded-lg border border-border/80 overflow-hidden bg-background p-4 space-y-3 transition-colors duration-200",
                previewMode === "mobile" && "max-w-80 mx-auto",
                previewMode === "tablet" && "max-w-md mx-auto"
              )}
            >
              {/* Imagem Adaptativa da Prévia */}
              <div className="relative rounded-lg overflow-hidden bg-muted aspect-video border border-border/40">
                {(previewMode === "mobile"
                  ? imageMobileUrl || imageDesktopUrl || initialSettings?.image_mobile_url
                  : previewMode === "tablet"
                  ? imageTabletUrl || imageDesktopUrl || initialSettings?.image_tablet_url
                  : imageDesktopUrl || initialSettings?.image_desktop_url) ? (
                  <img
                    src={
                      previewMode === "mobile"
                        ? imageMobileUrl || imageDesktopUrl || initialSettings?.image_mobile_url || ""
                        : previewMode === "tablet"
                        ? imageTabletUrl || imageDesktopUrl || initialSettings?.image_tablet_url || ""
                        : imageDesktopUrl || initialSettings?.image_desktop_url || ""
                    }
                    alt="Ilustração de Entrega"
                    className="size-full object-cover"
                  />
                ) : (
                  <div className="size-full flex items-center justify-center text-xs text-muted-foreground">
                    Prévia da imagem responsiva
                  </div>
                )}
                <div className="absolute top-2 left-2">
                  <Badge className="bg-background/80 backdrop-blur-md text-foreground border-border/60 text-xs font-bold">
                    {badge}
                  </Badge>
                </div>
              </div>

              {/* Textos da Prévia */}
              <div className="space-y-1">
                <h4 className="text-xs font-bold text-foreground">{title}</h4>
                <p className="text-xs text-muted-foreground leading-relaxed">{subtitle}</p>
              </div>

              {/* Ficha Ilustrativa do Motoboy */}
              <div className="p-3 rounded-lg bg-muted/20 border border-border/60 space-y-2">
                <p className="text-xs font-bold text-foreground flex items-center gap-1">
                  <Bike className="size-4 text-primary" />
                  <span>Ficha de Condutor Verificado</span>
                </p>
                <div className="flex items-center gap-2 text-xs">
                  <div className="size-8 rounded-lg bg-primary/15 text-primary flex items-center justify-center font-bold text-xs">
                    WG
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-xs break-words">Condutor Autônomo Waesy Go</p>
                    <p className="text-xs text-muted-foreground font-mono">Honda CG 160 • Placa Verificada</p>
                  </div>
                  <Badge
                    variant="outline"
                    className="text-xs font-bold bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                  >
                    Verificado
                  </Badge>
                </div>
              </div>

              {/* Disclaimer Legal */}
              <div className="p-3 rounded-lg bg-muted/40 text-xs text-muted-foreground leading-snug border border-border/40">
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
