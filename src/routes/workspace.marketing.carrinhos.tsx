import { createFileRoute, useRouter } from "@tanstack/react-router";
import { Mail, Phone, Clock, RefreshCw, Send } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";

import { PageHeader } from "@/components/commerce/page-header";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/state/states";

import { listAbandonedCarts, markRecoveryAttempt, scanAbandonedCarts } from "@/services/marketing.functions";
import { formatMoney } from "@/lib/money";
import { formatDateTime } from "@/lib/datetime";

export const Route = createFileRoute("/workspace/marketing/carrinhos")({
 head: () => ({ meta: [{ title: "Carrinhos sem atividade | Workspace Waesy" }] }),
 loader: async () => {
   try {
 return await listAbandonedCarts();
   } catch (err) {
     console.error("[loader:workspace.marketing.carrinhos] Unhandled loader error:", err);
     return null;
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
 if (res.scanned === 0) {
 toast.info("Nenhum carrinho ativo sem atualização há pelo menos 2 horas foi encontrado.");
 } else {
 toast.success(`Varredura concluída: ${res.newAbandons} novo(s) registro(s) pela heurística de inatividade.`);
 }
 router.invalidate();
 } catch (e: unknown) {
 toast.error(e instanceof Error ? e.message : "Erro ao vasculhar carrinhos.");
 } finally {
 setIsScanning(false);
 }
 };

 const handleMarkAttempt = async (id: string, phone?: string) => {
 try {
 const result = await markRecoveryAttempt({ data: { id } });
 if (!result.success) throw new Error("Não foi possível confirmar o registro da tentativa.");
 toast.success("Tentativa registrada");

 if (phone) {
 const cleanPhone = phone.replace(/\D/g, "");
 if (cleanPhone.length >= 10) {
 const recoveryMsg = encodeURIComponent(
 "Olá! Gostaríamos de saber se ainda tem interesse nos itens que você consultou. Se quiser, responda a esta mensagem para conversarmos."
 );
 window.open(
 `https://wa.me/55${cleanPhone}?text=${recoveryMsg}`,
 "_blank",
 "noopener,noreferrer",
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
 return <Badge variant="secondary">Possível abandono</Badge>;
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
 title="Carrinhos possivelmente abandonados"
 actions={
 <Button onClick={handleScan} disabled={isScanning} size="sm" variant="outline" className="rounded-lg font-semibold text-xs h-9">
 <RefreshCw className={`mr-2 size-3.5 ${isScanning ? "animate-spin" : ""}`} />
 Atualizar
 </Button>
 }
 />

 <div className="rounded-lg border border-border/60 bg-muted/30 p-4 text-sm text-muted-foreground" role="note">
 Classificação heurística: carrinho ativo sem atualização há pelo menos 2 horas. Isso não confirma a ausência de pedido; confira os pedidos da loja antes de entrar em contato.
 </div>

 {carts === null ? (
 <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-5" role="alert">
 <h2 className="font-semibold">Não foi possível carregar os carrinhos</h2>
 <p className="mt-1 text-sm text-muted-foreground">Tente novamente. A falha não significa que não existam registros.</p>
 <Button className="mt-3" size="sm" variant="outline" onClick={() => router.invalidate()}>Tentar novamente</Button>
 </div>
 ) : carts.length === 0 ? (
 <EmptyState title="Nenhum carrinho com atividade recente para classificar" />
 ) : (
 <div className="bg-card rounded-lg border border-border/60 overflow-hidden">
 <Table>
 <TableHeader>
 <TableRow>
 <TableHead>Detectado em</TableHead>
 <TableHead>Cliente</TableHead>
 <TableHead>Contato</TableHead>
 <TableHead className="text-right">Valor no snapshot</TableHead>
 <TableHead className="text-center">Tentativas</TableHead>
 <TableHead className="text-center">Status</TableHead>
 <TableHead className="text-right">Ação</TableHead>
 </TableRow>
 </TableHeader>
 <TableBody>
 {carts.map((c: any) => {
 // Calcular total a partir do snapshot
 const items = Array.isArray(c.snapshot?.items) ? c.snapshot.items : [];
 const totalCents = items.length > 0
 ? items.reduce(
 (acc: number, item: any) => acc + Number(item.price_cents ?? item.price_snapshot_cents ?? 0) * Number(item.quantity ?? item.qty ?? 0),
 0,
 )
 : null;

 return (
 <TableRow key={c.id}>
 <TableCell className="text-sm">
 <div className="flex items-center gap-2">
 <Clock className="size-4 text-muted-foreground" />
 {formatDateTime(c.createdAt)}
 </div>
 <div className="mt-1 text-xs text-muted-foreground">
 Última atividade: {c.lastActivityAt ? formatDateTime(c.lastActivityAt) : "não registrada"}
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
 {totalCents === null ? "Não disponível" : formatMoney(totalCents)}
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
 <Send className="mr-2 size-3.5 text-primary" />
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
