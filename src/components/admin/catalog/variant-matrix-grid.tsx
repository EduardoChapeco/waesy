import React, { useMemo } from "react";
import { X, Copy, Plus, Trash2, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CurrencyField } from "@/components/ui/currency-field";
import { ImageUpload } from "@/components/ui/image-upload";
import { formatMoney } from "@/lib/money";
import { Settings } from "lucide-react";
import { AdvancedVariantEditor } from "./advanced-variant-editor";
import { toast } from "sonner";

export type RawVariant = {
 id?: string;
 sku?: string;
 ean?: string | null;
 attributes: Record<string, string>;
 stock: number;
 original_stock?: number;
 price_override_cents?: number | null;
 cost_cents?: number | null;
 weight_kg?: number | null;
 image_url?: string | null;
 status?: "active" | "archived" | "inactive";
 allow_backorder?: boolean;
 backorder_lead_time_days?: number;
 requires_payment_for_backorder?: boolean;
};

interface VariantMatrixGridProps {
 variants: RawVariant[];
 onChange: (variants: RawVariant[]) => void;
 basePriceCents: number;
}

export function VariantMatrixGrid({ variants, onChange, basePriceCents }: VariantMatrixGridProps) {
 const [advancedEditIndex, setAdvancedEditIndex] = React.useState<number | null>(null);

 // Coleta todas as chaves dinâmicas que existem no banco/state atual
 const attributeKeys = useMemo(() => {
 const keys = new Set<string>();
 variants.forEach((v) => Object.keys(v.attributes).forEach((k) => keys.add(k)));
 return Array.from(keys);
 }, [variants]);

 // A primeira chave vira a Mestra (ex: Cor). O resto vira Sub-variáveis.
 const rowKey = attributeKeys[0] || "Opção";
 const colKeys = attributeKeys.slice(1);

 // O SEGREDO DO CRUD UNIVERSAL: Se não houver sub-variável (colKeys vazio),
 // nós INJETAMOS visualmente uma coluna chamada "Especificação" que salvará no banco com esse nome.
 const displayColKeys = colKeys.length > 0 ? colKeys : ["Especificação"];

 if (variants.length === 0) {
 return (
 <div className="p-8 text-center text-muted-foreground border border-dashed">
 <EyeOff className="size-8 mx-auto mb-2 opacity-50" />
 Nenhuma variação definida. Adicione grupos abaixo.
 </div>
 );
 }

 // --- Funções Auxiliares de Atualização ---
 const handleAddDimension = () => {
 const dimName = window.prompt(
 "Nome da nova coluna/propriedade (Ex: Tamanho, Material, Voltagem):",
 );
 if (!dimName || dimName.trim() === "") return;
 const newDim = dimName.trim();
 if (attributeKeys.includes(newDim)) {
 toast.error("Essa propriedade já existe!");
 return;
 }
 const newVariants = variants.map((v) => ({
 ...v,
 attributes: { ...v.attributes, [newDim]: "" },
 }));
 onChange(newVariants);
 };

 const handleRenameDimension = (oldKey: string, newKey: string) => {
 if (!newKey || newKey === oldKey || attributeKeys.includes(newKey)) return;
 const newVariants = variants.map((v) => {
 const { [oldKey]: oldVal, ...rest } = v.attributes;
 return { ...v, attributes: { ...rest, [newKey]: oldVal } };
 });
 onChange(newVariants);
 };

 // --- Agrupamento dos dados ---
 const grouped = new Map<string, { variants: RawVariant[]; originalIndices: number[] }>();
 variants.forEach((v, idx) => {
 const pVal = attributeKeys.length > 0 ? (v.attributes[rowKey] ?? "Geral") : "Geral";
 if (!grouped.has(pVal)) grouped.set(pVal, { variants: [], originalIndices: [] });
 grouped.get(pVal)!.variants.push(v);
 grouped.get(pVal)!.originalIndices.push(idx);
 });

 const handleGroupImageUpdate = (groupVal: string, url: string | null) => {
 const newVariants = [...variants];
 const group = grouped.get(groupVal);
 if (group) {
 group.originalIndices.forEach((idx) => {
 newVariants[idx] = { ...newVariants[idx], image_url: url };
 });
 onChange(newVariants);
 }
 };

 const handleAddVariantToGroup = (groupVal: string) => {
 const group = grouped.get(groupVal);
 if (!group || group.variants.length === 0) return;
 const templateVariant = group.variants[0];
 const newAttributes = { ...templateVariant.attributes };

 // Limpa os valores das sub-variações para a nova linha
 displayColKeys.forEach((k) => {
 newAttributes[k] = "";
 });

 onChange([
 ...variants,
 {
 attributes: newAttributes,
 stock: 0,
 price_override_cents: null,
 image_url: templateVariant.image_url,
 sku: "",
 },
 ]);
 };

 const handleAddEmptyVariant = () => {
 const newAttributes: Record<string, string> = {};
 attributeKeys.forEach((k) => (newAttributes[k] = ""));
 // Se a tabela estiver completamente zerada (nunca acontece porque variants.length > 0 acima)
 if (attributeKeys.length === 0) {
 newAttributes["Opção"] = "Novo Grupo";
 newAttributes["Especificação"] = "";
 } else {
 newAttributes[rowKey] = "Novo Grupo";
 }
 onChange([
 ...variants,
 { attributes: newAttributes, stock: 0, price_override_cents: null, sku: "" },
 ]);
 };

 const handleDeleteVariant = (globalIdx: number) => {
 if (window.confirm("Deseja realmente remover esta linha?")) {
 const newVariants = [...variants];
 newVariants.splice(globalIdx, 1);
 onChange(newVariants);
 }
 };

 const handleCloneVariant = (globalIdx: number) => {
 const template = variants[globalIdx];
 const newVariants = [...variants];
 newVariants.splice(globalIdx + 1, 0, {
 ...template,
 id: undefined,
 sku: template.sku ? `${template.sku}-copy` : "",
 original_stock: 0, // Resetamos o original_stock da cópia
 });
 onChange(newVariants);
 };

 return (
 <>
 <div className="flex justify-between items-center mb-4 p-4 border bg-card border-dashed">
 <div className="text-sm">
 <p className="font-semibold text-foreground">Construtor Livre de Variações</p>
 <p className="text-muted-foreground text-xs">
 Adicione propriedades infinitas (Cor, Tamanho, Material). Clique nos cabeçalhos para
 renomear.
 </p>
 </div>
 <Button
 variant="outline"
 size="sm"
 onClick={handleAddDimension}
 className="border-dashed text-primary hover:text-primary font-bold "
 >
 <Plus className="size-4 mr-2" /> Adicionar Coluna de Propriedade
 </Button>
 </div>

 <div className="border overflow-x-auto no-scrollbar bg-card mb-4">
 <table className="w-full text-sm text-left">
 <thead className="bg-muted/40 text-muted-foreground text-xs uppercase font-semibold">
 <tr>
 <th className="px-4 py-3 min-w-48 group bg-muted/60">
 <div className="flex items-center gap-1">
 <Input
 value={rowKey}
 onChange={(e) => handleRenameDimension(rowKey, e.target.value)}
 className="h-7 text-xs bg-transparent border-transparent hover:border-input focus:border-input focus:bg-background transition-all font-bold uppercase px-1 -ml-1 cursor-text w-full"
 title="Renomear matriz mãe"
 />
 <span className="text-[9px] font-normal lowercase opacity-70 whitespace-nowrap">
 (Matriz Mãe)
 </span>
 </div>
 </th>
 <th className="px-4 py-3">
 <div className="flex flex-wrap items-center gap-2">
 {displayColKeys.map((k, colIndex) => (
 <Input
 key={`col-${colIndex}`}
 value={k}
 onChange={(e) => handleRenameDimension(k, e.target.value)}
 className="h-7 text-xs bg-transparent border-transparent hover:border-input focus:border-input focus:bg-background transition-all font-semibold uppercase px-1 -ml-1 cursor-text w-32"
 title="Renomear coluna"
 />
 ))}
 </div>
 </th>
 <th className="px-4 py-3 text-center">Estoque</th>
 <th className="px-4 py-3">SKU</th>
 <th className="px-4 py-3">Preço Exceção</th>
 <th className="px-4 py-3 text-right">Ações</th>
 </tr>
 </thead>
 {Array.from(grouped.entries()).map(([gName, gData], groupIndex) => {
 const sharedImage = gData.variants[0]?.image_url;
 return (
 <tbody
 key={`group-${groupIndex}`}
 className="divide-y divide-border/30 border-b-4 border-muted/50 last:border-b-0"
 >
 {gData.variants.map((variant, localIdx) => {
 const globalIdx = gData.originalIndices[localIdx];
 return (
 <tr
 key={variant.id || globalIdx}
 className="hover:bg-muted/10 transition-colors"
 >
 {/* Célula Agrupada (Matriz Mãe) */}
 {localIdx === 0 && (
 <td
 className="px-4 py-3 w-56 align-top border-r bg-muted/5 "
 rowSpan={gData.variants.length + 1}
 >
 <div className="flex flex-col gap-3">
 <Input
 className="h-9 font-bold text-sm w-full bg-card "
 value={gName}
 onChange={(e) => {
 const newName = e.target.value;
 const newVariants = [...variants];
 gData.originalIndices.forEach((idx) => {
 newVariants[idx] = {
 ...newVariants[idx],
 attributes: {
 ...newVariants[idx].attributes,
 [rowKey]: newName,
 },
 };
 });
 onChange(newVariants);
 }}
 />
 {sharedImage ? (
 <div className="relative group w-full aspect-square rounded-xl overflow-hidden border bg-card ">
 <img
 src={sharedImage}
 alt={gName}
 className="w-full h-full object-cover"
 />
 <button
 type="button"
 onClick={() => handleGroupImageUpdate(gName, null)}
 className="absolute inset-0 bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
 >
 <X className="size-5" />
 </button>
 </div>
 ) : (
 <div className="w-full aspect-square">
 <ImageUpload
 onChange={(url) => handleGroupImageUpdate(gName, url)}
 bucket="product-media"
 variant="minimal"
 className="h-full w-full p-0 min-h-[80px] rounded-xl border-dashed bg-card"
 />
 </div>
 )}
 </div>
 </td>
 )}

 {/* Colunas de Atributos (Sub-variações Livres) */}
 <td className="px-4 py-3 font-medium text-xs text-muted-foreground align-middle">
 <div className="flex flex-wrap gap-2">
 {displayColKeys.map((k, colIdx) => (
 <Input
 key={`cell-${colIdx}`}
 className="h-9 text-xs w-32 px-3 bg-card focus:ring-primary focus:border-primary transition-all"
 placeholder={`Ex: Rosa 36`}
 value={variant.attributes[k] || ""}
 onChange={(e) => {
 const newVariants = [...variants];
 newVariants[globalIdx] = {
 ...newVariants[globalIdx],
 attributes: {
 ...newVariants[globalIdx].attributes,
 [k]: e.target.value,
 },
 };
 onChange(newVariants);
 }}
 />
 ))}
 </div>
 </td>

 {/* Estoque */}
 <td className="px-4 py-2 w-32 align-middle">
 <StockInput
 value={variant.stock}
 onChange={(newStock) => {
 const newVariants = [...variants];
 newVariants[globalIdx] = { ...variant, stock: newStock };
 onChange(newVariants);
 }}
 />
 </td>

 {/* SKU */}
 <td className="px-4 py-2 w-48 align-middle">
 <Input
 type="text"
 value={variant.sku || ""}
 placeholder="Auto gerado"
 onChange={(e) => {
 const newVariants = [...variants];
 newVariants[globalIdx] = { ...variant, sku: e.target.value };
 onChange(newVariants);
 }}
 className="h-9 font-mono text-xs bg-muted/20 hover:bg-muted/40 focus:bg-background transition-colors "
 />
 </td>

 {/* Preço Exceção */}
 <td className="px-4 py-2 w-40 align-middle">
 <PriceInput
 valueCents={variant.price_override_cents ?? null}
 basePriceCents={basePriceCents}
 onChange={(newPrice) => {
 const newVariants = [...variants];
 newVariants[globalIdx] = { ...variant, price_override_cents: newPrice };
 onChange(newVariants);
 }}
 />
 </td>

 {/* Ações Livres (Lixeira e Copiar) */}
 <td className="px-4 py-2 w-28 align-middle text-right">
 <div className="flex items-center justify-end gap-1">
 <Button
 type="button"
 variant="ghost"
 size="icon"
 className="size-8 text-muted-foreground hover:text-foreground hover:bg-muted"
 title="Duplicar linha"
 onClick={() => handleCloneVariant(globalIdx)}
 >
 <Copy className="size-4" />
 </Button>
 <Button
 type="button"
 variant="ghost"
 size="icon"
 className="h-8 w-8 text-muted-foreground hover:text-foreground"
 onClick={() => setAdvancedEditIndex(globalIdx)}
 title="Edição Avançada (Código de Barras, Peso, Custos)"
 >
 <Settings className="size-4" />
 </Button>
 <Button
 type="button"
 variant="ghost"
 size="icon"
 className="h-8 w-8 text-destructive/70 hover:text-destructive hover:bg-destructive/10"
 onClick={() => handleDeleteVariant(globalIdx)}
 >
 <Trash2 className="size-4" />
 </Button>
 </div>
 </td>
 </tr>
 );
 })}
 {/* Rodapé do Grupo */}
 <tr>
 <td
 colSpan={5}
 className="px-4 py-3 bg-muted/10 border-t-0 rounded-bl-xl rounded-br-xl"
 >
 <Button
 variant="ghost"
 size="sm"
 className="text-xs text-muted-foreground hover:text-primary border border-dashed border-muted-foreground/30 bg-background/50 w-full justify-start"
 onClick={() => handleAddVariantToGroup(gName)}
 >
 <Plus className="size-3 mr-2" /> Adicionar linha em {gName}
 </Button>
 </td>
 </tr>
 </tbody>
 );
 })}
 </table>
 </div>

 <Button
 variant="outline"
 className="w-full border-dashed bg-card/50 hover:bg-card text-foreground font-semibold h-12 "
 onClick={handleAddEmptyVariant}
 >
 <Plus className="size-5 mr-2" /> Adicionar Nova Matriz Mãe (Ex: Nova Cor)
 </Button>

 {advancedEditIndex !== null && (
 <AdvancedVariantEditor
 variant={variants[advancedEditIndex]}
 basePriceCents={basePriceCents}
 isOpen={true}
 onClose={() => setAdvancedEditIndex(null)}
 onSave={(updatedVariant) => {
 const newVariants = [...variants];
 newVariants[advancedEditIndex] = updatedVariant;
 onChange(newVariants);
 }}
 />
 )}
 </>
 );
}

function PriceInput({
 valueCents,
 basePriceCents,
 onChange,
}: {
 valueCents: number | null;
 basePriceCents: number;
 onChange: (v: number | null) => void;
}) {
 return (
 <CurrencyField
 compact
 currencySymbol="R$"
 allowZero={true}
 value={valueCents}
 placeholder={`Base: ${formatMoney(basePriceCents)}`}
 onChange={(cents) => {
 onChange(cents === undefined ? null : cents);
 }}
 className={`h-9 font-mono text-xs transition-colors ${
 valueCents != null
 ? "bg-warning/10 text-warning font-bold border-warning/30"
 : "bg-muted/20 hover:bg-muted/40 focus:bg-background"
 }`}
 />
 );
}

function StockInput({ value, onChange }: { value: number; onChange: (v: number) => void }) {
 const [str, setStr] = React.useState(value === 0 ? "" : value.toString());

 React.useEffect(() => {
 const currentVal = str === "" ? 0 : parseInt(str) || 0;
 if (currentVal !== value) {
 setStr(value === 0 ? "" : value.toString());
 }
 // eslint-disable-next-line react-hooks/exhaustive-deps
 }, [value]);

 const handleBlur = () => {
 if (str && !isNaN(parseInt(str))) {
 const val = parseInt(str);
 setStr(val.toString());
 onChange(val);
 } else {
 setStr("");
 onChange(0);
 }
 };

 return (
 <Input
 type="number"
 min="0"
 value={str}
 placeholder="0"
 onChange={(e) => {
 setStr(e.target.value);
 if (e.target.value === "") {
 onChange(0);
 return;
 }
 const val = parseInt(e.target.value);
 if (!isNaN(val)) {
 onChange(val);
 }
 }}
 onBlur={handleBlur}
 className="h-9 font-mono text-center bg-muted/20 hover:bg-muted/40 focus:bg-background transition-colors "
 />
 );
}
