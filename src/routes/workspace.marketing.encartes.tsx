import React, { useState, useRef } from "react";
import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import {
  Plus,
  Flame,
  Clock,
  Sparkles,
  ShoppingBag,
  Eye,
  Edit3,
  Trash2,
  Calendar,
  Tag,
  Check,
  Search,
  ExternalLink,
  Layers,
  ArrowRight,
  AlertCircle,
  Copy,
  ChevronRight,
  Store,
  RefreshCw,
} from "lucide-react";
import {
  listStoreFlyersAdmin,
  createStoreFlyer,
  updateStoreFlyer,
  deleteStoreFlyer,
  type StoreFlyerDTO,
  type FlyerHotspotDTO,
  type FlyerTheme,
} from "@/services/store-flyers.functions";
import { listPublishedProducts } from "@/services/catalog.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { MediaUploader } from "@/components/ui/media-uploader";
import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { FlyerInteractiveViewerModal } from "@/components/commerce/flyers/flyer-interactive-viewer-modal";

export const Route = createFileRoute("/workspace/marketing/encartes")({
  head: () => ({
    meta: [
      {
        title: "Encartes & Tabloides da Semana | Workspace Waesy",
      },
      {
        name: "description",
        content:
          "Gerencie encartes semanais, tabloides e folhetos de ofertas de supermercados, atacados e conveniências com hotspots interativos e compra em 1 clique.",
      },
    ],
  }),
  loader: async () => {
    try {
      const [flyersRes, productsRes] = await Promise.all([
        listStoreFlyersAdmin().catch((err) => {
          console.error("[loader:encartes] listStoreFlyersAdmin error:", err);
          return [];
        }),
        listPublishedProducts({ data: { limit: 100 } }).catch((err) => {
          console.error("[loader:encartes] listPublishedProducts error:", err);
          return { products: [] };
        }),
      ]);

      return {
        flyers: flyersRes || [],
        products: (productsRes as any)?.products || [],
      };
    } catch (err) {
      console.error("[loader:workspace.marketing.encartes] Unhandled error:", err);
      return { flyers: [], products: [] };
    }
  },
  component: WorkspaceMarketingEncartesPage,
});

export default function WorkspaceMarketingEncartesPage() {
  const { flyers, products } = Route.useLoaderData();
  const router = useRouter();

  // Filtro de abas
  const [activeTab, setActiveTab] = useState<"ativos" | "agendados" | "expirados" | "todos">("ativos");

  // Estado do Modal de Criação / Edição
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingFlyer, setEditingFlyer] = useState<StoreFlyerDTO | null>(null);

  // Campos do formulário
  const [formTitle, setFormTitle] = useState("");
  const [formSubtitle, setFormSubtitle] = useState("");
  const [formImageUrl, setFormImageUrl] = useState("");
  const [formTheme, setFormTheme] = useState<FlyerTheme>("retro_mercado");
  const [formValidFrom, setFormValidFrom] = useState("");
  const [formValidUntil, setFormValidUntil] = useState("");
  const [formBadgeText, setFormBadgeText] = useState("OFERTAÇO");
  const [formHotspots, setFormHotspots] = useState<FlyerHotspotDTO[]>([]);

  // Estado de submissão
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Estado de seleção de produto para hotspot no canvas
  const [pendingPinCoords, setPendingPinCoords] = useState<{ x: number; y: number } | null>(null);
  const [isProductPickerOpen, setIsProductPickerOpen] = useState(false);
  const [productSearch, setProductSearch] = useState("");

  // Preview da Vitrine
  const [previewFlyer, setPreviewFlyer] = useState<StoreFlyerDTO | null>(null);

  // Referência do elemento de imagem para cálculo de porcentagem dos pins
  const imageCanvasRef = useRef<HTMLImageElement>(null);

  // Filtragem dos encartes por aba
  const filteredFlyers = flyers.filter((f) => {
    if (activeTab === "todos") return true;
    if (activeTab === "ativos") return f.status_badge === "active";
    if (activeTab === "agendados") return f.status_badge === "scheduled";
    if (activeTab === "expirados") return f.status_badge === "expired";
    return true;
  });

  const activeCount = flyers.filter((f) => f.status_badge === "active").length;
  const scheduledCount = flyers.filter((f) => f.status_badge === "scheduled").length;
  const expiredCount = flyers.filter((f) => f.status_badge === "expired").length;

  // Abrir editor para novo encarte
  const handleOpenCreate = () => {
    setEditingFlyer(null);
    setFormTitle("");
    setFormSubtitle("");
    setFormImageUrl("");
    setFormTheme("retro_mercado");

    // Padrão: Início agora, término em 7 dias (padrão de encarte semanal de supermercado)
    const now = new Date();
    const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    setFormValidFrom(now.toISOString().slice(0, 16));
    setFormValidUntil(nextWeek.toISOString().slice(0, 16));
    setFormBadgeText("OFERTAÇO");
    setFormHotspots([]);
    setIsEditorOpen(true);
  };

  // Abrir editor para editar encarte existente
  const handleOpenEdit = (flyer: StoreFlyerDTO) => {
    setEditingFlyer(flyer);
    setFormTitle(flyer.title);
    setFormSubtitle(flyer.subtitle || "");
    setFormImageUrl(flyer.image_url);
    setFormTheme(flyer.theme);
    setFormValidFrom(flyer.valid_from ? new Date(flyer.valid_from).toISOString().slice(0, 16) : "");
    setFormValidUntil(flyer.valid_until ? new Date(flyer.valid_until).toISOString().slice(0, 16) : "");
    setFormBadgeText((flyer as any).badge_text || "OFERTAÇO");
    setFormHotspots(flyer.hotspots || []);
    setIsEditorOpen(true);
  };

  // Renovar encarte expirado em 1 clique
  const handleRenewFlyer = async (flyer: StoreFlyerDTO) => {
    const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    try {
      await updateStoreFlyer({
        data: {
          id: flyer.id,
          validFrom: new Date().toISOString(),
          validUntil: nextWeek,
          status: "active",
        },
      });
      toast.success(`Encarte "${flyer.title}" renovado por mais 7 dias!`);
      await router.invalidate();
    } catch (err: any) {
      toast.error(err?.message || "Erro ao renovar encarte.");
    }
  };

  // Excluir encarte
  const handleDeleteFlyer = async (flyerId: string, title: string) => {
    if (!confirm(`Deseja realmente excluir o encarte "${title}"?`)) return;

    try {
      await deleteStoreFlyer({ data: { id: flyerId } });
      toast.success("Encarte excluído com sucesso.");
      await router.invalidate();
    } catch (err: any) {
      toast.error(err?.message || "Erro ao excluir encarte.");
    }
  };

  // Clique na imagem para marcar produto
  const handleImageClick = (e: React.MouseEvent<HTMLImageElement>) => {
    const img = imageCanvasRef.current;
    if (!img) return;

    const rect = img.getBoundingClientRect();
    const x = Math.round(((e.clientX - rect.left) / rect.width) * 100);
    const y = Math.round(((e.clientY - rect.top) / rect.height) * 100);

    const clampedX = Math.max(0, Math.min(100, x));
    const clampedY = Math.max(0, Math.min(100, y));

    setPendingPinCoords({ x: clampedX, y: clampedY });
    setProductSearch("");
    setIsProductPickerOpen(true);
  };

  // Vincular produto selecionado ao pin
  const handleSelectProductForPin = (product: any) => {
    if (!pendingPinCoords) return;

    const newHotspot: FlyerHotspotDTO = {
      id: Math.random().toString(36).substring(2, 9),
      x_percent: pendingPinCoords.x,
      y_percent: pendingPinCoords.y,
      product_id: product.id,
      custom_label: product.title,
      price_override_cents: product.promotional_price_cents || product.price_cents,
      product: {
        id: product.id,
        title: product.title,
        price_cents: product.price_cents,
        promotional_price_cents: product.promotional_price_cents,
        slug: product.slug,
        image_url: Array.isArray(product.images) && product.images.length > 0 ? product.images[0] : null,
      },
    };

    setFormHotspots((prev) => [...prev, newHotspot]);
    setIsProductPickerOpen(false);
    setPendingPinCoords(null);
    toast.success(`Oferta de "${product.title}" vinculada ao ponto!`);
  };

  // Remover hotspot
  const handleRemoveHotspot = (id: string) => {
    setFormHotspots((prev) => prev.filter((h) => h.id !== id));
  };

  // Salvar formulário
  const handleSubmitFlyer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) {
      toast.error("Informe o título do encarte.");
      return;
    }
    if (!formImageUrl.trim()) {
      toast.error("Adicione a imagem do encarte.");
      return;
    }

    setIsSubmitting(true);
    try {
      const sanitizedHotspots = formHotspots.map((h) => ({
        id: h.id,
        x_percent: h.x_percent,
        y_percent: h.y_percent,
        product_id: h.product_id,
        custom_label: h.custom_label,
        price_override_cents: h.price_override_cents,
      }));

      if (editingFlyer) {
        await updateStoreFlyer({
          data: {
            id: editingFlyer.id,
            title: formTitle,
            subtitle: formSubtitle || null,
            imageUrl: formImageUrl,
            theme: formTheme,
            validFrom: formValidFrom ? new Date(formValidFrom).toISOString() : undefined,
            validUntil: formValidUntil ? new Date(formValidUntil).toISOString() : null,
            hotspots: sanitizedHotspots,
          },
        });
        toast.success("Encarte atualizado com sucesso!");
      } else {
        await createStoreFlyer({
          data: {
            title: formTitle,
            subtitle: formSubtitle || null,
            imageUrl: formImageUrl,
            theme: formTheme,
            validFrom: formValidFrom ? new Date(formValidFrom).toISOString() : undefined,
            validUntil: formValidUntil ? new Date(formValidUntil).toISOString() : null,
            hotspots: sanitizedHotspots,
          },
        });
        toast.success("Encarte publicado com sucesso na vitrine!");
      }

      setIsEditorOpen(false);
      await router.invalidate();
    } catch (err: any) {
      toast.error(err?.message || "Erro ao salvar encarte.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredCatalog = products.filter((p: any) =>
    productSearch ? p.title.toLowerCase().includes(productSearch.toLowerCase()) : true
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* ─── Header Canônico do Módulo ─────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/60 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-foreground flex items-center gap-2">
              <Flame className="size-6 text-red-600 fill-red-600 shrink-0" />
              <span>Encartes & Tabloides Promocionais</span>
            </h1>
            <Badge variant="outline" className="text-xs font-semibold uppercase tracking-wider">
              Varejo & Mercados
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1 font-medium">
            Publique encartes da semana, tabloides de ofertas e folhetos verticais com produtos vinculados em 1 clique.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            onClick={handleOpenCreate}
            className="h-10 px-4 rounded-xl font-bold text-xs gap-2 cursor-pointer shadow-sm bg-red-600 hover:bg-red-700 text-white"
          >
            <Plus className="size-4" />
            <span>Novo Encarte da Semana</span>
          </Button>
        </div>
      </div>

      {/* ─── Cards de Estatísticas / Métricas de Vigência ─────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 rounded-2xl bg-card border border-border/60 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-muted-foreground text-xs font-semibold">
            <span>Encartes Ativos</span>
            <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
          </div>
          <p className="text-2xl font-black text-foreground">{activeCount}</p>
          <p className="text-[11px] text-muted-foreground">Exibidos na vitrine agora</p>
        </div>

        <div className="p-4 rounded-2xl bg-card border border-border/60 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-muted-foreground text-xs font-semibold">
            <span>Agendados</span>
            <Clock className="size-3.5 text-blue-500" />
          </div>
          <p className="text-2xl font-black text-foreground">{scheduledCount}</p>
          <p className="text-[11px] text-muted-foreground">Iniciam em datas futuras</p>
        </div>

        <div className="p-4 rounded-2xl bg-card border border-border/60 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-muted-foreground text-xs font-semibold">
            <span>Expirados</span>
            <Clock className="size-3.5 text-muted-foreground" />
          </div>
          <p className="text-2xl font-black text-foreground">{expiredCount}</p>
          <p className="text-[11px] text-muted-foreground">Ocultos automaticamente</p>
        </div>

        <div className="p-4 rounded-2xl bg-card border border-border/60 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-muted-foreground text-xs font-semibold">
            <span>Interações</span>
            <ShoppingBag className="size-3.5 text-amber-500" />
          </div>
          <p className="text-2xl font-black text-foreground">
            {flyers.reduce((acc, f) => acc + (f.clicks_count || 0), 0)}
          </p>
          <p className="text-[11px] text-muted-foreground">Cliques em produtos vinculados</p>
        </div>
      </div>

      {/* ─── Navegação por Abas (Ativos, Agendados, Expirados, Todos) ──── */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="space-y-4">
        <TabsList className="bg-muted/60 p-1 rounded-xl h-10 border border-border/40">
          <TabsTrigger value="ativos" className="rounded-lg text-xs font-bold gap-1.5 cursor-pointer">
            <span className="size-2 rounded-full bg-emerald-500" />
            <span>Ativos ({activeCount})</span>
          </TabsTrigger>
          <TabsTrigger value="agendados" className="rounded-lg text-xs font-bold gap-1.5 cursor-pointer">
            <span>Agendados ({scheduledCount})</span>
          </TabsTrigger>
          <TabsTrigger value="expirados" className="rounded-lg text-xs font-bold gap-1.5 cursor-pointer">
            <span>Expirados ({expiredCount})</span>
          </TabsTrigger>
          <TabsTrigger value="todos" className="rounded-lg text-xs font-bold gap-1.5 cursor-pointer">
            <span>Todos ({flyers.length})</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="space-y-4 m-0">
          {filteredFlyers.length === 0 ? (
            <div className="py-16 text-center border border-dashed border-border/80 rounded-2xl p-8 space-y-3 bg-muted/20">
              <div className="size-12 rounded-full bg-red-500/10 text-red-600 flex items-center justify-center mx-auto">
                <Flame className="size-6" />
              </div>
              <h3 className="text-base font-bold text-foreground">
                Nenhum encarte encontrado nesta aba
              </h3>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                Crie um novo encarte semanal para atrair clientes locais com ofertas limitadas no estilo folheto de supermercado.
              </p>
              <Button
                onClick={handleOpenCreate}
                variant="outline"
                className="h-9 px-4 rounded-xl text-xs font-bold gap-1.5 cursor-pointer mt-2"
              >
                <Plus className="size-4" />
                <span>Criar Primeiro Encarte</span>
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredFlyers.map((flyer) => {
                const isRetro = flyer.theme === "retro_mercado";
                const hotspotsCount = Array.isArray(flyer.hotspots) ? flyer.hotspots.length : 0;

                return (
                  <div
                    key={flyer.id}
                    className={cn(
                      "rounded-2xl border overflow-hidden flex flex-col justify-between transition-all bg-card shadow-xs",
                      isRetro ? "border-amber-400/80 bg-amber-50/20 dark:bg-amber-950/10" : "border-border/60"
                    )}
                  >
                    {/* Header do Card com Status & Badges */}
                    <div className="p-3.5 pb-2 flex items-center justify-between gap-2 border-b border-border/40">
                      <div className="flex items-center gap-1.5">
                        {flyer.status_badge === "active" && (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold flex items-center gap-1">
                            <span className="size-1.5 rounded-full bg-emerald-500" />
                            <span>Ativo</span>
                          </span>
                        )}
                        {flyer.status_badge === "scheduled" && (
                          <span className="px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 text-[10px] font-bold">
                            Agendado
                          </span>
                        )}
                        {flyer.status_badge === "expired" && (
                          <span className="px-2 py-0.5 rounded-full bg-zinc-500/10 text-zinc-500 text-[10px] font-bold">
                            Expirado
                          </span>
                        )}

                        <span
                          className={cn(
                            "px-2 py-0.5 rounded text-[10px] font-bold",
                            isRetro
                              ? "bg-amber-300 text-red-950 font-black"
                              : "bg-muted text-muted-foreground"
                          )}
                        >
                          {isRetro ? "🎨 Retrô Mercadista" : "✨ Clean"}
                        </span>
                      </div>

                      <div className="flex items-center gap-1 text-[11px] text-muted-foreground font-semibold">
                        <Eye className="size-3" />
                        <span>{flyer.views_count} vistas</span>
                      </div>
                    </div>

                    {/* Corpo com Miniatura & Informações */}
                    <div className="p-3.5 flex gap-3.5 items-start">
                      <div className="relative w-20 h-28 rounded-xl overflow-hidden bg-muted/40 border border-border/60 shrink-0 group">
                        <img
                          src={flyer.image_url}
                          alt={flyer.title}
                          className="size-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => setPreviewFlyer(flyer)}
                          className="absolute inset-0 bg-black/50 text-white opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity cursor-pointer"
                          title="Pré-visualizar na Vitrine"
                        >
                          <Eye className="size-5" />
                        </button>
                      </div>

                      <div className="min-w-0 flex-1 space-y-1.5">
                        <h3 className="text-sm font-bold text-foreground line-clamp-1 leading-snug">
                          {flyer.title}
                        </h3>
                        {flyer.subtitle && (
                          <p className="text-xs text-muted-foreground line-clamp-1">{flyer.subtitle}</p>
                        )}

                        <div className="text-[11px] text-muted-foreground space-y-0.5 pt-1">
                          <div className="flex items-center gap-1">
                            <Clock className="size-3 text-primary shrink-0" />
                            <span className="font-semibold text-foreground">
                              {flyer.time_left_display || "Sem limite definido"}
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Tag className="size-3 text-emerald-500 shrink-0" />
                            <span>
                              {hotspotsCount} {hotspotsCount === 1 ? "produto vinculado" : "produtos vinculados"}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Rodapé com Ações Diretas */}
                    <div className="p-3 bg-muted/20 border-t border-border/40 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setPreviewFlyer(flyer)}
                          className="h-8 px-2.5 rounded-lg text-xs font-semibold gap-1 cursor-pointer"
                        >
                          <Eye className="size-3.5" />
                          <span>Ver</span>
                        </Button>

                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleOpenEdit(flyer)}
                          className="h-8 px-2.5 rounded-lg text-xs font-semibold gap-1 cursor-pointer border-border/60"
                        >
                          <Edit3 className="size-3.5" />
                          <span>Editar</span>
                        </Button>
                      </div>

                      <div className="flex items-center gap-1">
                        {flyer.status_badge === "expired" && (
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => handleRenewFlyer(flyer)}
                            className="h-8 px-2.5 rounded-lg text-xs font-bold gap-1 cursor-pointer text-emerald-600 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40"
                            title="Renovar encarte por mais 7 dias"
                          >
                            <RefreshCw className="size-3.5" />
                            <span>Renovar</span>
                          </Button>
                        )}

                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handleDeleteFlyer(flyer.id, flyer.title)}
                          className="size-8 rounded-lg text-muted-foreground hover:text-red-600 cursor-pointer"
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* ─── Modal Drawer de Criação & Edição de Encarte ──────────────── */}
      <Dialog open={isEditorOpen} onOpenChange={setIsEditorOpen}>
        <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto sm:rounded-2xl p-5 sm:p-6 space-y-4">
          <DialogHeader className="pb-2 border-b border-border/60">
            <DialogTitle className="text-lg font-black flex items-center gap-2">
              <Flame className="size-5 text-red-600" />
              <span>{editingFlyer ? "Editar Encarte de Ofertas" : "Novo Encarte da Semana"}</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Configure a imagem vertical, defina o período de validade automática e vincule produtos com botões redondos de compra.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmitFlyer} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Título do Encarte *
                </label>
                <Input
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="Ex: Quarta e Quinta do Hortifrúti, Encarte de Carnes..."
                  required
                  className="h-10 rounded-xl text-xs font-medium"
                />
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Subtítulo / Descrição Rápida (Opcional)
                </label>
                <Input
                  value={formSubtitle}
                  onChange={(e) => setFormSubtitle(e.target.value)}
                  placeholder="Ex: Ofertas válidas enquanto durarem os estoques em toda a rede."
                  className="h-10 rounded-xl text-xs"
                />
              </div>

              {/* Seletor de Tema Visual */}
              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Estilo Visual do Encarte
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                  <div
                    onClick={() => setFormTheme("retro_mercado")}
                    className={cn(
                      "p-3 rounded-xl border-2 cursor-pointer transition-all flex items-start gap-3",
                      formTheme === "retro_mercado"
                        ? "border-red-600 bg-amber-100/60 dark:bg-amber-950/30 text-red-950 dark:text-amber-100"
                        : "border-border/60 hover:border-foreground/30"
                    )}
                  >
                    <div className="size-4 rounded-full border-2 border-red-600 flex items-center justify-center mt-0.5 shrink-0">
                      {formTheme === "retro_mercado" && <div className="size-2 rounded-full bg-red-600" />}
                    </div>
                    <div>
                      <h4 className="text-xs font-black uppercase tracking-tight">
                        🎨 Retrô Mercadista (Cartazista Antigo)
                      </h4>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        Amarelo vibrante com tipografia e bordas de pincel vermelho das mercearias e feiras clássicas.
                      </p>
                    </div>
                  </div>

                  <div
                    onClick={() => setFormTheme("clean")}
                    className={cn(
                      "p-3 rounded-xl border-2 cursor-pointer transition-all flex items-start gap-3",
                      formTheme === "clean"
                        ? "border-primary bg-primary/5 text-foreground"
                        : "border-border/60 hover:border-foreground/30"
                    )}
                  >
                    <div className="size-4 rounded-full border-2 border-primary flex items-center justify-center mt-0.5 shrink-0">
                      {formTheme === "clean" && <div className="size-2 rounded-full bg-primary" />}
                    </div>
                    <div>
                      <h4 className="text-xs font-bold">✨ Clean & Editorial (Moderno)</h4>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        Bordas finas, superfícies neutras, minimalismo padrão Apple HIG e alta nitidez.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Período de Validade com Expiração Automática */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Calendar className="size-3.5 text-primary" />
                  <span>Válido a partir de *</span>
                </label>
                <Input
                  type="datetime-local"
                  value={formValidFrom}
                  onChange={(e) => setFormValidFrom(e.target.value)}
                  required
                  className="h-10 rounded-xl text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Clock className="size-3.5 text-red-500" />
                  <span>Válido até (Expiração Automática)</span>
                </label>
                <Input
                  type="datetime-local"
                  value={formValidUntil}
                  onChange={(e) => setFormValidUntil(e.target.value)}
                  className="h-10 rounded-xl text-xs"
                />
                <p className="text-[10px] text-muted-foreground">
                  Após esta data, o encarte sairá do ar automaticamente da vitrine pública.
                </p>
              </div>

              {/* Upload da Imagem do Encarte */}
              <div className="space-y-2 sm:col-span-2">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Imagem do Encarte (Vertical 3:4 ou 9:16) *
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <MediaUploader
                      bucket="classifieds"
                      accept="image"
                      maxFiles={1}
                      label="Subir imagem do encarte"
                      onChange={(urls) => {
                        if (urls && urls[0]) setFormImageUrl(urls[0]);
                      }}
                    />
                    <div className="text-[11px] text-muted-foreground">
                      Ou insira a URL direta da imagem:
                    </div>
                    <Input
                      value={formImageUrl}
                      onChange={(e) => setFormImageUrl(e.target.value)}
                      placeholder="https://exemplo.com/encarte.jpg"
                      className="h-9 rounded-xl text-xs"
                    />
                  </div>

                  {/* Prévia da Imagem */}
                  <div className="flex items-center justify-center p-2 rounded-xl bg-muted/40 border border-border/60 min-h-36">
                    {formImageUrl ? (
                      <img
                        src={formImageUrl}
                        alt="Prévia do encarte"
                        className="max-h-48 object-contain rounded-lg shadow-sm"
                      />
                    ) : (
                      <div className="text-center space-y-1 text-muted-foreground">
                        <Flame className="size-8 mx-auto opacity-30" />
                        <p className="text-xs font-medium">Nenhuma imagem carregada</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* ─── Ferramenta Visual de Marcação de Produtos (Hotspots) ─── */}
              {formImageUrl && (
                <div className="space-y-3 sm:col-span-2 border-t border-border/60 pt-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-xs font-black uppercase tracking-wider text-foreground flex items-center gap-1.5">
                        <Tag className="size-4 text-emerald-500" />
                        <span>Vincular Produtos com Botão Redondo (Estilo Instagram)</span>
                      </h3>
                      <p className="text-[11px] text-muted-foreground">
                        Clique diretamente sobre a imagem do encarte abaixo onde o produto aparece para adicionar o botão de compra.
                      </p>
                    </div>
                    <span className="text-xs font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-md">
                      {formHotspots.length} vinculados
                    </span>
                  </div>

                  {/* Canvas Interativo do Encarte */}
                  <div className="relative inline-block mx-auto max-w-full overflow-hidden rounded-2xl border border-border/80 bg-black/90 p-2 sm:p-4 select-none cursor-crosshair">
                    <div className="relative inline-block">
                      <img
                        ref={imageCanvasRef}
                        src={formImageUrl}
                        alt="Canvas de marcação de hotspots"
                        onClick={handleImageClick}
                        className="max-h-[500px] w-auto object-contain rounded-xl select-none"
                      />

                      {/* Pins já posicionados */}
                      {formHotspots.map((spot, idx) => (
                        <div
                          key={spot.id || idx}
                          style={{
                            left: `${spot.x_percent}%`,
                            top: `${spot.y_percent}%`,
                          }}
                          className="absolute -translate-x-1/2 -translate-y-1/2 z-20 group"
                        >
                          <div className="size-8 rounded-full bg-red-600 text-amber-300 border-2 border-amber-300 flex items-center justify-center font-black text-[11px] shadow-lg">
                            {idx + 1}
                          </div>

                          {/* Tooltip do produto no hover com botão de excluir */}
                          <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-1 hidden group-hover:flex items-center gap-1.5 px-2 py-1 bg-black/90 text-white text-[10px] font-bold rounded shadow-lg whitespace-nowrap z-30">
                            <span>{spot.custom_label || spot.product?.title || "Produto"}</span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRemoveHotspot(spot.id);
                              }}
                              className="text-red-400 hover:text-red-200 cursor-pointer ml-1"
                            >
                              <Trash2 className="size-3" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Lista de Produtos Vinculados */}
                  {formHotspots.length > 0 && (
                    <div className="space-y-2 pt-2">
                      <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                        Lista de Produtos Marcados:
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {formHotspots.map((h, index) => (
                          <div
                            key={h.id}
                            className="flex items-center justify-between p-2 rounded-xl bg-muted/40 border border-border/60 text-xs"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="size-5 rounded-full bg-red-600 text-white text-[10px] font-bold flex items-center justify-center shrink-0">
                                {index + 1}
                              </span>
                              <div className="min-w-0">
                                <p className="font-bold truncate text-foreground">
                                  {h.custom_label || h.product?.title || "Produto vinculado"}
                                </p>
                                {h.price_override_cents && (
                                  <p className="text-[10px] text-emerald-600 font-semibold">
                                    {formatMoney(h.price_override_cents)}
                                  </p>
                                )}
                              </div>
                            </div>
                            <Button
                              type="button"
                              size="icon"
                              variant="ghost"
                              onClick={() => handleRemoveHotspot(h.id)}
                              className="size-7 rounded text-muted-foreground hover:text-red-600 cursor-pointer shrink-0"
                            >
                              <Trash2 className="size-3.5" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            <DialogFooter className="pt-4 border-t border-border/60 flex items-center justify-between sm:justify-between">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setIsEditorOpen(false)}
                className="h-10 px-4 rounded-xl text-xs font-semibold cursor-pointer"
              >
                Cancelar
              </Button>

              <Button
                type="submit"
                disabled={isSubmitting}
                className="h-10 px-5 rounded-xl text-xs font-bold gap-2 cursor-pointer bg-red-600 hover:bg-red-700 text-white shadow-sm"
              >
                {isSubmitting ? (
                  <span>Salvando...</span>
                ) : (
                  <>
                    <Check className="size-4" />
                    <span>{editingFlyer ? "Salvar Alterações" : "Publicar Encarte na Vitrine"}</span>
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ─── Modal Seletor de Produto do Catálogo para o Ponto Marcado ─── */}
      <Dialog open={isProductPickerOpen} onOpenChange={setIsProductPickerOpen}>
        <DialogContent className="max-w-md sm:rounded-2xl p-5 space-y-3">
          <DialogHeader className="pb-1">
            <DialogTitle className="text-sm font-bold flex items-center gap-2">
              <ShoppingBag className="size-4 text-primary" />
              <span>Selecione o Produto para este Ponto</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Escolha qual item do seu catálogo corresponde à foto do encarte.
            </DialogDescription>
          </DialogHeader>

          {/* Campo de Busca Rápida */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
            <Input
              value={productSearch}
              onChange={(e) => setProductSearch(e.target.value)}
              placeholder="Buscar pelo nome do produto..."
              className="h-9 pl-8 rounded-xl text-xs"
            />
          </div>

          {/* Lista com Rolagem dos Produtos Cadastrados */}
          <div className="max-h-60 overflow-y-auto space-y-1.5 pr-1">
            {filteredCatalog.length === 0 ? (
              <div className="py-8 text-center text-xs text-muted-foreground">
                Nenhum produto encontrado. Cadastre produtos no seu catálogo para vinculá-los.
              </div>
            ) : (
              filteredCatalog.map((prod: any) => (
                <div
                  key={prod.id}
                  onClick={() => handleSelectProductForPin(prod)}
                  className="p-2 rounded-xl border border-border/60 hover:border-primary hover:bg-primary/5 cursor-pointer flex items-center justify-between gap-3 transition-colors"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    {Array.isArray(prod.images) && prod.images[0] ? (
                      <img
                        src={prod.images[0]}
                        alt={prod.title}
                        className="size-9 rounded-lg object-cover bg-muted shrink-0"
                      />
                    ) : (
                      <div className="size-9 rounded-lg bg-muted flex items-center justify-center shrink-0">
                        <ShoppingBag className="size-4 text-muted-foreground" />
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-foreground truncate">{prod.title}</p>
                      <p className="text-[11px] font-semibold text-emerald-600">
                        {formatMoney(prod.promotional_price_cents || prod.price_cents)}
                      </p>
                    </div>
                  </div>

                  <Button size="sm" variant="ghost" className="h-7 text-xs font-bold text-primary shrink-0">
                    Selecionar
                  </Button>
                </div>
              ))
            )}
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setIsProductPickerOpen(false);
                setPendingPinCoords(null);
              }}
              className="h-8 rounded-xl text-xs"
            >
              Cancelar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Preview da Vitrine em Modal Interativo ─────────────────── */}
      {previewFlyer && (
        <FlyerInteractiveViewerModal
          open={!!previewFlyer}
          onOpenChange={(open) => {
            if (!open) setPreviewFlyer(null);
          }}
          flyers={[previewFlyer]}
          initialFlyerIndex={0}
          storeName="Sua Loja"
        />
      )}
    </div>
  );
}
