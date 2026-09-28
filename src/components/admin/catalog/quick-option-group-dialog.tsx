import { useState, useEffect, useRef, useMemo } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { SlidersHorizontal, Plus, Trash2, Sliders, Check, AlertCircle, Layers, Utensils, Coffee, PlusCircle, Image as ImageIcon, ImagePlus, X, Scissors, Gift, ShieldCheck, Loader2 } from 'lucide-react';

import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { CurrencyField } from "@/components/ui/currency-field";
import { Badge } from "@/components/ui/badge";
import { upsertOptionGroup } from "@/services/admin-catalog.functions";
import { uploadStoreMedia } from "@/services/storage.functions";
import { ImageCropperDialog } from "@/components/ui/image-cropper-dialog";
import { cn } from "@/lib/utils";

const optionValueSchema = z.object({
 id: z.string().uuid().optional(),
 label: z.string().min(1, "Obrigatório"),
 description: z.string().optional().nullable(),
 image_url: z.string().optional().nullable(),
 price_modifier_cents: z.number().int().default(0),
 max_quantity_per_item: z.number().int().min(1).default(1).optional(),
 is_default: z.boolean().default(false),
 is_active: z.boolean().default(true),
});

const formSchema = z.object({
 id: z.string().uuid().optional(),
 internal_name: z.string().min(1, "Nome interno é obrigatório"),
 display_name: z.string().min(1, "Nome de exibição é obrigatório"),
 description: z.string().optional().nullable(),
 selection_type: z.enum(["single", "multiple"]),
 min_selections: z.number().int().min(0),
 max_selections: z.number().int().min(1),
 is_required: z.boolean(),
 values: z.array(optionValueSchema).min(1, "Adicione pelo menos 1 opção"),
});

export type OptionGroupFormData = z.infer<typeof formSchema>;

import { getNicheSemantics } from "@/lib/niche-semantics";
import { getNicheOptionGroupPresets, type OptionGroupPreset } from "@/lib/niche-presets";

export interface QuickOptionGroupDialogProps {
 open: boolean;
 onOpenChange: (open: boolean) => void;
 groupToEdit?: any | null;
 onSaved: (savedGroup: any) => void;
 store?: any;
}

export function QuickOptionGroupDialog({
 open,
 onOpenChange,
 groupToEdit,
 onSaved,
 store,
}: QuickOptionGroupDialogProps) {
 const semantics = useMemo(() => getNicheSemantics(store), [store]);
 const isTourism = semantics.nicheId === "tourism";
 const isServices = semantics.nicheId === "services";
 const isRetail = semantics.nicheId === "retail" || semantics.nicheId === "supermarket" || semantics.nicheId === "wholesale";

 const activePresets = useMemo(() => getNicheOptionGroupPresets(semantics.nicheId), [semantics.nicheId]);

 const [isSubmitting, setIsSubmitting] = useState(false);
 const [cropDialogOpen, setCropDialogOpen] = useState(false);
 const [currentImageToCrop, setCurrentImageToCrop] = useState<string | null>(null);
 const [activeValueIndexForUpload, setActiveValueIndexForUpload] = useState<number | null>(null);
 const [uploadingIndex, setUploadingIndex] = useState<number | null>(null);
 const fileInputRef = useRef<HTMLInputElement>(null);

 const form = useForm<OptionGroupFormData>({
 // eslint-disable-next-line @typescript-eslint/no-explicit-any
 resolver: zodResolver(formSchema) as any,
 defaultValues: {
 internal_name: "",
 display_name: "",
 description: "",
 selection_type: "multiple",
 min_selections: 0,
 max_selections: 3,
 is_required: false,
 values: [
 { label: "", description: "", image_url: "", price_modifier_cents: 0, is_default: false, is_active: true },
 ],
 },
 });

 const { fields, append, remove } = useFieldArray({
 control: form.control,
 name: "values",
 });

 const selectionType = form.watch("selection_type");
 const isRequired = form.watch("is_required");

 // Popula o formulário ao abrir ou trocar de grupo a editar
 useEffect(() => {
 if (open) {
 if (groupToEdit) {
 form.reset({
 id: groupToEdit.id,
 internal_name: groupToEdit.internal_name || "",
 display_name: groupToEdit.display_name || "",
 description: groupToEdit.description || "",
 selection_type: groupToEdit.selection_type || "multiple",
 min_selections: groupToEdit.min_selections ?? 0,
 max_selections: groupToEdit.max_selections ?? 1,
 is_required: groupToEdit.is_required ?? false,
 values:
 groupToEdit.values && groupToEdit.values.length > 0
 ? groupToEdit.values.map((v: any) => ({
 id: v.id,
 label: v.label || "",
 description: v.description || "",
 image_url: v.image_url || "",
 price_modifier_cents: v.price_modifier_cents ?? 0,
 max_quantity_per_item: v.max_quantity_per_item ?? 1,
 is_default: v.is_default ?? false,
 is_active: v.is_active ?? true,
 }))
 : [{ label: "", description: "", image_url: "", price_modifier_cents: 0, is_default: false, is_active: true }],
 });
 } else {
 form.reset({
 internal_name: "",
 display_name: "",
 description: "",
 selection_type: "multiple",
 min_selections: 0,
 max_selections: 3,
 is_required: false,
 values: [
 { label: "", description: "", image_url: "", price_modifier_cents: 0, is_default: false, is_active: true },
 ],
 });
 }
 }
 }, [open, groupToEdit, form]);

 const applyPreset = (preset: OptionGroupPreset) => {
 form.reset({
 internal_name: preset.data.internal_name,
 display_name: preset.data.display_name,
 description: preset.data.description,
 selection_type: preset.data.selection_type,
 min_selections: preset.data.min_selections,
 max_selections: preset.data.max_selections,
 is_required: preset.data.is_required,
 values: preset.data.values.map((v) => ({
 label: v.label,
 description: v.description,
 price_modifier_cents: v.price_modifier_cents,
 max_quantity_per_item: 1,
 is_default: v.is_default,
 is_active: v.is_active,
 image_url: "",
 })),
 });
 toast.info(`Preset "${preset.name}" aplicado.`);
 };

 const handleSelectFileForValue = (index: number) => {
 setActiveValueIndexForUpload(index);
 if (fileInputRef.current) {
 fileInputRef.current.value = "";
 fileInputRef.current.click();
 }
 };

 const onFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
 const file = e.target.files?.[0];
 if (!file) return;

 const reader = new FileReader();
 reader.onload = () => {
 setCurrentImageToCrop(reader.result as string);
 setCropDialogOpen(true);
 };
 reader.readAsDataURL(file);
 };

 const handleCroppedImageUpload = async (blob: Blob) => {
 if (activeValueIndexForUpload === null) return;
 setCropDialogOpen(false);
 const index = activeValueIndexForUpload;
 setUploadingIndex(index);

 try {
 const reader = new FileReader();
 reader.onload = async () => {
 try {
 const base64Data = reader.result as string;
 const res = await uploadStoreMedia({
 data: {
 fileName: `option-val-${Date.now()}.webp`,
 fileType: "image/webp",
 base64Data,
 bucket: "cms-media",
 },
 });
 if (res?.url) {
 form.setValue(`values.${index}.image_url`, res.url);
 toast.success("Foto do adicional anexada com sucesso!");
 }
 } catch {
 toast.error("Erro ao processar upload da foto.");
 } finally {
 setUploadingIndex(null);
 setActiveValueIndexForUpload(null);
 setCurrentImageToCrop(null);
 }
 };
 reader.readAsDataURL(blob);
 } catch {
 toast.error("Erro ao fazer upload da foto.");
 setUploadingIndex(null);
 setActiveValueIndexForUpload(null);
 setCurrentImageToCrop(null);
 }
 };

 const onSubmit = async (data: OptionGroupFormData) => {
 setIsSubmitting(true);
 try {
 const cleanedData = {
 ...data,
 internal_name: data.internal_name.trim() || data.display_name.trim().toLowerCase().replace(/\s+/g, "-"),
 min_selections: data.selection_type === "single" ? (data.is_required ? 1 : 0) : data.min_selections,
 max_selections: data.selection_type === "single" ? 1 : Math.max(data.min_selections, data.max_selections),
 };

 const result = await upsertOptionGroup({ data: cleanedData });
 toast.success(groupToEdit ? "Grupo de adicionais atualizado!" : "Grupo de adicionais criado com sucesso!");

 const savedGroup = result?.group || {
 ...cleanedData,
 id: groupToEdit?.id || "temp-" + Date.now(),
 values: cleanedData.values,
 };

 onSaved(savedGroup);
 onOpenChange(false);
 } catch (e: any) {
 toast.error(e?.message || "Erro ao salvar grupo de adicionais.");
 } finally {
 setIsSubmitting(false);
 }
 };

 return (
 <>
 <input
 type="file"
 ref={fileInputRef}
 onChange={onFileSelected}
 accept="image/*"
 className="hidden"
 />

 {/* CROPPER DE FOTO 1:1 */}
 {currentImageToCrop && (
 <ImageCropperDialog
 open={cropDialogOpen}
 onOpenChange={(isOpen) => {
 setCropDialogOpen(isOpen);
 if (!isOpen) {
 setCurrentImageToCrop(null);
 setActiveValueIndexForUpload(null);
 }
 }}
 imageSrc={currentImageToCrop}
 onCropComplete={handleCroppedImageUpload}
 aspectRatio={1}
 lockAspect={true}
 />
 )}

 {/* SIDE SHEET (Edição em Profundidade / Side Panel) */}
 <Sheet open={open} onOpenChange={onOpenChange}>
 <SheetContent
 side="right" size="wide" className="sm:max-w-3xl md:max-w-4xl lg:max-w-[70vw] xl:max-w-[70vw] w-full flex flex-col p-0 gap-0 overflow-hidden bg-card border-l border-border"
 >
 <SheetHeader className="p-6 pb-4 border-b border-border/80 bg-muted/20">
 <div className="flex items-center gap-2.5">
 <div className="size-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
 <SlidersHorizontal className="size-4.5" />
 </div>
 <div>
 <SheetTitle className="text-base font-bold text-foreground">
 {groupToEdit ? "Editar Modificadores" : "Novo Grupo de Adicionais"}
 </SheetTitle>
 <SheetDescription className="text-xs text-muted-foreground mt-0.5">
 Defina as opções com fotos, regras de escolha e valores adicionais.
 </SheetDescription>
 </div>
 </div>
 </SheetHeader>

 <form onSubmit={form.handleSubmit(onSubmit)} className="flex-1 overflow-y-auto no-scrollbar p-6 space-y-6">
 {/* PRESETS RÁPIDOS (Se for criação) */}
 {!groupToEdit && (
 <div className="space-y-2">
 <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
 <Sliders className="size-3.5 text-primary" />
 <span>Modelos Prontos (Presets de 1 Clique)</span>
 </div>
 <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
 {activePresets.map((preset) => {
 const Icon = preset.icon;
 return (
 <button
 key={preset.name}
 type="button"
 onClick={() => applyPreset(preset)}
 className="flex flex-col items-start p-2.5 rounded-xl border border-border/80 bg-background hover:bg-muted/40 hover:border-primary/40 transition-all text-left cursor-pointer group"
 >
 <div className="flex items-center gap-1.5 w-full mb-1">
 <Icon className="size-3.5 text-primary shrink-0" />
 <span className="text-xs font-semibold text-foreground truncate">{preset.name}</span>
 </div>
 <span className="text-[10px] text-muted-foreground line-clamp-1">{preset.desc}</span>
 </button>
 );
 })}
 </div>
 </div>
 )}

 {/* DADOS BÁSICOS DO GRUPO */}
 <div className="space-y-3">
 <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
 <div className="space-y-1.5">
 <Label className="text-xs font-semibold">
 Nome para o Cliente <span className="text-destructive">*</span>
 </Label>
 <Input
 placeholder={
 isTourism
 ? "Ex: Escolha o Regime de Alimentação"
 : isServices
 ? "Ex: Procedimento Adicional"
 : isRetail
 ? "Ex: Selecione o Tamanho da Peça"
 : "Ex: Escolha o Ponto da Carne"
 }
 className="h-10 text-xs rounded-xl"
 {...form.register("display_name", {
 onChange: (e) => {
 if (!form.getValues("internal_name") || form.getValues("internal_name") === "") {
 form.setValue(
 "internal_name",
 e.target.value
 .toLowerCase()
 .normalize("NFD")
 .replace(/[\u0300-\u036f]/g, "")
 .replace(/[^a-z0-9]+/g, "-")
 .replace(/(^-|-$)+/g, ""),
 );
 }
 },
 })}
 />
 {form.formState.errors.display_name && (
 <p className="text-[10px] text-destructive font-medium">
 {form.formState.errors.display_name.message}
 </p>
 )}
 </div>

 <div className="space-y-1.5">
 <Label className="text-xs font-semibold">
 Identificador Interno
 </Label>
 <Input
 placeholder={
 isTourism
 ? "Ex: regime-alimentacao"
 : isServices
 ? "Ex: extras-atendimento"
 : isRetail
 ? "Ex: tamanho-peca"
 : "Ex: ponto-carne"
 }
 className="h-10 text-xs font-mono rounded-xl"
 {...form.register("internal_name")}
 />
 </div>
 </div>

 <div className="space-y-1.5">
 <Label className="text-xs font-semibold">
 Instrução ou Descrição do Grupo (Opcional)
 </Label>
 <Input
 placeholder={
 isTourism
 ? "Ex: Selecione os opcionais desejados para sua viagem"
 : isServices
 ? "Ex: Escolha adicionais para enriquecer seu atendimento"
 : isRetail
 ? "Ex: Selecione o tamanho e cor ideais"
 : "Ex: Escolha até 3 opções para turbinar seu prato"
 }
 className="h-9 text-xs rounded-xl"
 {...form.register("description")}
 />
 </div>
 </div>

 {/* TIPO DE ESCOLHA & REGRAS */}
 <div className="rounded-2xl p-4 bg-muted/30 border border-border/70 space-y-4">
 <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
 {/* TIPO DE SELEÇÃO */}
 <div className="space-y-1.5">
 <Label className="text-xs font-semibold">Tipo de Seleção</Label>
 <div className="grid grid-cols-2 gap-2">
 <button
 type="button"
 onClick={() => {
 form.setValue("selection_type", "single");
 form.setValue("max_selections", 1);
 }}
 className={cn(
 "flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl border text-xs font-medium transition-all cursor-pointer",
 selectionType === "single"
 ? "border-primary bg-primary/10 text-primary font-bold shadow-xs"
 : "border-border/80 bg-background text-muted-foreground hover:bg-muted/40",
 )}
 >
 <span>Única (1 opção)</span>
 </button>
 <button
 type="button"
 onClick={() => form.setValue("selection_type", "multiple")}
 className={cn(
 "flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl border text-xs font-medium transition-all cursor-pointer",
 selectionType === "multiple"
 ? "border-primary bg-primary/10 text-primary font-bold shadow-xs"
 : "border-border/80 bg-background text-muted-foreground hover:bg-muted/40",
 )}
 >
 <span>Múltipla (Várias)</span>
 </button>
 </div>
 </div>

 {/* OBRIGATÓRIO SWITCH */}
 <div className="flex flex-col justify-between p-2.5 rounded-xl border border-border/80 bg-background">
 <div className="flex items-center justify-between">
 <div className="space-y-0.5">
 <Label className="text-xs font-semibold">Escolha Obrigatória</Label>
 <p className="text-[10px] text-muted-foreground">O cliente não pode avançar sem escolher</p>
 </div>
 <Switch
 checked={isRequired}
 onCheckedChange={(checked) => {
 form.setValue("is_required", checked);
 if (checked && form.getValues("min_selections") === 0) {
 form.setValue("min_selections", 1);
 } else if (!checked) {
 form.setValue("min_selections", 0);
 }
 }}
 />
 </div>
 </div>
 </div>

 {/* LIMITES DE QUANTIDADE (SE FOR MÚLTIPLA) */}
 {selectionType === "multiple" && (
 <div className="grid grid-cols-2 gap-3 pt-1 border-t border-border/50">
 <div className="space-y-1">
 <Label className="text-[11px] font-medium text-muted-foreground">Mínimo de Escolhas</Label>
 <Input
 type="number"
 min={0}
 className="h-8.5 text-xs rounded-xl"
 {...form.register("min_selections", { valueAsNumber: true })}
 />
 </div>
 <div className="space-y-1">
 <Label className="text-[11px] font-medium text-muted-foreground">Máximo de Escolhas</Label>
 <Input
 type="number"
 min={1}
 className="h-8.5 text-xs rounded-xl"
 {...form.register("max_selections", { valueAsNumber: true })}
 />
 </div>
 </div>
 )}
 </div>

 {/* LISTA DE OPÇÕES COM FOTOS E PREÇOS */}
 <div className="space-y-3">
 <div className="flex items-center justify-between">
 <Label className="text-xs font-bold uppercase tracking-wider text-foreground">
 Opções / Itens do Grupo ({fields.length})
 </Label>
 <Button
 type="button"
 variant="outline"
 size="sm"
 onClick={() =>
 append({
 label: "",
 description: "",
 image_url: "",
 price_modifier_cents: 0,
 is_default: false,
 is_active: true,
 })
 }
 className="h-7 text-xs gap-1 border-dashed rounded-xl"
 >
 <Plus className="size-3.5 text-primary" />
 Adicionar Opção
 </Button>
 </div>

 <div className="space-y-2.5">
 {fields.map((field, index) => {
 const imageUrl = form.watch(`values.${index}.image_url`);
 const isUploadingThis = uploadingIndex === index;

 return (
 <div
 key={field.id}
 className="p-3 rounded-2xl border border-border/80 bg-background hover:border-foreground/20 transition-all space-y-2"
 >
 <div className="flex items-center gap-2.5">
 {/* Mini Uploader de Foto 1:1 */}
 <div className="relative group shrink-0">
 {imageUrl ? (
 <div className="relative size-11 rounded-xl overflow-hidden border border-border bg-muted">
 <img src={imageUrl} alt="" className="size-full object-cover" />
 <button
 type="button"
 onClick={() => form.setValue(`values.${index}.image_url`, "")}
 className="absolute inset-0 bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
 title="Remover foto"
 >
 <X className="size-3.5" />
 </button>
 </div>
 ) : (
 <button
 type="button"
 onClick={() => handleSelectFileForValue(index)}
 disabled={isUploadingThis}
 className="size-11 rounded-xl border border-dashed border-border hover:border-primary/60 bg-muted/30 hover:bg-primary/5 flex flex-col items-center justify-center text-muted-foreground hover:text-primary transition-all cursor-pointer"
 title="Adicionar foto 1:1 ao adicional"
 >
 {isUploadingThis ? (
 <Loader2 className="size-4 animate-spin text-primary" />
 ) : (
 <ImagePlus className="size-4" />
 )}
 </button>
 )}
 </div>

 {/* Nome da Opção */}
 <div className="flex-1 min-w-[140px]">
 <Input
 placeholder="Nome do adicional (ex: Bacon Extra)"
 className="h-9 text-xs rounded-xl"
 {...form.register(`values.${index}.label` as const)}
 />
 </div>

 {/* Preço Adicional */}
 <div className="w-28 shrink-0">
 <CurrencyField
 placeholder="R$ 0,00"
 className="h-9 text-xs rounded-xl"
 value={form.watch(`values.${index}.price_modifier_cents` as const) || 0}
 onChange={(cents) =>
 form.setValue(`values.${index}.price_modifier_cents` as const, cents ?? 0)
 }
 />
 </div>

 {/* Botão Remover */}
 <Button
 type="button"
 variant="ghost"
 size="icon"
 disabled={fields.length === 1}
 onClick={() => remove(index)}
 className="size-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 shrink-0"
 >
 <Trash2 className="size-3.5" />
 </Button>
 </div>

 {/* Descrição curta dos ingredientes / detalhes */}
 <div className="pl-[54px]">
 <Input
 placeholder="Descrição curta (ex: 2 fatias de bacon defumado crocante)"
 className="h-7 text-[11px] rounded-lg bg-muted/20 border-border/50 text-muted-foreground"
 {...form.register(`values.${index}.description` as const)}
 />
 </div>
 </div>
 );
 })}
 </div>

 {form.formState.errors.values && (
 <p className="text-xs text-destructive flex items-center gap-1 mt-1">
 <AlertCircle className="size-3.5" />
 {form.formState.errors.values.message}
 </p>
 )}
 </div>
 </form>

 <SheetFooter className="p-4 border-t border-border/80 bg-muted/10 gap-2 sm:gap-0">
 <Button
 type="button"
 variant="outline"
 onClick={() => onOpenChange(false)}
 disabled={isSubmitting}
 className="h-10 text-xs rounded-xl"
 >
 Cancelar
 </Button>
 <Button
 type="button"
 onClick={form.handleSubmit(onSubmit)}
 disabled={isSubmitting}
 className="h-10 text-xs gap-1.5 font-bold rounded-xl bg-primary text-primary-foreground"
 >
 {isSubmitting ? (
 <>
 <Loader2 className="size-3.5 animate-spin" />
 <span>Salvando...</span>
 </>
 ) : groupToEdit ? (
 "Salvar Alterações"
 ) : (
 "Salvar e Vincular Grupo"
 )}
 </Button>
 </SheetFooter>
 </SheetContent>
 </Sheet>
 </>
 );
}
