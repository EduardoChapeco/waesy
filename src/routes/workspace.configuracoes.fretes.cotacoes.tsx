import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { Search, Package, Phone, Calendar, MapPin, User, Check, Loader2 } from "lucide-react";

import { PageHeader } from "@/components/commerce/page-header";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState } from "@/components/state/states";
import { listShippingZones, calculateShipping } from "@/services/shipping.functions";
import { listOrdersAwaitingShippingQuote, updateOrderShippingQuote } from "@/services/order.functions";
import { formatMoney } from "@/lib/money";
import { formatCep } from "@/lib/document-validator";
import { toast } from "sonner";
import { formatDate } from "@/lib/datetime";

export const Route = createFileRoute("/workspace/configuracoes/fretes/cotacoes")({
 head: () => ({ meta: [{ title: "Cotações de Frete | Workspace Waesy" }] }),
 loader: async () => {
   try {
 const [zonesRes, pendingRes] = await Promise.all([
 listShippingZones(),
 listOrdersAwaitingShippingQuote(),
 ]);

 return {
 zones: zonesRes || [],
 pendingOrders: pendingRes || [],
 };
   } catch (err) {
     console.error("[loader:workspace.configuracoes.fretes.cotacoes] Unhandled loader error:", err);
     return { zones: null, pendingOrders: null };
   }
 },
 component: FretesCotacoesPage,
});

function FretesCotacoesPage() {
 const { zones, pendingOrders } = ((Route.useLoaderData?.() as any) || {});
 const router = useRouter();

 // Simulating states
 const [zipcode, setZipcode] = useState("");
 const [results, setResults] = useState<any[] | null>(null);
 const [loading, setLoading] = useState(false);

 // Manual quotes inputs
 const [quoteValues, setQuoteValues] = useState<Record<string, string>>({});
 const [savingOrderId, setSavingOrderId] = useState<string | null>(null);

 const handleSimulate = async (e: React.FormEvent) => {
 e.preventDefault();
 if (zipcode.replace(/\D/g, "").length < 8) {
 toast.error("Informe um CEP de 8 dígitos");
 return;
 }
 setLoading(true);
 try {
 const res = await calculateShipping({ data: { zipcode } });

 setResults(Array.isArray(res) ? res : []);
 } catch (e: unknown) {
 toast.error((e instanceof Error ? e.message : String(e)) || "Erro ao calcular");
 } finally {
 setLoading(false);
 }
 };

 const handleApplyQuote = async (orderId: string) => {
 const rawVal = quoteValues[orderId];
 if (!rawVal || isNaN(Number(rawVal)) || Number(rawVal) < 0) {
 toast.error("Por favor, digite um valor de frete válido (R$) maior ou igual a zero.");
 return;
 }

 const shippingCents = Math.round(parseFloat(rawVal) * 100);
 setSavingOrderId(orderId);
 try {
 const res = await updateOrderShippingQuote({
 data: {
 orderId,
 shippingCents,
 },
 });

 toast.success("Frete adicionado! Pedido liberado para pagamento.");
 router.invalidate();
 } catch (err) {
 toast.error("Erro inesperado");
 } finally {
 setSavingOrderId(null);
 }
 };

 return (
 <div className="space-y-8">
 <PageHeader title="Cotações" />

 {/* Solicitações Pendentes */}
 <div className="bg-surface-paper rounded-lg p-6">
 <div className="flex items-center justify-between mb-4">
 <h3 className="font-semibold text-lg flex items-center gap-2">
 Solicitações Pendentes
 <Badge variant="destructive" className="ml-1 text-xs">
 {pendingOrders.length}
 </Badge>
 </h3>
 </div>

 {pendingOrders.length === 0 ? (
 <div className="py-8 text-center border border-dashed bg-muted/10">
 <p className="text-sm text-muted-foreground">
 Nenhum pedido aguardando cotação de frete no momento.
 </p>
 </div>
 ) : (
 <div className="rounded-lg bg-surface-paper overflow-hidden">
 <Table>
 <TableHeader>
 <TableRow>
 <TableHead>Pedido</TableHead>
 <TableHead>Cliente</TableHead>
 <TableHead>Endereço de Entrega</TableHead>
 <TableHead>Subtotal</TableHead>
 <TableHead className="w-[180px]">Valor do Frete (R$)</TableHead>
 <TableHead className="w-[120px] text-right">Ação</TableHead>
 </TableRow>
 </TableHeader>
 <TableBody>
 {pendingOrders.map((order: any) => {
 const client = order.customer_snapshot || {};
 const addr = order.shipping_address || {};

 return (
 <TableRow key={order.id}>
 <TableCell className="font-medium">
 <div className="flex flex-col">
 <span>#{order.public_token}</span>
 <span className="text-xs text-muted-foreground flex items-center gap-1 mt-1 font-normal">
 <Calendar className="size-3" />
 {formatDate(order.created_at)}
 </span>
 </div>
 </TableCell>
 <TableCell>
 <div className="flex flex-col text-sm">
 <span className="font-medium flex items-center gap-1">
 <User className="size-3 text-muted-foreground" />
 {client.name || "Cliente"}
 </span>
 {client.phone && (
 <a
 href={`https://wa.me/55${client.phone.replace(/\D/g, "")}`}
 target="_blank"
 rel="noopener noreferrer"
 className="text-xs text-primary hover:underline flex items-center gap-1 mt-1"
 >
 <Phone className="size-3" />
 {client.phone}
 </a>
 )}
 </div>
 </TableCell>
 <TableCell className="max-w-72">
 <div className="flex flex-col text-xs font-normal text-muted-foreground">
 <span className="font-medium text-foreground">
 {addr.neighborhood || "-"}, {addr.city || "-"} - {addr.state || "-"}
 </span>
 <span>
 {addr.street || "-"}, {addr.number || "-"}
 {addr.complement && ` (${addr.complement})`}
 </span>
 <span>CEP: {addr.zipcode || "-"}</span>
 </div>
 </TableCell>
 <TableCell className="font-semibold text-sm">
 {formatMoney(order.subtotal_cents - order.discount_cents)}
 </TableCell>
 <TableCell>
 <Input
 type="text"
                            inputMode="decimal"
 placeholder="R$ 0,00"
 value={quoteValues[order.id] || ""}
 onChange={(e) =>
 setQuoteValues({
 ...quoteValues,
 [order.id]: e.target.value,
 })
 }
 disabled={savingOrderId === order.id}
 className="h-11 sm:h-9 text-xs"
 />
 </TableCell>
 <TableCell className="text-right">
 <Button
 size="sm"
 onClick={() => handleApplyQuote(order.id)}
 disabled={savingOrderId === order.id || !quoteValues[order.id]}
 className="h-11 px-4 sm:h-9 sm:px-3 text-xs"
 >
 {savingOrderId === order.id ? (
 <Loader2 className="animate-spin size-4" />
 ) : (
 <>
 <Check className="mr-1 size-3.5" />
 Liberar
 </>
 )}
 </Button>
 </TableCell>
 </TableRow>
 );
 })}
 </TableBody>
 </Table>
 </div>
 )}
 </div>

 {/* Simulador de Cotações */}
 <div className="bg-surface-paper rounded-lg p-6">
 <h3 className="font-semibold mb-4 text-lg">Simular Frete por CEP</h3>
 <form onSubmit={handleSimulate} className="flex gap-3 max-w-sm">
 <Input
              type="text"
              inputMode="numeric"
              placeholder="00000-000"
              value={zipcode}
              onChange={(e) => setZipcode(formatCep(e.target.value))}
 maxLength={9}
 className="h-11 text-xs"
 />
 <Button type="submit" disabled={loading} className="h-11 px-5 text-xs font-semibold">
 {loading ? "Calculando..." : "Simular"}
 </Button>
 </form>

 {results !== null && (
 <div className="mt-6">
 {results.length === 0 ? (
 <p className="text-sm text-muted-foreground font-normal">
 Nenhuma opção de frete encontrada para o CEP informado. Verifique as zonas
 configuradas.
 </p>
 ) : (
 <div className="space-y-2">
 <p className="text-sm font-medium text-muted-foreground mb-3 font-normal">
 {results.length} opção(ões) disponível(is) para {zipcode}:
 </p>
 {results.map((r: any) => (
 <div
 key={r.id}
 className="flex items-center justify-between border px-4 py-3 bg-muted/10"
 >
 <div className="flex items-center gap-3">
 <Package className="size-5 text-muted-foreground" />
 <div>
 <p className="font-medium text-sm">{r.name}</p>
 {r.estimated_days && (
 <p className="text-xs text-muted-foreground font-normal">
 Prazo estimado: {r.estimated_days} dias
 </p>
 )}
 </div>
 </div>
 <div className="text-right">
 {r.price_cents === 0 ? (
 <Badge variant="secondary">Grátis</Badge>
 ) : (
 <p className="font-semibold text-sm">{formatMoney(r.price_cents)}</p>
 )}
 {r.min_order_cents && (
 <p className="text-xs text-muted-foreground font-normal">
 Mín: {formatMoney(r.min_order_cents)}
 </p>
 )}
 </div>
 </div>
 ))}
 </div>
 )}
 </div>
 )}
 </div>

 {/* Zonas Ativas */}
 <div className="bg-surface-paper rounded-lg p-6">
 <h3 className="font-semibold mb-4 text-lg">Zonas Ativas ({zones.length})</h3>
 {zones.length === 0 ? (
 <EmptyState title="Nenhuma zona configurada" />
 ) : (
 <div className="flex flex-wrap gap-2">
 {zones.map((z: any) => (
 <div
 key={z.id}
 className="flex items-center gap-2 rounded-full border px-3 py-2 text-sm bg-muted/15"
 >
 <span className="font-medium">{z.name}</span>
 <span className="text-muted-foreground font-normal">
 ({(z.regions || []).join(",")})
 </span>
 <Badge
 variant={z.is_active ? "secondary" : "outline"}
 className="text-xs font-normal"
 >
 {z.rates?.length || 0} taxa(s)
 </Badge>
 </div>
 ))}
 </div>
 )}
 </div>
 </div>
 );
}
