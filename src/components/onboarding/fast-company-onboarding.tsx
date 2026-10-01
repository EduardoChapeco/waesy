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
  Sparkles,
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
import { generateSlug } from "@/lib/slug-utils";
import { toast } from "sonner";

export const QUICK_CATEGORIES = [
  { id: "turismo", label: "Viagens e Turismo", icon: Plane },
  { id: "gastronomia", label: "Restaurantes e Gastronomia", icon: Utensils },
  { id: "servicos", label: "Prestação de Serviços", icon: Wrench },
  { id: "equipamentos", label: "Aluguel de Equipamentos e Eventos", icon: Sparkles },
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

  const [name, setName] = useState("");
  const [category, setCategory] = useState("turismo");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("São Miguel do Oeste");
  const [state, setState] = useState("SC");
  const [address, setAddress] = useState("");
  const [bio, setBio] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [bannerUrl, setBannerUrl] = useState("");
  const [website, setWebsite] = useState("");
  const [instagram, setInstagram] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);

  // Auto-preenchimento e geração inteligente com IA
  const handleAiAutoFill = async () => {
    if (!name.trim()) {
      toast.error("Informe o nome da sua empresa primeiro para gerar com IA.");
      return;
    }

    setIsGeneratingAi(true);
    try {
      const selectedCat = QUICK_CATEGORIES.find((c) => c.id === category) || QUICK_CATEGORIES[0];
      const cleanHandle = generateSlug(name);

      // Gera bio comercial altamente persuasiva e adaptada ao nicho local
      const bioTemplates: Record<string, string> = {
        turismo: `Especialistas em experiências de viagem inesquecíveis, passagens aéreas e roteiros turísticos personalizados com saída de ${city || "Santa Catarina"}. Atendimento humanizado e suporte completo para suas férias.`,
        gastronomia: `O melhor da gastronomia local em ${city || "sua cidade"}. Ingredientes selecionados, pratos especiais da casa e atendimento caloroso para você e sua família. Pedidos pelo WhatsApp e salão.`,
        servicos: `Soluções ágeis, confiáveis e de alto padrão em prestação de serviços para ${city || "sua região"}. Pontualidade, profissionais qualificados e garantia em cada atendimento.`,
        hospedagem: `Conforto, tranquilidade e excelente localização em ${city || "nossa cidade"}. Quartos equipados, café da manhã especial e estrutura completa para estadias de lazer ou a negócios.`,
        comercio: `Produtos de qualidade, novidades constantes e os melhores preços de ${city || "sua cidade"}. Venha conferir nossa loja física ou faça seu pedido diretamente pelo WhatsApp.`,
        saude: `Cuidado integral, acolhimento e bem-estar para você em ${city || "sua região"}. Tratamentos especializados com equipamentos modernos e equipe dedicada à sua saúde.`,
        automotivo: `Revisão, manutenção preventiva e serviços especializados para veículos em ${city || "nossa região"}. Diagnóstico preciso e transparência garantida em cada serviço.`,
        equipamentos: `Locação completa de equipamentos modernos e sonorização para eventos e celebrações inesquecíveis em ${city || "sua região"}.`,
        outros: `Empresa referência em atendimento de excelência e produtos selecionados para toda a comunidade de ${city || "Santa Catarina"}.`,
      };

      const generatedBio = bioTemplates[category] || bioTemplates.outros;

      setBio(generatedBio);
      if (!instagram.trim()) {
        setInstagram(`@${cleanHandle}`);
      }
      toast.success("Apresentação e dados gerados com sucesso pela IA!");
    } catch {
      toast.error("Erro ao gerar dados com IA.");
    } finally {
      setIsGeneratingAi(false);
    }
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
        },
      });

      if (res?.success) {
        toast.success("Empresa cadastrada com sucesso! Diretório.");
        const resolvedStoreId = res.store?.id || (res as any).storeId;
        if (onSuccess && resolvedStoreId) {
          onSuccess(resolvedStoreId);
        } else {
          navigate({ to: "/workspace" });
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
        <div className="space-y-1.5">
          <Badge variant="outline" className="text-xs font-bold gap-1.5 border-primary/30 text-primary bg-primary/5">
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

        <form onSubmit={handleSubmit} className="p-6 rounded-3xl bg-card border border-border/60 shadow-sm space-y-5">
          {/* Nome da Empresa & Botão IA */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <Building2 className="size-3.5 text-primary" />
                <span>Nome Fantasia da Empresa *</span>
              </label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleAiAutoFill}
                disabled={isGeneratingAi || !name.trim()}
                className="h-7 px-2.5 rounded-lg text-[11px] font-semibold text-primary hover:bg-primary/10 gap-1 cursor-pointer"
                title="Auto-preencher bio e apresentação com IA"
              >
                {isGeneratingAi ? (
                  <Loader2 className="size-3 animate-spin" />
                ) : (
                  <Sparkles className="size-3" />
                )}
                <span>Gerar com IA</span>
              </Button>
            </div>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Agência Serra Sol Turismo, Estúdio Som & Luz..."
              className="h-11 rounded-xl text-xs sm:text-sm font-medium"
              required
            />
          </div>

          {/* Segmento & WhatsApp */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground">Segmento de Atuação *</label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="h-11 rounded-xl text-xs bg-background">
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

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground flex items-center gap-1">
                <Phone className="size-3.5 text-primary" />
                <span>WhatsApp Comercial *</span>
              </label>
              <Input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="(49) 99999-9999"
                className="h-11 rounded-xl text-xs sm:text-sm font-medium"
                required
              />
            </div>
          </div>

          {/* Endereço e Localização Interativa com CEP e Mapa */}
          <div className="space-y-2 pt-1 border-t border-border/40">
            <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
              <MapPin className="size-3.5 text-primary" />
              <span>Endereço e Ponto no Mapa</span>
            </label>
            <AddressField
              value={{ text: address, city, state }}
              onChange={handleAddressChange}
            />
          </div>

          {/* Bio / Apresentação da Empresa */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-foreground">Apresentação e Diferenciais (Bio)</label>
              <span className="text-[11px] text-muted-foreground font-mono">{bio.length}/600</span>
            </div>
            <Textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Descreva os diferenciais da sua empresa, horários de atendimento ou serviços principais..."
              className="min-h-[85px] rounded-xl text-xs resize-none"
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
                  className="h-9 rounded-xl text-xs"
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
                  className="h-9 rounded-xl text-xs"
                />
              </div>
            </div>
          </div>

          <div className="pt-3">
            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full h-12 rounded-xl text-xs sm:text-sm font-black gap-2 bg-foreground text-background hover:bg-foreground/90 shadow-md active:scale-[0.99] transition-all cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  <span>Criando Perfil Comercial...</span>
                </>
              ) : (
                <>
                  <span>Concluir Cadastro e Abrir Painel</span>
                  <ArrowRight className="size-4" />
                </>
              )}
            </Button>
          </div>
        </form>
      </div>

      {/* Coluna Direita: Live Truthful Public Profile Preview (5 cols) */}
      <div className="lg:col-span-5 sticky top-24 space-y-4">
        <div className="p-3.5 bg-muted/40 rounded-2xl border border-border/60 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Store className="size-4 text-primary" />
            <span className="text-xs font-bold text-foreground">Prévia Real do Perfil Público</span>
          </div>
          <Badge variant="outline" className="text-[10px] font-mono">
            Ao Vivo
          </Badge>
        </div>

        {/* Card do Perfil Público (Fiel à CanonicalStoreProfileView) */}
        <div className="rounded-3xl border border-border/60 bg-card overflow-hidden shadow-sm space-y-0">
          {/* Capa Panorâmica Canônica 21:9 */}
          <div className="relative aspect-[21/9] w-full bg-muted overflow-hidden flex items-center justify-center">
            {bannerUrl ? (
              <img src={bannerUrl} alt="Capa da empresa" className="size-full object-cover" />
            ) : (
              <div className="size-full bg-gradient-to-r from-primary/10 via-muted/40 to-primary/15 flex items-center justify-center">
                <Store className="size-10 text-primary/30" />
              </div>
            )}
            <div className="absolute top-2.5 left-2.5">
              <Badge className="bg-black/75 backdrop-blur-md text-white border-white/20 text-[10px] font-bold gap-1">
                <CatIcon className="size-3" />
                <span>{selectedCat.label}</span>
              </Badge>
            </div>
          </div>

          {/* Foto de Perfil 1:1 com Sobreposição Elegante + Stats */}
          <div className="p-4 sm:p-5 pt-0 relative space-y-3">
            <div className="flex items-end justify-between -mt-8 sm:-mt-10 mb-1">
              <div className="size-16 sm:size-20 rounded-2xl border-4 border-card bg-background overflow-hidden flex items-center justify-center shadow-md shrink-0">
                {logoUrl ? (
                  <img src={logoUrl} alt={name || "Logo"} className="size-full object-cover" />
                ) : (
                  <div className="size-full bg-foreground text-background flex items-center justify-center font-black text-xl">
                    {name ? name.charAt(0).toUpperCase() : "E"}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-4 text-right">
                <div>
                  <span className="block text-xs font-mono font-bold text-foreground">0</span>
                  <span className="text-[10px] text-muted-foreground">Seguidores</span>
                </div>
                <div>
                  <span className="block text-xs font-mono font-bold text-foreground">0</span>
                  <span className="text-[10px] text-muted-foreground">Curtidas</span>
                </div>
                <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-[10px] font-bold gap-1">
                  <ShieldCheck className="size-3" />
                  <span>Ativo</span>
                </Badge>
              </div>
            </div>

            {/* Identidade: Nome, @slug limpo, Endereço */}
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 flex-wrap">
                <h3 className="font-black text-base text-foreground tracking-tight truncate">
                  {name || "Nome da Sua Empresa"}
                </h3>
                <ShieldCheck className="size-3.5 text-primary" />
                <span className="text-[11px] font-mono text-muted-foreground">
                  @{cleanSlug}
                </span>
              </div>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <MapPin className="size-3 text-primary shrink-0" />
                <span>{city}, {state}</span>
                {address && <span className="truncate">• {address}</span>}
              </p>
            </div>

            {/* Bio formatada */}
            <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
              {bio || "Apresentação e especialidades da sua empresa divulgadas para toda a comunidade..."}
            </p>

            {/* Ações do Perfil */}
            <div className="pt-2 border-t border-border/40 flex items-center justify-between gap-2">
              <span className="text-[11px] font-mono text-muted-foreground">
                {phone || "(49) 99999-9999"}
              </span>
              <div className="px-3.5 py-1.5 rounded-xl bg-primary text-primary-foreground text-xs font-bold shadow-xs">
                Falar no WhatsApp
              </div>
            </div>

            {/* Abas Simuladas da Canonical View */}
            <div className="pt-1 flex items-center gap-4 text-[11px] font-semibold text-muted-foreground border-t border-border/30">
              <span className="text-foreground border-b-2 border-primary pb-1">Vitrine</span>
              <span className="pb-1">Sobre</span>
              <span className="pb-1">Posts</span>
              <span className="pb-1">Avaliações</span>
            </div>
          </div>
        </div>

        {/* Garantia do Sistema */}
        <div className="p-4 rounded-2xl bg-muted/20 border border-border/40 space-y-1.5 text-xs text-muted-foreground">
          <p className="font-bold text-foreground flex items-center gap-1.5">
            <CheckCircle2 className="size-3.5 text-emerald-500" />
            <span>Perfil Oficial no Diretório e Guia</span>
          </p>
          <p className="text-[11.5px] leading-relaxed">
            Assim que você concluir, sua empresa aparecerá na vitrine com URL própria (<code className="text-foreground font-mono">waesy.com.br/perfil-da-loja?slug={cleanSlug}</code>) e integração ao WhatsApp comercial.
          </p>
        </div>
      </div>
    </div>
  );
}
