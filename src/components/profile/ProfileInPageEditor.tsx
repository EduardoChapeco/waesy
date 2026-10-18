import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { ImageUpload } from "@/components/ui/image-upload";
import { RichBioContent } from "@/components/profile/RichBioContent";
import { updateProfile } from "@/services/auth.functions";
import {
  upsertCreatorProfile,
  saveCreatorShowcaseSettings,
  togglePartnerStoreConnection,
} from "@/services/affiliates.functions";
import { toast } from "sonner";
import { useRouter } from "@tanstack/react-router";
import {
  User,
  Link2,
  ShoppingBag,
  Camera,
  Trash2,
  Plus,
  Sparkles,
  Check,
  Store,
  ArrowUp,
  ArrowDown,
  Building2,
} from "lucide-react";

const DEFAULT_SHOWCASE_ORDER = ["banner", "own_brands", "stores", "products", "events"];

const SHOWCASE_SECTION_LABELS: Record<string, string> = {
  banner: "Banner de Destaque (16:9)",
  own_brands: "Minhas Próprias Marcas",
  stores: "Lojas Parceiras Comissionadas",
  products: "Produtos Recomendados Fixados",
  events: "Agenda & Eventos",
};

export interface ProfileInPageEditorProps {
  isOpen: boolean;
  onClose: () => void;
  profile: any;
  creatorProfile?: any;
  isCreator?: boolean;
  isBrandPersonaView?: boolean;
  availableStores?: any[];
  ownBrandStores?: any[];
  pinnedProducts?: any[];
  initialTab?: "identidade" | "links" | "vitrine";
}

export function ProfileInPageEditor({
  isOpen,
  onClose,
  profile,
  creatorProfile,
  isCreator = false,
  isBrandPersonaView = false,
  availableStores = [],
  ownBrandStores = [],
  pinnedProducts = [],
  initialTab = "identidade",
}: ProfileInPageEditorProps) {
  const router = useRouter();

  // 1. Identidade e Visual
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [occupation, setOccupation] = useState("");
  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [coverUrl, setCoverUrl] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [phone, setPhone] = useState("");

  // 2. Links Sociais & BioLinks
  const [website, setWebsite] = useState("");
  const [instagram, setInstagram] = useState("");
  const [biolinks, setBiolinks] = useState<Array<{ id: string; label: string; url: string }>>([]);
  const [newLinkLabel, setNewLinkLabel] = useState("");
  const [newLinkUrl, setNewLinkUrl] = useState("");

  // 3. Vitrine Comercial & Afiliado Manager
  const [isAffiliateEnabled, setIsAffiliateEnabled] = useState(false);
  const [stageName, setStageName] = useState("");
  const [creatorNiche, setCreatorNiche] = useState("Geral");
  const [showcaseBannerUrl, setShowcaseBannerUrl] = useState("");
  const [showcaseBannerTitle, setShowcaseBannerTitle] = useState("");
  const [showcaseBannerLink, setShowcaseBannerLink] = useState("");
  const [selectedOwnBrandIds, setSelectedOwnBrandIds] = useState<string[]>([]);
  const [selectedPartnerStoreIds, setSelectedPartnerStoreIds] = useState<string[]>([]);
  const [showcaseOrder, setShowcaseOrder] = useState<string[]>(DEFAULT_SHOWCASE_ORDER);

  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<"identidade" | "links" | "vitrine">(initialTab);

  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
    }
  }, [isOpen, initialTab]);

  useEffect(() => {
    if (isOpen && profile) {
      const initialName = isBrandPersonaView
        ? creatorProfile?.stage_name || creatorProfile?.name || profile.full_name || ""
        : profile.full_name || "";
      const initialHandle = isBrandPersonaView
        ? creatorProfile?.handle || profile.username || ""
        : profile.username || "";
      const initialBio = isBrandPersonaView
        ? creatorProfile?.bio ?? profile.bio ?? ""
        : profile.bio || "";
      const initialAvatar = isBrandPersonaView
        ? creatorProfile?.avatar_url || profile.avatar_url || ""
        : profile.avatar_url || "";
      const initialCover = isBrandPersonaView
        ? creatorProfile?.cover_url || profile.cover_url || ""
        : profile.cover_url || "";

      setFullName(initialName);
      setUsername(initialHandle);
      setOccupation(
        isBrandPersonaView
          ? creatorProfile?.niche || creatorProfile?.category || profile.occupation || ""
          : profile.occupation || "",
      );
      setBio(initialBio.slice(0, 280));
      setAvatarUrl(initialAvatar);
      setCoverUrl(initialCover);
      setCity(profile.city || "");
      setState(profile.state || "");
      setPhone(profile.phone || "");

      setWebsite(creatorProfile?.social_links?.website || profile.website || "");
      setInstagram(creatorProfile?.social_links?.instagram || profile.instagram || "");
      setBiolinks(Array.isArray(profile.biolinks) ? profile.biolinks : []);

      setIsAffiliateEnabled(Boolean(isBrandPersonaView || isCreator || creatorProfile));
      setStageName(creatorProfile?.stage_name || creatorProfile?.name || profile.full_name || "");
      setCreatorNiche(creatorProfile?.niche || creatorProfile?.category || "Geral");
      setShowcaseBannerUrl(creatorProfile?.banner_url || profile.featured_banner_url || "");
      setShowcaseBannerTitle(creatorProfile?.banner_title || "");
      setShowcaseBannerLink(creatorProfile?.banner_link || profile.featured_banner_link || "");

      const initialOwnIds = Array.isArray(creatorProfile?.own_brand_store_ids)
        ? creatorProfile.own_brand_store_ids
        : Array.isArray(creatorProfile?.social_links?.own_brand_store_ids)
          ? creatorProfile.social_links.own_brand_store_ids
          : ownBrandStores.map((st: any) => st.id);
      setSelectedOwnBrandIds(initialOwnIds.filter(Boolean));

      const initialPartnerIds = Array.isArray(creatorProfile?.partner_store_ids)
        ? creatorProfile.partner_store_ids
        : [];
      setSelectedPartnerStoreIds(initialPartnerIds.filter(Boolean));

      const rawOrder = Array.isArray(creatorProfile?.showcase_order) && creatorProfile.showcase_order.length > 0
        ? creatorProfile.showcase_order
        : DEFAULT_SHOWCASE_ORDER;
      const normalizedOrder = Array.from(new Set([...rawOrder, ...DEFAULT_SHOWCASE_ORDER]));
      setShowcaseOrder(normalizedOrder);
    }
  }, [isOpen, profile, creatorProfile, isCreator, isBrandPersonaView, ownBrandStores]);

  const handleAddBiolink = () => {
    if (!newLinkLabel.trim() || !newLinkUrl.trim()) {
      toast.error("Informe o rótulo e o link completo.");
      return;
    }
    const cleanUrl = newLinkUrl.trim().startsWith("http")
      ? newLinkUrl.trim()
      : `https://${newLinkUrl.trim()}`;

    setBiolinks((prev) => [
      ...prev,
      {
        id: `link_${Date.now()}`,
        label: newLinkLabel.trim(),
        url: cleanUrl,
      },
    ]);
    setNewLinkLabel("");
    setNewLinkUrl("");
  };

  const handleRemoveBiolink = (id: string) => {
    setBiolinks((prev) => prev.filter((item) => item.id !== id));
  };

  const handleToggleOwnBrand = (storeId: string) => {
    setSelectedOwnBrandIds((prev) =>
      prev.includes(storeId) ? prev.filter((id) => id !== storeId) : [...prev, storeId],
    );
  };

  const handleTogglePartnerStore = async (storeId: string) => {
    const isCurrentlyConnected = selectedPartnerStoreIds.includes(storeId);
    const nextConnected = !isCurrentlyConnected;

    setSelectedPartnerStoreIds((prev) =>
      nextConnected ? [...prev, storeId] : prev.filter((id) => id !== storeId),
    );

    const effectiveHandle = (
      creatorProfile?.handle ||
      username.trim() ||
      profile?.username ||
      ""
    )
      .toLowerCase()
      .trim()
      .replace(/^@/, "");

    if (effectiveHandle && creatorProfile?.id) {
      try {
        await togglePartnerStoreConnection({
          data: {
            handle: effectiveHandle,
            storeId,
            connect: nextConnected,
          },
        });
      } catch {
        // Persistência final ocorrerá no handleSave caso o registro de criador ainda não exista
      }
    }
  };

  const handleMoveSection = (index: number, direction: "up" | "down") => {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= showcaseOrder.length) return;
    setShowcaseOrder((prev) => {
      const next = [...prev];
      const temp = next[targetIndex];
      next[targetIndex] = next[index];
      next[index] = temp;
      return next;
    });
  };

  const handleSave = async () => {
    if (!fullName.trim()) {
      toast.error("Nome é obrigatório.");
      return;
    }

    setIsSaving(true);
    try {
      const effectiveHandle = (
        username.trim() ||
        creatorProfile?.handle ||
        profile?.username ||
        `afiliado_${(profile?.id || "waesy").slice(0, 6)}`
      )
        .toLowerCase()
        .trim()
        .replace(/^@/, "");

      // ISOLAMENTO P0: Se estiver visualizando uma Persona de Marca/Criador (/u/handle-da-marca),
      // salva ESTRITAMENTE em creator_profiles e JAMAIS toca em public.profiles!
      if (isBrandPersonaView) {
        await upsertCreatorProfile({
          data: {
            handle: effectiveHandle,
            stageName: stageName.trim() || fullName.trim(),
            category: occupation.trim() || creatorNiche || "Geral",
            bio: bio.trim().slice(0, 280),
            avatarUrl: avatarUrl || undefined,
            coverUrl: coverUrl || undefined,
            bannerUrl: showcaseBannerUrl || undefined,
            bannerTitle: showcaseBannerTitle.trim() || undefined,
            bannerLink: showcaseBannerLink.trim() || undefined,
            showcaseOrder,
            partnerStoreIds: selectedPartnerStoreIds,
            ownBrandStoreIds: selectedOwnBrandIds,
            socialLinks: {
              ...(instagram.trim() ? { instagram: instagram.trim().replace(/^@/, "") } : {}),
              ...(website.trim() ? { website: website.trim() } : {}),
              own_brand_store_ids: selectedOwnBrandIds,
            },
          },
        });

        await saveCreatorShowcaseSettings({
          data: {
            handle: effectiveHandle,
            bannerUrl: showcaseBannerUrl || null,
            bannerTitle: showcaseBannerTitle.trim() || null,
            bannerLink: showcaseBannerLink.trim() || null,
            showcaseOrder,
            partnerStoreIds: selectedPartnerStoreIds,
            ownBrandStoreIds: selectedOwnBrandIds,
          },
        }).catch(() => {});

        toast.success("Perfil da Marca e Vitrine atualizados com sucesso!");
        onClose();
        router.invalidate();
        return;
      }

      // 1. Gravar dados civis do perfil em public.profiles (apenas quando não é Brand Persona)
      await updateProfile({
        data: {
          fullName: fullName.trim(),
          username: username.trim() ? username.trim().toLowerCase() : undefined,
          occupation: occupation.trim() || undefined,
          bio: bio.trim().slice(0, 280) || undefined,
          avatarUrl: avatarUrl || undefined,
          coverUrl: coverUrl || undefined,
          city: city.trim() || undefined,
          state: state.trim() || undefined,
          phone: phone.trim() || undefined,
          website: website.trim() || undefined,
          instagram: instagram.trim().replace(/^@/, "") || undefined,
          biolinks,
        },
      });

      // 2. Se a Vitrine de Afiliado estiver habilitada, sincronizar configurações da vitrine
      if (isAffiliateEnabled) {
        await upsertCreatorProfile({
          data: {
            handle: effectiveHandle,
            stageName: stageName.trim() || fullName.trim(),
            category: creatorNiche,
            bio: bio.trim().slice(0, 280),
            avatarUrl: avatarUrl || undefined,
            coverUrl: coverUrl || undefined,
            bannerUrl: showcaseBannerUrl || undefined,
            bannerTitle: showcaseBannerTitle.trim() || undefined,
            bannerLink: showcaseBannerLink.trim() || undefined,
            showcaseOrder,
            partnerStoreIds: selectedPartnerStoreIds,
            ownBrandStoreIds: selectedOwnBrandIds,
            socialLinks: {
              ...(instagram.trim() ? { instagram: instagram.trim().replace(/^@/, "") } : {}),
              ...(website.trim() ? { website: website.trim() } : {}),
              own_brand_store_ids: selectedOwnBrandIds,
            },
          },
        });

        await saveCreatorShowcaseSettings({
          data: {
            handle: effectiveHandle,
            bannerUrl: showcaseBannerUrl || null,
            bannerTitle: showcaseBannerTitle.trim() || null,
            bannerLink: showcaseBannerLink.trim() || null,
            showcaseOrder,
            partnerStoreIds: selectedPartnerStoreIds,
            ownBrandStoreIds: selectedOwnBrandIds,
          },
        }).catch(() => {});
      }

      toast.success("Perfil atualizado com sucesso!");
      onClose();
      router.invalidate();
    } catch (err: any) {
      toast.error(err?.message || "Erro ao salvar alterações do perfil.");
    } finally {
      setIsSaving(false);
    }
  };

  const charsRemaining = 280 - (bio || "").length;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto no-scrollbar p-6 bg-card border border-border/60 rounded-lg">
        <DialogHeader className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <DialogTitle className="text-lg font-bold text-foreground">
              {isBrandPersonaView ? "Editar Perfil de Marca & Vitrine" : "Editar Perfil In-Page"}
            </DialogTitle>
            <Badge variant="outline" className="text-xs font-mono">
              {isBrandPersonaView ? "Persona de Marca / Criador" : "Perfil Civil & Afiliado"}
            </Badge>
          </div>
          <DialogDescription className="text-xs text-muted-foreground">
            {isBrandPersonaView
              ? "As alterações serão salvas exclusivamente nesta marca (@handle), preservando seu perfil civil pessoal intacto."
              : "Altere sua capa, foto Squircle, bio de 280 caracteres, links e vitrine de afiliado em tempo real."}
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(val: any) => setActiveTab(val)} className="w-full space-y-4 pt-2">
          <TabsList className="flex flex-nowrap overflow-x-auto no-scrollbar w-full h-11 bg-muted/40 p-1 rounded-lg gap-1">
            <TabsTrigger
              value="identidade"
              className="flex-1 min-w-28 h-9 text-xs font-semibold gap-2 rounded-lg data-[state=active]:bg-background data-[state=active]:text-foreground"
            >
              <User className="size-3.5" />
              <span>Identidade</span>
            </TabsTrigger>
            <TabsTrigger
              value="links"
              className="flex-1 min-w-28 h-9 text-xs font-semibold gap-2 rounded-lg data-[state=active]:bg-background data-[state=active]:text-foreground"
            >
              <Link2 className="size-3.5" />
              <span>Links & Bio</span>
            </TabsTrigger>
            <TabsTrigger
              value="vitrine"
              className="flex-1 min-w-32 h-9 text-xs font-semibold gap-2 rounded-lg data-[state=active]:bg-background data-[state=active]:text-foreground"
            >
              <ShoppingBag className="size-3.5" />
              <span>Vitrine & Afiliado</span>
            </TabsTrigger>
          </TabsList>

          {/* ── ABA 1: IDENTIDADE ── */}
          <TabsContent value="identidade" className="space-y-4 focus-visible:outline-none">
            {/* Upload de Capa Panorâmica */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold">Capa Panorâmica do Perfil</Label>
              <div className="w-full aspect-[4/1] rounded-lg border border-border/60 bg-muted/30 overflow-hidden relative group flex items-center justify-center">
                {coverUrl ? (
                  <img src={coverUrl} alt="Capa" className="size-full object-cover select-none" />
                ) : (
                  <span className="text-xs text-muted-foreground flex items-center gap-2">
                    <Camera className="size-4" />
                    <span>Nenhuma imagem de capa selecionada</span>
                  </span>
                )}
              </div>
              <div className="pt-1">
                <ImageUpload
                  value={coverUrl}
                  onChange={(url) => setCoverUrl(url || "")}
                  bucket="user-media"
                />
              </div>
            </div>

            {/* Foto de Perfil Squircle 1:1 */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold">Foto de Perfil (Squircle)</Label>
              <div className="flex items-center gap-4">
                <div className="size-16 rounded-lg border-2 border-border/60 bg-muted overflow-hidden shrink-0 flex items-center justify-center">
                  {avatarUrl ? (
                    <img src={avatarUrl} alt="Avatar" className="size-full object-cover" />
                  ) : (
                    <User className="size-8 text-muted-foreground" />
                  )}
                </div>
                <div className="flex-1">
                  <ImageUpload
                    value={avatarUrl}
                    onChange={(url) => setAvatarUrl(url || "")}
                    bucket="user-media"
                  />
                </div>
              </div>
            </div>

            {/* Nome e Handle */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="prof-name" className="text-xs font-semibold">
                  {isBrandPersonaView ? "Nome da Marca / Artista" : "Nome Completo"}
                </Label>
                <Input
                  id="prof-name"
                  value={fullName}
                  onChange={(e) => {
                    setFullName(e.target.value);
                    if (isBrandPersonaView) setStageName(e.target.value);
                  }}
                  placeholder={isBrandPersonaView ? "Nome da Marca" : "Seu Nome"}
                  className="h-11 rounded-lg"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="prof-user" className="text-xs font-semibold">
                  {isBrandPersonaView ? "Identificador da Marca (@handle)" : "Nome de Usuário (@handle)"}
                </Label>
                <Input
                  id="prof-user"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="usuario"
                  className="h-11 rounded-lg"
                />
              </div>
            </div>

            {/* Ocupação / Cargo / Nicho */}
            <div className="space-y-1">
              <Label htmlFor="prof-occ" className="text-xs font-semibold">
                {isBrandPersonaView ? "Categoria / Nicho da Marca" : "Profissão / Ocupação"}
              </Label>
              <Input
                id="prof-occ"
                value={occupation}
                onChange={(e) => setOccupation(e.target.value)}
                placeholder="Ex: Arquiteto, Fotógrafo, Criador Digital..."
                className="h-11 rounded-lg"
              />
            </div>

            {/* Bio Rica com Contador de 280 Caracteres (Unificado com /conta/perfil) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="prof-bio" className="text-xs font-semibold">
                  Bio Completa (Máx. 280 caracteres)
                </Label>
                <span className="text-xs font-mono text-muted-foreground">
                  {charsRemaining} restantes
                </span>
              </div>
              <Textarea
                id="prof-bio"
                value={bio}
                maxLength={280}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Ex: ==Criador== de experiências. Apaixonado por **design** e café."
                rows={4}
                className="resize-none text-xs leading-relaxed rounded-lg"
              />
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Sparkles className="size-3 text-primary" />
                <span>Dica: Use ==destaque==, **negrito**, *itálico* ou [mono]tag[/mono].</span>
              </p>

              {/* Preview em Tempo Real */}
              {bio.trim() && (
                <div className="p-3 rounded-lg bg-muted/30 border border-border/40 mt-1">
                  <p className="text-xs font-semibold text-muted-foreground mb-1">Prévia ao vivo:</p>
                  <RichBioContent content={bio} />
                </div>
              )}
            </div>

            {/* Cidade e Estado */}
            {!isBrandPersonaView && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="prof-city" className="text-xs font-semibold">Cidade</Label>
                  <Input
                    id="prof-city"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="Ex: Chapecó"
                    className="h-11 rounded-lg"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="prof-state" className="text-xs font-semibold">Estado (UF)</Label>
                  <Input
                    id="prof-state"
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    placeholder="Ex: SC"
                    maxLength={2}
                    className="h-11 uppercase rounded-lg"
                  />
                </div>
              </div>
            )}
          </TabsContent>

          {/* ── ABA 2: LINKS & CONTATO ── */}
          <TabsContent value="links" className="space-y-4 focus-visible:outline-none">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="prof-ig" className="text-xs font-semibold">Instagram (@handle)</Label>
                <Input
                  id="prof-ig"
                  value={instagram}
                  onChange={(e) => setInstagram(e.target.value)}
                  placeholder="@seuperfil"
                  className="h-11 rounded-lg"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="prof-web" className="text-xs font-semibold">Website Oficial</Label>
                <Input
                  id="prof-web"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  placeholder="https://meusite.com.br"
                  className="h-11 rounded-lg"
                />
              </div>
            </div>

            {!isBrandPersonaView && (
              <div className="space-y-1">
                <Label htmlFor="prof-phone" className="text-xs font-semibold">WhatsApp de Contato</Label>
                <Input
                  id="prof-phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="(49) 99999-9999"
                  className="h-11 rounded-lg"
                />
              </div>
            )}

            {/* Gestor de Links na Bio */}
            <div className="space-y-2 pt-2 border-t border-border/40">
              <Label className="text-xs font-semibold">Links Rápidos da Bio</Label>
              <div className="flex flex-col sm:flex-row items-center gap-2">
                <Input
                  value={newLinkLabel}
                  onChange={(e) => setNewLinkLabel(e.target.value)}
                  placeholder="Título (ex: Portfólio)"
                  className="h-11 text-xs rounded-lg"
                />
                <Input
                  value={newLinkUrl}
                  onChange={(e) => setNewLinkUrl(e.target.value)}
                  placeholder="https://..."
                  className="h-11 text-xs rounded-lg"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleAddBiolink}
                  className="h-11 min-h-11 px-4 shrink-0 font-semibold text-xs rounded-lg"
                >
                  <Plus className="size-4 mr-1" />
                  <span>Adicionar</span>
                </Button>
              </div>

              {/* Lista de Links Cadastrados */}
              <div className="space-y-2 pt-2">
                {biolinks.map((link) => (
                  <div
                    key={link.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/20 border border-border/50 text-xs gap-2"
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <Link2 className="size-3.5 text-primary shrink-0" />
                      <span className="font-semibold text-foreground break-words text-wrap leading-tight">
                        {link.label}
                      </span>
                      <span className="text-muted-foreground break-all text-xs">({link.url})</span>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleRemoveBiolink(link.id)}
                      className="size-11 min-h-11 min-w-11 p-0 rounded-lg text-muted-foreground hover:text-destructive shrink-0"
                      aria-label="Remover link"
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>

          {/* ── ABA 3: IN-PAGE VITRINE & AFILIADO MANAGER ── */}
          <TabsContent value="vitrine" className="space-y-5 focus-visible:outline-none">
            <div className="p-4 rounded-lg bg-muted/20 border border-border/50 flex items-center justify-between gap-4">
              <div className="space-y-1">
                <p className="text-xs font-bold text-foreground">Ativar Vitrine de Afiliado & Recomendações</p>
                <p className="text-xs text-muted-foreground">
                  Exibe na aba Comercial suas próprias marcas, lojas parceiras com cupom, produtos recomendados e banner promocional.
                </p>
              </div>
              <Switch
                checked={isAffiliateEnabled}
                onCheckedChange={setIsAffiliateEnabled}
              />
            </div>

            {isAffiliateEnabled && (
              <div className="space-y-5 pt-1">
                {/* a) Título, Nicho e Banner 16:9 da Vitrine */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="creator-stage" className="text-xs font-semibold">Título da Vitrine</Label>
                    <Input
                      id="creator-stage"
                      value={stageName}
                      onChange={(e) => setStageName(e.target.value)}
                      placeholder="Ex: Seleção do Eduardo"
                      className="h-11 rounded-lg"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="creator-niche" className="text-xs font-semibold">Segmento Principal</Label>
                    <Input
                      id="creator-niche"
                      value={creatorNiche}
                      onChange={(e) => setCreatorNiche(e.target.value)}
                      placeholder="Ex: Tecnologia, Gastronomia, Moda..."
                      className="h-11 rounded-lg"
                    />
                  </div>
                </div>

                <div className="space-y-3 p-4 rounded-lg bg-muted/20 border border-border/50">
                  <Label className="text-xs font-bold text-foreground">Banner de Destaque da Vitrine (16:9)</Label>
                  <ImageUpload
                    value={showcaseBannerUrl}
                    onChange={(url) => setShowcaseBannerUrl(url || "")}
                    bucket="user-media"
                  />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <Input
                      value={showcaseBannerTitle}
                      onChange={(e) => setShowcaseBannerTitle(e.target.value)}
                      placeholder="Chamada do Banner (ex: Ofertas da Semana)"
                      className="h-11 text-xs rounded-lg"
                    />
                    <Input
                      value={showcaseBannerLink}
                      onChange={(e) => setShowcaseBannerLink(e.target.value)}
                      placeholder="Link de destino (https://...)"
                      className="h-11 text-xs rounded-lg"
                    />
                  </div>
                </div>

                {/* b.1) Minhas Próprias Marcas (own_brand_store_ids) */}
                <div className="space-y-2 pt-2 border-t border-border/40">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-bold text-foreground flex items-center gap-2">
                      <Building2 className="size-4 text-primary" />
                      <span>Minhas Próprias Marcas ({selectedOwnBrandIds.length})</span>
                    </Label>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Selecione quais empresas de sua propriedade aparecem na seção "Minhas Marcas" do seu perfil.
                  </p>
                  {ownBrandStores.length === 0 ? (
                    <p className="text-xs text-muted-foreground italic py-2">
                      Nenhuma loja própria vinculada à sua conta ainda.
                    </p>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                      {ownBrandStores.map((st: any) => {
                        const isSelected = selectedOwnBrandIds.includes(st.id);
                        return (
                          <button
                            key={st.id}
                            type="button"
                            onClick={() => handleToggleOwnBrand(st.id)}
                            className={`h-11 min-h-11 px-3 rounded-lg border text-left flex items-center justify-between gap-2 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                              isSelected
                                ? "bg-primary/10 border-primary/40 text-foreground font-bold"
                                : "bg-card border-border/60 text-muted-foreground hover:text-foreground"
                            }`}
                          >
                            <span className="text-xs break-words text-wrap leading-tight">{st.name}</span>
                            {isSelected && <Check className="size-4 text-primary shrink-0" />}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* b.2) Lojas Parceiras Comissionadas (partner_store_ids) */}
                <div className="space-y-2 pt-2 border-t border-border/40">
                  <Label className="text-xs font-bold text-foreground flex items-center gap-2">
                    <Store className="size-4 text-primary" />
                    <span>Lojas Parceiras Afiliadas ({selectedPartnerStoreIds.length})</span>
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Conecte lojas parceiras da rede para divulgar cupons exclusivos na sua vitrine e ganhar comissões.
                  </p>
                  {availableStores.length === 0 ? (
                    <p className="text-xs text-muted-foreground italic py-2">
                      Nenhuma loja parceira disponível para seleção no momento.
                    </p>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 max-h-48 overflow-y-auto no-scrollbar">
                      {availableStores.map((st: any) => {
                        const isConnected = selectedPartnerStoreIds.includes(st.id);
                        return (
                          <button
                            key={st.id}
                            type="button"
                            onClick={() => handleTogglePartnerStore(st.id)}
                            className={`h-11 min-h-11 px-3 rounded-lg border text-left flex items-center justify-between gap-2 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                              isConnected
                                ? "bg-primary/10 border-primary/40 text-foreground font-bold"
                                : "bg-card border-border/60 text-muted-foreground hover:text-foreground"
                            }`}
                          >
                            <span className="text-xs break-words text-wrap leading-tight">{st.name}</span>
                            {isConnected ? (
                              <Check className="size-4 text-primary shrink-0" />
                            ) : (
                              <Plus className="size-4 text-muted-foreground shrink-0" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* b.3) Resumo de Produtos Fixados */}
                {pinnedProducts.length > 0 && (
                  <div className="space-y-2 pt-2 border-t border-border/40">
                    <Label className="text-xs font-bold text-foreground">
                      Produtos Recomendados Fixados ({pinnedProducts.length})
                    </Label>
                    <div className="grid grid-cols-1 gap-2">
                      {pinnedProducts.slice(0, 6).map((item: any) => {
                        const prod = item?.product || item;
                        return (
                          <div
                            key={prod?.id || item?.id}
                            className="p-2 rounded-lg bg-muted/20 border border-border/50 flex items-center justify-between text-xs"
                          >
                            <span className="font-semibold text-foreground break-words text-wrap leading-tight">
                              {prod?.name || item?.custom_title || "Produto Recomendado"}
                            </span>
                            <Badge variant="secondary" className="text-xs">Fixado</Badge>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* c) Reordenação das Seções da Vitrine */}
                <div className="space-y-2 pt-2 border-t border-border/40">
                  <Label className="text-xs font-bold text-foreground">
                    Ordem das Seções na Aba Vitrine
                  </Label>
                  <div className="space-y-2">
                    {showcaseOrder.map((secKey, idx) => (
                      <div
                        key={secKey}
                        className="flex items-center justify-between p-2 pl-3 rounded-lg bg-card border border-border/60 text-xs"
                      >
                        <span className="font-semibold text-foreground break-words text-wrap leading-tight">
                          {idx + 1}. {SHOWCASE_SECTION_LABELS[secKey] || secKey}
                        </span>
                        <div className="flex items-center gap-1 shrink-0">
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            disabled={idx === 0}
                            onClick={() => handleMoveSection(idx, "up")}
                            className="size-11 min-h-11 min-w-11 p-0 rounded-lg text-muted-foreground hover:text-foreground"
                            aria-label="Mover seção para cima"
                          >
                            <ArrowUp className="size-4" />
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            disabled={idx === showcaseOrder.length - 1}
                            onClick={() => handleMoveSection(idx, "down")}
                            className="size-11 min-h-11 min-w-11 p-0 rounded-lg text-muted-foreground hover:text-foreground"
                            aria-label="Mover seção para baixo"
                          >
                            <ArrowDown className="size-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>

        <DialogFooter className="pt-4 border-t border-border/40 gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isSaving}
            className="h-11 min-h-11 px-4 text-xs font-semibold rounded-lg"
          >
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="h-11 min-h-11 px-5 text-xs font-bold bg-primary text-primary-foreground gap-2 rounded-lg"
          >
            <Check className="size-4" />
            <span>{isSaving ? "Salvando..." : "Salvar Alterações"}</span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

