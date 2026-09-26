import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { NativeBackButton } from "@/components/ui/native-back-button";

import { PageHeader } from "@/components/commerce/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
 Select,
 SelectContent,
 SelectItem,
 SelectTrigger,
 SelectValue,
} from "@/components/ui/select";
import { Surface } from "@/components/ui/surface";
import { ImageUpload } from "@/components/ui/image-upload";
import { createCategory, listCategories } from "@/services/admin-catalog.functions";

export const Route = createFileRoute("/workspace/catalogo/categorias/novo")({
 head: () => ({ meta: [{ title: "Nova Categoria | Workspace Waesy" }] }),
 loader: async () => {
 try {
 const res = await listCategories();
 return res || [];
 } catch {
 return [];
 }
 },
 component: NewCategoryPage,
});

function NewCategoryPage() {
 const existingCategories = Route.useLoaderData();
 const navigate = useNavigate();
 const [isSubmitting, setIsSubmitting] = useState(false);

 const {
 register,
 handleSubmit,
 setValue,
 formState: { errors },
 } = useForm({
 defaultValues: {
 name: "",
 slug: "",
 status: "active",
 parent_id: "none",
 },
 });

 const [coverUrl, setCoverUrl] = useState<string | null>(null);

 const onSubmit = async (values: any) => {
 setIsSubmitting(true);
 try {
 const res = await createCategory({
 data: {
 name: values.name.trim(),
 slug: values.slug.trim(),
 status: values.status,
 parent_id: values.parent_id === "none" ? null : values.parent_id,
 cover_url: coverUrl || undefined,
 },
 });

 if (res) {
 toast.success("Categoria criada com sucesso!");
 navigate({ to: "/workspace/catalogo/categorias" });
 }
 } catch (e: any) {
 toast.error(e?.message || "Erro inesperado ao criar categoria");
 } finally {
 setIsSubmitting(false);
 }
 };

 return (
 <div className="space-y-6 max-w-2xl animate-in fade-in duration-200">
 <PageHeader
 eyebrow="Catálogo"
 title="Nova Categoria"
 actions={<NativeBackButton fallbackHref="/workspace/catalogo/categorias" />}
 />

 <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
 <div className="bg-card rounded-2xl border border-border/60 p-6 space-y-5">
 <div className="pb-3 border-b border-border/40">
 <h3 className="text-sm font-bold text-foreground">Dados da Categoria</h3>
 <p className="text-xs text-muted-foreground">
 Preencha o nome, identificador e hierarquia.
 </p>
 </div>

 <div className="space-y-4">
 <div className="space-y-1.5">
 <Label className="text-xs font-bold text-foreground">Nome da Categoria *</Label>
 <Input
 {...register("name", { required: "Obrigatório" })}
 placeholder="Ex: Roupas Femininas ou Calçados"
 className="rounded-xl text-xs h-9"
 onChange={(e) => {
 register("name").onChange(e);
 const slug = e.target.value
 .toLowerCase()
 .normalize("NFD")
 .replace(/[\u0300-\u036f]/g, "")
 .replace(/[^a-z0-9]+/g, "-")
 .replace(/(^-|-$)+/g, "");
 setValue("slug", slug);
 }}
 />
 {errors.name && <p className="text-xs text-destructive">{String(errors.name.message)}</p>}
 </div>

 <div className="space-y-1.5">
 <Label className="text-xs font-bold text-foreground">Identificador / Slug *</Label>
 <Input {...register("slug", { required: "Obrigatório" })} placeholder="ex: roupas-femininas" className="rounded-xl text-xs h-9" />
 {errors.slug && <p className="text-xs text-destructive">{String(errors.slug.message)}</p>}
 </div>

 <div className="space-y-1.5">
 <Label className="text-xs font-bold text-foreground">Categoria Pai (Hierarquia)</Label>
 <Select defaultValue="none" onValueChange={(v) => setValue("parent_id", v)}>
 <SelectTrigger className="rounded-xl text-xs h-9">
 <SelectValue />
 </SelectTrigger>
 <SelectContent className="rounded-xl">
 <SelectItem value="none" className="text-xs font-medium">Nenhuma (Categoria Principal / Raiz)</SelectItem>
 {existingCategories.map((cat: any) => (
 <SelectItem key={cat.id} value={cat.id} className="text-xs font-medium">
 {cat.name}
 </SelectItem>
 ))}
 </SelectContent>
 </Select>
 </div>

 <div className="space-y-1.5">
 <Label className="text-xs font-bold text-foreground">Status de Exibição</Label>
 <Select defaultValue="active" onValueChange={(v) => setValue("status", v)}>
 <SelectTrigger className="rounded-xl text-xs h-9">
 <SelectValue />
 </SelectTrigger>
 <SelectContent className="rounded-xl">
 <SelectItem value="active" className="text-xs font-medium">Ativa no Catálogo</SelectItem>
 <SelectItem value="inactive" className="text-xs font-medium">Oculta (Rascunho)</SelectItem>
 </SelectContent>
 </Select>
 </div>

 <div className="space-y-1.5">
 <Label className="text-xs font-bold text-foreground">Foto de Capa (Opcional)</Label>
 <div className="max-w-sm">
 <ImageUpload onChange={setCoverUrl} value={coverUrl} bucket="product-media" />
 </div>
 </div>
 </div>
 </div>

 <div className="flex justify-end gap-3">
 <Button type="button" variant="outline" size="sm" className="rounded-xl text-xs font-bold" asChild>
 <Link to="/workspace/catalogo/categorias">Cancelar</Link>
 </Button>
 <Button type="submit" size="sm" disabled={isSubmitting} className="rounded-xl text-xs font-bold bg-primary text-primary-foreground">
 {isSubmitting ? "Salvando..." : "Salvar Categoria"}
 </Button>
 </div>
 </form>
 </div>
 );
}
