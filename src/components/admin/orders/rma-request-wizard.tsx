import * as React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { PackageMinus, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { requestOrderReturn } from "@/services/rma.functions";

interface RmaRequestWizardProps {
 order: any;
 isOpen: boolean;
 onOpenChange: (open: boolean) => void;
 onComplete: () => Promise<void>;
}

export function RmaRequestWizard({
 order,
 isOpen,
 onOpenChange,
 onComplete,
}: RmaRequestWizardProps) {
 const items = order?.order_items || [];

 // State: item_id -> { qty: number, reason: string }
 const [selectedItems, setSelectedItems] = React.useState<
 Record<string, { qty: number; reason: string }>
 >({});
 const [globalNotes, setGlobalNotes] = React.useState("");
 const [isSubmitting, setIsSubmitting] = React.useState(false);

 React.useEffect(() => {
 if (isOpen) {
 setSelectedItems({});
 setGlobalNotes("");
 setIsSubmitting(false);
 }
 }, [isOpen]);

 const toggleItem = (item: any) => {
 setSelectedItems((prev) => {
 const next = { ...prev };
 if (next[item.id]) {
 delete next[item.id];
 } else {
 next[item.id] = { qty: item.qty, reason: "" }; // default to full qty
 }
 return next;
 });
 };

 const updateItem = (itemId: string, field: "qty" | "reason", value: any) => {
 setSelectedItems((prev) => {
 if (!prev[itemId]) return prev;
 return {
 ...prev,
 [itemId]: { ...prev[itemId], [field]: value },
 };
 });
 };

 const selectedCount = Object.keys(selectedItems).length;

 const handleSubmit = async (e: React.FormEvent) => {
 e.preventDefault();
 if (selectedCount === 0) {
 toast.error("Selecione pelo menos um item para devolver.");
 return;
 }

 // Validate reasons
 for (const [id, data] of Object.entries(selectedItems)) {
 if (!data.reason.trim()) {
 toast.error("Preencha o motivo para todos os itens selecionados.");
 return;
 }
 if (data.qty <= 0) {
 toast.error("A quantidade devolvida deve ser maior que zero.");
 return;
 }
 }

 setIsSubmitting(true);
 try {
 const itemsPayload = Object.entries(selectedItems).map(([id, data]) => ({
 order_item_id: id,
 qty: data.qty,
 reason: data.reason,
 }));

 await requestOrderReturn({
 data: {
 orderId: order.id,
 items: itemsPayload,
 notes: globalNotes,
 },
 });

 toast.success("Solicitação de devolução criada com sucesso! Aguardando inspeção na doca.");
 await onComplete();
 onOpenChange(false);
 } catch (err: unknown) {
 toast.error(
 (err instanceof Error ? err.message : String(err)) || "Erro ao solicitar devolução.",
 );
 } finally {
 setIsSubmitting(false);
 }
 };

 return (
 <Dialog open={isOpen} onOpenChange={onOpenChange}>
 <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto no-scrollbar">
 <DialogHeader>
 <DialogTitle className="flex items-center gap-2 text-2xl">
 <PackageMinus className="h-6 w-6 text-destructive" />
 Solicitar Devolução Parcial/Total (RMA)
 </DialogTitle>
 <DialogDescription>
 Selecione quais itens o cliente deseja devolver. O estorno e o reestoque não serão
 automáticos; dependerão da inspeção física na doca.
 </DialogDescription>
 </DialogHeader>

 <form onSubmit={handleSubmit} className="py-4 space-y-6">
 <div className="space-y-4">
 <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">
 Itens Faturados
 </h3>
 {items.map((item: any) => {
 const isSelected = !!selectedItems[item.id];
 return (
 <div
 key={item.id}
 className={`p-4 border ${isSelected ? "border-destructive/50 bg-destructive/5" : "border-border"}`}
 >
 <div className="flex items-start gap-4">
 <div className="pt-1">
 <Checkbox checked={isSelected} onCheckedChange={() => toggleItem(item)} />
 </div>

 <div className="flex-1 min-w-0">
 <div className="flex justify-between items-start">
 <div>
 <h4 className="font-bold">{item.product_title}</h4>
 <p className="text-xs text-muted-foreground">
 SKU: {item.variant_sku} • Qtd Faturada: {item.qty}
 </p>
 </div>
 </div>

 {isSelected && (
 <div className="mt-4 grid grid-cols-1 md:grid-cols-4 gap-4 animate-in slide-in-">
 <div className="md:col-span-1 space-y-1">
 <label className="text-xs font-medium">Qtd. a Devolver</label>
 <Input
 type="number"
 min={1}
 max={item.qty}
 value={selectedItems[item.id].qty}
 onChange={(e) =>
 updateItem(item.id, "qty", parseInt(e.target.value) || 1)
 }
 />
 </div>
 <div className="md:col-span-3 space-y-1">
 <label className="text-xs font-medium">
 Motivo (Defeito, Arrependimento...)
 </label>
 <Input
 type="text"
 required
 value={selectedItems[item.id].reason}
 onChange={(e) => updateItem(item.id, "reason", e.target.value)}
 placeholder="Ex: Veio com a costura rasgada"
 />
 </div>
 </div>
 )}
 </div>
 </div>
 </div>
 );
 })}
 </div>

 <div className="space-y-2">
 <label className="text-sm font-medium">Observações Internas</label>
 <Textarea
 placeholder="Instruções para a doca ou SAC..."
 value={globalNotes}
 onChange={(e) => setGlobalNotes(e.target.value)}
 />
 </div>

 <div className="flex items-start gap-3 p-3 bg-warning/10 text-warning dark:text-warning border border-warning/20 text-sm">
 <AlertCircle className="size-4 shrink-0 mt-0.5" />
 <p>
 O status do pedido mudará para <strong>return_requested</strong>. O faturamento não
 será abatido até que a doca realize a inspeção dos itens (`inspect_rma_item`).
 </p>
 </div>

 <DialogFooter className="border-t pt-4">
 <Button
 type="button"
 variant="ghost"
 onClick={() => onOpenChange(false)}
 disabled={isSubmitting}
 >
 Cancelar
 </Button>
 <Button
 type="submit"
 variant="destructive"
 disabled={isSubmitting || selectedCount === 0}
 >
 {isSubmitting ? "Processando..." : `Gerar Solicitação RMA (${selectedCount} itens)`}
 </Button>
 </DialogFooter>
 </form>
 </DialogContent>
 </Dialog>
 );
}
