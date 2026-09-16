import { useState } from "react";
import { useRouter } from "@tanstack/react-router";
import { toast } from "sonner";
import { Loader2, ClipboardCheck } from "lucide-react";

import { SheetPage } from "@/components/ui/sheet-page";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
 Select,
 SelectContent,
 SelectItem,
 SelectTrigger,
 SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

// Importa a função de auditoria.
import { performStockAudit } from "@/services/stock.functions";

export function StockAuditDialog({
  variant,
  className,
  children,
}: {
  variant: any;
  className?: string;
  children?: React.ReactNode;
}) {
 const router = useRouter();
 const [open, setOpen] = useState(false);
 const [isSubmitting, setIsSubmitting] = useState(false);

 const [countedQty, setCountedQty] = useState(variant.stock_on_hand.toString());
 const [reason, setReason] = useState<"recount" | "loss" | "damage" | "return_defect">("recount");
 const [notes, setNotes] = useState("");

 const handleAudit = async () => {
 const qty = parseInt(countedQty, 10);
 if (isNaN(qty) || qty < 0) {
 toast.error("A quantidade contada deve ser um número válido (zero ou maior).");
 return;
 }

 if (qty === variant.stock_on_hand) {
 toast.info("A contagem é igual ao sistema. Nenhum ajuste necessário.");
 setOpen(false);
 return;
 }

 setIsSubmitting(true);
 try {
 const res = await performStockAudit({
 data: {
 variantId: variant.id,
 countedQty: qty,
 reason,
 notes,
 },
 });

 if (res) {
 toast.success(res.message);
 setOpen(false);
 router.invalidate();
 } else {
 toast.error((res as any)?.message || "Erro ao realizar auditoria.");
 }
 } catch {
 toast.error("Falha inesperada ao conectar com o banco de dados.");
 } finally {
 setIsSubmitting(false);
 }
 };

 return (
 <>
 <Button
 variant="outline"
 size="sm"
 onClick={() => {
 setCountedQty(variant.stock_on_hand.toString());
 setOpen(true);
 }}
 className={className || "text-xs h-8 rounded-xl font-medium"}
 >
 {children || (
 <>
 <ClipboardCheck className="mr-1.5 size-3.5" /> Balanço
 </>
 )}
 </Button>

 <SheetPage
 open={open}
 onOpenChange={setOpen}
 title={`Auditoria de Balanço (SKU: ${variant.sku})`}
 description="Corrija o estoque físico. A diferença será registrada de forma imutável no log de auditoria."
 size="default"
 footer={
 <div className="flex items-center justify-between w-full">
 <Button
 variant="outline"
 onClick={() => setOpen(false)}
 className="rounded-xl text-xs font-semibold"
 >
 Cancelar
 </Button>
 <Button
 onClick={handleAudit}
 disabled={isSubmitting || parseInt(countedQty, 10) === variant.stock_on_hand}
 className="rounded-xl text-xs font-bold bg-primary text-primary-foreground"
 >
 {isSubmitting ? (
 <>
 <Loader2 className="mr-1.5 size-3.5 animate-spin" />
 Gravando...
 </>
 ) : (
 "Registrar Balanço"
 )}
 </Button>
 </div>
 }
 >
 <div className="space-y-4 py-2">
 <div className="flex gap-4">
 <div className="flex-1 space-y-1.5">
 <Label className="text-xs font-bold">Sistema Acusa</Label>
 <Input disabled value={variant.stock_on_hand} className="bg-muted h-10 rounded-xl text-xs font-mono" />
 </div>
 <div className="flex-1 space-y-1.5">
 <Label className="text-xs font-bold">Contado na Prateleira *</Label>
 <Input
 type="number"
 min="0"
 value={countedQty}
 onChange={(e) => setCountedQty(e.target.value)}
 className="font-bold text-foreground h-10 rounded-xl text-xs font-mono"
 />
 </div>
 </div>

 <div className="space-y-1.5">
 <Label className="text-xs font-bold">Motivo do Ajuste</Label>
 <Select value={reason} onValueChange={(val: any) => setReason(val)}>
 <SelectTrigger className="h-10 rounded-xl text-xs">
 <SelectValue placeholder="Selecione..." />
 </SelectTrigger>
 <SelectContent className="rounded-xl">
 <SelectItem value="recount">Recontagem Simples (Ajuste)</SelectItem>
 <SelectItem value="loss">Perda de Estoque / Sumiço</SelectItem>
 <SelectItem value="damage">Quebra / Avaria Logística</SelectItem>
 <SelectItem value="return_defect">Devolução com Defeito</SelectItem>
 </SelectContent>
 </Select>
 </div>

 <div className="space-y-1.5">
 <Label className="text-xs font-bold">Observações (Opcional)</Label>
 <Textarea
 placeholder="Ex: Tênis esquerdo sumiu, ajustado no inventário..."
 value={notes}
 onChange={(e) => setNotes(e.target.value)}
 className="rounded-xl text-xs resize-none"
 rows={3}
 />
 </div>
 </div>
 </SheetPage>
 </>
 );
}
