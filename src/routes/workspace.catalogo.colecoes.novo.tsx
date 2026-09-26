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
import { createCollection } from "@/services/admin-catalog.functions";

export const Route = createFileRoute("/workspace/catalogo/colecoes/novo")({
 head: () => ({ meta: [{ title: "Nova Coleção Inteligente | Workspace Waesy" }] }),
 component: NewCollectionPage,
});

function NewCollectionPage() {
 const navigate = useNavigate();
 const [isSubmitting, setIsSubmitting] = useState(false);
 const [coverUrl, setCoverUrl] = useState<string | null>(null);

 const [collectionType, setCollectionType] = useState<"manual" | "automated">("manual");
 const [minDiscountPercent, setMinDiscountPercent] = useState<number>(20);
 const [onlyInStock, setOnlyInStock] = useState<boolean>(true);
 const [badgeText, setBadgeText] = useState<string>("");

 const {
 register,
 handleSubmit,
 setValue,
 watch,
 formState: { errors },
 } = useForm({
 defaultValues: {
 name: "",
 slug: "",
 description: "",
 status: "active",
 },
 });

 const collectionName = watch("name");

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

 const res = await createCollection({
 data: {
 name: values.name.trim(),
 slug: values.slug.trim(),
 description: values.description?.trim() || null,
 cover_url: coverUrl || null,
 status: values.status,
 rules: rulesPayload as any,
 } as any,
 });

 if (res) {
 toast.success("Coleção criada com sucesso!");
 navigate({ to: "/workspace/catalogo/colecoes" });
 }
 } catch (e: any) {
 toast.error(e?.message || "Erro inesperado ao criar coleção");
 } finally {
 setIsSubmitting(false);
 }
 };

 const generateSlug = (val: string) => {
 return val
 .toLowerCase()
 .normalize("NFD")
 .replace(/[\u0300-\u036f]/g, "")
 .replace(/[^a-z0-9]+/g, "-")
 .replace(/^-+|-+$/g, "");
 };

 return (
 <div className="w-full max-w-7xl mx-auto px-0 sm:px-0 space-y-6 pb-20 animate-in fade-in duration-200">
 <PageHeader
 eyebrow="Catálogo"
 title="Nova Coleção"
 actions={<NativeBackButton fallbackHref="/workspace/catalogo/colecoes" />}
 />

 <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
 <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
 {/* Coluna 1 e 2: Dados e Regras */}
 <div className="md:col-span-2 space-y-6">
 {/* 1. Dados Básicos */}
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
 placeholder="Ex: Ofertas da Semana, Queima de Estoque, Mais Vendidos"
 {...register("name", { required: "Nome é obrigatório" })}
 onChange={(e) => {
 register("name").onChange(e);
 if (!watch("slug")) {
 setValue("slug", generateSlug(e.target.value));
 }
 }}
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
 placeholder="ofertas-da-semana"
 {...register("slug", { required: "Slug é obrigatório" })}
 className="h-10 text-xs rounded-xl font-mono"
 />
 </div>

 <div className="space-y-1.5">
 <Label className="text-xs font-bold text-foreground">Status de Exibição</Label>
 <Select
 defaultValue="active"
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

 {/* 2. Tipo de Alimentação da Coleção */}
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

 {/* Configurações de Regras Inteligentes */}
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

 {/* Coluna 3: Capa Visual & Live Preview */}
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

 {/* Live Preview Card */}
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
 {collectionName || "Nome da Coleção"}
 </span>
 <span className="text-[10px] text-muted-foreground font-mono">
 {collectionType === "automated" ? "Regras Inteligentes Ativas" : "Curadoria Manual"}
 </span>
 </div>
 </div>
 </div>
 </div>

 {/* Barra de Ações */}
 <div className="flex items-center justify-end gap-3 pt-4 border-t border-border/40">
 <Button asChild variant="outline" className="rounded-xl text-xs font-bold h-11 px-5">
 <Link to="/workspace/catalogo/colecoes">Cancelar</Link>
 </Button>
 <Button
 type="submit"
 disabled={isSubmitting}
 className="rounded-xl text-xs font-bold h-11 px-6 bg-primary text-primary-foreground"
 >
 {isSubmitting ? "Salvando Coleção..." : "Criar Coleção"}
 </Button>
 </div>
 </form>
 </div>
 );
}
