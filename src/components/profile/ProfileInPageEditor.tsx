import React, { useState, useEffect, useRef } from "react";
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
  Check,
  Store,
  ArrowUp,
  ArrowDown,
  Building2,
  X,
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
  const containerRef = useRef<HTMLElement | null>(null);

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
    if (isOpen && profile) {
      if (isBrandPersonaView && creatorProfile) {
        setFullName(creatorProfile.stage_name || creatorProfile.name || profile.full_name || "");
        setUsername(creatorProfile.handle || profile.username || "");
        setOccupation(creatorProfile.category || creatorProfile.niche || "Marca");
        setBio(creatorProfile.bio || "");
        setAvatarUrl(creatorProfile.avatar_url || profile.avatar_url || "");
        setCoverUrl(creatorProfile.cover_url || profile.cover_url || "");
      } else {
        setFullName(profile.full_name || "");
        setUsername(profile.username || "");
        setOccupation(profile.occupation || "");
        setBio(profile.bio || "");
        setAvatarUrl(profile.avatar_url || "");
        setCoverUrl(profile.cover_url || "");
      }

      setCity(profile.city || "");
      setState(profile.state || "");
      setPhone(profile.phone || "");
      setWebsite(creatorProfile?.social_links?.website || profile.website || "");
      setInstagram(creatorProfile?.social_links?.instagram || profile.instagram || "");

      if (Array.isArray(profile.biolinks)) {
        setBiolinks(
          profile.biolinks.map((b: any, i: number) => ({
            id: b.id || `link-${i}`,
            label: b.label || b.title || "Link",
            url: b.url || "",
          })),
        );
      } else {
        setBiolinks([]);
      }

      const hasCreatorRecord = Boolean(creatorProfile?.id || isCreator);
      setIsAffiliateEnabled(hasCreatorRecord);
      setStageName(creatorProfile?.stage_name || profile.full_name || "");
      setCreatorNiche(creatorProfile?.category || creatorProfile?.niche || profile.occupation || "Geral");
      setShowcaseBannerUrl(creatorProfile?.banner_url || profile.featured_banner_url || "");
      setShowcaseBannerTitle(creatorProfile?.banner_title || "");
      setShowcaseBannerLink(creatorProfile?.banner_link || profile.featured_banner_link || "");

      const savedOwnBrands =
        Array.isArray(creatorProfile?.own_brand_store_ids)
          ? creatorProfile.own_brand_store_ids
          : Array.isArray(creatorProfile?.social_links?.own_brand_store_ids)
            ? creatorProfile.social_links.own_brand_store_ids
            : ownBrandStores.map((s: any) => s.id);
      setSelectedOwnBrandIds(savedOwnBrands);

      const savedPartners = Array.isArray(creatorProfile?.partner_store_ids)
        ? creatorProfile.partner_store_ids
        : [];
      setSelectedPartnerStoreIds(savedPartners);

      if (Array.isArray(creatorProfile?.showcase_order) && creatorProfile.showcase_order.length > 0) {
        const mergedOrder = [...creatorProfile.showcase_order];
        for (const sec of DEFAULT_SHOWCASE_ORDER) {
          if (!mergedOrder.includes(sec)) mergedOrder.push(sec);
        }
        setShowcaseOrder(mergedOrder);
      } else {
        setShowcaseOrder(DEFAULT_SHOWCASE_ORDER);
      }

      setActiveTab(initialTab);
      setTimeout(() => {
        containerRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }, 60);
    }
  }, [isOpen, profile, creatorProfile, isCreator, isBrandPersonaView, initialTab, ownBrandStores]);

  const handleAddBiolink = () => {
    if (!newLinkLabel.trim() || !newLinkUrl.trim()) {
      toast.error("Informe o título e a URL do link.");
      return;
    }
    const cleanUrl = newLinkUrl.startsWith("http") ? newLinkUrl.trim() : `https://${newLinkUrl.trim()}`;
    setBiolinks((prev) => [
      ...prev,
      { id: `link-${Date.now()}`, label: newLinkLabel.trim(), url: cleanUrl },
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
        // Persistência final ocorrerá no handleSave
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
        fullName
          .toLowerCase()
          .replace(/[^a-z0-9]/g, "")
          .slice(0, 20) ||
        "membro"
      )
        .toLowerCase()
        .replace(/^@/, "");

      if (isBrandPersonaView) {
        await upsertCreatorProfile({
          data: {
            handle: effectiveHandle,
            stageName: fullName.trim(),
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

        toast.success("Marca e vitrine atualizadas!");
        onClose();
        router.invalidate();
        return;
      }

      // 1. Salvar Perfil Civil
      await updateProfile({
        data: {
          fullName: fullName.trim(),
          username: username.trim() || undefined,
          occupation: occupation.trim() || undefined,
          bio: bio.trim().slice(0, 280),
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

      // 2. Se a Vitrine estiver habilitada, sincronizar configurações da vitrine
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

      toast.success("Perfil atualizado!");
      onClose();
      router.invalidate();
    } catch (err: any) {
      toast.error(err?.message || "Erro ao salvar alterações do perfil.");
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  const charsRemaining = 280 - (bio || "").length;

  const navItems: Array<{ id: "identidade" | "links" | "vitrine"; label: string; icon: any }> = [
    { id: "identidade", label: "Identidade", icon: User },
    { id: "links", label: "Links e Contato", icon: Link2 },
    { id: "vitrine", label: "Vitrine Comercial", icon: ShoppingBag },
  ];

  return (
    <section
      ref={containerRef}
      aria-label="Edição de perfil na página"
      className="rounded-lg border border-primary/40 bg-card p-4 sm:p-6 space-y-6 pb-20"
    >
      {/* Barra Superior do Editor In-Page */}
      <div className="flex items-center justify-between gap-3 border-b border-border/40 pb-4">
        <div className="flex items-center gap-2 flex-wrap min-w-0">
          <h2 className="text-base sm:text-lg font-bold text-foreground">
            {isBrandPersonaView ? "Editar Marca" : "Editar Perfil"}
          </h2>
          <Badge variant="outline" className="text-xs font-mono">
            {isBrandPersonaView ? "Marca" : "Edição na Página"}
          </Badge>
        </div>

        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onClose}
          className="h-11 min-h-11 px-3 rounded-lg text-xs font-semibold gap-2 text-muted-foreground hover:text-foreground cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <X className="size-4" />
          <span>Fechar</span>
        </Button>
      </div>

      {/* Navegação Mobile (Régua Horizontal Contínua B.39) */}
      <div
        role="tablist"
        aria-label="Seções de edição"
        className="md:hidden flex flex-nowrap overflow-x-auto no-scrollbar gap-2 p-1 rounded-lg bg-muted/40 border border-border/40 tab-list"
      >
        {navItems.map((item) => {
          const IconComp = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => setActiveTab(item.id)}
              className={`h-11 min-h-11 px-4 rounded-lg text-xs font-semibold flex items-center gap-2 shrink-0 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                isActive
                  ? "bg-background text-foreground font-bold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <IconComp className="size-4" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>

      {/* Layout Bidirecional Desktop (12 Colunas) & Mobile (Bloco Direto) */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
        {/* Coluna Lateral Desktop (3 Colunas) */}
        <div className="hidden md:flex md:col-span-3 flex-col gap-2 p-2 rounded-lg bg-muted/20 border border-border/40">
          {navItems.map((item) => {
            const IconComp = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveTab(item.id)}
                className={`h-11 min-h-11 px-3 rounded-lg text-xs font-semibold flex items-center gap-3 text-left transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                  isActive
                    ? "bg-primary/10 text-primary font-bold border border-primary/30"
                    : "text-muted-foreground hover:bg-muted/40 hover:text-foreground"
                }`}
              >
                <IconComp className="size-4 shrink-0" />
                <span className="break-words text-wrap leading-tight">{item.label}</span>
              </button>
            );
          })}
        </div>

        {/* Coluna Principal de Campos Inline (9 Colunas no Desktop) */}
        <div className="md:col-span-9 space-y-6">
          {/* ── SEÇÃO 1: IDENTIDADE ── */}
          {activeTab === "identidade" && (
            <div className="space-y-5">
              {/* Upload de Capa e Avatar em Grade Bidirecional */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 p-4 rounded-lg bg-muted/20 border border-border/50">
                <div className="lg:col-span-8 space-y-2">
                  <Label className="text-xs font-semibold">Capa Panorâmica</Label>
                  {/* design-lint-ignore DL-02 reason:"Proporcao panoramica 4:1 da capa de perfil" expiry:"2027-12-31" */}
                  <div className="w-full aspect-[4/1] rounded-lg border border-border/60 bg-muted/30 overflow-hidden relative flex items-center justify-center">
                    {coverUrl ? (
                      <img src={coverUrl} alt="Capa" className="size-full object-cover select-none" />
                    ) : (
                      <span className="text-xs text-muted-foreground flex items-center gap-2">
                        <Camera className="size-4" />
                        <span>Sem imagem de capa</span>
                      </span>
                    )}
                  </div>
                  <ImageUpload
                    value={coverUrl}
                    onChange={(url) => setCoverUrl(url || "")}
                    bucket="user-media"
                  />
                </div>

                <div className="lg:col-span-4 space-y-2">
                  <Label className="text-xs font-semibold">Foto de Perfil (Squircle)</Label>
                  <div className="flex items-center gap-3">
                    <div className="size-16 rounded-lg border border-border/60 bg-muted overflow-hidden shrink-0 flex items-center justify-center">
                      {avatarUrl ? (
                        <img src={avatarUrl} alt="Avatar" className="size-full object-cover" />
                      ) : (
                        <User className="size-7 text-muted-foreground" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <ImageUpload
                        value={avatarUrl}
                        onChange={(url) => setAvatarUrl(url || "")}
                        bucket="user-media"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Nome, Usuário e Profissão */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <Label htmlFor="prof-name" className="text-xs font-semibold">
                    {isBrandPersonaView ? "Nome da Marca" : "Nome Completo"}
                  </Label>
                  <Input
                    id="prof-name"
                    value={fullName}
                    onChange={(e) => {
                      setFullName(e.target.value);
                      if (isBrandPersonaView) setStageName(e.target.value);
                    }}
                    placeholder={isBrandPersonaView ? "Nome da Marca" : "Seu Nome"}
                    className="h-11 min-h-11 rounded-lg"
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="prof-user" className="text-xs font-semibold">
                    Identificador (@handle)
                  </Label>
                  <Input
                    id="prof-user"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="usuario"
                    className="h-11 min-h-11 rounded-lg font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="prof-occ" className="text-xs font-semibold">
                    {isBrandPersonaView ? "Segmento" : "Profissão / Ocupação"}
                  </Label>
                  <Input
                    id="prof-occ"
                    value={occupation}
                    onChange={(e) => setOccupation(e.target.value)}
                    placeholder="Ex: Arquiteto, Designer"
                    className="h-11 min-h-11 rounded-lg"
                  />
                </div>
              </div>

              {/* Bio Completa 280 Caracteres */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="prof-bio" className="text-xs font-semibold">
                    Biografia (Até 280 caracteres)
                  </Label>
                  <span className="text-xs font-mono text-muted-foreground">
                    {charsRemaining} disponíveis
                  </span>
                </div>
                <Textarea
                  id="prof-bio"
                  value={bio}
                  maxLength={280}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Apresente sua trajetória, especialidades e interesses..."
                  rows={4}
                  className="resize-none text-xs leading-relaxed rounded-lg"
                />

                {bio.trim() && (
                  <div className="p-3 rounded-lg bg-muted/20 border border-border/40">
                    <RichBioContent content={bio} />
                  </div>
                )}
              </div>

              {/* Cidade e Estado */}
              {!isBrandPersonaView && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label htmlFor="prof-city" className="text-xs font-semibold">Cidade</Label>
                    <Input
                      id="prof-city"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder="Ex: Chapecó"
                      className="h-11 min-h-11 rounded-lg"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="prof-state" className="text-xs font-semibold">Estado (UF)</Label>
                    <Input
                      id="prof-state"
                      value={state}
                      onChange={(e) => setState(e.target.value)}
                      placeholder="SC"
                      maxLength={2}
                      className="h-11 min-h-11 uppercase rounded-lg"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── SEÇÃO 2: LINKS E CONTATO ── */}
          {activeTab === "links" && (
            <div className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <Label htmlFor="prof-ig" className="text-xs font-semibold">Instagram</Label>
                  <Input
                    id="prof-ig"
                    value={instagram}
                    onChange={(e) => setInstagram(e.target.value)}
                    placeholder="@seuperfil"
                    className="h-11 min-h-11 rounded-lg"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="prof-web" className="text-xs font-semibold">Website</Label>
                  <Input
                    id="prof-web"
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                    placeholder="https://meusite.com.br"
                    className="h-11 min-h-11 rounded-lg"
                  />
                </div>
                {!isBrandPersonaView && (
                  <div className="space-y-1">
                    <Label htmlFor="prof-phone" className="text-xs font-semibold">WhatsApp</Label>
                    <Input
                      id="prof-phone"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="(49) 99999-9999"
                      className="h-11 min-h-11 rounded-lg"
                    />
                  </div>
                )}
              </div>

              {/* Gestor de Links Rápidos */}
              <div className="space-y-3 pt-4 border-t border-border/40">
                <Label className="text-xs font-semibold">Links da Bio</Label>
                <div className="flex flex-col sm:flex-row items-center gap-2">
                  <Input
                    value={newLinkLabel}
                    onChange={(e) => setNewLinkLabel(e.target.value)}
                    placeholder="Título (ex: Portfólio)"
                    className="h-11 min-h-11 text-xs rounded-lg"
                  />
                  <Input
                    value={newLinkUrl}
                    onChange={(e) => setNewLinkUrl(e.target.value)}
                    placeholder="https://..."
                    className="h-11 min-h-11 text-xs rounded-lg"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleAddBiolink}
                    className="h-11 min-h-11 px-4 shrink-0 font-semibold text-xs rounded-lg w-full sm:w-auto"
                  >
                    <Plus className="size-4 mr-1" />
                    <span>Adicionar</span>
                  </Button>
                </div>

                {biolinks.length > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2">
                    {biolinks.map((link) => (
                      <div
                        key={link.id}
                        className="flex items-center justify-between p-3 rounded-lg bg-muted/20 border border-border/50 text-xs gap-2"
                      >
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <Link2 className="size-4 text-primary shrink-0" />
                          <div className="min-w-0 flex-1">
                            <p className="font-semibold text-foreground break-words text-wrap leading-tight">
                              {link.label}
                            </p>
                            <p className="text-muted-foreground break-all text-xs">{link.url}</p>
                          </div>
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
                )}
              </div>
            </div>
          )}

          {/* ── SEÇÃO 3: VITRINE COMERCIAL ── */}
          {activeTab === "vitrine" && (
            <div className="space-y-5">
              <div className="p-4 rounded-lg bg-muted/20 border border-border/50 flex items-center justify-between gap-4">
                <div className="space-y-1">
                  <p className="text-xs font-bold text-foreground">Habilitar Aba de Vitrine Comercial</p>
                  <p className="text-xs text-muted-foreground">
                    Exibe marcas próprias, lojas parceiras e produtos recomendados na sua página pública.
                  </p>
                </div>
                <Switch
                  checked={isAffiliateEnabled}
                  onCheckedChange={setIsAffiliateEnabled}
                />
              </div>

              {isAffiliateEnabled && (
                <div className="space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <Label htmlFor="creator-stage" className="text-xs font-semibold">Título da Vitrine</Label>
                      <Input
                        id="creator-stage"
                        value={stageName}
                        onChange={(e) => setStageName(e.target.value)}
                        placeholder="Ex: Recomendações"
                        className="h-11 min-h-11 rounded-lg"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="creator-niche" className="text-xs font-semibold">Segmento</Label>
                      <Input
                        id="creator-niche"
                        value={creatorNiche}
                        onChange={(e) => setCreatorNiche(e.target.value)}
                        placeholder="Ex: Tecnologia, Moda"
                        className="h-11 min-h-11 rounded-lg"
                      />
                    </div>
                  </div>

                  {/* Banner 16:9 */}
                  <div className="space-y-3 p-4 rounded-lg bg-muted/20 border border-border/50">
                    <Label className="text-xs font-bold text-foreground">Banner de Destaque (16:9)</Label>
                    <ImageUpload
                      value={showcaseBannerUrl}
                      onChange={(url) => setShowcaseBannerUrl(url || "")}
                      bucket="user-media"
                    />
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                      <Input
                        value={showcaseBannerTitle}
                        onChange={(e) => setShowcaseBannerTitle(e.target.value)}
                        placeholder="Título do Banner"
                        className="h-11 min-h-11 text-xs rounded-lg"
                      />
                      <Input
                        value={showcaseBannerLink}
                        onChange={(e) => setShowcaseBannerLink(e.target.value)}
                        placeholder="Link de destino (https://...)"
                        className="h-11 min-h-11 text-xs rounded-lg"
                      />
                    </div>
                  </div>

                  {/* Minhas Próprias Marcas */}
                  <div className="space-y-2 pt-3 border-t border-border/40">
                    <Label className="text-xs font-bold text-foreground flex items-center gap-2">
                      <Building2 className="size-4 text-primary" />
                      <span>Minhas Marcas ({selectedOwnBrandIds.length})</span>
                    </Label>
                    {ownBrandStores.length === 0 ? (
                      <p className="text-xs text-muted-foreground py-2">
                        Nenhuma empresa própria vinculada à sua conta.
                      </p>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
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

                  {/* Lojas Parceiras */}
                  <div className="space-y-2 pt-3 border-t border-border/40">
                    <Label className="text-xs font-bold text-foreground flex items-center gap-2">
                      <Store className="size-4 text-primary" />
                      <span>Lojas Parceiras ({selectedPartnerStoreIds.length})</span>
                    </Label>
                    {availableStores.length === 0 ? (
                      <p className="text-xs text-muted-foreground py-2">
                        Nenhuma loja parceira disponível.
                      </p>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
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

                  {/* Produtos Fixados */}
                  {pinnedProducts.length > 0 && (
                    <div className="space-y-2 pt-3 border-t border-border/40">
                      <Label className="text-xs font-bold text-foreground">
                        Produtos Recomendados ({pinnedProducts.length})
                      </Label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {pinnedProducts.slice(0, 6).map((item: any) => {
                          const prod = item?.product || item;
                          return (
                            <div
                              key={prod?.id || item?.id}
                              className="p-3 rounded-lg bg-muted/20 border border-border/50 flex items-center justify-between text-xs gap-2"
                            >
                              <span className="font-semibold text-foreground break-words text-wrap leading-tight">
                                {prod?.name || item?.custom_title || "Produto"}
                              </span>
                              <Badge variant="secondary" className="text-xs shrink-0">Fixado</Badge>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Reordenação de Seções */}
                  <div className="space-y-2 pt-3 border-t border-border/40">
                    <Label className="text-xs font-bold text-foreground">
                      Ordem das Seções na Vitrine
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
            </div>
          )}
        </div>
      </div>

      {/* Barra de Ação Sticky Inferior (Invariante B.34 z-30 e B.8 Único CTA Primário) */}
      <div className="fixed bottom-0 inset-x-0 z-30 bg-background/95 backdrop-blur-md border-t border-border/60 px-4 py-3 pb-safe">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-3">
          <span className="text-xs font-medium text-muted-foreground hidden sm:inline">
            Edição direta na página ativa
          </span>
          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSaving}
              className="flex-1 sm:flex-initial h-11 min-h-11 px-4 text-xs font-semibold rounded-lg"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="default"
              onClick={handleSave}
              disabled={isSaving}
              className="flex-1 sm:flex-initial h-11 min-h-11 px-5 text-xs font-bold gap-2 rounded-lg"
            >
              <Check className="size-4" />
              <span>{isSaving ? "Salvando..." : "Salvar Alterações"}</span>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
