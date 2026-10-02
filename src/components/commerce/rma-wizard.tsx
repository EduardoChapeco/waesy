import { useState } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatMoney } from "@/lib/money";
import { requestCustomerRma } from "@/services/rma.functions";
import { getSignedUploadUrl } from "@/services/storage.functions";

type OrderItem = {
 id: string;
 product_title: string;
 variant_sku: string;
 qty: number;
 unit_price_cents: number;
};

export function RmaWizard({
 orderId,
 items,
 isOpen,
 onClose,
 onSuccess,
}: {
 orderId: string;
 items: OrderItem[];
 isOpen: boolean;
 onClose: () => void;
 onSuccess: () => void;
}) {
 const [step, setStep] = useState(1);
 const [type, setType] = useState<"exchange" | "return" | "warranty">("exchange");
 const [selectedItems, setSelectedItems] = useState<
 Record<string, { selected: boolean; qty: number; reason: string; photos: string[] }>
 >({});
 const [isSubmitting, setIsSubmitting] = useState(false);
 const [isUploading, setIsUploading] = useState<Record<string, boolean>>({});

 const toggleItem = (itemId: string, maxQty: number) => {
 setSelectedItems((prev) => {
 const current = prev[itemId] || { selected: false, qty: maxQty, reason: "", photos: [] };
 return {
 ...prev,
 [itemId]: { ...current, selected: !current.selected },
 };
 });
 };

 const updateItem = (itemId: string, field: "qty" | "reason", value: any) => {
 setSelectedItems((prev) => ({
 ...prev,
 [itemId]: { ...prev[itemId], [field]: value },
 }));
 };

 const handleUploadPhoto = async (itemId: string, file: File) => {
 try {
 setIsUploading((prev) => ({ ...prev, [itemId]: true }));
 const res = await getSignedUploadUrl({
 data: {
 fileName: file.name,
 bucket: "rma-proofs",
 contentType: file.type,
 },
 });
 if (res.status === "success") {
 const uploadRes = await fetch(res.signedUrl, {
 method: "PUT",
 body: file,
 headers: { "Content-Type": file.type },
 });
 if (!uploadRes.ok) throw new Error("Falha no upload");

 setSelectedItems((prev) => {
 const current = prev[itemId];
 return {
 ...prev,
 [itemId]: { ...current, photos: [...(current.photos || []), res.path] },
 };
 });
 }
 } catch (e) {
 toast.error("Erro ao enviar foto");
 } finally {
 setIsUploading((prev) => ({ ...prev, [itemId]: false }));
 }
 };

 const handleNext = () => {
 const selected = Object.values(selectedItems).filter((i) => i.selected);
 if (selected.length === 0) {
 toast.error("Selecione pelo menos um item.");
 return;
 }
 setStep(2);
 };

 const handleSubmit = async () => {
 const payloadItems = Object.entries(selectedItems)
 .filter(([_, data]) => data.selected)
 .map(([id, data]) => ({
 order_item_id: id,
 qty: data.qty,
 reason: data.reason || type,
 photos: data.photos || [],
 }));

 if (payloadItems.some((i) => !i.reason || i.reason.length < 5)) {
 toast.error("Por favor, preencha o motivo de forma detalhada para os itens selecionados.");
 return;
 }

 setIsSubmitting(true);
 try {
 await requestCustomerRma({
 data: {
 orderId,
 type,
 notes: `Solicitação via portal B2C (${type})`,
 items: payloadItems,
 },
 });
 toast.success("Solicitação enviada com sucesso!");
 onSuccess();
 onClose();
 } catch (e: unknown) {
 toast.error((e instanceof Error ? e.message : String(e)) || "Erro ao solicitar");
 } finally {
 setIsSubmitting(false);
 }
 };

 return (
 <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
 <DialogContent className="sm:max-w-xl">
 <DialogHeader>
 <DialogTitle>Solicitar Troca ou Devolução</DialogTitle>
 <DialogDescription>Passo {step} de 2</DialogDescription>
 </DialogHeader>

 {step === 1 && (
 <div className="space-y-6 py-4">
 <div className="space-y-2">
 <Label>O que você deseja fazer?</Label>
 <Select value={type} onValueChange={(v: any) => setType(v)}>
 <SelectTrigger>
 <SelectValue placeholder="Selecione o tipo..." />
 </SelectTrigger>
 <SelectContent>
 <SelectItem value="return">Devolver o pedido (Arrependimento)</SelectItem>
 <SelectItem value="exchange">Trocar o produto (Tamanho/Cor)</SelectItem>
 <SelectItem value="warranty">Acionar Garantia (Defeito)</SelectItem>
 </SelectContent>
 </Select>
 </div>

 <div className="space-y-3">
 <Label>Quais itens deseja incluir?</Label>
 <div className="space-y-2 border rounded-lg p-2 max-h-[300px] overflow-y-auto no-scrollbar">
 {items.map((item) => {
 const state = selectedItems[item.id] || {
 selected: false,
 qty: item.qty,
 reason: "",
 photos: [],
 };
 return (
 <div key={item.id} className="flex items-start space-x-3 p-3 bg-muted/30">
 <Checkbox
 checked={state.selected}
 onCheckedChange={() => toggleItem(item.id, item.qty)}
 />
 <div className="flex-1 space-y-1">
 <p className="text-sm font-medium">{item.product_title}</p>
 <p className="text-xs text-muted-foreground">
 {item.qty}x de {formatMoney(item.unit_price_cents)}
 </p>
 </div>
 </div>
 );
 })}
 </div>
 </div>

 <DialogFooter>
 <Button variant="outline" onClick={onClose}>
 Cancelar
 </Button>
 <Button onClick={handleNext}>Continuar</Button>
 </DialogFooter>
 </div>
 )}

 {step === 2 && (
 <div className="space-y-6 py-4">
 <div className="space-y-4 max-h-[400px] overflow-y-auto no-scrollbar pr-2">
 {Object.entries(selectedItems)
 .filter(([_, s]) => s.selected)
 .map(([id, state]) => {
 const item = items.find((i) => i.id === id)!;
 return (
 <div key={id} className="space-y-3 p-4 border bg-card">
 <div>
 <p className="font-semibold text-sm">{item.product_title}</p>
 <p className="text-xs text-muted-foreground">SKU: {item.variant_sku}</p>
 </div>

 <div className="grid grid-cols-3 gap-4">
 <div className="col-span-1 space-y-2">
 <Label className="text-xs">Qtd</Label>
 <Input
 type="number"
 min={1}
 max={item.qty}
 value={state.qty}
 onChange={(e) => updateItem(id, "qty", parseInt(e.target.value) || 1)}
 />
 </div>
 <div className="col-span-2 space-y-2">
 <Label className="text-xs">Motivo detalhado</Label>
 <Textarea
 className="h-10 text-sm resize-none"
 placeholder="Ex: Ficou pequeno, veio quebrado..."
 value={state.reason}
 onChange={(e) => updateItem(id, "reason", e.target.value)}
 />
 </div>
 </div>
 {type === "warranty" && (
 <div className="space-y-2 border-t pt-2 mt-2">
 <Label className="text-xs">Fotos da Avaria / Defeito</Label>
 <Input
 type="file"
 accept="image/*"
 onChange={(e) => {
 if (e.target.files && e.target.files[0]) {
 handleUploadPhoto(id, e.target.files[0]);
 }
 }}
 disabled={isUploading[id]}
 />
 {isUploading[id] && (
 <p className="text-xs text-muted-foreground">Fazendo upload...</p>
 )}
 {state.photos && state.photos.length > 0 && (
 <p className="text-xs text-success">
 {state.photos.length} foto(s) anexada(s).
 </p>
 )}
 </div>
 )}
 </div>
 );
 })}
 </div>

 <DialogFooter>
 <Button variant="outline" onClick={() => setStep(1)} disabled={isSubmitting}>
 Voltar
 </Button>
 <Button onClick={handleSubmit} disabled={isSubmitting}>
 {isSubmitting ? "Enviando..." : "Confirmar Solicitação"}
 </Button>
 </DialogFooter>
 </div>
 )}
 </DialogContent>
 </Dialog>
 );
}
