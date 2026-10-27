import { NativeMobileHeader } from "@/components/navigation/native-mobile-header";
import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useState, useRef, useMemo } from "react";
import { formatMoney } from "@/lib/money";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EmptyState } from "@/components/state/states";
import {
  listCustomerAfterSales,
  createCustomerAfterSalesRequest,
  cancelCustomerAfterSalesRequest,
  CustomerAfterSalesRequestDTO,
} from "@/services/rma.functions";
import { listCustomerOrders } from "@/services/order.functions";
import {
  RefreshCw,
  Package,
  Truck,
  FileText,
  Plus,
  ArrowRight,
  CheckCircle2,
  Clock,
  AlertCircle,
  X,
  Loader2,
  HelpCircle,
  ShieldCheck,
  Camera,
  ExternalLink,
  ChevronRight,
  Undo2,
} from "lucide-react";
import { formatDate } from "@/lib/datetime";
import { toast } from "sonner";
import { extractMediaFromClipboard } from "@/lib/clipboard-media";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_store/conta/trocas")({
  head: () => ({ meta: [{ title: "Trocas e Devoluções | Waesy" }] }),
  loader: async () => {
    try {
      const [requests, orders] = await Promise.all([
        listCustomerAfterSales().catch(() => []),
        listCustomerOrders().catch(() => []),
      ]);
      return {
        requests: requests || [],
        orders: orders || [],
      };
    } catch (err) {
      console.error("[loader:_store.conta.trocas] Unhandled error:", err);
      return { requests: [], orders: [] };
    }
  },
  component: CustomerAfterSalesPage,
});

const STATUS_VARIANTS: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  pending: "secondary",
  authorized: "default",
  shipped_back: "outline",
  received: "default",
  inspected: "secondary",
  resolved: "default",
  rejected: "destructive",
  cancelled: "secondary",
};

function CustomerAfterSalesPage() {
  const { requests, orders } = Route.useLoaderData() as {
    requests: CustomerAfterSalesRequestDTO[];
    orders: any[];
  };
  const router = useRouter();

  const [filterTab, setFilterTab] = useState<"todos" | "andamento" | "concluidas" | "rejeitadas">("todos");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [cancelModalRequestId, setCancelModalRequestId] = useState<string | null>(null);

  // Form State
  const [selectedOrderId, setSelectedOrderId] = useState<string>("");
  const [requestType, setRequestType] = useState<"return" | "exchange" | "warranty">("return");
  const [selectedItemIds, setSelectedItemIds] = useState<Record<string, number>>({});
  const [reason, setReason] = useState<string>("Tamanho ou modelo incompatível");
  const [notes, setNotes] = useState<string>("");
  const [claimPhotoUrl, setClaimPhotoUrl] = useState<string>("");
  const [claimPhotoBase64, setClaimPhotoBase64] = useState<string>("");
  const [previewPhoto, setPreviewPhoto] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const selectedOrder = useMemo(() => {
    return orders.find((o) => o.id === selectedOrderId);
  }, [orders, selectedOrderId]);

  // Filtro de solicitações
  const filteredRequests = useMemo(() => {
    return requests.filter((r) => {
      if (filterTab === "andamento") {
        return ["pending", "authorized", "shipped_back", "received", "inspected"].includes(r.status);
      }
      if (filterTab === "concluidas") {
        return r.status === "resolved";
      }
      if (filterTab === "rejeitadas") {
        return r.status === "rejected" || r.status === "cancelled";
      }
      return true;
    });
  }, [requests, filterTab]);

  // Manipulação de imagem da evidência (EARS-03)
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Selecione apenas arquivos de imagem (PNG, JPG, WebP).");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error("A imagem deve ter no máximo 10MB.");
      return;
    }

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const base64 = reader.result as string;
      setClaimPhotoBase64(base64);
      setPreviewPhoto(base64);
      setClaimPhotoUrl("");
      toast.success("Foto do produto anexada!");
    };
    reader.onerror = () => toast.error("Falha ao ler arquivo de imagem.");
  };

  const handleDropzonePaste = async (e: React.ClipboardEvent) => {
    const items = await extractMediaFromClipboard(e);
    if (items && items.length > 0) {
      e.preventDefault();
      const item = items[0];
      const reader = new FileReader();
      reader.readAsDataURL(item.file);
      reader.onload = () => {
        const base64 = reader.result as string;
        setClaimPhotoBase64(base64);
        setPreviewPhoto(base64);
        setClaimPhotoUrl("");
        toast.success("Foto colada da área de transferência!");
      };
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const base64 = reader.result as string;
        setClaimPhotoBase64(base64);
        setPreviewPhoto(base64);
        setClaimPhotoUrl("");
        toast.success("Foto anexada via arrastar e soltar!");
      };
    }
  };

  const handleClearPhoto = () => {
    setPreviewPhoto(null);
    setClaimPhotoUrl("");
    setClaimPhotoBase64("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSubmitRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrderId) {
      toast.error("Selecione um pedido para solicitar a troca ou devolução.");
      return;
    }

    setIsSubmitting(true);
    try {
      // Itens do pedido selecionado
      const orderItems = selectedOrder?.items || selectedOrder?.order_items || [];
      const itemsPayload =
        orderItems.length > 0
          ? orderItems.map((it: any) => ({
              order_item_id: it.id || it.product_id,
              qty: selectedItemIds[it.id] || it.quantity || 1,
              reason,
            }))
          : [
              {
                order_item_id: selectedOrderId,
                qty: 1,
                reason,
              },
            ];

      await createCustomerAfterSalesRequest({
        data: {
          orderId: selectedOrderId,
          type: requestType,
          reason,
          notes: notes.trim() || undefined,
          claimPhotoUrl: claimPhotoUrl.trim() || undefined,
          claimPhotoBase64: claimPhotoBase64 || undefined,
          items: itemsPayload,
        },
      });

      toast.success("Solicitação enviada com sucesso! Acompanhe o status por aqui.");
      setIsModalOpen(false);
      setSelectedOrderId("");
      setNotes("");
      handleClearPhoto();
      router.invalidate();
    } catch (err: any) {
      toast.error(err?.message || "Não foi possível enviar sua solicitação.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelRequest = async (requestId: string) => {
    try {
      await cancelCustomerAfterSalesRequest({ data: { requestId } });
      toast.success("Solicitação cancelada com sucesso.");
      setCancelModalRequestId(null);
      router.invalidate();
    } catch (err: any) {
      toast.error(err?.message || "Erro ao cancelar solicitação.");
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto space-y-4 sm:space-y-6 pb-safe pb-24 px-0 sm:px-4 md:px-0 animate-in fade-in duration-200 motion-reduce:animate-none">
      {/* ── 0. Native Mobile Header (<768px) ── */}
      <NativeMobileHeader
        title="Trocas e Devoluções"
        fallbackHref="/conta"
        mobileOnly
        rightActions={
          <Button
            onClick={() => setIsModalOpen(true)}
            className="rounded-lg h-11 min-h-11 px-3 text-xs font-bold gap-1 bg-foreground text-background hover:bg-foreground/90 shrink-0 cursor-pointer focus-visible:ring-2 focus-visible:ring-primary"
          >
            <Plus size={16} />
            <span>Nova</span>
          </Button>
        }
      />

      {/* ── 1. Desktop Inpage Header (>=768px) ── */}
      <div className="hidden md:flex items-center justify-between gap-4 border-b border-border/40 pb-5 pt-2">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
              Trocas e Devoluções
            </h1>
            {requests.length > 0 && (
              <Badge variant="secondary" className="text-xs font-mono font-bold px-3 py-1 rounded-full">
                {requests.length}
              </Badge>
            )}
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Acompanhe trocas, devoluções, garantias e reembolsos das suas compras em um só lugar.
          </p>
        </div>

        <Button
          size="default"
          onClick={() => setIsModalOpen(true)}
          className="rounded-lg h-11 min-h-11 px-5 text-xs font-semibold gap-2 bg-foreground text-background hover:bg-foreground/90 shrink-0 cursor-pointer focus-visible:ring-2 focus-visible:ring-primary"
        >
          <Plus className="size-4" />
          <span>Nova Solicitação</span>
        </Button>
      </div>

      {/* ── 2. Segmented Tabs Filter (B.39 - Linha Única Horizontal) ── */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar px-2 sm:px-0">
        {(["todos", "andamento", "concluidas", "rejeitadas"] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setFilterTab(tab)}
            className={cn(
              "h-11 min-h-11 px-4 rounded-lg text-xs font-bold whitespace-nowrap transition-colors focus-visible:ring-2 focus-visible:ring-primary capitalize cursor-pointer",
              filterTab === tab
                ? "bg-foreground text-background"
                : "bg-muted/40 text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            {tab === "todos"
              ? "Todas as Solicitações"
              : tab === "andamento"
              ? "Em Andamento"
              : tab === "concluidas"
              ? "Concluídas"
              : "Rejeitadas / Canceladas"}
          </button>
        ))}
      </div>

      {/* ── 3. Lista de Solicitações (Apple HIG Grouped Cards) ── */}
      {filteredRequests.length === 0 ? (
        <div className="px-2 sm:px-0">
          <EmptyState
            title="Nenhuma solicitação em andamento"
            description="Quando você pedir uma troca, devolução ou garantia de um produto, poderá acompanhar todo o processo por aqui."
            action={
              <div className="flex flex-wrap items-center justify-center gap-2">
                <Button
                  onClick={() => setIsModalOpen(true)}
                  className="h-11 min-h-11 rounded-lg px-6 text-xs font-bold bg-foreground text-background hover:bg-foreground/90 cursor-pointer focus-visible:ring-2 focus-visible:ring-primary"
                >
                  <Plus size={16} className="mr-2" />
                  Nova Solicitação
                </Button>
                <Button
                  asChild
                  variant="outline"
                  className="h-11 min-h-11 rounded-lg px-5 text-xs font-bold border-border cursor-pointer focus-visible:ring-2 focus-visible:ring-primary"
                >
                  <Link to="/conta/pedidos">Ver Meus Pedidos</Link>
                </Button>
              </div>
            }
          />
        </div>
      ) : (
        <div className="space-y-4 px-2 sm:px-0">
          {filteredRequests.map((req) => (
            <div
              key={req.id}
              className="bg-card rounded-xl border border-border/60 shadow-xs overflow-hidden transition-colors duration-200 hover:border-foreground/20"
            >
              {/* Header do Card Agrupado */}
              <div className="p-4 sm:p-5 flex flex-wrap items-center justify-between gap-3 bg-muted/20 border-b border-border/40">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="size-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0 border border-border/40">
                    <Package className="size-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs sm:text-sm font-bold text-foreground flex items-center gap-2 flex-wrap">
                      <span>{req.typeLabel}</span>
                      {req.orderToken && (
                        <span className="font-mono text-xs text-muted-foreground">
                          • Pedido #{req.orderToken}
                        </span>
                      )}
                    </p>
                    <p className="text-2xs text-muted-foreground flex items-center gap-2 mt-1">
                      <Clock className="size-3" />
                      Enviado em {formatDate(req.requestedAt)} • {req.storeName}
                    </p>
                  </div>
                </div>

                <Badge
                  variant={STATUS_VARIANTS[req.status] ?? "secondary"}
                  className="rounded-md px-3 py-1 text-xs font-semibold shrink-0"
                >
                  {req.statusLabel}
                </Badge>
              </div>

              {/* Corpo do Card */}
              <div className="p-4 sm:p-5 space-y-4">
                {/* Descrição contextual amigável do status (EARS-01) */}
                <div className="p-4 rounded-lg bg-muted/30 border border-border/40 text-xs text-muted-foreground space-y-1">
                  <span className="font-bold text-foreground block">Próximo Passo / Situação:</span>
                  <p className="break-words text-wrap leading-relaxed">{req.statusDescription}</p>
                </div>

                {/* Motivo do Cliente */}
                {req.customerNotes && (
                  <div className="bg-background p-4 rounded-lg border border-border/40 space-y-1">
                    <span className="text-2xs font-semibold text-muted-foreground uppercase tracking-wider block">
                      Observação Informada
                    </span>
                    <p className="text-xs text-foreground leading-relaxed break-words text-wrap">
                      "{req.customerNotes}"
                    </p>
                  </div>
                )}

                {/* Foto Anexada (se houver) */}
                {req.claimPhotoUrl && (
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/20 border border-border/40">
                    <img
                      src={req.claimPhotoUrl}
                      alt="Foto anexada"
                      className="size-12 rounded-lg object-cover border border-border/60 shrink-0"
                    />
                    <div className="space-y-1 min-w-0 flex-1">
                      <span className="text-xs font-semibold text-foreground flex items-center gap-2">
                        <Camera className="size-4 text-primary" /> Foto do Produto Anexada
                      </span>
                      <span className="text-2xs text-muted-foreground block">
                        Submetida à verificação da loja para validação do atendimento.
                      </span>
                    </div>
                  </div>
                )}

                {req.orderTotalCents > 0 && (
                  <div className="flex items-baseline justify-between text-xs pt-1 border-t border-border/40 font-mono">
                    <span className="text-muted-foreground font-sans">Valor do Pedido Original:</span>
                    <span className="font-black text-sm text-foreground">
                      {formatMoney(req.orderTotalCents)}
                    </span>
                  </div>
                )}

                {/* Bloco de Envio da Devolução (se aprovado pela loja) */}
                {req.returnTrackingCode && (
                  <div className="p-4 rounded-xl bg-primary/5 border border-primary/20 space-y-3">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2 font-bold text-foreground text-xs sm:text-sm">
                        <Truck className="size-4 text-primary" />
                        <span>Código de Postagem ({req.returnCarrier || "Correios"})</span>
                      </div>
                      <Badge variant="outline" className="text-2xs uppercase font-mono border-primary/30 text-primary">
                        Frete Pago pela Loja
                      </Badge>
                    </div>

                    <p className="text-xs text-muted-foreground">
                      Leve o produto devidamente embalado a qualquer agência credenciada e informe o código abaixo:
                    </p>

                    <div className="bg-card p-3 rounded-lg text-center border border-border/60 select-all font-mono text-base sm:text-lg font-black tracking-widest text-primary">
                      {req.returnTrackingCode}
                    </div>

                    {req.returnLabelUrl && (
                      <Button
                        asChild
                        variant="outline"
                        className="w-full h-11 min-h-11 rounded-lg text-xs font-bold cursor-pointer border-border focus-visible:ring-2 focus-visible:ring-primary"
                      >
                        <a href={req.returnLabelUrl} target="_blank" rel="noopener noreferrer">
                          <FileText className="size-4 mr-2" />
                          Baixar Declaração de Conteúdo / Etiqueta de Envio
                        </a>
                      </Button>
                    )}
                  </div>
                )}

                {/* Ações Rápidas & Suporte */}
                <div className="flex items-center justify-between pt-2 border-t border-border/40 gap-2">
                  <div>
                    {["pending", "authorized"].includes(req.status) && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setCancelModalRequestId(req.id)}
                        className="h-11 min-h-11 px-3 text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-500/10 cursor-pointer -ml-2"
                      >
                        Cancelar Solicitação
                      </Button>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      asChild
                      variant="outline"
                      size="sm"
                      className="h-11 min-h-11 px-4 rounded-lg text-xs font-bold border-border cursor-pointer focus-visible:ring-2 focus-visible:ring-primary"
                    >
                      <Link
                        to={"/u/suporte" as any}
                        search={{
                          motivo: "pos_venda",
                          request_id: req.id,
                          pedido: req.orderToken,
                          loja: req.storeName,
                        } as any}
                      >
                        <HelpCircle className="size-3.5 mr-2" /> Preciso de Ajuda
                      </Link>
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── 4. Modal Comercial: Nova Solicitação (EARS-02 / EARS-03) ── */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-lg rounded-xl p-0 overflow-hidden border border-border/80 shadow-md">
          <DialogHeader className="p-5 pb-4 bg-muted/20 border-b border-border/40">
            <DialogTitle className="text-base sm:text-lg font-bold text-foreground flex items-center gap-2">
              <RefreshCw className="size-5 text-primary" />
              Solicitar Troca, Devolução ou Garantia
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Você tem até 7 dias corridos após a entrega para solicitar arrependimento ou troca, ou 90 dias para defeitos de fabricação.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmitRequest} className="p-5 sm:p-6 space-y-4">
            {/* 1. Seleção do Pedido Elegível */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-foreground">
                Selecione a Compra *
              </label>
              {orders.length === 0 ? (
                <div className="p-4 bg-muted/30 rounded-lg text-xs text-muted-foreground border border-border/40">
                  Nenhuma compra entregue elegível localizada na sua conta.
                </div>
              ) : (
                <Select value={selectedOrderId} onValueChange={setSelectedOrderId}>
                  <SelectTrigger className="h-11 min-h-11 rounded-lg bg-background border-border/70 text-xs">
                    <SelectValue placeholder="Escolha um pedido recente..." />
                  </SelectTrigger>
                  <SelectContent className="rounded-lg">
                    {orders.map((order) => (
                      <SelectItem key={order.id} value={order.id} className="text-xs">
                        Pedido #{order.public_token || order.id.slice(0, 8)} — {formatMoney(order.total_cents || 0)} ({order.status === "delivered" ? "Entregue" : order.status})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            {/* 2. Tipo de Solicitação (Bifurcação EARS-03) */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-foreground">
                Como podemos ajudar? *
              </label>
              <Select value={requestType} onValueChange={(val: any) => setRequestType(val)}>
                <SelectTrigger className="h-11 min-h-11 rounded-lg bg-background border-border/70 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-lg">
                  <SelectItem value="return" className="text-xs">
                    Devolver Produto e Receber Reembolso
                  </SelectItem>
                  <SelectItem value="exchange" className="text-xs">
                    Trocar por Outro Tamanho ou Variação
                  </SelectItem>
                  <SelectItem value="warranty" className="text-xs">
                    Acionar Garantia (Produto com Defeito / Avaria)
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* 3. Motivo Principal */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-foreground">
                Motivo Principal *
              </label>
              <Select value={reason} onValueChange={setReason}>
                <SelectTrigger className="h-11 min-h-11 rounded-lg bg-background border-border/70 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-lg">
                  <SelectItem value="Tamanho ou modelo incompatível" className="text-xs">
                    Tamanho ou modelo incompatível
                  </SelectItem>
                  <SelectItem value="Arrependimento de compra no prazo legal" className="text-xs">
                    Arrependimento de compra no prazo legal (Art. 49 CDC)
                  </SelectItem>
                  <SelectItem value="Produto apresentou defeito funcional" className="text-xs">
                    Produto apresentou defeito funcional
                  </SelectItem>
                  <SelectItem value="Produto chegou danificado no transporte" className="text-xs">
                    Produto chegou danificado no transporte
                  </SelectItem>
                  <SelectItem value="Recebi produto diferente do anunciado" className="text-xs">
                    Recebi produto diferente do anunciado
                  </SelectItem>
                  <SelectItem value="Outro motivo" className="text-xs">
                    Outro motivo
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* 4. Detalhes Adicionais */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-foreground">
                Detalhes Adicionais (Opcional)
              </label>
              <Textarea
                placeholder="Descreva o que aconteceu para agilizar o atendimento da loja..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className="rounded-lg bg-background border-border/70 text-xs resize-none focus-visible:ring-2 focus-visible:ring-primary"
              />
            </div>

            {/* 5. Foto do Produto / Avaria */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-foreground flex items-center gap-2">
                  <Camera className="size-4 text-primary" />
                  <span>Foto do Produto (Opcional, agiliza a análise)</span>
                </label>
                {previewPhoto && (
                  <button
                    type="button"
                    onClick={handleClearPhoto}
                    className="text-2xs text-destructive hover:underline flex items-center gap-1 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-sm"
                  >
                    <X className="size-3" />
                    <span>Remover foto</span>
                  </button>
                )}
              </div>

              {previewPhoto ? (
                <div className="rounded-xl border border-border/60 overflow-hidden bg-muted/20 p-3 flex items-center gap-3">
                  <img
                    src={previewPhoto}
                    alt="Pré-visualização da foto"
                    className="size-16 rounded-lg object-cover border border-border/60 shrink-0"
                  />
                  <div className="space-y-1 min-w-0 flex-1">
                    <p className="text-xs font-bold text-foreground">Foto Anexada</p>
                    <p className="text-2xs text-muted-foreground leading-tight">
                      A imagem será enviada à equipe da loja para conferência.
                    </p>
                  </div>
                </div>
              ) : (
                <div
                  onPaste={handleDropzonePaste}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={handleDrop}
                  tabIndex={0}
                  className="rounded-xl border border-dashed border-border/80 bg-background/50 hover:bg-muted/20 p-4 text-center space-y-2 transition-colors focus-visible:ring-2 focus-visible:ring-primary outline-none cursor-pointer"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleFileChange}
                  />
                  <div className="size-8 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto">
                    <Camera className="size-4" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-semibold text-foreground">
                      Clique para selecionar ou arraste uma foto aqui
                    </p>
                    <p className="text-2xs text-muted-foreground">
                      Suporta PNG, JPG, WebP ou cole direto da área de transferência (Ctrl+V)
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Ações do Modal */}
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-border/40">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsModalOpen(false)}
                className="h-11 min-h-11 rounded-lg px-4 text-xs font-bold border-border cursor-pointer"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting || orders.length === 0}
                className="h-11 min-h-11 rounded-lg px-6 text-xs font-bold bg-foreground text-background hover:bg-foreground/90 cursor-pointer focus-visible:ring-2 focus-visible:ring-primary"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={16} className="animate-spin motion-reduce:animate-none mr-2" />
                    Enviando...
                  </>
                ) : (
                  "Enviar Solicitação"
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── 5. Modal de Confirmação de Cancelamento de Solicitação (EARS-06) ── */}
      <Dialog
        open={!!cancelModalRequestId}
        onOpenChange={(open) => !open && setCancelModalRequestId(null)}
      >
        <DialogContent className="sm:max-w-md rounded-xl p-5 sm:p-6">
          <DialogHeader>
            <DialogTitle className="text-base sm:text-lg font-bold text-foreground">
              Cancelar Solicitação
            </DialogTitle>
          </DialogHeader>

          <p className="text-xs text-muted-foreground leading-relaxed py-2">
            Deseja realmente cancelar esta solicitação? Ela será arquivada e o pedido original continuará ativo normalmente.
          </p>

          <DialogFooter className="gap-2 pt-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setCancelModalRequestId(null)}
              className="h-11 min-h-11 rounded-lg text-xs font-bold border-border cursor-pointer"
            >
              Manter Solicitação
            </Button>
            <Button
              onClick={() => {
                if (cancelModalRequestId) {
                  handleCancelRequest(cancelModalRequestId);
                }
              }}
              className="h-11 min-h-11 rounded-lg text-xs font-bold bg-rose-600 text-primary-foreground hover:bg-rose-700 cursor-pointer focus-visible:ring-2 focus-visible:ring-rose-500"
            >
              Confirmar Cancelamento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
