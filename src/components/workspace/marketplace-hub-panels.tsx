import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Check,
  Download,
  ExternalLink,
  MessageSquare,
  PackageCheck,
  Plus,
  Printer,
  RefreshCw,
  Send,
  Trash2,
  Truck,
  Upload,
  Warehouse,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ShippingLabelModal } from "@/components/commerce/shipping-label-modal";
import { formatDateTime } from "@/lib/datetime";
import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";
import {
  answerMarketplaceQuestionFn,
  calculateAndApplyChannelPricing,
  deleteInventoryLocation,
  importMercadoLivreSellerListings,
  importProductFromMercadoLivre,
  listInventoryLocations,
  listMarketplaceExternalOrders,
  listMarketplaceQuestions,
  publishProductToMarketplace,
  pushOrderToBlingErpFn,
  saveInventoryLocation,
  syncMarketplaceOrderStatus,
  syncMercadoLivreQuestions,
  type ExternalOrderDTO,
  type InventoryLocationDTO,
  type ProductMarketplaceMappingDTO,
} from "@/services/marketplace-hub.functions";

/**
 * Painel de Pedidos Externos com ciclo de vida completo (Confirmar, Preparar, Prontificar, Despachar, Cancelar, Etiqueta e Bling).
 */
export function MarketplaceOrdersPanel({
  initialOrders,
  hasBlingConnected,
}: {
  initialOrders: ExternalOrderDTO[];
  hasBlingConnected?: boolean;
}) {
  const queryClient = useQueryClient();
  const [platformFilter, setPlatformFilter] = useState<string>("all");
  const [labelOrderId, setLabelOrderId] = useState<string | null>(null);
  const [dispatchOrder, setDispatchOrder] = useState<ExternalOrderDTO | null>(null);
  const [carrierName, setCarrierName] = useState("Correios");
  const [trackingCode, setTrackingCode] = useState("");
  const [cancelOrder, setCancelOrder] = useState<ExternalOrderDTO | null>(null);
  const [cancelReason, setCancelReason] = useState("");

  const { data: orders = initialOrders, isLoading, isError, refetch } = useQuery({
    queryKey: ["marketplace-external-orders", platformFilter],
    queryFn: () => listMarketplaceExternalOrders({ data: { platform: platformFilter } }),
    initialData: platformFilter === "all" ? initialOrders : undefined,
  });

  const actionMutation = useMutation({
    mutationFn: (payload: {
      externalOrderId?: string;
      orderId?: string | null;
      action: "confirm" | "startPreparation" | "readyToPickup" | "dispatch" | "cancel";
      carrierName?: string;
      trackingCode?: string;
      cancellationReason?: string;
    }) =>
      syncMarketplaceOrderStatus({
        data: {
          externalOrderId: payload.externalOrderId,
          orderId: payload.orderId || undefined,
          action: payload.action,
          carrierName: payload.carrierName,
          trackingCode: payload.trackingCode,
          cancellationReason: payload.cancellationReason,
        },
      }),
    onSuccess: (res) => {
      if (res.success) {
        toast.success(res.message || "Status sincronizado com o marketplace.");
      } else {
        toast.warning(res.message || "Atualizado localmente; canal externo retornou alerta.");
      }
      setDispatchOrder(null);
      setCancelOrder(null);
      setTrackingCode("");
      setCancelReason("");
      queryClient.invalidateQueries({ queryKey: ["marketplace-external-orders"] });
    },
    onError: (err: any) => {
      toast.error(err?.message || "Falha ao atualizar status no marketplace.");
    },
  });

  const blingPushMutation = useMutation({
    mutationFn: (orderId: string) => pushOrderToBlingErpFn({ data: { orderId } }),
    onSuccess: (res) => {
      if (res.success) {
        toast.success(res.message);
      } else {
        toast.error(res.message);
      }
    },
    onError: (err: any) => toast.error(err?.message || "Erro ao enviar pedido para o Bling."),
  });

  const platformOptions = [
    { key: "all", label: "Todos" },
    { key: "mercadolivre", label: "Mercado Livre" },
    { key: "ifood", label: "iFood" },
    { key: "shopee", label: "Shopee" },
    { key: "magalu", label: "Magalu" },
    { key: "amazon", label: "Amazon" },
    { key: "bling", label: "Bling" },
  ];

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-border/70 bg-card p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-bold text-foreground">Pedidos de Marketplaces</h3>
            <p className="text-xs text-muted-foreground">
              Confirme, despache rastreio, emita etiquetas e sincronize baixas direto com os canais externos.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={() => refetch()}
            className="h-11 min-h-11 rounded-lg text-xs font-semibold gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring cursor-pointer"
          >
            <RefreshCw className={cn("size-3.5", isLoading && "animate-spin motion-reduce:animate-none")} />
            <span>Atualizar</span>
          </Button>
        </div>

        <div className="flex flex-wrap items-center gap-2 pb-1">
          {platformOptions.map((opt) => (
            <Button
              key={opt.key}
              type="button"
              variant={platformFilter === opt.key ? "default" : "outline"}
              onClick={() => setPlatformFilter(opt.key)}
              className="h-11 min-h-11 rounded-lg text-xs font-semibold shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring cursor-pointer"
            >
              {opt.label}
            </Button>
          ))}
        </div>

        {isError ? (
          <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-xs text-destructive flex items-center justify-between gap-4">
            <span>Erro ao carregar pedidos de marketplaces.</span>
            <Button type="button" variant="outline" onClick={() => refetch()} className="h-11 min-h-11 text-xs">
              Tentar novamente
            </Button>
          </div>
        ) : orders.length === 0 ? (
          <div className="py-12 text-center text-xs text-muted-foreground">
            Nenhum pedido externo importado para este filtro até o momento.
          </div>
        ) : (
          <div className="border border-border/70 rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 text-xs">
                  <TableHead>Pedido / Canal</TableHead>
                  <TableHead>Comprador e Itens</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Líquido</TableHead>
                  <TableHead className="text-right">Ações Operacionais</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map((ord) => {
                  const normalizedStatus = String(ord.external_status || "").toLowerCase();
                  const isCancelled = normalizedStatus === "cancelled" || normalizedStatus === "canceled";
                  const isDispatched = normalizedStatus === "shipped" || normalizedStatus === "dispatched" || normalizedStatus === "delivered";
                  return (
                    <TableRow key={ord.id} className="text-xs">
                      <TableCell className="space-y-1">
                        <div className="font-mono font-bold text-foreground">#{ord.external_order_id}</div>
                        <div className="flex flex-wrap items-center gap-1">
                          <Badge variant="outline" className="text-xs capitalize">
                            {ord.platform}
                          </Badge>
                          {ord.tracking_number && (
                            <Badge variant="outline" className="text-xs font-mono">
                              {ord.tracking_number}
                            </Badge>
                          )}
                        </div>
                        <div className="text-muted-foreground">{formatDateTime(ord.imported_at)}</div>
                      </TableCell>
                      <TableCell className="space-y-1">
                        <div className="font-medium text-foreground">{ord.buyer_name || "Cliente Marketplace"}</div>
                        <div className="text-muted-foreground">
                          {ord.items?.length || 1} item(ns)
                          {ord.items?.[0]?.title ? ` · ${ord.items[0].title}` : ""}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-xs uppercase",
                            isCancelled
                              ? "border-destructive/40 text-destructive bg-destructive/10"
                              : isDispatched
                                ? "border-emerald-500/40 text-emerald-600 bg-emerald-500/10"
                                : "border-border text-foreground bg-muted/40"
                          )}
                        >
                          {ord.external_status || "pendente"}
                        </Badge>
                      </TableCell>
                      <TableCell className="space-y-1">
                        <div className="font-semibold text-foreground">{formatMoney(ord.net_payout_cents)}</div>
                        <div className="text-muted-foreground">Bruto: {formatMoney(ord.total_amount_cents)}</div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex flex-wrap justify-end gap-2">
                          {ord.platform === "ifood" && !isCancelled && (
                            <>
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                disabled={actionMutation.isPending}
                                onClick={() =>
                                  actionMutation.mutate({
                                    externalOrderId: ord.id,
                                    orderId: ord.order_id,
                                    action: "confirm",
                                  })
                                }
                                className="h-11 min-h-11 rounded-lg text-xs gap-1 cursor-pointer focus-visible:ring-2"
                              >
                                <Check className="size-3.5" /> Confirmar
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                disabled={actionMutation.isPending}
                                onClick={() =>
                                  actionMutation.mutate({
                                    externalOrderId: ord.id,
                                    orderId: ord.order_id,
                                    action: "startPreparation",
                                  })
                                }
                                className="h-11 min-h-11 rounded-lg text-xs gap-1 cursor-pointer focus-visible:ring-2"
                              >
                                <PackageCheck className="size-3.5" /> Preparar
                              </Button>
                            </>
                          )}
                          {!isCancelled && (
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setDispatchOrder(ord);
                                setCarrierName(ord.shipping_method || "Correios");
                                setTrackingCode(ord.tracking_number || "");
                              }}
                              className="h-11 min-h-11 rounded-lg text-xs gap-1 cursor-pointer focus-visible:ring-2"
                            >
                              <Truck className="size-3.5" /> Despachar
                            </Button>
                          )}
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => setLabelOrderId(ord.order_id || ord.id)}
                            className="h-11 min-h-11 rounded-lg text-xs gap-1 cursor-pointer focus-visible:ring-2"
                          >
                            <Printer className="size-3.5" /> Etiqueta
                          </Button>
                          {hasBlingConnected && ord.order_id && !isCancelled && (
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              disabled={blingPushMutation.isPending}
                              onClick={() => blingPushMutation.mutate(ord.order_id!)}
                              className="h-11 min-h-11 rounded-lg text-xs gap-1 cursor-pointer focus-visible:ring-2"
                            >
                              <Upload className="size-3.5" /> Enviar Bling
                            </Button>
                          )}
                          {!isCancelled && (
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setCancelOrder(ord);
                                setCancelReason("");
                              }}
                              className="h-11 min-h-11 rounded-lg text-xs text-destructive hover:text-destructive hover:bg-destructive/10 gap-1 cursor-pointer focus-visible:ring-2"
                            >
                              <XCircle className="size-3.5" /> Cancelar
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* Modal: Despachar e Enviar Rastreio ao Canal */}
      <Dialog open={Boolean(dispatchOrder)} onOpenChange={(open) => !open && setDispatchOrder(null)}>
        <DialogContent className="max-w-md rounded-lg p-6 pt-safe-modal">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">Despachar Pedido #{dispatchOrder?.external_order_id}</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Registra o rastreio no Waesy e atualiza o status no marketplace de origem.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="dispatch-carrier" className="text-xs font-medium">Transportadora</Label>
              <Input
                id="dispatch-carrier"
                value={carrierName}
                onChange={(e) => setCarrierName(e.target.value)}
                placeholder="Ex: Correios, Jadlog, MotoLink"
                className="h-11 min-h-11 text-xs rounded-lg"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dispatch-tracking" className="text-xs font-medium">Código de Rastreamento</Label>
              <Input
                id="dispatch-tracking"
                value={trackingCode}
                onChange={(e) => setTrackingCode(e.target.value)}
                placeholder="Ex: BR998877665BR"
                className="h-11 min-h-11 text-xs rounded-lg font-mono"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-3 border-t border-border/60">
            <Button type="button" variant="outline" onClick={() => setDispatchOrder(null)} className="h-11 min-h-11 text-xs">
              Fechar
            </Button>
            <Button
              type="button"
              disabled={actionMutation.isPending}
              onClick={() =>
                dispatchOrder &&
                actionMutation.mutate({
                  externalOrderId: dispatchOrder.id,
                  orderId: dispatchOrder.order_id,
                  action: "dispatch",
                  carrierName: carrierName.trim() || undefined,
                  trackingCode: trackingCode.trim() || undefined,
                })
              }
              className="h-11 min-h-11 text-xs font-semibold"
            >
              {actionMutation.isPending ? "Enviando..." : "Confirmar Despacho"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal: Cancelamento Explícito com Motivo */}
      <Dialog open={Boolean(cancelOrder)} onOpenChange={(open) => !open && setCancelOrder(null)}>
        <DialogContent className="max-w-md rounded-lg p-6 pt-safe-modal">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">Cancelar Pedido #{cancelOrder?.external_order_id}</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Esta ação cancela o pedido no Waesy e solicita o cancelamento na API do canal de origem.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label htmlFor="cancel-reason" className="text-xs font-medium">Motivo do Cancelamento</Label>
            <Input
              id="cancel-reason"
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="Ex: Indisponibilidade momentânea de estoque"
              className="h-11 min-h-11 text-xs rounded-lg"
            />
          </div>
          <div className="flex justify-end gap-2 pt-3 border-t border-border/60">
            <Button type="button" variant="outline" onClick={() => setCancelOrder(null)} className="h-11 min-h-11 text-xs">
              Voltar
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={actionMutation.isPending || !cancelReason.trim()}
              onClick={() =>
                cancelOrder &&
                actionMutation.mutate({
                  externalOrderId: cancelOrder.id,
                  orderId: cancelOrder.order_id,
                  action: "cancel",
                  cancellationReason: cancelReason.trim(),
                })
              }
              className="h-11 min-h-11 text-xs font-semibold"
            >
              {actionMutation.isPending ? "Cancelando..." : "Confirmar Cancelamento"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {labelOrderId && (
        <ShippingLabelModal
          orderId={labelOrderId}
          isOpen={Boolean(labelOrderId)}
          onClose={() => setLabelOrderId(null)}
          onDispatchSuccess={() => queryClient.invalidateQueries({ queryKey: ["marketplace-external-orders"] })}
        />
      )}
    </div>
  );
}

/**
 * Barra e modais de Importação e Publicação de Catálogo para a aba de Mapeamento.
 */
export function MarketplaceCatalogActionsBar() {
  const queryClient = useQueryClient();
  const [mlbInput, setMlbInput] = useState("");

  const importOneMutation = useMutation({
    mutationFn: (mlbIdOrUrl: string) => importProductFromMercadoLivre({ data: { mlbIdOrUrl } }),
    onSuccess: (res) => {
      toast.success(res.message);
      setMlbInput("");
      queryClient.invalidateQueries({ queryKey: ["marketplace-product-mappings"] });
      queryClient.invalidateQueries({ queryKey: ["marketplace-sync-logs"] });
    },
    onError: (err: any) => toast.error(err?.message || "Falha ao importar anúncio MLB."),
  });

  const importSellerMutation = useMutation({
    mutationFn: () => importMercadoLivreSellerListings({ data: { limit: 20, status: "active" } }),
    onSuccess: (res) => {
      toast.success(res.message);
      queryClient.invalidateQueries({ queryKey: ["marketplace-product-mappings"] });
      queryClient.invalidateQueries({ queryKey: ["marketplace-sync-logs"] });
    },
    onError: (err: any) => toast.error(err?.message || "Falha ao importar anúncios da conta ML."),
  });

  return (
    <div className="rounded-lg border border-border/70 bg-card p-6 space-y-4">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div className="space-y-2 flex-1">
          <Label htmlFor="import-mlb-id" className="text-xs font-bold text-foreground">
            Importar Produto do Mercado Livre (MLB ID ou URL)
          </Label>
          <div className="flex flex-col sm:flex-row gap-2">
            <Input
              id="import-mlb-id"
              value={mlbInput}
              onChange={(e) => setMlbInput(e.target.value)}
              placeholder="Ex: MLB3849201920 ou URL completa do anúncio"
              className="h-11 min-h-11 text-xs rounded-lg font-mono flex-1"
            />
            <Button
              type="button"
              variant="outline"
              disabled={!mlbInput.trim() || importOneMutation.isPending}
              onClick={() => importOneMutation.mutate(mlbInput.trim())}
              className="h-11 min-h-11 rounded-lg text-xs font-semibold gap-2 cursor-pointer shrink-0 focus-visible:ring-2"
            >
              <Download className="size-3.5" />
              <span>{importOneMutation.isPending ? "Importando..." : "Importar MLB"}</span>
            </Button>
          </div>
        </div>
        <Button
          type="button"
          variant="secondary"
          disabled={importSellerMutation.isPending}
          onClick={() => importSellerMutation.mutate()}
          className="h-11 min-h-11 rounded-lg text-xs font-semibold gap-2 cursor-pointer shrink-0 focus-visible:ring-2"
        >
          <RefreshCw className={cn("size-3.5", importSellerMutation.isPending && "animate-spin motion-reduce:animate-none")} />
          <span>{importSellerMutation.isPending ? "Sincronizando..." : "Importar Catálogo da Conta ML"}</span>
        </Button>
      </div>
    </div>
  );
}

/**
 * Modal de Publicação Direta via API e Precificação com Markup para um produto Waesy.
 */
export function PublishAndPriceModal({
  product,
  open,
  onOpenChange,
}: {
  product: ProductMarketplaceMappingDTO | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const [platform, setPlatform] = useState<"mercadolivre" | "shopee" | "bling">("mercadolivre");
  const [categoryId, setCategoryId] = useState("");
  const [marginPercent, setMarginPercent] = useState(0);
  const [applyCommMarkup, setApplyCommMarkup] = useState(true);

  const publishMutation = useMutation({
    mutationFn: async () => {
      if (!product) return null;
      if (marginPercent > 0 || applyCommMarkup) {
        await calculateAndApplyChannelPricing({
          data: {
            productId: product.id,
            channel: platform,
            priceMarginPercent: Math.max(0, Number(marginPercent) || 0),
            applyChannelCommissionMarkup: applyCommMarkup,
          },
        });
      }
      return publishProductToMarketplace({
        data: {
          productId: product.id,
          platform,
          categoryId: categoryId.trim() || undefined,
          marginPercent: Number(marginPercent) || 0,
        },
      });
    },
    onSuccess: (res) => {
      if (res) toast.success(res.message);
      onOpenChange(false);
      queryClient.invalidateQueries({ queryKey: ["marketplace-product-mappings"] });
      queryClient.invalidateQueries({ queryKey: ["marketplace-sync-logs"] });
    },
    onError: (err: any) => {
      toast.error(err?.message || "Erro ao publicar produto na API do canal.");
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-lg p-6 pt-safe-modal">
        <DialogHeader>
          <DialogTitle className="text-base font-bold">Publicar Produto no Canal</DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            {product?.title || "Selecione um produto para publicar ou atualizar preço e estoque via API."}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label className="text-xs font-medium">Canal de Destino</Label>
            <select
              value={platform}
              onChange={(e) => setPlatform(e.target.value as "mercadolivre" | "shopee" | "bling")}
              className="w-full h-11 min-h-11 px-3 rounded-lg border border-input bg-background text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="mercadolivre">Mercado Livre</option>
              <option value="bling">Bling ERP v3</option>
              <option value="shopee">Shopee v2 (atualizar item vinculado)</option>
            </select>
          </div>
          {platform === "mercadolivre" && (
            <div className="space-y-2">
              <Label htmlFor="publish-cat-id" className="text-xs font-medium">
                Categoria MLB (Opcional — autodetectada se vazio)
              </Label>
              <Input
                id="publish-cat-id"
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                placeholder="Ex: MLB1055"
                className="h-11 min-h-11 text-xs rounded-lg font-mono"
              />
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="publish-margin" className="text-xs font-medium">Margem Adicional (%)</Label>
            <Input
              id="publish-margin"
              type="number"
              min="0"
              max="300"
              value={marginPercent}
              onChange={(e) => setMarginPercent(Number(e.target.value))}
              className="h-11 min-h-11 text-xs rounded-lg font-mono"
            />
          </div>
          <div className="flex items-center justify-between pt-1">
            <div>
              <p className="text-xs font-medium">Compensar Comissão do Canal</p>
              <p className="text-xs text-muted-foreground">Aplica markup para preservar margem líquida</p>
            </div>
            <Switch checked={applyCommMarkup} onCheckedChange={setApplyCommMarkup} />
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-3 border-t border-border/60">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="h-11 min-h-11 text-xs">
            Cancelar
          </Button>
          <Button
            type="button"
            disabled={!product || publishMutation.isPending}
            onClick={() => publishMutation.mutate()}
            className="h-11 min-h-11 text-xs font-semibold gap-2"
          >
            <Upload className="size-3.5" />
            <span>{publishMutation.isPending ? "Publicando..." : "Publicar Agora"}</span>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Painel de Perguntas Pré-Venda (Mercado Livre Q&A Inbox).
 */
export function MarketplaceQuestionsPanel() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<"all" | "unanswered" | "answered">("all");
  const [draftAnswers, setDraftAnswers] = useState<Record<string, string>>({});

  const { data: questions = [], isLoading, refetch } = useQuery({
    queryKey: ["marketplace-questions", statusFilter],
    queryFn: () => listMarketplaceQuestions({ data: { status: statusFilter, limit: 50 } }),
  });

  const syncMutation = useMutation({
    mutationFn: () => syncMercadoLivreQuestions({ data: { status: "ALL", limit: 30 } }),
    onSuccess: (res) => {
      toast.success(res.message);
      queryClient.invalidateQueries({ queryKey: ["marketplace-questions"] });
    },
    onError: (err: any) => toast.error(err?.message || "Falha ao sincronizar perguntas."),
  });

  const answerMutation = useMutation({
    mutationFn: ({ questionId, answerText }: { questionId: string; answerText: string }) =>
      answerMarketplaceQuestionFn({ data: { questionId, answerText } }),
    onSuccess: (res, vars) => {
      if (res.success) {
        toast.success(res.message || "Resposta enviada ao Mercado Livre!");
        setDraftAnswers((prev) => ({ ...prev, [vars.questionId]: "" }));
        queryClient.invalidateQueries({ queryKey: ["marketplace-questions"] });
      } else {
        toast.error(res.message || "Erro ao publicar resposta.");
      }
    },
    onError: (err: any) => toast.error(err?.message || "Falha ao enviar resposta."),
  });

  return (
    <div className="rounded-lg border border-border/70 bg-card p-6 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-bold text-foreground flex items-center gap-2">
            <MessageSquare className="size-4 text-primary" /> Perguntas Pré-Venda
          </h3>
          <p className="text-xs text-muted-foreground">
            Sincronize e responda dúvidas de compradores diretamente na API do Mercado Livre.
          </p>
        </div>
        <Button
          type="button"
          onClick={() => syncMutation.mutate()}
          disabled={syncMutation.isPending}
          className="h-11 min-h-11 rounded-lg text-xs font-semibold gap-2 cursor-pointer focus-visible:ring-2"
        >
          <RefreshCw className={cn("size-3.5", syncMutation.isPending && "animate-spin motion-reduce:animate-none")} />
          <span>{syncMutation.isPending ? "Sincronizando..." : "Sincronizar Perguntas"}</span>
        </Button>
      </div>

      <div className="flex items-center gap-2">
        {[
          { key: "all", label: "Todas" },
          { key: "unanswered", label: "Pendentes" },
          { key: "answered", label: "Respondidas" },
        ].map((tab) => (
          <Button
            key={tab.key}
            type="button"
            variant={statusFilter === tab.key ? "default" : "outline"}
            onClick={() => setStatusFilter(tab.key as any)}
            className="h-11 min-h-11 rounded-lg text-xs font-semibold cursor-pointer focus-visible:ring-2"
          >
            {tab.label}
          </Button>
        ))}
        <Button
          type="button"
          variant="outline"
          onClick={() => refetch()}
          className="h-11 min-h-11 rounded-lg text-xs ml-auto cursor-pointer focus-visible:ring-2"
        >
          Atualizar
        </Button>
      </div>

      {isLoading ? (
        <div className="py-10 text-center text-xs text-muted-foreground">Carregando perguntas...</div>
      ) : questions.length === 0 ? (
        <div className="py-10 text-center text-xs text-muted-foreground">
          Nenhuma pergunta encontrada. Clique em Sincronizar Perguntas ou aguarde notificações via webhook.
        </div>
      ) : (
        <div className="divide-y divide-border/70 border border-border/70 rounded-lg">
          {questions.map((q: any) => {
            const draft = draftAnswers[q.external_question_id] || "";
            const isAnswered = q.status === "answered" || Boolean(q.answer_text);
            return (
              <div key={q.id} className="p-4 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs font-mono">{q.external_item_id}</Badge>
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-xs",
                        isAnswered
                          ? "border-emerald-500/40 text-emerald-600 bg-emerald-500/10"
                          : "border-warning/40 text-warning bg-warning/10"
                      )}
                    >
                      {isAnswered ? "Respondida" : "Aguardando Resposta"}
                    </Badge>
                  </div>
                  <span className="text-xs text-muted-foreground">{formatDateTime(q.asked_at)}</span>
                </div>
                <p className="text-sm font-medium text-foreground">{q.question_text}</p>
                {q.answer_text ? (
                  <div className="rounded-lg bg-muted/40 p-3 text-xs text-foreground">
                    <span className="font-semibold">Sua resposta:</span> {q.answer_text}
                  </div>
                ) : (
                  <div className="flex flex-col sm:flex-row gap-2">
                    <Input
                      value={draft}
                      onChange={(e) =>
                        setDraftAnswers((prev) => ({ ...prev, [q.external_question_id]: e.target.value }))
                      }
                      placeholder="Digite a resposta oficial para o comprador..."
                      className="h-11 min-h-11 text-xs rounded-lg flex-1"
                    />
                    <Button
                      type="button"
                      disabled={!draft.trim() || answerMutation.isPending}
                      onClick={() =>
                        answerMutation.mutate({
                          questionId: q.external_question_id,
                          answerText: draft.trim(),
                        })
                      }
                      className="h-11 min-h-11 rounded-lg text-xs font-semibold gap-2 cursor-pointer focus-visible:ring-2"
                    >
                      <Send className="size-3.5" />
                      <span>Responder</span>
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/**
 * Painel de Gestão de Depósitos / Multi-CD (`inventory_locations`) para sincronização multi-armazém.
 */
export function MarketplaceWarehousesPanel({ initialLocations = [] }: { initialLocations?: InventoryLocationDTO[] }) {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<InventoryLocationDTO | null>(null);
  const [name, setName] = useState("");
  const [locType, setLocType] = useState<InventoryLocationDTO["type"]>("warehouse");
  const [city, setCity] = useState("");
  const [stateUf, setStateUf] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [radiusKm, setRadiusKm] = useState(15);
  const [isDefault, setIsDefault] = useState(false);

  const { data: locations = initialLocations } = useQuery({
    queryKey: ["inventory-locations"],
    queryFn: () => listInventoryLocations(),
    initialData: initialLocations,
  });

  const saveMutation = useMutation({
    mutationFn: () =>
      saveInventoryLocation({
        data: {
          id: editing?.id,
          name,
          type: locType,
          city: city || undefined,
          state: stateUf || undefined,
          postal_code: postalCode || undefined,
          dispatch_radius_km: Number(radiusKm) || 10,
          is_default: isDefault,
          is_active: true,
        },
      }),
    onSuccess: (res) => {
      toast.success(res.message);
      setModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ["inventory-locations"] });
    },
    onError: (err: any) => toast.error(err?.message || "Erro ao salvar armazém."),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteInventoryLocation({ data: { id } }),
    onSuccess: (res) => {
      toast.success(res.message);
      queryClient.invalidateQueries({ queryKey: ["inventory-locations"] });
    },
    onError: (err: any) => toast.error(err?.message || "Erro ao remover armazém."),
  });

  const openModal = (loc?: InventoryLocationDTO) => {
    if (loc) {
      setEditing(loc);
      setName(loc.name);
      setLocType(loc.type);
      setCity(loc.city || "");
      setStateUf(loc.state || "");
      setPostalCode(loc.postal_code || "");
      setRadiusKm(loc.dispatch_radius_km ?? 10);
      setIsDefault(loc.is_default);
    } else {
      setEditing(null);
      setName("");
      setLocType("warehouse");
      setCity("");
      setStateUf("");
      setPostalCode("");
      setRadiusKm(15);
      setIsDefault(false);
    }
    setModalOpen(true);
  };

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-border/70 bg-card p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-bold text-foreground flex items-center gap-2">
              <Warehouse className="size-4 text-primary" /> Depósitos e Dark Stores
            </h3>
            <p className="text-xs text-muted-foreground">
              Configure centros de distribuição para expedição local e saldo multi-canal.
            </p>
          </div>
          <Button
            type="button"
            onClick={() => openModal()}
            className="h-11 min-h-11 rounded-lg text-xs font-semibold gap-2 cursor-pointer focus-visible:ring-2"
          >
            <Plus className="size-3.5" />
            <span>Novo Local de Estoque</span>
          </Button>
        </div>

        {locations.length === 0 ? (
          <div className="py-10 text-center text-xs text-muted-foreground">
            Nenhum centro de distribuição cadastrado ainda.
          </div>
        ) : (
          <div className="border border-border/70 rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 text-xs">
                  <TableHead>Nome</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Cidade / UF</TableHead>
                  <TableHead>Raio (km)</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {locations.map((loc) => (
                  <TableRow key={loc.id} className="text-xs">
                    <TableCell className="font-semibold text-foreground">
                      <div className="flex items-center gap-2">
                        <span>{loc.name}</span>
                        {loc.is_default && <Badge variant="outline" className="text-xs">Padrão</Badge>}
                      </div>
                    </TableCell>
                    <TableCell className="capitalize text-muted-foreground">{loc.type}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {[loc.city, loc.state].filter(Boolean).join(" / ") || "—"}
                    </TableCell>
                    <TableCell className="font-mono">{loc.dispatch_radius_km ?? 10} km</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => openModal(loc)}
                          className="h-11 min-h-11 rounded-lg text-xs cursor-pointer"
                        >
                          Editar
                        </Button>
                        {!loc.is_default && (
                          <Button
                            type="button"
                            variant="ghost"
                            disabled={deleteMutation.isPending}
                            onClick={() => deleteMutation.mutate(loc.id)}
                            className="h-11 min-h-11 rounded-lg text-xs text-destructive hover:text-destructive hover:bg-destructive/10 cursor-pointer"
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-md rounded-lg p-6 pt-safe-modal">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">
              {editing ? "Editar Local de Estoque" : "Novo Local de Estoque"}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Defina o centro de expedição utilizado pelos conectores de marketplace.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="loc-name" className="text-xs font-medium">Nome do Local</Label>
              <Input
                id="loc-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: CD Principal Centro"
                className="h-11 min-h-11 text-xs rounded-lg"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="loc-type" className="text-xs font-medium">Tipo</Label>
              <select
                id="loc-type"
                value={locType}
                onChange={(e) => setLocType(e.target.value as InventoryLocationDTO["type"])}
                className="w-full h-11 min-h-11 px-3 rounded-lg border border-input bg-background text-xs"
              >
                <option value="warehouse">Depósito / Galpão</option>
                <option value="storefront">Loja Física</option>
                <option value="dark_store">Dark Store</option>
                <option value="kitchen">Cozinha / Delivery</option>
                <option value="fulfillment_center">Hub Fulfillment</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="loc-city" className="text-xs font-medium">Cidade</Label>
                <Input id="loc-city" value={city} onChange={(e) => setCity(e.target.value)} className="h-11 min-h-11 text-xs rounded-lg" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="loc-uf" className="text-xs font-medium">UF</Label>
                <Input id="loc-uf" value={stateUf} onChange={(e) => setStateUf(e.target.value)} maxLength={2} className="h-11 min-h-11 text-xs rounded-lg uppercase" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="loc-cep" className="text-xs font-medium">CEP</Label>
                <Input id="loc-cep" value={postalCode} onChange={(e) => setPostalCode(e.target.value)} className="h-11 min-h-11 text-xs rounded-lg font-mono" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="loc-radius" className="text-xs font-medium">Raio (km)</Label>
                <Input
                  id="loc-radius"
                  type="number"
                  min={0}
                  max={200}
                  value={radiusKm}
                  onChange={(e) => setRadiusKm(Number(e.target.value))}
                  className="h-11 min-h-11 text-xs rounded-lg font-mono"
                />
              </div>
            </div>
            <div className="flex items-center justify-between pt-1">
              <div>
                <p className="text-xs font-medium">Definir como Estoque Padrão</p>
                <p className="text-xs text-muted-foreground">Usado em importações e baixas automáticas</p>
              </div>
              <Switch checked={isDefault} onCheckedChange={setIsDefault} />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-3 border-t border-border/60">
            <Button type="button" variant="outline" onClick={() => setModalOpen(false)} className="h-11 min-h-11 text-xs">
              Cancelar
            </Button>
            <Button
              type="button"
              disabled={!name.trim() || saveMutation.isPending}
              onClick={() => saveMutation.mutate()}
              className="h-11 min-h-11 text-xs font-semibold"
            >
              {saveMutation.isPending ? "Salvando..." : "Salvar Local"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
