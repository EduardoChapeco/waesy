import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Barcode, Package, Truck, Layers, Search, ScanLine, Printer, Plus, ShoppingBag, Check, Camera, Trash2, FileText } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/commerce/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { listPickingBatches, scanBarcodePickItem, generateShippingManifest, createPickingBatch } from "@/services/wms.functions";
import { listOrders } from "@/services/order.functions";
import { getStoreSettings } from "@/services/store.functions";
import {
  listMarketplaceExternalOrders,
  deleteExternalMarketplaceOrder,
  type ExternalOrderDTO,
} from "@/services/marketplace-hub.functions";
import { getNicheSemantics } from "@/lib/niches/niche-semantics";
import { formatMoney } from "@/lib/money";
import { playCashRegisterSound, playWarningAlert } from "@/lib/audio-chimes";
import { ShippingLabelModal } from "@/components/commerce/shipping-label-modal";
import { BarcodeScannerModal } from "@/components/scanner/barcode-scanner-modal";

export const Route = createFileRoute("/workspace/pedidos/expedicao")({
  head: () => ({ meta: [{ title: "Separação e Envio | Waesy" }] }),
  component: WmsExpedicaoPage,
});

function WmsExpedicaoPage() {
  const queryClient = useQueryClient();
  const [barcodeInput, setBarcodeInput] = useState("");
  const [selectedBatchId, setSelectedBatchId] = useState<string | null>(null);
  const [channelFilter, setChannelFilter] = useState<string>("all");
  const [isCreateBatchModalOpen, setIsCreateBatchModalOpen] = useState(false);
  const [selectedOrderIdsForBatch, setSelectedOrderIdsForBatch] = useState<string[]>([]);
  const [selectedShippingLabelOrderId, setSelectedShippingLabelOrderId] = useState<string | null>(null);
  const [isCameraScannerOpen, setIsCameraScannerOpen] = useState(false);
  const [manifestPreview, setManifestPreview] = useState<any | null>(null);

  // 1. Consultas Reais ao Banco de Dados
  const { data: store } = useQuery({
    queryKey: ["store-settings"],
    queryFn: () => getStoreSettings(),
  });

  const { data: batches = [], isLoading } = useQuery({
    queryKey: ["wms-batches"],
    queryFn: () => listPickingBatches(),
  });

  const { data: externalOrders = [] } = useQuery({
    queryKey: ["marketplace-external-orders", channelFilter],
    queryFn: () => listMarketplaceExternalOrders({ data: { platform: channelFilter } }),
  });

  const { data: allStoreOrders = [] } = useQuery({
    queryKey: ["orders-for-picking"],
    queryFn: () => listOrders(),
  });

  const semantics = getNicheSemantics(store as any);
  const isFoodVertical = semantics.nicheId === "gastronomy";
  const visibleExternalOrders = isFoodVertical && channelFilter === "all"
    ? externalOrders.filter((ord: ExternalOrderDTO) =>
        ["ifood", "99food", "tridelivery", "amoofertas", "rappi", "aiqfome", "anotaai", "cardapioweb", "keeta", "ze_delivery"].includes(
          String(ord.platform || "").toLowerCase()
        )
      )
    : externalOrders;

  // Pedidos elegíveis para separação (pagos ou em processamento)
  const pendingOrdersForPicking = allStoreOrders.filter(
    (ord: any) => ord.status === "paid" || ord.status === "processing"
  );

  const selectedBatch = batches.find((b: any) => b.id === selectedBatchId) || batches[0] || null;
  const activeSessionId = selectedBatch?.sessions?.[0]?.id || null;
  const batchOrderIds: string[] = selectedBatch?.sessions
    ? selectedBatch.sessions.map((s: any) => s.order_id).filter(Boolean)
    : [];

  // 2. Mutações do WMS
  const scanMutation = useMutation({
    mutationFn: (barcode: string) => {
      if (!activeSessionId) {
        throw new Error("Selecione um lote com sessões ativas para conferência de produtos.");
      }
      return scanBarcodePickItem({ data: { sessionId: activeSessionId, barcode } });
    },
    onSuccess: (data: any) => {
      playCashRegisterSound();
      const extraHints = [
        data.aisleLocation ? `Bin: ${data.aisleLocation}` : null,
        data.packagingType ? `Emb: ${data.packagingType}` : null,
        data.fragile ? "FRÁGIL" : null,
      ].filter(Boolean).join(" • ");
      toast.success(
        `Item "${data.matchedItemTitle}" conferido (${data.qtyPicked}/${data.qtyExpected})${extraHints ? ` — ${extraHints}` : ""}`,
      );
      setBarcodeInput("");
      queryClient.invalidateQueries({ queryKey: ["wms-batches"] });
    },
    onError: (err: Error) => {
      playWarningAlert();
      toast.error(err.message || "Código de barras não confere com os itens pendentes deste lote.");
    },
  });

  const manifestMutation = useMutation({
    mutationFn: () => {
      if (!selectedBatch || batchOrderIds.length === 0) {
        throw new Error("Selecione um lote que contenha pedidos para emitir o romaneio.");
      }
      return generateShippingManifest({
        data: {
          batchId: selectedBatch.id,
          orderIds: batchOrderIds,
          carrierName: "Transportadora Própria",
        },
      });
    },
    onSuccess: (res) => {
      setManifestPreview(res);
      toast.success(`Romaneio ${res.manifestCode} gerado para ${res.totalOrders} pedido(s).`);
      queryClient.invalidateQueries({ queryKey: ["wms-batches"] });
    },
    onError: (err: Error) => {
      toast.error(err.message || "Falha ao gerar romaneio de despacho.");
    },
  });

  const createBatchMutation = useMutation({
    mutationFn: (orderIds: string[]) => {
      return createPickingBatch({ data: { orderIds } });
    },
    onSuccess: (res) => {
      const count = (res as any).totalOrders ?? ((res as any).batch?.orders?.length || selectedOrderIdsForBatch.length);
      toast.success(`Lote de separação criado (${count} pedidos).`);
      setIsCreateBatchModalOpen(false);
      setSelectedOrderIdsForBatch([]);
      queryClient.invalidateQueries({ queryKey: ["wms-batches"] });
    },
    onError: (err: Error) => {
      toast.error(err.message || "Erro ao criar lote de separação.");
    },
  });

  const deleteExternalMutation = useMutation({
    mutationFn: (externalOrderRowId: string) =>
      deleteExternalMarketplaceOrder({ data: { externalOrderRecordId: externalOrderRowId } }),
    onSuccess: () => {
      toast.success("Pedido de teste removido.");
      queryClient.invalidateQueries({ queryKey: ["marketplace-external-orders"] });
    },
    onError: (err: Error) => {
      toast.error(err.message || "Falha ao remover pedido externo.");
    },
  });

  const handlePrintThermalLabels = async () => {
    const candidateOrderId =
      batchOrderIds[0] ||
      pendingOrdersForPicking[0]?.id ||
      (allStoreOrders[0] as any)?.id ||
      externalOrders[0]?.order_id ||
      externalOrders[0]?.id ||
      null;
    if (candidateOrderId && (!("serial" in (typeof navigator !== "undefined" ? navigator : {})) || externalOrders.length === 0)) {
      setSelectedShippingLabelOrderId(candidateOrderId);
      return;
    }

    if (typeof navigator !== "undefined" && "serial" in navigator && externalOrders.length > 0) {
      try {
        const { buildZplShippingLabel, sendZplToSerialPrinter } = await import("@/lib/thermal-printer");
        const firstOrder = externalOrders[0];
        const addr = (firstOrder as any)?.shipping_address || {};

        const zplCode = buildZplShippingLabel({
          carrierName: "Correios / Transportadora",
          serviceType: "Expresso",
          trackingNumber: firstOrder.tracking_number || `BR${firstOrder.external_order_id.padStart(9, "0")}X`,
          orderNumber: firstOrder.external_order_id,
          batchCode: selectedBatch?.batch_code,
          recipient: {
            name: firstOrder.buyer_name || addr.name || "Destinatário",
            street: addr.street || addr.logradouro || "Endereço Cadastrado",
            number: addr.number || addr.numero || "S/N",
            neighborhood: addr.neighborhood || addr.bairro || "",
            city: addr.city || addr.cidade || "Local",
            state: addr.state || addr.uf || "SC",
            zipCode: addr.zipcode || addr.cep || "00000-000",
          },
          sender: {
            storeName: store?.name || "Loja Waesy",
            city: store?.city || "Chapecó",
            state: store?.state || "SC",
            zipCode: (store as any)?.zip_code || (store as any)?.zipcode || "89800-000",
          },
          channelSource: firstOrder.platform,
          totalItemsCount: firstOrder.items?.length || 1,
        });

        await sendZplToSerialPrinter(zplCode);
        toast.success("Etiqueta 100x150mm enviada para a impressora térmica.");
        return;
      } catch (serialErr: any) {
        if (!serialErr.message?.includes("Nenhuma porta")) {
          console.warn("[thermal] Falha na transmissão serial ZPL, usando pré-visualização:", serialErr);
        }
      }
    }

    if (candidateOrderId) {
      setSelectedShippingLabelOrderId(candidateOrderId);
      return;
    }

    toast.info("Nenhum pedido selecionado ou disponível para emitir etiqueta.");
  };

  const handleConnectEscPos = async () => {
    if (typeof navigator !== "undefined" && "serial" in navigator) {
      try {
        const { buildEscPosReceipt, sendBytesToSerialPrinter } = await import("@/lib/thermal-printer");
        const testReceiptBytes = buildEscPosReceipt({
          storeName: store?.name || "Waesy Platform",
          orderNumber: "TEST-01",
          orderDate: new Date().toLocaleDateString("pt-BR"),
          items: [{ name: "Teste de Conexão Térmica", qty: 1, priceCents: 0 }],
          subtotalCents: 0,
          totalCents: 0,
          paymentMethod: "TESTE",
          notes: "Impressora ESC/POS comunicando com sucesso via Web Serial API.",
        });

        await sendBytesToSerialPrinter(testReceiptBytes);
        toast.success("Impressora ESC/POS conectada com sucesso!");
      } catch (e: any) {
        if (!e.message?.includes("Nenhuma porta")) {
          toast.info("Para conexão térmica em rede, configure o IP no driver de impressão.");
        }
      }
    } else {
      toast.info("Conexão direta USB disponível no Google Chrome ou Microsoft Edge.");
      window.print();
    }
  };

  const handleScanSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!barcodeInput.trim()) return;
    scanMutation.mutate(barcodeInput.trim());
  };

  const toggleOrderSelection = (id: string) => {
    setSelectedOrderIdsForBatch((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const toggleSelectAllOrders = () => {
    if (selectedOrderIdsForBatch.length === pendingOrdersForPicking.length) {
      setSelectedOrderIdsForBatch([]);
    } else {
      setSelectedOrderIdsForBatch(pendingOrdersForPicking.map((o: any) => o.id));
    }
  };

  return (
    <div className="space-y-6 pb-24 w-full px-0 sm:px-4 md:px-0">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <PageHeader
          eyebrow={isFoodVertical ? "Delivery & Entregas" : "Envios & Separação"}
          title={isFoodVertical ? "Separação e Despacho" : "Separação e Envio"}
          description={
            isFoodVertical
              ? "Confira itens, imprima etiquetas e acompanhe pedidos de canais de entrega."
              : "Agrupe pedidos em lote, confira códigos e emita etiquetas e romaneios."
          }
        />
        <div className="flex flex-wrap items-center gap-2">
          <Button
            asChild
            variant="outline"
            className="h-11 rounded-lg text-xs font-semibold gap-2 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Link to={isFoodVertical ? "/workspace/pedidos/gestor" : "/workspace/pedidos"}>
              <ShoppingBag className="size-4" />
              <span>{isFoodVertical ? "Gestor de Pedidos" : "Lista de Pedidos"}</span>
            </Link>
          </Button>
          <Button
            variant="outline"
            className="h-11 rounded-lg text-xs font-semibold cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            onClick={handleConnectEscPos}
          >
            <Printer className="size-4 mr-2" /> Conectar Impressora
          </Button>
          <Button
            className="h-11 rounded-lg text-xs font-semibold bg-foreground text-background cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            onClick={handlePrintThermalLabels}
          >
            Imprimir Etiqueta
          </Button>
        </div>
      </div>

      {/* Camada 1: Leitor de Código de Barras */}
      <div className="bg-card rounded-lg border border-border p-4 sm:p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-sm text-foreground flex items-center gap-2">
            <ScanLine className="h-4 w-4 text-primary" /> Conferência por Código
          </h3>
          {activeSessionId && (
            <Badge variant="outline" className="text-xs font-mono">
              Sessão: {activeSessionId.substring(0, 8)}
            </Badge>
          )}
        </div>

        <form onSubmit={handleScanSubmit} className="flex flex-wrap sm:flex-nowrap gap-2">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Aponte o leitor ou digite o código de barras ou SKU..."
              value={barcodeInput}
              onChange={(e) => setBarcodeInput(e.target.value)}
              className="pl-9 h-11 rounded-lg text-sm"
              disabled={scanMutation.isPending}
            />
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={() => setIsCameraScannerOpen(true)}
            className="h-11 px-4 rounded-lg font-semibold border-border gap-2 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            title="Abrir câmera para escanear código de barras ou QR Code"
          >
            <Camera className="size-4 text-primary" />
            <span className="hidden sm:inline">Câmera</span>
          </Button>
          <Button
            type="submit"
            disabled={scanMutation.isPending || !barcodeInput.trim()}
            className="h-11 px-5 rounded-lg font-semibold bg-primary text-primary-foreground cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Barcode className="h-4 w-4 mr-2" /> Conferir
          </Button>
        </form>
      </div>

      {/* Camada 2: Lotes de Separação */}
      <section className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h3 className="font-bold text-sm text-foreground flex items-center gap-2">
              <Layers className="h-4 w-4 text-primary" /> Lotes de Separação
            </h3>
            <p className="text-xs text-muted-foreground">Agrupe pedidos pagos para conferir itens e gerar etiquetas.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsCreateBatchModalOpen(true)}
              className="h-11 rounded-lg text-xs font-semibold cursor-pointer gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Plus className="size-4" /> Novo Lote ({pendingOrdersForPicking.length})
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={!selectedBatch || batchOrderIds.length === 0 || manifestMutation.isPending}
              onClick={() => manifestMutation.mutate()}
              className="h-11 rounded-lg text-xs font-semibold cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Truck className="h-4 w-4 mr-2" /> Gerar Romaneio ({batchOrderIds.length})
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="py-8 text-center text-xs text-muted-foreground">Carregando lotes...</div>
        ) : batches.length === 0 ? (
          <div className="bg-card py-8 text-center text-xs text-muted-foreground border border-dashed border-border rounded-lg">
            Nenhum lote de separação aberto. Clique em "Novo Lote" para agrupar pedidos.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {batches.map((batch: any) => {
              const isSelected = selectedBatch?.id === batch.id;
              return (
                <div role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.currentTarget.click(); } }}
                  key={batch.id}
                  onClick={() => setSelectedBatchId(batch.id)}
                  className={`p-4 rounded-lg border transition-colors duration-200 cursor-pointer select-none space-y-3 ${
                    isSelected
                      ? "bg-primary/5 border-primary ring-2 ring-primary/20"
                      : "bg-card border-border hover:border-primary/40"
                  } focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-sm text-primary">{batch.batch_code}</span>
                    <div className="flex items-center gap-2">
                      {isSelected && (
                        <Badge className="text-xs bg-primary text-primary-foreground font-semibold">Ativo</Badge>
                      )}
                      <Badge variant="secondary" className="capitalize text-xs rounded-lg">{batch.status}</Badge>
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground space-y-1">
                    <div>Pedidos no Lote: <strong>{batch.total_orders || batch.sessions?.length || 0}</strong></div>
                    <div>Itens Separados: <strong>{batch.total_picked || 0} / {batch.total_items || 0}</strong></div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {selectedBatch && batchOrderIds.length > 0 && (
          <div className="pt-4 border-t border-border/60 space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-foreground">Pedidos no Lote ({selectedBatch.batch_code})</h4>
              <span className="text-xs text-muted-foreground">{batchOrderIds.length} pedido(s)</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {batchOrderIds.map((oId) => {
                const matchedOrder = allStoreOrders.find((o: any) => o.id === oId);
                const matchedSession = selectedBatch.sessions?.find((s: any) => s.order_id === oId);
                const sessionItems: any[] = matchedSession?.items || [];
                const firstLogistics =
                  sessionItems[0]?.order_item?.product_variants?.products?.attributes?.logistics ||
                  sessionItems[0]?.order_item?.products?.attributes?.logistics ||
                  {};
                const packagingLabelMap: Record<string, string> = {
                  box: "Caixa",
                  envelope: "Sacola/Envelope",
                  thermal_bag: "Bag Térmica",
                  roll: "Tubo/Rolo",
                  pallet: "Caixa Master",
                  digital: "Digital",
                };
                const packBadge = packagingLabelMap[firstLogistics.packaging_type || "box"] || "Caixa";
                return (
                  <div key={oId} className="flex flex-col justify-between gap-2 p-3 rounded-lg bg-card border border-border text-xs">
                    <div className="flex items-center justify-between gap-2">
                      <div className="truncate pr-2">
                        <span className="font-mono font-bold text-foreground">#{matchedOrder?.public_token || oId.substring(0, 8)}</span>
                        <p className="text-xs text-muted-foreground truncate">
                          {matchedOrder?.customer_snapshot?.name || "Cliente Final"}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-11 sm:h-8 px-3 text-xs rounded-lg gap-2 cursor-pointer shrink-0 font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        onClick={() => setSelectedShippingLabelOrderId(oId)}
                      >
                        <Printer className="size-3.5 text-primary" /> Etiqueta
                      </Button>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border/50">
                      <Badge variant="secondary" className="text-xs font-semibold">
                        {packBadge}
                      </Badge>
                      {firstLogistics.aisle_location && (
                        <Badge variant="outline" className="text-xs font-mono">
                          Local: {firstLogistics.aisle_location}
                        </Badge>
                      )}
                      {firstLogistics.fragile && (
                        <Badge variant="outline" className="text-xs font-bold text-warning border-warning/40 bg-warning/10">
                          Frágil
                        </Badge>
                      )}
                      {firstLogistics.thermal_control && firstLogistics.thermal_control !== "ambient" && (
                        <Badge variant="outline" className="text-xs font-bold text-primary border-primary/40 bg-primary/10">
                          Térmico
                        </Badge>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </section>

      {/* Camada 3: Pedidos de Canais Externos */}
      <div className="bg-card rounded-lg border border-border p-4 sm:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h3 className="font-bold text-sm text-foreground flex items-center gap-2">
              <Package className="h-4 w-4 text-primary" /> Pedidos de Canais Externos
            </h3>
            <p className="text-xs text-muted-foreground">
              {isFoodVertical
                ? "Pedidos importados do iFood, 99Food, TriDelivery, Amo Ofertas e Rappi."
                : "Pedidos importados de marketplaces e aplicativos integrados."}
            </p>
          </div>
          <div className="flex items-center gap-2 overflow-x-auto scroll-area-carousel pb-1 sm:pb-0">
            {(isFoodVertical
              ? [
                  { id: "all", label: "Todos" },
                  { id: "ifood", label: "iFood" },
                  { id: "99food", label: "99Food" },
                  { id: "tridelivery", label: "TriDelivery" },
                  { id: "amoofertas", label: "Amo Ofertas" },
                  { id: "rappi", label: "Rappi" },
                  { id: "aiqfome", label: "aiqfome" },
                ]
              : [
                  { id: "all", label: "Todos" },
                  { id: "mercadolivre", label: "Mercado Livre" },
                  { id: "shopee", label: "Shopee" },
                  { id: "magalu", label: "Magalu" },
                  { id: "ifood", label: "iFood" },
                  { id: "99food", label: "99Food" },
                  { id: "tridelivery", label: "TriDelivery" },
                ]
            ).map((ch) => (
              <button
                key={ch.id}
                type="button"
                onClick={() => setChannelFilter(ch.id)}
                className={`h-11 sm:h-9 px-4 rounded-lg text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                  channelFilter === ch.id ? "bg-foreground text-background" : "bg-muted text-muted-foreground hover:text-foreground"
                } focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`}
              >
                {ch.label}
              </button>
            ))}
          </div>
        </div>

        {visibleExternalOrders.length === 0 ? (
          <div className="py-8 text-center text-xs text-muted-foreground border border-dashed border-border rounded-lg">
            Nenhum pedido externo aguardando despacho no filtro selecionado.
          </div>
        ) : (
          <div className="divide-y divide-border/60">
            {visibleExternalOrders.map((ord: ExternalOrderDTO) => {
              const isTestRow =
                String(ord.external_order_id || "").toUpperCase().startsWith("TEST") ||
                !ord.order_id;
              return (
                <div key={ord.id} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
                  <div className="space-y-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs font-bold text-foreground">#{ord.external_order_id}</span>
                      <Badge variant="outline" className="text-xs capitalize">
                        {ord.platform}
                      </Badge>
                      {String(ord.external_order_id || "").toUpperCase().startsWith("TEST") && (
                        <Badge variant="secondary" className="text-xs">
                          Teste Webhook
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground truncate">
                      {ord.buyer_name || "Cliente Final"} • {ord.items?.length || 1} item(s)
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center justify-between sm:justify-end gap-3 pt-1 sm:pt-0 border-t border-border/40 sm:border-0 shrink-0">
                    <div className="text-left sm:text-right tabular-nums">
                      <p className="text-xs font-semibold text-foreground">{formatMoney(ord.total_amount_cents)}</p>
                      <p className="text-xs text-muted-foreground">Taxa: {formatMoney(ord.marketplace_fee_cents)}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {(ord.order_id || ord.id) && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-11 sm:h-9 px-4 sm:px-3 text-xs rounded-lg gap-2 cursor-pointer shrink-0 font-semibold sm:font-normal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          onClick={() => setSelectedShippingLabelOrderId(ord.order_id || ord.id)}
                        >
                          <Printer className="size-3.5 text-primary" /> Etiqueta
                        </Button>
                      )}
                      {isTestRow && (
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={deleteExternalMutation.isPending}
                          className="h-11 sm:h-9 px-3 text-xs rounded-lg gap-2 text-destructive hover:text-destructive hover:bg-destructive/10 cursor-pointer shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          onClick={() => deleteExternalMutation.mutate(ord.id)}
                          title="Excluir registro de teste do banco de dados"
                        >
                          <Trash2 className="size-3.5" /> Remover Teste
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal: Criar Novo Lote de Separação */}
      <Dialog open={isCreateBatchModalOpen} onOpenChange={setIsCreateBatchModalOpen}>
        <DialogContent className="max-w-xl rounded-lg">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-foreground">Novo Lote de Separação</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Selecione pedidos pagos para agrupar e conferir os itens antes da entrega.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="flex items-center justify-between text-xs font-semibold px-1">
              <span>{pendingOrdersForPicking.length} pedido(s) elegível(is)</span>
              <button
                type="button"
                onClick={toggleSelectAllOrders}
                className="text-primary hover:underline cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {selectedOrderIdsForBatch.length === pendingOrdersForPicking.length
                  ? "Desmarcar Todos"
                  : "Selecionar Todos"}
              </button>
            </div>

            <div className="max-h-72 overflow-y-auto divide-y divide-border border rounded-lg p-2 space-y-1">
              {pendingOrdersForPicking.length === 0 ? (
                <div className="py-8 text-center text-xs text-muted-foreground">
                  Nenhum pedido pago aguardando separação.
                </div>
              ) : (
                pendingOrdersForPicking.map((ord: any) => {
                  const isChecked = selectedOrderIdsForBatch.includes(ord.id);
                  return (
                    <div role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.currentTarget.click(); } }}
                      key={ord.id}
                      onClick={() => toggleOrderSelection(ord.id)}
                      className={`p-3 rounded-lg flex items-center justify-between cursor-pointer transition-colors ${
                        isChecked ? "bg-primary/10 border border-primary/30" : "hover:bg-muted/50"
                      } focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`size-4 rounded flex items-center justify-center border ${
                            isChecked ? "bg-primary border-primary text-primary-foreground" : "border-muted-foreground"
                          }`}
                        >
                          {isChecked && <Check className="size-3" />}
                        </div>
                        <div>
                          <p className="text-xs font-bold text-foreground font-mono">
                            #{ord.public_token?.slice(0, 8) || ord.id.slice(0, 8)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {ord.customer_snapshot?.name || "Cliente"} • {ord.channel_origin || "Loja Online"}
                          </p>
                        </div>
                      </div>
                      <span className="text-xs font-bold text-foreground font-mono">
                        {formatMoney(ord.total_cents || 0)}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              className="h-11 rounded-lg text-xs font-semibold cursor-pointer"
              onClick={() => setIsCreateBatchModalOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              disabled={selectedOrderIdsForBatch.length === 0 || createBatchMutation.isPending}
              onClick={() => createBatchMutation.mutate(selectedOrderIdsForBatch)}
              className="h-11 rounded-lg text-xs font-semibold bg-primary text-primary-foreground cursor-pointer"
            >
              {createBatchMutation.isPending
                ? "Criando..."
                : `Criar Lote (${selectedOrderIdsForBatch.length})`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {selectedShippingLabelOrderId && (
        <ShippingLabelModal
          orderId={selectedShippingLabelOrderId}
          isOpen={!!selectedShippingLabelOrderId}
          onClose={() => setSelectedShippingLabelOrderId(null)}
          onDispatchSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ["wms-batches"] });
            queryClient.invalidateQueries({ queryKey: ["orders-for-picking"] });
            queryClient.invalidateQueries({ queryKey: ["marketplace-external-orders"] });
          }}
        />
      )}

      {/* Modal: Romaneio de Carga Imprimível */}
      <Dialog open={!!manifestPreview} onOpenChange={(open) => !open && setManifestPreview(null)}>
        <DialogContent className="max-w-2xl rounded-lg">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-foreground flex items-center gap-2">
              <FileText className="size-4 text-primary" /> Romaneio de Carga {manifestPreview?.manifestCode}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              {manifestPreview?.storeName || store?.name || "Loja"} • {manifestPreview?.carrierName} • {manifestPreview?.totalOrders || 0} pedido(s)
            </DialogDescription>
          </DialogHeader>

          {manifestPreview && (
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-3 rounded-lg bg-muted/40 border border-border text-xs">
                <div>
                  <span className="text-muted-foreground block">Código do Romaneio</span>
                  <strong className="font-mono text-foreground">{manifestPreview.manifestCode}</strong>
                </div>
                <div>
                  <span className="text-muted-foreground block">Volumes</span>
                  <strong className="text-foreground">{manifestPreview.totalOrders} pedido(s)</strong>
                </div>
                <div>
                  <span className="text-muted-foreground block">Valor Total Declarado</span>
                  <strong className="text-foreground tabular-nums">
                    {formatMoney(manifestPreview.totalVolumeValueCents || 0)}
                  </strong>
                </div>
              </div>

              <div className="max-h-72 overflow-y-auto border border-border rounded-lg divide-y divide-border">
                {(manifestPreview.orders || []).map((ord: any) => (
                  <div key={ord.orderId} className="p-3 flex items-center justify-between gap-3 text-xs">
                    <div className="min-w-0">
                      <p className="font-mono font-bold text-foreground">#{ord.orderCode}</p>
                      <p className="text-muted-foreground truncate">
                        {ord.customerName}
                        {ord.address?.city ? ` • ${ord.address.city}/${ord.address.state || ""}` : ""}
                      </p>
                    </div>
                    <span className="font-mono font-semibold text-foreground shrink-0 tabular-nums">
                      {formatMoney(ord.totalCents || 0)}
                    </span>
                  </div>
                ))}
              </div>

              <div className="pt-4 border-t border-dashed border-border text-xs text-muted-foreground flex items-center justify-between">
                <span>Assinatura do Responsável pela Coleta: _______________________________</span>
                <span>{new Date(manifestPreview.generatedAt).toLocaleString("pt-BR")}</span>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              className="h-11 rounded-lg text-xs font-semibold cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              onClick={() => setManifestPreview(null)}
            >
              Fechar
            </Button>
            <Button
              className="h-11 rounded-lg text-xs font-semibold bg-primary text-primary-foreground cursor-pointer gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              onClick={() => window.print()}
            >
              <Printer className="size-4" /> Imprimir Romaneio
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <BarcodeScannerModal
        open={isCameraScannerOpen}
        onOpenChange={setIsCameraScannerOpen}
        onScan={(res) => {
          setBarcodeInput(res.raw);
          if (activeSessionId) {
            scanMutation.mutate(res.raw);
          } else {
            toast.info(`Código capturado: ${res.raw}. Selecione uma sessão ativa no lote para conferência.`);
          }
        }}
        title="Leitor de Código de Barras"
      />
    </div>
  );
}

export default WmsExpedicaoPage;
