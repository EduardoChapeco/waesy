import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  Flame,
  Plus,
  Percent,
  RefreshCw,
  Tag,
  Loader2,
  Ticket,
  Copy,
  Trash2,
  Calendar,
  Check,
  DollarSign,
  Truck,
} from "lucide-react";
import { PageHeader } from "@/components/commerce/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { SheetPage } from "@/components/ui/sheet-page";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  listStorePromotions,
  createPromotion,
  togglePromotionStatus,
  type PromotionDTO,
} from "@/services/promotions.functions";
import {
  listCoupons,
  upsertCoupon,
  deleteCoupon,
} from "@/services/growth.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/workspace/marketing/promocoes")({
  head: () => ({
    meta: [{ title: "Promoções & Cupons | Workspace Waesy" }],
  }),
  loader: async () => {
    try {
      const [promotions, coupons] = await Promise.all([
        listStorePromotions().catch(() => []),
        listCoupons().catch(() => []),
      ]);
      return { promotions, coupons };
    } catch (err) {
      console.error("[loader:workspace.marketing.promocoes] Unhandled loader error:", err);
      return { promotions: [], coupons: [] };
    }
  },
  component: WorkspacePromotionsPage,
});

function WorkspacePromotionsPage() {
  const { promotions: initialPromos, coupons: initialCoupons } =
    ((Route.useLoaderData?.() as any) || {});

  const [activeTab, setActiveTab] = useState<"promotions" | "coupons">("promotions");
  const [promos, setPromos] = useState<PromotionDTO[]>(initialPromos || []);
  const [couponsList, setCouponsList] = useState<any[]>(initialCoupons || []);

  // Modal Promoções State
  const [isPromoOpen, setIsPromoOpen] = useState(false);
  const [isPromoSubmitting, setIsPromoSubmitting] = useState(false);
  const [promoTitle, setPromoTitle] = useState("");
  const [promoDescription, setPromoDescription] = useState("");
  const [promoType, setPromoType] = useState<PromotionDTO["type"]>("flash_offer");
  const [promoDiscountPercent, setPromoDiscountPercent] = useState<number>(20);
  const [promoBuyQty, setPromoBuyQty] = useState<number>(2);
  const [promoGetQty, setPromoGetQty] = useState<number>(1);
  const [promoDurationHours, setPromoDurationHours] = useState<number>(24);

  // Modal Cupons State
  const [isCouponOpen, setIsCouponOpen] = useState(false);
  const [isCouponSubmitting, setIsCouponSubmitting] = useState(false);
  const [couponCode, setCouponCode] = useState("");
  const [discountType, setDiscountType] = useState<"percentage" | "fixed_amount" | "free_shipping">("percentage");
  const [discountValue, setDiscountValue] = useState<number>(10);
  const [minOrderReais, setMinOrderReais] = useState<string>("");
  const [maxUses, setMaxUses] = useState<string>("");
  const [expiresAt, setExpiresAt] = useState<string>("");
  const [couponActive, setCouponActive] = useState(true);
  const [copiedCouponId, setCopiedCouponId] = useState<string | null>(null);

  // ── HANDLERS DE PROMOÇÕES ────────────────────────────────────────────────
  const handleCreatePromo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!promoTitle.trim()) {
      toast.error("Informe o título da promoção.");
      return;
    }

    setIsPromoSubmitting(true);
    try {
      await createPromotion({
        data: {
          title: promoTitle,
          description: promoDescription || undefined,
          type: promoType,
          discount_percent:
            promoType === "flash_offer" || promoType === "percentage_discount"
              ? promoDiscountPercent
              : undefined,
          buy_qty: promoType === "buy_x_get_y" ? promoBuyQty : 1,
          get_qty: promoType === "buy_x_get_y" ? promoGetQty : 1,
          duration_hours: promoDurationHours,
        },
      });

      toast.success("Promoção criada com sucesso!");
      setIsPromoOpen(false);
      const updated = await listStorePromotions();
      setPromos(updated);
      setPromoTitle("");
      setPromoDescription("");
    } catch {
      toast.error("Erro ao salvar promoção.");
    } finally {
      setIsPromoSubmitting(false);
    }
  };

  const handleTogglePromo = async (id: string, currentStatus: boolean) => {
    try {
      await togglePromotionStatus({ data: { promotionId: id, is_active: !currentStatus } });
      setPromos((prev) =>
        prev.map((p) => (p.id === id ? { ...p, is_active: !currentStatus } : p)),
      );
      toast.success(currentStatus ? "Promoção pausada." : "Promoção reativada!");
    } catch {
      toast.error("Erro ao alterar status da oferta.");
    }
  };

  // ── HANDLERS DE CUPONS ───────────────────────────────────────────────────
  const handleCreateCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = couponCode.trim().toUpperCase();
    if (!cleanCode || cleanCode.length < 3) {
      toast.error("O código do cupom deve ter no mínimo 3 caracteres.");
      return;
    }

    setIsCouponSubmitting(true);
    try {
      const minCents = minOrderReais ? Math.round(parseFloat(minOrderReais) * 100) : null;
      const usesLimit = maxUses ? parseInt(maxUses, 10) : null;

      await upsertCoupon({
        data: {
          code: cleanCode,
          discount_type: discountType,
          discount_value: discountType === "free_shipping" ? 0 : Number(discountValue),
          min_order_cents: minCents,
          max_uses: usesLimit,
          expires_at: expiresAt ? new Date(expiresAt).toISOString() : null,
          is_active: couponActive,
        },
      });

      toast.success(`Cupom ${cleanCode} criado com sucesso!`);
      setIsCouponOpen(false);
      const updatedCoupons = await listCoupons();
      setCouponsList(updatedCoupons || []);

      // Reset form
      setCouponCode("");
      setDiscountType("percentage");
      setDiscountValue(10);
      setMinOrderReais("");
      setMaxUses("");
      setExpiresAt("");
      setCouponActive(true);
    } catch (err: any) {
      toast.error(err?.message || "Erro ao salvar cupom.");
    } finally {
      setIsCouponSubmitting(false);
    }
  };

  const handleToggleCoupon = async (coupon: any) => {
    try {
      await upsertCoupon({
        data: {
          id: coupon.id,
          code: coupon.code,
          discount_type: coupon.discount_type,
          discount_value: Number(coupon.discount_value),
          min_order_cents: coupon.min_order_cents,
          max_uses: coupon.max_uses,
          expires_at: coupon.expires_at,
          is_active: !coupon.is_active,
        },
      });
      setCouponsList((prev) =>
        prev.map((c) => (c.id === coupon.id ? { ...c, is_active: !coupon.is_active } : c)),
      );
      toast.success(coupon.is_active ? "Cupom desativado." : "Cupom ativado com sucesso!");
    } catch {
      toast.error("Erro ao alterar status do cupom.");
    }
  };

  const handleDeleteCoupon = async (id: string, code: string) => {
    if (!confirm(`Deseja realmente excluir o cupom ${code}? Esta ação não pode ser desfeita.`)) {
      return;
    }
    try {
      await deleteCoupon({ data: { id } });
      setCouponsList((prev) => prev.filter((c) => c.id !== id));
      toast.success(`Cupom ${code} excluído com sucesso.`);
    } catch {
      toast.error("Erro ao excluir cupom.");
    }
  };

  const copyCouponCode = (code: string, id: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCouponId(id);
    toast.success(`Código ${code} copiado para a área de transferência!`);
    setTimeout(() => setCopiedCouponId(null), 2000);
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-0 sm:px-0 space-y-6 pb-20 animate-in fade-in duration-200">
      {/* ── PageHeader Canônico ── */}
      <PageHeader
        eyebrow="Marketing"
        title="Promoções & Cupons"
        actions={
          <Button
            onClick={() => {
              if (activeTab === "promotions") {
                setIsPromoOpen(true);
              } else {
                setIsCouponOpen(true);
              }
            }}
            size="sm"
            className="rounded-xl font-bold bg-primary text-primary-foreground text-xs gap-1.5 h-9 px-4 cursor-pointer"
          >
            <Plus className="size-3.5" />
            <span>{activeTab === "promotions" ? "Nova Promoção" : "Novo Cupom"}</span>
          </Button>
        }
      />

      {/* ── Seletor de Abas no Paradigma Clean ── */}
      <div className="flex items-center gap-2 border-b border-border/60 pb-1">
        <button
          type="button"
          onClick={() => setActiveTab("promotions")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
            activeTab === "promotions"
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
          }`}
        >
          <Flame className="size-3.5" />
          <span>Ofertas & Promoções</span>
          <Badge variant="secondary" className="text-[10px] ml-1 px-1.5 py-0 h-4">
            {promos.length}
          </Badge>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("coupons")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
            activeTab === "coupons"
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
          }`}
        >
          <Ticket className="size-3.5" />
          <span>Cupons de Desconto</span>
          <Badge variant="secondary" className="text-[10px] ml-1 px-1.5 py-0 h-4">
            {couponsList.length}
          </Badge>
        </button>
      </div>

      {/* ── ABA 1: PROMOÇÕES & OFERTAS ──────────────────────────────────────── */}
      {activeTab === "promotions" && (
        <div className="space-y-6">
          {/* Métricas de Promoções */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-2xl bg-card border border-border/70 space-y-1 shadow-2xs">
              <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                Promoções Ativas
              </span>
              <div className="text-2xl font-mono font-bold text-foreground">
                {promos.filter((p) => p.is_active).length}
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-card border border-border/70 space-y-1 shadow-2xs">
              <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                Total de Ofertas Criadas
              </span>
              <div className="text-2xl font-mono font-bold text-foreground">{promos.length}</div>
            </div>

            <div className="p-4 rounded-2xl bg-card border border-border/70 space-y-1 shadow-2xs">
              <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                Desconto Médio Aplicado
              </span>
              <div className="text-2xl font-mono font-bold text-primary">
                {promos.length > 0
                  ? `${Math.round(
                      promos.reduce((acc, p) => acc + (p.discount_percent || 0), 0) /
                        Math.max(1, promos.length),
                    )}%`
                  : "0%"}
              </div>
            </div>
          </div>

          {/* Lista de Promoções */}
          <div className="space-y-3">
            {promos.length === 0 ? (
              <div className="py-12 text-center space-y-4 border border-dashed border-border/70 rounded-2xl bg-card/40">
                <div className="size-12 rounded-2xl bg-muted/60 flex items-center justify-center mx-auto text-muted-foreground">
                  <Tag className="size-6" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-foreground">Nenhuma promoção ativa</h3>
                  <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                    Crie sua primeira oferta relâmpago para aparecer em destaque na vitrine e atrair mais pedidos.
                  </p>
                </div>
                <Button onClick={() => setIsPromoOpen(true)} size="sm" variant="outline" className="rounded-xl text-xs font-bold h-9">
                  <Plus className="size-3.5 mr-1" />
                  Criar Primeira Promoção
                </Button>
              </div>
            ) : (
              promos.map((promo) => (
                <div
                  key={promo.id}
                  className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 rounded-2xl bg-card border border-border/70 gap-4 hover:border-border transition-all shadow-2xs"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div
                      className={`size-10 rounded-xl flex items-center justify-center shrink-0 ${
                        promo.type === "flash_offer"
                          ? "bg-amber-500/10 text-amber-500 border border-amber-500/20"
                          : "bg-primary/10 text-primary border border-primary/20"
                      }`}
                    >
                      {promo.type === "flash_offer" ? (
                        <Flame className="size-5" />
                      ) : (
                        <Percent className="size-5" />
                      )}
                    </div>

                    <div className="space-y-0.5 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-bold text-foreground truncate">{promo.title}</h3>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase font-mono bg-primary/10 text-primary">
                          {promo.discount_percent ? `${promo.discount_percent}% OFF` : "COMBO"}
                        </span>
                      </div>
                      {promo.description && (
                        <p className="text-xs text-muted-foreground line-clamp-1">
                          {promo.description}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-6 w-full sm:w-auto border-t sm:border-t-0 pt-3 sm:pt-0 border-border/40">
                    <div className="text-left sm:text-right">
                      <span className="text-[11px] text-muted-foreground block font-mono">
                        {promo.ends_at
                          ? `Até ${new Date(promo.ends_at).toLocaleDateString("pt-BR")}`
                          : "Sem data limite"}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs font-semibold text-muted-foreground">
                        {promo.is_active ? "Ativa" : "Pausada"}
                      </span>
                      <Switch
                        checked={promo.is_active}
                        onCheckedChange={() => handleTogglePromo(promo.id, promo.is_active)}
                      />
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ── ABA 2: CUPONS DE DESCONTO ────────────────────────────────────────── */}
      {activeTab === "coupons" && (
        <div className="space-y-6">
          {/* Métricas de Cupons */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-2xl bg-card border border-border/70 space-y-1 shadow-2xs">
              <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                Cupons Ativos
              </span>
              <div className="text-2xl font-mono font-bold text-foreground">
                {couponsList.filter((c) => c.is_active).length}
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-card border border-border/70 space-y-1 shadow-2xs">
              <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                Total de Resgates
              </span>
              <div className="text-2xl font-mono font-bold text-emerald-600 dark:text-emerald-400">
                {couponsList.reduce((sum, c) => sum + (c.uses_count || 0), 0)}
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-card border border-border/70 space-y-1 shadow-2xs">
              <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                Cupons Cadastrados
              </span>
              <div className="text-2xl font-mono font-bold text-foreground">{couponsList.length}</div>
            </div>
          </div>

          {/* Lista de Cupons */}
          <div className="space-y-3">
            {couponsList.length === 0 ? (
              <div className="py-12 text-center space-y-4 border border-dashed border-border/70 rounded-2xl bg-card/40">
                <div className="size-12 rounded-2xl bg-muted/60 flex items-center justify-center mx-auto text-muted-foreground">
                  <Ticket className="size-6" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-foreground">Nenhum cupom cadastrado</h3>
                  <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                    Crie cupons promocionais para seus clientes ou parceiros utilizarem no carrinho e checkout.
                  </p>
                </div>
                <Button onClick={() => setIsCouponOpen(true)} size="sm" variant="outline" className="rounded-xl text-xs font-bold h-9">
                  <Plus className="size-3.5 mr-1" />
                  Criar Primeiro Cupom
                </Button>
              </div>
            ) : (
              couponsList.map((coupon) => (
                <div
                  key={coupon.id}
                  className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 rounded-2xl bg-card border border-border/70 gap-4 hover:border-border transition-all shadow-2xs"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="size-10 rounded-xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center shrink-0">
                      {coupon.discount_type === "free_shipping" ? (
                        <Truck className="size-5" />
                      ) : coupon.discount_type === "fixed_amount" ? (
                        <DollarSign className="size-5" />
                      ) : (
                        <Percent className="size-5" />
                      )}
                    </div>

                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-black text-sm text-foreground tracking-wider bg-muted/60 px-2 py-0.5 rounded-lg border border-border/60">
                          {coupon.code}
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => copyCouponCode(coupon.code, coupon.id)}
                          className="size-7 rounded-lg text-muted-foreground hover:text-foreground cursor-pointer"
                          title="Copiar código do cupom"
                        >
                          {copiedCouponId === coupon.id ? (
                            <Check className="size-3.5 text-emerald-600" />
                          ) : (
                            <Copy className="size-3.5" />
                          )}
                        </Button>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase font-mono bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                          {coupon.discount_type === "percentage"
                            ? `${coupon.discount_value}% OFF`
                            : coupon.discount_type === "fixed_amount"
                            ? `R$ ${Number(coupon.discount_value).toFixed(2)} OFF`
                            : "Frete Grátis"}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                        {coupon.min_order_cents ? (
                          <span>
                            Mínimo: R$ {(coupon.min_order_cents / 100).toFixed(2)}
                          </span>
                        ) : (
                          <span>Sem valor mínimo</span>
                        )}
                        <span>•</span>
                        <span>
                          {coupon.max_uses
                            ? `${coupon.uses_count || 0} de ${coupon.max_uses} usos`
                            : `${coupon.uses_count || 0} usos (ilimitado)`}
                        </span>
                        {coupon.expires_at && (
                          <>
                            <span>•</span>
                            <span className="inline-flex items-center gap-1">
                              <Calendar className="size-3" />
                              Expira em {new Date(coupon.expires_at).toLocaleDateString("pt-BR")}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-4 w-full sm:w-auto border-t sm:border-t-0 pt-3 sm:pt-0 border-border/40">
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs font-semibold text-muted-foreground">
                        {coupon.is_active ? "Ativo" : "Pausado"}
                      </span>
                      <Switch
                        checked={coupon.is_active}
                        onCheckedChange={() => handleToggleCoupon(coupon)}
                      />
                    </div>

                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteCoupon(coupon.id, coupon.code)}
                      className="size-8 rounded-xl text-muted-foreground hover:text-rose-600 hover:bg-rose-500/10 cursor-pointer"
                      title="Excluir Cupom"
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ── SHEET: NOVA OFERTA ──────────────────────────────────────────────── */}
      <SheetPage
        open={isPromoOpen}
        onOpenChange={setIsPromoOpen}
        title="Nova Promoção ou Oferta"
        size="lg"
        footer={
          <>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsPromoOpen(false)}
              className="h-10 px-4 rounded-xl text-xs font-bold"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleCreatePromo}
              disabled={isPromoSubmitting}
              className="h-10 px-5 rounded-xl font-bold text-xs bg-primary text-primary-foreground gap-1.5"
            >
              {isPromoSubmitting ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" />
                  <span>Criando...</span>
                </>
              ) : (
                "Criar Promoção"
              )}
            </Button>
          </>
        }
      >
        <form onSubmit={handleCreatePromo} className="space-y-6 py-4">
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="font-semibold text-xs text-foreground">Título da Promoção *</label>
              <Input
                placeholder="Ex: Terça do Burger 20% OFF, Combo Família..."
                value={promoTitle}
                onChange={(e) => setPromoTitle(e.target.value)}
                className="rounded-xl text-xs h-10"
              />
            </div>

            <div className="space-y-1.5">
              <label className="font-semibold text-xs text-foreground">Mecânica Promocional</label>
              <Select value={promoType} onValueChange={(val: any) => setPromoType(val)}>
                <SelectTrigger className="rounded-xl text-xs h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-xl text-xs">
                  <SelectItem value="flash_offer">Oferta Relâmpago (Contagem Regressiva)</SelectItem>
                  <SelectItem value="percentage_discount">Desconto Percentual Direto (%)</SelectItem>
                  <SelectItem value="buy_x_get_y">Compre X e Leve Y (Combo)</SelectItem>
                  <SelectItem value="progressive_quantity">Desconto Progressivo por Quantidade</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {(promoType === "flash_offer" || promoType === "percentage_discount") && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="font-semibold text-xs text-foreground">Desconto (%)</label>
                    <Input
                      type="number"
                      min={1}
                      max={90}
                      value={promoDiscountPercent}
                      onChange={(e) => setPromoDiscountPercent(Number(e.target.value))}
                      className="rounded-xl text-xs h-10"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="font-semibold text-xs text-foreground">Duração (Horas)</label>
                    <Input
                      type="number"
                      min={1}
                      max={168}
                      value={promoDurationHours}
                      onChange={(e) => setPromoDurationHours(Number(e.target.value))}
                      className="rounded-xl text-xs h-10"
                    />
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-muted/40 border border-border/60 space-y-2">
                  <label className="font-bold text-xs text-foreground flex items-center gap-1.5">
                    <RefreshCw className="size-3.5 text-primary" />
                    <span>Auto-Renovação de Estoque Promocional</span>
                  </label>
                  <p className="text-[11px] text-muted-foreground">
                    Ao esgotar o lote inicial, reativa automaticamente uma nova cota de itens em oferta.
                  </p>
                </div>
              </div>
            )}

            {promoType === "buy_x_get_y" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="font-semibold text-xs text-foreground">Compre Quantidade</label>
                  <Input
                    type="number"
                    min={1}
                    value={promoBuyQty}
                    onChange={(e) => setPromoBuyQty(Number(e.target.value))}
                    className="rounded-xl text-xs h-10"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="font-semibold text-xs text-foreground">Pague Quantidade</label>
                  <Input
                    type="number"
                    min={1}
                    value={promoGetQty}
                    onChange={(e) => setPromoGetQty(Number(e.target.value))}
                    className="rounded-xl text-xs h-10"
                  />
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="font-semibold text-xs text-foreground">Regulamento / Descrição Curta</label>
              <Textarea
                placeholder="Válido enquanto durarem os estoques. Limite de 2 por cliente."
                value={promoDescription}
                onChange={(e) => setPromoDescription(e.target.value)}
                rows={2}
                className="rounded-xl text-xs"
              />
            </div>
          </div>
        </form>
      </SheetPage>

      {/* ── SHEET: NOVO CUPOM DE DESCONTO ───────────────────────────────────── */}
      <SheetPage
        open={isCouponOpen}
        onOpenChange={setIsCouponOpen}
        title="Novo Cupom de Desconto"
        size="lg"
        footer={
          <>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsCouponOpen(false)}
              className="h-10 px-4 rounded-xl text-xs font-bold"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleCreateCoupon}
              disabled={isCouponSubmitting}
              className="h-10 px-5 rounded-xl font-bold text-xs bg-primary text-primary-foreground gap-1.5"
            >
              {isCouponSubmitting ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" />
                  <span>Salvando...</span>
                </>
              ) : (
                "Salvar Cupom"
              )}
            </Button>
          </>
        }
      >
        <form onSubmit={handleCreateCoupon} className="space-y-5 py-4">
          <div className="space-y-1.5">
            <label className="font-semibold text-xs text-foreground">Código do Cupom *</label>
            <Input
              placeholder="Ex: PROMO10, BEMVINDO, BLACKFRIDAY"
              value={couponCode}
              onChange={(e) => setCouponCode(e.target.value.toUpperCase().replace(/\s/g, ""))}
              className="rounded-xl text-xs h-10 font-mono uppercase font-bold"
            />
            <p className="text-[11px] text-muted-foreground">O código que o cliente digitará no carrinho.</p>
          </div>

          <div className="space-y-1.5">
            <label className="font-semibold text-xs text-foreground">Tipo de Desconto</label>
            <Select value={discountType} onValueChange={(val: any) => setDiscountType(val)}>
              <SelectTrigger className="rounded-xl text-xs h-10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rounded-xl text-xs">
                <SelectItem value="percentage">Porcentagem (%)</SelectItem>
                <SelectItem value="fixed_amount">Valor Fixo (R$)</SelectItem>
                <SelectItem value="free_shipping">Frete Grátis</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {discountType !== "free_shipping" && (
            <div className="space-y-1.5">
              <label className="font-semibold text-xs text-foreground">
                {discountType === "percentage" ? "Porcentagem de Desconto (%)" : "Valor do Desconto (R$)"} *
              </label>
              <Input
                type="number"
                min={1}
                max={discountType === "percentage" ? 90 : 10000}
                value={discountValue}
                onChange={(e) => setDiscountValue(Number(e.target.value))}
                className="rounded-xl text-xs h-10 font-mono"
              />
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="font-semibold text-xs text-foreground">Pedido Mínimo (R$ opcional)</label>
              <Input
                type="number"
                min={0}
                step="0.01"
                placeholder="Ex: 50.00"
                value={minOrderReais}
                onChange={(e) => setMinOrderReais(e.target.value)}
                className="rounded-xl text-xs h-10 font-mono"
              />
            </div>

            <div className="space-y-1.5">
              <label className="font-semibold text-xs text-foreground">Limite de Usos (opcional)</label>
              <Input
                type="number"
                min={1}
                placeholder="Ex: 100 (vazio = ilimitado)"
                value={maxUses}
                onChange={(e) => setMaxUses(e.target.value)}
                className="rounded-xl text-xs h-10 font-mono"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="font-semibold text-xs text-foreground">Data de Expiração (opcional)</label>
            <Input
              type="date"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
              className="rounded-xl text-xs h-10"
            />
          </div>

          <div className="flex items-center justify-between p-3.5 rounded-2xl bg-muted/40 border border-border/60">
            <div className="space-y-0.5">
              <span className="text-xs font-bold text-foreground block">Cupom Ativo Imediatamente</span>
              <span className="text-[11px] text-muted-foreground">Clientes poderão aplicar este código no checkout.</span>
            </div>
            <Switch checked={couponActive} onCheckedChange={setCouponActive} />
          </div>
        </form>
      </SheetPage>
    </div>
  );
}
