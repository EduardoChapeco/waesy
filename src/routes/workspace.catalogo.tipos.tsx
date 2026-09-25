import { createFileRoute, useRouter } from "@tanstack/react-router";
import { Plus, MoreHorizontal, Edit, Trash2, Search } from "lucide-react";
import { useState, useMemo } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";

import { PageHeader } from "@/components/commerce/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
 Table,
 TableBody,
 TableCell,
 TableHead,
 TableHeader,
 TableRow,
} from "@/components/ui/table";
import {
 Sheet,
 SheetContent,
 SheetFooter,
 SheetHeader,
 SheetTitle,
} from "@/components/ui/sheet";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
 Select,
 SelectContent,
 SelectItem,
 SelectTrigger,
 SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { EmptyState } from "@/components/state/states";
import {
 DropdownMenu,
 DropdownMenuContent,
 DropdownMenuItem,
 DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatDate } from "@/lib/datetime";
import { CrudActionsMenu } from "@/components/ui/crud-actions-menu";

import {
 listProductTypes,
 createProductType,
 updateProductType,
 deleteProductType,
} from "@/services/admin-catalog.functions";

const fieldSchemaObj = z.object({
 name: z.string().min(1, "Obrigatório"),
 kind: z.enum(["text", "number", "boolean", "select_single", "option_group"]),
 required: z.boolean(),
 options: z.array(z.string()).optional(),
});

const formSchema = z.object({
 name: z.string().min(1, "Nome é obrigatório"),
 slug: z.string().regex(/^[a-z0-9-]+$/, "Apenas letras minúsculas, números e hífens"),
 fields: z.array(fieldSchemaObj),
});

type FormValues = z.infer<typeof formSchema>;

export const Route = createFileRoute("/workspace/catalogo/tipos")({
 head: () => ({ meta: [{ title: "Tipos de Produto | Workspace Waesy" }] }),
 loader: async () => {
 try {
 const res = await listProductTypes();
 return res || [];
 } catch {
 return [];
 }
 },
 component: ProductTypesPage,
});

function ProductTypesPage() {
 const types = Route.useLoaderData();
 const router = useRouter();
 const [open, setOpen] = useState(false);
 const [isSubmitting, setIsSubmitting] = useState(false);
 const [editingType, setEditingType] = useState<any | null>(null);
 const [searchQuery, setSearchQuery] = useState("");

 const filteredTypes = useMemo(() => {
 return types.filter(
 (t: any) =>
 t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
 t.slug.toLowerCase().includes(searchQuery.toLowerCase()),
 );
 }, [types, searchQuery]);

 const form = useForm<FormValues>({
 resolver: zodResolver(formSchema),
 defaultValues: {
 name: "",
 slug: "",
 fields: [],
 },
 });

 const { fields, append, remove } = useFieldArray({
 control: form.control,
 name: "fields",
 });

 const onSubmit = async (values: FormValues) => {
 setIsSubmitting(true);
 try {
 if (editingType) {
 const res = await updateProductType({
 data: {
 id: editingType.id,
 name: values.name,
 slug: values.slug,
 field_schema: values.fields,
 },
 });
 if (res) {
 toast.success("Tipo de produto atualizado!");
 setOpen(false);
 setEditingType(null);
 form.reset();
 router.invalidate();
 } else {
 toast.error(res.message || "Erro ao atualizar tipo");
 }
 } else {
 const res = await createProductType({
 data: {
 name: values.name,
 slug: values.slug,
 field_schema: values.fields,
 },
 });

 if (res) {
 toast.success("Tipo de produto criado com sucesso!");
 setOpen(false);
 form.reset();
 router.invalidate();
 } else {
 toast.error(res.message || "Erro ao criar tipo");
 }
 }
 } catch (e: unknown) {
 toast.error("Erro inesperado");
 } finally {
 setIsSubmitting(false);
 }
 };

 const handleOpenNew = () => {
 setEditingType(null);
 form.reset({ name: "", slug: "", fields: [] });
 setOpen(true);
 };

 const handleOpenEdit = (type: any) => {
 setEditingType(type);
 form.reset({
 name: type.name,
 slug: type.slug,
 fields: Array.isArray(type.field_schema) ? type.field_schema : [],
 });
 setOpen(true);
 };

 const handleDelete = async (id: string) => {
		try {
 await deleteProductType({ data: { id } });
 toast.success("Tipo de produto excluído!");
 router.invalidate();
 } catch {
 toast.error("Erro ao excluir tipo");
 }
 };

 return (
 <div className="space-y-6 animate-in fade-in duration-200">
 <PageHeader
 eyebrow="Catálogo"
 title="Tipos de Produto"
 actions={
 <Button
 onClick={handleOpenNew}
 size="sm"
 className="rounded-xl text-xs font-bold gap-1.5 bg-primary text-primary-foreground shrink-0"
 >
 <Plus className="size-3.5" aria-hidden />
 <span>Novo Tipo</span>
 </Button>
 }
 />

 <Sheet
 open={open}
 onOpenChange={(val) => {
 setOpen(val);
 if (!val) setEditingType(null);
 }}
 >
 <SheetContent side="right" className="max-w-2xl overflow-y-auto no-scrollbar p-6 bg-card">
 <SheetHeader className="space-y-1.5 pb-4">
 <SheetTitle className="text-lg font-bold text-foreground">
 {editingType ? "Editar tipo de produto" : "Criar tipo de produto"}
 </SheetTitle>
 </SheetHeader>
 <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 pt-5">
 <div className="grid grid-cols-2 gap-4">
 <div className="space-y-1.5">
 <Label htmlFor="name" className="text-xs font-bold text-foreground">Nome do Tipo *</Label>
 <Input
 id="name"
 placeholder="Ex: Tênis ou Vestuário"
 className="rounded-xl text-xs h-9"
 {...form.register("name")}
 onChange={(e) => {
 form.register("name").onChange(e);
 const slug = e.target.value
 .toLowerCase()
 .normalize("NFD")
 .replace(/[\u0300-\u036f]/g, "")
 .replace(/[^a-z0-9]+/g, "-")
 .replace(/(^-|-$)+/g, "");
 form.setValue("slug", slug);
 }}
 />
 {form.formState.errors.name && (
 <p className="text-xs text-destructive">
 {form.formState.errors.name.message}
 </p>
 )}
 </div>
 <div className="space-y-1.5">
 <Label htmlFor="slug" className="text-xs font-bold text-foreground">Identificador / Slug *</Label>
 <Input id="slug" placeholder="ex: tenis" className="rounded-xl text-xs h-9" {...form.register("slug")} />
 {form.formState.errors.slug && (
 <p className="text-xs text-destructive">
 {form.formState.errors.slug.message}
 </p>
 )}
 </div>
 </div>

 <div className="space-y-4">
 <div className="flex items-center justify-between pb-2">
 <div>
 <h4 className="text-xs font-bold text-foreground">Campos Dinâmicos & Grades</h4>
 <p className="text-[11px] text-muted-foreground">Atributos que produtos deste tipo possuirão.</p>
 </div>
 <Button
 type="button"
 variant="outline"
 size="sm"
 className="rounded-xl text-xs font-bold gap-1"
 onClick={() => append({ name: "", kind: "text", required: false })}
 >
 <Plus className="size-3" />
 Adicionar Campo
 </Button>
 </div>

 {fields.length === 0 ? (
 <p className="text-xs text-muted-foreground text-center py-6 border-0 rounded-2xl bg-muted/20">
 Nenhum campo dinâmico adicionado ainda.
 </p>
 ) : (
 <div className="space-y-3">
 {fields.map((field, index) => (
 <div
 key={field.id}
 className="flex items-start gap-4 p-4 bg-muted/20 rounded-2xl relative"
 >
 <Button
 type="button"
 variant="ghost"
 size="icon"
 className="absolute right-2 top-2 size-6 text-rose-500 hover:bg-rose-500/10 rounded-lg"
 onClick={() => remove(index)}
 >
 <Trash2 className="size-3.5" />
 </Button>
 <div className="grid flex-1 grid-cols-1 md:grid-cols-3 gap-3">
 <div className="space-y-1">
 <Label className="text-[11px] font-bold">Nome do campo</Label>
 <Input
 placeholder="Ex: Material ou Voltagem"
 className="rounded-xl text-xs h-8"
 {...form.register(`fields.${index}.name`)}
 />
 </div>
 <div className="space-y-1">
 <Label className="text-[11px] font-bold">Tipo de dado</Label>
 <Select
 onValueChange={(val) =>
 form.setValue(
 `fields.${index}.kind`,
 val as
 | "text"
 | "number"
 | "boolean"
 | "select_single"
 | "option_group",
 )
 }
 defaultValue={field.kind}
 >
 <SelectTrigger className="rounded-xl text-xs h-8">
 <SelectValue />
 </SelectTrigger>
 <SelectContent className="rounded-xl">
 <SelectItem value="text" className="text-xs">Texto livre</SelectItem>
 <SelectItem value="number" className="text-xs">Número</SelectItem>
 <SelectItem value="boolean" className="text-xs">Verdadeiro/Falso</SelectItem>
 <SelectItem value="select_single" className="text-xs">Seleção única</SelectItem>
 <SelectItem value="option_group" className="text-xs">
 Matriz de Variações (Grade)
 </SelectItem>
 </SelectContent>
 </Select>
 </div>
 <div className="space-y-1">
 <div className="flex items-center space-x-2 pt-5">
 <Checkbox
 id={`req-${index}`}
 onCheckedChange={(checked) =>
 form.setValue(`fields.${index}.required`, !!checked)
 }
 />
 <Label htmlFor={`req-${index}`} className="text-xs font-semibold">
 Obrigatório
 </Label>
 </div>
 </div>
 {form.watch(`fields.${index}.kind`) === "option_group" && (
 <div className="space-y-1 md:col-span-3">
 <Label className="text-[10px] text-muted-foreground font-bold">
 Valores permitidos (separados por vírgula)
 </Label>
 <Input
 placeholder="Ex: 34, 35, 36, Preto, Branco"
 className="rounded-xl text-xs h-8"
 onChange={(e) => {
 const opts = e.target.value
 .split(",")
 .map((s) => s.trim())
 .filter(Boolean);
 form.setValue(`fields.${index}.options`, opts);
 }}
 />
 </div>
 )}
 </div>
 </div>
 ))}
 </div>
 )}
 </div>

 <SheetFooter className="pt-4 flex justify-end gap-2">
 <Button type="button" variant="outline" size="sm" className="rounded-xl text-xs font-bold" onClick={() => setOpen(false)}>
 Cancelar
 </Button>
 <Button type="submit" size="sm" disabled={isSubmitting} className="rounded-xl text-xs font-bold bg-primary text-primary-foreground">
 {isSubmitting ? "Salvando..." : "Salvar Tipo"}
 </Button>
 </SheetFooter>
 </form>
 </SheetContent>
 </Sheet>


 <div className="flex items-center gap-3">
 <div className="relative flex-1 max-w-sm">
 <Search className="absolute left-3 top-2.5 size-3.5 text-muted-foreground" aria-hidden />
 <Input
 type="search"
 placeholder="Buscar por nome ou identificador..."
 className="pl-8 text-xs h-9 rounded-xl w-full"
 value={searchQuery}
 onChange={(e) => setSearchQuery(e.target.value)}
 />
 </div>
 </div>

 {filteredTypes.length === 0 ? (
 <EmptyState title="Nenhum tipo de produto cadastrado" />
 ) : (
 <div className="bg-card rounded-2xl border border-border/60 overflow-hidden">
 <div className="overflow-x-auto no-scrollbar">
 <Table>
 <TableHeader>
 <TableRow className="bg-muted/30 border-b border-border/40">
 <TableHead className="text-xs font-bold text-foreground">Nome do Tipo</TableHead>
 <TableHead className="text-xs font-bold text-foreground">Slug</TableHead>
 <TableHead className="text-xs font-bold text-foreground">Campos & Atributos</TableHead>
 <TableHead className="text-xs font-bold text-foreground">Criado em</TableHead>
 <TableHead className="w-[80px] text-right text-xs font-bold text-foreground">Ações</TableHead>
 </TableRow>
 </TableHeader>
 <TableBody>
 {filteredTypes.map(
 (type: {
 id: string;
 name: string;
 slug: string;
 field_schema: unknown;
 created_at: string;
 }) => (
 <TableRow key={type.id} className="hover:bg-muted/20 transition-colors">
 <TableCell className="font-bold text-xs text-foreground">
 {type.name}
 </TableCell>
 <TableCell className="text-muted-foreground font-mono text-xs">
 {type.slug}
 </TableCell>
 <TableCell>
 <Badge variant="secondary" className="text-[11px] font-bold rounded-lg bg-muted border-border">
 {Array.isArray(type.field_schema) ? type.field_schema.length : 0} {Array.isArray(type.field_schema) && type.field_schema.length === 1 ? "campo" : "campos"}
 </Badge>
 </TableCell>
 <TableCell className="text-muted-foreground text-xs">
 {formatDate(type.created_at)}
 </TableCell>
 <TableCell className="text-right">
									<CrudActionsMenu
										entityName="Tipo de Produto"
										onEdit={() => handleOpenEdit(type)}
										onDelete={() => handleDelete(type.id)}
										deleteConfirmTitle={`Excluir tipo "${type.name}"?`}
										deleteConfirmDescription="Esta ação pode quebrar a associação de produtos que usam este tipo no catálogo."
									/>
								</TableCell>
 </TableRow>
 ),
 )}
 </TableBody>
 </Table>
 </div>
 </div>
 )}
 </div>
 );
}
