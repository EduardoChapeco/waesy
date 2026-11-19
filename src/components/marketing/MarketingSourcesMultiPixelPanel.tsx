import { useEffect, useState } from "react";
import { Plus, Radio, Trash2, CheckCircle2, Layers } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  deleteMarketingSource,
  deleteMarketingSourcePixel,
  testStorePixelPipeline,
  upsertMarketingSource,
  upsertMarketingSourcePixel,
  type MarketingSourceDTO,
  type MarketingSourcePlatform,
  type MarketingSourcePixelDTO,
} from "@/services/pixels.functions";
import type { PixelProviderType } from "@/lib/pixel-routing";

const SOURCE_PLATFORM_LABELS: Record<MarketingSourcePlatform, string> = {
  meta_ads: "Meta Ads",
  google_ads: "Google Ads",
  tiktok_ads: "TikTok Ads",
  web_portal: "Portal Web / Vitrine",
  whatsapp_organic: "WhatsApp Orgânico",
  referral: "Indicação",
  offline: "Balcão / Offline",
  custom: "Personalizado",
};

const PIXEL_PROVIDER_LABELS: Record<PixelProviderType, string> = {
  meta_pixel: "Meta Pixel & CAPI",
  google_ads: "Google Ads",
  ga4: "GA4 Measurement",
  tiktok_pixel: "TikTok Pixel",
  custom_capi: "Webhook / CAPI Custom",
};

function parseCsvList(raw: string): string[] {
  return raw
    .split(/[\n,;]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

interface MarketingSourcesMultiPixelPanelProps {
  storeId?: string;
  initialSources: MarketingSourceDTO[];
  onRefresh: () => Promise<void> | void;
}

export function MarketingSourcesMultiPixelPanel({
  storeId,
  initialSources,
  onRefresh,
}: MarketingSourcesMultiPixelPanelProps) {
  const [sources, setSources] = useState<MarketingSourceDTO[]>(initialSources || []);
  useEffect(() => {
    setSources(initialSources || []);
  }, [initialSources]);
  const [isCreatingSource, setIsCreatingSource] = useState(false);
  const [sourceName, setSourceName] = useState("");
  const [sourcePlatform, setSourcePlatform] = useState<MarketingSourcePlatform>("meta_ads");
  const [sourceDesc, setSourceDesc] = useState("");
  const [savingSource, setSavingSource] = useState(false);

  const [pixelFormSourceId, setPixelFormSourceId] = useState<string | null>(null);
  const [editingPixelId, setEditingPixelId] = useState<string | null>(null);
  const [pixelName, setPixelName] = useState("");
  const [pixelProvider, setPixelProvider] = useState<PixelProviderType>("meta_pixel");
  const [externalPixelId, setExternalPixelId] = useState("");
  const [adAccountId, setAdAccountId] = useState("");
  const [capiToken, setCapiToken] = useState("");
  const [testEventCode, setTestEventCode] = useState("");
  const [routeCampaignIds, setRouteCampaignIds] = useState("");
  const [routeAdIds, setRouteAdIds] = useState("");
  const [routeNicheIds, setRouteNicheIds] = useState("");
  const [isDefaultPixel, setIsDefaultPixel] = useState(false);
  const [savingPixel, setSavingPixel] = useState(false);
  const [testingPixelId, setTestingPixelId] = useState<string | null>(null);

  const syncAfterMutation = async () => {
    await onRefresh();
  };

  const handleSaveSource = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sourceName.trim()) {
      toast.error("Informe o nome da fonte.");
      return;
    }
    setSavingSource(true);
    try {
      const saved = await upsertMarketingSource({
        data: {
          storeId,
          name: sourceName.trim(),
          platform: sourcePlatform,
          description: sourceDesc.trim() || null,
          isActive: true,
        },
      });
      setSources((prev) => {
        const exists = prev.some((s) => s.id === saved.id);
        if (exists) return prev.map((s) => (s.id === saved.id ? { ...s, ...saved } : s));
        return [...prev, { ...saved, pixels: [] }];
      });
      setSourceName("");
      setSourceDesc("");
      setIsCreatingSource(false);
      toast.success("Fonte de aquisição salva.");
      await syncAfterMutation();
    } catch (err: any) {
      toast.error(err?.message || "Erro ao salvar fonte.");
    } finally {
      setSavingSource(false);
    }
  };

  const handleDeleteSource = async (sourceId: string) => {
    try {
      await deleteMarketingSource({ data: { id: sourceId, storeId } });
      setSources((prev) => prev.filter((s) => s.id !== sourceId));
      toast.success("Fonte removida.");
      await syncAfterMutation();
    } catch (err: any) {
      toast.error(err?.message || "Erro ao remover fonte.");
    }
  };

  const openPixelEditor = (sourceId: string, pixel?: MarketingSourcePixelDTO) => {
    setPixelFormSourceId(sourceId);
    if (pixel) {
      setEditingPixelId(pixel.id);
      setPixelName(pixel.name);
      setPixelProvider(pixel.provider);
      setExternalPixelId(pixel.external_pixel_id);
      setAdAccountId(pixel.ad_account_id || "");
      setCapiToken("");
      setTestEventCode(pixel.test_event_code || "");
      setRouteCampaignIds((pixel.routing_rules?.campaign_ids || []).join(", "));
      setRouteAdIds((pixel.routing_rules?.ad_ids || []).join(", "));
      setRouteNicheIds((pixel.routing_rules?.niche_ids || []).join(", "));
      setIsDefaultPixel(Boolean(pixel.is_default));
    } else {
      setEditingPixelId(null);
      setPixelName("");
      setPixelProvider("meta_pixel");
      setExternalPixelId("");
      setAdAccountId("");
      setCapiToken("");
      setTestEventCode("");
      setRouteCampaignIds("");
      setRouteAdIds("");
      setRouteNicheIds("");
      setIsDefaultPixel(false);
    }
  };

  const handleSavePixel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pixelFormSourceId || !pixelName.trim() || !externalPixelId.trim()) {
      toast.error("Preencha o nome e o ID externo do Pixel.");
      return;
    }
    setSavingPixel(true);
    try {
      const saved = await upsertMarketingSourcePixel({
        data: {
          id: editingPixelId,
          storeId,
          sourceId: pixelFormSourceId,
          name: pixelName.trim(),
          provider: pixelProvider,
          externalPixelId: externalPixelId.trim(),
          adAccountId: adAccountId.trim() || null,
          capiAccessToken: capiToken.trim() || null,
          testEventCode: testEventCode.trim() || null,
          routingRules: {
            campaign_ids: parseCsvList(routeCampaignIds),
            ad_ids: parseCsvList(routeAdIds),
            niche_ids: parseCsvList(routeNicheIds),
          },
          isDefault: isDefaultPixel,
          isActive: true,
        },
      });
      setSources((prev) =>
        prev.map((src) => {
          if (src.id !== pixelFormSourceId) return src;
          const exists = src.pixels.some((p) => p.id === saved.id);
          const nextPixels = exists
            ? src.pixels.map((p) => (p.id === saved.id ? saved : p))
            : [...src.pixels, saved];
          return { ...src, pixels: nextPixels };
        }),
      );
      setPixelFormSourceId(null);
      toast.success("Pixel configurado no cofre com segurança.");
      await syncAfterMutation();
    } catch (err: any) {
      toast.error(err?.message || "Erro ao salvar Pixel.");
    } finally {
      setSavingPixel(false);
    }
  };

  const handleDeletePixel = async (sourceId: string, pixelId: string) => {
    try {
      await deleteMarketingSourcePixel({ data: { id: pixelId, storeId } });
      setSources((prev) =>
        prev.map((src) =>
          src.id === sourceId
            ? { ...src, pixels: src.pixels.filter((p) => p.id !== pixelId) }
            : src,
        ),
      );
      toast.success("Pixel removido.");
      await syncAfterMutation();
    } catch (err: any) {
      toast.error(err?.message || "Erro ao excluir Pixel.");
    }
  };

  const handleTestPixel = async (pixel: MarketingSourcePixelDTO) => {
    if (!storeId) {
      toast.error("Loja não identificada.");
      return;
    }
    setTestingPixelId(pixel.id);
    try {
      const res = await testStorePixelPipeline({
        data: {
          storeId,
          channel: "meta_capi",
          sourcePixelId: pixel.id,
          testEventCode: pixel.test_event_code || undefined,
        },
      });
      if (res.meta?.sent) {
        toast.success(`Evento teste entregue para ${pixel.name} (#${pixel.external_pixel_id}).`);
      } else {
        toast.error(res.meta?.reason || "Falha ao disparar evento CAPI para o Pixel selecionado.");
      }
    } catch (err: any) {
      toast.error(err?.message || "Erro ao testar Pixel.");
    } finally {
      setTestingPixelId(null);
    }
  };

  return (
    <section className="rounded-xl bg-card border border-border/60 p-4 sm:p-6 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-border/40">
        <div className="flex items-center gap-3">
          <div className="size-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <Layers className="size-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-foreground">Fontes e Multi-Pixels CAPI</h2>
            <p className="text-xs text-muted-foreground">
              Conecte múltiplas origens e roteie eventos por campanha, anúncio ou nicho.
            </p>
          </div>
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setIsCreatingSource((v) => !v)}
          className="h-11 sm:h-9 px-3 rounded-lg text-xs font-semibold gap-2 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <Plus className="size-4" />
          <span>{isCreatingSource ? "Fechar Formulário" : "Nova Fonte"}</span>
        </Button>
      </div>

      {isCreatingSource && (
        <form onSubmit={handleSaveSource} className="rounded-lg bg-muted/30 p-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label htmlFor="ms-name" className="text-xs font-semibold">Nome da Fonte</Label>
              <Input
                id="ms-name"
                value={sourceName}
                onChange={(e) => setSourceName(e.target.value)}
                placeholder="Ex: Meta Ads — Turismo Luxo"
                className="h-11 sm:h-9 text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="ms-platform" className="text-xs font-semibold">Plataforma</Label>
              <select
                id="ms-platform"
                value={sourcePlatform}
                onChange={(e) => setSourcePlatform(e.target.value as MarketingSourcePlatform)}
                className="w-full h-11 sm:h-9 rounded-lg border border-border/70 bg-background px-3 text-xs font-medium text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                {Object.entries(SOURCE_PLATFORM_LABELS).map(([k, label]) => (
                  <option key={k} value={k}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="ms-desc" className="text-xs font-semibold">Observação (opcional)</Label>
              <Input
                id="ms-desc"
                value={sourceDesc}
                onChange={(e) => setSourceDesc(e.target.value)}
                placeholder="Conta BM Principal"
                className="h-11 sm:h-9 text-xs"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setIsCreatingSource(false)}
              className="h-11 sm:h-9 px-3 text-xs cursor-pointer"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="secondary"
              disabled={savingSource}
              className="h-11 sm:h-9 px-4 text-xs font-semibold cursor-pointer"
            >
              {savingSource ? "Salvando..." : "Criar Fonte"}
            </Button>
          </div>
        </form>
      )}

      {sources.length === 0 ? (
        <div className="rounded-lg bg-muted/20 p-6 text-center space-y-2">
          <p className="text-xs font-medium text-muted-foreground">
            Nenhuma fonte adicional cadastrada ainda. Crie uma fonte para conectar múltiplos Pixels por campanha ou produto.
          </p>
        </div>
      ) : (
        <div className="divide-y divide-border/50">
          {sources.map((src) => (
            <div key={src.id} className="py-4 first:pt-0 last:pb-0 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="space-y-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-bold text-foreground">{src.name}</span>
                    <Badge variant="outline" className="text-xs font-mono">
                      {SOURCE_PLATFORM_LABELS[src.platform] || src.platform}
                    </Badge>
                    <Badge variant="secondary" className="text-xs font-mono">
                      {src.pixels.length} pixel(s)
                    </Badge>
                  </div>
                  {src.description && (
                    <p className="text-xs text-muted-foreground">{src.description}</p>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => openPixelEditor(src.id)}
                    className="h-11 sm:h-9 px-3 rounded-lg text-xs font-semibold gap-2 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    <Plus className="size-3.5" />
                    <span>Adicionar Pixel</span>
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => void handleDeleteSource(src.id)}
                    aria-label={`Remover fonte ${src.name}`}
                    className="h-11 w-11 sm:h-9 sm:w-9 p-0 text-muted-foreground hover:text-destructive cursor-pointer"
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </div>

              {pixelFormSourceId === src.id && (
                <form onSubmit={handleSavePixel} className="rounded-lg bg-muted/30 p-4 space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs font-semibold">Nome Amigável</Label>
                      <Input
                        value={pixelName}
                        onChange={(e) => setPixelName(e.target.value)}
                        placeholder="Ex: Pixel Europa Premium"
                        className="h-11 sm:h-9 text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs font-semibold">Provedor</Label>
                      <select
                        value={pixelProvider}
                        onChange={(e) => setPixelProvider(e.target.value as PixelProviderType)}
                        className="w-full h-11 sm:h-9 rounded-lg border border-border/70 bg-background px-3 text-xs font-medium text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                      >
                        {Object.entries(PIXEL_PROVIDER_LABELS).map(([k, label]) => (
                          <option key={k} value={k}>
                            {label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs font-semibold">Pixel / Dataset ID</Label>
                      <Input
                        value={externalPixelId}
                        onChange={(e) => setExternalPixelId(e.target.value)}
                        placeholder="Ex: 1458291029384"
                        className="h-11 sm:h-9 text-xs font-mono"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs font-semibold">Token CAPI (Cofre AES)</Label>
                      <Input
                        type="password"
                        value={capiToken}
                        onChange={(e) => setCapiToken(e.target.value)}
                        placeholder={editingPixelId ? "Deixe vazio para manter o atual" : "EAAB..."}
                        className="h-11 sm:h-9 text-xs font-mono"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs font-semibold">Ad Account ID (Opcional)</Label>
                      <Input
                        value={adAccountId}
                        onChange={(e) => setAdAccountId(e.target.value)}
                        placeholder="Ex: act_123456"
                        className="h-11 sm:h-9 text-xs font-mono"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs font-semibold">Test Event Code (Opcional)</Label>
                      <Input
                        value={testEventCode}
                        onChange={(e) => setTestEventCode(e.target.value)}
                        placeholder="Ex: TEST12345"
                        className="h-11 sm:h-9 text-xs font-mono"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs font-semibold">Roteamento: Campaign IDs</Label>
                      <Input
                        value={routeCampaignIds}
                        onChange={(e) => setRouteCampaignIds(e.target.value)}
                        placeholder="Separado por vírgula"
                        className="h-11 sm:h-9 text-xs font-mono"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs font-semibold">Roteamento: Ad IDs</Label>
                      <Input
                        value={routeAdIds}
                        onChange={(e) => setRouteAdIds(e.target.value)}
                        placeholder="Separado por vírgula"
                        className="h-11 sm:h-9 text-xs font-mono"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs font-semibold">Roteamento: Nichos</Label>
                      <Input
                        value={routeNicheIds}
                        onChange={(e) => setRouteNicheIds(e.target.value)}
                        placeholder="tourism, vehicles..."
                        className="h-11 sm:h-9 text-xs font-mono"
                      />
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
                    <label className="inline-flex items-center gap-2 text-xs text-foreground cursor-pointer min-h-11 sm:min-h-0">
                      <input
                        type="checkbox"
                        checked={isDefaultPixel}
                        onChange={(e) => setIsDefaultPixel(e.target.checked)}
                        className="size-4 rounded accent-primary"
                      />
                      <span>Pixel padrão deste provedor</span>
                    </label>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setPixelFormSourceId(null)}
                        className="h-11 sm:h-9 px-3 text-xs cursor-pointer"
                      >
                        Cancelar
                      </Button>
                      <Button
                        type="submit"
                        variant="secondary"
                        disabled={savingPixel}
                        className="h-11 sm:h-9 px-4 text-xs font-semibold cursor-pointer"
                      >
                        {savingPixel ? "Salvando..." : editingPixelId ? "Atualizar Pixel" : "Salvar Pixel"}
                      </Button>
                    </div>
                  </div>
                </form>
              )}

              {src.pixels.length > 0 && (
                <div className="space-y-2">
                  {src.pixels.map((px) => (
                    <div
                      key={px.id}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-muted/20 px-3 py-2"
                    >
                      <div className="min-w-0 space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-xs font-bold text-foreground">{px.name}</span>
                          <span className="font-mono text-xs text-muted-foreground">#{px.external_pixel_id}</span>
                          {px.is_default && (
                            <Badge variant="outline" className="text-2xs">Padrão</Badge>
                          )}
                          {px.capi_token_configured && (
                            <Badge variant="outline" className="text-2xs text-emerald-600 border-emerald-500/30 gap-1">
                              <CheckCircle2 className="size-3" />
                              CAPI Cofre
                            </Badge>
                          )}
                          {typeof px.events_24h === "number" && (
                            <span className="text-2xs text-muted-foreground font-mono">
                              {px.events_24h} ev/24h
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {px.provider === "meta_pixel" && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={testingPixelId === px.id}
                            onClick={() => void handleTestPixel(px)}
                            className="h-11 sm:h-8 px-3 text-xs font-semibold gap-2 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                          >
                            <Radio className={cn("size-3.5", testingPixelId === px.id && "animate-pulse motion-reduce:animate-none text-primary")} />
                            <span>{testingPixelId === px.id ? "Testando..." : "Testar CAPI"}</span>
                          </Button>
                        )}
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => openPixelEditor(src.id, px)}
                          className="h-11 sm:h-8 px-2 text-xs cursor-pointer"
                        >
                          Editar
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => void handleDeletePixel(src.id, px.id)}
                          aria-label={`Remover pixel ${px.name}`}
                          className="h-11 w-11 sm:h-8 sm:w-8 p-0 text-muted-foreground hover:text-destructive cursor-pointer"
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
