import { createFileRoute, useRouter } from "@tanstack/react-router";
import { Image as ImageIcon, Upload, Eye, Type, Palette, Globe, Loader2, CheckCircle2, AlertCircle, Trash2, Layers, Smartphone, Tablet, Monitor, Phone, Mail, Clock, Instagram, Facebook, Linkedin, Search, MapPin, ShoppingBag, Bell, ArrowRight, ShieldAlert, ChevronLeft } from 'lucide-react';
import { useState, useRef, useMemo } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { getPlatformBrandSettings, updatePlatformBrandSettings } from "@/services/master.functions";
import { uploadBrandAsset } from "@/services/storage.functions";

export const Route = createFileRoute("/admin-master/marca")({
 head: () => ({ meta: [{ title: "Identidade da Marca e CMS | Admin Waesy" }] }),
 loader: async () => {
 try {
 const brand = await getPlatformBrandSettings();
 return { brand };
 } catch {
 return {
 brand: {
 store_id: null,
 platform_name: "Waesy",
 logo_url: null,
 favicon_url: null,
 show_name: true,
 show_logo: true,
 support_email: "contato@usewaesy.com",
 support_whatsapp: "+554988416296",
 support_hours: "Segunda a Sexta, das 08h às 18h",
 login_split_image_url: null,
 login_bg_desktop_url: null,
 login_bg_tablet_url: null,
 login_bg_mobile_url: null,
 social_instagram: "@waesy.app",
 social_facebook: null,
 social_linkedin: null,
 address: null,
 city: null,
 state: null,
 },
 };
 }
 },
 component: AdminMasterMarcaPage,
});

function AdminMasterMarcaPage() {
 const { brand: initialBrand } = ((Route.useLoaderData?.() as any) || {});
 const router = useRouter();

 // Estados dos Campos
 const [platformName, setPlatformName] = useState(initialBrand.platform_name || "Waesy");
 const [showName, setShowName] = useState(initialBrand.show_name !== false);
 const [showLogo, setShowLogo] = useState(initialBrand.show_logo !== false);
 const [logoUrl, setLogoUrl] = useState<string | null>(initialBrand.logo_url || null);
 const [faviconUrl, setFaviconUrl] = useState<string | null>(initialBrand.favicon_url || null);

 // Backgrounds de Login
 const [loginBgDesktopUrl, setLoginBgDesktopUrl] = useState<string | null>(
 initialBrand.login_bg_desktop_url || initialBrand.login_split_image_url || null,
 );
 const [loginBgTabletUrl, setLoginBgTabletUrl] = useState<string | null>(
 initialBrand.login_bg_tablet_url || initialBrand.login_split_image_url || null,
 );
 const [loginBgMobileUrl, setLoginBgMobileUrl] = useState<string | null>(
 initialBrand.login_bg_mobile_url || initialBrand.login_split_image_url || null,
 );

 // Canais de Suporte
 const [supportEmail, setSupportEmail] = useState(initialBrand.support_email || "contato@usewaesy.com");
 const [supportWhatsapp, setSupportWhatsapp] = useState(initialBrand.support_whatsapp || "");
 const [supportHours, setSupportHours] = useState(initialBrand.support_hours || "Segunda a Sexta, das 08h às 18h");
 const [socialInstagram, setSocialInstagram] = useState(initialBrand.social_instagram || "");
 const [socialFacebook, setSocialFacebook] = useState(initialBrand.social_facebook || "");
 const [socialLinkedin, setSocialLinkedin] = useState(initialBrand.social_linkedin || "");

 // Estados de Upload
 const [isUploading, setIsUploading] = useState<Record<string, boolean>>({});
 const [isSubmitting, setIsSubmitting] = useState(false);

 // Estado da Aba do Preview ao Vivo
 const [previewTab, setPreviewTab] = useState<"topbar" | "login" | "browser" | "footer">("topbar");
 const [loginBreakpoint, setLoginBreakpoint] = useState<"desktop" | "tablet" | "mobile">("desktop");

 const logoInputRef = useRef<HTMLInputElement>(null);
 const faviconInputRef = useRef<HTMLInputElement>(null);
 const desktopInputRef = useRef<HTMLInputElement>(null);
 const tabletInputRef = useRef<HTMLInputElement>(null);
 const mobileInputRef = useRef<HTMLInputElement>(null);

 // Verificação de Alterações Pendentes (Dirty State)
 const isDirty = useMemo(() => {
 return (
 platformName !== (initialBrand.platform_name || "Waesy") ||
 showName !== (initialBrand.show_name !== false) ||
 showLogo !== (initialBrand.show_logo !== false) ||
 logoUrl !== (initialBrand.logo_url || null) ||
 faviconUrl !== (initialBrand.favicon_url || null) ||
 loginBgDesktopUrl !== (initialBrand.login_bg_desktop_url || initialBrand.login_split_image_url || null) ||
 loginBgTabletUrl !== (initialBrand.login_bg_tablet_url || initialBrand.login_split_image_url || null) ||
 loginBgMobileUrl !== (initialBrand.login_bg_mobile_url || initialBrand.login_split_image_url || null) ||
 supportEmail !== (initialBrand.support_email || "contato@usewaesy.com") ||
 supportWhatsapp !== (initialBrand.support_whatsapp || "") ||
 supportHours !== (initialBrand.support_hours || "Segunda a Sexta, das 08h às 18h") ||
 socialInstagram !== (initialBrand.social_instagram || "") ||
 socialFacebook !== (initialBrand.social_facebook || "") ||
 socialLinkedin !== (initialBrand.social_linkedin || "")
 );
 }, [
 platformName,
 showName,
 showLogo,
 logoUrl,
 faviconUrl,
 loginBgDesktopUrl,
 loginBgTabletUrl,
 loginBgMobileUrl,
 supportEmail,
 supportWhatsapp,
 supportHours,
 socialInstagram,
 socialFacebook,
 socialLinkedin,
 initialBrand,
 ]);

 // Upload Handler Universal via Server Function
 const handleUpload = async (
 file: File,
 category: "logo" | "favicon" | "login_desktop" | "login_tablet" | "login_mobile",
 setter: (url: string | null) => void,
 ) => {
 setIsUploading((prev) => ({ ...prev, [category]: true }));
 try {
 const reader = new FileReader();
 const base64Promise = new Promise<string>((resolve, reject) => {
 reader.onload = () => resolve(reader.result as string);
 reader.onerror = reject;
 reader.readAsDataURL(file);
 });

 const base64Data = await base64Promise;
 const res = await uploadBrandAsset({
 data: {
 fileName: file.name,
 fileType: file.type || "image/png",
 base64Data,
 category,
 },
 });

 setter(res.url);
 toast.success("Mídia enviada com sucesso!");
 } catch (err: any) {
 toast.error(err?.message || "Erro ao fazer upload da imagem.");
 } finally {
 setIsUploading((prev) => ({ ...prev, [category]: false }));
 }
 };

 // Salvar Configurações Globais
 const handleSave = async () => {
 setIsSubmitting(true);
 try {
 await updatePlatformBrandSettings({
 data: {
 platform_name: platformName.trim(),
 logo_url: logoUrl,
 favicon_url: faviconUrl,
 show_name: showName,
 show_logo: showLogo,
 support_email: supportEmail.trim() || undefined,
 support_whatsapp: supportWhatsapp.trim() || undefined,
 support_hours: supportHours.trim() || undefined,
 login_split_image_url: loginBgDesktopUrl || undefined,
 login_bg_desktop_url: loginBgDesktopUrl || undefined,
 login_bg_tablet_url: loginBgTabletUrl || undefined,
 login_bg_mobile_url: loginBgMobileUrl || undefined,
 social_instagram: socialInstagram.trim() || undefined,
 social_facebook: socialFacebook.trim() || undefined,
 social_linkedin: socialLinkedin.trim() || undefined,
 },
 });
 toast.success("Identidade da marca e configurações propagadas com sucesso!");
 router.invalidate();
 } catch (err: any) {
 toast.error(err?.message || "Erro ao salvar identidade da marca.");
 } finally {
 setIsSubmitting(false);
 }
 };

 return (
 <div className="space-y-6 pb-28">
 {/* ── Cabeçalho do Editor ── */}
 <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-border/40 pb-5">
 <div>
 <div className="flex items-center gap-2">
 <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
 Identidade e Marca Global
 </h1>
 <Badge variant="outline" className="text-[11px] font-mono border-primary/30 text-primary">
 Propagação Bilateral
 </Badge>
 </div>
 <p className="text-xs text-muted-foreground mt-1">
 Identidade visual, branding, favicon e assets da rede
 </p>
 </div>

 {/* Indicador de Status */}
 <div className="flex items-center gap-2">
 {isDirty ? (
 <Badge className="bg-amber-500/10 text-amber-600 border border-amber-500/20 text-xs font-semibold px-3 py-1">
 ● Alterações não salvas
 </Badge>
 ) : (
 <Badge className="bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 text-xs font-semibold px-3 py-1">
 ✓ Sincronizado com o sistema
 </Badge>
 )}
 </div>
 </div>

 {/* ── Grid Principal de 2 Colunas: Formulário à Esquerda + Truthful Preview à Direita ── */}
 <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
 {/* Coluna Esquerda: Formulários de Configuração (7 colunas) */}
 <div className="lg:col-span-7 space-y-6">
 {/* 1. Nome & Exibição na Barra Superior */}
 <div className="p-5 rounded-lg bg-card border border-border/60 space-y-4">
 <div className="flex items-center gap-3">
 <div className="size-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
 <Type className="size-4" />
 </div>
 <div>
 <h2 className="text-sm font-bold text-foreground">Nome e Marca da Cidade</h2>
 <p className="text-[11px] text-muted-foreground">
 Título oficial exibido nos cabeçalhos, títulos de página e metadados SEO.
 </p>
 </div>
 </div>

 <div className="space-y-3 pt-1">
 <div className="space-y-2">
 <Label htmlFor="platform-name" className="text-xs font-bold text-foreground">
 Nome da Plataforma
 </Label>
 <Input
 id="platform-name"
 value={platformName}
 onChange={(e) => setPlatformName(e.target.value)}
 placeholder="Ex: Waesy"
 className="rounded-lg h-10 text-sm font-semibold bg-background"
 />
 </div>

 <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
 <div className="flex items-center justify-between p-3 rounded-lg bg-muted/20 border border-border/40">
 <div>
 <p className="text-xs font-semibold text-foreground">Exibir Nome</p>
 <p className="text-[10px] text-muted-foreground">Texto na barra superior</p>
 </div>
 <Switch checked={showName} onCheckedChange={setShowName} id="show-name-toggle" />
 </div>

 <div className="flex items-center justify-between p-3 rounded-lg bg-muted/20 border border-border/40">
 <div>
 <p className="text-xs font-semibold text-foreground">Exibir Logo</p>
 <p className="text-[10px] text-muted-foreground">Imagem da marca no topo</p>
 </div>
 <Switch checked={showLogo} onCheckedChange={setShowLogo} id="show-logo-toggle" />
 </div>
 </div>
 </div>
 </div>

 {/* 2. Upload de Logomarca Oficial */}
 <div className="p-5 rounded-lg bg-card border border-border/60 space-y-4">
 <div className="flex items-center justify-between">
 <div className="flex items-center gap-3">
 <div className="size-9 rounded-lg bg-info/10 text-info flex items-center justify-center shrink-0">
 <ImageIcon className="size-4" />
 </div>
 <div>
 <h2 className="text-sm font-bold text-foreground">Logomarca da Plataforma</h2>
 <p className="text-[11px] text-muted-foreground">
 PNG transparente, SVG ou WebP • Altura recomendada: 48px
 </p>
 </div>
 </div>
 {logoUrl && (
 <Button
 variant="ghost"
 size="sm"
 onClick={() => setLogoUrl(null)}
 className="text-xs text-destructive hover:bg-destructive/10 h-8 gap-1"
 >
 <Trash2 className="size-3.5" />
 <span>Remover</span>
 </Button>
 )}
 </div>

 <div className="flex flex-col sm:flex-row items-center gap-4 p-4 rounded-lg bg-muted/20 border border-dashed border-border/60">
 <div className="size-20 rounded-lg bg-background border border-border/60 flex items-center justify-center p-2 shrink-0 overflow-hidden shadow-xs">
 {logoUrl ? (
 <img src={logoUrl} alt="Logo" className="size-full object-contain" />
 ) : (
 <span className="text-[10px] font-bold text-muted-foreground text-center">
 Sem Logo
 </span>
 )}
 </div>

 <div className="flex-1 space-y-2 text-center sm:text-left w-full">
 <p className="text-xs font-semibold text-foreground">
 {logoUrl ? "Logomarca personalizada ativa" : "Nenhuma logo enviada"}
 </p>
 <p className="text-[11px] text-muted-foreground">
 A logo é aplicada na barra superior, e-mails transacionais e telas de onboarding.
 </p>

 <input
 ref={logoInputRef}
 type="file"
 accept="image/png,image/svg+xml,image/webp,image/jpeg"
 className="hidden"
 onChange={(e) => {
 const file = e.target.files?.[0];
 if (file) handleUpload(file, "logo", setLogoUrl);
 }}
 />

 <Button
 type="button"
 variant="outline"
 size="sm"
 onClick={() => logoInputRef.current?.click()}
 disabled={isUploading.logo}
 className="rounded-lg text-xs font-semibold h-9 gap-2 cursor-pointer w-full sm:w-auto"
 >
 {isUploading.logo ? (
 <Loader2 className="size-3.5 animate-spin" />
 ) : (
 <Upload className="size-3.5" />
 )}
 <span>{isUploading.logo ? "Enviando logo..." : "Selecionar Logomarca"}</span>
 </Button>
 </div>
 </div>
 </div>

 {/* 3. Upload de Favicon */}
 <div className="p-5 rounded-lg bg-card border border-border/60 space-y-4">
 <div className="flex items-center justify-between">
 <div className="flex items-center gap-3">
 <div className="size-9 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0">
 <Palette className="size-4" />
 </div>
 <div>
 <h2 className="text-sm font-bold text-foreground">Favicon (Ícone do Navegador)</h2>
 <p className="text-[11px] text-muted-foreground">
 ICO, PNG 32×32 ou SVG • Exibido na aba do navegador e favoritos
 </p>
 </div>
 </div>
 {faviconUrl && (
 <Button
 variant="ghost"
 size="sm"
 onClick={() => setFaviconUrl(null)}
 className="text-xs text-destructive hover:bg-destructive/10 h-8 gap-1"
 >
 <Trash2 className="size-3.5" />
 <span>Remover</span>
 </Button>
 )}
 </div>

 <div className="flex flex-col sm:flex-row items-center gap-4 p-4 rounded-lg bg-muted/20 border border-dashed border-border/60">
 <div className="size-12 rounded-lg bg-background border border-border/60 flex items-center justify-center p-2 shrink-0 overflow-hidden shadow-xs">
 {faviconUrl ? (
 <img src={faviconUrl} alt="Favicon" className="size-full object-contain" />
 ) : (
 <Globe className="size-5 text-muted-foreground opacity-40" />
 )}
 </div>

 <div className="flex-1 space-y-2 text-center sm:text-left w-full">
 <p className="text-xs font-semibold text-foreground">
 {faviconUrl ? "Favicon personalizado ativo" : "Favicon padrão da plataforma"}
 </p>

 <input
 ref={faviconInputRef}
 type="file"
 accept="image/png,image/x-icon,image/svg+xml,image/webp"
 className="hidden"
 onChange={(e) => {
 const file = e.target.files?.[0];
 if (file) handleUpload(file, "favicon", setFaviconUrl);
 }}
 />

 <Button
 type="button"
 variant="outline"
 size="sm"
 onClick={() => faviconInputRef.current?.click()}
 disabled={isUploading.favicon}
 className="rounded-lg text-xs font-semibold h-9 gap-2 cursor-pointer w-full sm:w-auto"
 >
 {isUploading.favicon ? (
 <Loader2 className="size-3.5 animate-spin" />
 ) : (
 <Upload className="size-3.5" />
 )}
 <span>{isUploading.favicon ? "Enviando favicon..." : "Selecionar Favicon"}</span>
 </Button>
 </div>
 </div>
 </div>

 {/* 4. Backgrounds Imersivos da Tela de Login (3 Breakpoints) */}
 <div className="p-5 rounded-lg bg-card border border-border/60 space-y-4">
 <div className="flex items-center gap-3">
 <div className="size-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
 <ImageIcon className="size-4" />
 </div>
 <div>
 <h2 className="text-sm font-bold text-foreground">
 Background Imersivo da Tela de Login (3 Breakpoints)
 </h2>
 <p className="text-[11px] text-muted-foreground">
 Imagens recortadas na proporção exata de cada dispositivo para tela cheia fluida sem distorção.
 </p>
 </div>
 </div>

 <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
 {/* Breakpoint 1: Desktop (16:9) */}
 <div className="p-3 rounded-lg bg-muted/20 border border-border/40 space-y-3 flex flex-col justify-between">
 <div className="space-y-2">
 <div className="flex items-center justify-between">
 <span className="text-xs font-bold text-foreground flex items-center gap-1">
 <Monitor className="size-3.5 text-primary" />
 <span>Desktop (16:9)</span>
 </span>
 <span className="text-[10px] font-mono text-muted-foreground">1920×1080</span>
 </div>
 <div className="relative rounded-lg overflow-hidden bg-background aspect-video flex items-center justify-center border border-border/60">
 {loginBgDesktopUrl ? (
 <img src={loginBgDesktopUrl} alt="Desktop" className="size-full object-cover" />
 ) : (
 <span className="text-[10px] text-muted-foreground text-center p-1">Padrão da Cidade</span>
 )}
 </div>
 </div>

 <input
 ref={desktopInputRef}
 type="file"
 accept="image/*"
 className="hidden"
 onChange={(e) => {
 const file = e.target.files?.[0];
 if (file) handleUpload(file, "login_desktop", setLoginBgDesktopUrl);
 }}
 />

 <div className="flex items-center gap-1">
 <Button
 type="button"
 variant="outline"
 size="sm"
 onClick={() => desktopInputRef.current?.click()}
 disabled={isUploading.login_desktop}
 className="flex-1 rounded-lg text-[11px] font-semibold h-8 gap-1 cursor-pointer"
 >
 {isUploading.login_desktop ? (
 <Loader2 className="size-3 animate-spin" />
 ) : (
 <Upload className="size-3" />
 )}
 <span>Desktop</span>
 </Button>
 {loginBgDesktopUrl && (
 <Button
 type="button"
 variant="ghost"
 size="icon"
 onClick={() => setLoginBgDesktopUrl(null)}
 className="size-8 rounded-lg text-destructive hover:bg-destructive/10 shrink-0"
 >
 <Trash2 className="size-3" />
 </Button>
 )}
 </div>
 </div>

 {/* Breakpoint 2: Tablet (4:3) */}
 <div className="p-3 rounded-lg bg-muted/20 border border-border/40 space-y-3 flex flex-col justify-between">
 <div className="space-y-2">
 <div className="flex items-center justify-between">
 <span className="text-xs font-bold text-foreground flex items-center gap-1">
 <Tablet className="size-3.5 text-info" />
 <span>Tablet (4:3)</span>
 </span>
 <span className="text-[10px] font-mono text-muted-foreground">1024×768</span>
 </div>
 <div className="relative rounded-lg overflow-hidden bg-background aspect-[4/3] flex items-center justify-center border border-border/60">
 {loginBgTabletUrl ? (
 <img src={loginBgTabletUrl} alt="Tablet" className="size-full object-cover" />
 ) : (
 <span className="text-[10px] text-muted-foreground text-center p-1">Padrão da Cidade</span>
 )}
 </div>
 </div>

 <input
 ref={tabletInputRef}
 type="file"
 accept="image/*"
 className="hidden"
 onChange={(e) => {
 const file = e.target.files?.[0];
 if (file) handleUpload(file, "login_tablet", setLoginBgTabletUrl);
 }}
 />

 <div className="flex items-center gap-1">
 <Button
 type="button"
 variant="outline"
 size="sm"
 onClick={() => tabletInputRef.current?.click()}
 disabled={isUploading.login_tablet}
 className="flex-1 rounded-lg text-[11px] font-semibold h-8 gap-1 cursor-pointer"
 >
 {isUploading.login_tablet ? (
 <Loader2 className="size-3 animate-spin" />
 ) : (
 <Upload className="size-3" />
 )}
 <span>Tablet</span>
 </Button>
 {loginBgTabletUrl && (
 <Button
 type="button"
 variant="ghost"
 size="icon"
 onClick={() => setLoginBgTabletUrl(null)}
 className="size-8 rounded-lg text-destructive hover:bg-destructive/10 shrink-0"
 >
 <Trash2 className="size-3" />
 </Button>
 )}
 </div>
 </div>

 {/* Breakpoint 3: Mobile (9:16) */}
 <div className="p-3 rounded-lg bg-muted/20 border border-border/40 space-y-3 flex flex-col justify-between">
 <div className="space-y-2">
 <div className="flex items-center justify-between">
 <span className="text-xs font-bold text-foreground flex items-center gap-1">
 <Smartphone className="size-3.5 text-emerald-500" />
 <span>Mobile (9:16)</span>
 </span>
 <span className="text-[10px] font-mono text-muted-foreground">1080×1920</span>
 </div>
 <div className="relative rounded-lg overflow-hidden bg-background aspect-[9/16] max-h-36 mx-auto flex items-center justify-center border border-border/60 w-full">
 {loginBgMobileUrl ? (
 <img src={loginBgMobileUrl} alt="Mobile" className="size-full object-cover" />
 ) : (
 <span className="text-[10px] text-muted-foreground text-center p-1">Padrão da Cidade</span>
 )}
 </div>
 </div>

 <input
 ref={mobileInputRef}
 type="file"
 accept="image/*"
 className="hidden"
 onChange={(e) => {
 const file = e.target.files?.[0];
 if (file) handleUpload(file, "login_mobile", setLoginBgMobileUrl);
 }}
 />

 <div className="flex items-center gap-1">
 <Button
 type="button"
 variant="outline"
 size="sm"
 onClick={() => mobileInputRef.current?.click()}
 disabled={isUploading.login_mobile}
 className="flex-1 rounded-lg text-[11px] font-semibold h-8 gap-1 cursor-pointer"
 >
 {isUploading.login_mobile ? (
 <Loader2 className="size-3 animate-spin" />
 ) : (
 <Upload className="size-3" />
 )}
 <span>Mobile</span>
 </Button>
 {loginBgMobileUrl && (
 <Button
 type="button"
 variant="ghost"
 size="icon"
 onClick={() => setLoginBgMobileUrl(null)}
 className="size-8 rounded-lg text-destructive hover:bg-destructive/10 shrink-0"
 >
 <Trash2 className="size-3" />
 </Button>
 )}
 </div>
 </div>
 </div>
 </div>

 {/* 5. Canais Oficiais de Suporte & Atendimento */}
 <div className="p-5 rounded-lg bg-card border border-border/60 space-y-4">
 <div className="flex items-center gap-3">
 <div className="size-9 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
 <Globe className="size-4" />
 </div>
 <div>
 <h2 className="text-sm font-bold text-foreground">Canais Oficiais de Suporte</h2>
 <p className="text-[11px] text-muted-foreground">
 Exibidos na página pública /contato e nos rodapés institucionais da cidade.
 </p>
 </div>
 </div>

 <div className="space-y-3 pt-1">
 <div className="space-y-2">
 <Label className="text-xs font-bold text-foreground flex items-center gap-2">
 <Mail className="size-3.5 text-muted-foreground" />
 <span>E-mail de Atendimento</span>
 </Label>
 <Input
 value={supportEmail}
 onChange={(e) => setSupportEmail(e.target.value)}
 placeholder="Ex: suporte@usewaesy.com"
 className="rounded-lg h-9 text-xs bg-background"
 />
 </div>

 <div className="space-y-2">
 <Label className="text-xs font-bold text-foreground flex items-center gap-2">
 <Phone className="size-3.5 text-muted-foreground" />
 <span>WhatsApp Oficial de Suporte</span>
 </Label>
 <Input
 value={supportWhatsapp}
 onChange={(e) => setSupportWhatsapp(e.target.value)}
 placeholder="Ex: +55 (49) 99999-9999"
 className="rounded-lg h-9 text-xs bg-background"
 />
 </div>

 <div className="space-y-2">
 <Label className="text-xs font-bold text-foreground flex items-center gap-2">
 <Clock className="size-3.5 text-muted-foreground" />
 <span>Horário de Atendimento</span>
 </Label>
 <Input
 value={supportHours}
 onChange={(e) => setSupportHours(e.target.value)}
 placeholder="Ex: Segunda a Sexta, das 08h às 18h"
 className="rounded-lg h-9 text-xs bg-background"
 />
 </div>

 <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
 <div className="space-y-2">
 <Label className="text-xs font-semibold text-foreground flex items-center gap-2">
 <Instagram className="size-3.5 text-primary" />
 <span>Instagram Oficial</span>
 </Label>
 <Input
 value={socialInstagram}
 onChange={(e) => setSocialInstagram(e.target.value)}
 placeholder="@waesy.app"
 className="rounded-lg h-9 text-xs bg-background"
 />
 </div>

 <div className="space-y-2">
 <Label className="text-xs font-semibold text-foreground flex items-center gap-2">
 <Linkedin className="size-3.5 text-info" />
 <span>LinkedIn Oficial</span>
 </Label>
 <Input
 value={socialLinkedin}
 onChange={(e) => setSocialLinkedin(e.target.value)}
 placeholder="https://linkedin.com/company/waesy"
 className="rounded-lg h-9 text-xs bg-background"
 />
 </div>
 </div>
 </div>
 </div>
 </div>

 {/* Coluna Direita: Truthful Live Preview Real (5 colunas) */}
 <div className="lg:col-span-5">
 <div className="sticky top-6 space-y-4">
 <div className="p-5 rounded-lg bg-card border border-border/60 space-y-4">
 <div className="flex items-center justify-between">
 <div className="flex items-center gap-3">
 <div className="size-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
 <Eye className="size-4" />
 </div>
 <div>
 <h3 className="text-sm font-bold text-foreground">Preview em Tempo Real</h3>
 <p className="text-[10px] text-muted-foreground">Simulação fiel da interface</p>
 </div>
 </div>

 <Badge variant="secondary" className="text-[10px] font-mono">
 Live Sync
 </Badge>
 </div>

 {/* Seletor de Modos de Visualização */}
 <Tabs
 value={previewTab}
 onValueChange={(v) => setPreviewTab(v as any)}
 className="w-full"
 >
 <TabsList className="w-full grid grid-cols-3 sm:grid-cols-3 h-8 p-1 bg-muted/40 rounded-lg">
 <TabsTrigger value="topbar" className="text-[11px] rounded-lg">
 Barra de Topo
 </TabsTrigger>
 <TabsTrigger value="login" className="text-[11px] rounded-lg">
 Tela de Login
 </TabsTrigger>
 <TabsTrigger value="browser" className="text-[11px] rounded-lg">
 Aba e Suporte
 </TabsTrigger>
 </TabsList>

 {/* ── Visualização 1: Barra de Topo Real ── */}
 <TabsContent value="topbar" className="pt-3 space-y-3">
 <div className="rounded-lg bg-background border border-border/60 overflow-hidden shadow-xs">
 {/* Header TopBar */}
 <div className="px-4 py-3 flex items-center justify-between gap-2 border-b border-border/40">
 {/* Logo + Nome */}
 <div className="flex items-center gap-2 shrink-0">
 {showLogo && logoUrl ? (
 <img
 src={logoUrl}
 alt="Logo"
 className="h-6 max-w-[90px] object-contain"
 />
 ) : null}
 {(showName || !logoUrl) && (
 <span className="font-display font-black text-base tracking-tight text-foreground">
 {platformName || "Waesy"}
 </span>
 )}
 {!showLogo && !showName && (
 <span className="text-[10px] text-muted-foreground italic">
 (Sem identificador ativo)
 </span>
 )}
 </div>

 {/* Busca Simulada */}
 <div className="hidden sm:flex flex-1 max-w-[140px] mx-1">
 <div className="w-full flex items-center gap-2 px-3 py-1 rounded-lg bg-muted/40 text-[10px] text-muted-foreground border border-border/30">
 <Search className="size-3" />
 <span>Buscar produtos...</span>
 </div>
 </div>

 {/* Ícones Canônicos */}
 <div className="flex items-center gap-1 shrink-0">
 <div className="size-7 rounded-lg bg-muted/30 border border-border/40 flex items-center justify-center text-muted-foreground">
 <ShoppingBag className="size-3.5" />
 </div>
 <div className="size-7 rounded-lg bg-muted/30 border border-border/40 flex items-center justify-center text-muted-foreground">
 <Bell className="size-3.5" />
 </div>
 <div className="size-7 rounded-lg bg-primary text-primary-foreground flex items-center justify-center text-[10px] font-bold">
 {(platformName?.[0] || "W").toUpperCase()}
 </div>
 </div>
 </div>

 {/* Trilho de Chips */}
 <div className="px-3 py-2 bg-muted/15 flex items-center gap-2 overflow-x-auto no-scrollbar text-[10px]">
 <span className="px-2 py-1 rounded-md bg-background border border-border/40 text-foreground font-medium shrink-0">
 Início
 </span>
 <span className="px-2 py-1 rounded-md bg-background border border-border/40 text-foreground font-medium shrink-0">
 Ofertas
 </span>
 <span className="px-2 py-1 rounded-md bg-background border border-border/40 text-foreground font-medium shrink-0">
 Gastronomia
 </span>
 <span className="px-2 py-1 rounded-md bg-background border border-border/40 text-foreground font-medium shrink-0">
 Mercado
 </span>
 </div>

 <div className="p-3 text-[10px] text-muted-foreground text-center bg-muted/5">
 Visualização real da barra superior em todas as páginas públicas.
 </div>
 </div>
 </TabsContent>

 {/* ── Visualização 2: Tela de Login Real (Interativa com Breakpoints) ── */}
 <TabsContent value="login" className="pt-3 space-y-3">
 <div className="flex items-center justify-between pb-1">
 <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
 Breakpoint Simulado
 </span>
 <div className="flex items-center gap-1">
 <Button
 type="button"
 variant={loginBreakpoint === "desktop" ? "default" : "ghost"}
 size="sm"
 onClick={() => setLoginBreakpoint("desktop")}
 className="h-6 px-2 text-[10px] rounded-md"
 >
 Desktop
 </Button>
 <Button
 type="button"
 variant={loginBreakpoint === "tablet" ? "default" : "ghost"}
 size="sm"
 onClick={() => setLoginBreakpoint("tablet")}
 className="h-6 px-2 text-[10px] rounded-md"
 >
 Tablet
 </Button>
 <Button
 type="button"
 variant={loginBreakpoint === "mobile" ? "default" : "ghost"}
 size="sm"
 onClick={() => setLoginBreakpoint("mobile")}
 className="h-6 px-2 text-[10px] rounded-md"
 >
 Mobile
 </Button>
 </div>
 </div>

 {/* Canvas da Tela de Login */}
 <div
 className={`relative rounded-lg overflow-hidden bg-black border border-border/60 mx-auto transition-all ${
 loginBreakpoint === "desktop"
 ? "aspect-video w-full"
 : loginBreakpoint === "tablet"
 ? "aspect-[4/3] w-full"
 : "aspect-[9/16] max-h-80 w-44"
 }`}
 >
 {/* Imagem de Fundo Real */}
 {loginBreakpoint === "desktop" && loginBgDesktopUrl ? (
 <img
 src={loginBgDesktopUrl}
 alt="Desktop Login"
 className="absolute inset-0 size-full object-cover"
 />
 ) : loginBreakpoint === "tablet" && (loginBgTabletUrl || loginBgDesktopUrl) ? (
 <img
 src={loginBgTabletUrl || loginBgDesktopUrl!}
 alt="Tablet Login"
 className="absolute inset-0 size-full object-cover"
 />
 ) : loginBreakpoint === "mobile" && (loginBgMobileUrl || loginBgTabletUrl || loginBgDesktopUrl) ? (
 <img
 src={loginBgMobileUrl || loginBgTabletUrl || loginBgDesktopUrl!}
 alt="Mobile Login"
 className="absolute inset-0 size-full object-cover"
 />
 ) : (
 <div className="absolute inset-0 size-full bg-gradient-to-br from-zinc-900 to-black flex items-center justify-center p-4">
 <span className="text-[10px] text-white/50 text-center">
 Background padrão ativo (Envie uma foto para customizar)
 </span>
 </div>
 )}

 {/* Overlay Escuro */}
 <div className="absolute inset-0 bg-black/40 backdrop-blur-[0.5px]" />

 {/* Topo do Login */}
 <div className="absolute top-2 left-2 right-2 flex items-center justify-between z-10">
 <div className="px-2 py-1 rounded-lg bg-black/60 backdrop-blur-md border border-white/20 text-white text-[9px] font-bold">
 {platformName || "WAESY"}
 </div>
 <div className="px-2 py-1 rounded-lg bg-black/60 backdrop-blur-md border border-white/20 text-white/80 text-[8px]">
 Voltar
 </div>
 </div>

 {/* Card de Autenticação no Canto */}
 <div className="absolute bottom-2 right-2 left-2 sm:left-auto sm:w-56 p-3 rounded-lg bg-black/85 backdrop-blur-xl border border-white/25 z-10 space-y-2">
 <div className="flex items-center justify-between">
 <span className="text-[10px] font-bold text-white">Acessar Conta</span>
 <Badge className="bg-primary text-primary-foreground text-[8px] px-2 py-0">
 {platformName || "Waesy"}
 </Badge>
 </div>
 <div className="h-6 rounded-md bg-white/10 border border-white/15 px-2 flex items-center justify-between text-[9px] text-white/60">
 <span>E-mail ou CPF...</span>
 <ArrowRight className="size-2.5 text-white" />
 </div>
 </div>
 </div>
 </TabsContent>

 {/* ── Visualização 3: Aba do Navegador & Canais de Suporte ── */}
 <TabsContent value="browser" className="pt-3 space-y-4">
 {/* Mock da Aba do Navegador */}
 <div className="space-y-2">
 <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
 Aba do Navegador
 </p>
 <div className="flex items-center gap-2 bg-muted/40 rounded-lg px-3 py-2 border border-border/50 w-full">
 <div className="size-4 rounded overflow-hidden flex items-center justify-center bg-background border border-border/40 shrink-0">
 {faviconUrl ? (
 <img src={faviconUrl} alt="favicon" className="size-full object-contain" />
 ) : (
 <Globe className="size-2.5 text-muted-foreground" />
 )}
 </div>
 <span className="text-xs text-foreground font-medium truncate flex-1">
 {platformName || "Waesy"} — Waesy
 </span>
 <span className="text-xs text-muted-foreground ml-1">×</span>
 </div>
 </div>

 {/* Card de Suporte & Rodapé */}
 <div className="space-y-2">
 <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
 Canais no Rodapé
 </p>
 <div className="p-4 rounded-lg bg-background border border-border/60 space-y-3 text-xs">
 <div className="flex items-center gap-2 text-foreground font-semibold">
 <Phone className="size-3.5 text-emerald-500" />
 <span>{supportWhatsapp || "Não informado"}</span>
 </div>
 <div className="flex items-center gap-2 text-muted-foreground">
 <Mail className="size-3.5 text-info" />
 <span>{supportEmail || "Não informado"}</span>
 </div>
 <div className="flex items-center gap-2 text-muted-foreground">
 <Clock className="size-3.5 text-amber-500" />
 <span>{supportHours || "Não informado"}</span>
 </div>
 {socialInstagram && (
 <div className="flex items-center gap-2 text-muted-foreground">
 <Instagram className="size-3.5 text-primary" />
 <span>{socialInstagram}</span>
 </div>
 )}
 </div>
 </div>
 </TabsContent>
 </Tabs>
 </div>
 </div>
 </div>
 </div>

 {/* ── Barra de Ação Flutuante Sticky (Salvar Alterações) ── */}
 <div className="fixed bottom-0 left-0 md:left-64 right-0 z-40 bg-background border-t border-border/60 p-4 pb-safe">
 <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
 <div className="flex items-center gap-2">
 <span className="text-xs sm:text-sm font-semibold text-foreground">
 Configurações de Identidade Visual e CMS
 </span>
 {isDirty && (
 <span className="text-xs text-amber-600 font-medium hidden sm:inline">
 (Alterações prontas para publicação)
 </span>
 )}
 </div>

 <div className="flex items-center gap-2">
 <Button
 type="button"
 variant="outline"
 size="sm"
 onClick={() => router.invalidate()}
 disabled={isSubmitting}
 className="rounded-lg text-xs font-semibold h-10 px-4 cursor-pointer"
 >
 Descartar
 </Button>
 <Button
 type="button"
 onClick={handleSave}
 disabled={isSubmitting}
 className="rounded-lg text-xs font-bold h-10 px-6 gap-2 bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer"
 >
 {isSubmitting ? (
 <Loader2 className="size-4 animate-spin" />
 ) : (
 <CheckCircle2 className="size-4" />
 )}
 <span>{isSubmitting ? "Propagando..." : "Salvar Alterações"}</span>
 </Button>
 </div>
 </div>
 </div>
 </div>
 );
}
