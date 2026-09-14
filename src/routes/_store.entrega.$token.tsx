import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import {
 Truck,
 MapPin,
 Phone,
 CheckCircle2,
 Navigation,
 KeyRound,
 Loader2,
 Camera,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { MediaUploader } from "@/components/ui/media-uploader";
import {
 getDeliveryByToken,
 confirmDeliveryByPin,
 startDeliveryPickup,
 updateDeliveryPaymentMethod,
} from "@/services/dispatch.functions";
import { formatMoney } from "@/lib/money";
import {
 Select,
 SelectContent,
 SelectItem,
 SelectTrigger,
 SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/_store/entrega/$token")({
 head: () => ({ meta: [{ title: "Painel do Entregador | Waesy" }] }),
  loader: async ({ params }) => {
    try {
      const delivery = await getDeliveryByToken({ data: { token: params.token } }).catch(() => null);
      return { delivery: delivery || null };
    } catch (err) {
      console.error("[loader:_store.entrega.$token] Unhandled loader error:", err);
      return { delivery: null };
    }
  },
 component: DeliveryCourierPage,
});

function DeliveryCourierPage() {
  const { delivery } = (Route.useLoaderData() as any) || {};
  const { token } = Route.useParams();

  const [pin, setPin] = useState("");
  const [proofPhotoUrl, setProofPhotoUrl] = useState("");
  const [isConfirming, setIsConfirming] = useState(false);
  const [isDelivered, setIsDelivered] = useState(delivery?.status === "delivered");
  const [deliveredAt, setDeliveredAt] = useState((delivery as any)?.delivered_at);
  const [selectedPayment, setSelectedPayment] = useState<"cash" | "pix" | "card" | "wallet">("cash");
  const [isUpdatingPayment, setIsUpdatingPayment] = useState(false);
  const [isStartingPickup, setIsStartingPickup] = useState(false);
  const [pickupStarted, setPickupStarted] = useState(delivery?.status === "in_transit" || delivery?.status === "delivered");

  if (!delivery) {
    return (
      <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full border border-border/80 bg-card rounded-2xl p-6 text-center space-y-4 shadow-sm">
          <div className="size-12 rounded-2xl bg-destructive/10 text-destructive flex items-center justify-center mx-auto">
            <Truck className="size-6" />
          </div>
          <h1 className="text-lg font-bold text-foreground">Entrega Não Encontrada</h1>
          <p className="text-xs text-muted-foreground leading-relaxed">
            O link de despacho informado não é válido, expirou ou a entrega foi cancelada pela loja.
          </p>
        </div>
      </div>
    );
  }

 const handleStartPickup = async () => {
 setIsStartingPickup(true);
 try {
 await startDeliveryPickup({ data: { token } });
 setPickupStarted(true);
 toast.success("Coleta registrada! Rota iniciada.");
 } catch {
 toast.error("Erro ao registrar início de rota.");
 } finally {
 setIsStartingPickup(false);
 }
 };

 const handleUpdatePayment = async (newMethod: "cash" | "pix" | "card" | "wallet") => {
 setIsUpdatingPayment(true);
 try {
 await updateDeliveryPaymentMethod({
 data: {
 token,
 paymentMethod: newMethod,
 notes: "Atualizado pelo entregador no momento da entrega",
 },
 });
 setSelectedPayment(newMethod);
 toast.success(`Forma de pagamento atualizada para ${newMethod.toUpperCase()} no sistema da loja!`);
 } catch {
 toast.error("Erro ao atualizar forma de pagamento.");
 } finally {
 setIsUpdatingPayment(false);
 }
 };

 const handleOpenMaps = () => {
 const encodedAddress = encodeURIComponent(delivery.delivery_address);
 window.open(`https://www.google.com/maps/search/?api=1&query=${encodedAddress}`, "_blank");
 };

 const handleOpenWaze = () => {
 const encodedAddress = encodeURIComponent(delivery.delivery_address);
 window.open(`https://waze.com/ul?q=${encodedAddress}`, "_blank");
 };

 const handleCallRecipient = () => {
 if (delivery.recipient_phone) {
 window.location.href = `tel:${delivery.recipient_phone.replace(/\D/g, "")}`;
 }
 };

 const handleConfirmDelivery = async (e: React.FormEvent) => {
 e.preventDefault();
 if (pin.length !== 4) {
 toast.error("O código PIN deve conter 4 dígitos.");
 return;
 }

 setIsConfirming(true);

 // Tenta capturar geolocalização se disponível no navegador
 let latitude: number | undefined;
 let longitude: number | undefined;

 if ("geolocation" in navigator) {
 try {
 const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
 navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 4000 });
 });
 latitude = pos.coords.latitude;
 longitude = pos.coords.longitude;
 } catch {
 // Ignora erro de timeout/permissão de GPS e segue
 }
 }

 try {
 const res = await confirmDeliveryByPin({
 data: {
 token,
 pin,
 proofPhotoUrl: proofPhotoUrl || undefined,
 latitude,
 longitude,
 },
 });

 if (res.success) {
 setIsDelivered(true);
 setDeliveredAt(res.deliveredAt);
 toast.success("Entrega confirmada com sucesso!");
 }
 } catch (e: unknown) {
 toast.error((e instanceof Error ? e.message : String(e)) || "Erro ao confirmar entrega.");
 } finally {
 setIsConfirming(false);
 }
 };

 return (
 <div className="min-h-screen bg-muted/20 flex flex-col justify-between p-4 max-w-lg mx-auto">
 <div className="space-y-4">
 {/* Header da Corrida */}
 <div className="bg-card rounded-2xl p-4 flex items-center justify-between border border-border/60 shadow-2xs">
 <div className="flex items-center gap-3">
 <div className="p-2.5 bg-primary/10 text-primary rounded-xl">
 <Truck className="size-6" />
 </div>
 <div>
 <p className="text-xs text-muted-foreground font-semibold">Painel do Entregador</p>
 <h1 className="text-base font-bold text-foreground">
 Pedido #{delivery.order_number}
 </h1>
 </div>
 </div>
 <Badge
 variant={isDelivered ? "default" : "secondary"}
 className="rounded-full text-xs font-bold px-2.5 py-0.5"
 >
 {isDelivered ? "Entregue" : "Em Trânsito"}
 </Badge>
 </div>

 {/* Taxa da Corrida */}
 <div className="bg-card rounded-2xl p-4 flex items-center justify-between border border-border/60 shadow-2xs">
 <div>
 <span className="text-xs text-muted-foreground">Sua Taxa de Entrega</span>
 <p className="text-xl font-black text-primary">
 {formatMoney(delivery.delivery_fee_cents || 0)}
 </p>
 </div>
 <span className="text-xs bg-muted px-2.5 py-1 rounded-lg font-medium text-foreground">
 {delivery.courier_name}
 </span>
 </div>

 {/* Dados do Destinatário & Endereço */}
 <div className="bg-card rounded-2xl p-4 space-y-4 border border-border/60 shadow-2xs">
 <div className="space-y-1">
 <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
 Cliente / Destinatário
 </span>
 <p className="text-sm font-bold text-foreground">{delivery.recipient_name}</p>
 {delivery.recipient_phone && (
 <p className="text-xs text-muted-foreground">{delivery.recipient_phone}</p>
 )}
 </div>

 <div className="space-y-1 pt-2 border-t border-border/40">
 <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
 <MapPin className="size-3 text-primary" /> Endereço de Entrega
 </span>
 <p className="text-xs text-foreground font-medium leading-relaxed">
 {delivery.delivery_address}
 </p>
 </div>

 {/* Ações Rápidas de Navegação & Contato */}
 <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2">
 <Button
 type="button"
 variant="outline"
 size="sm"
 onClick={handleOpenMaps}
 className="rounded-xl text-xs font-semibold gap-1.5 h-9"
 >
 <Navigation className="size-3.5 text-primary" />
 Maps
 </Button>
 <Button
 type="button"
 variant="outline"
 size="sm"
 onClick={handleOpenWaze}
 className="rounded-xl text-xs font-semibold gap-1.5 h-9"
 >
 <Navigation className="size-3.5 text-info" />
 Waze
 </Button>
 {delivery.recipient_phone && (
 <Button
 type="button"
 variant="outline"
 size="sm"
 onClick={handleCallRecipient}
 className="rounded-xl text-xs font-semibold gap-1.5 h-9"
 >
 <Phone className="size-3.5 text-emerald-600" />
 Ligar
 </Button>
 )}
 </div>
 </div>

 {/* ── Itens do Pedido ── */}
 {(delivery as any).items && (delivery as any).items.length > 0 && (
 <div className="bg-card rounded-2xl p-4 border border-border/60 shadow-2xs space-y-2.5">
 <div className="flex items-center justify-between">
 <span className="text-xs font-bold text-foreground">Itens da Entrega ({(delivery as any).items.length})</span>
 {(delivery as any).total_cents > 0 && (
 <span className="text-xs font-bold text-primary font-mono">
 Total {formatMoney((delivery as any).total_cents)}
 </span>
 )}
 </div>
 <div className="space-y-1.5 divide-y divide-border/40 text-xs">
 {(delivery as any).items.map((it: any, idx: number) => (
 <div key={idx} className="pt-1.5 first:pt-0 flex items-center justify-between">
 <span className="font-medium text-foreground">
 {it.qty}x {it.product_title}
 </span>
 <span className="font-mono text-muted-foreground">
 {formatMoney(it.total_cents || 0)}
 </span>
 </div>
 ))}
 </div>
 </div>
 )}

 {/* ── Status de Coleta na Loja ── */}
 {!isDelivered && (
 <div className="bg-card rounded-2xl p-4 border border-border/60 shadow-2xs space-y-2">
 <div className="flex items-center justify-between">
 <div>
 <p className="text-xs font-bold text-foreground">Status da Coleta</p>
 <p className="text-[11px] text-muted-foreground">
 {pickupStarted ? "Pedido já retirado no restaurante/loja." : "Confirme assim que retirar o pacote."}
 </p>
 </div>
 <Button
 type="button"
 size="sm"
 variant={pickupStarted ? "secondary" : "default"}
 disabled={isStartingPickup || pickupStarted}
 onClick={handleStartPickup}
 className="rounded-xl text-xs font-bold h-9"
 >
 {pickupStarted ? "✓ Coletado" : isStartingPickup ? "Registrando..." : "Confirmar Coleta"}
 </Button>
 </div>
 </div>
 )}

 {/* ── Alterar Forma de Pagamento no Ato da Entrega ── */}
 {!isDelivered && (
 <div className="bg-card rounded-2xl p-4 border border-border/60 shadow-2xs space-y-2">
 <div className="flex items-center justify-between">
 <span className="text-xs font-bold text-foreground">Forma de Pagamento</span>
 <span className="text-[10px] text-muted-foreground font-mono">Sincronização em tempo real</span>
 </div>
 <div className="flex items-center gap-2">
 <Select
 value={selectedPayment}
 onValueChange={(val: any) => handleUpdatePayment(val)}
 disabled={isUpdatingPayment}
 >
 <SelectTrigger className="h-9 text-xs rounded-xl flex-1 bg-background">
 <SelectValue placeholder="Selecione a forma..." />
 </SelectTrigger>
 <SelectContent className="rounded-xl text-xs">
 <SelectItem value="cash">Dinheiro na Entrega</SelectItem>
 <SelectItem value="pix">PIX na Maquininha / QR Code</SelectItem>
 <SelectItem value="card">Cartão Débito / Crédito (Maquininha)</SelectItem>
 <SelectItem value="wallet">Carteira / Saldo App</SelectItem>
 </SelectContent>
 </Select>
 </div>
 </div>
 )}

 {/* Confirmação de Entrega por PIN & Foto de Prova */}
 <div className="bg-card rounded-2xl p-5 space-y-4 border border-border/60 shadow-2xs">
 {isDelivered ? (
 <div className="text-center py-4 space-y-2">
 <div className="size-12 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center mx-auto">
 <CheckCircle2 className="size-7" />
 </div>
 <h2 className="text-base font-bold text-foreground">Entrega Finalizada!</h2>
 <p className="text-xs text-muted-foreground">
 Código PIN validado com sucesso. Obrigado pelo serviço!
 </p>
 </div>
 ) : (
 <form onSubmit={handleConfirmDelivery} className="space-y-4">
 <div className="space-y-1.5 text-center">
 <div className="inline-flex items-center gap-1.5 text-xs font-bold text-foreground">
 <KeyRound className="size-4 text-primary" />
 Código PIN de Confirmação
 </div>
 <p className="text-[11px] text-muted-foreground">
 Solicite o código de 4 dígitos para o cliente ao entregar o pedido.
 </p>
 </div>

 <Input
 type="text"
 pattern="[0-9]*"
 inputMode="numeric"
 maxLength={4}
 value={pin}
 onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
 placeholder="Ex: 8492"
 className="h-12 text-center text-xl font-mono font-bold tracking-widest rounded-xl"
 required
 />

 {/* Foto de Comprovante Opcional */}
 <div className="space-y-1.5 text-left pt-2 border-t border-border/40">
 <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
 <Camera className="size-3.5 text-muted-foreground" />
 Foto do Pacote / Destinatário (Opcional)
 </div>
 <MediaUploader
 value={proofPhotoUrl ? [proofPhotoUrl] : []}
 onChange={(urls) => setProofPhotoUrl(urls[0] || "")}
 bucket="post-media"
 folder="delivery_proofs"
 maxFiles={1}
 />
 </div>

 <Button
 type="submit"
 disabled={isConfirming || pin.length !== 4}
 className="w-full h-11 rounded-xl font-bold gap-2 text-sm"
 >
 {isConfirming ? (
 <>
 <Loader2 className="size-4 animate-spin" />
 Validando Código...
 </>
 ) : (
 <>
 <CheckCircle2 className="size-4" />
 Confirmar Entrega
 </>
 )}
 </Button>
 </form>
 )}
 </div>
 </div>

 <div className="py-4 text-center text-[10px] text-muted-foreground">
 Waesy Delivery Network • Despacho Seguro em Tempo Real
 </div>
 </div>
 );
}
