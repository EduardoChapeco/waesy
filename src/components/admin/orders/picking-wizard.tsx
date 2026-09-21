import * as React from "react";
import {
 Dialog,
 DialogContent,
 DialogHeader,
 DialogTitle,
 DialogDescription,
 DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Box, CheckCircle2, AlertCircle, PackageCheck, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import {
 startPickingSession,
 getPickingSessionItems,
 pickWmsItem,
 completePickingSession,
} from "@/services/wms.functions";

interface PickingWizardProps {
 order: any; // Raw order from DB in admin
 isOpen: boolean;
 onOpenChange: (open: boolean) => void;
 onComplete: () => Promise<void>; // we still call this to refresh the route after finishing
}

export function PickingWizard({ order, isOpen, onOpenChange, onComplete }: PickingWizardProps) {
 const items = order.order_items || [];

 const [sessionId, setSessionId] = React.useState<string | null>(null);
 // Map of order_item_id -> qty_picked
 const [pickedState, setPickedState] = React.useState<Record<string, number>>({});

 const [isLoadingSession, setIsLoadingSession] = React.useState(false);
 const [isSubmitting, setIsSubmitting] = React.useState(false);
 const [processingItems, setProcessingItems] = React.useState<Set<string>>(new Set());

 // Initialize Session
 React.useEffect(() => {
 async function initSession() {
 if (!isOpen || !order?.id) return;
 setIsLoadingSession(true);
 try {
 const res = await startPickingSession({ data: { orderId: order.id } });
 const sid = res.sessionId;
 setSessionId(sid);

 // Fetch current picked state
 const itemsRes = await getPickingSessionItems({ data: { sessionId: sid } });
 const newPicked: Record<string, number> = {};
 for (const it of itemsRes) {
 newPicked[it.order_item_id] = it.qty_picked;
 }
 setPickedState(newPicked);
 } catch (err: unknown) {
 toast.error(
 (err instanceof Error
 ? err instanceof Error
 ? err.message
 : String(err)
 : String(err)) || "Erro ao iniciar sessão no WMS.",
 );
 onOpenChange(false);
 } finally {
 setIsLoadingSession(false);
 }
 }

 if (isOpen) {
 initSession();
 } else {
 setSessionId(null);
 setPickedState({});
 setProcessingItems(new Set());
 }
 }, [isOpen, order?.id]);

 // Check if everything is completely picked
 const totalExpected = items.reduce((acc: number, it: any) => acc + it.qty, 0);
 const totalPicked = Object.values(pickedState).reduce((acc: number, val: number) => acc + val, 0);
 const allItemsChecked = totalExpected > 0 && totalPicked === totalExpected;

 const handlePickItem = async (item: any) => {
 if (!sessionId) return;
 const currentPicked = pickedState[item.id] || 0;
 if (currentPicked >= item.qty) return; // Already fully picked

 // We assume 1 qty per click for simplicity in this MVP flow,
 // but since the original just had checkboxes, we pick the full item qty in one click.
 const qtyToPick = item.qty - currentPicked;

 setProcessingItems((prev) => {
 const next = new Set(prev);
 next.add(item.id);
 return next;
 });

 try {
 await pickWmsItem({ data: { sessionId, orderItemId: item.id, qty: qtyToPick } });
 setPickedState((prev) => ({
 ...prev,
 [item.id]: (prev[item.id] || 0) + qtyToPick,
 }));
 toast.success(`${item.product_title} conferido!`);
 } catch (err: unknown) {
 toast.error(
 (err instanceof Error ? (err instanceof Error ? err.message : String(err)) : String(err)) ||
 "Erro ao registrar conferência no WMS.",
 );
 } finally {
 setProcessingItems((prev) => {
 const next = new Set(prev);
 next.delete(item.id);
 return next;
 });
 }
 };

 const handleComplete = async () => {
 if (!allItemsChecked || !sessionId) return;

 setIsSubmitting(true);
 try {
 await completePickingSession({ data: { sessionId } });
 await onComplete(); // Refresh UI / invalidate router
 toast.success("Separação e baixa de estoque concluídas de forma transacional!");
 onOpenChange(false);
 } catch (e: unknown) {
 toast.error(
 (e instanceof Error ? e.message : String(e)) ||
 "Erro ao finalizar separação. O servidor rejeitou a integridade da remessa.",
 );
 } finally {
 setIsSubmitting(false);
 }
 };

 return (
 <Dialog open={isOpen} onOpenChange={onOpenChange}>
 <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto no-scrollbar">
 <DialogHeader>
 <DialogTitle className="flex items-center gap-2 text-2xl">
 <PackageCheck className="h-6 w-6 text-primary" />
 Checklist WMS Rigoroso
 </DialogTitle>
 <DialogDescription>
 Conferência atômica no servidor. Pedido #{order?.id?.slice(0, 8)}
 </DialogDescription>
 </DialogHeader>

 {isLoadingSession ? (
 <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
 <Loader2 className="h-8 w-8 animate-spin mb-4" />
 <p>Estabelecendo sessão segura com o WMS...</p>
 </div>
 ) : (
 <div className="py-6 space-y-4">
 <div className="bg-muted/30 p-4 border border-dashed flex items-center justify-between mb-4">
 <div>
 <p className="text-sm text-muted-foreground font-medium uppercase tracking-wider mb-1">
 Progresso Físico
 </p>
 <p className="text-3xl font-black tabular-nums">
 {totalPicked}{" "}
 <span className="text-muted-foreground text-lg">/ {totalExpected}</span>
 </p>
 </div>
 {allItemsChecked ? (
 <Badge variant="success" className="text-sm py-1.5 px-3">
 <CheckCircle2 className="h-4 w-4 mr-1.5" />
 Pronto para Despacho
 </Badge>
 ) : (
 <Badge variant="outline" className="text-sm py-1.5 px-3 bg-background">
 <Box className="h-4 w-4 mr-1.5" />
 Faltam {totalExpected - totalPicked} itens
 </Badge>
 )}
 </div>

 <div className="space-y-3">
 {items.map((item: any) => {
 const isChecked = (pickedState[item.id] || 0) >= item.qty;
 const isProcessing = processingItems.has(item.id);

 return (
 <div
 key={item.id}
 className={`flex gap-4 p-4 border transition-all duration-200 cursor-pointer ${isChecked ? "border-success/40 bg-success/5" : "border-border/50 hover:border-primary/40 hover:bg-muted/20"} ${isProcessing ? "opacity-50 pointer-events-none" : ""}`}
 onClick={() => {
 if (!isChecked) handlePickItem(item);
 }}
 >
 <div className="pt-1">
 {isProcessing ? (
 <Loader2 className="h-5 w-5 animate-spin text-primary" />
 ) : (
 <Checkbox
 checked={isChecked}
 className={
 isChecked
 ? "data-[state=checked]:bg-success data-[state=checked]:border-success"
 : "scale-125"
 }
 />
 )}
 </div>

 {item.image_url ? (
 <div className="h-16 w-16 shrink-0 rounded-xl overflow-hidden border bg-background">
 <img
 src={item.image_url}
 alt={item.product_title}
 className="h-full w-full object-cover"
 />
 </div>
 ) : (
 <div className="h-16 w-16 shrink-0 rounded-xl overflow-hidden border bg-muted flex items-center justify-center">
 <Box className="h-6 w-6 text-muted-foreground/50" />
 </div>
 )}

 <div className="flex-1 min-w-0 flex flex-col justify-center">
 <h4
 className={`font-bold leading-tight ${isChecked ? "text-foreground" : ""}`}
 >
 {item.product_title}
 </h4>
 {item.notes && (
 <p className="text-xs text-amber-600 dark:text-amber-400 font-semibold italic mt-0.5">
 Obs: {item.notes}
 </p>
 )}
 <p className="text-xs text-muted-foreground mt-1 truncate">
 SKU: <span className="font-mono">{item.variant_sku}</span>
 </p>
 </div>

 <div className="flex flex-col items-end justify-center shrink-0">
 <div className="flex items-baseline gap-1">
 <span className="text-sm font-bold text-muted-foreground">Qtd:</span>
 <span className="text-xl font-black">{item.qty}</span>
 </div>
 {isChecked && (
 <span className="text-xs font-bold text-success dark:text-success mt-1 flex items-center">
 <CheckCircle2 className="h-3 w-3 mr-1" />
 Conferido
 </span>
 )}
 </div>
 </div>
 );
 })}
 </div>

 {!allItemsChecked && (
 <div className="flex items-start gap-3 p-3 bg-muted/40 text-foreground rounded-xl text-sm mt-4">
 <AlertCircle className="h-5 w-5 shrink-0 mt-0.5 text-muted-foreground" />
 <p>
 A transação de expedição está protegida via RLS/RPC. O servidor exige integridade
 total antes de permitir o despacho.
 </p>
 </div>
 )}
 </div>
 )}

 <DialogFooter className="sm:justify-between border-t pt-4">
 <Button
 variant="ghost"
 onClick={() => onOpenChange(false)}
 disabled={isSubmitting || isLoadingSession}
 >
 Fechar
 </Button>
 <Button
 onClick={handleComplete}
 disabled={!allItemsChecked || isSubmitting || isLoadingSession}
 className="font-bold px-8"
 >
 {isSubmitting ? "Autenticando..." : "Despachar e Confirmar"}
 </Button>
 </DialogFooter>
 </DialogContent>
 </Dialog>
 );
}
