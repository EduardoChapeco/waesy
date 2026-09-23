import { createFileRoute, useRouter } from "@tanstack/react-router";
import { ShoppingCart, Mail, Phone, Clock, RefreshCw, Send, Ghost } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";

import { PageHeader } from "@/components/commerce/page-header";
import { Button } from "@/components/ui/button";
import {
 Table,
 TableBody,
 TableCell,
 TableHead,
 TableHeader,
 TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/state/states";

import {
 listAbandonedCarts,
 markRecoveryAttempt,
 scanAbandonedCarts,
} from "@/services/marketing.functions";
import { formatMoney } from "@/lib/money";
import { formatDateTime } from "@/lib/datetime";

export const Route = createFileRoute("/workspace/marketing/carrinhos")({
 head: () => ({ meta: [{ title: "Carrinhos Abandonados | Workspace Waesy" }] }),
 loader: async () => {
   try {
 return await listAbandonedCarts();
   } catch (err) {
     console.error("[loader:workspace.marketing.carrinhos] Unhandled loader error:", err);
     return null as any;
    }
 },
 component: AbandonedCartsPage,
});

function AbandonedCartsPage() {
 const carts = Route.useLoaderData();
 const router = useRouter();
 const [isScanning, setIsScanning] = useState(false);

 const handleScan = async () => {
 setIsScanning(true);
 try {
 const res = await scanAbandonedCarts();
 toast.success(
 `Varredura concluída! ${res.newAbandons} novos carrinhos abandonados encontrados.`,
 );
 router.invalidate();
 } catch (e: unknown) {
 toast.error(e instanceof Error ? e.message : "Erro ao vasculhar carrinhos.");
 } finally {
 setIsScanning(false);
 }
 };

 const handleMarkAttempt = async (id: string, phone?: string) => {
 try {
 await markRecoveryAttempt({ data: { id } });
 toast.success("Tentativa de recuperação registrada.");

 if (phone) {
 // Formatar para link do whatsapp
 const cleanPhone = phone.replace(/\D/g, "");
 if (cleanPhone.length >= 10) {
 window.open(
 `https://wa.me/55${cleanPhone}?text=Olá! Vimos que você deixou alguns itens no carrinho. Precisa de ajuda?`,
 "_blank",
 );
 }
 }

 router.invalidate();
 } catch (e: unknown) {
 toast.error(e instanceof Error ? e.message : "Erro ao registrar tentativa.");
 }
 };

 const getStatusBadge = (status: string) => {
 switch (status) {
 case "abandoned":
 return <Badge variant="secondary">Abandonado</Badge>;
 case "recovered":
 return <Badge variant="default">Recuperado</Badge>;
 default:
 return <Badge variant="outline">{status}</Badge>;
 }
 };

 return (
 <div className="w-full max-w-7xl mx-auto px-0 sm:px-0 space-y-6 pb-20 animate-in fade-in duration-200">
 <PageHeader
 eyebrow="Marketing"
 title="Carrinhos Abandonados"
 actions={
 <Button onClick={handleScan} disabled={isScanning} size="sm" variant="outline" className="rounded-xl font-semibold text-xs h-9">
 <RefreshCw className={`mr-2 size-3.5 ${isScanning ? "animate-spin" : ""}`} />
 Atualizar
 </Button>
 }
 />

 {carts.length === 0 ? (
 <EmptyState title="Nenhum carrinho abandonado" />
 ) : (
 <div className="bg-card rounded-2xl border border-border/60 overflow-hidden">
 <Table>
 <TableHeader>
 <TableRow>
 <TableHead>Data do Abandono</TableHead>
 <TableHead>Cliente</TableHead>
 <TableHead>Contato</TableHead>
 <TableHead className="text-right">Valor em Risco</TableHead>
 <TableHead className="text-center">Tentativas</TableHead>
 <TableHead className="text-center">Status</TableHead>
 <TableHead className="text-right">Ação</TableHead>
 </TableRow>
 </TableHeader>
 <TableBody>
 {carts.map((c: any) => {
 // Calcular total a partir do snapshot
 const totalCents =
 c.snapshot?.items?.reduce(
 (acc: number, item: any) => acc + item.price_cents * item.quantity,
 0,
 ) || 0;

 return (
 <TableRow key={c.id}>
 <TableCell className="text-sm">
 <div className="flex items-center gap-2">
 <Clock className="size-4 text-muted-foreground" />
 {formatDateTime(c.createdAt)}
 </div>
 </TableCell>
 <TableCell className="font-medium">{c.customerName}</TableCell>
 <TableCell>
 <div className="flex flex-col gap-1 text-xs text-muted-foreground">
 {c.customerEmail && (
 <span className="flex items-center gap-1">
 <Mail className="size-3" /> {c.customerEmail}
 </span>
 )}
 {c.customerPhone && (
 <span className="flex items-center gap-1">
 <Phone className="size-3" /> {c.customerPhone}
 </span>
 )}
 {!c.customerEmail && !c.customerPhone && "Sem contato salvo"}
 </div>
 </TableCell>
 <TableCell className="text-right font-medium text-destructive">
 {formatMoney(totalCents)}
 </TableCell>
 <TableCell className="text-center font-mono">{c.recoveryAttempts}x</TableCell>
 <TableCell className="text-center">{getStatusBadge(c.status)}</TableCell>
 <TableCell className="text-right">
 <Button
 size="sm"
 variant="ghost"
 onClick={() => handleMarkAttempt(c.id, c.customerPhone)}
 disabled={c.status === "recovered"}
 >
 <Send className="mr-2 size-4 text-brand-blue" />
 Recuperar
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
 );
}
