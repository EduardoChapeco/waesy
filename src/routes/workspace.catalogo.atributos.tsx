import { createFileRoute, useRouter } from "@tanstack/react-router";
import {
 Plus,
 MoreHorizontal,
 Edit,
 Trash2,
 Copy,
 Search,
 ChevronDown,
 ChevronRight,
 Check,
 Image as ImageIcon,
 ImagePlus,
 X,
 Loader2,
 Utensils,
 Coffee,
 PlusCircle,
 Layers,
 Gift,
} from "lucide-react";
import { useState, useMemo, useRef } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";

import { PageHeader } from "@/components/commerce/page-header";
import { Button } from "@/components/ui/button";
import { CrudActionsMenu } from "@/components/ui/crud-actions-menu";
import {
 Table,
 TableBody,
 TableCell,
 TableHead,
 TableHeader,
 TableRow,
} from "@/components/ui/table";
import { SheetPage } from "@/components/ui/sheet-page";
import { Input } from "@/components/ui/input";
import { CurrencyField } from "@/components/ui/currency-field";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
 DropdownMenu,
 DropdownMenuContent,
 DropdownMenuItem,
 DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import {
 Select,
 SelectContent,
 SelectItem,
 SelectTrigger,
 SelectValue,
} from "@/components/ui/select";
import {
 listOptionGroups,
 upsertOptionGroup,
 deleteOptionGroup,
 quickUpdateOptionValue,
} from "@/services/admin-catalog.functions";
import { getStoreSettings } from "@/services/store.functions";
import { getNicheSemantics } from "@/lib/niche-semantics";
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
 values: z.array(optionValueSchema),
});

type FormValues = z.infer<typeof formSchema>;

import { getNicheOptionGroupPresets, type OptionGroupPreset } from "@/lib/niche-presets";

export const Route = createFileRoute("/workspace/catalogo/atributos")({
 head: () => ({ meta: [{ title: "Adicionais & Grades | Workspace Waesy" }] }),
 loader: async () => {
 try {
 const [groupsRes, storeRes] = await Promise.all([
 listOptionGroups().catch(() => []),
 getStoreSettings().catch(() => null),
 ]);
 return {
 groups: groupsRes || [],
 store: storeRes || null,
 };
 } catch {
 return { groups: [], store: null };
 }
 },
 component: OptionGroupsPage,
});

function OptionGroupsPage() {
 const { groups, store } = ((Route.useLoaderData?.() as any) || {});
 const semantics = getNicheSemantics(store);
 const isTourism = semantics.nicheId === "tourism";
 const isServices = semantics.nicheId === "services";
 const isRetail = semantics.nicheId === "retail" || semantics.nicheId === "supermarket" || semantics.nicheId === "wholesale";
 const isGastro = semantics.nicheId === "gastronomy";

 const activePresets = useMemo(() => getNicheOptionGroupPresets(semantics.nicheId), [semantics.nicheId]);
 const router = useRouter();
 const [open, setOpen] = useState(false);
 const [isSubmitting, setIsSubmitting] = useState(false);
 const [searchQuery, setSearchQuery] = useState("");

 const filteredGroups = useMemo(() => {
 return groups.filter(
 (g: any) =>
 g.internal_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
 g.display_name?.toLowerCase().includes(searchQuery.toLowerCase()),
 );
 }, [groups, searchQuery]);

 const form = useForm<FormValues>({
 // eslint-disable-next-line @typescript-eslint/no-explicit-any
 resolver: zodResolver(formSchema) as any,
 defaultValues: {
 internal_name: "",
 display_name: "",
 description: "",
 selection_type: "multiple",
 min_selections: 0,
 max_selections: 1,
 is_required: false,
 values: [],
 },
 });

 const { fields, append, remove } = useFieldArray({
 control: form.control,
 name: "values",
 });

 const handleEdit = (group: any) => {
 form.reset({
 id: group.id,
 internal_name: group.internal_name,
 display_name: group.display_name,
 description: group.description || "",
 selection_type: group.selection_type,
 min_selections: group.min_selections,
 max_selections: group.max_selections,
 is_required: group.is_required,
 values: group.values || [],
 });
 setOpen(true);
 };

 const handleDuplicate = async (group: any) => {
 setIsSubmitting(true);
 try {
 const duplicatedData = {
 internal_name: `${group.internal_name}_copia_${Date.now().toString().slice(-4)}`,
 display_name: `${group.display_name} (Cópia)`,
 description: group.description || "",
 selection_type: group.selection_type || "multiple",
 min_selections: group.min_selections ?? 0,
 max_selections: group.max_selections ?? 1,
 is_required: group.is_required ?? false,
 values: (group.values || []).map((v: any) => ({
 label: v.label,
 description: v.description || null,
 image_url: v.image_url || null,
 price_modifier_cents: v.price_modifier_cents || 0,
 max_quantity_per_item: v.max_quantity_per_item || 1,
 is_default: v.is_default || false,
 is_active: v.is_active !== false,
 })),
 };
 await upsertOptionGroup({ data: duplicatedData });
 toast.success(`Grupo "${group.display_name}" duplicado com sucesso!`);
 router.invalidate();
 } catch (e: any) {
 toast.error(e?.message || "Erro ao duplicar grupo.");
 } finally {
 setIsSubmitting(false);
 }
 };

 const applyPreset = (preset: OptionGroupPreset) => {
 form.reset({
 id: undefined,
 internal_name: preset.data.internal_name,
 display_name: preset.data.display_name,
 description: preset.data.description,
 selection_type: preset.data.selection_type,
 min_selections: preset.data.min_selections,
 max_selections: preset.data.max_selections,
 is_required: preset.data.is_required,
 values: preset.data.values.map((v) => ({ ...v, max_quantity_per_item: 1, image_url: null })),
 });
 toast.info(`Modelo "${preset.name}" carregado.`);
 };

 const handleDelete = async (id: string) => {
 try {
 await deleteOptionGroup({ data: { id } });
 toast.success("Grupo de opções excluído com sucesso.");
 router.invalidate();
 } catch (e: any) {
 toast.error(e.message || "Erro ao excluir grupo.");
 }
 };

 const onSubmit = async (data: FormValues) => {
 setIsSubmitting(true);
 try {
 await upsertOptionGroup({ data });
 toast.success("Grupo de opções salvo com sucesso!");
 setOpen(false);
 router.invalidate();
 } catch (e: any) {
 toast.error(e.message || "Erro ao salvar grupo.");
 } finally {
 setIsSubmitting(false);
 }
 };

 return (
 <div className="space-y-6">
 <PageHeader
 eyebrow="Catálogo"
 title={semantics.modifiersLabel}
 actions={
 <Button
 size="sm"
 className="rounded-xl font-bold text-xs gap-1.5 bg-primary text-primary-foreground "
 onClick={() => {
 form.reset({
 internal_name: "",
 display_name: "",
 description: "",
 selection_type: "multiple",
 min_selections: 0,
 max_selections: 1,
 is_required: false,
 values: [
 {
 label: "",
 description: "",
 image_url: null,
 price_modifier_cents: 0,
 max_quantity_per_item: 1,
 is_default: false,
 is_active: true,
 },
 ],
 });
 setOpen(true);
 }}
 >
 <Plus className="size-4" />
 <span>{semantics.newModifierAction}</span>
 </Button>
 }
 />

 {/* Barra de Busca */}
 <div className="flex items-center justify-between gap-4">
 <div className="relative flex-1 max-w-sm">
 <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
 <Input
 placeholder="Buscar grupos..."
 value={searchQuery}
 onChange={(e) => setSearchQuery(e.target.value)}
 className="pl-9 h-9 text-xs rounded-xl"
 />
 </div>
 </div>

 <div className="rounded-2xl overflow-hidden bg-card border border-border/70">
 {filteredGroups.length === 0 ? (
 <div className="py-12 text-center space-y-4">
 <div className="size-12 rounded-2xl bg-muted flex items-center justify-center mx-auto text-muted-foreground">
 <Plus className="size-6" />
 </div>
 <div className="space-y-1">
 <h3 className="text-base font-bold text-foreground">Nenhum grupo de opções criado</h3>
 <p className="text-xs text-muted-foreground max-w-sm mx-auto">
 {isTourism
 ? "Crie grupos como Regime de Alimentação, Seguro Viagem, Transfers ou Passeios Opcionais."
 : isServices
 ? "Crie grupos como Procedimentos Adicionais, Tratamentos Extras ou Produtos Homecare."
 : isRetail
 ? "Crie grupos como Grade de Tamanhos, Variação de Cores ou Embalagens de Presente."
 : "Crie grupos como Adicionais de Prato, Ponto da Carne, Bebidas ou Molhos com fotos e preços."}
 </p>
 </div>
 <Button
 size="sm"
 className="rounded-xl font-bold text-xs gap-1.5 bg-foreground text-background hover:bg-foreground/90 h-9"
 onClick={() => {
 form.reset({
 internal_name: "",
 display_name: "",
 description: "",
 selection_type: "multiple",
 min_selections: 0,
 max_selections: 1,
 is_required: false,
 values: [],
 });
 setOpen(true);
 }}
 >
 <Plus className="size-4" />
 <span>Criar Primeiro Grupo</span>
 </Button>
 </div>
 ) : (
 <Table>
 <TableHeader>
 <TableRow className="hover:bg-transparent">
 <TableHead className="w-[36px]"></TableHead>
 <TableHead className="text-xs font-bold text-foreground">Nome de Exibição</TableHead>
 <TableHead className="text-xs font-bold text-foreground">Tipo de Seleção</TableHead>
 <TableHead className="text-xs font-bold text-foreground">Regras</TableHead>
 <TableHead className="text-xs font-bold text-foreground">Adicionais & Fotos</TableHead>
 <TableHead className="w-[80px]"></TableHead>
 </TableRow>
 </TableHeader>
 <TableBody>
 {filteredGroups.map((group: any) => (
 <OptionGroupTableRow
 key={group.id}
 group={group}
 onEdit={() => handleEdit(group)}
 onDuplicate={() => handleDuplicate(group)}
 onDelete={() => handleDelete(group.id)}
 />
 ))}
 </TableBody>
 </Table>
 )}
 </div>

 {/* SheetPage de Criação / Edição de Grupo de Opções */}
 <SheetPage
 open={open}
 onOpenChange={setOpen}
 title={form.watch("id") ? "Editar Grupo de Opções" : "Novo Grupo de Opções"}
 description="Configure complementos com fotos, limites de escolha e valores adicionais."
 size="xl"
 footer={
 <div className="flex items-center justify-between w-full">
 <Button
 type="button"
 variant="ghost"
 onClick={() => setOpen(false)}
 disabled={isSubmitting}
 className="rounded-xl text-xs font-semibold"
 >
 Cancelar
 </Button>
 <Button
 type="button"
 onClick={form.handleSubmit(onSubmit as any)}
 disabled={isSubmitting}
 className="rounded-xl text-xs font-bold bg-foreground text-background hover:bg-foreground/90 gap-1.5 h-9"
 >
 {isSubmitting ? (
 <>
 <Loader2 className="size-3.5 animate-spin" />
 <span>Salvando...</span>
 </>
 ) : (
 <>
 <Check className="size-3.5" />
 <span>Salvar Grupo</span>
 </>
 )}
 </Button>
 </div>
 }
 >
 <form onSubmit={form.handleSubmit(onSubmit as any)} className="space-y-6 py-2">
 {/* Presets Rápidos de 1 Clique */}
 {!form.watch("id") && (
 <div className="space-y-2 pb-2 border-b border-border/40">
 <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
 <Layers className="size-3.5 text-primary" />
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

 <div className="grid gap-4">
 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
 <div className="space-y-1.5">
 <Label className="text-xs font-bold text-foreground">Nome Interno</Label>
 <Input
 {...form.register("internal_name")}
 placeholder={
 isTourism
 ? "ex: REGIME_ALIMENTACAO"
 : isServices
 ? "ex: EXTRAS_PROCEDIMENTO"
 : isRetail
 ? "ex: GRADE_TAMANHO"
 : "ex: ADICIONAIS_PRATO"
 }
 className="rounded-xl text-xs h-9"
 />
 {form.formState.errors.internal_name && (
 <p className="text-[11px] text-destructive">
 {form.formState.errors.internal_name.message}
 </p>
 )}
 </div>
 <div className="space-y-1.5">
 <Label className="text-xs font-bold text-foreground">Nome para o Cliente (Vitrine)</Label>
 <Input
 {...form.register("display_name")}
 placeholder={
 isTourism
 ? "ex: Regime de Alimentação Incluso"
 : isServices
 ? "ex: Adicionais do Atendimento"
 : isRetail
 ? "ex: Selecione o Tamanho da Peça"
 : "ex: Turbine seu Prato ou Lanche"
 }
 className="rounded-xl text-xs h-9"
 />
 {form.formState.errors.display_name && (
 <p className="text-[11px] text-destructive">
 {form.formState.errors.display_name.message}
 </p>
 )}
 </div>
 </div>

 <div className="space-y-1.5">
 <Label className="text-xs font-bold text-foreground">Instrução / Descrição (Opcional)</Label>
 <Input
 {...form.register("description")}
 placeholder={
 isTourism
 ? "ex: Escolha o plano de refeições desejado para a hospedagem"
 : isServices
 ? "ex: Selecione procedimentos extras para seu atendimento"
 : isRetail
 ? "ex: Escolha a cor e tamanho desejados"
 : "ex: Escolha seus adicionais favoritos para turbinar o item"
 }
 className="rounded-xl text-xs h-9"
 />
 </div>

 <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
 <div className="space-y-1.5">
 <Label className="text-xs font-bold text-foreground">Tipo de Seleção</Label>
 <Select
 value={form.watch("selection_type")}
 onValueChange={(val: any) => form.setValue("selection_type", val)}
 >
 <SelectTrigger className="rounded-xl text-xs h-9">
 <SelectValue />
 </SelectTrigger>
 <SelectContent className="rounded-xl">
 <SelectItem value="single">Escolha Única (Radio)</SelectItem>
 <SelectItem value="multiple">Escolha Múltipla (Checkbox)</SelectItem>
 </SelectContent>
 </Select>
 </div>

 <div className="space-y-1.5">
 <Label className="text-xs font-bold text-foreground">Mínimo de Escolhas</Label>
 <Input
 type="number"
 min={0}
 {...form.register("min_selections", { valueAsNumber: true })}
 className="rounded-xl text-xs h-9"
 />
 </div>

 <div className="space-y-1.5">
 <Label className="text-xs font-bold text-foreground">Máximo de Escolhas</Label>
 <Input
 type="number"
 min={1}
 {...form.register("max_selections", { valueAsNumber: true })}
 className="rounded-xl text-xs h-9"
 />
 </div>
 </div>

 <div className="flex items-center space-x-2 pt-2">
 <Checkbox
 id="isRequired"
 checked={form.watch("is_required")}
 onCheckedChange={(c) => form.setValue("is_required", !!c)}
 className="rounded-md"
 />
 <Label htmlFor="isRequired" className="text-xs font-bold text-foreground cursor-pointer">
 Item Obrigatório (Cliente precisa selecionar para avançar)
 </Label>
 </div>

 {/* Lista de Opções / Adicionais com Mini-Uploader de Imagem */}
 <div className="space-y-3 pt-4 border-t border-border/50">
 <div className="flex items-center justify-between">
 <div>
 <Label className="text-sm font-bold text-foreground">Itens / Adicionais</Label>
 <p className="text-[11px] text-muted-foreground">
 Fotos aparecem na vitrine do produto para o cliente ver o complemento.
 </p>
 </div>
 <Button
 type="button"
 variant="outline"
 size="sm"
 className="rounded-xl text-xs font-bold gap-1.5 h-8"
 onClick={() =>
 append({
 label: "",
 description: "",
 image_url: null,
 price_modifier_cents: 0,
 max_quantity_per_item: 1,
 is_default: false,
 is_active: true,
 })
 }
 >
 <Plus className="size-3.5" />
 <span>Adicionar Opção</span>
 </Button>
 </div>

 {fields.length === 0 ? (
 <div className="text-xs text-muted-foreground p-6 text-center border border-dashed rounded-2xl bg-muted/20">
 Nenhum adicional incluído neste grupo. Clique em "Adicionar Opção".
 </div>
 ) : (
 <div className="space-y-3">
 {fields.map((field, index) => (
 <OptionItemCard
 key={field.id}
 index={index}
 form={form}
 onRemove={() => remove(index)}
 />
 ))}
 </div>
 )}
 </div>
 </div>

 </form>
 </SheetPage>
 </div>
 );
}

/** Componente de Edição do Adicional com Uploader de Foto Quadrada 1:1 */
function OptionItemCard({
 index,
 form,
 onRemove,
}: {
 index: number;
 form: any;
 onRemove: () => void;
}) {
 const imageUrl = form.watch(`values.${index}.image_url`);
 const [cropOpen, setCropOpen] = useState(false);
 const [tempSrc, setTempSrc] = useState<string | null>(null);
 const [isUploading, setIsUploading] = useState(false);
 const fileInputRef = useRef<HTMLInputElement>(null);

 const handleSelectFile = (e: React.ChangeEvent<HTMLInputElement>) => {
 const file = e.target.files?.[0];
 if (!file) return;

 const reader = new FileReader();
 reader.onload = () => {
 setTempSrc(reader.result as string);
 setCropOpen(true);
 };
 reader.readAsDataURL(file);
 if (fileInputRef.current) fileInputRef.current.value = "";
 };

 const handleCropComplete = async (croppedBase64: string) => {
 setIsUploading(true);
 try {
 const res = await uploadStoreMedia({
 data: {
 fileName: `option-${Date.now()}.png`,
 fileType: "image/png",
 base64Data: croppedBase64,
 bucket: "cms-media",
 },
 });

 if (res?.url) {
 form.setValue(`values.${index}.image_url`, res.url);
 toast.success("Foto do adicional carregada.");
 }
 } catch {
 toast.error("Erro ao fazer upload da imagem.");
 } finally {
 setIsUploading(false);
 }
 };

 return (
 <div className="flex items-start gap-3 p-3.5 rounded-2xl border border-border/70 bg-card hover:border-border transition-all">
 {/* Mini Uploader 1:1 */}
 <div className="relative shrink-0">
 <input
 ref={fileInputRef}
 type="file"
 accept="image/*"
 className="hidden"
 onChange={handleSelectFile}
 />

 {imageUrl ? (
 <div className="relative size-14 rounded-xl overflow-hidden border border-border/80 group">
 <img src={imageUrl} alt="" className="size-full object-cover" />
 <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
 <button
 type="button"
 onClick={() => fileInputRef.current?.click()}
 className="p-1 rounded-md text-white hover:bg-white/20"
 title="Trocar Foto"
 >
 <Edit className="size-3" />
 </button>
 <button
 type="button"
 onClick={() => form.setValue(`values.${index}.image_url`, null)}
 className="p-1 rounded-md text-destructive hover:bg-destructive/20"
 title="Remover Foto"
 >
 <X className="size-3" />
 </button>
 </div>
 </div>
 ) : (
 <button
 type="button"
 onClick={() => fileInputRef.current?.click()}
 disabled={isUploading}
 className="size-14 rounded-xl border border-dashed border-border/80 bg-muted/20 hover:bg-muted/50 flex flex-col items-center justify-center text-muted-foreground hover:text-foreground transition-all cursor-pointer"
 >
 {isUploading ? (
 <Loader2 className="size-4 animate-spin text-primary" />
 ) : (
 <>
 <ImagePlus className="size-4" />
 <span className="text-[9px] font-semibold mt-0.5">Foto</span>
 </>
 )}
 </button>
 )}

 <ImageCropperDialog
 open={cropOpen}
 onOpenChange={setCropOpen}
 imageSrc={tempSrc}
 aspect={1}
 cropShape="rect"
 lockAspect={true}
 title="Enquadrar Foto do Adicional (1:1)"
 onCropCompleteAction={handleCropComplete}
 />
 </div>

 {/* Campos de Dados */}
 <div className="grid flex-1 gap-2.5">
 <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
 <div className="space-y-1">
 <Label className="text-[11px] font-bold text-foreground">Nome do Adicional *</Label>
 <Input
 {...form.register(`values.${index}.label`)}
 placeholder="ex: Bacon Crocante Especial"
 className="h-8 text-xs rounded-xl"
 />
 </div>
 <div className="space-y-1">
 <Label className="text-[11px] font-bold text-foreground">Preço Adicional (R$)</Label>
 <CurrencyField
 className="h-8 text-xs rounded-xl"
 placeholder="0,00"
 value={form.watch(`values.${index}.price_modifier_cents`)}
 onChange={(val) =>
 form.setValue(`values.${index}.price_modifier_cents`, val || 0)
 }
 />
 </div>
 </div>

 <div className="space-y-1">
 <Input
 {...form.register(`values.${index}.description`)}
 placeholder="Descrição curta (ex: 4 fatias defumadas em lenha)"
 className="h-7 text-[11px] rounded-lg text-muted-foreground"
 />
 </div>

 <div className="flex items-center justify-between pt-0.5 text-xs">
 <div className="flex items-center gap-4">
 <label className="flex items-center gap-1.5 text-[11px] font-semibold text-foreground cursor-pointer">
 <Checkbox
 checked={form.watch(`values.${index}.is_default`)}
 onCheckedChange={(c) => form.setValue(`values.${index}.is_default`, !!c)}
 className="rounded-md size-3.5"
 />
 <span>Marcado por Padrão</span>
 </label>
 <label className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground cursor-pointer">
 <Checkbox
 checked={form.watch(`values.${index}.is_active`)}
 onCheckedChange={(c) => form.setValue(`values.${index}.is_active`, !!c)}
 className="rounded-md size-3.5"
 />
 <span>Disponível / Ativo</span>
 </label>
 </div>

 <Button
 type="button"
 variant="ghost"
 size="icon"
 className="size-7 text-destructive hover:bg-destructive/10 rounded-lg shrink-0"
 onClick={onRemove}
 >
 <Trash2 className="size-3.5" />
 </Button>
 </div>
 </div>
 </div>
 );
}

/** Linha da Tabela de Grupos com Miniaturas de Adicionais */
function OptionGroupTableRow({
 group,
 onEdit,
 onDuplicate,
 onDelete,
}: {
 group: any;
 onEdit: () => void;
 onDuplicate: () => void;
 onDelete: () => void;
}) {
 const [isExpanded, setIsExpanded] = useState(false);
 const values = group.values || [];

 return (
 <>
 <TableRow className="hover:bg-muted/30 transition-colors">
 <TableCell className="pl-4">
 <button
 type="button"
 onClick={() => setIsExpanded(!isExpanded)}
 className="p-1 rounded-md text-muted-foreground hover:text-foreground"
 >
 {isExpanded ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
 </button>
 </TableCell>
 <TableCell>
 <div className="space-y-0.5">
 <span className="font-bold text-xs text-foreground block">
 {group.display_name}
 </span>
 <span className="text-[10px] text-muted-foreground font-mono block">
 {group.internal_name}
 </span>
 </div>
 </TableCell>
 <TableCell>
 <Badge variant="outline" className="text-[10px] font-semibold rounded-lg px-2 py-0.5">
 {group.selection_type === "single" ? "Única (Radio)" : "Múltipla (Checkbox)"}
 </Badge>
 </TableCell>
 <TableCell className="text-xs text-muted-foreground">
 {group.is_required ? (
 <span className="text-primary font-bold text-[11px]">Obrigatório (min {group.min_selections})</span>
 ) : (
 <span>Opcional (máx {group.max_selections})</span>
 )}
 </TableCell>
 <TableCell>
 <div className="flex items-center gap-2">
 {/* Pilha de Miniaturas com fotos */}
 <div className="flex items-center -space-x-2 overflow-hidden">
 {values.slice(0, 4).map((v: any, i: number) =>
 v.image_url ? (
 <img
 key={v.id || i}
 src={v.image_url}
 alt={v.label}
 className="inline-block size-6 rounded-md object-cover ring-2 ring-background"
 />
 ) : (
 <div
 key={v.id || i}
 className="inline-flex items-center justify-center size-6 rounded-md bg-muted text-[10px] font-bold text-muted-foreground ring-2 ring-background uppercase"
 >
 {v.label?.slice(0, 1) || "•"}
 </div>
 ),
 )}
 </div>
 <button
 type="button"
 className="text-xs text-muted-foreground hover:text-foreground font-semibold cursor-pointer"
 onClick={() => setIsExpanded(!isExpanded)}
 >
 {values.length} opções
 </button>
 </div>
 </TableCell>
 <TableCell className="pr-4 text-right">
 <CrudActionsMenu
 entityName="Grupo de Opções"
 onEdit={onEdit}
 onDuplicate={onDuplicate}
 onDelete={onDelete}
 deleteConfirmTitle={`Excluir grupo "${group.display_name}"?`}
 deleteConfirmDescription="Esta ação removerá o grupo e todas as suas opções de adicionais e variações."
 />
 </TableCell>
 </TableRow>

 {/* Expansão Rápida de Valores */}
 {isExpanded && values.length > 0 && (
 <TableRow className="bg-muted/10 hover:bg-muted/10 border-b">
 <TableCell colSpan={6} className="p-3 pl-10">
 <div className="rounded-2xl border border-border/60 bg-card overflow-hidden">
 <Table className="text-xs">
 <TableHeader>
 <TableRow className="bg-transparent border-b">
 <TableHead className="h-8 text-[11px] font-bold w-12 text-center">Foto</TableHead>
 <TableHead className="h-8 text-[11px] font-bold">Nome do Adicional</TableHead>
 <TableHead className="h-8 text-[11px] font-bold w-36">Preço Adicional</TableHead>
 <TableHead className="h-8 text-[11px] font-bold w-20 text-center">Status</TableHead>
 </TableRow>
 </TableHeader>
 <TableBody>
 {values.map((val: any) => (
 <TableRow key={val.id} className="hover:bg-muted/20">
 <TableCell className="p-2 text-center">
 {val.image_url ? (
 <img
 src={val.image_url}
 alt=""
 className="size-7 rounded-lg object-cover mx-auto border border-border/60"
 />
 ) : (
 <div className="size-7 rounded-lg bg-muted/40 border border-border/40 flex items-center justify-center mx-auto text-muted-foreground">
 <ImageIcon className="size-3.5" />
 </div>
 )}
 </TableCell>
 <TableCell className="p-2">
 <EditableOptionLabelCell option={val} />
 </TableCell>
 <TableCell className="p-2">
 <EditableOptionPriceCell option={val} />
 </TableCell>
 <TableCell className="p-2 text-center">
 <EditableOptionActiveCell option={val} />
 </TableCell>
 </TableRow>
 ))}
 </TableBody>
 </Table>
 </div>
 </TableCell>
 </TableRow>
 )}
 </>
 );
}

function EditableOptionLabelCell({ option }: { option: any }) {
 const [value, setValue] = useState(option.label || "");
 const [isSaving, setIsSaving] = useState(false);

 const handleBlur = async () => {
 if (value.trim() === "" || value === option.label) return;
 setIsSaving(true);
 try {
 await quickUpdateOptionValue({
 data: {
 id: option.id,
 label: value.trim(),
 },
 });
 toast.success("Nome atualizado!");
 } catch {
 toast.error("Erro ao atualizar nome.");
 setValue(option.label);
 } finally {
 setIsSaving(false);
 }
 };

 return (
 <Input
 value={value}
 onChange={(e) => setValue(e.target.value)}
 onBlur={handleBlur}
 onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
 className="h-7 text-xs font-semibold rounded-lg bg-background"
 disabled={isSaving}
 />
 );
}

function EditableOptionPriceCell({ option }: { option: any }) {
 const [priceCents, setPriceCents] = useState(option.price_modifier_cents ?? 0);
 const [isSaving, setIsSaving] = useState(false);

 const handleSave = async (newVal: number | null) => {
 const val = newVal ?? 0;
 if (val === option.price_modifier_cents) return;
 setIsSaving(true);
 try {
 await quickUpdateOptionValue({
 data: {
 id: option.id,
 price_modifier_cents: val,
 },
 });
 setPriceCents(val);
 toast.success("Preço atualizado!");
 } catch {
 toast.error("Erro ao atualizar preço.");
 } finally {
 setIsSaving(false);
 }
 };

 return (
 <CurrencyField
 value={priceCents}
 onChange={(val) => {
 setPriceCents(val || 0);
 handleSave(val ?? 0);
 }}
 className="h-7 text-xs font-mono rounded-lg bg-background"
 disabled={isSaving}
 />
 );
}

function EditableOptionActiveCell({ option }: { option: any }) {
 const [isActive, setIsActive] = useState(option.is_active ?? true);
 const [isSaving, setIsSaving] = useState(false);

 const handleToggle = async (checked: boolean) => {
 setIsSaving(true);
 try {
 await quickUpdateOptionValue({
 data: {
 id: option.id,
 is_active: checked,
 },
 });
 setIsActive(checked);
 toast.success(checked ? "Opção ativada" : "Opção desativada");
 } catch {
 toast.error("Erro ao alterar status.");
 } finally {
 setIsSaving(false);
 }
 };

 return (
 <Checkbox
 checked={isActive}
 onCheckedChange={(c) => handleToggle(!!c)}
 disabled={isSaving}
 className="rounded-md"
 />
 );
}
