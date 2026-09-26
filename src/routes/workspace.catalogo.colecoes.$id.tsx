import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Layers, Check, Tag } from "lucide-react";
import { NativeBackButton } from "@/components/ui/native-back-button";

import { PageHeader } from "@/components/commerce/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
 Select,
 SelectContent,
 SelectItem,
 SelectTrigger,
 SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { ImageUpload } from "@/components/ui/image-upload";
import { getCollectionById, updateCollection } from "@/services/admin-catalog.functions";

export const Route = createFileRoute("/workspace/catalogo/colecoes/$id")({
  head: ({ loaderData }) => ({ meta: [{ title: `${(loaderData as any)?.collection?.name || (loaderData as any)?.name || "Coleção"} | Workspace Waesy` }] }),
  loader: async ({ params }): Promise<any> => {
    try {
      const res = await getCollectionById({ data: { id: params.id } });
      return { collection: res || null };
    } catch {
      return { collection: null };
    }
  },
  component: EditCollectionPage,
});

function EditCollectionPage() {
  const loaderData = (Route.useLoaderData() as any) || {};
  const collection = loaderData.collection || (loaderData.id ? loaderData : null);
 const navigate = useNavigate();
 const [isSubmitting, setIsSubmitting] = useState(false);

  const initialRules = collection?.rules || {};
  const [collectionType, setCollectionType] = useState<"manual" | "automated">(
    initialRules.type === "automated" ? "automated" : "manual",
  );
  const [minDiscountPercent, setMinDiscountPercent] = useState<number>(
    initialRules.min_discount_percent ?? 20,
  );
  const [onlyInStock, setOnlyInStock] = useState<boolean>(
    initialRules.only_in_stock ?? true,
  );
  const [badgeText, setBadgeText] = useState<string>(
    initialRules.badge_text || "",
  );
  const [coverUrl, setCoverUrl] = useState<string | null>(collection?.cover_url || collection?.image_url || null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm({
    defaultValues: {
      name: collection?.name || "",
      slug: collection?.slug || "",
      description: collection?.description || "",
      status: collection?.status || "active",
    },
  });

  if (!collection) {
    return (
      <div className="p-8 text-center space-y-3">
        <h2 className="text-base font-bold text-foreground">Coleção não encontrada</h2>
        <Button asChild variant="outline" size="sm">
          <Link to="/workspace/catalogo/colecoes">Voltar para Coleções</Link>
        </Button>
      </div>
    );
  }

 const onSubmit = async (values: any) => {
 setIsSubmitting(true);
 try {
 const rulesPayload =
 collectionType === "automated"
 ? {
 type: "automated",
 min_discount_percent: minDiscountPercent,
 only_in_stock: onlyInStock,
 badge_text: badgeText.trim() || undefined,
 }
 : {
 type: "manual",
 badge_text: badgeText.trim() || undefined,
 };

 const res = await updateCollection({
 data: {
 id: collection.id,
 name: values.name.trim(),
 slug: values.slug.trim(),
 description: values.description?.trim() || null,
 cover_url: coverUrl || null,
 status: values.status,
 rules: rulesPayload as any,
 } as any,
 });

 if (res) {
 toast.success("Coleção atualizada com sucesso!");
 navigate({ to: "/workspace/catalogo/colecoes" });
 }
 } catch (e: any) {
 toast.error(e?.message || "Erro inesperado ao salvar alterações");
 } finally {
 setIsSubmitting(false);
 }
 };

 return (
 <div className="space-y-6 max-w-4xl animate-in fade-in duration-200">
 <PageHeader
 eyebrow="Catálogo"
 title={`Editar Coleção: ${collection.name}`}
 actions={<NativeBackButton fallbackHref="/workspace/catalogo/colecoes" />}
 />

 <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
 <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
 <div className="md:col-span-2 space-y-6">
 <div className="bg-card rounded-2xl border border-border/60 p-6 space-y-4">
 <div className="pb-3 border-b border-border/40">
 <h3 className="text-sm font-bold text-foreground">Dados Básicos da Coleção</h3>
 <p className="text-xs text-muted-foreground mt-0.5">
 Defina o nome, identificador na URL e descrição.
 </p>
 </div>

 <div className="space-y-4">
 <div className="space-y-1.5">
 <Label className="text-xs font-bold text-foreground">Nome da Coleção *</Label>
 <Input
 {...register("name", { required: "Nome é obrigatório" })}
 className="h-10 text-xs rounded-xl"
 />
 {errors.name && (
 <span className="text-[11px] text-destructive font-medium block">
 {String(errors.name.message)}
 </span>
 )}
 </div>

 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
 <div className="space-y-1.5">
 <Label className="text-xs font-bold text-foreground">Slug da URL *</Label>
 <Input
 {...register("slug", { required: "Slug é obrigatório" })}
 className="h-10 text-xs rounded-xl font-mono"
 />
 </div>

 <div className="space-y-1.5">
 <Label className="text-xs font-bold text-foreground">Status de Exibição</Label>
 <Select
 defaultValue={collection.status || "active"}
 onValueChange={(val) => setValue("status", val)}
 >
 <SelectTrigger className="h-10 text-xs rounded-xl">
 <SelectValue placeholder="Selecione o status" />
 </SelectTrigger>
 <SelectContent className="rounded-xl">
 <SelectItem value="active">● Ativa na Vitrine</SelectItem>
 <SelectItem value="inactive">● Inativa / Oculta</SelectItem>
 </SelectContent>
 </Select>
 </div>
 </div>

 <div className="space-y-1.5">
 <Label className="text-xs font-bold text-foreground">Selo / Badge Promocional</Label>
 <Input
 placeholder="Ex: 20% OFF, LIMITADO, EXCLUSIVO"
 value={badgeText}
 onChange={(e) => setBadgeText(e.target.value.toUpperCase())}
 className="h-10 text-xs rounded-xl font-mono uppercase"
 />
 <p className="text-[11px] text-muted-foreground">
 Selo tátil exibido em cima dos cards na vitrine pública.
 </p>
 </div>

 <div className="space-y-1.5">
 <Label className="text-xs font-bold text-foreground">Descrição / Apresentação</Label>
 <Textarea
 placeholder="Conte sobre o conceito desta coleção..."
 rows={3}
 {...register("description")}
 className="text-xs rounded-xl"
 />
 </div>
 </div>
 </div>

 <div className="bg-card rounded-2xl border border-border/60 p-6 space-y-4">
 <div className="pb-3 border-b border-border/40">
 <h3 className="text-sm font-bold text-foreground">Tipo de Coleção & Regras de Inclusão</h3>
 <p className="text-xs text-muted-foreground mt-0.5">
 Escolha se os itens são adicionados individualmente ou calculados automaticamente.
 </p>
 </div>

 <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
 <button
 type="button"
 onClick={() => setCollectionType("manual")}
 className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${
 collectionType === "manual"
 ? "border-primary bg-primary/5 ring-1 ring-primary"
 : "border-border/60 bg-muted/20 hover:bg-muted/40"
 }`}
 >
 <div className="flex items-center justify-between mb-1.5">
 <span className="text-xs font-bold text-foreground">Curadoria Manual</span>
 {collectionType === "manual" && <Check className="size-4 text-primary" />}
 </div>
 <p className="text-[11px] text-muted-foreground leading-relaxed">
 Você escolhe e organiza os produtos individualmente na coleção.
 </p>
 </button>

 <button
 type="button"
 onClick={() => setCollectionType("automated")}
 className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${
 collectionType === "automated"
 ? "border-primary bg-primary/5 ring-1 ring-primary"
 : "border-border/60 bg-muted/20 hover:bg-muted/40"
 }`}
 >
 <div className="flex items-center justify-between mb-1.5">
 <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
 <Layers className="size-3.5 text-primary" />
 <span>Coleção Inteligente</span>
 </span>
 {collectionType === "automated" && <Check className="size-4 text-primary" />}
 </div>
 <p className="text-[11px] text-muted-foreground leading-relaxed">
 Produtos entram e saem dinamicamente baseado em descontos e regras.
 </p>
 </button>
 </div>

 {collectionType === "automated" && (
 <div className="mt-4 p-4 rounded-xl bg-muted/30 border border-border/60 space-y-4">
 <div className="flex items-center justify-between">
 <div>
 <span className="text-xs font-bold text-foreground block">
 Desconto Mínimo Obrigatório
 </span>
 <span className="text-[11px] text-muted-foreground">
 Apenas produtos com no mínimo {minDiscountPercent}% de desconto entrarão.
 </span>
 </div>
 <div className="flex items-center gap-1">
 <Input
 type="number"
 min={0}
 max={90}
 value={minDiscountPercent}
 onChange={(e) => setMinDiscountPercent(Number(e.target.value))}
 className="w-16 h-8 text-xs font-mono font-bold text-center rounded-lg"
 />
 <span className="text-xs font-bold text-muted-foreground">%</span>
 </div>
 </div>

 <div className="h-px bg-border/40" />

 <div className="flex items-center justify-between">
 <div>
 <span className="text-xs font-bold text-foreground block">
 Apenas Produtos em Estoque
 </span>
 <span className="text-[11px] text-muted-foreground">
 Oculta automaticamente produtos que esgotarem o estoque.
 </span>
 </div>
 <Switch checked={onlyInStock} onCheckedChange={setOnlyInStock} />
 </div>
 </div>
 )}
 </div>
 </div>

 <div className="space-y-6">
 <div className="bg-card rounded-2xl border border-border/60 p-5 space-y-4">
 <h3 className="text-xs font-bold text-foreground">Capa da Coleção (Banner)</h3>
 <ImageUpload
 value={coverUrl}
 onChange={setCoverUrl}
 aspectPreset="widescreen"
 bucket="product-media"
 helperText="Upload com recorte panorâmico 16:10 para exibição na vitrine"
 />
 </div>

 <div className="bg-card rounded-2xl border border-border/60 p-5 space-y-3">
 <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-muted-foreground block">
 Pré-visualização do Selo
 </span>

 <div className="relative rounded-xl bg-muted/40 aspect-video overflow-hidden border border-border/60 flex items-center justify-center">
 {coverUrl ? (
 <img src={coverUrl} alt="Preview" className="size-full object-cover" />
 ) : (
 <div className="text-center p-4">
 <Tag className="size-6 text-muted-foreground/50 mx-auto mb-1" />
 <span className="text-[11px] text-muted-foreground">Sem imagem</span>
 </div>
 )}

 {badgeText && (
 <div className="absolute top-2 left-2">
 <Badge className="bg-foreground text-background font-mono text-[9px] font-bold">
 {badgeText}
 </Badge>
 </div>
 )}
 </div>

 <div className="space-y-0.5">
 <span className="text-xs font-bold text-foreground block truncate">
 {watch("name") || "Nome da Coleção"}
 </span>
 <span className="text-[10px] text-muted-foreground font-mono">
 {collectionType === "automated" ? "Regras Inteligentes Ativas" : "Curadoria Manual"}
 </span>
 </div>
 </div>
 </div>
 </div>

 <div className="flex items-center justify-end gap-3 pt-4 border-t border-border/40">
 <Button asChild variant="outline" className="rounded-xl text-xs font-bold h-11 px-5">
 <Link to="/workspace/catalogo/colecoes">Cancelar</Link>
 </Button>
 <Button
 type="submit"
 disabled={isSubmitting}
 className="rounded-xl text-xs font-bold h-11 px-6 bg-primary text-primary-foreground"
 >
 {isSubmitting ? "Salvando Alterações..." : "Salvar Coleção"}
 </Button>
 </div>
 </form>
 </div>
 );
}
