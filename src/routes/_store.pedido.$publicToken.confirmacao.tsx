import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";
import {
 CheckCircle2,
 Package,
 ArrowRight,
 Copy,
 Info,
 MessageCircle,
 ShieldCheck,
 Clock,
 ChefHat,
 Bike,
 Truck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/commerce/page-header";
import { ErrorState } from "@/components/state/states";
import { getOrderByToken } from "@/services/checkout.functions";
import { formatMoney } from "@/lib/money";
import { PostOrderAuditModal } from "@/components/commerce/post-order-audit-modal";
import { getBrowserClient } from "@/lib/supabase";
import { trackPurchaseEvent } from "@/components/commerce/product-telemetry";
import { generateContractFromOrder } from "@/services/contracts.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/_store/pedido/$publicToken/confirmacao")({
 head: () => ({
 meta: [{ title: "Pedido Confirmado | Waesy" }],
 }),
  loader: async ({ params }) => {
    try {
      const order = await getOrderByToken({ data: { token: params.publicToken } }).catch(() => null);
      return { order: order || null };
    } catch (err) {
      console.error("[loader:_store.pedido.$publicToken.confirmacao] Unhandled loader error:", err);
      return { order: null };
    }
  },
 component: ConfirmationPage,
});

function ConfirmationPage() {
  const { order: initialOrder } = ((Route.useLoaderData() as any) || {});
 const [order, setOrder] = useState<any>(initialOrder);
 const [isAuditOpen, setIsAuditOpen] = useState(false);
 const trackedPurchaseRef = useRef<string | null>(null);

  // Contrato Digital do Pedido
  const [isGeneratingContract, setIsGeneratingContract] = useState(false);
  const [contractInfo, setContractInfo] = useState<{ signingUrl: string; whatsappLink: string | null } | null>(null);

  const handleGenerateContract = async () => {
    if (!order?.id) return;
    setIsGeneratingContract(true);
    try {
      const res = await generateContractFromOrder({ data: { orderId: order.id } });
      setContractInfo({ signingUrl: res.signingUrl, whatsappLink: res.whatsappLink });
      toast.success("Contrato digital gerado com sucesso!");
    } catch (err: any) {
      toast.error(err?.message || "Erro ao gerar contrato.");
    } finally {
      setIsGeneratingContract(false);
    }
  };

 // Telemetria Comercial — Disparo de Purchase (Meta Pixel, GA4, TikTok e Server-Side CAPI)
 useEffect(() => {
   if (!order?.id) return;
   const isPaid = ["paid", "processing", "shipped", "delivered"].includes(order.status);
   if (isPaid && trackedPurchaseRef.current !== order.id) {
     trackedPurchaseRef.current = order.id;

     const rawItems = order.items_snapshot || order.order_items || [];
     const mappedItems = rawItems.map((item: any) => ({
       productId: item.product_id || item.productId || item.id,
       productTitle: item.product_title || item.productName || item.title || "Produto",
       priceCents: item.unit_price_cents || item.price_snapshot_cents || item.priceCents || 0,
       quantity: item.qty || item.quantity || 1,
     }));

     trackPurchaseEvent({
       storeId: order.store_id || order.stores?.id,
       orderId: order.id,
       orderToken: order.public_token,
       totalCents: order.total_cents || 0,
       items: mappedItems,
       currency: "BRL",
       customerEmail: order.customer_snapshot?.email,
       customerPhone: order.customer_snapshot?.phone,
     });
   }
 }, [order?.id, order?.status, order?.total_cents, order?.store_id]);

 // Polling híbrido resiliente (4s) + Supabase Realtime para confirmação instantânea no mobile
 useEffect(() => {
 if (!order?.public_token || order.status !== "awaiting_payment") return;

 let isMounted = true;

 // 1. Fallback Polling Interval de 4s (garante funcionamento mesmo se WebSocket oscilar no 4G/5G)
 const interval = setInterval(async () => {
 try {
 const latest = await getOrderByToken({ data: { token: order.public_token } });
 if (latest && isMounted) {
 if (latest.status !== order.status) {
 setOrder(latest);
 if (latest.status === "paid") {
 toast.success("Pagamento confirmado com sucesso! Seu pedido já está em preparação.");
 }
 }
 }
 } catch {
 // Silencioso no fallback
 }
 }, 4000);

 // 2. Realtime WebSocket subscription
 const supabase = getBrowserClient();
 const channel = supabase
 .channel(`order-status-${order.id}`)
 .on(
 "postgres_changes",
 {
 event: "UPDATE",
 schema: "public",
 table: "orders",
 filter: `id=eq.${order.id}`,
 },
 (payload) => {
 if (payload.new && isMounted) {
 setOrder((prev: any) => ({ ...prev, ...payload.new }));
 if (payload.new.status === "paid") {
 toast.success("Pagamento confirmado via Pix! Preparando seu pedido.");
 }
 }
 },
 )
 .subscribe();

 return () => {
 isMounted = false;
 clearInterval(interval);
 supabase.removeChannel(channel);
 };
 }, [order?.id, order?.public_token, order?.status]);

 if (!order) {
 return (
 <div className="mx-auto max-w-screen-xl px-4 py-20 md:px-6">
 <ErrorState />
 </div>
 );
 }

 const paymentMethod = order.payment_method || order.payments?.[0]?.method || "pix";
 const rawItems = order.items_snapshot || order.order_items || [];
 const items = rawItems.map((item: any) => ({
 productName: item.product_title || item.productName || item.title || "Produto",
 priceCents: item.unit_price_cents || item.price_snapshot_cents || item.priceCents || 0,
 quantity: item.qty || item.quantity || 1,
 }));
 const subtotal =
 order.subtotal_cents ||
 items.reduce((acc: number, item: any) => acc + item.priceCents * item.quantity, 0);
 const shipping = order.shipping_cents || 0;
 const discount = order.discount_cents || 0;
 const total = order.total_cents || Math.max(0, subtotal + shipping - discount);
 const storeSettings = order?.stores?.settings || {};
 const bankInfo = storeSettings.payment_settings?.bank_transfer || storeSettings.bank_transfer || null;
 const pixKey =
 storeSettings.payment_settings?.pix_key ||
 storeSettings.pix_key ||
 "Consulte a loja para obter a Chave PIX oficial de pagamento.";
 const rawPhone =
 storeSettings.whatsapp_phone ||
 storeSettings.phone ||
 storeSettings.whatsapp ||
 storeSettings.contact_phone ||
 "";
 const whatsappPhone = rawPhone.replace(/\D/g, "");

 const handleCopyPix = () => {
 navigator.clipboard.writeText(pixKey);
 toast.success("Código Pix copiado!");
 };

 return (
 <div className="mx-auto max-w-screen-xl px-4 py-8 md:px-6 md:py-12">
 <div className="mx-auto max-w-3xl space-y-8">
 <div className="flex flex-col items-center text-center">
 <PageHeader title="Pedido Realizado com Sucesso" />
 <p className="mt-2 text-sm text-muted-foreground">
 Código do pedido:{" "}
 <span className="font-mono font-medium text-foreground">{order.public_token}</span>
 </p>
 </div>

 {/* ── LIVE ORDER TRACKER: Régua Visual de Acompanhamento em Tempo Real ── */}
 <div className="p-5 sm:p-6 rounded-2xl bg-card border border-border/80 shadow-xs space-y-4">
 <div className="flex items-center justify-between pb-2 border-b border-border/40">
 <span className="text-xs font-mono font-bold uppercase tracking-wider text-muted-foreground">
 Acompanhamento do Pedido
 </span>
 <span className="text-[11px] font-medium text-primary flex items-center gap-1.5">
 <span className="size-1.5 rounded-full bg-primary animate-pulse" />
 Tempo real
 </span>
 </div>

 <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2">
 {[
 {
 step: 1,
 label: "Recebido",
 icon: Clock,
 isDone: ["paid", "processing", "shipped", "delivered"].includes(order.status),
 isActive: order.status === "paid" || order.status === "awaiting_payment",
 },
 {
 step: 2,
 label: "Na Cozinha",
 icon: ChefHat,
 isDone: ["processing", "shipped", "delivered"].includes(order.status),
 isActive: order.status === "processing",
 },
 {
 step: 3,
 label: "A Caminho",
 icon: Bike,
 isDone: ["shipped", "delivered"].includes(order.status),
 isActive: order.status === "shipped",
 },
 {
 step: 4,
 label: "Entregue",
 icon: CheckCircle2,
 isDone: order.status === "delivered",
 isActive: order.status === "delivered",
 },
 ].map((st) => {
 const StepIcon = st.icon;
 return (
 <div key={st.step} className="flex flex-col items-center text-center space-y-1.5">
 <div
 className={`size-10 rounded-2xl flex items-center justify-center border transition-all ${
 st.isDone
 ? "bg-primary text-primary-foreground border-primary shadow-xs"
 : st.isActive
 ? "bg-primary/10 text-primary border-primary animate-bounce"
 : "bg-muted text-muted-foreground border-border/60 opacity-50"
 }`}
 >
 <StepIcon className="size-4" />
 </div>
 <span
 className={`text-[10px] sm:text-xs font-bold leading-tight ${
 st.isDone || st.isActive ? "text-foreground" : "text-muted-foreground"
 }`}
 >
 {st.label}
 </span>
 </div>
 );
 })}
 </div>
 </div>

 {/* Payment instructions */}
 {order.status === "awaiting_payment" && (
 <div className="border bg-card p-6 space-y-4">
 <h3 className="font-semibold text-lg">Instruções de Pagamento</h3>

 {paymentMethod === "pix" ? (
 <div className="space-y-4">
 <p className="text-sm text-muted-foreground">
 Pague via Pix para aprovação imediata do seu pedido:
 </p>
 <div className="bg-muted p-4 flex items-center justify-between gap-3">
 <span className="font-mono text-xs break-all line-clamp-2 select-all select-none">
 {pixKey}
 </span>
 <Button
 size="sm"
 variant="secondary"
 onClick={handleCopyPix}
 className="shrink-0"
 >
 <Copy className="h-4 w-4 mr-2" /> Copiar Código
 </Button>
 </div>
 </div>
 ) : paymentMethod === "manual" ? (
 <div className="space-y-4">
 <p className="text-sm text-muted-foreground">
 Sua reserva foi registrada! Para confirmar seu pedido e combinar o pagamento e
 entrega, fale com a nossa equipe no WhatsApp:
 </p>

 <Button
 size="lg"
 className="w-full sm:w-auto bg-success hover:bg-success text-white gap-2 cursor-pointer"
 onClick={async () => {
 if (!whatsappPhone) {
 toast.info("Telefone de atendimento não configurado no painel da loja.");
 return;
 }

 const { buildStructuredOrderWhatsAppMessage } = await import("@/lib/whatsapp");
 const structuredItems = (items || []).map((it: any) => ({
 name: it.product_title || it.title || "Produto",
 qty: it.qty || 1,
 unitPriceCents: it.unit_price_cents || it.price_cents || 0,
 selectedOptions: it.selected_options || [],
 }));

 const fullMessage = buildStructuredOrderWhatsAppMessage({
 orderToken: order.public_token,
 customerName: order.customer_snapshot?.name,
 items: structuredItems,
 subtotalCents: subtotal,
 shippingCents: shipping,
 discountCents: discount,
 totalCents: total,
 paymentMethodText: paymentMethod === "pix" ? "Pix" : "Manual / Combinar",
 deliveryMethodText: order.shipping_method || "Padrão",
 });

 window.open(`https://wa.me/${whatsappPhone}?text=${encodeURIComponent(fullMessage)}`, "_blank");
 }}
 >
 <MessageCircle className="h-5 w-5" /> Enviar Pedido no WhatsApp
 </Button>
 </div>
 ) : (
 <div className="space-y-3 text-sm">
 {bankInfo && (bankInfo.bank_name || bankInfo.account) ? (
 <>
 <p className="text-muted-foreground">
 Faça uma transferência ou depósito para a conta oficial da loja:
 </p>
 <div className="bg-muted/40 p-4 rounded-xl space-y-1 font-mono text-xs border border-border/60">
 {bankInfo.bank_name && (
 <p>
 <strong>Banco:</strong> {bankInfo.bank_name}
 </p>
 )}
 {bankInfo.agency && (
 <p>
 <strong>Agência:</strong> {bankInfo.agency}
 </p>
 )}
 {bankInfo.account && (
 <p>
 <strong>Conta:</strong> {bankInfo.account}
 </p>
 )}
 {bankInfo.holder_name && (
 <p>
 <strong>Favorecido:</strong> {bankInfo.holder_name}
 </p>
 )}
 {bankInfo.document && (
 <p>
 <strong>CNPJ/CPF:</strong> {bankInfo.document}
 </p>
 )}
 </div>
 </>
 ) : (
 <div className="p-4 rounded-xl bg-muted/30 border border-border/50 text-xs text-muted-foreground space-y-2">
 <p className="font-medium text-foreground">
 Dados bancários para transferência:
 </p>
 <p>
 Solicite os dados bancários atualizados diretamente ao lojista para realizar o pagamento.
 </p>
 {whatsappPhone && (
 <Button
 size="sm"
 variant="outline"
 className="rounded-xl text-xs h-9"
 onClick={() => {
 const msg = `Olá! Gostaria dos dados bancários para pagar o pedido #${order.public_token?.slice(0, 8).toUpperCase()}`;
 window.open(`https://wa.me/${whatsappPhone}?text=${encodeURIComponent(msg)}`, "_blank");
 }}
 >
 <MessageCircle className="size-3.5 mr-1.5" />
 Solicitar Dados Bancários
 </Button>
 )}
 </div>
 )}
 </div>
 )}

 <div className="flex items-start gap-2 text-xs text-muted-foreground bg-primary/5 p-3 border border-primary/10">
 <Info className="h-4 w-4 text-primary shrink-0 mt-0.5" />
 <p>
 Após pagar, você pode acessar os detalhes do pedido em sua conta para anexar e
 enviar o comprovante de pagamento.
 </p>
 </div>
 </div>
 )}

 {/* Order summary */}
 <div className="overflow-hidden bg-card ">
 <div className=" bg-muted/30 px-6 py-4">
 <h2 className="flex items-center text-sm font-semibold text-foreground">
 <Package className="mr-2 size-4" /> Resumo da Compra
 </h2>
 </div>
 <div className="px-6 py-4">
 <ul className="divide-y divide-border">
 {items.map((item: any, idx: number) => (
 <li key={idx} className="flex justify-between py-3 text-sm">
 <div className="flex flex-col">
 <div className="flex items-center">
 <span className="font-medium text-foreground">{item.quantity}x</span>
 <span className="ml-3 text-muted-foreground">{item.productName}</span>
 </div>
 {item.notes && (
 <span className="ml-7 text-xs text-muted-foreground italic mt-0.5">
 Obs: {item.notes}
 </span>
 )}
 </div>
 <span className="font-medium text-foreground">
 {formatMoney(item.priceCents * item.quantity)}
 </span>
 </li>
 ))}
 </ul>

 <div className="mt-6 pt-4 text-sm space-y-2 text-muted-foreground">
 <div className="flex justify-between">
 <span>Subtotal</span>
 <span>{formatMoney(subtotal)}</span>
 </div>
 <div className="flex justify-between">
 <span>Frete</span>
 <span>{shipping === 0 ? "Grátis" : formatMoney(shipping)}</span>
 </div>
 {discount > 0 && (
 <div className="flex justify-between text-success">
 <span>Desconto</span>
 <span>-{formatMoney(discount)}</span>
 </div>
 )}
 <div className="flex justify-between text-base font-semibold text-foreground pt-2 border-t">
 <span>Total</span>
 <span className="text-primary font-bold">{formatMoney(total)}</span>
 </div>
 </div>

 {/* Campos Personalizados & Observações */}
 {order.custom_fields && Object.keys(order.custom_fields).length > 0 && (
 <div className="mt-4 p-4 rounded-2xl bg-muted/30 space-y-2">
 <span className="text-xs font-bold text-foreground block">
 Informações Adicionais / Personalização:
 </span>
 <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
 {Object.entries(order.custom_fields).map(([k, v]: [string, any]) => (
 <div key={k} className="p-2.5 rounded-xl bg-card ">
 <span className="text-[9px] text-muted-foreground uppercase font-bold tracking-wider block">
 {k}
 </span>
 <span className="font-semibold text-foreground">{String(v)}</span>
 </div>
 ))}
 </div>
 </div>
 )}

 {order.notes && (
 <div className="mt-3 p-3 rounded-xl bg-muted/20 text-xs">
 <span className="text-[10px] text-muted-foreground font-bold uppercase block">
 Observações para a Loja:
 </span>
 <p className="text-foreground mt-0.5">{order.notes}</p>
 </div>
 )}

 {/* Detalhes de Atendimento e Entrega do Nicho */}
 {(order.cpf_on_receipt?.requested || order.receiver_info?.isOtherPerson || order.substitution_policy || order.checkout_niche_metadata?.utensilsRequested) && (
 <div className="mt-4 p-3.5 rounded-xl bg-muted/20 border border-border/40 space-y-1.5 text-xs">
 <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider block">
 Detalhes do Pedido & Entrega:
 </span>
 {order.cpf_on_receipt?.requested && (
 <p className="text-foreground">
 <span className="text-muted-foreground">CPF na Nota:</span>{" "}
 <span className="font-medium">{order.cpf_on_receipt.document || "Sim"}</span>
 </p>
 )}
 {order.receiver_info?.isOtherPerson && (
 <p className="text-foreground">
 <span className="text-muted-foreground">Recebedor autorizado:</span>{" "}
 <span className="font-medium">{order.receiver_info.name} {order.receiver_info.phone ? `(${order.receiver_info.phone})` : ""}</span>
 </p>
 )}
 {order.substitution_policy && (
 <p className="text-foreground">
 <span className="text-muted-foreground">Preferência em falta:</span>{" "}
 <span className="font-medium">
 {order.substitution_policy === "similar"
 ? "Trocar por similar da mesma categoria"
 : order.substitution_policy === "contact"
 ? "Confirmar com o cliente via WhatsApp"
 : "Cancelar item em falta"}
 </span>
 </p>
 )}
 {order.checkout_niche_metadata?.utensilsRequested && (
 <p className="text-foreground">
 <span className="text-muted-foreground">Talheres e descartáveis:</span>{" "}
 <span className="font-medium">Enviar descartáveis com o pedido</span>
 </p>
 )}
 </div>
 )}
 </div>
 </div>

  {/* Card de Contrato Digital do Pedido */}
  <div className="border border-border/80 bg-card rounded-2xl p-5 sm:p-6 space-y-4 shadow-2xs">
    <div className="flex items-center justify-between">
      <div className="space-y-0.5">
        <h3 className="text-sm font-bold text-foreground">Contrato Digital do Pedido</h3>
        <p className="text-xs text-muted-foreground">Documento com validade jurídica nacional e hash SHA-256</p>
      </div>
      <span className="text-[10px] font-mono uppercase font-semibold text-emerald-600 dark:text-emerald-400">
        Lei 14.063/2020
      </span>
    </div>

    {contractInfo ? (
      <div className="p-4 rounded-xl bg-muted/20 border border-border/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="space-y-0.5">
          <p className="text-xs font-bold text-foreground">Contrato Pronto para Assinatura</p>
          <p className="text-[11px] text-muted-foreground">Assine pelo celular no WhatsApp ou diretamente na tela.</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {contractInfo.whatsappLink && (
            <Button asChild size="sm" className="rounded-xl text-xs h-9 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold">
              <a href={contractInfo.whatsappLink} target="_blank" rel="noreferrer">
                <MessageCircle className="size-3.5 mr-1.5" />
                Assinar no WhatsApp
              </a>
            </Button>
          )}
          <Button asChild variant="outline" size="sm" className="rounded-xl text-xs h-9 px-4">
            <Link to={contractInfo.signingUrl}>
              Assinar Agora
              <ArrowRight className="size-3.5 ml-1.5" />
            </Link>
          </Button>
        </div>
      </div>
    ) : (
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-1">
        <p className="text-xs text-muted-foreground">
          Formalize a compra e assegure os termos de garantia, cancelamento e entrega.
        </p>
        <Button
          type="button"
          onClick={handleGenerateContract}
          disabled={isGeneratingContract}
          variant="outline"
          size="sm"
          className="rounded-xl text-xs font-semibold h-9 px-4 shrink-0 min-h-[44px] sm:min-h-[36px]"
        >
          <ShieldCheck className="size-3.5 mr-1.5 text-primary" />
          {isGeneratingContract ? "Gerando..." : "Emitir Contrato Digital"}
        </Button>
      </div>
    )}
  </div>

 {/* Bloco de Auditoria e Conformidade de Tags */}
 <div className=" bg-muted/20 rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
 <div className="flex items-center gap-3">
 <div className="size-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
 <ShieldCheck className="size-5" />
 </div>
 <div>
 <h4 className="text-xs font-bold text-foreground">Auditoria de Compromisso Waesy</h4>
 <p className="text-[11px] text-muted-foreground">
 Ajude a manter o comércio local confiável validando o cumprimento de prazos e frete grátis da loja.
 </p>
 </div>
 </div>

 <Button
 type="button"
 variant="outline"
 size="sm"
 onClick={() => setIsAuditOpen(true)}
 className="rounded-xl text-xs font-bold shrink-0 border-border cursor-pointer hover:bg-background"
 >
 Avaliar Tags do Pedido
 </Button>
 </div>

 <div className="flex flex-col justify-center gap-3 sm:flex-row pt-2">
 {whatsappPhone && (
 <Button
 asChild
 size="lg"
 className="bg-[#25D366] hover:bg-[#20bd5a] text-white font-bold rounded-xl text-sm gap-2"
 >
 <a
 href={`https://wa.me/55${whatsappPhone}?text=${encodeURIComponent(
 `Olá! Acabei de fazer o pedido #${order.public_token} no valor de ${formatMoney(total)} pelo app. Gostaria de acompanhar!`
 )}`}
 target="_blank"
 rel="noreferrer"
 >
 <MessageCircle className="size-4" />
 <span>Conversar no WhatsApp</span>
 </a>
 </Button>
 )}
 <Button asChild size="lg" variant="outline" className="rounded-xl font-bold text-sm">
 <Link to="/conta/pedidos">Acompanhar Pedido</Link>
 </Button>
 <Button asChild size="lg" className="rounded-xl font-bold text-sm bg-foreground text-background hover:bg-foreground/90">
 <Link to="/mercado">
 Continuar Comprando <ArrowRight className="ml-2 size-4" />
 </Link>
 </Button>
 </div>

 {/* Modal de Auditoria de 3 Cliques */}
 <PostOrderAuditModal
 isOpen={isAuditOpen}
 onClose={() => setIsAuditOpen(false)}
 orderId={order.id || order.public_token}
 storeId={order.stores?.id || order.store_id || "loja-padrao"}
 storeName={order.stores?.name || "Estabelecimento"}
 tagsToAudit={["entrega_gratis", "entrega_expressa"]}
 />
 </div>
 </div>
 );
}
