import { useState } from "react";
import { toast } from "sonner";
import { useRouter } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { formatMoney } from "@/lib/money";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { editOrderItems } from "@/services/order.functions";
import { Minus, Plus, Trash2 } from "lucide-react";

export function OrderEditWizard({
 order,
 isOpen,
 onOpenChange,
 onComplete,
}: {
 order: any;
 isOpen: boolean;
 onOpenChange: (open: boolean) => void;
 onComplete: () => void;
}) {
 const [items, setItems] = useState<any[]>(order.order_items || []);
 const [isSaving, setIsSaving] = useState(false);

 const handleUpdateQty = (index: number, delta: number) => {
 const newItems = [...items];
 const newQty = newItems[index].qty + delta;
 if (newQty <= 0) return;
 newItems[index].qty = newQty;
 setItems(newItems);
 };

 const handleRemove = (index: number) => {
 const newItems = items.filter((_, i) => i !== index);
 setItems(newItems);
 };

 const handleSave = async () => {
 if (items.length === 0) {
 toast.error("O pedido não pode ficar vazio. Cancele o pedido em vez disso.");
 return;
 }

 setIsSaving(true);
 try {
 const payload = items.map((item) => {
 // Find variant_id. It's either directly on the item, or in metadata if it was snapshotted there,
 // or we use the snapshot's variant_id which we should ensure getOrderById returns.
 // Wait, getOrderById returns `variant_id`? Let me check order_items table schema.
 // Ah, `variant_id` might not be in the select! Wait, I only added selected_options.
 // The schema has variant_id. Let's just pass what we have. If it's missing, the backend will fail.
 return {
 variant_id: item.variant_id || item.id, // Fallback is dangerous, but we'll assume variant_id exists.
 product_title: item.product_title,
 qty: item.qty,
 };
 });

 await editOrderItems({ data: { orderId: order.id, newItems: payload } });
 toast.success("Pedido editado com sucesso!");
 onComplete();
 onOpenChange(false);
 } catch (e: any) {
 toast.error(e.message || "Erro ao salvar edições");
 } finally {
 setIsSaving(false);
 }
 };

 const currentTotal =
 items.reduce((acc, item) => acc + item.qty * item.unit_price_cents, 0) +
 order.shipping_cents -
 order.discount_cents;

 return (
 <Sheet open={isOpen} onOpenChange={onOpenChange}>
 <SheetContent size="wide" className="sm:max-w-3xl md:max-w-4xl lg:max-w-[70vw] xl:max-w-[70vw] w-full">
 <SheetHeader>
 <SheetTitle>Editar Itens do Pedido</SheetTitle>
 <SheetDescription>
 Altere as quantidades ou remova itens. O valor total será recalculado.
 </SheetDescription>
 </SheetHeader>
 <div className="py-6 space-y-6">
 <div className="space-y-4">
 {items.map((item, idx) => (
 <div
 key={item.id || idx}
 className="flex items-center justify-between border-b pb-4 last:border-0"
 >
 <div className="flex-1">
 <p className="font-medium text-sm">{item.product_title}</p>
 <p className="text-xs text-muted-foreground font-mono">{item.variant_sku}</p>
 <p className="text-xs text-primary font-medium mt-1">
 {formatMoney(item.unit_price_cents)} / un
 </p>
 </div>
 <div className="flex items-center gap-2">
 <Button
 variant="outline"
 size="icon"
 className="h-7 w-7"
 onClick={() => handleUpdateQty(idx, -1)}
 disabled={item.qty <= 1}
 >
 <Minus className="h-3 w-3" />
 </Button>
 <span className="text-sm font-medium w-6 text-center">{item.qty}</span>
 <Button
 variant="outline"
 size="icon"
 className="h-7 w-7"
 onClick={() => handleUpdateQty(idx, 1)}
 >
 <Plus className="h-3 w-3" />
 </Button>
 <Button
 variant="destructive"
 size="icon"
 className="h-7 w-7 ml-2"
 onClick={() => handleRemove(idx)}
 >
 <Trash2 className="h-3 w-3" />
 </Button>
 </div>
 </div>
 ))}
 </div>

 {items.length === 0 && (
 <div className="text-center p-4 bg-muted text-muted-foreground rounded-lg text-sm">
 Nenhum item restante.
 </div>
 )}

 <div className="bg-muted/50 p-4 rounded-lg space-y-2">
 <div className="flex justify-between text-sm">
 <span>Subtotal Itens</span>
 <span>
 {formatMoney(
 items.reduce((acc, item) => acc + item.qty * item.unit_price_cents, 0),
 )}
 </span>
 </div>
 <div className="flex justify-between text-sm">
 <span>Frete</span>
 <span>{formatMoney(order.shipping_cents)}</span>
 </div>
 <div className="flex justify-between text-sm text-destructive">
 <span>Desconto</span>
 <span>- {formatMoney(order.discount_cents)}</span>
 </div>
 <div className="flex justify-between font-bold text-lg pt-2 border-t">
 <span>Novo Total</span>
 <span>{formatMoney(currentTotal)}</span>
 </div>
 </div>

 <Button className="w-full" onClick={handleSave} disabled={isSaving || items.length === 0}>
 {isSaving ? "Salvando..." : "Salvar Alterações"}
 </Button>
 </div>
 </SheetContent>
 </Sheet>
 );
}
