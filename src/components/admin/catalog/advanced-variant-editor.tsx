import React from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CurrencyField } from "@/components/ui/currency-field";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import type { RawVariant } from "@/types/catalog";
import { formatMoney } from "@/lib/money";

interface AdvancedVariantEditorProps {
 variant: RawVariant;
 basePriceCents: number;
 isOpen: boolean;
 onClose: () => void;
 onSave: (updatedVariant: RawVariant) => void;
}

export function AdvancedVariantEditor({
 variant,
 basePriceCents,
 isOpen,
 onClose,
 onSave,
}: AdvancedVariantEditorProps) {
 const [formData, setFormData] = React.useState<RawVariant>(variant);

 React.useEffect(() => {
 setFormData(variant);
 }, [variant]);

 const handleChange = (field: keyof RawVariant, value: any) => {
 setFormData((prev) => ({ ...prev, [field]: value }));
 };

 const handleSave = () => {
 onSave(formData);
 onClose();
 };

 return (
 <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
 <SheetContent size="wide" className="sm:max-w-3xl md:max-w-4xl lg:max-w-[70vw] xl:max-w-[70vw] w-full sm:w-3/4 overflow-y-auto no-scrollbar">
 <SheetHeader>
 <SheetTitle>Edição Avançada da Variação</SheetTitle>
 <SheetDescription>
 Ajuste dimensões, código de barras e regras de precificação volumétrica da variação.
 </SheetDescription>
 </SheetHeader>

 <div className="grid grid-cols-2 gap-4 py-4">
 <div className="space-y-2">
 <Label>SKU</Label>
 <Input
 value={formData.sku || ""}
 onChange={(e) => handleChange("sku", e.target.value)}
 placeholder="Gerado automaticamente se vazio"
 />
 </div>

 <div className="space-y-2">
 <Label>Código de Barras (EAN / GTIN)</Label>
 <Input
 value={formData.ean || ""}
 onChange={(e) => handleChange("ean", e.target.value)}
 placeholder="Ex: 7891020304050"
 />
 </div>

 <div className="space-y-2">
 <Label>Preço de Venda Específico</Label>
 <CurrencyField
 value={formData.price_override_cents}
 onChange={(cents) => handleChange("price_override_cents", cents ?? null)}
 placeholder={`Base: ${formatMoney(basePriceCents)}`}
 allowZero={true}
 className="h-10 rounded-lg"
 />
 <p className="text-xs text-muted-foreground">
 Deixe em branco para herdar o preço do produto mãe.
 </p>
 </div>

 <div className="space-y-2">
 <Label>Preço de Atacado / B2B</Label>
 <CurrencyField
 value={formData.wholesale_price_cents}
 onChange={(cents) => handleChange("wholesale_price_cents", cents ?? null)}
 placeholder="0,00"
 allowZero={true}
 className="h-10 rounded-lg"
 />
 <p className="text-xs text-muted-foreground">
 Preço especial para pedidos corporativos e atacado.
 </p>
 </div>

 <div className="space-y-2">
 <Label>Preço de Custo (Margem)</Label>
 <CurrencyField
 value={formData.cost_cents}
 onChange={(cents) => handleChange("cost_cents", cents ?? null)}
 placeholder="0,00"
 allowZero={true}
 className="h-10 rounded-lg"
 />
 </div>

 <div className="space-y-2">
 <Label>Peso Logístico (Kg)</Label>
 <Input
 type="number"
 step="0.001"
 value={formData.weight_kg || ""}
 onChange={(e) => {
 const val = parseFloat(e.target.value);
 handleChange("weight_kg", isNaN(val) ? null : val);
 }}
 placeholder="Ex: 0.350 (350 gramas)"
 />
 </div>

 <div className="space-y-2">
 <Label>Status da Variação</Label>
 <select
 className="flex h-9 w-full items-center justify-between whitespace-nowrap rounded-lg border border-input bg-transparent px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
 value={formData.status || "active"}
 onChange={(e) => handleChange("status", e.target.value)}
 >
 <option value="active">Ativo (Visível)</option>
 <option value="inactive">Inativo (Oculto)</option>
 </select>
 </div>
 <div className="col-span-2 border-t pt-4 mt-2">
 <h4 className="text-sm font-medium mb-3">Venda Sob Encomenda (Backorders)</h4>
 <div className="space-y-4 bg-muted/30 p-4 rounded-lg">
 <div className="flex items-center space-x-2">
 <Checkbox
 id="allow_backorder"
 checked={formData.allow_backorder || false}
 onCheckedChange={(checked) => handleChange("allow_backorder", checked === true)}
 />
 <Label htmlFor="allow_backorder" className="cursor-pointer">
 Permitir venda sem estoque (Sob Encomenda)
 </Label>
 </div>

 {formData.allow_backorder && (
 <div className="grid grid-cols-2 gap-4 animate-in fade-in zoom-in-95 duration-200">
 <div className="space-y-2">
 <Label>Dias Adicionais de Preparo (Lead Time)</Label>
 <Input
 type="number"
 value={formData.backorder_lead_time_days || 0}
 onChange={(e) =>
 handleChange("backorder_lead_time_days", parseInt(e.target.value) || 0)
 }
 placeholder="Ex: 15"
 />
 <p className="text-[10px] text-muted-foreground">
 Adicionado ao prazo de frete.
 </p>
 </div>
 <div className="space-y-2">
 <Label>Reserva sem pagamento?</Label>
 <select
 className="flex h-9 w-full items-center justify-between rounded-lg border border-input bg-transparent px-3 py-1 text-sm "
 value={formData.requires_payment_for_backorder === false ? "false" : "true"}
 onChange={(e) =>
 handleChange("requires_payment_for_backorder", e.target.value === "true")
 }
 >
 <option value="true">Exigir Pagamento Normal</option>
 <option value="false">Permitir Reserva sem Sinal</option>
 </select>
 </div>
 </div>
 )}
 </div>
 </div>
 </div>

 <SheetFooter>
 <Button variant="outline" onClick={onClose}>
 Cancelar
 </Button>
 <Button onClick={handleSave}>Salvar Variação</Button>
 </SheetFooter>
 </SheetContent>
 </Sheet>
 );
}
