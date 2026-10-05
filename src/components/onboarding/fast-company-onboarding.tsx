import React, { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  Building2,
  Phone,
  MapPin,
  Zap,
  ArrowRight,
  ShieldCheck,
  Store,
  CheckCircle2,
  Globe,
  Instagram,
  Plane,
  Utensils,
  Wrench,
  Package,
  Hotel,
  ShoppingBag,
  HeartPulse,
  Car,
  Loader2,
  Camera,
  Star,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { fastRegisterCompany } from "@/services/company-mvp.functions";
import { ImageUpload } from "@/components/ui/image-upload";
import { AddressField, type AddressData } from "@/components/ui/address-field";
import { CityCombobox } from "@/components/ui/city-combobox";
import { generateSlug } from "@/lib/slug-utils";
import { useMasterLocation } from "@/components/location/location-master-pill";
import { executeMagicOnboarding, type MagicOnboardingResult } from "@/services/magic-onboarding.functions";
import { AiLiveExtractionDisplay } from "@/components/onboarding/ai-live-extraction-display";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const QUICK_CATEGORIES = [
  { id: "turismo", label: "Viagens e Turismo", icon: Plane },
  { id: "gastronomia", label: "Restaurantes e Gastronomia", icon: Utensils },
  { id: "servicos", label: "Prestação de Serviços", icon: Wrench },
  { id: "equipamentos", label: "Aluguel de Equipamentos e Eventos", icon: Package },
  { id: "hospedagem", label: "Pousadas e Hospedagem", icon: Hotel },
  { id: "comercio", label: "Comércio e Varejo", icon: ShoppingBag },
  { id: "saude", label: "Saúde e Beleza", icon: HeartPulse },
  { id: "automotivo", label: "Veículos e Oficinas", icon: Car },
  { id: "outros", label: "Outros Negócios Locais", icon: Building2 },
];

export interface FastCompanyOnboardingProps {
  userId?: string;
  onSuccess?: (storeId: string) => void;
}

export function FastCompanyOnboarding({ userId, onSuccess }: FastCompanyOnboardingProps = {}) {
  const navigate = useNavigate();

  const { location: masterLoc } = useMasterLocation();
  const detectedCity = masterLoc?.city && masterLoc.city.toLowerCase() !== "global" ? masterLoc.city : "";
  const detectedState = masterLoc?.state || "SC";

  const [name, setName] = useState("");
  const [category, setCategory] = useState("servicos");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState(detectedCity);
  const [state, setState] = useState(detectedState);
  const [address, setAddress] = useState("");
  const [bio, setBio] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [bannerUrl, setBannerUrl] = useState("");
  const [website, setWebsite] = useState("");
  const [instagram, setInstagram] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Estados de IA e Extração ao Vivo (Terminal Real dos 5 Squads)
  const [aiUrlInput, setAiUrlInput] = useState("");
  const [isExtractingAi, setIsExtractingAi] = useState(false);
  const [aiResult, setAiResult] = useState<MagicOnboardingResult | null>(null);
  const [aiJobId, setAiJobId] = useState<string | null>(null);
  const [showAiDisplay, setShowAiDisplay] = useState(false);

  // Disparo do Motor de Extração com IA (Firecrawl + Steel + Concílio)
  const handleStartAiExtraction = async (targetUrlOverride?: string) => {
    const rawTarget = (targetUrlOverride || aiUrlInput || website || instagram || "").trim();
    if (!rawTarget) {
      toast.error("Informe a URL do seu site ou perfil do Instagram/Facebook para extrair.");
      return;
    }

    let formattedUrl = rawTarget;
    if (formattedUrl.startsWith("@")) {
      formattedUrl = `https://instagram.com/${formattedUrl.slice(1)}`;
    } else if (!formattedUrl.startsWith("http://") && !formattedUrl.startsWith("https://")) {
      formattedUrl = `https://${formattedUrl}`;
    }

    setAiUrlInput(formattedUrl);
    setShowAiDisplay(true);
    setIsExtractingAi(true);
    setAiResult(null);

    try {
      toast.loading("Iniciando concílio de squads e mineração de dados...", { id: "ai-extract" });
      const res = await executeMagicOnboarding({
        data: {
          url: formattedUrl,
        },
      });

      if (res?.result) {
        setAiResult(res.result);
        if (res.result.job_id) {
          setAiJobId(res.result.job_id);
        }
        toast.success("Dados minerados com sucesso! Revise os campos mapeados.", { id: "ai-extract" });
      }
    } catch (err: any) {
      toast.error(err?.message || "Falha na extração de dados por IA.", { id: "ai-extract" });
    } finally {
      setIsExtractingAi(false);
    }
  };

  const handleApplyAiResult = (extracted: MagicOnboardingResult) => {
    if (extracted.company_name) setName(extracted.company_name);
    if (extracted.bio) setBio(extracted.bio);
    if (extracted.contact?.whatsapp || extracted.contact?.phone) {
      setPhone(extracted.contact.whatsapp || extracted.contact.phone || phone);
    }
    if (extracted.contact?.city) setCity(extracted.contact.city);
    if (extracted.contact?.state) setState(extracted.contact.state);
    if (extracted.contact?.address) setAddress(extracted.contact.address);

    if (extracted.category) {
      const match = QUICK_CATEGORIES.find(
        (c) => c.id === extracted.category || c.label.toLowerCase().includes(extracted.category.toLowerCase())
      );
      if (match) setCategory(match.id);
    }

    if (aiUrlInput) {
      if (aiUrlInput.includes("instagram.com")) {
        const handle = aiUrlInput.split("instagram.com/")[1]?.split("/")[0]?.split("?")[0];
        if (handle) setInstagram(`@${handle}`);
      } else {
        setWebsite(aiUrlInput);
      }
    }

    setShowAiDisplay(false);
    toast.success("Formulário preenchido com sucesso a partir da inteligência minerada!");
  };

  const handleAddressChange = (val: AddressData) => {
    if (val.city) setCity(val.city);
    if (val.state) setState(val.state);
    if (val.text) setAddress(val.text);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Por favor, informe o nome da sua empresa.");
      return;
    }
    if (!phone.trim()) {
      toast.error("Por favor, informe o WhatsApp de atendimento.");
      return;
    }
    if (!city.trim()) {
      toast.error("Por favor, informe a cidade de atuação.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fastRegisterCompany({
        data: {
          name: name.trim(),
          category,
          phone: phone.trim(),
          city: city.trim(),
          state: state.trim() || "SC",
          address: address.trim() || undefined,
          bio: bio.trim() || undefined,
          logoUrl: logoUrl.trim() || undefined,
          bannerUrl: bannerUrl.trim() || undefined,
          website: website.trim() || undefined,
          instagram: instagram.trim() || undefined,
          onboardingJobId: aiJobId || undefined,
        },
      });

      if (res?.success) {
        toast.success("Empresa cadastrada no Diretório e Classificados!");
        const resolvedStore = res.store;
        const resolvedSlug = resolvedStore?.slug || (res as any).slug;
        const resolvedStoreId = resolvedStore?.id || (res as any).storeId;

        if (typeof window !== "undefined" && resolvedStoreId) {
          window.document.cookie = "waesy_active_context=store; path=/; max-age=31536000; SameSite=Lax";
          window.document.cookie = `waesy_active_tenant=${resolvedStoreId}; path=/; max-age=31536000; SameSite=Lax`;
          window.document.cookie = `waesy_store_id=${resolvedStoreId}; path=/; max-age=31536000; SameSite=Lax`;
          window.document.cookie = "waesy_active_creator=; path=/; max-age=0; SameSite=Lax";
        }

        if (onSuccess && resolvedStoreId) {
          onSuccess(resolvedStoreId);
        } else {
          window.location.href = "/workspace";
        }
      }
    } catch (err: any) {
      toast.error(err.message || "Erro ao cadastrar empresa.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedCat = QUICK_CATEGORIES.find((c) => c.id === category) || QUICK_CATEGORIES[0];
  const CatIcon = selectedCat.icon;
  const cleanSlug = generateSlug(name || "sua-empresa");

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
      {/* Coluna Esquerda: Formulário de Entrada Ágil (7 cols) */}
      <div className="lg:col-span-7 space-y-6">
        <div className="space-y-2">
          <Badge variant="outline" className="text-xs font-bold gap-2 border-primary/30 text-primary bg-primary/5">
            <Zap className="size-3.5" />
            <span>Cadastro Rápido de Presença Comercial</span>
          </Badge>
          <h2 className="text-xl sm:text-2xl font-black text-foreground tracking-tight">
            Coloque sua empresa no Guia
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
            Cadastre os dados essenciais com preenchimento assistido por IA e geolocalização exata para começar a receber clientes no seu perfil e no WhatsApp.
          </p>
        </div>

        {/* ── Box de Autopreenchimento Inteligente com IA (Website / Instagram) ── */}
        <div className="p-4 sm:p-5 rounded-lg bg-card border border-border/80 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap className="size-4 text-primary" />
              <span className="text-xs font-bold text-foreground">Preencher com IA via Link</span>
            </div>
            <Badge variant="outline" className="text-[10px] font-mono bg-background text-muted-foreground">
              Automação Soberana
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Informe o site, Instagram ou página da sua empresa. A inteligência artificial varre os dados reais, minera a identidade visual e preenche o formulário.
          </p>

          <div className="flex flex-col sm:flex-row items-center gap-2">
            <div className="relative w-full">
              <Globe className="size-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={aiUrlInput}
                onChange={(e) => setAiUrlInput(e.target.value)}
                placeholder="https://seusite.com.br ou @seuinstagram"
                className="h-11 pl-9 rounded-lg text-xs"
                disabled={isExtractingAi}
              />
            </div>
            <Button
              type="button"
              onClick={() => handleStartAiExtraction()}
              disabled={isExtractingAi || !aiUrlInput.trim()}
              className="w-full sm:w-auto h-11 px-5 rounded-lg text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/90 shadow-2xs shrink-0 cursor-pointer gap-1.5"
            >
              {isExtractingAi ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" />
                  <span>Minerando...</span>
                </>
              ) : (
                <>
                  <Zap className="size-3.5" />
                  <span>Extrair com IA</span>
                </>
              )}
            </Button>
          </div>
        </div>

        {/* ── Terminal ao Vivo de Execução da IA (se ativo) ── */}
        {showAiDisplay && (
          <AiLiveExtractionDisplay
            url={aiUrlInput}
            isProcessing={isExtractingAi}
            result={aiResult}
            onApplyResult={handleApplyAiResult}
            onCancel={() => setShowAiDisplay(false)}
          />
        )}

        <form onSubmit={handleSubmit} className="p-6 rounded-lg bg-card border border-border/60 shadow-sm space-y-5">
          {/* Nome da Empresa */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-foreground flex items-center gap-2">
              <Building2 className="size-3.5 text-primary" />
              <span>Nome Fantasia da Empresa *</span>
            </label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Agência Serra Sol Turismo, Estúdio Som & Luz..."
              className="h-11 rounded-lg text-xs sm:text-sm font-medium"
              required
            />
          </div>

          {/* Segmento & WhatsApp */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-foreground">Segmento de Atuação *</label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="h-11 rounded-lg text-xs bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {QUICK_CATEGORIES.map((c) => {
                    const Icon = c.icon;
                    return (
                      <SelectItem key={c.id} value={c.id} className="text-xs">
                        <div className="flex items-center gap-2">
                          <Icon className="size-3.5 text-muted-foreground" />
                          <span>{c.label}</span>
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-foreground flex items-center gap-1">
                <Phone className="size-3.5 text-primary" />
                <span>WhatsApp Comercial *</span>
              </label>
              <Input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="(49) 99999-9999"
                className="h-11 rounded-lg text-xs sm:text-sm font-medium"
                required
              />
            </div>
          </div>

          {/* Cidade e Estado Canônicos do Banco Local */}
          <div className="space-y-2 pt-1 border-t border-border/40">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <MapPin className="size-3.5 text-primary" />
                <span>Cidade de Atuação *</span>
              </label>
              <Badge variant="outline" className="text-[10px] font-mono bg-muted/30">
                Banco Próprio Waesy
              </Badge>
            </div>
            <CityCombobox
              value={city && state ? `${city} - ${state}` : city}
              onChange={(formatted, structured) => {
                if (structured?.city) setCity(structured.city);
                if (structured?.state) setState(structured.state);
              }}
            />
          </div>

          {/* Endereço e Localização Interativa com CEP e Banco Próprio */}
          <div className="space-y-2 pt-1 border-t border-border/40">
            <label className="text-xs font-bold text-foreground flex items-center gap-2">
              <MapPin className="size-3.5 text-primary" />
              <span>Endereço e Ponto no Mapa</span>
            </label>
            <AddressField
              value={{ text: address, city, state }}
              onChange={handleAddressChange}
            />
          </div>

          {/* Bio / Apresentação da Empresa */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-foreground">Apresentação e Diferenciais (Bio)</label>
              <span className="text-[11px] text-muted-foreground font-mono">{bio.length}/600</span>
            </div>
            <Textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Descreva os diferenciais da sua empresa, horários de atendimento ou serviços principais..."
              className="min-h-[85px] rounded-lg text-xs resize-none"
              maxLength={600}
            />
          </div>

          {/* Identidade Visual: Logo (1:1) e Capa Panorâmica (21:9) */}
          <div className="space-y-3 pt-2 border-t border-border/40">
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block">
              Identidade Visual Oficial (Opcional)
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[11px] font-medium text-muted-foreground">Logotipo (1:1)</label>
                <ImageUpload
                  value={logoUrl}
                  onChange={setLogoUrl}
                  bucket="avatars"
                  aspectPreset="square"
                  helperText="Upload da logo quadrada (1:1)"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-medium text-muted-foreground">Capa do Perfil (21:9)</label>
                <ImageUpload
                  value={bannerUrl}
                  onChange={setBannerUrl}
                  bucket="store-assets"
                  aspectPreset="banner"
                  helperText="Upload da capa oficial panorâmica (21:9)"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[11px] font-medium text-muted-foreground flex items-center gap-1">
                  <Globe className="size-3 text-muted-foreground" />
                  <span>Site Oficial</span>
                </label>
                <Input
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  placeholder="https://suaempresa.com.br"
                  className="h-11 rounded-lg text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-medium text-muted-foreground flex items-center gap-1">
                  <Instagram className="size-3 text-muted-foreground" />
                  <span>Instagram</span>
                </label>
                <Input
                  value={instagram}
                  onChange={(e) => setInstagram(e.target.value)}
                  placeholder="@suaempresa"
                  className="h-11 rounded-lg text-xs"
                />
              </div>
            </div>
          </div>

          <div className="pt-3">
            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full h-12 rounded-lg text-xs sm:text-sm font-black gap-2 bg-foreground text-background hover:bg-foreground/90 shadow-md active:scale-[0.99] transition-all cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  <span>Criando Perfil Comercial...</span>
                </>
              ) : (
                <>
                  <span>Concluir Cadastro</span>
                  <ArrowRight className="size-4" />
                </>
              )}
            </Button>
          </div>
        </form>
      </div>

      {/* Coluna Direita: Live Truthful Public Profile Preview (5 cols) */}
      <div className="lg:col-span-5 sticky top-24 space-y-4">
        <div className="p-4 bg-muted/40 rounded-lg border border-border/60 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Store className="size-4 text-primary" />
            <span className="text-xs font-bold text-foreground">Prévia Real do Perfil Público</span>
          </div>
          <Badge variant="outline" className="text-[10px] font-mono">
            Ao Vivo
          </Badge>
        </div>

        {/* Card do Perfil Público Canônico (Fiel à CanonicalStoreProfileView: Foto 1:1 Squircle ao lado da Capa 21:9) */}
        <div className="rounded-lg border border-border/60 bg-card overflow-hidden shadow-2xs space-y-0">
          {/* Topo Canônico: Foto 1:1 Squircle + Capa 21:9 ao lado */}
          <div className="p-4 bg-card border-b border-border/40">
            <div className="flex items-center gap-3 w-full">
              {/* Logo Squircle 1:1 */}
              <div className="size-16 sm:size-20 rounded-lg border-2 border-border/60 bg-background overflow-hidden flex items-center justify-center shadow-2xs shrink-0">
                {logoUrl ? (
                  <img src={logoUrl} alt={name || "Logo"} className="size-full object-cover select-none" />
                ) : (
                  <div className="size-full bg-foreground text-background flex items-center justify-center font-black text-xl select-none">
                    {name ? name.charAt(0).toUpperCase() : "E"}
                  </div>
                )}
              </div>

              {/* Capa Panorâmica Canônica 21:9 ao lado */}
              <div className="flex-1 min-w-0 aspect-[21/9] rounded-lg bg-muted relative overflow-hidden flex items-center border border-border/40">
                {bannerUrl ? (
                  <img src={bannerUrl} alt="Capa da empresa" className="size-full object-cover select-none" />
                ) : (
                  <div className="size-full bg-gradient-to-r from-primary/10 via-muted/40 to-primary/15 flex items-center justify-center p-2 text-center">
                    <Store className="size-6 text-primary/30" />
                  </div>
                )}
                <div className="absolute bottom-2 left-2">
                  <Badge className="bg-black/75 backdrop-blur-md text-white border-white/20 text-[9px] font-bold gap-1">
                    <CatIcon className="size-2.5" />
                    <span>{selectedCat.label}</span>
                  </Badge>
                </div>
              </div>
            </div>
          </div>

          {/* Dados da Loja */}
          <div className="p-4 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="space-y-0.5 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <h3 className="font-black text-base text-foreground tracking-tight truncate">
                    {name || "Nome da Sua Empresa"}
                  </h3>
                  <ShieldCheck className="size-3.5 text-primary" />
                </div>
                <span className="text-[11px] font-mono text-muted-foreground block truncate">
                  @{cleanSlug}
                </span>
              </div>

              <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-[10px] font-bold gap-1 shrink-0">
                <ShieldCheck className="size-3" />
                <span>Ativo</span>
              </Badge>
            </div>

            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <MapPin className="size-3 text-primary shrink-0" />
              <span>{city || "Cidade"}, {state}</span>
              {address && <span className="truncate">• {address}</span>}
            </p>

            {/* Bio formatada */}
            <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
              {bio || "Apresentação e especialidades da sua empresa divulgadas para toda a comunidade..."}
            </p>

            {/* Ações do Perfil */}
            <div className="pt-2 border-t border-border/40 flex items-center justify-between gap-2">
              <span className="text-[11px] font-mono text-muted-foreground">
                {phone || "(49) 99999-9999"}
              </span>
              <div className="px-3.5 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-bold shadow-xs">
                WhatsApp
              </div>
            </div>

            {/* Abas da Vitrine Canônica */}
            <div className="pt-1 flex items-center gap-4 text-[11px] font-semibold text-muted-foreground border-t border-border/30">
              <span className="text-foreground border-b-2 border-primary pb-1">Vitrine</span>
              <span className="pb-1">Sobre</span>
              <span className="pb-1">Posts</span>
              <span className="pb-1">Avaliações</span>
            </div>
          </div>
        </div>

        {/* Garantia do Sistema */}
        <div className="p-4 rounded-lg bg-muted/20 border border-border/40 space-y-2 text-xs text-muted-foreground">
          <p className="font-bold text-foreground flex items-center gap-2">
            <CheckCircle2 className="size-3.5 text-emerald-500" />
            <span>Perfil Oficial no Diretório e Guia</span>
          </p>
          <p className="text-2xs leading-relaxed">
            Assim que você concluir, sua empresa aparecerá na vitrine pública com link oficial (<code className="text-foreground font-mono">waesy.com.br/loja/{cleanSlug}</code>) e integração direta com o WhatsApp comercial.
          </p>
        </div>
      </div>
    </div>
  );
}
