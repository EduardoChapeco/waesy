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
import { PageHeader } from "@/components/commerce/page-header";
import { ReviewModal } from "@/components/commerce/review-modal";
import { RmaWizard } from "@/components/commerce/rma-wizard";
import { ErrorState, EmptyState } from "@/components/state/states";
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
 <div className="space-y-6">
 <Link
 to="/conta/pedidos"
 className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
 >
 <ChevronLeft className="h-4 w-4" /> Voltar para pedidos
 </Link>
 <EmptyState title="Pedido não encontrado" />
 </div>
 );
 }

 const payment = order.payments?.[0];
 // Use canonical field names from order_items: qty and total_cents
 const items = order.order_items || [];
 const address = order.shipping_address || {};

 const handleCopyPix = () => {
 if (!paymentInstructions.pix_key) return;
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
 <div className="space-y-6 font-sans text-foreground">
 <div className="flex items-center justify-between pb-4">
 <Link
 to="/conta/pedidos"
 className="flex items-center gap-1 text-sm font-bold text-foreground hover:underline decoration-2"
 >
 <ChevronLeft className="h-4 w-4" /> Voltar para pedidos
 </Link>
 <div className="flex items-center gap-2">
 <Button
 variant="outline"
 size="sm"
 onClick={() => setCompanionOpen(true)}
 className="rounded-xl text-xs font-bold gap-1.5 h-9 px-3.5 cursor-pointer border-emerald-500/30 text-emerald-700 dark:text-emerald-400 bg-emerald-500/5 hover:bg-emerald-500/10 shadow-xs"
 >
 <Smartphone className="size-3.5" />
 <span>Resumo 9:16 (WhatsApp)</span>
 </Button>
 <span className="px-3 py-1 font-mono text-xs font-black uppercase bg-secondary rounded-lg">
 {translateStatus(order.status)}
 </span>
 </div>
 </div>

 <div>
 <h1 className="text-3xl font-semibold font-bold flex items-center gap-3">
 <Package className="size-8 text-primary" strokeWidth={3} />
 Pedido #{order.public_token}
 </h1>
 <p className="text-sm font-mono mt-2 bg-primary text-primary-foreground inline-block px-2 py-1 ">
 Realizado em {formatDate(order.created_at)}
 </p>
 </div>

 <div className="grid gap-6 md:grid-cols-3">
 {/* Left: items + shipping */}
 <div className="md:col-span-2 space-y-6">
 {/* Order items */}
 <div className=" bg-background p-5 space-y-4 mb-6">
 <h3 className="font-semibold text-xl font-bold flex items-center gap-2 pb-3">
 <Package className="h-6 w-6 text-primary" strokeWidth={2.5} />
 Itens do Pedido
 </h3>
 <div className="divide-y">
 {items.map((item: any) => {
 const isBackorderItem = item.metadata?.is_backorder === true;
 return (
 <div
 key={item.id}
 className="flex justify-between py-4 first:pt-0 last:pb-0 text-sm"
 >
 <div>
 <p className="font-bold text-lg flex items-center gap-2 flex-wrap">
 {item.product_title}
 {isBackorderItem && (
 <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 bg-warning/15 text-warning border border-warning/30 rounded-md">
 ⏱ Sob Encomenda
 </span>
 )}
 </p>
 <p className="text-xs text-foreground/70 font-mono mt-0.5">
 SKU: {item.variant_sku}
 </p>
 {isBackorderItem && (
 <p className="text-xs text-warning mt-1">
 Este item será produzido sob encomenda. O prazo de envio será comunicado
 em breve.
 </p>
 )}
 </div>
 <div className="text-right">
 {/* Canonical DB field: total_cents (not total_price_cents) */}
 <p className="font-black font-semibold text-lg">
 {formatMoney(item.total_cents)}
 </p>
 {/* Canonical DB field: qty (not quantity) */}
 <p className="text-xs text-foreground/70">
 {item.qty}x {formatMoney(item.unit_price_cents)}
 </p>
 {order.status === "delivered" && (
 <ReviewModal productId={item.product_id} productName={item.product_title} orderId={order.id} />
 )}
 </div>
 </div>
 );
 })}
 </div>
 </div>

 {/* Delivery & Shipping Address */}
 <div className="bg-card rounded-2xl border border-border/60 p-5 space-y-4 mb-6 shadow-2xs">
 <h3 className="font-semibold text-base font-bold flex items-center gap-2 pb-2 border-b border-border/40">
 <MapPin className="size-5 text-primary" />
 Entrega / Retirada
 </h3>
 {order.shipping_method === "pickup" ? (
 <p className="text-sm text-muted-foreground">
 Modalidade: <strong className="text-foreground">Retirada na Loja</strong>
 </p>
 ) : (
 <div className="text-xs text-muted-foreground space-y-1">
 <p>
 <strong className="text-foreground">Modalidade:</strong> Entrega domiciliar
 </p>
 {address.street && (
 <p className="text-foreground">
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
 <p className="font-mono text-[11px] font-medium text-muted-foreground">
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
 <span className="text-[11px] font-bold text-foreground flex items-center gap-1.5">
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
 <div className=" bg-secondary p-6 space-y-4 mb-6 text-foreground">
 <h3 className="font-semibold text-2xl font-bold pb-3 flex items-center gap-2">
 <CreditCard className="size-6 text-primary" strokeWidth={2.5} />
 Resumo Financeiro
 </h3>
 <div className="space-y-2 text-sm font-medium">
 <div className="flex justify-between">
 <span>Subtotal</span>
 <span className="font-mono font-bold">{formatMoney(order.subtotal_cents)}</span>
 </div>
 <div className="flex justify-between">
 <span>Frete</span>
 <span className="font-mono font-bold">
 {order.shipping_cents === 0 ? "Grátis" : formatMoney(order.shipping_cents)}
 </span>
 </div>
 {order.discount_cents > 0 && (
 <div className="flex justify-between text-success font-black border border-success bg-white px-2 py-1 mt-1">
 <span>Desconto</span>
 <span>-{formatMoney(order.discount_cents)}</span>
 </div>
 )}
 <div className="flex justify-between items-end pt-4 mt-4">
 <span className="font-bold text-xl font-semibold">Total</span>
 <span className="font-black text-4xl text-primary font-semibold tracking-tight drop-">
 {formatMoney(order.total_cents)}
 </span>
 </div>
 </div>
 </div>

 {/* Payment instructions & Upload */}
 {order.status === "awaiting_payment" && (
 <div className=" bg-background p-5 space-y-5 text-foreground">
 <h3 className="font-semibold text-xl font-bold flex items-center gap-2 pb-3">
 <CreditCard className="h-6 w-6 text-primary" strokeWidth={2.5} />
 Como Pagar
 </h3>

 {paymentInstructions.pix_key ? (
 <div className="space-y-3">
 <div className="flex items-center gap-2">
 <QrCode className="h-4 w-4 text-foreground shrink-0" />
 <p className="text-xs font-bold text-foreground">
 Copie a chave abaixo e cole no app do seu banco:
 </p>
 </div>
 <div className="bg-muted/30 p-3 text-xs font-mono break-all select-all font-bold">
 {paymentInstructions.pix_key}
 </div>
 <Button
 size="sm"
 variant="outline"
 className="w-full font-bold rounded-xl bg-white text-foreground"
 onClick={handleCopyPix}
 >
 <Copy className="h-3.5 w-3.5 mr-2" /> Copiar Chave PIX
 </Button>
 </div>
 ) : (
 <p className="text-sm text-foreground/80 font-medium">
 Entre em contato com a loja para obter as instruções de pagamento.
 </p>
 )}

 {paymentInstructions.payment_instructions && (
 <div className="bg-secondary/30 p-3 text-xs text-foreground font-medium">
 <p className="font-bold text-foreground mb-1">Instruções adicionais:</p>
 <p className="whitespace-pre-wrap">{paymentInstructions.payment_instructions}</p>
 </div>
 )}

 {/* Upload section */}
 <div className="border-0 bg-muted/30 p-5 text-center space-y-3">
 <Upload className="h-6 w-6 mx-auto text-foreground" />
 <p className="text-xs font-bold text-foreground">
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
 className="w-full bg-primary text-primary-foreground rounded-xl font-bold cursor-pointer"
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
 <div className="flex items-start gap-3 bg-secondary text-foreground text-sm p-4 ">
 <Info className="h-5 w-5 shrink-0 mt-0.5 text-foreground" strokeWidth={2.5} />
 <div>
 <p className="font-black font-semibold uppercase">Comprovante em análise</p>
 <p className="mt-1 text-foreground/80 font-medium">
 A equipe está confirmando seu pagamento. Você será notificado em breve.
 </p>
 </div>
 </div>
 )}

 {payment?.receipt_status === "rejected" && (
 <div className="flex items-start gap-3 bg-primary text-primary-foreground text-sm p-4 ">
 <AlertTriangle
 className="h-5 w-5 shrink-0 mt-0.5 text-primary-foreground"
 strokeWidth={2.5}
 />
 <div>
 <p className="font-black font-semibold uppercase">Comprovante Recusado</p>
 <p className="mt-1 text-primary-foreground/90 font-medium">
 O comprovante não pôde ser validado. Por favor, envie novamente ou contate a loja.
 </p>
 </div>
 </div>
 )}

 {["paid", "processing", "completed"].includes(order.status) && (
 <div className="flex items-start gap-3 bg-success text-white text-sm p-4 ">
 <Info className="h-5 w-5 shrink-0 mt-0.5 text-white" strokeWidth={2.5} />
 <div>
 <p className="font-black font-semibold uppercase">Pagamento Confirmado</p>
 <p className="mt-1 text-white/90 font-medium">
 Seu pagamento foi confirmado! O pedido está sendo preparado.
 </p>
 </div>
 </div>
 )}

 {["delivered", "completed", "shipped"].includes(order.status) && (
 <>
 <Button
 variant="outline"
 className="w-full mt-6 bg-background text-primary rounded-xl font-black"
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
