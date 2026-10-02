import React, { useState, useEffect } from "react";
import { Plus, X, Tag } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { updateProduct } from "@/services/admin-catalog.functions";
import { toast } from "sonner";
import { useRouter } from "@tanstack/react-router";

interface Option {
 name: string;
 values: string[];
}

interface VariantOptionsBuilderProps {
 product: any;
 onClose?: () => void;
}

export function VariantOptionsBuilder({ product, onClose }: VariantOptionsBuilderProps) {
 const router = useRouter();
 const [options, setOptions] = useState<Option[]>([]);
 const [isSubmitting, setIsSubmitting] = useState(false);

 useEffect(() => {
 if (product?.options && Array.isArray(product.options)) {
 setOptions(product.options);
 } else {
 setOptions([]);
 }
 }, [product]);

 const handleAddOption = () => {
 setOptions([...options, { name: "", values: [] }]);
 };

 const handleRemoveOption = (index: number) => {
 const newOptions = [...options];
 newOptions.splice(index, 1);
 setOptions(newOptions);
 };

 const handleOptionNameChange = (index: number, name: string) => {
 const newOptions = [...options];
 newOptions[index].name = name;
 setOptions(newOptions);
 };

 const handleAddValue = (index: number, value: string) => {
 if (!value.trim()) return;
 const newOptions = [...options];
 if (!newOptions[index].values.includes(value.trim())) {
 newOptions[index].values.push(value.trim());
 setOptions(newOptions);
 }
 };

 const handleRemoveValue = (optionIndex: number, valueIndex: number) => {
 const newOptions = [...options];
 newOptions[optionIndex].values.splice(valueIndex, 1);
 setOptions(newOptions);
 };

 const generateCombinations = () => {
 if (options.length === 0) return [];

 // Filter out empty options
 const validOptions = options.filter((o) => o.name.trim() && o.values.length > 0);
 if (validOptions.length === 0) return [];

 let combinations: Record<string, string>[] = [{}];

 for (const option of validOptions) {
 const nextCombinations: Record<string, string>[] = [];
 for (const current of combinations) {
 for (const value of option.values) {
 nextCombinations.push({ ...current, [option.name.trim()]: value });
 }
 }
 combinations = nextCombinations;
 }

 return combinations;
 };

 const handleSaveOptions = async () => {
 setIsSubmitting(true);
 try {
 const validOptions = options.filter((o) => o.name.trim() && o.values.length > 0);

 // Update the product with the new options
 await updateProduct({
 data: {
 id: product.id,
 options: validOptions,
 },
 });

 // Se há opções, podemos sugerir gerar as combinações, mas a geração
 // real será feita na lista de variantes ou via batchUpsert.
 // Para manter a simplicidade do "modo rápido", vamos gerar combinações vazias
 // para o que faltar e enviar via batchUpsertVariantMatrix.

 const combinations = generateCombinations();
 if (combinations.length > 0) {
 const flatMatrix = combinations.map((attrs) => {
 // Check if this combination already exists
 const existingVariant = product.product_variants?.find((v: any) => {
 const vAttrs = v.attributes || {};
 const keys = Object.keys(attrs);
 return (
 keys.every((k) => vAttrs[k] === attrs[k]) &&
 Object.keys(vAttrs).length === keys.length
 );
 });

 return {
 id: existingVariant?.id || undefined,
 attributes: attrs,
 stock: existingVariant ? existingVariant.stock_on_hand || 0 : 0,
 original_stock: existingVariant ? existingVariant.stock_on_hand || 0 : 0,
 price_override_cents: existingVariant?.price_override_cents || null,
 image_url: existingVariant?.image_url || null,
 sku: existingVariant?.sku || "",
 };
 });

 const { batchUpsertVariantMatrix } = await import("@/services/admin-catalog.functions");
 await batchUpsertVariantMatrix({
 data: {
 product_id: product.id,
 matrix: flatMatrix,
 },
 });
 }

 toast.success("Opções de produto salvas com sucesso!");
 router.invalidate();
 if (onClose) onClose();
 } catch (e: unknown) {
 toast.error((e instanceof Error ? e.message : String(e)) || "Erro ao salvar opções.");
 } finally {
 setIsSubmitting(false);
 }
 };

 const previewCombinationsCount = generateCombinations().length;

 return (
 <div className="space-y-6">
 <div className="space-y-4">
 <p className="text-sm text-muted-foreground">
 Adicione opções como Cor, Tamanho, Sabor ou Material para gerar variantes automaticamente.
 </p>

 {options.map((option, oIdx) => (
 <Card key={oIdx} className="overflow-hidden">
 <CardContent className="p-4 bg-muted/20 space-y-4">
 <div className="flex items-center gap-4">
 <div className="flex-1">
 <Label className="text-xs text-muted-foreground mb-1 block">Nome da Opção</Label>
 <Input
 placeholder="Ex: Cor, Tamanho..."
 value={option.name}
 onChange={(e) => handleOptionNameChange(oIdx, e.target.value)}
 className="max-w-[250px]"
 />
 </div>
 <Button
 variant="ghost"
 size="icon"
 onClick={() => handleRemoveOption(oIdx)}
 className="text-muted-foreground hover:text-destructive"
 >
 <TrashIcon className="size-4" />
 </Button>
 </div>

 <div>
 <Label className="text-xs text-muted-foreground mb-1 block">Valores da Opção</Label>
 <div className="flex flex-wrap gap-2 items-center border rounded-lg p-2 bg-background min-h-11">
 {option.values.map((val, vIdx) => (
 <Badge
 key={vIdx}
 variant="secondary"
 className="px-2 py-1 flex items-center gap-1"
 >
 {val}
 <X
 className="size-3 cursor-pointer hover:text-destructive"
 onClick={() => handleRemoveValue(oIdx, vIdx)}
 />
 </Badge>
 ))}
 <Input
 placeholder="Digite um valor e aperte Enter..."
 className="border-0 shadow-none focus-visible:ring-0 px-1 min-w-[150px] flex-1 h-7 text-sm"
 onKeyDown={(e) => {
 if (e.key === "Enter") {
 e.preventDefault();
 handleAddValue(oIdx, e.currentTarget.value);
 e.currentTarget.value = "";
 }
 }}
 />
 </div>
 </div>
 </CardContent>
 </Card>
 ))}

 <Button
 variant="outline"
 onClick={handleAddOption}
 className="w-full border-dashed"
 size="sm"
 >
 <Plus className="mr-2 size-4" /> Adicionar outra opção
 </Button>
 </div>

 <div className="flex items-center justify-between pt-4 border-t">
 <div className="text-sm">
 Serão geradas <strong>{previewCombinationsCount}</strong> variantes baseadas nestas
 opções.
 </div>
 <Button onClick={handleSaveOptions} disabled={isSubmitting} size="lg" className="font-bold">
 {isSubmitting ? "Salvando..." : "Salvar Opções e Gerar Variantes"}
 </Button>
 </div>
 </div>
 );
}

function TrashIcon(props: React.SVGProps<SVGSVGElement>) {
 return (
 <svg
 {...props}
 xmlns="http://www.w3.org/2000/svg"
 width="24"
 height="24"
 viewBox="0 0 24 24"
 fill="none"
 stroke="currentColor"
 strokeWidth="2"
 strokeLinecap="round"
 strokeLinejoin="round"
 >
 <path d="M3 6h18" />
 <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
 <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
 </svg>
 );
}
