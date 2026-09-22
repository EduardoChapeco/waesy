import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { toast } from "sonner";
import {
  ChevronLeft,
  Package,
  MapPin,
  CreditCard,
  Copy,
  Upload,
  Info,
  AlertTriangle,
  QrCode,
  Smartphone,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DigitalCompanionCard } from "@/components/documents/digital-companion-card";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ReviewModal } from "@/components/commerce/review-modal";
import { RmaWizard } from "@/components/commerce/rma-wizard";
import { EmptyState } from "@/components/state/states";
import { formatMoney } from "@/lib/money";
import { formatDate } from "@/lib/datetime";
import { getCustomerOrder, getOrderPaymentInstructions } from "@/services/order.functions";
import { uploadPaymentReceipt } from "@/services/payment.functions";
import { getDeliveryProofsByOrderId, type DeliveryProof } from "@/services/dispatch.functions";
import { DealDeliveryTrackingCard } from "@/components/commercial/deal-delivery-tracking-card";

export const Route = createFileRoute("/_store/conta/pedidos/$id")({
  head: () => ({ meta: [{ title: "Detalhes do Pedido | Waesy" }] }),
  loader: async ({ params }) => {
    try {
      const [orderRes, instrRes, proofs] = await Promise.all([
        getCustomerOrder({ data: { orderId: params.id } }),
        getOrderPaymentInstructions({ data: { orderId: params.id } }).catch(() => ({
          status: "error" as const,
          data: null,
        })),
        getDeliveryProofsByOrderId({ data: { orderId: params.id } }).catch(() => []),
      ]);

      return {
        order: orderRes,
        paymentInstructions: instrRes || { pix_key: null, payment_instructions: null },
        proofs: (proofs || []) as DeliveryProof[],
      };
    } catch (err) {
      console.error("[loader:_store.conta.pedidos.$id] Unhandled loader error:", err);
      return {} as any;
    }
  },
  component: CustomerOrderDetailPage,
});

function translateStatus(status: string) {
  const map: Record<string, string> = {
    draft: "Rascunho",
    awaiting_payment: "Aguardando Pagamento",
    payment_processing: "Comprovante em Análise",
    paid: "Pago",
    processing: "Em Separação",
    ready_for_pickup: "Pronto para Retirada",
    shipped: "Enviado",
    delivered: "Entregue",
    completed: "Concluído",
    cancelled: "Cancelado",
    payment_failed: "Pagamento Rejeitado",
  };
  return map[status] || status;
}

function getStatusVariant(status: string): "default" | "secondary" | "destructive" | "outline" {
  if (["paid", "completed", "delivered"].includes(status)) return "default";
  if (["awaiting_payment", "payment_processing", "processing", "shipped"].includes(status))
    return "secondary";
  if (["cancelled", "payment_failed"].includes(status)) return "destructive";
  return "outline";
}

function CustomerOrderDetailPage() {
  const { order, paymentInstructions, proofs } = Route.useLoaderData() as {
    order: any;
    paymentInstructions: { pix_key: string | null; payment_instructions: string | null };
    proofs: DeliveryProof[];
  };
  const router = useRouter();
  const [uploading, setUploading] = useState(false);
  const [rmaWizardOpen, setRmaWizardOpen] = useState(false);
  const [companionOpen, setCompanionOpen] = useState(false);

  if (!order) {
    return (
      <div className="w-full max-w-5xl mx-auto space-y-4 py-8 px-0 sm:px-4 md:px-0">
        <Link
          to="/conta/pedidos"
          className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="size-4" /> Voltar para pedidos
        </Link>
        <EmptyState title="Pedido não encontrado" />
      </div>
    );
  }

  const payment = order.payments?.[0];
  const items = order.order_items || [];
  const address = order.shipping_address || {};

  const handleCopyPix = () => {
    if (!paymentInstructions?.pix_key) return;
    navigator.clipboard.writeText(paymentInstructions.pix_key);
    toast.success("Chave PIX copiada com sucesso!");
  };

  const companionData = useMemo(() => {
    if (!order) return null;
    const storeName = order.store?.name || "Loja Oficial Waesy";
    const publicToken = order.public_token || order.id.slice(0, 8).toUpperCase();
    const formattedDate = order.created_at ? formatDate(order.created_at) : "Recente";

    const sections: any[] = [
      {
        type: "service_item" as const,
        title: "Resumo do Pedido",
        badge: translateStatus(order.status),
        details: [
          { label: "Data do Pedido", value: formattedDate },
          { label: "Total Pago/A Pagar", value: formatMoney(order.total_cents || 0), highlight: true },
          { label: "Qtd. de Itens", value: `${items.length} ${items.length === 1 ? "item" : "itens"}` },
          { label: "Forma de Pagamento", value: order.payment_method ? order.payment_method.toUpperCase() : "PIX / Cartão" },
        ],
      },
      {
        type: "custom" as const,
        title: "Itens Adquiridos",
        details: items.slice(0, 5).map((item: any) => ({
          label: `${item.qty || 1}x ${item.product_title}`,
          value: formatMoney(item.total_cents || 0),
        })),
      },
    ];

    if (address?.street) {
      sections.push({
        type: "custom" as const,
        title: "Destino da Entrega",
        details: [
          { label: "Endereço", value: `${address.street}, ${address.number || "S/N"}` },
          { label: "Bairro / Cidade", value: `${address.neighborhood || ""}, ${address.city || ""} - ${address.state || ""}` },
          { label: "CEP", value: address.postal_code || "" },
        ],
      });
    }

    const rules = [
      {
        title: "Acompanhamento da Entrega",
        description: "Você pode conferir as atualizações e fotos do comprovante de entrega na sua área de cliente Waesy.",
        highlight: true,
      },
      {
        title: "Trocas e Devoluções",
        description: "Prazo de 7 dias após o recebimento para solicitar garantia ou devolução caso haja avaria.",
      },
    ];

    const emergencyContacts = [
      {
        name: storeName,
        category: "Suporte do Pedido",
        phone: order.store?.phone || "(49) 99999-9999",
        whatsapp: true,
        is24h: false,
      },
    ];

    let customWhatsAppText = `Olá! Segue o comprovante do pedido *#${publicToken}* realizado em *${storeName}*:\n\n`;
    customWhatsAppText += `📦 *Status:* ${translateStatus(order.status)}\n`;
    customWhatsAppText += `💰 *Valor Total:* ${formatMoney(order.total_cents || 0)}\n`;
    customWhatsAppText += `📅 *Data:* ${formattedDate}\n\n`;
    customWhatsAppText += `Itens:\n` + items.map((i: any) => `- ${i.qty || 1}x ${i.product_title}`).join("\n") + `\n\n`;
    if (address?.street) {
      customWhatsAppText += `📍 *Entrega:* ${address.street}, ${address.number || ""} - ${address.city || ""}\n\n`;
    }
    customWhatsAppText += `Obrigado pela preferência! ✨`;

    return {
      niche: "retail" as const,
      title: `Pedido #${publicToken}`,
      subtitle: storeName,
      code: publicToken,
      companyName: storeName,
      companyLogoUrl: order.store?.logo_url,
      participantsLabel: "Comprador",
      participants: [order.customer_name || address?.name || "Cliente"],
      sections,
      rules,
      emergencyContacts,
      customWhatsAppText,
    };
  }, [order, items, address]);

  const handleUploadReceipt = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error("O comprovante deve ter no máximo 5MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = async () => {
      setUploading(true);
      try {
        const base64 = (reader.result as string).split(",")[1];
        const res = await uploadPaymentReceipt({
          data: {
            orderId: order.id,
            fileName: file.name,
            fileBase64: base64,
          },
        });
        if (res.status === "error") throw new Error(res.message);
        toast.success("Comprovante enviado! Aguardando confirmação da loja.");
        router.invalidate();
      } catch (err: unknown) {
        toast.error(
          (err instanceof Error ? err.message : String(err)) || "Erro ao enviar comprovante.",
        );
      } finally {
        setUploading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="w-full max-w-5xl mx-auto space-y-4 sm:space-y-6 pb-24 px-0 sm:px-4 md:px-0 font-sans text-foreground">
      {/* ── 1. Header com Navegação e Ações ── */}
      <div className="flex items-center justify-between gap-3 border-b border-border/40 pb-4 pt-1">
        <Link
          to="/conta/pedidos"
          className="flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronLeft className="size-4" />
          <span>Voltar para pedidos</span>
        </Link>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCompanionOpen(true)}
            className="rounded-xl text-xs font-semibold gap-1.5 h-8.5 px-3 cursor-pointer border-emerald-500/30 text-emerald-700 dark:text-emerald-400 bg-emerald-500/5 hover:bg-emerald-500/10"
          >
            <Smartphone className="size-3.5" />
            <span className="hidden sm:inline">Resumo 9:16</span>
            <span className="sm:hidden">9:16</span>
          </Button>
          <Badge
            variant={getStatusVariant(order.status)}
            className="text-[11px] font-mono font-semibold px-2.5 py-0.5 rounded-lg"
          >
            {translateStatus(order.status)}
          </Badge>
        </div>
      </div>

      {/* ── 2. Título & Metadados do Pedido ── */}
      <div className="space-y-1">
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
          <Package className="size-6 text-primary" strokeWidth={2} />
          Pedido #{order.public_token}
        </h1>
        <p className="text-xs text-muted-foreground">
          Realizado em {formatDate(order.created_at)}
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Left: items + shipping */}
        <div className="md:col-span-2 space-y-6">
          {/* Order items */}
          <div className="rounded-2xl border border-border/60 bg-card p-4 sm:p-5 space-y-4">
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2 pb-2 border-b border-border/40">
              <Package className="size-4 text-primary" strokeWidth={2} />
              Itens do Pedido ({items.length})
            </h3>
            <div className="divide-y divide-border/30">
              {items.map((item: any) => {
                const isBackorderItem = item.metadata?.is_backorder === true;
                return (
                  <div
                    key={item.id}
                    className="flex justify-between py-3.5 first:pt-0 last:pb-0 text-xs"
                  >
                    <div className="space-y-1 pr-4">
                      <p className="font-semibold text-sm text-foreground flex items-center gap-2 flex-wrap">
                        {item.product_title}
                        {isBackorderItem && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20 rounded-md">
                            ⏱ Sob Encomenda
                          </span>
                        )}
                      </p>
                      {item.variant_sku && (
                        <p className="text-[11px] text-muted-foreground font-mono">
                          SKU: {item.variant_sku}
                        </p>
                      )}
                      {item.selected_options && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {(Array.isArray(item.selected_options)
                            ? item.selected_options
                            : typeof item.selected_options === "object"
                            ? Object.values(item.selected_options)
                            : []
                          ).map((opt: any, oIdx: number) => {
                            const label = typeof opt === "string" ? opt : opt?.label || opt?.name;
                            if (!label) return null;
                            return (
                              <span
                                key={oIdx}
                                className="text-[10px] font-bold bg-muted/60 text-foreground/80 border border-border/60 px-1.5 py-0.5 rounded-md"
                              >
                                + {label}
                              </span>
                            );
                          })}
                        </div>
                      )}
                      {item.notes && (
                        <p className="text-[11px] font-medium text-amber-700 dark:text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-md inline-block mt-1">
                          Observação: {item.notes}
                        </p>
                      )}
                      {isBackorderItem && (
                        <p className="text-[11px] text-amber-700 dark:text-amber-400">
                          Este item será produzido sob encomenda.
                        </p>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-bold text-sm font-mono text-foreground">
                        {formatMoney(item.total_cents)}
                      </p>
                      <p className="text-[11px] text-muted-foreground mt-0.5 font-mono">
                        {item.qty}x {formatMoney(item.unit_price_cents)}
                      </p>
                      {order.status === "delivered" && (
                        <div className="mt-2">
                          <ReviewModal productId={item.product_id} productName={item.product_title} orderId={order.id} />
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Delivery & Shipping Address */}
          <div className="bg-card rounded-2xl border border-border/60 p-4 sm:p-5 space-y-4">
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2 pb-2 border-b border-border/40">
              <MapPin className="size-4 text-primary" />
              Entrega / Retirada
            </h3>
            {order.shipping_method === "pickup" ? (
              <p className="text-xs text-muted-foreground">
                Modalidade: <strong className="text-foreground">Retirada na Loja</strong>
              </p>
            ) : (
              <div className="text-xs text-muted-foreground space-y-1">
                <p>
                  <strong className="text-foreground">Modalidade:</strong> Entrega domiciliar
                </p>
                {address.street && (
                  <p className="text-foreground font-medium">
                    {address.street}, {address.number}
                    {address.complement && ` — ${address.complement}`}
                  </p>
                )}
                {address.neighborhood && (
                  <p>
                    {address.neighborhood} — {address.city}/{address.state}
                  </p>
                )}
                {address.zipcode && (
                  <p className="font-mono text-[11px] text-muted-foreground">
                    CEP: {address.zipcode}
                  </p>
                )}
              </div>
            )}

            {/* Rastreamento ao Vivo do Motoboy */}
            <DealDeliveryTrackingCard orderId={order.id} />

            {/* Delivery Proofs if any */}
            {proofs && proofs.length > 0 && (
              <div className="pt-3 border-t border-border/40 space-y-2.5">
                <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <Package className="size-3.5 text-emerald-600" />
                  Comprovante de Entrega Confirmada
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                        <span>Foto capturada pelo entregador</span>
                        {pr.latitude && pr.longitude && (
                          <a
                            href={`https://www.google.com/maps/search/?api=1&query=${pr.latitude},${pr.longitude}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary hover:underline font-mono"
                          >
                            Ver GPS ↗
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

        {/* Right: totals + payment */}
        <div className="space-y-6">
          {/* Summary totals */}
          <div className="rounded-2xl border border-border/60 bg-card p-4 sm:p-5 space-y-4 text-foreground">
            <h3 className="text-sm font-bold pb-2 border-b border-border/40 flex items-center gap-2">
              <CreditCard className="size-4 text-primary" />
              Resumo Financeiro
            </h3>
            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between text-muted-foreground">
                <span>Subtotal</span>
                <span className="font-mono font-semibold text-foreground">{formatMoney(order.subtotal_cents)}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Frete</span>
                <span className="font-mono font-semibold text-foreground">
                  {order.shipping_cents === 0 ? "Grátis" : formatMoney(order.shipping_cents)}
                </span>
              </div>
              {order.discount_cents > 0 && (
                <div className="flex justify-between text-emerald-700 dark:text-emerald-400 font-semibold bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-lg">
                  <span>Desconto</span>
                  <span className="font-mono">-{formatMoney(order.discount_cents)}</span>
                </div>
              )}
              <div className="flex justify-between items-baseline pt-3 mt-3 border-t border-border/40">
                <span className="text-sm font-bold text-foreground">Total</span>
                <span className="text-xl font-bold tracking-tight text-foreground font-mono">
                  {formatMoney(order.total_cents)}
                </span>
              </div>
            </div>
          </div>

          {/* Payment instructions & Upload */}
          {order.status === "awaiting_payment" && (
            <div className="rounded-2xl border border-border/60 bg-card p-4 sm:p-5 space-y-4 text-foreground">
              <h3 className="text-sm font-bold flex items-center gap-2 pb-2 border-b border-border/40">
                <CreditCard className="size-4 text-primary" />
                Como Pagar
              </h3>

              {paymentInstructions.pix_key ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <QrCode className="size-4 text-foreground shrink-0" />
                    <p className="text-xs font-semibold text-foreground">
                      Copie a chave abaixo e cole no app do seu banco:
                    </p>
                  </div>
                  <div className="bg-muted/40 p-3 rounded-xl text-xs font-mono break-all select-all font-semibold border border-border/40">
                    {paymentInstructions.pix_key}
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full font-semibold rounded-xl text-xs h-9 cursor-pointer"
                    onClick={handleCopyPix}
                  >
                    <Copy className="size-3.5 mr-2" /> Copiar Chave PIX
                  </Button>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Entre em contato com a loja para obter as instruções de pagamento.
                </p>
              )}

              {paymentInstructions.payment_instructions && (
                <div className="bg-muted/40 rounded-xl p-3 text-xs text-foreground border border-border/40">
                  <p className="font-bold mb-1">Instruções adicionais:</p>
                  <p className="whitespace-pre-wrap text-muted-foreground">{paymentInstructions.payment_instructions}</p>
                </div>
              )}

              {/* Upload section */}
              <div className="rounded-xl border border-dashed border-border/70 bg-muted/20 p-4 text-center space-y-2.5">
                <Upload className="size-5 mx-auto text-muted-foreground" />
                <p className="text-xs font-medium text-muted-foreground">
                  Envie o comprovante de pagamento para agilizar a confirmação.
                </p>
                <input
                  type="file"
                  id="receipt-file"
                  className="hidden"
                  accept="image/*,application/pdf"
                  onChange={handleUploadReceipt}
                  disabled={uploading}
                />
                <Button
                  asChild
                  size="sm"
                  className="w-full rounded-xl text-xs font-semibold h-9 cursor-pointer"
                  disabled={uploading}
                >
                  <label htmlFor="receipt-file">
                    {uploading ? "Enviando..." : "Anexar Comprovante"}
                  </label>
                </Button>
              </div>
            </div>
          )}

          {/* Payment status messages */}
          {order.status === "payment_processing" && (
            <div className="flex items-start gap-2.5 bg-amber-500/10 border border-amber-500/20 text-amber-900 dark:text-amber-200 text-xs p-3.5 rounded-xl">
              <Info className="size-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
              <div>
                <p className="font-bold">Comprovante em análise</p>
                <p className="mt-0.5 opacity-90">
                  A equipe está confirmando seu pagamento. Você será notificado em breve.
                </p>
              </div>
            </div>
          )}

          {payment?.receipt_status === "rejected" && (
            <div className="flex items-start gap-2.5 bg-destructive/10 border border-destructive/20 text-destructive text-xs p-3.5 rounded-xl">
              <AlertTriangle className="size-4 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Comprovante Recusado</p>
                <p className="mt-0.5 opacity-90">
                  O comprovante não pôde ser validado. Por favor, envie novamente ou contate a loja.
                </p>
              </div>
            </div>
          )}

          {["paid", "processing", "completed"].includes(order.status) && (
            <div className="flex items-start gap-2.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-900 dark:text-emerald-200 text-xs p-3.5 rounded-xl">
              <Info className="size-4 shrink-0 mt-0.5 text-emerald-600 dark:text-emerald-400" />
              <div>
                <p className="font-bold">Pagamento Confirmado</p>
                <p className="mt-0.5 opacity-90">
                  Seu pagamento foi confirmado! O pedido está sendo preparado.
                </p>
              </div>
            </div>
          )}

          {["delivered", "completed", "shipped"].includes(order.status) && (
            <>
              <Button
                variant="outline"
                className="w-full mt-4 rounded-xl text-xs font-semibold h-10 cursor-pointer"
                onClick={() => setRmaWizardOpen(true)}
              >
                Solicitar Devolução / Troca
              </Button>
              <RmaWizard
                orderId={order.id}
                items={items}
                isOpen={rmaWizardOpen}
                onClose={() => setRmaWizardOpen(false)}
                onSuccess={() => router.invalidate()}
              />
            </>
          )}
        </div>
      </div>

      {/* Modal do Cartão Digital 9:16 */}
      <Dialog open={companionOpen} onOpenChange={setCompanionOpen}>
        <DialogContent className="max-w-md p-0 overflow-hidden border-border bg-card rounded-2xl sm:max-w-lg">
          <DialogHeader className="p-4 border-b border-border/70 bg-muted/30">
            <DialogTitle className="text-sm font-bold flex items-center gap-2">
              <Smartphone className="size-4 text-emerald-600" />
              Resumo do Pedido 9:16 (WhatsApp)
            </DialogTitle>
          </DialogHeader>
          <div className="p-4 max-h-[85vh] overflow-y-auto no-scrollbar flex justify-center">
            {companionData && (
              <DigitalCompanionCard {...companionData} />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
