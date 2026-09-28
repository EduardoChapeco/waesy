import React, { useState } from "react";
import { useNavigate, Link } from "@tanstack/react-router";
import { Building2, Phone, MapPin, Zap, ArrowRight, ShieldCheck, Store, UploadCloud, CheckCircle2, Globe, Instagram, Layers, Sliders } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { fastRegisterCompany } from "@/services/company-mvp.functions";
import { ImageUpload } from "@/components/ui/image-upload";
import { toast } from "sonner";

const QUICK_CATEGORIES = [
  { id: "turismo", label: "Viagens e Turismo", emoji: "✈️" },
  { id: "gastronomia", label: "Restaurantes e Gastronomia", emoji: "🍽️" },
  { id: "servicos", label: "Prestação de Serviços", emoji: "🛠️" },
  { id: "equipamentos", label: "Aluguel de Equipamentos e Eventos", emoji: "🎪" },
  { id: "hospedagem", label: "Pousadas e Hospedagem", emoji: "🏡" },
  { id: "comercio", label: "Comércio e Varejo", emoji: "🛍️" },
  { id: "saude", label: "Saúde e Beleza", emoji: "💄" },
  { id: "automotivo", label: "Veículos e Oficinas", emoji: "🚗" },
  { id: "outros", label: "Outros Negócios Locais", emoji: "🏢" },
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
  const [city, setCity] = useState("Chapecó");
  const [state, setState] = useState("SC");
  const [address, setAddress] = useState("");
  const [bio, setBio] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [bannerUrl, setBannerUrl] = useState("");
  const [website, setWebsite] = useState("");
  const [instagram, setInstagram] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

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
          navigate({ to: "/conta/empresa" });
        }
      }
    } catch (err: any) {
      toast.error(err.message || "Erro ao cadastrar empresa.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedCat = QUICK_CATEGORIES.find((c) => c.id === category) || QUICK_CATEGORIES[0];

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
            Cadastre os dados essenciais em 1 minuto para começar a publicar pacotes, serviços ou produtos e receber leads diretamente no seu WhatsApp e no Mini Painel.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 rounded-3xl bg-card border border-border/60 shadow-sm space-y-5">
          {/* Nome da Empresa */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
              <span>Nome Fantasia da Empresa *</span>
            </label>
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
                  {QUICK_CATEGORIES.map((c) => (
                    <SelectItem key={c.id} value={c.id} className="text-xs">
                      {c.emoji} {c.label}
                    </SelectItem>
                  ))}
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

          {/* Cidade & Estado */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2 space-y-1.5">
              <label className="text-xs font-bold text-foreground flex items-center gap-1">
                <MapPin className="size-3.5 text-primary" />
                <span>Cidade Sede *</span>
              </label>
              <Input
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Chapecó, Florianópolis..."
                className="h-11 rounded-xl text-xs"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground">Estado</label>
              <Input
                value={state}
                onChange={(e) => setState(e.target.value.toUpperCase())}
                placeholder="SC"
                maxLength={2}
                className="h-11 rounded-xl text-xs uppercase"
              />
            </div>
          </div>

          {/* Endereço / Bairro (Opcional) */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-foreground">Endereço ou Ponto de Atendimento (Opcional)</label>
            <Input
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Ex: Av. Getúlio Vargas, 1000 - Centro"
              className="h-11 rounded-xl text-xs"
            />
          </div>

          {/* Bio / Sobre a Empresa */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-foreground">Apresentação e Especialidades (Bio)</label>
            <Textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Descreva os diferenciais da sua empresa, horários de atendimento ou serviços principais..."
              className="min-h-[85px] rounded-xl text-xs resize-none"
              maxLength={600}
            />
          </div>

          {/* Links e Imagens Opcionais */}
          <div className="space-y-3 pt-2 border-t border-border/40">
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block">
              Identidade Visual e Links (Opcional)
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[11px] font-medium text-muted-foreground">Logotipo da Empresa</label>
                <ImageUpload
                  value={logoUrl}
                  onChange={setLogoUrl}
                  bucket="avatars"
                  aspectPreset="square"
                  helperText="Upload da logo (1:1)"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-medium text-muted-foreground">Foto de Capa / Fachada</label>
                <ImageUpload
                  value={bannerUrl}
                  onChange={setBannerUrl}
                  bucket="store-assets"
                  aspectPreset="widescreen"
                  helperText="Upload da capa panorâmica (16:9)"
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
              className="w-full h-12 rounded-xl text-xs sm:text-sm font-black gap-2 bg-foreground text-background hover:bg-foreground/90 shadow-md active:scale-[0.99] transition-all"
            >
              {isSubmitting ? (
                "Criando Perfil Comercial..."
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

      {/* Coluna Direita: Live Truthful Preview (5 cols) */}
      <div className="lg:col-span-5 sticky top-24 space-y-4">
        <div className="p-3.5 bg-muted/40 rounded-2xl border border-border/60 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Store className="size-4 text-primary" />
            <span className="text-xs font-bold text-foreground">Prévia no Guia e Diretório</span>
          </div>
          <Badge variant="outline" className="text-[10px] font-mono">
            Ao Vivo
          </Badge>
        </div>

        {/* Card Simulado da Empresa */}
        <div className="rounded-3xl border border-border/60 bg-card overflow-hidden shadow-sm space-y-3">
          {/* Capa */}
          <div className="relative aspect-[16/7] w-full bg-muted overflow-hidden">
            {bannerUrl ? (
              <img src={bannerUrl} alt="Capa" className="size-full object-cover" />
            ) : (
              <div className="size-full bg-gradient-to-tr from-primary/20 via-muted to-muted/60 flex items-center justify-center">
                <Store className="size-12 text-muted-foreground/30" />
              </div>
            )}
            <div className="absolute top-3 left-3">
              <Badge className="bg-black/70 backdrop-blur-md text-white border-white/20 text-[10px] font-bold gap-1">
                <span>{selectedCat.emoji}</span>
                <span>{selectedCat.label}</span>
              </Badge>
            </div>
          </div>

          {/* Logo e Dados */}
          <div className="p-5 pt-0 relative space-y-3">
            <div className="flex items-end justify-between -mt-8 mb-1">
              <div className="size-16 rounded-2xl border-[3px] border-card bg-background overflow-hidden flex items-center justify-center shadow-md shrink-0">
                {logoUrl ? (
                  <img src={logoUrl} alt={name || "Logo"} className="size-full object-cover" />
                ) : (
                  <div className="size-full bg-foreground text-background flex items-center justify-center font-black text-xl">
                    {name ? name.charAt(0).toUpperCase() : "E"}
                  </div>
                )}
              </div>

              <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-[10px] font-bold gap-1">
                <ShieldCheck className="size-3" />
                <span>Perfil Ativo</span>
              </Badge>
            </div>

            <div className="space-y-0.5">
              <h3 className="font-black text-base text-foreground tracking-tight truncate">
                {name || "Nome da Sua Empresa"}
              </h3>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <MapPin className="size-3 text-primary shrink-0" />
                <span>{city}, {state}</span>
                {address && <span>• {address}</span>}
              </p>
            </div>

            <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
              {bio || "Apresentação e especialidades da sua empresa divulgadas para toda a comunidade..."}
            </p>

            <div className="pt-2 border-t border-border/40 flex items-center justify-between gap-2">
              <span className="text-[11px] font-mono text-muted-foreground">
                {phone || "(49) 99999-9999"}
              </span>
              <div className="px-3 py-1.5 rounded-xl bg-primary text-primary-foreground text-[11px] font-bold">
                Falar no WhatsApp
              </div>
            </div>
          </div>
        </div>

        {/* Box Explicativo */}
        <div className="p-4 rounded-2xl bg-muted/20 border border-border/40 space-y-1.5 text-xs text-muted-foreground">
          <p className="font-bold text-foreground flex items-center gap-1.5">
            <CheckCircle2 className="size-3.5 text-emerald-500" />
            <span>Acesso Imediato ao Catálogo</span>
          </p>
          <p className="text-[11.5px] leading-relaxed">
            Assim que você concluir, sua empresa aparecerá no Guia local e você já poderá publicar anúncios no classificados com o seu selo comercial.
          </p>
        </div>
      </div>
    </div>
  );
}
