import { createFileRoute, useRouter } from "@tanstack/react-router";
import { Plus, MoreHorizontal, Edit, Trash2, Copy, Search, ChevronDown, ChevronRight, Check, Image as ImageIcon, ImagePlus, X, Loader2, Utensils, Coffee, PlusCircle, Layers, Gift, Sliders } from "lucide-react";
import { useState, useMemo, useRef } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";

import { PageHeader } from "@/components/commerce/page-header";
import { Button } from "@/components/ui/button";
import { CrudActionsMenu } from "@/components/ui/crud-actions-menu";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { SheetPage } from "@/components/ui/sheet-page";
import { Input } from "@/components/ui/input";
import { CurrencyField } from "@/components/ui/currency-field";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { listOptionGroups, upsertOptionGroup, deleteOptionGroup, quickUpdateOptionValue } from "@/services/admin-catalog.functions";
import { getStoreSettings } from "@/services/store.functions";
import { getNicheSemantics } from "@/lib/niche-semantics";
import { resolveUnifiedNicheId } from "@/lib/niches/niche-ssot";
import { ErrorState } from "@/components/state/states";
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

import {
  getNicheOptionGroupPresets,
  getNicheModifierPlaceholders,
  searchOptionGroupPresets,
  NICHE_LABELS,
  type OptionGroupPreset,
} from "@/lib/niche-presets";

export const Route = createFileRoute("/workspace/catalogo/atributos")({
 head: () => ({ meta: [{ title: "Adicionais | Workspace Waesy" }] }),
 loader: async () => {
 try {
 let loadError: string | null = null;
 const [groupsRes, storeRes] = await Promise.all([
 listOptionGroups().catch((err: any) => {
   loadError = err?.message || "Falha ao carregar atributos e adicionais.";
   return [];
 }),
 getStoreSettings().catch(() => null),
 ]);
 return {
 groups: groupsRes || [],
 store: storeRes || null,
 loadError,
 };
 } catch (err: any) {
 return { groups: [], store: null, loadError: err?.message || "Erro ao carregar adicionais." };
 }
 },
 component: OptionGroupsPage,
});

function OptionGroupsPage() {
 const { groups, store, loadError } = ((Route.useLoaderData?.() as any) || {});
 const semantics = getNicheSemantics(store);
 const unifiedNiche = resolveUnifiedNicheId(store);
 const isTourism = unifiedNiche === "tourism";
 const isServices = semantics.nicheId === "services";
 const isRetail = ["retail", "supermarket", "wholesale", "market_perishables", "pharmacy"].includes(unifiedNiche);
 const isGastro = unifiedNiche === "gastronomy";

 const activePresets = useMemo(() => getNicheOptionGroupPresets(semantics.nicheId), [semantics.nicheId]);
 const placeholders = useMemo(() => getNicheModifierPlaceholders(semantics.nicheId), [semantics.nicheId]);
 const router = useRouter();
 const [open, setOpen] = useState(false);
 const [isSubmitting, setIsSubmitting] = useState(false);
 const [searchQuery, setSearchQuery] = useState("");
 const [activeTab, setActiveTab] = useState<"my_groups" | "recommended" | "library">("my_groups");
 const [librarySearchQuery, setLibrarySearchQuery] = useState("");
 const [libraryNiche, setLibraryNiche] = useState("all");

 const libraryPresets = useMemo(() => {
   return searchOptionGroupPresets(librarySearchQuery, libraryNiche);
 }, [librarySearchQuery, libraryNiche]);

 const handleImportPreset = async (preset: OptionGroupPreset) => {
   setIsSubmitting(true);
   try {
     await upsertOptionGroup({ data: preset.data });
     toast.success(`Modelo "${preset.name}" importado com sucesso para seu catálogo!`);
     setActiveTab("my_groups");
     router.invalidate();
   } catch (e: any) {
     toast.error(e?.message || "Erro ao importar modelo.");
   } finally {
     setIsSubmitting(false);
   }
 };

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
 <PageHeader /* design-lint-ignore DL-15 reason:"onClick pertence a controle interno do slot; o elemento em si nao e interativo" expiry:"2027-12-31" */
 eyebrow="Catálogo"
 title={semantics.modifiersLabel}
 actions={
 <Button
 size="sm"
 className="rounded-lg font-bold text-xs gap-2 bg-primary text-primary-foreground "
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

 {/* Navegação em Abas Segmentadas */}
 <div className="flex flex-wrap items-center gap-2 p-1 bg-muted/40 rounded-xl border border-border/70 w-fit">
 <button
 type="button"
 onClick={() => setActiveTab("my_groups")}
 className={cn(
 "flex items-center gap-2 h-11 min-h-11 px-4 py-2 rounded-lg text-xs font-semibold transition-colors duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
 activeTab === "my_groups"
 ? "bg-background text-foreground shadow-xs font-bold"
 : "text-muted-foreground hover:text-foreground",
 )}
 >
 <Layers className="size-3.5 text-primary" />
 <span>Meus Grupos ({groups.length})</span>
 </button>
 <button
 type="button"
 onClick={() => setActiveTab("recommended")}
 className={cn(
 "flex items-center gap-2 h-11 min-h-11 px-4 py-2 rounded-lg text-xs font-semibold transition-colors duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
 activeTab === "recommended"
 ? "bg-background text-foreground shadow-xs font-bold"
 : "text-muted-foreground hover:text-foreground",
 )}
 >
 <Sliders className="size-3.5 text-primary" />
 <span>Modelos Recomendados ({activePresets.length})</span>
 </button>
 <button
 type="button"
 onClick={() => setActiveTab("library")}
 className={cn(
 "flex items-center gap-2 h-11 min-h-11 px-4 py-2 rounded-lg text-xs font-semibold transition-colors duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
 activeTab === "library"
 ? "bg-background text-foreground shadow-xs font-bold"
 : "text-muted-foreground hover:text-foreground",
 )}
 >
 <Gift className="size-3.5 text-primary" />
 <span>Catálogo Global de Presets</span>
 </button>
 </div>

 {loadError && (
 <ErrorState
   title="Erro ao carregar grupos de adicionais"
   description={loadError}
   onRetry={() => router.invalidate()}
 />
 )}

 {activeTab === "my_groups" && (
 <>
 {/* Barra de Busca */}
 <div className="flex items-center justify-between gap-4">
 <div className="relative flex-1 max-w-sm">
 <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
 <Input
 placeholder="Buscar grupos..."
 value={searchQuery}
 onChange={(e) => setSearchQuery(e.target.value)}
 className="pl-9 h-9 text-xs rounded-lg"
 />
 </div>
 </div>

 <div className="rounded-lg overflow-hidden bg-card border border-border/70">
 {filteredGroups.length === 0 ? (
 <div className="py-12 text-center space-y-4">
 <div className="size-12 rounded-lg bg-muted flex items-center justify-center mx-auto text-muted-foreground">
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
 className="rounded-lg font-bold text-xs gap-2 bg-foreground text-background hover:bg-foreground/90 h-9 min-h-11 sm:min-h-0"
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
 <TableHead className="w-9"></TableHead>
 <TableHead className="text-xs font-bold text-foreground">Nome de Exibição</TableHead>
 <TableHead className="text-xs font-bold text-foreground">Tipo de Seleção</TableHead>
 <TableHead className="text-xs font-bold text-foreground">Regras</TableHead>
 <TableHead className="text-xs font-bold text-foreground">Adicionais e Fotos</TableHead>
 <TableHead className="w-20"></TableHead>
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
 </>
 )}

 {activeTab === "recommended" && (
 <div className="space-y-4">
 <div className="p-4 rounded-xl border border-border/80 bg-muted/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
 <div>
 <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
 <Sliders className="size-4 text-primary" />
 Modelos Recomendados para {semantics.name}
 </h3>
 <p className="text-xs text-muted-foreground mt-1">
 Templates canônicos pré-configurados com regras e valores para acelerar o cadastro no seu segmento.
 </p>
 </div>
 </div>

 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
 {activePresets.map((preset) => {
 const Icon = preset.icon;
 return (
 <div
 key={preset.id || preset.name}
 className="p-4 rounded-xl border border-border/80 bg-card hover:border-primary/50 transition-colors flex flex-col justify-between space-y-4 shadow-2xs"
 >
 <div className="space-y-3">
 <div className="flex items-start justify-between gap-2">
 <div className="flex items-center gap-2">
 <div className="size-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
 <Icon className="size-5" />
 </div>
 <div>
 <h4 className="text-sm font-bold text-foreground">{preset.name}</h4>
 <span className="text-2xs text-muted-foreground">{preset.desc}</span>
 </div>
 </div>
 <Badge variant="outline" className="text-2xs uppercase tracking-wider shrink-0 font-bold">
 {preset.data.selection_type === "single" ? "Única" : "Múltipla"}
 </Badge>
 </div>

 <div className="space-y-2 pt-2 border-t border-border/50">
 <p className="text-2xs font-bold text-muted-foreground uppercase tracking-wider">
 Opções Inclusas ({preset.data.values.length}):
 </p>
 <div className="space-y-1 max-h-32 overflow-y-auto no-scrollbar">
 {preset.data.values.map((val, idx) => (
 <div key={idx} className="flex items-center justify-between text-xs py-1 px-2 rounded-md bg-muted/30">
 <span className="text-foreground font-medium truncate">{val.label}</span>
 <span className="text-muted-foreground font-mono text-2xs shrink-0">
 {val.price_modifier_cents > 0
 ? `+ R$ ${(val.price_modifier_cents / 100).toFixed(2).replace(".", ",")}`
 : "Grátis"}
 </span>
 </div>
 ))}
 </div>
 </div>
 </div>

 <div className="flex items-center gap-2 pt-2 border-t border-border/50">
 <Button
 type="button"
 size="sm"
 onClick={() => handleImportPreset(preset)}
 disabled={isSubmitting}
 className="flex-1 h-11 min-h-11 rounded-lg text-xs font-bold gap-2"
 >
 <Plus className="size-3.5" />
 <span>Importar</span>
 </Button>
 <Button
 type="button"
 variant="outline"
 size="sm"
 onClick={() => {
 applyPreset(preset);
 setOpen(true);
 }}
 className="h-11 min-h-11 px-3 rounded-lg text-xs font-semibold"
 >
 Personalizar
 </Button>
 </div>
 </div>
 );
 })}
 </div>
 </div>
 )}

 {activeTab === "library" && (
 <div className="space-y-4">
 <div className="p-4 rounded-xl border border-border/80 bg-muted/20 space-y-3">
 <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
 <div>
 <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
 <Gift className="size-4 text-primary" />
 Catálogo Global de Presets Waesy
 </h3>
 <p className="text-xs text-muted-foreground mt-1">
 Explore modelos comerciais de todas as 17 verticais de negócio com importação em 1 clique.
 </p>
 </div>
 </div>

 <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
 <div className="relative">
 <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
 <Input
 placeholder="Buscar por nome, adicional ou descrição..."
 value={librarySearchQuery}
 onChange={(e) => setLibrarySearchQuery(e.target.value)}
 className="h-9 pl-9 text-xs rounded-lg"
 />
 </div>
 <select
 aria-label="Filtrar modelos por nicho de negócio"
 value={libraryNiche}
 onChange={(e) => setLibraryNiche(e.target.value)}
 className="h-9 text-xs rounded-lg border border-border bg-background px-3 text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
 >
 <option value="all">Todas as 17 Verticais de Negócio</option>
 {Object.entries(NICHE_LABELS).map(([k, label]) => (
 <option key={k} value={k}>
 {label}
 </option>
 ))}
 </select>
 </div>
 </div>

 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
 {libraryPresets.map((preset) => {
 const Icon = preset.icon;
 return (
 <div
 key={preset.id || preset.name}
 className="p-4 rounded-xl border border-border/80 bg-card hover:border-primary/50 transition-colors flex flex-col justify-between space-y-4 shadow-2xs"
 >
 <div className="space-y-3">
 <div className="flex items-start justify-between gap-2">
 <div className="flex items-center gap-2">
 <div className="size-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
 <Icon className="size-5" />
 </div>
 <div>
 <h4 className="text-sm font-bold text-foreground">{preset.name}</h4>
 <span className="text-2xs text-muted-foreground">{preset.desc}</span>
 </div>
 </div>
 <Badge variant="outline" className="text-2xs uppercase tracking-wider shrink-0 font-bold">
 {preset.data.selection_type === "single" ? "Única" : "Múltipla"}
 </Badge>
 </div>

 <div className="space-y-2 pt-2 border-t border-border/50">
 <p className="text-2xs font-bold text-muted-foreground uppercase tracking-wider">
 Opções Inclusas ({preset.data.values.length}):
 </p>
 <div className="space-y-1 max-h-32 overflow-y-auto no-scrollbar">
 {preset.data.values.map((val, idx) => (
 <div key={idx} className="flex items-center justify-between text-xs py-1 px-2 rounded-md bg-muted/30">
 <span className="text-foreground font-medium truncate">{val.label}</span>
 <span className="text-muted-foreground font-mono text-2xs shrink-0">
 {val.price_modifier_cents > 0
 ? `+ R$ ${(val.price_modifier_cents / 100).toFixed(2).replace(".", ",")}`
 : "Grátis"}
 </span>
 </div>
 ))}
 </div>
 </div>
 </div>

 <div className="flex items-center gap-2 pt-2 border-t border-border/50">
 <Button
 type="button"
 size="sm"
 onClick={() => handleImportPreset(preset)}
 disabled={isSubmitting}
 className="flex-1 h-11 min-h-11 rounded-lg text-xs font-bold gap-2"
 >
 <Plus className="size-3.5" />
 <span>Importar</span>
 </Button>
 <Button
 type="button"
 variant="outline"
 size="sm"
 onClick={() => {
 applyPreset(preset);
 setOpen(true);
 }}
 className="h-11 min-h-11 px-3 rounded-lg text-xs font-semibold"
 >
 Personalizar
 </Button>
 </div>
 </div>
 );
 })}
 </div>
 </div>
 )}

 {/* SheetPage de Criação / Edição de Grupo de Opções */}
 <SheetPage /* design-lint-ignore DL-15 reason:"onClick pertence a controle interno do slot; o elemento em si nao e interativo" expiry:"2027-12-31" */
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
 className="rounded-lg text-xs font-semibold"
 >
 Cancelar
 </Button>
 <Button
 type="button"
 onClick={form.handleSubmit(onSubmit as any)}
 disabled={isSubmitting}
 className="rounded-lg text-xs font-bold bg-foreground text-background hover:bg-foreground/90 gap-2 h-9"
 >
 {isSubmitting ? (
 <>
 <Loader2 className="size-3.5 animate-spin motion-reduce:animate-none" />
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
 <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
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
 className="flex flex-col items-start p-3 rounded-lg border border-border/80 bg-background hover:bg-muted/40 hover:border-primary/40 transition-colors duration-200 text-left cursor-pointer group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
 >
 <div className="flex items-center gap-2 w-full mb-1">
 <Icon className="size-3.5 text-primary shrink-0" />
 <span className="text-xs font-semibold text-foreground truncate">{preset.name}</span>
 </div>
 <span className="text-xs text-muted-foreground line-clamp-1">{preset.desc}</span>
 </button>
 );
 })}
 </div>
 </div>
 )}

 <div className="grid gap-4">
 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
 <div className="space-y-2">
 <Label className="text-xs font-bold text-foreground">Nome Interno</Label>
 <Input
 {...form.register("internal_name")}
 placeholder={placeholders.groupInternalPlaceholder}
 className="rounded-lg text-xs h-9"
 />
 {form.formState.errors.internal_name && (
 <p className="text-xs text-destructive">
 {form.formState.errors.internal_name.message}
 </p>
 )}
 </div>
 <div className="space-y-2">
 <Label className="text-xs font-bold text-foreground">Nome para o Cliente (Vitrine)</Label>
 <Input
 {...form.register("display_name")}
 placeholder={placeholders.groupNamePlaceholder}
 className="rounded-lg text-xs h-9"
 />
 {form.formState.errors.display_name && (
 <p className="text-xs text-destructive">
 {form.formState.errors.display_name.message}
 </p>
 )}
 </div>
 </div>

 <div className="space-y-2">
 <Label className="text-xs font-bold text-foreground">Instrução / Descrição (Opcional)</Label>
 <Input
 {...form.register("description")}
 placeholder={placeholders.groupDescPlaceholder}
 className="rounded-lg text-xs h-9"
 />
 </div>

 <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
 <div className="space-y-2">
 <Label className="text-xs font-bold text-foreground">Tipo de Seleção</Label>
 <Select
 value={form.watch("selection_type")}
 onValueChange={(val: any) => form.setValue("selection_type", val)}
 >
 <SelectTrigger className="rounded-lg text-xs h-9">
 <SelectValue />
 </SelectTrigger>
 <SelectContent className="rounded-lg">
 <SelectItem value="single">Escolha Única (Radio)</SelectItem>
 <SelectItem value="multiple">Escolha Múltipla (Checkbox)</SelectItem>
 </SelectContent>
 </Select>
 </div>

 <div className="space-y-2">
 <Label className="text-xs font-bold text-foreground">Mínimo de Escolhas</Label>
 <Input
 type="number"
 min={0}
 {...form.register("min_selections", { valueAsNumber: true })}
 className="rounded-lg text-xs h-9"
 />
 </div>

 <div className="space-y-2">
 <Label className="text-xs font-bold text-foreground">Máximo de Escolhas</Label>
 <Input
 type="number"
 min={1}
 {...form.register("max_selections", { valueAsNumber: true })}
 className="rounded-lg text-xs h-9"
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
 <p className="text-xs text-muted-foreground">
 Fotos aparecem na vitrine do produto para o cliente ver o complemento.
 </p>
 </div>
 <Button
 type="button"
 variant="outline"
 size="sm"
 className="rounded-lg text-xs font-bold gap-2 h-8 min-h-11 sm:min-h-0"
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
 <div className="text-xs text-muted-foreground p-6 text-center border border-dashed rounded-lg bg-muted/20">
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
 placeholders={placeholders}
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
 placeholders,
}: {
 index: number;
 form: any;
 onRemove: () => void;
 placeholders?: any;
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
 <div className="flex items-start gap-3 p-4 rounded-lg border border-border/70 bg-card hover:border-border transition-colors duration-200">
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
 <div className="relative size-14 rounded-lg overflow-hidden border border-border/80 group">
 <img src={imageUrl} alt="" className="size-full object-cover" />
 <div className="absolute inset-0 bg-foreground/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
 <button
 type="button"
 onClick={() => fileInputRef.current?.click()}
 className="p-1 rounded-md text-foreground hover:bg-card/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
 title="Trocar Foto"
 >
 <Edit className="size-3" />
 </button>
 <button
 type="button"
 onClick={() => form.setValue(`values.${index}.image_url`, null)}
 className="p-1 rounded-md text-destructive hover:bg-destructive/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
 className="size-14 rounded-lg border border-dashed border-border/80 bg-muted/20 hover:bg-muted/50 flex flex-col items-center justify-center text-muted-foreground hover:text-foreground transition-colors duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
 >
 {isUploading ? (
 <Loader2 className="size-4 animate-spin motion-reduce:animate-none text-primary" />
 ) : (
 <>
 <ImagePlus className="size-4" />
 <span className="text-xs font-semibold mt-1">Foto</span>
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
 <div className="grid flex-1 gap-3">
 <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
 <div className="space-y-1">
 <Label className="text-xs font-bold text-foreground">Nome do Adicional *</Label>
 <Input
 {...form.register(`values.${index}.label`)}
 placeholder={placeholders?.optionLabelPlaceholder || "Nome do adicional / opção *"}
 className="h-8 text-xs rounded-lg"
 />
 </div>
 <div className="space-y-1">
 <Label className="text-xs font-bold text-foreground">Preço Adicional (R$)</Label>
 <CurrencyField
 className="h-8 text-xs rounded-lg"
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
 placeholder={placeholders?.optionDescPlaceholder || "Descrição curta da opção"}
 className="h-7 text-xs rounded-lg text-muted-foreground"
 />
 </div>

 <div className="flex items-center justify-between pt-1 text-xs">
 <div className="flex items-center gap-4">
 <label className="flex items-center gap-2 text-xs font-semibold text-foreground cursor-pointer">
 <Checkbox
 checked={form.watch(`values.${index}.is_default`)}
 onCheckedChange={(c) => form.setValue(`values.${index}.is_default`, !!c)}
 className="rounded-md size-3.5"
 />
 <span>Marcado por Padrão</span>
 </label>
 <label className="flex items-center gap-2 text-xs font-medium text-muted-foreground cursor-pointer">
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
 className="size-7 text-destructive hover:bg-destructive/10 rounded-lg shrink-0 min-h-11 sm:min-h-0 min-w-11 sm:min-w-0"
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
 className="p-1 rounded-md text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
 >
 {isExpanded ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
 </button>
 </TableCell>
 <TableCell>
 <div className="space-y-1">
 <span className="font-bold text-xs text-foreground block">
 {group.display_name}
 </span>
 <span className="text-xs text-muted-foreground font-mono block">
 {group.internal_name}
 </span>
 </div>
 </TableCell>
 <TableCell>
 <Badge variant="outline" className="text-xs font-semibold rounded-lg px-2 py-1">
 {group.selection_type === "single" ? "Única (Radio)" : "Múltipla (Checkbox)"}
 </Badge>
 </TableCell>
 <TableCell className="text-xs text-muted-foreground">
 {group.is_required ? (
 <span className="text-primary font-bold text-xs">Obrigatório (min {group.min_selections})</span>
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
 className="inline-flex items-center justify-center size-6 rounded-md bg-muted text-xs font-bold text-muted-foreground ring-2 ring-background uppercase"
 >
 {v.label?.slice(0, 1) || "•"}
 </div>
 ),
 )}
 </div>
 <button
 type="button"
 className="text-xs text-muted-foreground hover:text-foreground font-semibold cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
 <div className="rounded-lg border border-border/60 bg-card overflow-hidden">
 <Table className="text-xs">
 <TableHeader>
 <TableRow className="bg-transparent border-b">
 <TableHead className="h-8 text-xs font-bold w-12 text-center">Foto</TableHead>
 <TableHead className="h-8 text-xs font-bold">Nome do Adicional</TableHead>
 <TableHead className="h-8 text-xs font-bold w-36">Preço Adicional</TableHead>
 <TableHead className="h-8 text-xs font-bold w-20 text-center">Status</TableHead>
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
