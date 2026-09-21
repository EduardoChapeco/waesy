import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Store, Save, Loader2, Building2, Phone, Mail, MapPin, Clock, ShieldCheck, CreditCard, FileText, Upload, Image as ImageIcon, Check, CheckCircle2, ExternalLink, ChevronRight, Layers, Plus, Trash2, HelpCircle, ListChecks } from 'lucide-react';
import {
 getStoreSettings,
 saveStoreSettings,
 getWorkingHours,
 saveWorkingHours,
 getPolicies,
 savePolicies,
} from "@/services/store.functions";
import {
 listManualPaymentMethods,
 saveManualPaymentMethod,
 deleteManualPaymentMethod,
} from "@/services/payment.functions";
import { uploadStoreMedia } from "@/services/storage.functions";
import { PageHeader } from "@/components/commerce/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ImageUpload } from "@/components/ui/image-upload";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CitySelect } from "@/components/ui/city-select";
import { ThemeSelector } from "@/components/settings/theme-selector";
import { BusinessHoursEditor } from "@/components/commerce/business-hours-editor";
import { NeighborhoodsManager } from "@/components/commerce/neighborhoods-manager";
import {
 DeliveryTimeAndRadiusMatrix,
 type DeliveryLogisticsConfig,
} from "@/components/commerce/delivery-time-and-radius-matrix";
import { CHAPECO_NEIGHBORHOODS, type NeighborhoodPreset } from "@/lib/constants/cities";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { getNicheSemantics } from "@/lib/niche-semantics";

export const Route = createFileRoute("/workspace/configuracoes/")({
 head: () => ({ meta: [{ title: "Configurações da Loja & Perfil Comercial | Workspace Waesy" }] }),
 loader: async () => {
 try {
 const [settingsRes, hoursRes, policiesRes, manualMethodsRes] = await Promise.all([
 getStoreSettings().catch(() => null),
 getWorkingHours().catch(() => null),
 getPolicies().catch(() => null),
 listManualPaymentMethods().catch(() => []),
 ]);
 return {
 store: settingsRes,
 workingHours: hoursRes,
 policies: policiesRes?.policies || {},
 manualMethods: manualMethodsRes || [],
 };
 } catch {
 return {
 store: null,
 workingHours: null,
 policies: {},
 manualMethods: [],
 };
 }
 },
 component: WorkspaceConfiguracoesPage,
});

const DAYS_MAP = [
 { key: "mon", label: "Segunda-feira" },
 { key: "tue", label: "Terça-feira" },
 { key: "wed", label: "Quarta-feira" },
 { key: "thu", label: "Quinta-feira" },
 { key: "fri", label: "Sexta-feira" },
 { key: "sat", label: "Sábado" },
 { key: "sun", label: "Domingo" },
];

export function getDefaultModulesForNiche(nicheId: string): string[] {
  const baseCorporate = [
    "catalog",
    "orders",
    "pos",
    "studio",
    "biolink",
    "pages",
    "events",
    "jobs",
  ];

  const lower = (nicheId || "").toLowerCase();

  if (lower.includes("tour") || lower.includes("viag") || lower.includes("travel")) {
    return [
      "tourism",
      ...baseCorporate,
      "delivery", // Embarques & Frota
      "stock", // Vagas & Bloqueios
      "classifieds",
    ];
  }

  if (lower.includes("gastro") || lower.includes("restauran") || lower.includes("food")) {
    return [
      ...baseCorporate,
      "delivery",
      "stock",
    ];
  }

  if (lower.includes("servi") || lower.includes("belez") || lower.includes("clinic")) {
    return [
      ...baseCorporate,
      "stock",
    ];
  }

  return [
    ...baseCorporate,
    "delivery",
    "stock",
    "classifieds",
  ];
}

export default function WorkspaceConfiguracoesPage() {
  const {
    store,
    workingHours: initialHours,
    policies: initialPolicies,
    manualMethods: initialManualMethods,
  } = ((Route.useLoaderData?.() as any) || {});
  const router = useRouter();

  // Estados da Loja
  const [name, setName] = useState(store?.name || "");
  const [description, setDescription] = useState(store?.description || "");
  const [logoUrl, setLogoUrl] = useState(store?.settings?.logoUrl || (store as any)?.logo_url || "");
  const [bannerUrl, setBannerUrl] = useState(store?.settings?.bannerUrl || (store as any)?.banner_url || "");
  const [faviconUrl, setFaviconUrl] = useState(store?.settings?.faviconUrl || "");
  const [phone, setPhone] = useState(store?.phone || "");
  const [email, setEmail] = useState(store?.email || "");
  const [cnpj, setCnpj] = useState(store?.cnpj || "");
  const [address, setAddress] = useState(store?.address || "");
  const [segment, setSegment] = useState(
    store?.settings?.segment || store?.settings?.type || store?.settings?.niche || (store?.name?.toLowerCase()?.includes("tour") ? "tourism" : "gastronomy")
  );

  const initialResolvedModules = (() => {
    const existing = store?.settings?.enabled_modules;
    const currentNicheKey = store?.settings?.segment || store?.settings?.type || store?.settings?.niche || (store?.name?.toLowerCase()?.includes("tour") ? "tourism" : "gastronomy");
    const defaults = getDefaultModulesForNiche(currentNicheKey);
    if (!existing || existing.length === 0) return defaults;
    if (currentNicheKey === "tourism" || currentNicheKey.includes("tour")) {
      return Array.from(new Set([...existing, "tourism", "events", "jobs"]));
    }
    return existing;
  })();

  const [enabledModules, setEnabledModules] = useState<string[]>(initialResolvedModules);
  const [city, setCity] = useState(store?.city || "");
  const [state, setState] = useState(store?.state || "");
  const [zipCode, setZipCode] = useState(store?.zip_code || "");

  // Formas de Pagamento & Gateway
  const [pixKey, setPixKey] = useState(store?.pix_key || "");
  const [paymentInstructions, setPaymentInstructions] = useState(store?.payment_instructions || "");
  const [paymentProcessingMode, setPaymentProcessingMode] = useState<"platform_gateway" | "direct_store">(
    store?.payment_processing_mode || store?.settings?.payment_processing_mode || "platform_gateway"
  );
  const [manualMethods, setManualMethods] = useState<any[]>(initialManualMethods || []);
  const [newMethodName, setNewMethodName] = useState("");
  const [newMethodInstructions, setNewMethodInstructions] = useState("");
  const [isAddingMethod, setIsAddingMethod] = useState(false);

  const handleToggleManualMethod = async (method: any) => {
    try {
      await saveManualPaymentMethod({
        data: {
          id: method.id,
          name: method.name,
          instructions: method.instructions || "",
          surcharge_percentage: Number(method.surcharge_percentage || 0),
          discount_percentage: Number(method.discount_percentage || 0),
          is_active: !method.is_active,
        },
      });
      setManualMethods((prev) =>
        prev.map((m) => (m.id === method.id ? { ...m, is_active: !m.is_active } : m))
      );
      toast.success(method.is_active ? "Opção desativada." : "Opção ativada!");
    } catch {
      toast.error("Erro ao atualizar status da forma de pagamento.");
    }
  };

  const handleDeleteManualMethod = async (id: string) => {
    try {
      await deleteManualPaymentMethod({ data: { id } });
      setManualMethods((prev) => prev.filter((m) => m.id !== id));
      toast.success("Forma de pagamento removida.");
    } catch {
      toast.error("Erro ao remover forma de pagamento.");
    }
  };

  const handleCreateManualMethod = async () => {
    if (!newMethodName.trim()) {
      toast.error("Informe o nome da forma de pagamento.");
      return;
    }
    try {
      await saveManualPaymentMethod({
        data: {
          name: newMethodName.trim(),
          instructions: newMethodInstructions.trim() || undefined,
          surcharge_percentage: 0,
          discount_percentage: 0,
          is_active: true,
        },
      });
      const refreshed = await listManualPaymentMethods();
      setManualMethods(refreshed);
      setNewMethodName("");
      setNewMethodInstructions("");
      setIsAddingMethod(false);
      toast.success("Forma de pagamento cadastrada com sucesso!");
    } catch {
      toast.error("Erro ao cadastrar forma de pagamento.");
    }
  };

 // Horários
 const [hours, setHours] = useState<any>(initialHours || {});

 // Políticas
 const [privacyPolicy, setPrivacyPolicy] = useState(initialPolicies?.privacy_policy || "");
 const [returnPolicy, setReturnPolicy] = useState(initialPolicies?.return_policy || "");
 const [terms, setTerms] = useState(initialPolicies?.terms || "");

 // Bairros & Taxas de Entrega
 const [neighborhoods, setNeighborhoods] = useState<any[]>(
 store?.settings?.delivery_zones && store.settings.delivery_zones.length > 0
 ? store.settings.delivery_zones
 : CHAPECO_NEIGHBORHOODS,
 );

 // Modalidades de Atendimento (Delivery, Retirada, No Local)
 const [orderTypes, setOrderTypes] = useState(
 store?.settings?.order_types || { delivery: true, takeout: true, dine_in: true }
 );

 // Perguntas Customizadas de Checkout
 // Super Checkout Multi-Nicho Configs
  const initialCheckoutCfg = store?.settings?.checkout_config || {};
  const [cpfCheckoutEnabled, setCpfCheckoutEnabled] = useState<boolean>(
    initialCheckoutCfg.cpf_on_receipt?.enabled ?? true
  );
  const [cpfCheckoutRequired, setCpfCheckoutRequired] = useState<boolean>(
    initialCheckoutCfg.cpf_on_receipt?.required ?? false
  );
  const [cpfCheckoutDefaultChecked, setCpfCheckoutDefaultChecked] = useState<boolean>(
    initialCheckoutCfg.cpf_on_receipt?.default_requested ?? false
  );

  const [substitutionPolicyEnabled, setSubstitutionPolicyEnabled] = useState<boolean>(
    initialCheckoutCfg.substitution_policy?.enabled ?? true
  );
  const [substitutionDefaultOption, setSubstitutionDefaultOption] = useState<"similar" | "contact" | "cancel">(
    initialCheckoutCfg.substitution_policy?.default ?? "similar"
  );

  const [receiverInfoEnabled, setReceiverInfoEnabled] = useState<boolean>(
    initialCheckoutCfg.receiver_info?.enabled ?? true
  );

  const [utensilsPolicyEnabled, setUtensilsPolicyEnabled] = useState<boolean>(
    initialCheckoutCfg.utensils_policy?.enabled ?? true
  );

  const [itemNotesEnabled, setItemNotesEnabled] = useState<boolean>(
    initialCheckoutCfg.item_notes?.enabled ?? true
  );

  const [customFields, setCustomFields] = useState<any[]>(
 store?.settings?.custom_checkout_fields || [],
 );

 // Matriz de Entrega, Tempo de Preparo & Faixas de Raio (Estilo iFood Merchant)
 const [deliveryConfig, setDeliveryConfig] = useState<DeliveryLogisticsConfig>(
 store?.settings?.delivery_matrix || {
 manualPrepTimeEnabled: true,
 basePrepTimeMin: store?.settings?.delivery_time_min ? parseInt(String(store.settings.delivery_time_min), 10) || 15 : 15,
 radiusTiers: store?.settings?.radius_tiers || [],
 minOrderCents: store?.settings?.min_order_cents || 0,
 freeDeliveryThresholdCents: store?.settings?.free_delivery_threshold_cents || null,
 }
 );

 // Feriados & Pausa de Emergência
 const [holidayExceptions, setHolidayExceptions] = useState<any[]>(
 store?.settings?.holiday_exceptions || [],
 );

 const semantics = getNicheSemantics({ ...store, segment, name });
 const [emergencyPauseUntil, setEmergencyPauseUntil] = useState<string | null>(
 store?.settings?.emergency_pause_until || null,
 );

 const [isSaving, setIsSaving] = useState(false);
 const [isUploadingLogo, setIsUploadingLogo] = useState(false);
 const [isUploadingBanner, setIsUploadingBanner] = useState(false);

 const handleToggleModule = (moduleId: string) => {
 setEnabledModules((prev) =>
 prev.includes(moduleId) ? prev.filter((m) => m !== moduleId) : [...prev, moduleId]
 );
 };

 const handleFileUpload = async (
 e: React.ChangeEvent<HTMLInputElement>,
 type: "logo" | "banner",
 ) => {
 const file = e.target.files?.[0];
 if (!file) return;

 const setUploading = type === "logo" ? setIsUploadingLogo : setIsUploadingBanner;
 setUploading(true);

 try {
 const reader = new FileReader();
 reader.onload = async () => {
 const base64Data = reader.result as string;
 try {
 const res = await uploadStoreMedia({
 data: {
 fileName: file.name,
 fileType: file.type,
 base64Data,
 bucket: "cms-media",
 },
 });
 if (res?.url) {
 if (type === "logo") setLogoUrl(res.url);
 else setBannerUrl(res.url);
 toast.success("Imagem enviada com sucesso!");
 }
 } catch {
 toast.error("Erro ao enviar imagem.");
 } finally {
 setUploading(false);
 }
 };
 reader.readAsDataURL(file);
 } catch {
 setUploading(false);
 toast.error("Falha ao ler arquivo.");
 }
 };

 const handleSaveAll = async () => {
    if (!name.trim()) {
      toast.error("O nome da loja é obrigatório.");
      return;
    }

    setIsSaving(true);
    try {
      // 1. Salva Dados da Loja, Nicho, Módulos, Bairros e Matriz de Entrega
      await saveStoreSettings({
        data: {
          name: name.trim(),
          segment,
          enabled_modules: enabledModules,
          description: description.trim() || undefined,
          logoUrl: logoUrl.trim() || undefined,
          bannerUrl: bannerUrl.trim() || undefined,
          faviconUrl: faviconUrl.trim() || undefined,
          phone: phone.trim() || undefined,
          email: email.trim() || undefined,
          cnpj: cnpj.trim() || undefined,
          address: address.trim() || undefined,
          city: city.trim() || undefined,
          state: state.trim().toUpperCase() || undefined,
          zipCode: zipCode.trim() || undefined,
          deliveryZones: neighborhoods,
          customCheckoutFields: customFields,
          checkout_config: {
            cpf_on_receipt: {
              enabled: cpfCheckoutEnabled,
              required: cpfCheckoutRequired,
              default_requested: cpfCheckoutDefaultChecked,
            },
            substitution_policy: {
              enabled: substitutionPolicyEnabled,
              default: substitutionDefaultOption,
            },
            receiver_info: {
              enabled: receiverInfoEnabled,
            },
            utensils_policy: {
              enabled: utensilsPolicyEnabled,
            },
            item_notes: {
              enabled: itemNotesEnabled,
            },
          },
          holidayExceptions: holidayExceptions,
          emergencyPauseUntil: emergencyPauseUntil,
          delivery_matrix: deliveryConfig,
          order_types: orderTypes,
          pix_key: pixKey.trim() || undefined,
          payment_instructions: paymentInstructions.trim() || undefined,
          payment_processing_mode: paymentProcessingMode,
        } as any,
      });

      // 2. Salva Políticas
      await savePolicies({
        data: {
          privacy_policy: privacyPolicy,
          return_policy: returnPolicy,
          terms,
        },
      }).catch(() => null);

      // 3. Salva Horários se existirem
      if (hours && Object.keys(hours).length > 0) {
        await saveWorkingHours({ data: hours }).catch(() => null);
      }

      toast.success("Configurações da loja salvas com sucesso!");
      router.invalidate();
    } catch (err: any) {
      toast.error(err.message || "Erro ao salvar configurações.");
    } finally {
      setIsSaving(false);
    }
  };

 const currentNiche = getNicheSemantics(segment);
 const isPhysicalDeliveryNiche = [
 "gastronomy",
 "gastronomia",
 "market",
 "mercado",
 "retail",
 "varejo",
 "moda",
 "fashion",
 "pharmacy",
 "farmacia",
 "pet",
 ].includes(segment?.toLowerCase());
  const isTourism =
    [
      "tourism",
      "turismo",
      "viagens",
      "travel",
    ].includes(segment?.toLowerCase()) ||
    segment?.toLowerCase()?.includes("tour") ||
    segment?.toLowerCase()?.includes("turis") ||
    semantics?.nicheId === "tourism" ||
    currentNiche?.nicheId === "tourism";
  const hasDeliveryModule = enabledModules.includes("delivery") && isPhysicalDeliveryNiche;

 return (
 <div className="space-y-6 animate-in fade-in duration-200 max-w-6xl mx-auto w-full pb-20">
 {/* ── 1. Header Minimalista & Direto ── */}
 <PageHeader
 eyebrow={`Loja • ${currentNiche.name}`}
 title="Configurações"
 actions={
 <div className="flex items-center gap-2">
            <Button asChild variant="outline" size="sm" className="rounded-xl text-xs font-semibold gap-1.5 h-9">
              <Link to="/workspace/configuracoes/privacidade-loja">
                <ShieldCheck className="size-3.5 text-primary" />
                <span>Privacidade & Marketplace</span>
              </Link>
            </Button>

            <Button asChild variant="outline" size="sm" className="rounded-xl text-xs font-semibold gap-1.5 h-9">
              <Link to="/workspace/configuracoes/sessoes">
                <ShieldCheck className="size-3.5 text-primary" />
                <span>Sessões</span>
              </Link>
            </Button>

            <Button asChild variant="outline" size="sm" className="rounded-xl text-xs font-semibold gap-1.5 h-9">
              <Link to="/workspace/configuracoes/equipe">
                <Building2 className="size-3.5" />
                <span>Equipe</span>
              </Link>
            </Button>

 <Button
 onClick={handleSaveAll}
 disabled={isSaving}
 size="sm"
 className="rounded-xl text-xs font-bold gap-1.5 bg-foreground text-background hover:bg-foreground/90 h-9 cursor-pointer"
 >
 {isSaving ? (
 <>
 <Loader2 className="size-3.5 animate-spin" />
 <span>Salvando...</span>
 </>
 ) : (
 <>
 <Save className="size-3.5" />
 <span>Salvar</span>
 </>
 )}
 </Button>
 </div>
 }
 />

 {/* ── 2. Abas de Governança Nichadas ── */}
 <Tabs defaultValue="geral" className="w-full space-y-6">
 <TabsList className={cn("grid bg-muted/60 p-1 rounded-2xl", hasDeliveryModule ? "grid-cols-2 sm:grid-cols-7" : "grid-cols-2 sm:grid-cols-6")}>
 <TabsTrigger value="geral" className="rounded-xl text-xs font-semibold">
 Marca & Vitrine
 </TabsTrigger>
 <TabsTrigger value="nicho" className="rounded-xl text-xs font-semibold">
 Nicho & Recursos
 </TabsTrigger>
 <TabsTrigger value="contato" className="rounded-xl text-xs font-semibold">
 Contato & Endereço
 </TabsTrigger>
 {hasDeliveryModule && (
 <TabsTrigger value="entrega" className="rounded-xl text-xs font-semibold">
 Entrega & Bairros
 </TabsTrigger>
 )}
 <TabsTrigger value="horarios" className="rounded-xl text-xs font-semibold">
 Horários
 </TabsTrigger>
 <TabsTrigger value="politicas" className="rounded-xl text-xs font-semibold">
 Políticas
 </TabsTrigger>
 <TabsTrigger value="checkout" className="rounded-xl text-xs font-semibold">
 Checkout
 </TabsTrigger>
 </TabsList>

 {/* ABA 1: Marca & Vitrine */}
 <TabsContent value="geral" className="space-y-6">
 <Card className="p-6 rounded-2xl border-border bg-card space-y-6 ">
 <div className=" pb-4">
 <h2 className="text-base font-bold text-foreground">Identidade Visual da Loja</h2>
 <p className="text-xs text-muted-foreground">
 Estes elementos aparecem na vitrine pública, no cabeçalho e nas sacolas de compras.
 </p>
 </div>

 {/* Banner / Capa */}
 <div className="space-y-2">
 <Label className="text-xs font-bold text-foreground">Capa de Cabeçalho (Banner)</Label>
 <ImageUpload
 value={bannerUrl}
 onChange={(url) => setBannerUrl(url)}
 onRemove={() => setBannerUrl("")}
 bucket="cms-media"
 aspectPreset="banner"
 className="w-full"
 helperText="Formato panorâmico (21:9 / 16:9). Arraste ou dê zoom para enquadrar perfeitamente a vitrine."
 />
 </div>

 {/* Grid de Identidade (Logotipo & Favicon) */}
 <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
 {/* Logotipo */}
 <div className="space-y-2">
 <Label className="text-xs font-bold text-foreground">Logotipo Oficial</Label>
 <div className="flex items-center gap-4">
 <ImageUpload
 value={logoUrl}
 onChange={(url) => setLogoUrl(url)}
 onRemove={() => setLogoUrl("")}
 bucket="cms-media"
 aspectPreset="square"
 variant="avatar"
 className="w-20 h-20 shrink-0"
 />
 <div className="flex-1 space-y-1">
 <p className="text-xs font-semibold text-foreground">Formato Quadrado (1:1)</p>
 <p className="text-[11px] text-muted-foreground">
 Exibido no cabeçalho da loja, sacola de compras e recibos.
 </p>
 </div>
 </div>
 </div>

 {/* Favicon */}
 <div className="space-y-2">
 <Label className="text-xs font-bold text-foreground">Favicon (Ícone de Aba)</Label>
 <div className="flex items-center gap-4">
 <ImageUpload
 value={faviconUrl}
 onChange={(url) => setFaviconUrl(url)}
 onRemove={() => setFaviconUrl("")}
 bucket="cms-media"
 aspectPreset="square"
 variant="avatar"
 className="w-16 h-16 shrink-0"
 />
 <div className="flex-1 space-y-1">
 <p className="text-xs font-semibold text-foreground">Ícone da Aba (1:1)</p>
 <p className="text-[11px] text-muted-foreground">
 Identifica sua loja na aba do navegador e no app móvel.
 </p>
 </div>
 </div>
 </div>
 </div>

 {/* Nome Comercial */}
 <div className="space-y-1.5 pt-2">
 <Label className="text-xs font-bold text-foreground">Nome Comercial da Loja *</Label>
 <Input
 value={name}
 onChange={(e) => setName(e.target.value)}
 placeholder="Ex: Waesy Store"
 className="rounded-xl text-xs h-10 font-bold"
 required
 />
 </div>

 <div className="space-y-1.5">
 <Label className="text-xs font-bold text-foreground">Slogan & Bio da Loja</Label>
 <Textarea
 value={description}
 onChange={(e) => setDescription(e.target.value)}
 placeholder="Apresente sua proposta de valor e diferenciais..."
 rows={3}
 className="rounded-2xl text-xs resize-none"
 />
 </div>

 {/* Modalidades de Atendimento / Prestação de Serviço Canônicas por Nicho */}
 {isTourism ? (
   <div className="p-5 rounded-2xl bg-muted/20 border border-border/80 space-y-3">
     <div className="space-y-0.5">
       <Label className="text-xs font-bold text-foreground">Canais & Modalidades de Atendimento (Turismo & Agência)</Label>
       <p className="text-[11px] text-muted-foreground">
         Defina as formas que os passageiros e viajantes podem ser atendidos e emitir roteiros com sua agência.
       </p>
     </div>

     <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
       <div className="flex items-center justify-between p-3 rounded-xl bg-card border border-border/70">
         <div className="space-y-0.5 pr-2">
           <span className="text-xs font-bold text-foreground">Presencial na Agência</span>
           <p className="text-[10px] text-muted-foreground">Balcão físico com ou sem agendamento</p>
         </div>
         <Switch
           checked={orderTypes.in_person ?? orderTypes.dine_in ?? true}
           onCheckedChange={(c) => setOrderTypes({ ...orderTypes, in_person: c, dine_in: c })}
           className="scale-75"
         />
       </div>

       <div className="flex items-center justify-between p-3 rounded-xl bg-card border border-border/70">
         <div className="space-y-0.5 pr-2">
           <span className="text-xs font-bold text-foreground">Consultoria Online</span>
           <p className="text-[10px] text-muted-foreground">Atendimento WhatsApp e Vídeo</p>
         </div>
         <Switch
           checked={orderTypes.remote_online ?? true}
           onCheckedChange={(c) => setOrderTypes({ ...orderTypes, remote_online: c })}
           className="scale-75"
         />
       </div>

       <div className="flex items-center justify-between p-3 rounded-xl bg-card border border-border/70">
         <div className="space-y-0.5 pr-2">
           <span className="text-xs font-bold text-foreground">Emissão Autônoma</span>
           <p className="text-[10px] text-muted-foreground">Reserva e compra direta no portal</p>
         </div>
         <Switch
           checked={orderTypes.auto_checkout ?? orderTypes.delivery ?? true}
           onCheckedChange={(c) => setOrderTypes({ ...orderTypes, auto_checkout: c, delivery: c })}
           className="scale-75"
         />
       </div>

       <div className="flex items-center justify-between p-3 rounded-xl bg-card border border-border/70">
         <div className="space-y-0.5 pr-2">
           <span className="text-xs font-bold text-foreground">Corporativo / B2B</span>
           <p className="text-[10px] text-muted-foreground">Faturamento para empresas e grupos</p>
         </div>
         <Switch
           checked={orderTypes.corporate_b2b ?? false}
           onCheckedChange={(c) => setOrderTypes({ ...orderTypes, corporate_b2b: c })}
           className="scale-75"
         />
       </div>
     </div>
   </div>
 ) : isPhysicalDeliveryNiche ? (
   <div className="p-5 rounded-2xl bg-muted/20 border border-border/80 space-y-3">
     <div className="space-y-0.5">
       <Label className="text-xs font-bold text-foreground">Modalidades de Atendimento</Label>
       <p className="text-[11px] text-muted-foreground">
         Selecione as formas que os clientes podem comprar e receber do seu estabelecimento.
       </p>
     </div>

     <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
       <div className="flex items-center justify-between p-3 rounded-xl bg-card border border-border/70">
         <div className="space-y-0.5">
           <span className="text-xs font-bold text-foreground">Delivery</span>
           <p className="text-[10px] text-muted-foreground">Entrega no endereço</p>
         </div>
         <Switch
           checked={orderTypes.delivery}
           onCheckedChange={(c) => setOrderTypes({ ...orderTypes, delivery: c })}
           className="scale-75"
         />
       </div>

       <div className="flex items-center justify-between p-3 rounded-xl bg-card border border-border/70">
         <div className="space-y-0.5">
           <span className="text-xs font-bold text-foreground">Retirada</span>
           <p className="text-[10px] text-muted-foreground">Pegar no balcão</p>
         </div>
         <Switch
           checked={orderTypes.takeout}
           onCheckedChange={(c) => setOrderTypes({ ...orderTypes, takeout: c })}
           className="scale-75"
         />
       </div>

       <div className="flex items-center justify-between p-3 rounded-xl bg-card border border-border/70">
         <div className="space-y-0.5">
           <span className="text-xs font-bold text-foreground">No Local / Mesas</span>
           <p className="text-[10px] text-muted-foreground">Consumo presencial</p>
         </div>
         <Switch
           checked={orderTypes.dine_in}
           onCheckedChange={(c) => setOrderTypes({ ...orderTypes, dine_in: c })}
           className="scale-75"
         />
       </div>
     </div>
   </div>
 ) : (
   <div className="p-5 rounded-2xl bg-muted/20 border border-border/80 space-y-3">
     <div className="space-y-0.5">
       <Label className="text-xs font-bold text-foreground">Canais de Atendimento & Prestação de Serviço</Label>
       <p className="text-[11px] text-muted-foreground">
         Defina as formas de atendimento oferecidas pelo seu negócio.
       </p>
     </div>

     <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
       <div className="flex items-center justify-between p-3 rounded-xl bg-card border border-border/70">
         <div className="space-y-0.5">
           <span className="text-xs font-bold text-foreground">Atendimento Presencial</span>
           <p className="text-[10px] text-muted-foreground">No escritório ou estabelecimento físico</p>
         </div>
         <Switch
           checked={orderTypes.in_person ?? orderTypes.dine_in ?? true}
           onCheckedChange={(c) => setOrderTypes({ ...orderTypes, in_person: c, dine_in: c })}
           className="scale-75"
         />
       </div>

       <div className="flex items-center justify-between p-3 rounded-xl bg-card border border-border/70">
         <div className="space-y-0.5">
           <span className="text-xs font-bold text-foreground">Atendimento Remoto / Online</span>
           <p className="text-[10px] text-muted-foreground">Via canais digitais e videoconferência</p>
         </div>
         <Switch
           checked={orderTypes.remote_online ?? true}
           onCheckedChange={(c) => setOrderTypes({ ...orderTypes, remote_online: c })}
           className="scale-75"
         />
       </div>
     </div>
   </div>
 )}
 </Card>

 {/* Tema do Workspace */}
 <Card className="p-6 rounded-2xl border-border bg-card space-y-4">
 <div>
 <h2 className="text-base font-bold text-foreground">Aparência do Painel & Tema</h2>
 <p className="text-xs text-muted-foreground">
 Escolha a preferência visual para a navegação do seu painel e vitrines.
 </p>
 </div>
 <ThemeSelector />
 </Card>
 </TabsContent>

 {/* ABA: Nicho & Recursos da Loja */}
 <TabsContent value="nicho" className="space-y-6">
 <Card className="p-6 rounded-2xl border-border bg-card space-y-5">
 <div className="pb-2">
 <h2 className="text-base font-bold text-foreground">Nicho & Modelo de Operação</h2>
 <p className="text-xs text-muted-foreground">
 Ajusta automaticamente os módulos, menus e ferramentas da barra lateral para a realidade do seu negócio.
 </p>
 </div>

 <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
 {[
 {
 id: "gastronomy",
 title: "Gastronomia & Delivery",
 desc: "Restaurantes, pizzarias, hamburguerias e cafés. Inclui KDS, comandas e taxa de entrega.",
 },
 {
 id: "ecommerce",
 title: "Varejo & Moda",
 desc: "Roupas, calçados e comércio geral. Inclui variações de grade, estoque e fretes.",
 },
 {
 id: "services",
 title: "Serviços, Saúde & Beleza",
 desc: "Salões, barbearias, clínicas e estética. Inclui agenda de profissionais, salas e passes.",
 },
 {
 id: "jobs",
 title: "Empregos & Recrutamento",
 desc: "Agências de RH, consultorias e empresas. Inclui vagas, candidaturas e banco de talentos.",
 },
 {
 id: "events",
 title: "Eventos & Ingressos",
 desc: "Casas de show, baladas, festivais e teatro. Inclui lotes de ingressos, check-in e flyers.",
 },
 {
 id: "automotive",
 title: "Automóveis & Veículos",
 desc: "Lojas de carros, motos e garagens. Inclui estoque de veículos, propostas e financiamento.",
 },
 {
 id: "pet",
 title: "Pet Shop & Veterinária",
 desc: "Banho & tosa, clínicas e agropecuária. Inclui agenda de procedimentos, rações e vacinas.",
 },
 {
 id: "supermarket",
 title: "Supermercado & Hortifrúti",
 desc: "Mercados, empórios e açougues. Inclui itens por KG/unidade, validades e separação de pedidos.",
 },
 {
 id: "pharmacy",
 title: "Farmácia & Cosméticos",
 desc: "Drogarias, farmácias e suplementos. Inclui balcão de medicamentos e tele-entrega express.",
 },
 {
 id: "news",
 title: "Jornalismo & Notícias",
 desc: "Portais de notícias, jornais e revistas. Inclui redação de matérias e banners de anunciantes.",
 },
 {
 id: "rental_events",
 title: "Locação & Estruturas",
 desc: "Aluguel de som, luz, tendas e palcos. Inclui inventário de bens, agenda de locação e contratos.",
 },
 {
 id: "tech_repair",
 title: "Assistência & Mecânica",
 desc: "Conserto de celular, oficinas e informática. Inclui Ordens de Serviço (OS) e peças.",
 },
 {
 id: "legal",
 title: "Advocacia & Jurídico",
 desc: "Escritórios de advocacia. Inclui controle de processos, prazos, audiências e honorários.",
 },
 {
 id: "real_estate",
 title: "Imobiliária & Imóveis",
 desc: "Corretores e imobiliárias. Inclui catálogo de imóveis, vistorias e contratos de aluguel.",
 },
 {
 id: "tourism",
 title: "Turismo & Viagens",
 desc: "Agências de viagem, pousadas e guias. Inclui cotações de pacotes, passeios e reservas.",
 },
 {
 id: "education",
 title: "Cursos & Educação",
 desc: "Escolas, cursos e workshops. Inclui grade de aulas, matrículas e turmas de alunos.",
 },
 {
 id: "wholesale",
 title: "Atacado & B2B",
 desc: "Indústrias e distribuidoras. Inclui tabelas de preço PJ, orçamentos em lote e faturamento.",
 },
 ].map((n) => {
 const activeSemantics = getNicheSemantics({ segment });
 const isSelected =
 activeSemantics.nicheId === n.id ||
 (n.id === "ecommerce" && activeSemantics.nicheId === "retail") ||
 (n.id === "automotive" && activeSemantics.nicheId === "vehicles") ||
 (n.id === "rental_events" && activeSemantics.nicheId === "rental") ||
 segment === n.id;

 return (
 <button
 key={n.id}
 type="button"
 onClick={() => {
   setSegment(n.id);
   setEnabledModules(getDefaultModulesForNiche(n.id));
   toast.success(`Nicho alterado para ${n.title}. Módulos recomendados foram ativados.`);
 }}
 className={cn(
 "flex flex-col text-left p-4 rounded-2xl border transition-all cursor-pointer relative",
 isSelected
 ? "border-primary bg-primary/5 ring-1 ring-primary/40"
 : "border-border/60 bg-muted/20 hover:bg-muted/50 text-muted-foreground"
 )}
 >
 <div className="flex items-center justify-between w-full mb-1.5">
 <span className={cn("text-xs font-bold", isSelected ? "text-primary" : "text-foreground")}>
 {n.title}
 </span>
 {isSelected && <Check className="size-3.5 text-primary shrink-0" />}
 </div>
 <p className="text-[11px] leading-relaxed text-muted-foreground">
 {n.desc}
 </p>
 </button>
 );
 })}
 </div>
 </Card>

 {/* ── Gerenciador de Módulos Habilitados ── */}
 <Card className="p-6 rounded-2xl border-border bg-card space-y-5">
 <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2">
 <div>
 <h2 className="text-base font-bold text-foreground flex items-center gap-2">
 <ListChecks className="size-4 text-primary" />
 Módulos & Ferramentas Habilitadas
 </h2>
 <p className="text-xs text-muted-foreground">
 Ative somente os recursos que sua operação utiliza para manter o menu do Workspace limpo e focado.
 </p>
 </div>
 <div className="flex items-center gap-2">
 <Button
 type="button"
 variant="outline"
 size="sm"
 onClick={() => {
   const newDefaults = getDefaultModulesForNiche(semantics.nicheId || segment);
   setEnabledModules(newDefaults);
   toast.success(`Módulos restaurados para o padrão ${semantics.name}.`);
 }}
 className="text-xs h-7 rounded-xl"
 >
 {semantics.nicheId === "tourism"
 ? "Padrão Turismo & Viagens"
 : semantics.nicheId === "services"
 ? "Padrão Serviços"
 : "Padrão Comercial & Loja"}
 </Button>
 </div>
 </div>

 <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
 {[
 {
 id: "catalog",
 title: semantics.nicheId === "gastronomy" ? "Cardápio & Itens" : semantics.catalogTitle || "Catálogo & Itens",
 desc: semantics.nicheId === "tourism"
 ? "Cadastro de pacotes, roteiros, destinos e passeios."
 : semantics.nicheId === "gastronomy"
 ? "Cadastro de pratos, bebidas, adicionais e categorias."
 : "Cadastro de produtos, variações, categorias e fotos.",
 icon: semantics.nicheId === "tourism" ? "✈️" : semantics.nicheId === "gastronomy" ? "🍽️" : "📦",
 },
 {
 id: "orders",
 title: semantics.ordersLabel || "Gestor de Pedidos",
 desc: semantics.nicheId === "tourism"
 ? "Recepção de cotações, propostas e emissões."
 : semantics.nicheId === "gastronomy"
 ? "Recepção de pedidos em tempo real, telas de cozinha (KDS) e despacho."
 : "Recepção de pedidos, separação e expedição de compras.",
 icon: "📋",
 },
 {
 id: "delivery",
 title: semantics.nicheId === "tourism" ? "Embarque & Frota" : "Frota & Entregas",
 desc: semantics.nicheId === "tourism"
 ? "Gestão de veículos, ônibus, embarques e transfers."
 : "Gestão de entregadores, despacho e taxas por bairro.",
 icon: semantics.nicheId === "tourism" ? "🚌" : "🛵",
 },
 {
 id: "pos",
 title: semantics.nicheId === "tourism" ? "Balcão & Vendas Rápidas" : "Frente de Caixa (PDV)",
 desc: semantics.nicheId === "gastronomy"
 ? "Ponto de venda rápido para balcão, comandas e mesas."
 : "Ponto de venda rápido para recebimento e vendas presenciais.",
 icon: "🏪",
 },
 {
 id: "stock",
 title: semantics.stockLabel || "Controle de Estoque",
 desc: semantics.nicheId === "tourism"
 ? "Controle de vagas, bloqueios de quartos e assentos."
 : "Movimentações, baixa automática e alerta de insumos mínimos.",
 icon: "📦",
 },
 {
 id: "studio",
 title: "Estúdio Visual Studio 3.0",
 desc: "Criador de posts, encartes promocionais e banners para redes.",
 icon: "🎨",
 },
 {
 id: "biolink",
 title: "Link da Bio (Biolink)",
 desc: "Página móvel com botões rápidos de WhatsApp, PIX e redes.",
 icon: "🔗",
 },
 {
 id: "pages",
 title: "Páginas do Site (CMS)",
 desc: "Páginas institucionais como Sobre Nós, Políticas e Dúvidas.",
 icon: "📄",
 },
 {
 id: "classifieds",
 title: "Classificados Locais",
 desc: "Anúncios rápidos de desapegos e oportunidades na região.",
 icon: "📢",
 },
 {
 id: "news",
 title: "Notícias & Redação",
 desc: "Publicação de matérias jornalísticas e conteúdos editoriais.",
 icon: "📰",
 },
 {
 id: "events",
 title: "Eventos & Ingressos",
 desc: "Venda de ingressos com lotes, setores e validação QR Code.",
 icon: "🎟️",
 },
 {
 id: "jobs",
 title: "Empregos & Recrutamento",
 desc: "Abertura de vagas e recebimento de currículos de candidatos.",
 icon: "💼",
 },
 {
 id: "vehicles",
 title: "Veículos & Concessionária",
 desc: "Estoque de seminovos, propostas de financiamento e placas.",
 icon: "🚗",
 },
 {
 id: "real_estate",
 title: "Imóveis & Imobiliária",
 desc: "Catálogo de imóveis para venda/locação e vistorias.",
 icon: "🏠",
 },
 {
 id: "tourism",
 title: "Turismo & Passeios",
 desc: "Pacotes de viagem, pousadas e reservas de passeios locais.",
 icon: "✈️",
 },
 {
 id: "education",
 title: "Cursos & Workshops",
 desc: "Gestão de turmas, materiais didáticos e matrículas.",
 icon: "🎓",
 },
 ].map((mod) => {
 const isEnabled = enabledModules.includes(mod.id);
 return (
 <div
 key={mod.id}
 onClick={() => handleToggleModule(mod.id)}
 className={cn(
 "flex items-start justify-between p-3.5 rounded-2xl border transition-all cursor-pointer select-none",
 isEnabled
 ? "border-primary/40 bg-primary/5 dark:bg-primary/10"
 : "border-border/60 bg-muted/20 hover:bg-muted/40 opacity-70"
 )}
 >
 <div className="space-y-1 pr-3">
 <div className="flex items-center gap-2">
 <span className="text-base leading-none">{mod.icon}</span>
 <span className="text-xs font-bold text-foreground">
 {mod.title}
 </span>
 </div>
 <p className="text-[11px] text-muted-foreground leading-snug">
 {mod.desc}
 </p>
 </div>
 <Switch
 checked={isEnabled}
 onCheckedChange={() => handleToggleModule(mod.id)}
 className="shrink-0 mt-0.5"
 />
 </div>
 );
 })}
 </div>
 </Card>
 </TabsContent>

 {/* ABA 2: Contato & Endereço */}
 <TabsContent value="contato" className="space-y-6">
 <Card className="p-6 rounded-2xl border-border bg-card space-y-5 ">
 <div className=" pb-4">
 <h2 className="text-base font-bold text-foreground">Canais de Contato & Localização</h2>
 <p className="text-xs text-muted-foreground">
 Dados utilizados para emissão de pedidos, frete local e comunicação com o cliente.
 </p>
 </div>

 <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
 <div className="space-y-1.5">
 <Label className="text-xs font-bold text-foreground flex items-center gap-1">
 <Phone className="size-3 text-primary" />
 WhatsApp Comercial
 </Label>
 <Input
 value={phone}
 onChange={(e) => setPhone(e.target.value)}
 placeholder="(49) 99999-9999"
 className="rounded-xl text-xs h-9"
 />
 </div>

 <div className="space-y-1.5">
 <Label className="text-xs font-bold text-foreground flex items-center gap-1">
 <Mail className="size-3 text-primary" />
 E-mail da Loja
 </Label>
 <Input
 type="email"
 value={email}
 onChange={(e) => setEmail(e.target.value)}
 placeholder="contato@minhaloja.com.br"
 className="rounded-xl text-xs h-9"
 />
 </div>

 <div className="space-y-1.5">
 <Label className="text-xs font-bold text-foreground">CNPJ / CPF</Label>
 <Input
 value={cnpj}
 onChange={(e) => setCnpj(e.target.value)}
 placeholder="00.000.000/0001-00"
 className="rounded-xl text-xs h-9"
 />
 </div>
 </div>

 <div className="space-y-4">
 <CitySelect
 stateValue={state}
 cityValue={city}
 onStateChange={setState}
 onCityChange={setCity}
 />

 <div className="space-y-1.5">
 <Label className="text-xs font-bold text-foreground">Endereço Físico / Balcão</Label>
 <Input
 value={address}
 onChange={(e) => setAddress(e.target.value)}
 placeholder="Rua, número, complemento e bairro"
 className="rounded-xl text-xs h-9"
 />
 </div>
 </div>
 </Card>
 </TabsContent>

 {/* ABA: Entrega, Tempo de Preparo & Bairros */}
 <TabsContent value="entrega" className="space-y-6">
 <Card className="p-6 rounded-2xl border-border bg-card space-y-6">
 <DeliveryTimeAndRadiusMatrix
 value={deliveryConfig}
 onChange={setDeliveryConfig}
 storeName={name || "Minha Cozinha & Loja"}
 storeCategory={segment}
 storeLogoUrl={logoUrl}
 storeBannerUrl={bannerUrl}
 />
 </Card>

 <Card className="p-6 rounded-2xl border-border bg-card space-y-5">
 <div className="pb-2">
 <h3 className="text-sm font-bold text-foreground">Taxas Personalizadas por Bairro</h3>
 <p className="text-xs text-muted-foreground">
 Complemente o raio de entrega definindo regras e exceções por bairros específicos da cidade.
 </p>
 </div>
 <NeighborhoodsManager
 cityName={city || "Sua Cidade"}
 value={neighborhoods}
 onChange={setNeighborhoods}
 />
 </Card>
 </TabsContent>

 {/* ABA 3: Horários de Atendimento */}
 <TabsContent value="horarios" className="space-y-6">
 <Card className="p-6 rounded-2xl border-border bg-card space-y-5">
 <div className="pb-2">
 <h2 className="text-base font-bold text-foreground">Grade de Horários de Funcionamento</h2>
 <p className="text-xs text-muted-foreground">
 Define os momentos em que a loja aceita pedidos imediatos para entrega, agendamentos ou retirada no balcão.
 </p>
 </div>

 <BusinessHoursEditor
 value={hours}
 onChange={(newHours) => setHours(newHours)}
 holidayExceptions={holidayExceptions}
 onHolidayExceptionsChange={setHolidayExceptions}
 emergencyPauseUntil={emergencyPauseUntil}
 onEmergencyPauseChange={setEmergencyPauseUntil}
 showPresets={true}
 showStatusPreview={true}
 showHolidays={true}
 showEmergencyPause={true}
 />
 </Card>
 </TabsContent>

 {/* ABA 4: Políticas da Loja */}
 <TabsContent value="politicas" className="space-y-6">
 <Card className="p-6 rounded-2xl border-border bg-card space-y-5 ">
 <div className=" pb-4">
 <h2 className="text-base font-bold text-foreground">Políticas & Termos Comerciais</h2>
 <p className="text-xs text-muted-foreground">
 Exibidos no rodapé da loja e nas páginas de checkout para garantir conformidade jurídica.
 </p>
 </div>

 <div className="space-y-4">
 <div className="space-y-1.5">
 <Label className="text-xs font-bold text-foreground">Termos de Compra & Uso</Label>
 <Textarea
 value={terms}
 onChange={(e) => setTerms(e.target.value)}
 placeholder="Escreva os termos de uso aplicáveis à sua loja..."
 rows={4}
 className="rounded-2xl text-xs"
 />
 </div>

 <div className="space-y-1.5">
 <Label className="text-xs font-bold text-foreground">Política de Trocas e Devoluções</Label>
 <Textarea
 value={returnPolicy}
 onChange={(e) => setReturnPolicy(e.target.value)}
 placeholder="Instruções sobre prazos de 7 dias, condições do produto e reembolso..."
 rows={4}
 className="rounded-2xl text-xs"
 />
 </div>

 <div className="space-y-1.5">
 <Label className="text-xs font-bold text-foreground">Política de Privacidade</Label>
 <Textarea
 value={privacyPolicy}
 onChange={(e) => setPrivacyPolicy(e.target.value)}
 placeholder="Como sua loja trata os dados dos clientes e LGPD..."
 rows={4}
 className="rounded-2xl text-xs"
 />
 </div>
 </div>
 </Card>
 </TabsContent>

 {/* ABA 5: Checkout & Modalidades de Pagamento */}
 <TabsContent value="checkout" className="space-y-6">
        {/* Super Checkout: Opções Multi-Nicho & Comportamento */}
        <Card className="p-6 rounded-2xl border-border bg-card space-y-6">
          <div className="pb-3 border-b border-border/40">
            <h2 className="text-sm font-bold text-foreground">
              Comportamento do Super Checkout Multi-Nicho
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Ative ou adapte os recursos dinâmicos do fechamento de pedido de acordo com o modelo da sua empresa.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Bloco 1: Fiscal / CPF na Nota */}
            <div className="p-4 rounded-xl bg-muted/20 border border-border/40 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-foreground">CPF na Nota Fiscal</h3>
                  <p className="text-[11px] text-muted-foreground">Pergunta se o cliente deseja incluir documento fiscal</p>
                </div>
                <Switch
                  checked={cpfCheckoutEnabled}
                  onCheckedChange={setCpfCheckoutEnabled}
                />
              </div>

              {cpfCheckoutEnabled && (
                <div className="pt-2 border-t border-border/30 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Obrigatório preencher</span>
                    <Switch
                      checked={cpfCheckoutRequired}
                      onCheckedChange={setCpfCheckoutRequired}
                      className="scale-90"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Marcar "Sim" por padrão</span>
                    <Switch
                      checked={cpfCheckoutDefaultChecked}
                      onCheckedChange={setCpfCheckoutDefaultChecked}
                      className="scale-90"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Bloco 2: Logística & Quem Recebe */}
            <div className="p-4 rounded-xl bg-muted/20 border border-border/40 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-foreground">Quem Irá Receber as Compras</h3>
                  <p className="text-[11px] text-muted-foreground">Permite indicar outra pessoa (nome e telefone de contato)</p>
                </div>
                <Switch
                  checked={receiverInfoEnabled}
                  onCheckedChange={setReceiverInfoEnabled}
                />
              </div>
            </div>

            {/* Bloco 3: Hortifrúti & Mercado: Falta de Itens */}
            <div className="p-4 rounded-xl bg-muted/20 border border-border/40 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-foreground">Política de Falta de Itens (Mercado / Hortifrúti)</h3>
                  <p className="text-[11px] text-muted-foreground">Opções para quando um produto estiver esgotado no momento da separação</p>
                </div>
                <Switch
                  checked={substitutionPolicyEnabled}
                  onCheckedChange={setSubstitutionPolicyEnabled}
                />
              </div>

              {substitutionPolicyEnabled && (
                <div className="pt-2 border-t border-border/30 space-y-1.5 text-xs">
                  <Label className="text-[11px] text-muted-foreground">Opção pré-selecionada sugerida:</Label>
                  <select
                    value={substitutionDefaultOption}
                    onChange={(e) => setSubstitutionDefaultOption(e.target.value as any)}
                    className="w-full h-8 px-2.5 rounded-lg bg-card border border-border/60 text-xs font-medium"
                  >
                    <option value="similar">Trocar por similar (mesma categoria)</option>
                    <option value="contact">Confirmar com o cliente via WhatsApp</option>
                    <option value="cancel">Cancelar item e abater valor</option>
                  </select>
                </div>
              )}
            </div>

            {/* Bloco 4: Gastronomia: Talheres Descartáveis */}
            <div className="p-4 rounded-xl bg-muted/20 border border-border/40 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-foreground">Talheres & Descartáveis (Gastronomia)</h3>
                  <p className="text-[11px] text-muted-foreground">Pergunta ecológica: enviar talheres e guardanapos descartáveis?</p>
                </div>
                <Switch
                  checked={utensilsPolicyEnabled}
                  onCheckedChange={setUtensilsPolicyEnabled}
                />
              </div>
            </div>

            {/* Bloco 5: Observações por Item */}
            <div className="p-4 rounded-xl bg-muted/20 border border-border/40 space-y-3 md:col-span-2">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-foreground">Observações Individuais por Item</h3>
                  <p className="text-[11px] text-muted-foreground">Permite ao cliente adicionar observações em itens individuais ("+ Observação do item")</p>
                </div>
                <Switch
                  checked={itemNotesEnabled}
                  onCheckedChange={setItemNotesEnabled}
                />
              </div>
            </div>
          </div>
        </Card>
 {/* ── Modalidade de Processamento de Pagamentos & Gateway ── */}
 <Card className="p-6 rounded-2xl border-border bg-card space-y-6">
 <div className="pb-2 border-b border-border/40 flex items-center justify-between">
 <div>
 <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
 <CreditCard className="size-4 text-primary" />
 <span>Meios de Pagamento & Gateway da Loja</span>
 </h2>
 <p className="text-xs text-muted-foreground mt-0.5">
 Escolha se sua loja prefere vender via Gateway Integrado da Plataforma ou com Pagamento Direto.
 </p>
 </div>
 </div>

 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
 <div
 onClick={() => setPaymentProcessingMode("platform_gateway")}
 className={cn(
 "rounded-2xl border p-4 cursor-pointer transition-all space-y-2",
 paymentProcessingMode === "platform_gateway"
 ? "border-primary bg-primary/5 ring-1 ring-primary"
 : "border-border/70 hover:border-border"
 )}
 >
 <div className="flex items-center justify-between">
 <span className="text-xs font-bold text-foreground">Gateway Central Waesy</span>
 {paymentProcessingMode === "platform_gateway" && (
 <CheckCircle2 className="size-4 text-primary" />
 )}
 </div>
 <p className="text-[11px] text-muted-foreground leading-relaxed">
 Cartão de crédito online e Pix automático com split financeiro e conciliação instantânea.
 </p>
 </div>

 <div
 onClick={() => setPaymentProcessingMode("direct_store")}
 className={cn(
 "rounded-2xl border p-4 cursor-pointer transition-all space-y-2",
 paymentProcessingMode === "direct_store"
 ? "border-primary bg-primary/5 ring-1 ring-primary"
 : "border-border/70 hover:border-border"
 )}
 >
 <div className="flex items-center justify-between">
 <span className="text-xs font-bold text-foreground">Venda Direta da Loja</span>
 {paymentProcessingMode === "direct_store" && (
 <CheckCircle2 className="size-4 text-primary" />
 )}
 </div>
 <p className="text-[11px] text-muted-foreground leading-relaxed">
 Chave Pix da sua empresa sem taxas intermediárias, ou pagamento na entrega/retirada no balcão.
 </p>
 </div>
 </div>

 {paymentProcessingMode === "direct_store" && (
 <div className="space-y-4 pt-2 border-t border-border/40 animate-in fade-in duration-150">
 <div className="space-y-1.5">
 <Label className="text-xs font-bold text-foreground">Chave Pix da Loja (Recebimento Direto)</Label>
 <Input
 value={pixKey}
 onChange={(e) => setPixKey(e.target.value)}
 placeholder="CPF, CNPJ, E-mail, Telefone ou Chave Aleatória"
 className="h-10 text-xs rounded-xl font-mono"
 />
 </div>

 <div className="space-y-1.5">
 <Label className="text-xs font-bold text-foreground">Instruções de Pagamento aos Clientes</Label>
 <Textarea
 value={paymentInstructions}
 onChange={(e) => setPaymentInstructions(e.target.value)}
 placeholder="Ex: Efetue o Pix e envie o comprovante pelo WhatsApp da loja, ou pague com maquininha no momento da entrega."
 className="min-h-[80px] text-xs rounded-xl"
 />
 </div>
 </div>
 )}
 </Card>

 {/* ── Formas de Pagamento na Entrega / Balcão (Venda Direta) ── */}
 <Card className="p-6 rounded-2xl border-border bg-card space-y-6">
 <div className="flex items-center justify-between gap-3 pb-3 border-b border-border/40">
 <div>
 <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
 <CreditCard className="size-4 text-primary" />
 <span>Pagamento Presencial / na Entrega</span>
 </h2>
 <p className="text-xs text-muted-foreground mt-0.5">
 Opções para o cliente pagar ao motorista/entregador ou no balcão da loja.
 </p>
 </div>

 <Button
 type="button"
 size="sm"
 onClick={() => setIsAddingMethod(!isAddingMethod)}
 className="rounded-xl text-xs font-bold gap-1.5 shrink-0 bg-primary text-primary-foreground cursor-pointer"
 >
 <Plus className="size-3.5" />
 <span>Nova Forma</span>
 </Button>
 </div>

 {/* Sugestões Rápidas de Presets */}
 <div className="space-y-1.5">
 <Label className="text-[11px] font-bold text-muted-foreground">Sugestões Rápidas:</Label>
 <div className="flex flex-wrap gap-2">
 <Button
 type="button"
 variant="outline"
 size="sm"
 className="rounded-xl text-xs h-8"
 onClick={() => {
 setNewMethodName("Maquininha de Cartão (Débito e Crédito)");
 setNewMethodInstructions("Levamos a maquininha até você. Aceitamos Visa, Master, Elo e Hipercard.");
 setIsAddingMethod(true);
 }}
 >
 + Maquininha na Entrega
 </Button>
 <Button
 type="button"
 variant="outline"
 size="sm"
 className="rounded-xl text-xs h-8"
 onClick={() => {
 setNewMethodName("Dinheiro (Informar Troco)");
 setNewMethodInstructions("Pagamento em dinheiro no momento da entrega.");
 setIsAddingMethod(true);
 }}
 >
 + Dinheiro com Troco
 </Button>
 <Button
 type="button"
 variant="outline"
 size="sm"
 className="rounded-xl text-xs h-8"
 onClick={() => {
 setNewMethodName("Pix no Balcão");
 setNewMethodInstructions("Pague via QR Code exibido diretamente no balcão da loja.");
 setIsAddingMethod(true);
 }}
 >
 + Pix no Balcão
 </Button>
 </div>
 </div>

 {/* Formulário de Adicionar Nova Forma */}
 {isAddingMethod && (
 <div className="p-4 rounded-xl bg-muted/40 border border-border/70 space-y-3 animate-in fade-in-50">
 <div className="space-y-1">
 <Label className="text-xs font-bold text-foreground">Nome da Forma *</Label>
 <Input
 value={newMethodName}
 onChange={(e) => setNewMethodName(e.target.value)}
 placeholder="Ex: Maquininha de Cartão na Entrega, Dinheiro..."
 className="h-10 text-xs rounded-xl"
 />
 </div>
 <div className="space-y-1">
 <Label className="text-xs font-bold text-foreground">Instruções ao Cliente (Opcional)</Label>
 <Input
 value={newMethodInstructions}
 onChange={(e) => setNewMethodInstructions(e.target.value)}
 placeholder="Ex: Aceitamos débito, crédito e vale refeição..."
 className="h-10 text-xs rounded-xl"
 />
 </div>
 <div className="flex justify-end gap-2 pt-1">
 <Button
 type="button"
 variant="outline"
 size="sm"
 onClick={() => {
 setIsAddingMethod(false);
 setNewMethodName("");
 setNewMethodInstructions("");
 }}
 className="rounded-xl text-xs"
 >
 Cancelar
 </Button>
 <Button
 type="button"
 size="sm"
 onClick={handleCreateManualMethod}
 className="rounded-xl text-xs font-bold"
 >
 Salvar Opção
 </Button>
 </div>
 </div>
 )}

 {/* Listagem de Formas Cadastradas */}
 {manualMethods.length === 0 ? (
 <p className="text-xs text-muted-foreground italic">
 Nenhuma forma presencial cadastrada ainda. Utilize os botões de sugestão rápida acima para adicionar.
 </p>
 ) : (
 <div className="space-y-2.5">
 {manualMethods.map((method: any) => (
 <div
 key={method.id}
 className="p-3.5 rounded-xl border border-border/70 bg-card flex items-center justify-between gap-3"
 >
 <div className="space-y-0.5 min-w-0">
 <div className="flex items-center gap-2">
 <span className="text-xs font-bold text-foreground">{method.name}</span>
 <Badge
 variant={method.is_active ? "default" : "secondary"}
 className="text-[10px] font-semibold"
 >
 {method.is_active ? "Ativo" : "Inativo"}
 </Badge>
 </div>
 {method.instructions && (
 <p className="text-[11px] text-muted-foreground truncate">{method.instructions}</p>
 )}
 </div>

 <div className="flex items-center gap-3 shrink-0">
 <Switch
 checked={method.is_active}
 onCheckedChange={() => handleToggleManualMethod(method)}
 />
 <Button
 type="button"
 variant="ghost"
 size="sm"
 onClick={() => handleDeleteManualMethod(method.id)}
 className="size-8 p-0 text-destructive/70 hover:text-destructive hover:bg-destructive/10 rounded-lg cursor-pointer"
 >
 <Trash2 className="size-3.5" />
 </Button>
 </div>
 </div>
 ))}
 </div>
 )}
 </Card>

 <Card className="p-6 rounded-2xl border-border bg-card space-y-6">
 <div className="flex items-center justify-between gap-3 pb-3 border-b border-border/40">
 <div>
 <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
 <ListChecks className="size-4 text-primary" />
 <span>Campos do Checkout ({currentNiche.name})</span>
 </h2>
 <p className="text-xs text-muted-foreground mt-0.5">
 Perguntas adicionais que o cliente responde durante o fechamento do pedido.
 </p>
 </div>

 <Button
 type="button"
 size="sm"
 onClick={() => {
 setCustomFields((prev) => [
 ...prev,
 {
 id: `field_${Date.now()}`,
 label: "",
 placeholder: "",
 type: "text",
 required: true,
 help_text: "",
 },
 ]);
 }}
 className="rounded-xl text-xs font-bold gap-1.5 shrink-0 bg-primary text-primary-foreground cursor-pointer"
 >
 <Plus className="size-3.5" />
 <span>Adicionar Campo</span>
 </Button>
 </div>

 {/* Presets Sugeridos do Nicho */}
 <div className="space-y-2">
 <Label className="text-xs font-bold text-muted-foreground">Sugestões Rápidas para {currentNiche.name}:</Label>
 <div className="flex flex-wrap gap-2">
 {segment === "tourism" ? (
 <>
 <Button
 type="button"
 variant="outline"
 size="sm"
 className="rounded-xl text-xs h-8"
 onClick={() => setCustomFields((p) => [...p, { id: `f_${Date.now()}`, label: "Documento / Passaporte do Titular", placeholder: "RG, CPF ou Passaporte", type: "text", required: true }])}
 >
 + Documento / Passaporte
 </Button>
 <Button
 type="button"
 variant="outline"
 size="sm"
 className="rounded-xl text-xs h-8"
 onClick={() => setCustomFields((p) => [...p, { id: `f_${Date.now()}`, label: "Data de Nascimento dos Passageiros", placeholder: "Ex: Passageiro 1: 15/04/1990", type: "text", required: true }])}
 >
 + Data de Nascimento
 </Button>
 <Button
 type="button"
 variant="outline"
 size="sm"
 className="rounded-xl text-xs h-8"
 onClick={() => setCustomFields((p) => [...p, { id: `f_${Date.now()}`, label: "Preferência de Assento / Acomodação", placeholder: "Ex: Janela, Quarto Casal", type: "text", required: false }])}
 >
 + Preferência de Assento
 </Button>
 </>
 ) : isPhysicalDeliveryNiche ? (
 <>
 <Button
 type="button"
 variant="outline"
 size="sm"
 className="rounded-xl text-xs h-8"
 onClick={() => setCustomFields((p) => [...p, { id: `f_${Date.now()}`, label: "Observações / Alergias", placeholder: "Sem cebola, alergia a glúten...", type: "text", required: false }])}
 >
 + Observações / Alergias
 </Button>
 <Button
 type="button"
 variant="outline"
 size="sm"
 className="rounded-xl text-xs h-8"
 onClick={() => setCustomFields((p) => [...p, { id: `f_${Date.now()}`, label: "Precisa de Troco?", placeholder: "Ex: Troco para R$ 50", type: "text", required: false }])}
 >
 + Troco em Dinheiro
 </Button>
 <Button
 type="button"
 variant="outline"
 size="sm"
 className="rounded-xl text-xs h-8"
 onClick={() => setCustomFields((p) => [...p, { id: `f_${Date.now()}`, label: "Ponto de Referência", placeholder: "Próximo à praça central...", type: "text", required: false }])}
 >
 + Ponto de Referência
 </Button>
 </>
 ) : (
 <>
 <Button
 type="button"
 variant="outline"
 size="sm"
 className="rounded-xl text-xs h-8"
 onClick={() => setCustomFields((p) => [...p, { id: `f_${Date.now()}`, label: "CPF na Nota Fiscal", placeholder: "000.000.000-00", type: "text", required: false }])}
 >
 + CPF na Nota
 </Button>
 <Button
 type="button"
 variant="outline"
 size="sm"
 className="rounded-xl text-xs h-8"
 onClick={() => setCustomFields((p) => [...p, { id: `f_${Date.now()}`, label: "Instruções Especiais", placeholder: "Digite aqui suas orientações...", type: "textarea", required: false }])}
 >
 + Instruções Especiais
 </Button>
 </>
 )}
 </div>
 </div>

 {customFields.length === 0 ? (
 <div className="py-8 text-center space-y-2 border border-dashed border-border/70 rounded-2xl bg-card/40">
 <div className="size-10 rounded-2xl bg-muted text-muted-foreground flex items-center justify-center mx-auto">
 <ListChecks className="size-5" />
 </div>
 <h3 className="text-sm font-bold text-foreground">Nenhum campo personalizado ativo</h3>
 <p className="text-xs text-muted-foreground max-w-sm mx-auto">
 Clique em um dos botões acima ou crie um campo personalizado para o checkout da sua loja.
 </p>
 </div>
 ) : (
 <div className="space-y-4">
 {customFields.map((field, idx) => (
 <div
 key={field.id || idx}
 className="p-4 rounded-2xl bg-muted/20 space-y-4"
 >
 <div className="flex items-center justify-between">
 <span className="text-xs font-mono font-bold text-foreground">
 Pergunta #{idx + 1}
 </span>
 <Button
 type="button"
 size="icon"
 variant="ghost"
 onClick={() => {
 setCustomFields((prev) => prev.filter((_, i) => i !== idx));
 }}
 className="size-7 text-rose-500 hover:bg-rose-500/10 rounded-lg"
 >
 <Trash2 className="size-3.5" />
 </Button>
 </div>

 <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
 <div className="space-y-1 sm:col-span-2">
 <Label className="text-[11px] font-bold">Título da Pergunta / Label *</Label>
 <Input
 value={field.label || ""}
 onChange={(e) => {
 const val = e.target.value;
 setCustomFields((prev) =>
 prev.map((f, i) => (i === idx ? { ...f, label: val } : f)),
 );
 }}
 placeholder="ex: Placa do Veículo, Nome para Gravação, etc."
 className="rounded-xl text-xs h-9"
 />
 </div>

 <div className="space-y-1">
 <Label className="text-[11px] font-bold">Tipo de Resposta</Label>
 <select
 value={field.type || "text"}
 onChange={(e) => {
 const val = e.target.value;
 setCustomFields((prev) =>
 prev.map((f, i) => (i === idx ? { ...f, type: val } : f)),
 );
 }}
 className="w-full h-9 px-2.5 rounded-xl bg-card text-xs font-semibold"
 >
 <option value="text">Texto Curto</option>
 <option value="textarea">Texto Longo (Mensagem)</option>
 <option value="date">Data</option>
 <option value="number">Número</option>
 </select>
 </div>
 </div>

 <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
 <div className="space-y-1">
 <Label className="text-[11px] font-bold">Texto de Exemplo (Placeholder)</Label>
 <Input
 value={field.placeholder || ""}
 onChange={(e) => {
 const val = e.target.value;
 setCustomFields((prev) =>
 prev.map((f, i) => (i === idx ? { ...f, placeholder: val } : f)),
 );
 }}
 placeholder="ex: ABC-1234 ou Maria & João"
 className="rounded-xl text-xs h-9"
 />
 </div>

 <div className="flex items-center justify-between p-2 rounded-xl bg-card ">
 <div>
 <Label className="text-xs font-bold block">Resposta Obrigatória</Label>
 <span className="text-[10px] text-muted-foreground">
 Cliente não consegue pagar sem preencher
 </span>
 </div>
 <Switch
 checked={field.required ?? true}
 onCheckedChange={(checked) => {
 setCustomFields((prev) =>
 prev.map((f, i) => (i === idx ? { ...f, required: checked } : f)),
 );
 }}
 />
 </div>
 </div>
 </div>
 ))}
 </div>
 )}
 </Card>
 </TabsContent>
 </Tabs>
 </div>
 );
}
