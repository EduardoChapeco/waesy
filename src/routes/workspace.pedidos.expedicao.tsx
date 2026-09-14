import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  Barcode, 
  Package, 
  Truck, 
  CheckCircle2, 
  AlertCircle, 
  Layers, 
  Search,
  ScanLine,
  Printer,
  Plus,
  Clock,
  ShoppingBag,
  Store,
  Check
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/commerce/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { 
  listPickingBatches, 
  scanBarcodePickItem, 
  generateShippingManifest,
  createPickingBatch
} from "@/services/wms.functions";
import { listOrders } from "@/services/order.functions";
import { getStoreSettings } from "@/services/store.functions";
import { 
  listMarketplaceExternalOrders,
  type ExternalOrderDTO
} from "@/services/marketplace-hub.functions";
import { formatMoney } from "@/lib/money";

export const Route = createFileRoute("/workspace/pedidos/expedicao")({
  head: () => ({ meta: [{ title: "WMS Expedição & Picking | Waesy" }] }),
  component: WmsExpedicaoPage,
});

function WmsExpedicaoPage() {
  const queryClient = useQueryClient();
  const [barcodeInput, setBarcodeInput] = useState("");
  const [selectedBatchId, setSelectedBatchId] = useState<string | null>(null);
  const [channelFilter, setChannelFilter] = useState<string>("all");
  const [isCreateBatchModalOpen, setIsCreateBatchModalOpen] = useState(false);
  const [selectedOrderIdsForBatch, setSelectedOrderIdsForBatch] = useState<string[]>([]);

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
    onSuccess: (data) => {
      toast.success(`Item "${data.matchedItemTitle}" conferido (${data.qtyPicked}/${data.qtyExpected})`);
      setBarcodeInput("");
      queryClient.invalidateQueries({ queryKey: ["wms-batches"] });
    },
    onError: (err: Error) => {
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
      toast.success(`Romaneio ${res.manifestCode} gerado com sucesso para ${res.totalOrders} pedidos!`);
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
      toast.success(`Onda de separação criada com sucesso (${res.totalOrders} pedidos)!`);
      setIsCreateBatchModalOpen(false);
      setSelectedOrderIdsForBatch([]);
      queryClient.invalidateQueries({ queryKey: ["wms-batches"] });
    },
    onError: (err: Error) => {
      toast.error(err.message || "Erro ao criar onda de separação.");
    },
  });

  const handlePrintThermalLabels = async () => {
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
            storeName: store?.name || "Waesy Hub Logístico",
            city: store?.city || "Chapecó",
            state: store?.state || "SC",
            zipCode: store?.zipcode || "89800-000",
          },
          channelSource: firstOrder.platform,
          totalItemsCount: firstOrder.items?.length || 1,
        });

        await sendZplToSerialPrinter(zplCode);
        toast.success("Etiqueta ZPL (100x150mm) transmitida com sucesso para a impressora térmica!");
        return;
      } catch (serialErr: any) {
        if (!serialErr.message?.includes("Nenhuma porta")) {
          console.warn("[thermal] Falha na transmissão serial ZPL, usando fallback visual:", serialErr);
        }
      }
    }

    toast.info("Enviando etiquetas para impressão...");
    window.print();
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
    <div className="space-y-6 pb-20 w-full max-w-7xl mx-auto px-0 sm:px-4 md:px-0">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <PageHeader 
          eyebrow="Logística & Expedição"
          title="Conferência & Picking (WMS)" 
          description="Separação por ondas, conferência por código de barras e emissão de romaneios de despacho."
        />
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            className="h-11 rounded-xl text-xs font-semibold cursor-pointer"
            onClick={handleConnectEscPos}
          >
            <Printer className="size-4 mr-1.5" /> Conectar Impressora
          </Button>
          <Button
            className="h-11 rounded-xl text-xs font-semibold bg-foreground text-background cursor-pointer"
            onClick={handlePrintThermalLabels}
          >
            Imprimir Etiquetas 100x150
          </Button>
        </div>
      </div>

      {/* Camada 1: Leitor Ótico de Código de Barras */}
      <div className="bg-card rounded-2xl border border-border p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-sm text-foreground flex items-center gap-2">
            <ScanLine className="h-4 w-4 text-primary" /> Bipagem de Produtos
          </h3>
          {activeSessionId && (
            <Badge variant="outline" className="text-xs font-mono">
              Sessão: {activeSessionId.substring(0, 8)}
            </Badge>
          )}
        </div>

        <form onSubmit={handleScanSubmit} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              type="text"
              placeholder="Aponte o leitor ou digite o EAN, SKU ou Código de Barras..."
              value={barcodeInput}
              onChange={(e) => setBarcodeInput(e.target.value)}
              className="pl-9 h-11 rounded-xl text-sm"
              autoFocus
              disabled={scanMutation.isPending}
            />
          </div>
          <Button 
            type="submit" 
            disabled={scanMutation.isPending || !barcodeInput.trim()}
            className="h-11 px-5 rounded-xl font-semibold bg-primary text-primary-foreground cursor-pointer"
          >
            <Barcode className="h-4 w-4 mr-2" /> Bipar
          </Button>
        </form>
      </div>

      {/* Camada 2: Ondas de Separação (Lotes Ativos) */}
      <div className="bg-card rounded-2xl border border-border p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h3 className="font-bold text-sm text-foreground flex items-center gap-2">
              <Layers className="h-4 w-4 text-primary" /> Ondas de Separação (Lotes Ativos)
            </h3>
            <p className="text-xs text-muted-foreground">Lotes de pedidos agrupados para picking simultâneo.</p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsCreateBatchModalOpen(true)}
              className="h-11 rounded-xl text-xs font-semibold cursor-pointer gap-1.5"
            >
              <Plus className="size-4" /> Nova Onda ({pendingOrdersForPicking.length} pendentes)
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              disabled={!selectedBatch || batchOrderIds.length === 0 || manifestMutation.isPending}
              onClick={() => manifestMutation.mutate()}
              className="h-11 rounded-xl text-xs font-semibold cursor-pointer"
            >
              <Truck className="h-4 w-4 mr-1.5" /> Gerar Romaneio ({batchOrderIds.length})
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="py-8 text-center text-xs text-muted-foreground">Carregando lotes...</div>
        ) : batches.length === 0 ? (
          <div className="py-8 text-center text-xs text-muted-foreground border border-dashed border-border rounded-xl">
            Nenhum lote de separação em andamento. Clique em "Nova Onda" para agrupar pedidos.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {batches.map((batch: any) => {
              const isSelected = selectedBatch?.id === batch.id;
              return (
                <div 
                  key={batch.id} 
                  onClick={() => setSelectedBatchId(batch.id)}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer select-none space-y-3 ${
                    isSelected 
                      ? "bg-primary/5 border-primary shadow-xs ring-2 ring-primary/20" 
                      : "bg-muted/40 border-border hover:border-primary/40"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-sm text-primary">{batch.batch_code}</span>
                    <div className="flex items-center gap-1.5">
                      {isSelected && (
                        <Badge className="text-[10px] bg-primary text-primary-foreground font-semibold">Ativo</Badge>
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
      </div>

      {/* Camada 3: Pedidos Multicanal & Expedição Integrada */}
      <div className="bg-card rounded-2xl border border-border p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h3 className="font-bold text-sm text-foreground flex items-center gap-2">
              <Package className="h-4 w-4 text-primary" /> Fila de Despacho Multicanal
            </h3>
            <p className="text-xs text-muted-foreground">Pedidos do Mercado Livre, iFood, Shopee e loja própria.</p>
          </div>
          <div className="flex items-center gap-1.5 overflow-x-auto">
            {["all", "mercadolivre", "ifood", "shopee"].map((ch) => (
              <button
                key={ch}
                type="button"
                onClick={() => setChannelFilter(ch)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                  channelFilter === ch ? "bg-foreground text-background" : "bg-muted text-muted-foreground hover:text-foreground"
                }`}
              >
                {ch === "all" ? "Todos" : ch === "mercadolivre" ? "Mercado Livre" : ch === "ifood" ? "iFood" : "Shopee"}
              </button>
            ))}
          </div>
        </div>

        {externalOrders.length === 0 ? (
          <div className="py-8 text-center text-xs text-muted-foreground border border-dashed border-border rounded-xl">
            Nenhum pedido externo aguardando despacho no filtro selecionado.
          </div>
        ) : (
          <div className="divide-y divide-border/60">
            {externalOrders.map((ord: ExternalOrderDTO) => (
              <div key={ord.id} className="py-3 flex items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-foreground">#{ord.external_order_id}</span>
                    <Badge variant="outline" className="text-[10px] capitalize">
                      {ord.platform}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">{ord.buyer_name || "Cliente Final"} • {ord.items?.length || 1} item(s)</p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-semibold text-foreground">{formatMoney(ord.total_amount_cents)}</p>
                  <p className="text-[10px] text-muted-foreground">Taxa: {formatMoney(ord.marketplace_fee_cents)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal: Criar Nova Onda de Separação */}
      <Dialog open={isCreateBatchModalOpen} onOpenChange={setIsCreateBatchModalOpen}>
        <DialogContent className="max-w-xl rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-foreground">Nova Onda de Separação</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Selecione os pedidos pagos pendentes para agrupar na conferência WMS.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="flex items-center justify-between text-xs font-semibold px-1">
              <span>{pendingOrdersForPicking.length} pedido(s) elegível(is)</span>
              <button
                type="button"
                onClick={toggleSelectAllOrders}
                className="text-primary hover:underline cursor-pointer"
              >
                {selectedOrderIdsForBatch.length === pendingOrdersForPicking.length
                  ? "Desmarcar Todos"
                  : "Selecionar Todos"}
              </button>
            </div>

            <div className="max-h-72 overflow-y-auto divide-y divide-border border rounded-xl p-2 space-y-1">
              {pendingOrdersForPicking.length === 0 ? (
                <div className="py-8 text-center text-xs text-muted-foreground">
                  Nenhum pedido pago aguardando separação.
                </div>
              ) : (
                pendingOrdersForPicking.map((ord: any) => {
                  const isChecked = selectedOrderIdsForBatch.includes(ord.id);
                  return (
                    <div
                      key={ord.id}
                      onClick={() => toggleOrderSelection(ord.id)}
                      className={`p-2.5 rounded-lg flex items-center justify-between cursor-pointer transition-colors ${
                        isChecked ? "bg-primary/10 border border-primary/30" : "hover:bg-muted/50"
                      }`}
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
                          <p className="text-[10px] text-muted-foreground">
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
              className="h-11 rounded-xl text-xs font-semibold cursor-pointer"
              onClick={() => setIsCreateBatchModalOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              disabled={selectedOrderIdsForBatch.length === 0 || createBatchMutation.isPending}
              onClick={() => createBatchMutation.mutate(selectedOrderIdsForBatch)}
              className="h-11 rounded-xl text-xs font-semibold bg-primary text-primary-foreground cursor-pointer"
            >
              {createBatchMutation.isPending
                ? "Criando..."
                : `Criar Lote (${selectedOrderIdsForBatch.length})`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default WmsExpedicaoPage;
