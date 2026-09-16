import React, { useState, useEffect } from "react";
import { SheetPage } from "@/components/ui/sheet-page";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import {
 Store,
 Check,
 Loader2,
 Phone,
 Mail,
} from "lucide-react";
import { useRouter } from "@tanstack/react-router";
import { ImageUpload } from "@/components/ui/image-upload";
import { updateStoreDetails } from "@/services/store.functions";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";

import { NICHE_SEMANTICS_REGISTRY } from "@/lib/niche-semantics";

export interface QuickStoreData {
 id: string;
 name: string;
 slug?: string;
 type?: string;
 logo_url?: string | null;
 banner_url?: string | null;
 phone?: string | null;
 email?: string | null;
 city?: string | null;
 state?: string | null;
 address?: string | null;
 cnpj?: string | null;
 description?: string | null;
 status?: "active" | "draft" | "maintenance";
 settings?: Record<string, any>;
}

interface QuickStoreEditorDialogProps {
 open: boolean;
 onOpenChange: (open: boolean) => void;
 store: QuickStoreData | null;
 onSuccess?: () => void;
}

const STORE_TYPES = Object.values(NICHE_SEMANTICS_REGISTRY).map((n) => ({
 value: n.nicheId,
 label: n.name,
}));


export function QuickStoreEditorDialog({
 open,
 onOpenChange,
 store,
 onSuccess,
}: QuickStoreEditorDialogProps) {
 const router = useRouter();
 const [name, setName] = useState("");
 const [slug, setSlug] = useState("");
 const [type, setType] = useState("ecommerce");
 const [description, setDescription] = useState("");
 const [logoUrl, setLogoUrl] = useState<string | null>(null);
 const [bannerUrl, setBannerUrl] = useState<string | null>(null);
 const [phone, setPhone] = useState("");
 const [email, setEmail] = useState("");
 const [city, setCity] = useState("");
 const [state, setState] = useState("");
 const [address, setAddress] = useState("");
 const [cnpj, setCnpj] = useState("");
 const [status, setStatus] = useState<"active" | "draft" | "maintenance">("active");
 const [hideAddressCompletely, setHideAddressCompletely] = useState(false);

 const [isSaving, setIsSaving] = useState(false);

 useEffect(() => {
 if (store) {
 setName(store.name || "");
 setSlug(store.slug || "");
 setType(store.type || "ecommerce");
 setDescription(store.description || "");
 setLogoUrl(store.logo_url || null);
 setBannerUrl(store.banner_url || null);
 setPhone(store.phone || "");
 setEmail(store.email || "");
 setCity(store.city || "");
 setState(store.state || "");
 setAddress(store.address || "");
 setCnpj(store.cnpj || "");
 setStatus(store.status || "active");
 setHideAddressCompletely(
 Boolean(
 store.settings?.hide_address_completely ||
 store.settings?.is_address_public === false ||
 store.settings?.hide_location
 )
 );
 }
 }, [store]);

 const handleSave = async (e: React.FormEvent) => {
 e.preventDefault();
 if (!store?.id) return;

 if (name.trim().length < 2) {
 toast.error("O nome do espaço deve ter pelo menos 2 caracteres.");
 return;
 }

 setIsSaving(true);
 try {
 await updateStoreDetails({
 data: {
 store_id: store.id,
 name: name.trim(),
 slug: slug.trim() || undefined,
 type,
 description: description.trim() || null,
 logo_url: logoUrl?.trim() || null,
 banner_url: bannerUrl?.trim() || null,
 phone: phone.trim() || null,
 email: email.trim() || null,
 city: city.trim() || null,
 state: state.trim().toUpperCase() || null,
 address: address.trim() || null,
 cnpj: cnpj.trim() || null,
 hide_address_completely: hideAddressCompletely,
 is_address_public: !hideAddressCompletely,
 status,
 },
 });

 toast.success(`Informações de "${name}" atualizadas com sucesso!`);
 onOpenChange(false);
 if (onSuccess) onSuccess();
 await router.invalidate();
 } catch (err: any) {
 toast.error(err.message || "Erro ao salvar alterações da loja.");
 } finally {
 setIsSaving(false);
 }
 };

 return (
 <SheetPage
 open={open}
 onOpenChange={onOpenChange}
 title="Configurações da Loja & Espaço"
 description="Altere instantaneamente a identidade visual, dados cadastrais e canais de contato da sua unidade."
 size="lg"
 footer={
 <div className="flex w-full items-center justify-between gap-3">
 <Button
 type="button"
 variant="outline"
 onClick={() => onOpenChange(false)}
 disabled={isSaving}
 className="rounded-xl text-xs font-bold"
 >
 Cancelar
 </Button>

 <Button
 onClick={handleSave}
 disabled={isSaving}
 className="rounded-xl text-xs font-bold gap-1.5 bg-primary text-primary-foreground"
 >
 {isSaving ? (
 <>
 <Loader2 className="size-3.5 animate-spin" />
 <span>Salvando...</span>
 </>
 ) : (
 <>
 <Check className="size-3.5" />
 <span>Salvar Alterações</span>
 </>
 )}
 </Button>
 </div>
 }
 >
 <form onSubmit={handleSave} className="space-y-6 pt-2">
 <Tabs defaultValue="visual" className="w-full">
 <TabsList className="grid grid-cols-3 w-full bg-muted/60 p-1 rounded-2xl mb-4">
 <TabsTrigger value="visual" className="rounded-xl text-xs font-semibold">
 Identidade Visual
 </TabsTrigger>
 <TabsTrigger value="dados" className="rounded-xl text-xs font-semibold">
 Dados Básicos
 </TabsTrigger>
 <TabsTrigger value="contato" className="rounded-xl text-xs font-semibold">
 Contato & Local
 </TabsTrigger>
 </TabsList>

 {/* ABA 1: Identidade Visual */}
 <TabsContent value="visual" className="space-y-5">
 {/* Logotipo */}
 <div className="space-y-2">
 <Label className="text-xs font-bold text-foreground">
 Logotipo / Ícone da Marca (1:1)
 </Label>
 <div className="max-w-xs">
 <ImageUpload
 value={logoUrl}
 onChange={(url) => setLogoUrl(url)}
 variant="avatar"
 aspectPreset="square"
 bucket="cms-media"
 helperText="Upload com recorte 1:1 quadrado"
 />
 </div>
 </div>

 {/* Capa / Banner */}
 <div className="space-y-2">
 <Label className="text-xs font-bold text-foreground">
 Banner de Cabeçalho / Capa Panorâmica
 </Label>
 <div className="w-full">
 <ImageUpload
 value={bannerUrl}
 onChange={(url) => setBannerUrl(url)}
 aspectPreset="widescreen"
 bucket="cms-media"
 helperText="Upload com recorte panorâmico 16:10 para topo da vitrine"
 />
 </div>
 </div>
 </TabsContent>

 {/* ABA 2: Dados Básicos */}
 <TabsContent value="dados" className="space-y-4">
 <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
 <div className="space-y-1.5">
 <Label className="text-xs font-bold text-foreground">Nome do Negócio *</Label>
 <Input
 value={name}
 onChange={(e) => setName(e.target.value)}
 placeholder="Ex: Cantina do Lago"
 className="rounded-xl text-xs h-10"
 required
 />
 </div>

 <div className="space-y-1.5">
 <Label className="text-xs font-bold text-foreground">Slug da Vitrine *</Label>
 <div className="relative">
 <span className="absolute left-3 top-2.5 text-xs font-mono text-muted-foreground">
 usewaesy.com/
 </span>
 <Input
 value={slug}
 onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"))}
 placeholder="cantina-do-lago"
 className="rounded-xl text-xs h-10 pl-28 font-mono font-medium"
 />
 </div>
 </div>
 </div>

 <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
 <div className="space-y-1.5">
 <Label className="text-xs font-bold text-foreground">Segmento / Categoria</Label>
 <Select value={type} onValueChange={setType}>
 <SelectTrigger className="rounded-xl text-xs h-10">
 <SelectValue placeholder="Selecione o segmento" />
 </SelectTrigger>
 <SelectContent className="rounded-2xl">
 {STORE_TYPES.map((t) => (
 <SelectItem key={t.value} value={t.value} className="text-xs">
 {t.label}
 </SelectItem>
 ))}
 </SelectContent>
 </Select>
 </div>

 <div className="space-y-1.5">
 <Label className="text-xs font-bold text-foreground">Status Operacional</Label>
 <Select value={status} onValueChange={(val: any) => setStatus(val)}>
 <SelectTrigger className="rounded-xl text-xs h-10">
 <SelectValue placeholder="Status" />
 </SelectTrigger>
 <SelectContent className="rounded-2xl">
 <SelectItem value="active" className="text-xs text-emerald-600 font-semibold">
 ● Aberto ao Público (Ativo)
 </SelectItem>
 <SelectItem value="maintenance" className="text-xs text-amber-600 font-semibold">
 ● Em Manutenção / Pausado
 </SelectItem>
 <SelectItem value="draft" className="text-xs text-muted-foreground font-semibold">
 ● Rascunho / Configuração
 </SelectItem>
 </SelectContent>
 </Select>
 </div>
 </div>

 <div className="space-y-1.5">
 <Label className="text-xs font-bold text-foreground">Bio / Descrição Comercial</Label>
 <Textarea
 value={description}
 onChange={(e) => setDescription(e.target.value)}
 placeholder="Conte um pouco sobre a história da sua marca, especialidades e diferenciais..."
 rows={3}
 className="rounded-2xl text-xs resize-none"
 />
 </div>
 </TabsContent>

 {/* ABA 3: Contato & Local */}
 <TabsContent value="contato" className="space-y-4">
 <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
 <div className="space-y-1.5">
 <Label className="text-xs font-bold text-foreground flex items-center gap-1">
 <Phone className="size-3 text-primary" />
 WhatsApp / Telefone Comercial
 </Label>
 <Input
 value={phone}
 onChange={(e) => setPhone(e.target.value)}
 placeholder="(49) 99999-9999"
 className="rounded-xl text-xs h-10"
 />
 </div>

 <div className="space-y-1.5">
 <Label className="text-xs font-bold text-foreground flex items-center gap-1">
 <Mail className="size-3 text-primary" />
 E-mail Comercial
 </Label>
 <Input
 type="email"
 value={email}
 onChange={(e) => setEmail(e.target.value)}
 placeholder="contato@minhaloja.com.br"
 className="rounded-xl text-xs h-10"
 />
 </div>
 </div>

 <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
 <div className="sm:col-span-2 space-y-1.5">
 <Label className="text-xs font-bold text-foreground">Endereço Completo</Label>
 <Input
 value={address}
 onChange={(e) => setAddress(e.target.value)}
 placeholder="Rua, número, bairro..."
 className="rounded-xl text-xs h-10"
 />
 </div>

 <div className="space-y-1.5">
 <Label className="text-xs font-bold text-foreground">CNPJ / CPF</Label>
 <Input
 value={cnpj}
 onChange={(e) => setCnpj(e.target.value)}
 placeholder="00.000.000/0001-00"
 className="rounded-xl text-xs h-10"
 />
 </div>
 </div>

 <div className="grid grid-cols-2 gap-3">
 <div className="space-y-1.5">
 <Label className="text-xs font-bold text-foreground">Cidade</Label>
 <Input
 value={city}
 onChange={(e) => setCity(e.target.value)}
 placeholder="São Miguel do Oeste"
 className="rounded-xl text-xs h-10"
 />
 </div>

 <div className="space-y-1.5">
 <Label className="text-xs font-bold text-foreground">Estado (UF)</Label>
 <Input
 value={state}
 maxLength={2}
 onChange={(e) => setState(e.target.value.toUpperCase())}
 placeholder="SC"
 className="rounded-xl text-xs h-10 uppercase font-mono"
 />
 </div>
 </div>

 <div className="flex items-center justify-between p-3.5 rounded-2xl bg-muted/30 border border-border/70">
 <div className="space-y-0.5">
 <Label htmlFor="hide-address-store" className="text-xs font-bold text-foreground cursor-pointer">
 Ocultar endereço completo na visualização pública
 </Label>
 <p className="text-[11px] text-muted-foreground">
 Exibe publicamente apenas Cidade e Estado, preservando rua, número e rotas GPS.
 </p>
 </div>
 <Switch
 id="hide-address-store"
 checked={hideAddressCompletely}
 onCheckedChange={setHideAddressCompletely}
 />
 </div>
 </TabsContent>
 </Tabs>
 </form>
 </SheetPage>
 );
}
