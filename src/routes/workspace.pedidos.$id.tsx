import { createFileRoute, useRouter, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { formatMoney } from "@/lib/money";
import { PageHeader } from "@/components/commerce/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
 Sheet,
 SheetContent,
 SheetDescription,
 SheetHeader,
 SheetTitle,
 SheetTrigger,
} from "@/components/ui/sheet";
import {
 AlertDialog,
 AlertDialogContent,
 AlertDialogDescription,
 AlertDialogHeader,
 AlertDialogTitle,
 AlertDialogTrigger,
 AlertDialogFooter,
} from "@/components/ui/alert-dialog";
import {
  Printer,
  Banknote,
  Landmark,
  AlertTriangle,
  Truck,
  ExternalLink,
  Package,
  User,
  MapPin,
  Phone,
  Mail,
  MessageSquare,
  Layers,
  FileText,
  Download,
  Tag,
  CheckCircle2,
  Copy,
} from "lucide-react";
import { ShippingLabelModal } from "@/components/commerce/shipping-label-modal";
import {
  getOrderById,
  updateOrderStatus,
  updateOrderShipment,
  updateOrderShippingQuote,
} from "@/services/order.functions";
import { approvePayment, rejectPayment } from "@/services/payment.functions";
import { getDeliveryProofsByOrderId, type DeliveryProof } from "@/services/dispatch.functions";
import {
  emitNFeInvoice,
  getOrderInvoice,
  type StoreNFeInvoiceDTO,
} from "@/services/fiscal-nfe.functions";
import {
  buildZplShippingLabel,
  buildEscPosReceipt,
  sendZplToSerialPrinter,
  sendBytesToSerialPrinter,
} from "@/lib/thermal-printer";
import { ChannelBadge, getChannelInfo } from "@/components/commerce/channel-badge";
import { PickingWizard } from "@/components/admin/orders/picking-wizard";
import { RmaRequestWizard } from "@/components/admin/orders/rma-request-wizard";
import { OrderEditWizard } from "@/components/admin/orders/order-edit-wizard";
import { formatDate } from "@/lib/datetime";

export const Route = createFileRoute("/workspace/pedidos/$id")({
  head: ({ loaderData }) => ({
    meta: [{ title: `Pedido #${loaderData?.order?.public_token?.slice(0, 8) || "Detalhes"} | Workspace Waesy` }],
  }),
  loader: async ({ params }: { params: { id: string } }) => {
    try {
      const [order, proofs, invoice] = await Promise.all([
        getOrderById({ data: { orderId: params.id } }),
        getDeliveryProofsByOrderId({ data: { orderId: params.id } }).catch(() => []),
        getOrderInvoice({ data: { orderId: params.id } }).catch(() => null),
      ]);
      return { order, proofs: (proofs || []) as DeliveryProof[], invoice };
    } catch {
      return { order: null, proofs: [] as DeliveryProof[], invoice: null };
    }
  },
  component: AdminOrderDetailPage,
});

function getStatusLabel(status: string) {
 const map: Record<
 string,
 {
 label: string;
 variant: "default" | "secondary" | "destructive" | "outline" | "info" | "success" | "warning";
 }
 > = {
 draft: { label: "Rascunho", variant: "secondary" },
 awaiting_payment: { label: "Aguardando Pagamento", variant: "warning" },
 payment_processing: { label: "Pagamento em Processamento", variant: "info" },
 paid: { label: "Pago", variant: "success" },
 processing: { label: "Em Separação", variant: "secondary" },
 ready_for_pickup: { label: "Pronto para Retirada", variant: "success" },
 shipped: { label: "Enviado", variant: "info" },
 delivered: { label: "Entregue", variant: "success" },
 completed: { label: "Concluído", variant: "success" },
 cancelled: { label: "Cancelado", variant: "destructive" },
 payment_failed: { label: "Falha no Pagamento", variant: "destructive" },
 return_requested: { label: "Troca Solicitada", variant: "warning" },
 returned: { label: "Devolvido", variant: "secondary" },
 refunded: { label: "Estornado", variant: "secondary" },
 };
 return map[status] ?? { label: status, variant: "outline" };
}

function AdminOrderDetailPage() {
  const { order, proofs, invoice: initialInvoice } = Route.useLoaderData() as {
    order: any;
    proofs: DeliveryProof[];
    invoice: StoreNFeInvoiceDTO | null;
  };
  const router = useRouter();
  const [invoice, setInvoice] = useState<StoreNFeInvoiceDTO | null>(initialInvoice);
  const [isEmittingNFe, setIsEmittingNFe] = useState(false);
  const [isPrintingZpl, setIsPrintingZpl] = useState(false);
  const [isPrintingEscPos, setIsPrintingEscPos] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [shippingQuoteCents, setShippingQuoteCents] = useState<string>("");
  const [isSavingQuote, setIsSavingQuote] = useState(false);

  const [pickingModalOpen, setPickingModalOpen] = useState(false);
  const [trackingModalOpen, setTrackingModalOpen] = useState(false);
  const [shippingModalOpen, setShippingModalOpen] = useState(false);
  const [returnModalOpen, setReturnModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [trackingForm, setTrackingForm] = useState({
    trackingCode: "",
    carrierName: "Transportadora",
    trackingUrl: "",
  });
  const [isSavingTracking, setIsSavingTracking] = useState(false);

  if (!order) {
    return (
      <div className="py-16 text-center text-muted-foreground space-y-3">
        <p className="font-bold text-base text-foreground">Pedido não encontrado ou sem permissão de acesso.</p>
        <Link to="/workspace/pedidos" className="text-primary text-xs font-bold underline inline-block">
          ← Voltar para lista de pedidos
        </Link>
      </div>
    );
  }

  const date = formatDate(order.created_at);
  const customer = order.customer_snapshot || {};
  const address = order.shipping_address_snapshot || order.shipping_address || customer.address || {};
  const customFields = order.custom_fields || {};
  const hasCustomFields = Object.keys(customFields).length > 0;

  // Emissão de NF-e / NFC-e 1-Clique
  const handleEmitNFe = async () => {
    setIsEmittingNFe(true);
    try {
      const rawDoc =
        order.cpf_on_receipt?.cpf ||
        customer.document ||
        customer.cpf ||
        "";
      const customerDoc = rawDoc.replace(/\D/g, "");
      const res = await emitNFeInvoice({
        data: {
          storeId: order.store_id,
          orderId: order.id,
          invoiceType: "nfe",
          valorTotalCents: order.total_cents || 100,
          tomadorDocumento: customerDoc.length >= 11 ? customerDoc : "00000000000",
          tomadorNome: customer.name || customer.fullName || "Consumidor Final",
          tomadorEmail: customer.email || undefined,
        },
      });
      setInvoice(res);
      toast.success(`NF-e #${res.nfe_number} emitida com sucesso!`);
      router.invalidate();
    } catch (err: any) {
      toast.error(err?.message || "Falha ao emitir NF-e");
    } finally {
      setIsEmittingNFe(false);
    }
  };

  // Impressão Térmica Direta (ESC/POS 80mm) via Web Serial
  const handlePrintEscPos = async () => {
    setIsPrintingEscPos(true);
    try {
      const receiptData = {
        storeName: order.store?.name || "Waesy Platform",
        storeCnpj: order.store?.cnpj,
        storeAddress: order.store?.address_street,
        orderNumber: order.public_token || order.id.slice(0, 8),
        orderDate: formatDate(order.created_at),
        customerName: customer.name || customer.fullName,
        customerPhone: customer.phone,
        items: (order.order_items || []).map((it: any) => ({
          name: it.product_title || "Item",
          qty: it.qty || 1,
          priceCents: it.unit_price_cents || 0,
        })),
        subtotalCents: order.subtotal_cents || order.total_cents,
        deliveryFeeCents: order.shipping_cents || 0,
        discountCents: order.discount_cents || 0,
        totalCents: order.total_cents || 0,
        paymentMethod: order.payment_method || "PIX",
        channelSource: order.channel_source || order.metadata?.channel || "Loja",
        notes: order.notes,
        width: "80mm" as const,
      };

      const bytes = buildEscPosReceipt(receiptData);

      if (typeof navigator !== "undefined" && "serial" in navigator) {
        try {
          await sendBytesToSerialPrinter(bytes);
          toast.success("Cupom enviado diretamente para a impressora térmica!");
          return;
        } catch (serialErr: any) {
          if (serialErr.message?.includes("Nenhuma porta")) return;
        }
      }

      window.open(`/workspace/pedidos/${order.id}/recibo`, "_blank");
    } catch (err: any) {
      toast.error(err?.message || "Erro ao imprimir cupom térmico");
    } finally {
      setIsPrintingEscPos(false);
    }
  };

  // Impressão de Etiqueta Adesiva ZPL (100x150mm)
  const handlePrintZpl = async () => {
    setIsPrintingZpl(true);
    try {
      const sender = {
        storeName: order.store?.name || "Waesy Hub",
        city: order.store?.address_city || "São Miguel do Oeste",
        state: order.store?.address_state || "SC",
        zipCode: order.store?.address_zip || "89900-000",
      };

      const recipient = {
        name: customer.name || customer.fullName || "Cliente Waesy",
        street: address.street || address.logradouro || "Rua do Cliente",
        number: address.number || address.numero || "S/N",
        complement: address.complement || address.complemento,
        neighborhood: address.neighborhood || address.bairro || "Centro",
        city: address.city || address.cidade || "São Miguel do Oeste",
        state: address.state || address.uf || "SC",
        zipCode: address.zip || address.cep || "89900-000",
        phone: customer.phone,
      };

      const zpl = buildZplShippingLabel({
        carrierName: order.shipping_method === "pickup" ? "Retirada Balcão" : "Transportadora / MotoLink",
        serviceType: order.shipping_method === "pickup" ? "BALCÃO" : "EXPRESSO",
        trackingNumber: order.tracking_code || order.public_token?.slice(0, 10).toUpperCase() || "WD99000001BR",
        orderNumber: order.public_token || order.id.slice(0, 8),
        recipient,
        sender,
        channelSource: order.channel_source || order.metadata?.channel || "Loja Online",
        totalItemsCount: (order.order_items || []).reduce((acc: number, it: any) => acc + (it.qty || 1), 0) || 1,
      });

      if (typeof navigator !== "undefined" && "serial" in navigator) {
        try {
          await sendZplToSerialPrinter(zpl);
          toast.success("Etiqueta ZPL enviada diretamente para a impressora térmica!");
          return;
        } catch (serialErr: any) {
          if (serialErr.message?.includes("Nenhuma porta")) return;
        }
      }

      const blob = new Blob([zpl], { type: "text/plain;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `etiqueta-pedido-${order.public_token || order.id.slice(0, 6)}.zpl`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success("Arquivo de etiqueta ZPL gerado com sucesso!");
    } catch (err: any) {
      toast.error(err?.message || "Erro ao processar etiqueta ZPL");
    } finally {
      setIsPrintingZpl(false);
    }
  };

 const handleSaveTracking = async (e: React.FormEvent) => {
 e.preventDefault();
 setIsSavingTracking(true);
 try {
 await updateOrderShipment({
 data: {
 orderId: order.id,
 trackingCode: trackingForm.trackingCode,
 carrierName: trackingForm.carrierName,
 trackingUrl: trackingForm.trackingUrl || undefined,
 newStatus: order.status === "processing" ? "shipped" : undefined,
 },
 });
 toast.success("Rastreamento do pedido atualizado!");
 setTrackingModalOpen(false);
 router.invalidate();
 } catch (err: unknown) {
 toast.error(
 (err instanceof Error ? err.message : String(err)) || "Erro ao salvar rastreamento",
 );
 } finally {
 setIsSavingTracking(false);
 }
 };

 const handleSaveQuote = async (e: React.FormEvent) => {
 e.preventDefault();
 const cents = Math.round(parseFloat(shippingQuoteCents.replace(",", ".")) * 100);
 if (isNaN(cents) || cents < 0) {
 toast.error("Informe um valor válido");
 return;
 }
 setIsSavingQuote(true);
 try {
 await updateOrderShippingQuote({
 data: { orderId: order.id, shippingCents: cents },
 });
 toast.success("Cotação enviada para o cliente!");
 router.invalidate();
 } catch (err: unknown) {
 toast.error((err instanceof Error ? err.message : String(err)) || "Erro ao salvar cotação");
 } finally {
 setIsSavingQuote(false);
 }
 };

 const handleStatusChange = async (newStatus: any) => {
 setIsUpdating(true);
 try {
 await updateOrderStatus({
 data: {
 orderId: order.id,
 status: newStatus,
 },
 });
 toast.success("Status do pedido atualizado!");
 router.invalidate();
 } catch (err: unknown) {
 toast.error((err instanceof Error ? err.message : String(err)) || "Erro ao atualizar status");
 } finally {
 setIsUpdating(false);
 }
 };

 const handleApprove = async (method: "cash" | "bank_transfer") => {
 setIsConfirming(true);
 try {
 await approvePayment({
 data: {
 orderId: order.id,
 receivedMethod: method,
 },
 });
 toast.success("Pagamento aprovado!");
 router.invalidate();
 } catch (err: unknown) {
 toast.error((err instanceof Error ? err.message : String(err)) || "Erro ao aprovar pagamento");
 } finally {
 setIsConfirming(false);
 }
 };

 const handleReject = async () => {
 setShowCancelConfirm(false);
 setIsRejecting(true);
 try {
 const res = await rejectPayment({
 data: { orderId: order.id, reason: "Cancelado manualmente pela vendedora" },
 });
 if (res.status !== "success") throw new Error((res as any).message);
 toast.success("Pedido cancelado e pagamento rejeitado.");
 router.invalidate();
 } catch (e: unknown) {
 toast.error((e instanceof Error ? e.message : String(e)) || "Erro ao cancelar");
 } finally {
 setIsRejecting(false);
 }
 };

  return (
    <div className="space-y-6 max-w-6xl mx-auto w-full pb-20">
      <div className="flex justify-between items-start flex-wrap gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5 flex-wrap">
            <PageHeader eyebrow="Vendas" title={`Pedido #${order.public_token}`} />
            <ChannelBadge source={order.channel_source || order.metadata?.channel} />
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {["draft", "awaiting_payment", "paid"].includes(order.status) && (
            <Button variant="outline" size="sm" className="rounded-xl text-xs font-semibold" onClick={() => setEditModalOpen(true)}>
              Editar Pedido
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            className="rounded-xl text-xs font-semibold"
            onClick={handlePrintEscPos}
            disabled={isPrintingEscPos}
          >
            <Printer className="mr-1.5 h-3.5 w-3.5" /> Térmica 80mm
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="rounded-xl text-xs font-semibold bg-primary/10 hover:bg-primary/20 text-primary border-primary/20"
            onClick={() => setShippingModalOpen(true)}
          >
            <Truck className="mr-1.5 h-3.5 w-3.5" /> Etiqueta & Despacho
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="rounded-xl text-xs font-semibold"
            onClick={handlePrintZpl}
            disabled={isPrintingZpl}
          >
            <Tag className="mr-1.5 h-3.5 w-3.5" /> Etiqueta ZPL
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="rounded-xl text-xs font-semibold"
            onClick={() => window.open(`/workspace/pedidos/${order.id}/recibo`, "_blank")}
          >
            <ExternalLink className="mr-1.5 h-3.5 w-3.5" /> Recibo A4
          </Button>
        </div>
      </div>

 <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
 {/* Left Column: Items, Customer Info, Custom Fields, Notes */}
 <div className="md:col-span-2 space-y-6">
 {/* Itens do Pedido */}
 <div className="p-6 bg-card text-card-foreground rounded-2xl border border-border/80">
 <h3 className="font-bold text-base mb-4 text-foreground">Itens do Pedido</h3>
 <div className="space-y-4">
 {(order.order_items ?? []).map((item: any) => {
 const options = item.selected_options ? Object.values(item.selected_options) : [];
 const isBackorderItem = item.metadata?.is_backorder === true;
 return (
 <div
 key={item.id}
 className="flex justify-between items-start pb-4 border-b border-border/40 last:border-0 last:pb-0"
 >
 <div>
 <p className="font-medium text-sm text-foreground flex items-center gap-2 flex-wrap">
 <span className="text-primary font-bold mr-1">{item.qty}x</span>
 {item.product_title}
 {isBackorderItem && (
 <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 bg-warning/15 text-warning border border-warning/30 rounded-md">
 ⏱ Encomenda
 </span>
 )}
 </p>
 {item.notes && (
 <p className="text-xs text-amber-600 dark:text-amber-400 font-medium italic mt-1 bg-amber-500/10 px-2 py-0.5 rounded-md inline-block">
 Obs: {item.notes}
 </p>
 )}
 <p className="text-xs text-muted-foreground font-mono mt-0.5">
 SKU: {item.variant_sku || "N/A"}
 </p>
 {options.length > 0 && (
 <div className="mt-2 ml-2 pl-2 space-y-0.5 border-l-2 border-primary/30">
 {options.map((opt: any, idx: number) => (
 <div key={idx} className="text-xs text-muted-foreground flex gap-2">
 <span>+ {opt.label}</span>
 {opt.price_modifier_cents > 0 && (
 <span>({formatMoney(opt.price_modifier_cents)})</span>
 )}
 </div>
 ))}
 </div>
 )}
 </div>
 <div className="text-right">
 <p className="font-bold text-sm text-foreground">{formatMoney(item.total_cents)}</p>
 <p className="text-xs text-muted-foreground mt-0.5">
 {formatMoney(item.unit_price_cents)} / un
 </p>
 </div>
 </div>
 );
 })}
 </div>
 </div>

 {/* Dados do Cliente & Contato */}
 <div className="p-6 bg-card text-card-foreground rounded-2xl border border-border/80 space-y-4">
 <h3 className="font-bold text-base text-foreground flex items-center gap-2">
 <User className="size-4 text-primary" />
 <span>Dados do Cliente</span>
 </h3>

 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
 <div className="space-y-1">
 <span className="text-muted-foreground font-semibold">Nome Completo:</span>
 <p className="font-bold text-foreground text-sm">{customer.name || customer.fullName || "Cliente Não Identificado"}</p>
 </div>

 <div className="space-y-1">
 <span className="text-muted-foreground font-semibold">E-mail:</span>
 <p className="font-medium text-foreground">{customer.email || "Não informado"}</p>
 </div>

 <div className="space-y-1">
 <span className="text-muted-foreground font-semibold">Telefone / WhatsApp:</span>
 <p className="font-medium text-foreground">{customer.phone || "Não informado"}</p>
 </div>

 {customer.document && (
 <div className="space-y-1">
 <span className="text-muted-foreground font-semibold">CPF / CNPJ:</span>
 <p className="font-mono font-medium text-foreground">{customer.document}</p>
 </div>
 )}

 {order.cpf_on_receipt?.requested && (
 <div className="space-y-1">
 <span className="text-muted-foreground font-semibold">CPF na Nota Fiscal:</span>
 <p className="font-mono font-bold text-foreground">
 {order.cpf_on_receipt.document || "Solicitado (Sem Documento)"}
 </p>
 </div>
 )}
 </div>
 </div>

 {/* Diretrizes de Atendimento & Separação do Nicho */}
 {(order.receiver_info?.isOtherPerson || order.substitution_policy || order.checkout_niche_metadata?.utensilsRequested !== undefined) && (
 <div className="p-6 bg-card text-card-foreground rounded-2xl border border-border/80 space-y-4">
 <h3 className="font-bold text-base text-foreground flex items-center gap-2">
 <Package className="size-4 text-primary" />
 <span>Diretrizes de Atendimento & Separação</span>
 </h3>

 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
 {order.receiver_info?.isOtherPerson && (
 <div className="space-y-1 p-3 rounded-2xl bg-muted/20 border border-border/40">
 <span className="text-muted-foreground font-semibold block">Recebedor Autorizado (Terceiro):</span>
 <p className="font-bold text-foreground">
 {order.receiver_info.name} {order.receiver_info.phone ? `(${order.receiver_info.phone})` : ""}
 </p>
 </div>
 )}

 {order.substitution_policy && (
 <div className="space-y-1 p-3 rounded-2xl bg-muted/20 border border-border/40">
 <span className="text-muted-foreground font-semibold block">Se faltar item (Mercado / Hortifrúti):</span>
 <p className="font-bold text-foreground">
 {order.substitution_policy === "similar"
 ? "Trocar por similar da mesma categoria"
 : order.substitution_policy === "contact"
 ? "Confirmar com o cliente via WhatsApp"
 : "Cancelar item e abater valor"}
 </p>
 </div>
 )}

 {order.checkout_niche_metadata?.utensilsRequested !== undefined && (
 <div className="space-y-1 p-3 rounded-2xl bg-muted/20 border border-border/40">
 <span className="text-muted-foreground font-semibold block">Talheres & Descartáveis:</span>
 <p className="font-bold text-foreground">
 {order.checkout_niche_metadata.utensilsRequested
 ? "Sim, enviar descartáveis com o pedido"
 : "Não precisa de descartáveis (Cliente dispensou)"}
 </p>
 </div>
 )}
 </div>
 </div>
 )}

 {/* Informações Complementares / Campos de Nicho */}
 {hasCustomFields && (
 <div className="p-6 bg-card text-card-foreground rounded-2xl border border-border/80 space-y-4">
 <h3 className="font-bold text-base text-foreground flex items-center gap-2">
 <Layers className="size-4 text-primary" />
 <span>Informações do Pedido / Nicho</span>
 </h3>

 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
 {Object.entries(customFields).map(([label, value]: [string, any]) => (
 <div key={label} className="space-y-1 p-3 rounded-2xl bg-muted/20 border border-border/40">
 <span className="text-muted-foreground font-semibold block">{label}:</span>
 <p className="font-bold text-foreground">{String(value)}</p>
 </div>
 ))}
 </div>
 </div>
 )}

 {/* Observações do Pedido */}
 {order.notes && (
 <div className="p-6 bg-card text-card-foreground rounded-2xl border border-border/80 space-y-2">
 <h3 className="font-bold text-base text-foreground flex items-center gap-2">
 <MessageSquare className="size-4 text-primary" />
 <span>Observações do Pedido</span>
 </h3>
 <p className="text-xs text-muted-foreground bg-muted/20 p-3 rounded-2xl border border-border/40">
 {order.notes}
 </p>
 </div>
 )}
 </div>

 {/* Sidebar */}
 <div className="space-y-6">
  {/* Summary */}
  <div className="p-6 bg-card text-card-foreground rounded-2xl border border-border/80">
    <div className="flex items-center justify-between mb-4">
      <h3 className="font-semibold text-base text-foreground">Resumo Financeiro</h3>
      <ChannelBadge source={order.channel_source || order.metadata?.channel} />
    </div>
    <div className="space-y-3 text-sm">
      <div className="flex justify-between">
        <span className="text-muted-foreground">Subtotal</span>
        <span className="text-foreground">{formatMoney(order.subtotal_cents)}</span>
      </div>
      <div className="flex justify-between">
        <span className="text-muted-foreground">Frete</span>
        <span className="text-foreground">{formatMoney(order.shipping_cents)}</span>
      </div>
      {order.metadata?.marketplace_fee_cents > 0 && (
        <div className="flex justify-between text-xs text-amber-600 dark:text-amber-400">
          <span>Taxa ({getChannelInfo(order.channel_source || order.metadata?.channel).label})</span>
          <span>-{formatMoney(order.metadata.marketplace_fee_cents)}</span>
        </div>
      )}
      <div className="flex justify-between font-bold text-base pt-3 mt-1 text-foreground border-t border-border/40">
        <span>Total</span>
        <span>{formatMoney(order.total_cents)}</span>
      </div>
    </div>
  </div>

  {/* Documento Fiscal NF-e / NFC-e */}
  <div className="p-6 bg-card text-card-foreground rounded-2xl border border-border/80 space-y-4">
    <div className="flex items-center justify-between">
      <h3 className="font-semibold text-base text-foreground flex items-center gap-2">
        <FileText className="size-4 text-primary" />
        <span>Documento Fiscal</span>
      </h3>
      {invoice ? (
        <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
          NF-e Emitida
        </span>
      ) : (
        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
          Pendente
        </span>
      )}
    </div>

    {invoice ? (
      <div className="space-y-3 text-xs">
        <div className="p-3 rounded-xl bg-muted/30 border border-border/60 space-y-1.5 font-mono">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Número:</span>
            <span className="font-bold text-foreground">#{invoice.nfe_number} (Série {invoice.nfe_serie})</span>
          </div>
          {invoice.nfe_key && (
            <div className="space-y-0.5">
              <span className="text-muted-foreground text-[10px] block">Chave de Acesso:</span>
              <span className="text-[10px] text-foreground break-all">{invoice.nfe_key}</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 pt-1">
          {invoice.danfe_pdf_url && (
            <Button asChild variant="outline" size="sm" className="flex-1 rounded-xl text-xs font-bold">
              <a href={invoice.danfe_pdf_url} target="_blank" rel="noopener noreferrer">
                <Download className="mr-1.5 size-3.5" /> DANFE (PDF)
              </a>
            </Button>
          )}
          {invoice.xml_url && (
            <Button asChild variant="ghost" size="sm" className="rounded-xl text-xs font-mono">
              <a href={invoice.xml_url} target="_blank" rel="noopener noreferrer">
                XML
              </a>
            </Button>
          )}
        </div>
      </div>
    ) : (
      <div className="space-y-3">
        <p className="text-xs text-muted-foreground">
          Emita a NF-e nacional ou NFC-e deste pedido com 1 clique.
        </p>

        {order.cpf_on_receipt?.requested && order.cpf_on_receipt?.cpf ? (
          <div className="p-3 rounded-xl bg-muted/20 border border-border/40 space-y-1 text-xs">
            <span className="text-muted-foreground text-[11px] block">CPF solicitado no Checkout:</span>
            <span className="font-mono font-bold text-foreground">{order.cpf_on_receipt.cpf}</span>
          </div>
        ) : customer.document || customer.cpf ? (
          <div className="p-3 rounded-xl bg-muted/20 border border-border/40 space-y-1 text-xs">
            <span className="text-muted-foreground text-[11px] block">Documento do Cadastro:</span>
            <span className="font-mono font-bold text-foreground">{customer.document || customer.cpf}</span>
          </div>
        ) : (
          <p className="text-[11px] text-muted-foreground italic">
            Nenhum CPF específico foi solicitado no checkout (Consumidor Final).
          </p>
        )}

        <Button
          onClick={handleEmitNFe}
          disabled={isEmittingNFe}
          size="sm"
          className="w-full rounded-xl font-bold text-xs h-10 cursor-pointer"
        >
          {isEmittingNFe ? "Emitindo NF-e..." : "Emitir NF-e (1-Clique)"}
        </Button>
      </div>
    )}
  </div>

 {/* Status & Actions */}
 <div className=" p-6 bg-card text-card-foreground ">
 <h3 className="font-semibold text-lg mb-4 text-foreground">Status</h3>
 <Badge
 variant={getStatusLabel(order.status).variant}
 className="text-[11px] py-1 mb-4 flex justify-center"
 >
 {getStatusLabel(order.status).label}
 </Badge>

 {order.status === "awaiting_shipping_quote" && (
 <div className="space-y-4 mb-4 p-4 border border-warning/50 bg-warning/10 rounded-xl">
 <h4 className="font-semibold text-warning-foreground text-sm flex items-center gap-2">
 <AlertTriangle className="size-4" />
 Cotação de Frete Pendente
 </h4>
 <p className="text-xs text-muted-foreground">
 O cliente solicitou uma cotação de frete personalizada. Informe o valor do frete
 para liberar o pagamento.
 </p>
 <form onSubmit={handleSaveQuote} className="flex gap-2">
 <div className="relative flex-1">
 <span className="absolute left-3 top-2.5 text-muted-foreground text-sm">
 R$
 </span>
 <input
 type="number"
 step="0.01"
 min="0"
 required
 placeholder="0,00"
 value={shippingQuoteCents}
 onChange={(e) => setShippingQuoteCents(e.target.value)}
 className="w-full rounded-xl border px-3 py-2 pl-8 text-sm"
 />
 </div>
 <Button type="submit" disabled={isSavingQuote}>
 {isSavingQuote ? "Enviando..." : "Enviar Cotação"}
 </Button>
 </form>
 </div>
 )}

 {order.status === "awaiting_payment" && (
 <div className="space-y-3">
 {/* Approve payment — choose method */}
 <Sheet>
 <SheetTrigger asChild>
 <Button className="w-full font-bold" disabled={isConfirming || isRejecting}>
 {isConfirming ? "Confirmando..." : "Marcar como Pago"}
 </Button>
 </SheetTrigger>
 <SheetContent>
 <SheetHeader>
 <SheetTitle>Como o pagamento foi recebido?</SheetTitle>
 <SheetDescription>
 Selecione a forma real que o dinheiro entrou. Se foi em dinheiro físico, o
 valor será somado ao Frente de Caixa atual.
 </SheetDescription>
 </SheetHeader>
 <div className="grid grid-cols-2 gap-4 py-4">
 <Button
 variant="outline"
 className="h-24 flex flex-col gap-2"
 onClick={() => handleApprove("cash")}
 >
 <Banknote className="h-8 w-8 text-primary" />
 <span>Dinheiro (Frente de Caixa)</span>
 </Button>
 <Button
 variant="outline"
 className="h-24 flex flex-col gap-2"
 onClick={() => handleApprove("bank_transfer")}
 >
 <Landmark className="h-8 w-8 text-primary" />
 <span>Pix / Transferência / Cartão</span>
 </Button>
 </div>
 </SheetContent>
 </Sheet>

 {/* Cancel — confirmation dialog (replaces window.confirm) */}
 <AlertDialog open={showCancelConfirm} onOpenChange={setShowCancelConfirm}>
 <AlertDialogTrigger asChild>
 <Button
 variant="outline"
 className="w-full text-destructive"
 disabled={isConfirming || isRejecting}
 >
 {isRejecting ? "Cancelando..." : "Cancelar Venda"}
 </Button>
 </AlertDialogTrigger>
 <AlertDialogContent>
 <AlertDialogHeader>
 <AlertDialogTitle className="flex items-center gap-2">
 <AlertTriangle className="h-5 w-5 text-destructive" />
 Cancelar esta venda?
 </AlertDialogTitle>
 <AlertDialogDescription>
 O pedido será marcado como cancelado. Esta ação não pode ser desfeita.
 </AlertDialogDescription>
 </AlertDialogHeader>
 <AlertDialogFooter className="gap-2 mt-4">
 <Button variant="outline" onClick={() => setShowCancelConfirm(false)}>
 Voltar
 </Button>
 <Button variant="destructive" onClick={handleReject} disabled={isRejecting}>
 Confirmar Cancelamento
 </Button>
 </AlertDialogFooter>
 </AlertDialogContent>
 </AlertDialog>

 <p className="text-xs text-muted-foreground text-center mt-2">
 Você enviou o link ou chave PIX para o cliente? Assim que ele pagar, clique em
 Marcar como Pago para liberar a separação.
 </p>
 </div>
 )}

 {order.status === "processing" && (
 <div className="space-y-3 mt-4">
 <Button
 className="w-full font-bold"
 onClick={() => setPickingModalOpen(true)}
 disabled={isUpdating}
 >
 <Package className="mr-2 h-4 w-4" />
 Iniciar Separação (Picking)
 </Button>
 <p className="text-xs text-muted-foreground text-center">
 Faça a conferência física dos itens antes de faturar o pedido.
 </p>
 </div>
 )}

 {(order.status === "shipped" || order.status === "ready_for_pickup") && (
 <div className="space-y-3 mt-4">
 <Button
 className="w-full font-bold"
 onClick={() => handleStatusChange("delivered")}
 disabled={isUpdating}
 >
 {order.status === "shipped" ? "Confirmar Entrega" : "Entregar ao Cliente"}
 </Button>
 </div>
 )}

 {(order.status === "delivered" || order.status === "completed") && (
 <div className="space-y-3 mt-4">
 <RmaRequestWizard
 order={order}
 isOpen={returnModalOpen}
 onOpenChange={setReturnModalOpen}
 onComplete={async () => {
 await router.invalidate();
 }}
 />
 <Button
 variant="outline"
 className="w-full text-destructive mt-2"
 onClick={() => setReturnModalOpen(true)}
 >
 Solicitar Devolução Parcial (RMA)
 </Button>
 </div>
 )}

 {/* Rastreamento & Logística */}
 <div className="border-t pt-4 mt-6 space-y-3">
 <div className="flex items-center justify-between">
 <span className="font-semibold text-sm flex items-center gap-1.5">
 <Truck className="h-4 w-4 text-primary" /> Logística e Rastreio
 </span>
 <Sheet open={trackingModalOpen} onOpenChange={setTrackingModalOpen}>
 <SheetTrigger asChild>
 <Button
 variant="outline"
 size="sm"
 onClick={() =>
 setTrackingForm({
 trackingCode: "",
 carrierName: "Transportadora",
 trackingUrl: "",
 })
 }
 >
 Novo Envio (Pacote)
 </Button>
 </SheetTrigger>
 <SheetContent>
 <SheetHeader>
 <SheetTitle>Informar Código de Rastreio</SheetTitle>
 <SheetDescription>
 Insira os dados da transportadora para enviar ao cliente.
 </SheetDescription>
 </SheetHeader>
 <form onSubmit={handleSaveTracking} className="space-y-4 py-4">
 <div className="space-y-2">
 <label className="text-sm font-medium">Transportadora</label>
 <input
 type="text"
 required
 value={trackingForm.carrierName}
 onChange={(e) =>
 setTrackingForm((p) => ({ ...p, carrierName: e.target.value }))
 }
 className="w-full rounded-xl border px-3 py-2 text-sm"
 />
 </div>
 <div className="space-y-2">
 <label className="text-sm font-medium">Código de Rastreio</label>
 <input
 type="text"
 required
 placeholder="Ex: BR123456789BR"
 value={trackingForm.trackingCode}
 onChange={(e) =>
 setTrackingForm((p) => ({ ...p, trackingCode: e.target.value }))
 }
 className="w-full rounded-xl border px-3 py-2 text-sm"
 />
 </div>
 <div className="space-y-2">
 <label className="text-sm font-medium">Link de Rastreio (Opcional)</label>
 <input
 type="url"
 placeholder="https://..."
 value={trackingForm.trackingUrl}
 onChange={(e) =>
 setTrackingForm((p) => ({ ...p, trackingUrl: e.target.value }))
 }
 className="w-full rounded-xl border px-3 py-2 text-sm"
 />
 </div>
 <Button type="submit" className="w-full" disabled={isSavingTracking}>
 {isSavingTracking ? "Salvando..." : "Confirmar Envio"}
 </Button>
 </form>
 </SheetContent>
 </Sheet>
 </div>

 {order.shipments && order.shipments.length > 0 ? (
 <div className="space-y-2">
 {order.shipments.map((shipment: any) => (
 <div key={shipment.id} className="text-sm p-3 border rounded bg-muted/20">
 <p className="font-semibold">{shipment.carrier_name}</p>
 <div className="flex items-center gap-2 mt-1">
 <span className="font-mono text-muted-foreground">
 {shipment.tracking_code}
 </span>
 {shipment.tracking_url && (
 <a
 href={shipment.tracking_url}
 target="_blank"
 rel="noreferrer"
 className="text-primary hover:underline flex items-center gap-1"
 >
 <ExternalLink className="h-3 w-3" /> Acompanhar
 </a>
 )}
 </div>
 </div>
 ))}
 </div>
 ) : (
 <p className="text-sm text-muted-foreground">Nenhum pacote enviado ainda.</p>
 )}

 {/* Comprovantes de Entrega com Foto & GPS */}
 {proofs && proofs.length > 0 && (
 <div className="pt-4 border-t border-border/40 space-y-3">
 <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
 <Package className="size-3.5 text-emerald-600" /> Evidência Fotográfica de Entrega
 </span>
 <div className="grid grid-cols-1 gap-2.5">
 {proofs.map((pr: any) => (
 <div
 key={pr.id}
 className="rounded-xl overflow-hidden border border-border/60 bg-muted/20 p-2 space-y-2"
 >
 <a href={pr.storage_path} target="_blank" rel="noopener noreferrer">
 <img
 src={pr.storage_path}
 alt="Comprovante de Entrega"
 className="w-full aspect-video object-cover rounded-lg hover:opacity-90 transition-opacity"
 />
 </a>
 <div className="text-[10px] text-muted-foreground flex items-center justify-between">
 <span>Foto do pacote/destinatário</span>
 {pr.latitude && pr.longitude && (
 <a
 href={`https://www.google.com/maps/search/?api=1&query=${pr.latitude},${pr.longitude}`}
 target="_blank"
 rel="noopener noreferrer"
 className="text-primary hover:underline font-mono"
 >
 Ver Localização ↗
 </a>
 )}
 </div>
 </div>
 ))}
 </div>
 </div>
 )}
 </div>
 </div>
 </div>
 </div>

 {editModalOpen && (
 <OrderEditWizard
 order={order}
 isOpen={editModalOpen}
 onOpenChange={setEditModalOpen}
 onComplete={async () => {
 await router.invalidate();
 }}
 />
 )}

 <PickingWizard
 order={order}
 isOpen={pickingModalOpen}
 onOpenChange={setPickingModalOpen}
 onComplete={async () => {
 await handleStatusChange(
 order.shipping_method === "pickup" ? "ready_for_pickup" : "shipped",
 );
 }}
 />

 <ShippingLabelModal
 orderId={order.id}
 isOpen={shippingModalOpen}
 onClose={() => setShippingModalOpen(false)}
 onDispatchSuccess={async () => {
 await router.invalidate();
 }}
 />
 </div>
 );
}
