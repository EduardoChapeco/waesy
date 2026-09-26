import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Copy,
  Share2,
  Users,
  ShieldCheck,
  CheckCircle2,
  Clock,
  ExternalLink,
  Target,
  Coins,
  Lock,
  Eye,
  EyeOff,
  ShoppingBag,
  Store,
  Layers,
  ArrowRight,
  TrendingUp,
  SlidersHorizontal,
  Sparkles,
  Ticket,
  ChevronRight,
  Check,
  PenSquare,
  Globe,
  Tag,
  Percent,
  ArrowUp,
  ArrowDown,
  Calendar,
  Plus,
  Trash2,
  MessageCircle,
  Send,
  Image as ImageIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CreatorNicheSelect } from "@/components/profile/creator-niche-select";
import { ImageUpload } from "@/components/ui/image-upload";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatDate } from "@/lib/datetime";
import { formatMoney } from "@/lib/money";
import {
  getMyAffiliateTokensOverview,
  registerAffiliate,
  upsertCreatorProfile,
  updateProfilePrivacyMode,
  getAffiliateShowcaseProducts,
  getAvailablePartnerStores,
  getCreatorAnalytics,
  saveCreatorShowcaseSettings,
  togglePartnerStoreConnection,
  getCreatorEvents,
} from "@/services/affiliates.functions";
import { getProfile } from "@/services/auth.functions";

export const Route = createFileRoute("/_store/afiliados")({
  head: () => ({
    meta: [
      { title: "Parceiros & Criadores de Conteúdo | Waesy" },
      {
        name: "description",
        content:
          "Monetize suas recomendações com vitrines digitais, cupons de lojas locais e acumulação de tokens na Rede Waesy.",
      },
    ],
  }),
  loader: async () => {
    try {
      const [profile, initialOverview] = await Promise.all([
        getProfile().catch(() => null),
        getMyAffiliateTokensOverview().catch(() => ({
          partner: null,
          wallet: { balance: 0, balancePendingMaturity: 0, lifetimeEarned: 0, vestingUnlockDate: null },
          referrals: [],
          rules: [],
          creatorProfile: null,
        })),
      ]);

      return { profile, initialOverview };
    } catch (err) {
      console.error("[loader:_store.afiliados] Unhandled loader error:", err);
      return {
        profile: null,
        initialOverview: {
          partner: null,
          wallet: { balance: 0, balancePendingMaturity: 0, lifetimeEarned: 0, vestingUnlockDate: null },
          referrals: [],
          rules: [],
          creatorProfile: null,
        },
      };
    }
  },
  component: AfiliadosPage,
});

function AfiliadosPage() {
  const { profile: loaderProfile, initialOverview } = ((Route.useLoaderData?.() as any) || {});
  const router = useRouter();
  const queryClient = useQueryClient();

  // 1. Dados Reativos com React Query
  const {
    data: overview,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["my-affiliate-overview"],
    queryFn: () => getMyAffiliateTokensOverview(),
    initialData: initialOverview?.partner ? initialOverview : undefined,
    staleTime: 10_000,
  });

  const partner = overview?.partner;
  const wallet = overview?.wallet;
  const referrals = overview?.referrals || [];
  const rules = overview?.rules || [];
  const creator = overview?.creatorProfile;

  const siteUrl = typeof window !== "undefined" ? window.location.origin : "https://usewaesy.com.br";
  const referralHandle = partner?.handle || creator?.handle || "";
  const generalAffiliateUrl = referralHandle ? `${siteUrl}/?ref=${referralHandle}` : "";
  const creatorShowcaseUrl = referralHandle ? `${siteUrl}/u/${referralHandle}` : "";

  const { data: analytics } = useQuery({
    queryKey: ["creator-analytics", referralHandle],
    queryFn: () => getCreatorAnalytics(),
    enabled: Boolean(partner?.id),
    staleTime: 30_000,
  });

  const { data: showcaseProducts = [] } = useQuery({
    queryKey: ["affiliate-showcase-products"],
    queryFn: () => getAffiliateShowcaseProducts(),
    staleTime: 60_000,
  });

  const { data: partnerStores = [] } = useQuery({
    queryKey: ["affiliate-partner-stores"],
    queryFn: () => getAvailablePartnerStores(),
    staleTime: 60_000,
  });

  const { data: creatorEvents = [] } = useQuery({
    queryKey: ["creator-events", referralHandle],
    queryFn: () => getCreatorEvents({ data: { handle: referralHandle } }),
    enabled: Boolean(referralHandle),
    staleTime: 30_000,
  });

  const [activeTab, setActiveTab] = useState<string>("dashboard");
  const [copiedLink, setCopiedLink] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSavingCreator, setIsSavingCreator] = useState(false);
  const [isUpdatingPrivacy, setIsUpdatingPrivacy] = useState(false);
  const [isSavingShowcase, setIsSavingShowcase] = useState(false);
  const [isStorePickerOpen, setIsStorePickerOpen] = useState(false);

  // Auto-preenche handle a partir do username do perfil
  const defaultHandle =
    loaderProfile?.username ||
    loaderProfile?.email?.split("@")[0]?.toLowerCase().replace(/[^a-z0-9_-]/g, "") ||
    "";

  // Estados do Onboarding para Novo Afiliado (Multi-step)
  const [onboardingStep, setOnboardingStep] = useState<1 | 2 | 3 | 4>(1);
  const [onboardingHandle, setOnboardingHandle] = useState(defaultHandle);
  const [onboardingName, setOnboardingName] = useState(loaderProfile?.full_name || "");
  const [onboardingBio, setOnboardingBio] = useState("");
  const [onboardingCategory, setOnboardingCategory] = useState("Geral");
  const [onboardingAnonymize, setOnboardingAnonymize] = useState(true);

  // Form states para Edição de Criador
  const [creatorStageName, setCreatorStageName] = useState(
    overview?.creatorProfile?.stage_name || overview?.partner?.display_name || loaderProfile?.full_name || ""
  );
  const [creatorBio, setCreatorBio] = useState(
    overview?.creatorProfile?.bio || overview?.partner?.bio || ""
  );
  const [creatorCategory, setCreatorCategory] = useState(
    overview?.creatorProfile?.category || "Geral"
  );

  // Estados do CMS de Vitrine (Banner, Ordem de Seções, Lojas Conectadas)
  const [bannerUrl, setBannerUrl] = useState(creator?.banner_url || "");
  const [bannerTitle, setBannerTitle] = useState(creator?.banner_title || "");
  const [bannerLink, setBannerLink] = useState(creator?.banner_link || "");
  const [showcaseOrder, setShowcaseOrder] = useState<string[]>(
    creator?.showcase_order || ["banner", "stores", "products", "events"]
  );
  const [connectedStoreIds, setConnectedStoreIds] = useState<string[]>(
    creator?.partner_store_ids || []
  );

  const [creatorAvatarUrl, setCreatorAvatarUrl] = useState(
    overview?.creatorProfile?.avatar_url || ""
  );
  const [creatorCoverUrl, setCreatorCoverUrl] = useState(
    overview?.creatorProfile?.cover_url || ""
  );

  useEffect(() => {
    if (creator) {
      if (creator.banner_url !== undefined) setBannerUrl(creator.banner_url || "");
      if (creator.banner_title !== undefined) setBannerTitle(creator.banner_title || "");
      if (creator.banner_link !== undefined) setBannerLink(creator.banner_link || "");
      if (creator.showcase_order) setShowcaseOrder(creator.showcase_order);
      if (creator.partner_store_ids) setConnectedStoreIds(creator.partner_store_ids);
      if (creator.stage_name) setCreatorStageName(creator.stage_name);
      if (creator.bio) setCreatorBio(creator.bio);
      if (creator.category) setCreatorCategory(creator.category);
      if (creator.avatar_url !== undefined) setCreatorAvatarUrl(creator.avatar_url || "");
      if (creator.cover_url !== undefined) setCreatorCoverUrl(creator.cover_url || "");
    }
  }, [creator]);

  // Privacy states
  const [isAnonymous, setIsAnonymous] = useState(Boolean(loaderProfile?.is_anonymous));
  const [privacyMode, setPrivacyMode] = useState<"public" | "unlisted" | "private">(
    (loaderProfile?.privacy_mode as any) || "public"
  );

  const handleCopy = (text: string, label: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedLink(text);
    toast.success(`${label} copiado!`);
    setTimeout(() => setCopiedLink(null), 2000);
  };

  const handleShareWhatsApp = (text: string, url: string) => {
    const message = encodeURIComponent(`${text}\n${url}`);
    window.open(`https://api.whatsapp.com/send?text=${message}`, "_blank");
  };

  const moveSection = (index: number, direction: "up" | "down") => {
    const newOrder = [...showcaseOrder];
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newOrder.length) return;
    const temp = newOrder[index];
    newOrder[index] = newOrder[targetIndex];
    newOrder[targetIndex] = temp;
    setShowcaseOrder(newOrder);
  };

  const handleToggleStoreConnection = async (storeId: string) => {
    const isConnected = connectedStoreIds.includes(storeId);
    const newIds = isConnected
      ? connectedStoreIds.filter((id) => id !== storeId)
      : [...connectedStoreIds, storeId];
    setConnectedStoreIds(newIds);

    try {
      await togglePartnerStoreConnection({
        data: {
          handle: referralHandle,
          storeId,
          connect: !isConnected,
        },
      });
      toast.success(isConnected ? "Loja removida da sua vitrine." : "Loja conectada à sua vitrine!");
      await queryClient.invalidateQueries({ queryKey: ["my-affiliate-overview"] });
    } catch (err: any) {
      toast.error(err.message || "Erro ao atualizar loja parceira.");
      setConnectedStoreIds(connectedStoreIds);
    }
  };

  const handleSaveShowcase = async () => {
    if (!referralHandle) return;
    setIsSavingShowcase(true);
    try {
      await saveCreatorShowcaseSettings({
        data: {
          handle: referralHandle,
          bannerUrl: bannerUrl || null,
          bannerTitle: bannerTitle || null,
          bannerLink: bannerLink || null,
          showcaseOrder,
          partnerStoreIds: connectedStoreIds,
        },
      });
      toast.success("Vitrine pública atualizada com sucesso!");
      await queryClient.invalidateQueries({ queryKey: ["my-affiliate-overview"] });
      router.invalidate();
    } catch (err: any) {
      toast.error(err?.message || "Erro ao salvar vitrine.");
    } finally {
      setIsSavingShowcase(false);
    }
  };

  const handleOnboardingSubmit = async () => {
    if (!onboardingHandle.trim() || onboardingHandle.length < 3) {
      toast.error("O identificador único deve ter no mínimo 3 caracteres.");
      return;
    }

    setIsSubmitting(true);
    try {
      await registerAffiliate({
        data: {
          handle: onboardingHandle.trim().toLowerCase(),
          displayName: onboardingName.trim() || loaderProfile?.full_name || "Criador Waesy",
          bio: onboardingBio.trim() || undefined,
          category: onboardingCategory,
        },
      });

      if (onboardingAnonymize) {
        await updateProfilePrivacyMode({
          data: {
            isAnonymous: true,
            privacyMode: "unlisted",
          },
        }).catch(() => null);
      }

      toast.success("Perfil de parceiro e criador ativado com sucesso!");
      await queryClient.invalidateQueries({ queryKey: ["my-affiliate-overview"] });
      router.invalidate();
    } catch (err: any) {
      toast.error(err?.message || "Erro ao ativar perfil de parceiro.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveCreator = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!referralHandle) return;

    setIsSavingCreator(true);
    try {
      await upsertCreatorProfile({
        data: {
          handle: referralHandle,
          stageName: creatorStageName.trim() || partner?.display_name || "Criador Waesy",
          bio: creatorBio.trim() || undefined,
          category: creatorCategory,
          avatarUrl: creatorAvatarUrl || undefined,
          coverUrl: creatorCoverUrl || undefined,
          socialLinks: creator?.social_links || {},
          pinnedProducts: creator?.pinned_products || [],
        },
      });

      toast.success("Perfil público de criador atualizado com sucesso!");
      await queryClient.invalidateQueries({ queryKey: ["my-affiliate-overview"] });
      router.invalidate();
    } catch (err: any) {
      toast.error(err?.message || "Erro ao salvar alterações.");
    } finally {
      setIsSavingCreator(false);
    }
  };

  const handleTogglePrivacy = async (newAnonymous: boolean, newMode: "public" | "unlisted" | "private") => {
    setIsUpdatingPrivacy(true);
    try {
      await updateProfilePrivacyMode({
        data: {
          isAnonymous: newAnonymous,
          privacyMode: newMode,
        },
      });

      setIsAnonymous(newAnonymous);
      setPrivacyMode(newMode);
      toast.success(
        newAnonymous
          ? "Perfil pessoal discreto. Suas compras e dados de CPF não aparecem em buscas públicas; sua marca interage publicamente."
          : "Perfil civil restaurado para exibição comunitária padrão."
      );
      await queryClient.invalidateQueries({ queryKey: ["my-affiliate-overview"] });
      router.invalidate();
    } catch (err: any) {
      toast.error(err?.message || "Erro ao atualizar privacidade.");
    } finally {
      setIsUpdatingPrivacy(false);
    }
  };

  const sectionLabels: Record<string, { label: string; desc: string; icon: any }> = {
    banner: {
      label: "Banner Promocional da Marca",
      desc: "Imagem de destaque 16:9 no topo da vitrine com chamada e link",
      icon: ImageIcon,
    },
    stores: {
      label: "Lojas Parceiras Conectadas",
      desc: `${connectedStoreIds.length} loja(s) com cupons exclusivos exibidas aos seus seguidores`,
      icon: Store,
    },
    products: {
      label: "Produtos Recomendados",
      desc: `${showcaseProducts.length} produto(s) disponíveis para comissão`,
      icon: ShoppingBag,
    },
    events: {
      label: "Próximos Eventos & Shows",
      desc: `${creatorEvents.length} evento(s) da marca agendados`,
      icon: Calendar,
    },
  };

  const connectedStoresList = partnerStores.filter((s: any) => connectedStoreIds.includes(s.id));

  return (
    <div className="min-h-screen bg-background text-foreground pb-28">
      {/* ─── Top Bar Nativa Apple HIG (Direta, Comercial e Silenciosa) ─── */}
      <div className="border-b border-border/40 bg-card/70 backdrop-blur-md px-2.5 sm:px-6 py-2.5 sm:py-3.5 sticky top-0 z-20">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <h1 className="text-sm sm:text-base font-bold tracking-tight text-foreground truncate">
              Parceiros & Criadores
            </h1>
            {partner && (
              <Badge variant="outline" className="text-[11px] font-mono bg-primary/5 text-primary border-primary/20 shrink-0">
                @{referralHandle}
              </Badge>
            )}
          </div>

          {partner && (
            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              <Button asChild variant="outline" size="sm" className="h-9 px-3 rounded-xl text-xs gap-1.5">
                <Link to="/u/$username" params={{ username: referralHandle }}>
                  <Globe className="size-3.5" />
                  <span className="hidden xs:inline">Minha Vitrine</span>
                </Link>
              </Button>

              <Button asChild size="sm" className="h-9 px-3 rounded-xl text-xs font-semibold gap-1.5">
                <Link to="/feed">
                  <PenSquare className="size-3.5" />
                  <span>Publicar</span>
                </Link>
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Container Principal com Padrão 1px Mobile (Edge-to-Edge) */}
      <div className="max-w-5xl mx-auto px-0 sm:px-4 md:px-6 py-2 sm:py-6">
        {isLoading && !partner ? (
          <div className="max-w-md mx-auto py-20 text-center space-y-4">
            <div className="size-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto animate-pulse">
              <Sparkles className="size-6" />
            </div>
            <p className="text-sm font-semibold text-foreground">Carregando painel...</p>
          </div>
        ) : partner ? (
          /* ─── PAINEL COMPLETO DO CRIADOR / PARCEIRO ────────────── */
          <div className="space-y-4 sm:space-y-6">
            {/* Navegação em Tabs (Scroll Suave no Mobile sem Quebra Feia) */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4 sm:space-y-6">
              <TabsList className="h-10 sm:h-11 p-1 bg-muted/40 rounded-xl border border-border/40 flex items-center gap-1 overflow-x-auto no-scrollbar snap-x snap-mandatory w-full sm:grid sm:grid-cols-5">
                <TabsTrigger value="dashboard" className="h-8 sm:h-9 px-3 text-xs rounded-lg gap-1.5 font-medium shrink-0 snap-start sm:shrink">
                  <TrendingUp className="size-3.5" />
                  <span>Visão Geral</span>
                </TabsTrigger>
                <TabsTrigger value="showcase" className="h-8 sm:h-9 px-3 text-xs rounded-lg gap-1.5 font-medium shrink-0 snap-start sm:shrink">
                  <Layers className="size-3.5" />
                  <span>Minha Vitrine</span>
                </TabsTrigger>
                <TabsTrigger value="stores" className="h-8 sm:h-9 px-3 text-xs rounded-lg gap-1.5 font-medium shrink-0 snap-start sm:shrink">
                  <Store className="size-3.5" />
                  <span>Lojas & Cupons</span>
                </TabsTrigger>
                <TabsTrigger value="referrals" className="h-8 sm:h-9 px-3 text-xs rounded-lg gap-1.5 font-medium shrink-0 snap-start sm:shrink">
                  <Coins className="size-3.5" />
                  <span>Ganhos & Bônus</span>
                </TabsTrigger>
                <TabsTrigger value="settings" className="h-8 sm:h-9 px-3 text-xs rounded-lg gap-1.5 font-medium shrink-0 snap-start sm:shrink">
                  <SlidersHorizontal className="size-3.5" />
                  <span>Configurações</span>
                </TabsTrigger>
              </TabsList>

              {/* ─── TAB 1: VISÃO GERAL (MÉTRICAS & SEMÂNTICA COMERCIAL DIRETA) ── */}
              <TabsContent value="dashboard" className="space-y-3 sm:space-y-5 mt-0">
                {/* 4 Cards de Métricas Comerciais */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
                  <div className="p-3.5 sm:p-4 rounded-2xl border border-border/60 bg-card space-y-1">
                    <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                      Cliques no Link
                    </span>
                    <p className="text-xl sm:text-2xl font-bold text-foreground">
                      {(partner.total_clicks || 0).toLocaleString("pt-BR")}
                    </p>
                    <span className="text-[10px] text-muted-foreground">Acessos à sua vitrine</span>
                  </div>

                  <div className="p-3.5 sm:p-4 rounded-2xl border border-border/60 bg-card space-y-1">
                    <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                      Vendas Realizadas
                    </span>
                    <p className="text-xl sm:text-2xl font-bold text-foreground">
                      {partner.total_orders || 0}
                    </p>
                    <span className="text-[10px] text-emerald-600 font-medium">Pedidos convertidos</span>
                  </div>

                  <div className="p-3.5 sm:p-4 rounded-2xl border border-border/60 bg-card space-y-1">
                    <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                      Volume Gerado
                    </span>
                    <p className="text-xl sm:text-2xl font-bold text-foreground">
                      {formatMoney(partner.total_gmv_cents || 0)}
                    </p>
                    <span className="text-[10px] text-muted-foreground">Total faturado em lojas</span>
                  </div>

                  <div className="p-3.5 sm:p-4 rounded-2xl border border-primary/30 bg-primary/5 space-y-1">
                    <span className="text-[11px] font-medium text-primary uppercase tracking-wider flex items-center gap-1">
                      <Coins className="size-3" /> Saldo de Ganhos
                    </span>
                    <p className="text-xl sm:text-2xl font-bold text-primary">
                      {(wallet?.balance || 0).toLocaleString("pt-BR")}
                    </p>
                    <span className="text-[10px] text-muted-foreground">
                      +{wallet?.balancePendingMaturity || 0} a liberar
                    </span>
                  </div>
                </div>

                {/* Link de Divulgação com Compartilhamento Direto */}
                <div className="p-4 sm:p-5 rounded-2xl border border-border/60 bg-card space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                    <div>
                      <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                        <span>Seu Link de Divulgação</span>
                        <Badge variant="outline" className="text-[10px] bg-muted/40 font-mono">
                          Validade 30 dias
                        </Badge>
                      </h3>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Compartilhe seu link exclusivo e receba comissões automáticas em cada compra realizada.
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => handleCopy(generalAffiliateUrl, "Link de divulgação")}
                        className="h-9 px-3.5 rounded-xl text-xs font-semibold gap-1.5"
                      >
                        {copiedLink === generalAffiliateUrl ? (
                          <CheckCircle2 className="size-3.5 text-emerald-400" />
                        ) : (
                          <Copy className="size-3.5" />
                        )}
                        <span>{copiedLink === generalAffiliateUrl ? "Copiado" : "Copiar"}</span>
                      </Button>

                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          handleShareWhatsApp(
                            `Acesse as novidades, lojas e cupons exclusivos na minha vitrine Waesy:`,
                            generalAffiliateUrl
                          )
                        }
                        className="h-9 px-3.5 rounded-xl text-xs font-semibold gap-1.5 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-500/10 border-emerald-500/30"
                      >
                        <Send className="size-3.5" />
                        <span>WhatsApp</span>
                      </Button>
                    </div>
                  </div>

                  <Input
                    readOnly
                    value={generalAffiliateUrl}
                    className="h-10 rounded-xl bg-muted/30 font-mono text-xs border-border/50 select-all"
                  />
                </div>

                {/* Desempenho de Vendas */}
                <div className="p-4 sm:p-5 rounded-2xl border border-border/60 bg-card space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                        <span>Desempenho de Vendas</span>
                        <Badge
                          variant="outline"
                          className="text-[10px] font-semibold text-emerald-600 bg-emerald-500/10 border-emerald-500/20"
                        >
                          {analytics?.summary?.conversionRate || 0}% conversão
                        </Badge>
                      </h3>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Acompanhamento diário de acessos à sua vitrine e pedidos gerados.
                      </p>
                    </div>

                    <Button asChild variant="outline" size="sm" className="h-8 px-3 rounded-xl text-xs gap-1.5 self-start sm:self-auto">
                      <Link to="/u/$username" params={{ username: referralHandle }}>
                        <Globe className="size-3.5" />
                        <span>Abrir Vitrine Pública</span>
                      </Link>
                    </Button>
                  </div>

                  {analytics?.clicksHistory && analytics.clicksHistory.length > 0 ? (
                    <div className="space-y-2 pt-1">
                      <div className="flex items-center justify-between text-xs text-muted-foreground pb-1">
                        <span>Histórico recente</span>
                        <span>Acessos vs Vendas</span>
                      </div>
                      <div className="space-y-1.5 max-h-48 overflow-y-auto">
                        {analytics.clicksHistory.slice(-7).map((item) => (
                          <div
                            key={item.date}
                            className="flex items-center justify-between p-2.5 rounded-xl bg-muted/20 border border-border/40 text-xs"
                          >
                            <span className="font-mono text-muted-foreground">{item.date}</span>
                            <div className="flex items-center gap-3">
                              <span className="text-foreground font-semibold">{item.clicks} acesso(s)</span>
                              {item.conversions > 0 && (
                                <Badge variant="default" className="text-[10px] bg-emerald-600 text-white">
                                  {item.conversions} venda(s)
                                </Badge>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="p-3.5 rounded-xl bg-muted/20 border border-border/40 text-center text-xs text-muted-foreground">
                      Compartilhe seu link de vitrine ou produtos comissionados para acompanhar métricas de acessos diários aqui.
                    </div>
                  )}
                </div>

                {/* Resumo Comercial de Formas de Ganho */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3">
                  <div className="p-4 rounded-2xl border border-border/60 bg-card space-y-1.5">
                    <div className="size-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                      <ShoppingBag className="size-4" />
                    </div>
                    <h4 className="text-xs font-bold text-foreground">Comissões por Venda</h4>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      Receba comissão direta das lojas ao divulgar produtos, coleções e cardápios na sua vitrine.
                    </p>
                  </div>

                  <div className="p-4 rounded-2xl border border-border/60 bg-card space-y-1.5">
                    <div className="size-8 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                      <Ticket className="size-4" />
                    </div>
                    <h4 className="text-xs font-bold text-foreground">Cupons de Desconto</h4>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      Ofereça vantagens exclusivas nas lojas parceiras com cupons que levam sua assinatura.
                    </p>
                  </div>

                  <div className="p-4 rounded-2xl border border-border/60 bg-card space-y-1.5">
                    <div className="size-8 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
                      <Coins className="size-4" />
                    </div>
                    <h4 className="text-xs font-bold text-foreground">Bônus por Indicação</h4>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      Ganhe tokens e bônus por novos clientes e empresas indicadas, com resgate via Pix.
                    </p>
                  </div>
                </div>
              </TabsContent>

              {/* ─── TAB 2: MINHA VITRINE (CMS VISUAL ESTILO WIX MOBILE APP) ─ */}
              <TabsContent value="showcase" className="space-y-6 mt-0">
                {/* Header de Gestão da Vitrine */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-muted/20 p-5 rounded-2xl border border-border/60">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-foreground">
                        Editor Visual da Vitrine Pública
                      </h3>
                      <Badge variant="outline" className="text-[10px] font-mono">
                        @{referralHandle}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Personalize o banner, reordene as seções (sobe/desce) e conecte suas lojas locais favoritas.
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button asChild variant="outline" size="sm" className="h-10 px-3.5 rounded-xl text-xs gap-1.5">
                      <Link to="/u/$username" params={{ username: referralHandle }} target="_blank">
                        <Globe className="size-3.5" />
                        <span>Pré-visualizar Vitrine</span>
                      </Link>
                    </Button>

                    <Button
                      type="button"
                      size="sm"
                      disabled={isSavingShowcase}
                      onClick={handleSaveShowcase}
                      className="h-10 px-4 rounded-xl text-xs font-semibold gap-1.5"
                    >
                      {isSavingShowcase ? (
                        <span>Salvando...</span>
                      ) : (
                        <>
                          <Check className="size-3.5" />
                          <span>Salvar Vitrine</span>
                        </>
                      )}
                    </Button>
                  </div>
                </div>

                {/* 1. Controle de Camadas da Vitrine (Wix Style Reordering) */}
                <div className="p-3.5 sm:p-6 rounded-2xl border border-border/60 bg-card space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                        <Layers className="size-3.5 text-primary" />
                        <span>Ordem das Camadas na Vitrine Pública</span>
                      </h4>
                      <p className="text-[11px] text-muted-foreground">
                        Use os botões de subir e descer para definir a prioridade das seções na sua página pública.
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {showcaseOrder.map((sectionKey, idx) => {
                      const item = sectionLabels[sectionKey] || {
                        label: sectionKey,
                        desc: "Seção personalizada",
                        icon: Layers,
                      };
                      const IconComponent = item.icon;

                      return (
                        <div
                          key={sectionKey}
                          className="flex items-center justify-between p-3.5 rounded-xl bg-muted/20 border border-border/40"
                        >
                          <div className="flex items-center gap-3">
                            <span className="size-6 rounded-full bg-muted flex items-center justify-center text-xs font-mono font-bold text-muted-foreground">
                              {idx + 1}
                            </span>
                            <div className="size-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                              <IconComponent className="size-4" />
                            </div>
                            <div>
                              <p className="text-xs font-bold text-foreground">{item.label}</p>
                              <p className="text-[10px] text-muted-foreground">{item.desc}</p>
                            </div>
                          </div>

                          <div className="flex items-center gap-1">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              disabled={idx === 0}
                              onClick={() => moveSection(idx, "up")}
                              className="size-8 p-0 rounded-lg text-muted-foreground hover:text-foreground"
                              title="Subir camada"
                            >
                              <ArrowUp className="size-4" />
                            </Button>

                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              disabled={idx === showcaseOrder.length - 1}
                              onClick={() => moveSection(idx, "down")}
                              className="size-8 p-0 rounded-lg text-muted-foreground hover:text-foreground"
                              title="Descer camada"
                            >
                              <ArrowDown className="size-4" />
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* 2. Editor de Banner Promocional 16:9 */}
                <div className="p-3.5 sm:p-6 rounded-2xl border border-border/60 bg-card space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                        <ImageIcon className="size-3.5 text-primary" />
                        <span>Banner Promocional da Marca (16:9)</span>
                      </h4>
                      <p className="text-[11px] text-muted-foreground">
                        Apresente uma foto temática, cupom da semana ou parceria em destaque no topo da sua vitrine.
                      </p>
                    </div>
                  </div>

                  {/* Preview Visual em Tempo Real */}
                  <div className="aspect-video sm:aspect-[21/9] w-full rounded-2xl bg-muted/40 border border-border/60 overflow-hidden relative flex flex-col justify-end p-4 sm:p-6">
                    {bannerUrl ? (
                      <img
                        src={bannerUrl}
                        alt="Banner Preview"
                        className="absolute inset-0 w-full h-full object-cover"
                      />
                    ) : (
                      <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-muted to-background flex items-center justify-center text-muted-foreground text-xs font-medium">
                        Insira a URL de uma imagem abaixo para visualizar o banner em 16:9
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent pointer-events-none" />

                    <div className="relative z-10 space-y-1">
                      <Badge className="text-[10px] bg-primary text-primary-foreground border-none">
                        Destaque da Semana
                      </Badge>
                      <h3 className="text-base sm:text-xl font-extrabold text-white line-clamp-1">
                        {bannerTitle || "Seu Título Promocional em Destaque Aqui"}
                      </h3>
                      {bannerLink && (
                        <span className="text-[11px] text-white/80 font-mono flex items-center gap-1">
                          <ExternalLink className="size-3" />
                          {bannerLink}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Campos do Banner */}
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 pt-2 items-start">
                    <div className="sm:col-span-4 space-y-1.5">
                      <Label className="text-xs font-semibold text-foreground">Upload da Imagem (16:9)</Label>
                      <ImageUpload
                        value={bannerUrl}
                        onChange={(url) => setBannerUrl(url)}
                        onRemove={() => setBannerUrl("")}
                        aspectPreset="widescreen"
                        bucket="cms-media"
                        helperText="Panorâmico 16:9 de alta definição"
                      />
                    </div>

                    <div className="sm:col-span-8 space-y-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium">Título de Chamada no Banner</Label>
                        <Input
                          value={bannerTitle}
                          onChange={(e) => setBannerTitle(e.target.value)}
                          placeholder="Ex: Cupons e Indicações da Semana"
                          className="h-11 rounded-xl text-xs bg-background"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium">Link de Destino ao Clicar (Opcional)</Label>
                        <Input
                          value={bannerLink}
                          onChange={(e) => setBannerLink(e.target.value)}
                          placeholder="Ex: /c/loja-exemplo ou https://..."
                          className="h-11 rounded-xl text-xs bg-background font-mono"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* 3. Lojas Parceiras Conectadas à Vitrine */}
                <div className="p-3.5 sm:p-6 rounded-2xl border border-border/60 bg-card space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <h4 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                        <Store className="size-3.5 text-primary" />
                        <span>Lojas Parceiras Conectadas ({connectedStoreIds.length})</span>
                      </h4>
                      <p className="text-[11px] text-muted-foreground">
                        Lojas que aparecem com seus cupons de 10% de desconto na sua vitrine pública.
                      </p>
                    </div>

                    <Button
                      type="button"
                      size="sm"
                      onClick={() => setIsStorePickerOpen(true)}
                      className="h-10 px-4 rounded-xl text-xs font-semibold gap-1.5 self-start sm:self-auto"
                    >
                      <Plus className="size-3.5" />
                      <span>Conectar Nova Loja</span>
                    </Button>
                  </div>

                  {connectedStoresList.length === 0 ? (
                    <div className="p-6 text-center rounded-xl bg-muted/20 border border-border/40 space-y-2">
                      <Store className="size-6 text-muted-foreground mx-auto" />
                      <p className="text-xs font-semibold text-foreground">Nenhuma loja conectada ainda</p>
                      <p className="text-[11px] text-muted-foreground">
                        Clique no botão acima para conectar as lojas parceiras da sua cidade à sua vitrine.
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {connectedStoresList.map((s: any) => (
                        <div
                          key={s.id}
                          className="p-4 rounded-xl border border-border/60 bg-muted/10 flex items-center justify-between gap-3"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="size-11 rounded-xl bg-muted/60 overflow-hidden shrink-0 border border-border/40 flex items-center justify-center">
                              {s.logoUrl ? (
                                <img src={s.logoUrl} alt={s.name} className="size-full object-cover" />
                              ) : (
                                <Store className="size-5 text-muted-foreground" />
                              )}
                            </div>
                            <div className="min-w-0">
                              <h5 className="text-xs font-bold text-foreground truncate">{s.name}</h5>
                              <p className="text-[10px] text-muted-foreground truncate">
                                Cupom: <span className="font-mono font-bold text-primary">{s.couponCode}</span> (10% OFF)
                              </p>
                            </div>
                          </div>

                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleToggleStoreConnection(s.id)}
                            className="size-8 p-0 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                            title="Remover loja da vitrine"
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* 4. Produtos Recomendados */}
                <div className="p-3.5 sm:p-6 rounded-2xl border border-border/60 bg-card space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                        <ShoppingBag className="size-3.5 text-primary" />
                        <span>Produtos Comissionados do Catálogo ({showcaseProducts.length})</span>
                      </h4>
                      <p className="text-[11px] text-muted-foreground">
                        Compartilhe itens com links exclusivos para receber comissões automáticas das lojas.
                      </p>
                    </div>
                  </div>

                  {showcaseProducts.length === 0 ? (
                    <div className="p-6 text-center rounded-xl bg-muted/20 border border-border/40 space-y-2">
                      <ShoppingBag className="size-6 text-muted-foreground mx-auto" />
                      <p className="text-xs text-muted-foreground">
                        Nenhum produto cadastrado no momento. Assim que as lojas ativarem itens no catálogo público, eles aparecerão aqui.
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {showcaseProducts.slice(0, 6).map((p: any) => {
                        const productAffiliateUrl = `${siteUrl}/produto/${p.slug}?ref=${referralHandle}&utm_source=creator_showcase&utm_medium=affiliate`;

                        return (
                          <div
                            key={p.id}
                            className="p-3.5 rounded-xl border border-border/60 bg-muted/10 flex flex-col justify-between gap-2.5"
                          >
                            <div className="space-y-2">
                              <div className="aspect-video w-full rounded-lg bg-muted/40 overflow-hidden relative">
                                {p.imageUrl ? (
                                  <img src={p.imageUrl} alt={p.name} className="size-full object-cover" />
                                ) : (
                                  <div className="size-full flex items-center justify-center text-muted-foreground text-xs">
                                    Sem imagem
                                  </div>
                                )}
                                <Badge className="absolute top-2 right-2 text-[10px] bg-background/90 text-foreground backdrop-blur-md">
                                  ~{formatMoney(p.estimatedCommissionCents)} comissão
                                </Badge>
                              </div>

                              <div>
                                <span className="text-[9px] text-muted-foreground uppercase font-medium">
                                  {p.storeName}
                                </span>
                                <h5 className="text-xs font-bold text-foreground line-clamp-1">{p.name}</h5>
                                <p className="text-xs font-extrabold text-primary">{formatMoney(p.priceCents)}</p>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 pt-1 border-t border-border/40">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => handleCopy(productAffiliateUrl, "Link do produto")}
                                className="flex-1 h-9 rounded-xl text-[11px] font-semibold gap-1"
                              >
                                {copiedLink === productAffiliateUrl ? (
                                  <Check className="size-3 text-emerald-500" />
                                ) : (
                                  <Copy className="size-3" />
                                )}
                                <span>{copiedLink === productAffiliateUrl ? "Copiado!" : "Copiar Link"}</span>
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* 5. Próximos Eventos & Shows da Marca */}
                <div className="p-3.5 sm:p-6 rounded-2xl border border-border/60 bg-card space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <h4 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                        <Calendar className="size-3.5 text-primary" />
                        <span>Próximos Eventos & Shows da Marca ({creatorEvents.length})</span>
                      </h4>
                      <p className="text-[11px] text-muted-foreground">
                        Apresentações, workshops e eventos em que você atua ou co-organiza.
                      </p>
                    </div>

                    <Button asChild variant="outline" size="sm" className="h-10 px-3.5 rounded-xl text-xs gap-1.5 self-start sm:self-auto">
                      <Link to="/eventos">
                        <Plus className="size-3.5" />
                        <span>Cadastrar Evento</span>
                      </Link>
                    </Button>
                  </div>

                  {creatorEvents.length === 0 ? (
                    <div className="p-6 text-center rounded-xl bg-muted/20 border border-border/40 space-y-2">
                      <Calendar className="size-6 text-muted-foreground mx-auto" />
                      <p className="text-xs font-semibold text-foreground">Nenhum evento agendado</p>
                      <p className="text-[11px] text-muted-foreground">
                        Cadastre eventos com o identificador @{referralHandle} para exibi-los na sua vitrine.
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {creatorEvents.map((evt: any) => (
                        <div
                          key={evt.id}
                          className="p-4 rounded-xl border border-border/60 bg-muted/10 flex items-start gap-3"
                        >
                          <div className="size-12 rounded-xl bg-muted/60 overflow-hidden shrink-0 border border-border/40">
                            {evt.cover_image ? (
                              <img src={evt.cover_image} alt={evt.title} className="size-full object-cover" />
                            ) : (
                              <div className="size-full flex items-center justify-center text-muted-foreground">
                                <Calendar className="size-5" />
                              </div>
                            )}
                          </div>

                          <div className="space-y-1 min-w-0">
                            <h5 className="text-xs font-bold text-foreground truncate">{evt.title}</h5>
                            <p className="text-[10px] text-muted-foreground">
                              {evt.event_date ? formatDate(evt.event_date) : "Data a definir"} • {evt.location || evt.city || "Chapecó"}
                            </p>
                            <Badge variant="secondary" className="text-[9px]">
                              {evt.is_free ? "Gratuito" : formatMoney(evt.price_cents || 0)}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </TabsContent>

              {/* ─── TAB 3: LOJAS & CUPONS PARCEIROS ────────────────── */}
              <TabsContent value="stores" className="space-y-4 sm:space-y-6 mt-0">
                <div className="bg-muted/20 p-3.5 sm:p-5 rounded-2xl border border-border/60">
                  <h3 className="text-sm font-bold text-foreground">Lojas Parceiras com Cupons Ativos</h3>
                  <p className="text-xs text-muted-foreground">
                    Divulgue os cupons exclusivos das lojas locais. O cliente ganha 10% de desconto e a venda é atribuída à sua conta.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {partnerStores.map((s: any) => {
                    const couponCode = `${referralHandle.toUpperCase().slice(0, 6)}10`;
                    const storeUrl = `${siteUrl}/c/${s.slug}?ref=${referralHandle}&coupon=${couponCode}`;
                    const isConnected = connectedStoreIds.includes(s.id);

                    return (
                      <div
                        key={s.id}
                        className="p-3.5 sm:p-5 rounded-2xl border border-border/60 bg-card flex flex-col justify-between gap-4"
                      >
                        <div className="flex items-start gap-3">
                          <div className="size-12 rounded-xl bg-muted/60 overflow-hidden shrink-0 border border-border/40 flex items-center justify-center">
                            {s.logoUrl ? (
                              <img src={s.logoUrl} alt={s.name} className="w-full h-full object-cover" />
                            ) : (
                              <Store className="size-5 text-muted-foreground" />
                            )}
                          </div>

                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <h4 className="text-sm font-bold text-foreground">{s.name}</h4>
                              <Badge variant="secondary" className="text-[10px]">
                                {s.segment}
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {s.city} • {s.state}
                            </p>
                          </div>
                        </div>

                        <div className="p-3 rounded-xl bg-primary/5 border border-primary/20 flex items-center justify-between">
                          <div>
                            <span className="text-[10px] text-muted-foreground uppercase font-medium">
                              Cupom Exclusivo
                            </span>
                            <p className="text-xs font-mono font-bold text-primary">{couponCode}</p>
                          </div>
                          <Badge className="bg-primary text-primary-foreground text-[10px] font-bold">
                            10% OFF
                          </Badge>
                        </div>

                        <div className="flex items-center gap-2 pt-1">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => handleCopy(couponCode, "Cupom")}
                            className="flex-1 h-10 rounded-xl text-xs font-semibold gap-1.5"
                          >
                            <Copy className="size-3.5" />
                            <span>Copiar Cupom</span>
                          </Button>

                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              handleShareWhatsApp(
                                `Aproveite 10% de desconto na ${s.name} com meu cupom exclusivo ${couponCode}:`,
                                storeUrl
                              )
                            }
                            className="h-10 px-3 rounded-xl text-xs font-semibold text-emerald-600 hover:text-emerald-700 hover:bg-emerald-500/10 border-emerald-500/30"
                            title="Enviar no WhatsApp"
                          >
                            <Send className="size-3.5" />
                          </Button>

                          <Button
                            type="button"
                            size="sm"
                            variant={isConnected ? "secondary" : "default"}
                            onClick={() => handleToggleStoreConnection(s.id)}
                            className="h-10 px-3.5 rounded-xl text-xs font-semibold gap-1.5"
                          >
                            {isConnected ? (
                              <>
                                <Check className="size-3.5 text-emerald-600" />
                                <span>Conectada</span>
                              </>
                            ) : (
                              <>
                                <Plus className="size-3.5" />
                                <span>Conectar</span>
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </TabsContent>

              {/* ─── TAB 4: INDICAÇÕES & SALDO ────────────────────── */}
              <TabsContent value="referrals" className="space-y-4 sm:space-y-6 mt-0">
                {/* Bloco de Saldo e Saques */}
                <div className="p-4 sm:p-5 rounded-2xl border border-primary/30 bg-primary/5 space-y-2.5">
                  <div className="flex items-center gap-2.5">
                    <div className="size-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                      <ShieldCheck className="size-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-foreground">
                        Seus Ganhos & Extrato
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        Comissões e bônus acumulados por indicações e vendas confirmadas.
                      </p>
                    </div>
                  </div>

                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Suas comissões por vendas e bônus por indicações são creditados automaticamente no seu saldo.
                    Você pode solicitar o resgate via Pix ou utilizar como desconto em compras na rede.
                  </p>
                </div>

                {/* Regras Ativas de Tokens */}
                {rules.length > 0 && (
                  <div className="p-4 sm:p-5 rounded-2xl border border-border/60 bg-card space-y-3">
                    <h3 className="text-sm font-bold text-foreground">Regras de Bônus por Indicação</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3">
                      {rules.map((r: any) => (
                        <div key={r.id} className="p-3 rounded-xl border border-border/60 bg-muted/20 space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-foreground">{r.title}</span>
                            <Badge variant="secondary" className="text-[10px]">
                              {r.vesting_days}d liberação
                            </Badge>
                          </div>
                          <p className="text-sm sm:text-base font-extrabold text-primary">
                            +{Number(r.tokens_amount).toLocaleString("pt-BR")} tokens
                          </p>
                          <p className="text-[11px] text-muted-foreground leading-tight">{r.description}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Histórico */}
                <div className="p-4 sm:p-5 rounded-2xl border border-border/60 bg-card space-y-3">
                  <h3 className="text-sm font-bold text-foreground">Histórico de Indicações Recentes</h3>
                  {referrals.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-6">
                      Nenhuma indicação registrada ainda. Compartilhe seu link exclusivo para começar.
                    </p>
                  ) : (
                    <div className="divide-y divide-border/40">
                      {referrals.map((ref: any) => (
                        <div key={ref.id} className="py-2.5 flex items-center justify-between gap-2">
                          <div className="space-y-0.5">
                            <p className="text-xs font-semibold text-foreground">
                              {ref.referral_type === "store" ? "Loja / Empresa" : "Membro"} indicado
                            </p>
                            <span className="text-[10px] text-muted-foreground">{formatDate(ref.created_at)}</span>
                          </div>

                          <div className="text-right space-y-0.5">
                            <p className="text-xs font-bold text-primary">
                              +{(ref.tokens_awarded || 0).toLocaleString("pt-BR")} tokens
                            </p>
                            <Badge
                              variant={ref.status === "matured" ? "default" : "outline"}
                              className="text-[10px]"
                            >
                              {ref.status === "matured" ? "Liberado" : "Em Liberação"}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </TabsContent>

              {/* ─── TAB 5: IDENTIDADE & CONFIGURAÇÕES ─────────────── */}
              <TabsContent value="settings" className="space-y-4 sm:space-y-6 mt-0">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                  {/* Edição do Perfil de Criador */}
                  <div className="p-3.5 sm:p-6 rounded-2xl border border-border/60 bg-card space-y-3 sm:space-y-4">
                    <div>
                      <h3 className="text-sm font-bold text-foreground">Perfil Público da Marca</h3>
                      <p className="text-xs text-muted-foreground">
                        Como seus seguidores e lojas parceiras enxergam você na comunidade.
                      </p>
                    </div>

                    <form onSubmit={handleSaveCreator} className="space-y-3 sm:space-y-4">
                      {/* Avatar e Capa da Marca */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pb-2 border-b border-border/40">
                        <div className="space-y-1.5">
                          <Label className="text-xs font-semibold text-foreground">Foto do Perfil / Logo (1:1)</Label>
                          <ImageUpload
                            value={creatorAvatarUrl}
                            onChange={(url) => setCreatorAvatarUrl(url)}
                            onRemove={() => setCreatorAvatarUrl("")}
                            aspectPreset="square"
                            bucket="cms-media"
                            helperText="Quadrado 1:1"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <Label className="text-xs font-semibold text-foreground">Capa da Marca (Panorâmica)</Label>
                          <ImageUpload
                            value={creatorCoverUrl}
                            onChange={(url) => setCreatorCoverUrl(url)}
                            onRemove={() => setCreatorCoverUrl("")}
                            aspectPreset="widescreen"
                            bucket="cms-media"
                            helperText="Formato 16:9 widescreen"
                          />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <Label className="text-xs font-medium">Nome de Apresentação Pública</Label>
                        <Input
                          value={creatorStageName}
                          onChange={(e) => setCreatorStageName(e.target.value)}
                          className="h-10 sm:h-11 rounded-xl text-xs"
                          required
                        />
                      </div>

                      <div className="space-y-1">
                        <Label className="text-xs font-medium">Bio Pública</Label>
                        <Input
                          value={creatorBio}
                          onChange={(e) => setCreatorBio(e.target.value)}
                          placeholder="Foco de conteúdo, atuação regional..."
                          className="h-10 sm:h-11 rounded-xl text-xs"
                        />
                      </div>

                      <div className="space-y-1">
                        <Label className="text-xs font-medium">Nicho Principal</Label>
                        <Input
                          value={creatorCategory}
                          onChange={(e) => setCreatorCategory(e.target.value)}
                          placeholder="Ex: Geral, Gastronomia, Viagens, Moda"
                          className="h-10 sm:h-11 rounded-xl text-xs"
                        />
                      </div>

                      <Button
                        type="submit"
                        disabled={isSavingCreator}
                        className="w-full h-10 sm:h-11 rounded-xl text-xs font-semibold mt-2"
                      >
                        {isSavingCreator ? "Salvando..." : "Salvar Alterações"}
                      </Button>
                    </form>
                  </div>

                  {/* Privacidade do Perfil */}
                  <div className="p-3.5 sm:p-6 rounded-2xl border border-border/60 bg-card space-y-3 sm:space-y-4">
                    <div className="flex items-center gap-2.5">
                      <div className="size-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                        <ShieldCheck className="size-4" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-foreground">Privacidade do Perfil</h3>
                        <p className="text-xs text-muted-foreground">
                          Controle a visibilidade da sua conta nas buscas da comunidade.
                        </p>
                      </div>
                    </div>

                    <div className="p-3.5 rounded-xl bg-muted/20 border border-border/40 space-y-3 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-foreground">Visibilidade nas Buscas:</span>
                        <Badge
                          variant={isAnonymous ? "default" : "outline"}
                          className="text-[10px] font-semibold"
                        >
                          {isAnonymous ? "Perfil Discreto" : "Visível na Busca"}
                        </Badge>
                      </div>

                      <p className="text-[11px] text-muted-foreground leading-relaxed">
                        Ao ativar o modo discreto, seu perfil pessoal não aparece nas buscas públicas da comunidade.
                        Suas divulgações e links continuam funcionando normalmente através de <strong className="text-foreground">@{referralHandle}</strong>.
                      </p>

                      <Button
                        type="button"
                        variant={isAnonymous ? "outline" : "default"}
                        disabled={isUpdatingPrivacy}
                        onClick={() => handleTogglePrivacy(!isAnonymous, isAnonymous ? "public" : "unlisted")}
                        className="w-full h-10 sm:h-11 rounded-xl text-xs font-semibold gap-2"
                      >
                        {isAnonymous ? <Eye className="size-4" /> : <EyeOff className="size-4" />}
                        <span>
                          {isAnonymous
                            ? "Tornar Visível na Busca"
                            : "Manter Perfil Discreto (Ocultar da Busca)"}
                        </span>
                      </Button>
                    </div>
                  </div>
                </div>
              </TabsContent>
            </Tabs>

            {/* Modal de Conexão Rápida de Lojas Parceiras */}
            <Dialog open={isStorePickerOpen} onOpenChange={setIsStorePickerOpen}>
              <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                  <DialogTitle className="text-base font-bold">Conectar Lojas Parceiras à sua Vitrine</DialogTitle>
                </DialogHeader>

                <div className="space-y-4 pt-2">
                  <p className="text-xs text-muted-foreground">
                    Selecione as lojas que deseja exibir aos seus seguidores na sua vitrine pública. Os cupons
                    de 10% com o seu nome serão ativados automaticamente.
                  </p>

                  <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                    {partnerStores.map((s: any) => {
                      const isConnected = connectedStoreIds.includes(s.id);
                      return (
                        <div
                          key={s.id}
                          className="p-3 rounded-xl border border-border/60 bg-card flex items-center justify-between gap-3"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="size-10 rounded-lg bg-muted/60 overflow-hidden shrink-0 border border-border/40 flex items-center justify-center">
                              {s.logoUrl ? (
                                <img src={s.logoUrl} alt={s.name} className="size-full object-cover" />
                              ) : (
                                <Store className="size-5 text-muted-foreground" />
                              )}
                            </div>
                            <div className="min-w-0">
                              <h5 className="text-xs font-bold text-foreground truncate">{s.name}</h5>
                              <p className="text-[10px] text-muted-foreground truncate">
                                {s.segment} • {s.city}
                              </p>
                            </div>
                          </div>

                          <Button
                            type="button"
                            size="sm"
                            variant={isConnected ? "secondary" : "default"}
                            onClick={() => handleToggleStoreConnection(s.id)}
                            className="h-9 px-3 rounded-xl text-xs font-semibold gap-1 shrink-0"
                          >
                            {isConnected ? (
                              <>
                                <Check className="size-3 text-emerald-600" />
                                <span>Conectada</span>
                              </>
                            ) : (
                              <>
                                <Plus className="size-3" />
                                <span>Conectar</span>
                              </>
                            )}
                          </Button>
                        </div>
                      );
                    })}
                  </div>

                  <Button
                    type="button"
                    onClick={() => setIsStorePickerOpen(false)}
                    className="w-full h-11 rounded-xl text-xs font-semibold"
                  >
                    Concluir Seleção
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        ) : (
          /* ─── ONBOARDING EM 4 PASSOS ESTILO CRIAÇÃO DE EMPRESA ───── */
          <div className="w-full max-w-xl mx-auto p-3.5 sm:p-8 rounded-2xl sm:rounded-3xl border border-border/60 bg-card shadow-xs space-y-6">
            {/* Stepper no Topo */}
            <div className="flex items-center justify-between border-b border-border/40 pb-4">
              {[
                { num: 1, label: "Identidade" },
                { num: 2, label: "Privacidade" },
                { num: 3, label: "Monetização" },
                { num: 4, label: "Conclusão" },
              ].map((step) => (
                <div key={step.num} className="flex items-center gap-1.5">
                  <div
                    className={`size-6 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                      onboardingStep === step.num
                        ? "bg-primary text-primary-foreground"
                        : onboardingStep > step.num
                        ? "bg-emerald-500 text-white"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {onboardingStep > step.num ? <Check className="size-3.5" /> : step.num}
                  </div>
                  <span
                    className={`text-[11px] font-medium hidden sm:inline ${
                      onboardingStep === step.num ? "text-foreground font-bold" : "text-muted-foreground"
                    }`}
                  >
                    {step.label}
                  </span>
                </div>
              ))}
            </div>

            {/* Passo 1: Identidade da Marca */}
            {onboardingStep === 1 && (
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/40 pb-3">
                  <div className="space-y-0.5">
                    <h2 className="text-base font-bold text-foreground">Defina sua Identidade de Criador</h2>
                    <p className="text-xs text-muted-foreground">
                      Escolha o identificador exclusivo (@handle) que representará sua marca ou nome artístico.
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={async () => {
                      const res = await refetch();
                      if (res.data?.partner) {
                        toast.success("Perfil sincronizado com sucesso!");
                      } else {
                        toast.info("Nenhum cadastro prévio detectado. Complete as etapas abaixo.");
                      }
                    }}
                    className="h-8 px-3 rounded-xl text-xs gap-1.5 shrink-0 self-start sm:self-auto font-medium"
                  >
                    <Sparkles className="size-3.5 text-primary" />
                    <span>Sincronizar meu perfil</span>
                  </Button>
                </div>

                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">Identificador Único (@handle)</Label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-mono text-muted-foreground">
                        @
                      </span>
                      <Input
                        value={onboardingHandle}
                        onChange={(e) =>
                          setOnboardingHandle(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ""))
                        }
                        placeholder="seu_nome_ou_marca"
                        className="h-11 pl-8 rounded-xl text-xs font-mono"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">Nome Artístico / Apresentação Pública</Label>
                    <Input
                      value={onboardingName}
                      onChange={(e) => setOnboardingName(e.target.value)}
                      placeholder="Como seus seguidores conhecem você"
                      className="h-11 rounded-xl text-xs"
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">Nicho de Atuação (Selecione no catálogo)</Label>
                    <CreatorNicheSelect
                      value={onboardingCategory}
                      onValueChange={(val) => setOnboardingCategory(val)}
                    />
                  </div>
                </div>

                <Button
                  type="button"
                  onClick={() => {
                    if (!onboardingHandle.trim() || onboardingHandle.length < 3) {
                      toast.error("O identificador deve ter no mínimo 3 caracteres.");
                      return;
                    }
                    setOnboardingStep(2);
                  }}
                  className="w-full h-11 rounded-xl text-xs font-semibold gap-1.5 mt-2"
                >
                  <span>Avançar para Privacidade</span>
                  <ArrowRight className="size-4" />
                </Button>
              </div>
            )}

            {/* Passo 2: Privacidade Pessoal Civil */}
            {onboardingStep === 2 && (
              <div className="space-y-4">
                <div className="space-y-1">
                  <h2 className="text-base font-bold text-foreground">Privacidade do Perfil Pessoal</h2>
                  <p className="text-xs text-muted-foreground">
                    Separe sua vida civil (compras, contratos) da sua atuação pública como criador ou marca.
                  </p>
                </div>

                <div className="p-4 rounded-2xl border border-border/60 bg-muted/20 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <span className="text-xs font-bold text-foreground">Manter Perfil Civil Discreto</span>
                      <p className="text-[11px] text-muted-foreground">
                        Seu nome de certidão e histórico de compras não aparecem nas buscas públicas.
                      </p>
                    </div>

                    <Button
                      type="button"
                      size="sm"
                      variant={onboardingAnonymize ? "default" : "outline"}
                      onClick={() => setOnboardingAnonymize(!onboardingAnonymize)}
                      className="h-9 px-3 rounded-xl text-xs font-semibold"
                    >
                      {onboardingAnonymize ? "Discreto" : "Público"}
                    </Button>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setOnboardingStep(1)}
                    className="flex-1 h-11 rounded-xl text-xs font-semibold"
                  >
                    Voltar
                  </Button>
                  <Button
                    type="button"
                    onClick={() => setOnboardingStep(3)}
                    className="flex-1 h-11 rounded-xl text-xs font-semibold gap-1.5"
                  >
                    <span>Ver Modelo de Ganhos</span>
                    <ArrowRight className="size-4" />
                  </Button>
                </div>
              </div>
            )}

            {/* Passo 3: Modelo de Monetização */}
            {onboardingStep === 3 && (
              <div className="space-y-4">
                <div className="space-y-1">
                  <h2 className="text-base font-bold text-foreground">Seu Modelo de Monetização</h2>
                  <p className="text-xs text-muted-foreground">
                    Como você é remunerado na Rede Waesy de forma transparente:
                  </p>
                </div>

                <div className="space-y-2.5">
                  <div className="p-3.5 rounded-xl border border-border/60 bg-card flex items-start gap-3">
                    <div className="size-8 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
                      <Percent className="size-4" />
                    </div>
                    <div className="space-y-0.5">
                      <h4 className="text-xs font-bold text-foreground">Vendas Comissionadas das Lojas</h4>
                      <p className="text-[11px] text-muted-foreground">
                        Lojas cadastradas pagam comissões em dinheiro por cada pedido convertido via seu link.
                      </p>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl border border-border/60 bg-card flex items-start gap-3">
                    <div className="size-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                      <ShoppingBag className="size-4" />
                    </div>
                    <div className="space-y-0.5">
                      <h4 className="text-xs font-bold text-foreground">Vitrine Digital Pessoal</h4>
                      <p className="text-[11px] text-muted-foreground">
                        Cure produtos, banners e cupons favoritos em uma página pública que leva sua marca.
                      </p>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl border border-border/60 bg-card flex items-start gap-3">
                    <div className="size-8 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0">
                      <Coins className="size-4" />
                    </div>
                    <div className="space-y-0.5">
                      <h4 className="text-xs font-bold text-foreground">Bônus por Indicação</h4>
                      <p className="text-[11px] text-muted-foreground">
                        Receba 50.000 tokens por membro e 500.000 tokens por empresa cadastrada pelo seu link.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setOnboardingStep(2)}
                    className="flex-1 h-11 rounded-xl text-xs font-semibold"
                  >
                    Voltar
                  </Button>
                  <Button
                    type="button"
                    onClick={() => setOnboardingStep(4)}
                    className="flex-1 h-11 rounded-xl text-xs font-semibold gap-1.5"
                  >
                    <span>Revisar & Ativar</span>
                    <ArrowRight className="size-4" />
                  </Button>
                </div>
              </div>
            )}

            {/* Passo 4: Conclusão */}
            {onboardingStep === 4 && (
              <div className="space-y-4">
                <div className="space-y-1 text-center">
                  <div className="size-12 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center mx-auto mb-2">
                    <CheckCircle2 className="size-6" />
                  </div>
                  <h2 className="text-base font-bold text-foreground">Tudo Pronto para a Ativação!</h2>
                  <p className="text-xs text-muted-foreground">
                    Revise seus dados antes de iniciar suas atividades na plataforma:
                  </p>
                </div>

                <div className="p-4 rounded-2xl border border-border/60 bg-muted/20 space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Identificador:</span>
                    <span className="font-mono font-bold text-foreground">@{onboardingHandle}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Nome da Marca:</span>
                    <span className="font-bold text-foreground">{onboardingName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Nicho:</span>
                    <span className="font-bold text-foreground">{onboardingCategory}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Privacidade Pessoal:</span>
                    <span className="font-bold text-emerald-600">
                      {onboardingAnonymize ? "Ativa (Perfil civil discreto)" : "Padrão"}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setOnboardingStep(3)}
                    className="flex-1 h-11 rounded-xl text-xs font-semibold"
                  >
                    Voltar
                  </Button>
                  <Button
                    type="button"
                    disabled={isSubmitting}
                    onClick={handleOnboardingSubmit}
                    className="flex-1 h-11 rounded-xl text-xs font-semibold gap-1.5"
                  >
                    {isSubmitting ? "Ativando Perfil..." : "Confirmar & Ativar Perfil"}
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
