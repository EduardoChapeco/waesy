import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Copy, ShieldCheck, CheckCircle2, ExternalLink, Coins, ShoppingBag, Store, Layers, ArrowRight, TrendingUp, Star, Ticket, Check, Globe, Percent, ArrowUp, ArrowDown, Calendar, Plus, Trash2, Send, Image as ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ImageUpload } from "@/components/ui/image-upload";
import { NativeMobileHeader } from "@/components/navigation/native-mobile-header";
import { formatDate } from "@/lib/datetime";
import { formatMoney } from "@/lib/money";
import { getMyAffiliateTokensOverview, registerAffiliate, getAffiliateShowcaseProducts, getAvailablePartnerStores, getCreatorAnalytics, saveCreatorShowcaseSettings, togglePartnerStoreConnection, getCreatorEvents } from "@/services/affiliates.functions";
import {
  listAffiliateCommissionsForPartner,
  listExternalAffiliateCampaigns,
  addExternalCampaignToCreatorShowcase,
} from "@/services/affiliate-ledger.functions";
import { getProfile } from "@/services/auth.functions";

export const Route = createFileRoute("/_store/afiliados")({
  head: () => ({
    meta: [
      { title: "Central de Afiliados | Waesy" },
      {
        name: "description",
        content:
          "Gerencie links comissionados, extrato em garantia, campanhas parceiras, cupons de lojas locais e vitrine comercial.",
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

  const { data: ledgerData, isLoading: isLedgerLoading } = useQuery({
    queryKey: ["affiliate-commissions-ledger"],
    queryFn: () => listAffiliateCommissionsForPartner(),
    enabled: Boolean(partner?.id),
    staleTime: 15_000,
  });

  const { data: externalCampaigns = [] } = useQuery({
    queryKey: ["external-affiliate-campaigns"],
    queryFn: () => listExternalAffiliateCampaigns(),
    staleTime: 60_000,
  });

  const handleAddPhiaCampaign = async (campaignId: string, campaignName: string) => {
    try {
      await addExternalCampaignToCreatorShowcase({
        data: { campaignId },
      });
      toast.success(`${campaignName} adicionado à sua vitrine!`);
      await queryClient.invalidateQueries({ queryKey: ["affiliate-showcase-products"] });
    } catch (err: any) {
      toast.error(err.message || "Falha ao adicionar campanha à vitrine.");
    }
  };

  const [activeTab, setActiveTab] = useState<string>("dashboard");
  const [copiedLink, setCopiedLink] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSavingShowcase, setIsSavingShowcase] = useState(false);
  const [showInlineStorePicker, setShowInlineStorePicker] = useState(false);

  // Auto-preenche handle a partir do username do perfil
  const defaultHandle =
    loaderProfile?.username ||
    loaderProfile?.email?.split("@")[0]?.toLowerCase().replace(/[^a-z0-9_-]/g, "") ||
    "";

  const [onboardingHandle, setOnboardingHandle] = useState(defaultHandle);

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

  useEffect(() => {
    if (creator) {
      if (creator.banner_url !== undefined) setBannerUrl(creator.banner_url || "");
      if (creator.banner_title !== undefined) setBannerTitle(creator.banner_title || "");
      if (creator.banner_link !== undefined) setBannerLink(creator.banner_link || "");
      if (creator.showcase_order) setShowcaseOrder(creator.showcase_order);
      if (creator.partner_store_ids) setConnectedStoreIds(creator.partner_store_ids);
    }
  }, [creator]);

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
      toast.success("Vitrine comercial atualizada com sucesso!");
      await queryClient.invalidateQueries({ queryKey: ["my-affiliate-overview"] });
      router.invalidate();
    } catch (err: any) {
      toast.error(err?.message || "Erro ao salvar vitrine.");
    } finally {
      setIsSavingShowcase(false);
    }
  };

  const handleFastAffiliateActivation = async () => {
    const cleanHandle = (onboardingHandle || defaultHandle).trim().toLowerCase().replace(/[^a-z0-9_-]/g, "");
    if (!cleanHandle || cleanHandle.length < 3) {
      toast.error("O código de indicação deve ter no mínimo 3 caracteres.");
      return;
    }

    setIsSubmitting(true);
    try {
      await registerAffiliate({
        data: {
          handle: cleanHandle,
          displayName: loaderProfile?.full_name || cleanHandle,
          category: "geral",
          socialChannel: "other",
        },
      });

      toast.success("Conta de Afiliado ativada! Seus links e comissões já estão prontos.");
      await queryClient.invalidateQueries({ queryKey: ["my-affiliate-overview"] });
      router.invalidate();
    } catch (err: any) {
      toast.error(err?.message || "Erro ao ativar conta de afiliado.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const sectionLabels: Record<string, { label: string; desc: string; icon: any }> = {
    banner: {
      label: "Banner de Destaque (16:9)",
      desc: "Imagem promocional no topo da vitrine com chamada e link",
      icon: ImageIcon,
    },
    stores: {
      label: "Lojas Parceiras Conectadas",
      desc: `${connectedStoreIds.length} loja(s) com cupons exclusivos na vitrine`,
      icon: Store,
    },
    products: {
      label: "Produtos Recomendados",
      desc: `${showcaseProducts.length} produto(s) comissionados no catálogo`,
      icon: ShoppingBag,
    },
    events: {
      label: "Eventos e Ativações",
      desc: `${creatorEvents.length} evento(s) vinculados ao seu código`,
      icon: Calendar,
    },
  };

  const connectedStoresList = partnerStores.filter((s: any) => connectedStoreIds.includes(s.id));

  return (
    <div className="min-h-dvh bg-background text-foreground pb-32">
      {/* ─── V117 Universal Header Mobile ─── */}
      <NativeMobileHeader
        title="Central de Afiliados"
        centerTitle
        backTo="/conta"
        rightAction={
          partner ? (
            <Button asChild variant="outline" size="sm" className="h-11 min-h-11 px-3 rounded-lg text-xs gap-1 focus-visible:ring-2 focus-visible:ring-primary">
              <Link to="/u/$username" params={{ username: referralHandle }}>
                <Globe className="size-4" />
                <span>Vitrine</span>
              </Link>
            </Button>
          ) : undefined
        }
      />

      {/* ─── Top Bar Desktop Apple HIG (Direta, Comercial e Sem Viés de Perfil) ─── */}
      <div className="hidden md:block border-b border-border/40 bg-card/70 backdrop-blur-md px-6 py-4 sticky top-0 z-20">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <h1 className="text-base font-bold tracking-tight text-foreground">
              Central de Afiliados
            </h1>
            {partner && (
              <Badge variant="outline" className="text-xs font-mono bg-primary/5 text-primary border-primary/20 shrink-0">
                @{referralHandle}
              </Badge>
            )}
          </div>

          {partner && (
            <div className="flex items-center gap-2 shrink-0">
              <Button asChild variant="outline" size="sm" className="h-11 min-h-11 px-3 rounded-lg text-xs gap-2 focus-visible:ring-2 focus-visible:ring-primary">
                <Link to="/workspace/afiliados/conciliacao">
                  <Coins className="size-4" />
                  <span>Conciliação de Faturas</span>
                </Link>
              </Button>

              <Button asChild variant="outline" size="sm" className="h-11 min-h-11 px-3 rounded-lg text-xs gap-2 focus-visible:ring-2 focus-visible:ring-primary">
                <Link to="/u/$username" params={{ username: referralHandle }}>
                  <Globe className="size-4" />
                  <span>Abrir Vitrine Pública</span>
                </Link>
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Container Principal com Respiro Anti-Claustrofobia */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
        {isLoading && !partner ? (
          <div className="max-w-md mx-auto py-20 text-center space-y-4">
            <div className="size-12 rounded-lg bg-primary/10 text-primary flex items-center justify-center mx-auto animate-pulse motion-reduce:animate-none">
              <Star className="size-6" />
            </div>
            <p className="text-sm font-semibold text-foreground">Carregando central de afiliados...</p>
          </div>
        ) : partner ? (
          /* ─── PAINEL DE MONETIZAÇÃO, LINKS & VITRINE DO AFILIADO ────────────── */
          <div className="space-y-4 sm:space-y-6">
            {/* Navegação Horizontal Contínua em Linha Única (B.39) */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4 sm:space-y-6">
              <TabsList
                className="h-11 p-1 bg-muted/40 rounded-lg border border-border/40 flex flex-nowrap items-center gap-1 overflow-x-auto no-scrollbar tab-list w-full"
              >
                <TabsTrigger value="dashboard" className="h-11 min-h-11 px-3 text-xs rounded-lg gap-2 font-medium shrink-0">
                  <TrendingUp className="size-4" />
                  <span>Visão Geral</span>
                </TabsTrigger>
                <TabsTrigger value="ledger" className="h-11 min-h-11 px-3 text-xs rounded-lg gap-2 font-medium shrink-0">
                  <Coins className="size-4" />
                  <span>Extrato & Comissões</span>
                </TabsTrigger>
                <TabsTrigger value="phia" className="h-11 min-h-11 px-3 text-xs rounded-lg gap-2 font-medium shrink-0">
                  <Globe className="size-4" />
                  <span>Campanhas Globais</span>
                </TabsTrigger>
                <TabsTrigger value="showcase" className="h-11 min-h-11 px-3 text-xs rounded-lg gap-2 font-medium shrink-0">
                  <Layers className="size-4" />
                  <span>Curadoria da Vitrine</span>
                </TabsTrigger>
                <TabsTrigger value="stores" className="h-11 min-h-11 px-3 text-xs rounded-lg gap-2 font-medium shrink-0">
                  <Store className="size-4" />
                  <span>Lojas Parceiras</span>
                </TabsTrigger>
                <TabsTrigger value="referrals" className="h-11 min-h-11 px-3 text-xs rounded-lg gap-2 font-medium shrink-0">
                  <ShieldCheck className="size-4" />
                  <span>Indicações & Repasses</span>
                </TabsTrigger>
              </TabsList>

              {/* ─── TAB 1: VISÃO GERAL (MÉTRICAS & SEMÂNTICA COMERCIAL DIRETA) ── */}
              <TabsContent value="dashboard" className="space-y-3 sm:space-y-5 mt-0">
                {/* 4 Cards de Métricas Comerciais */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
                  <div className="p-4 sm:p-4 rounded-lg border border-border/60 bg-card space-y-1">
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Cliques no Link
                    </span>
                    <p className="text-xl sm:text-2xl font-bold text-foreground">
                      {(partner.total_clicks || 0).toLocaleString("pt-BR")}
                    </p>
                    <span className="text-xs text-muted-foreground">Acessos à sua vitrine</span>
                  </div>

                  <div className="p-4 sm:p-4 rounded-lg border border-border/60 bg-card space-y-1">
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Vendas Realizadas
                    </span>
                    <p className="text-xl sm:text-2xl font-bold text-foreground">
                      {partner.total_orders || 0}
                    </p>
                    <span className="text-xs text-emerald-600 font-medium">Pedidos convertidos</span>
                  </div>

                  <div className="p-4 sm:p-4 rounded-lg border border-border/60 bg-card space-y-1">
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Volume Gerado
                    </span>
                    <p className="text-xl sm:text-2xl font-bold text-foreground">
                      {formatMoney(partner.total_gmv_cents || 0)}
                    </p>
                    <span className="text-xs text-muted-foreground">Total faturado em lojas</span>
                  </div>

                  <div className="p-4 sm:p-4 rounded-lg border border-primary/30 bg-primary/5 space-y-1">
                    <span className="text-xs font-medium text-primary uppercase tracking-wider flex items-center gap-1">
                      <Coins className="size-3" /> Saldo de Ganhos
                    </span>
                    <p className="text-xl sm:text-2xl font-bold text-primary">
                      {(wallet?.balance || 0).toLocaleString("pt-BR")}
                    </p>
                    <span className="text-xs text-muted-foreground">
                      +{wallet?.balancePendingMaturity || 0} a liberar
                    </span>
                  </div>
                </div>

                {/* Link de Divulgação com Compartilhamento Direto */}
                <div className="p-4 sm:p-5 rounded-lg border border-border/60 bg-card space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                        <span>Seu Link de Divulgação</span>
                        <Badge variant="outline" className="text-xs bg-muted/40 font-mono">
                          Validade 30 dias
                        </Badge>
                      </h3>
                      <p className="text-xs text-muted-foreground mt-1">
                        Compartilhe seu link exclusivo e receba comissões automáticas em cada compra realizada.
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => handleCopy(generalAffiliateUrl, "Link de divulgação")}
                        className="h-11 min-h-11 px-4 rounded-lg text-xs font-semibold gap-2"
                      >
                        {copiedLink === generalAffiliateUrl ? (
                          <CheckCircle2 className="size-4 text-emerald-400" />
                        ) : (
                          <Copy className="size-4" />
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
                        className="h-11 min-h-11 px-4 rounded-lg text-xs font-semibold gap-2 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-500/10 border-emerald-500/30"
                      >
                        <Send className="size-4" />
                        <span>WhatsApp</span>
                      </Button>
                    </div>
                  </div>

                  <Input
                    readOnly
                    value={generalAffiliateUrl}
                    className="h-11 min-h-11 rounded-lg bg-muted/30 font-mono text-xs border-border/50 select-all"
                  />
                </div>

                {/* Desempenho de Vendas */}
                <div className="p-4 sm:p-5 rounded-lg border border-border/60 bg-card space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                        <span>Desempenho de Vendas</span>
                        <Badge
                          variant="outline"
                          className="text-xs font-semibold text-emerald-600 bg-emerald-500/10 border-emerald-500/20"
                        >
                          {analytics?.summary?.conversionRate || 0}% conversão
                        </Badge>
                      </h3>
                      <p className="text-xs text-muted-foreground mt-1">
                        Acompanhamento diário de acessos à sua vitrine e pedidos gerados.
                      </p>
                    </div>

                    <Button asChild variant="outline" size="sm" className="h-11 min-h-11 px-3 rounded-lg text-xs gap-2 self-start sm:self-auto">
                      <Link to="/u/$username" params={{ username: referralHandle }}>
                        <Globe className="size-4" />
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
                      <div className="space-y-2 max-h-48 overflow-y-auto">
                        {analytics.clicksHistory.slice(-7).map((item) => (
                          <div
                            key={item.date}
                            className="flex items-center justify-between p-3 rounded-lg bg-muted/20 border border-border/40 text-xs"
                          >
                            <span className="font-mono text-muted-foreground">{item.date}</span>
                            <div className="flex items-center gap-3">
                              <span className="text-foreground font-semibold">{item.clicks} acesso(s)</span>
                              {item.conversions > 0 && (
                                <Badge variant="default" className="text-xs bg-emerald-600 text-primary-foreground">
                                  {item.conversions} venda(s)
                                </Badge>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 rounded-lg bg-muted/20 border border-border/40 text-center text-xs text-muted-foreground">
                      Compartilhe seu link de vitrine ou produtos comissionados para acompanhar métricas de acessos diários aqui.
                    </div>
                  )}
                </div>

                {/* Resumo Comercial de Formas de Ganho */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-3">
                  <div className="p-4 rounded-lg border border-border/60 bg-card space-y-2">
                    <div className="size-11 min-size-11 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                      <ShoppingBag className="size-4" />
                    </div>
                    <h4 className="text-xs font-bold text-foreground">Comissões por Venda</h4>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Receba comissão direta das lojas ao divulgar produtos, coleções e cardápios na sua vitrine.
                    </p>
                  </div>

                  <div className="p-4 rounded-lg border border-border/60 bg-card space-y-2">
                    <div className="size-11 min-size-11 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                      <Ticket className="size-4" />
                    </div>
                    <h4 className="text-xs font-bold text-foreground">Cupons de Desconto</h4>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Ofereça vantagens exclusivas nas lojas parceiras com cupons que levam sua assinatura.
                    </p>
                  </div>

                  <div className="p-4 rounded-lg border border-border/60 bg-card space-y-2">
                    <div className="size-11 min-size-11 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center">
                      <Coins className="size-4" />
                    </div>
                    <h4 className="text-xs font-bold text-foreground">Bônus por Indicação</h4>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Ganhe tokens e bônus por novos clientes e empresas indicadas, com resgate via Pix.
                    </p>
                  </div>
                </div>
              </TabsContent>

              {/* ─── TAB: EXTRATO MÉLIUZ (COMISSÕES RASTREADAS & ESCROW) ──────── */}
              <TabsContent value="ledger" className="space-y-4 sm:space-y-6 mt-0">
                {/* 4 Cards de Saldos do Escrow Méliuz */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-4 rounded-lg bg-card border border-border/60 space-y-1">
                    <span className="text-xs text-muted-foreground block">Em Rastreamento</span>
                    <p className="text-lg sm:text-xl font-bold text-foreground">
                      {formatMoney(ledgerData?.summary?.pendingTrackingCents || 0)}
                    </p>
                    <span className="text-xs text-muted-foreground block">Aguardando entrega</span>
                  </div>

                  <div className="p-4 rounded-lg bg-card border border-border/60 space-y-1">
                    <span className="text-xs text-muted-foreground block">Em Garantia</span>
                    <p className="text-lg sm:text-xl font-bold text-foreground">
                      {formatMoney(ledgerData?.summary?.awaitingEscrowCents || 0)}
                    </p>
                    <span className="text-xs text-muted-foreground block">Liberação em 15 dias</span>
                  </div>

                  <div className="p-4 rounded-lg bg-card border border-border/60 space-y-1">
                    <span className="text-xs text-muted-foreground block">Disponível para Saque</span>
                    <p className="text-lg sm:text-xl font-bold text-foreground">
                      {formatMoney(ledgerData?.summary?.availableCents || 0)}
                    </p>
                    <span className="text-xs text-muted-foreground block">Liberado via Pix</span>
                  </div>

                  <div className="p-4 rounded-lg bg-card border border-border/60 space-y-1">
                    <span className="text-xs text-muted-foreground block">Canceladas ou Estornos</span>
                    <p className="text-lg sm:text-xl font-bold text-destructive">
                      {formatMoney(ledgerData?.summary?.cancelledCents || 0)}
                    </p>
                    <span className="text-xs text-muted-foreground block">Estornos de pedidos</span>
                  </div>
                </div>

                {/* Lista de Vendas e Comissões */}
                <div className="p-4 sm:p-5 rounded-lg border border-border/60 bg-card space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/40 pb-3">
                    <div>
                      <h3 className="text-sm font-bold text-foreground">
                        Histórico de Comissões
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        Acompanhe o status em tempo real de cada venda gerada a partir dos seus links e vitrine.
                      </p>
                    </div>
                  </div>

                  {isLedgerLoading ? (
                    <div className="py-12 text-center text-xs text-muted-foreground">
                      Carregando extrato de comissões...
                    </div>
                  ) : !ledgerData?.items || ledgerData.items.length === 0 ? (
                    <div className="py-12 text-center rounded-lg border border-dashed border-border/60 space-y-2">
                      <Coins className="size-8 text-muted-foreground mx-auto" />
                      <p className="text-sm font-semibold text-foreground">
                        Nenhuma venda rastreada ainda
                      </p>
                      <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                        Compartilhe o link da sua vitrine ou produtos parceiros para começar a acumular comissões.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {ledgerData.items.map((item: any) => (
                        <div
                          key={item.id}
                          className="p-4 rounded-lg border border-border/40 bg-muted/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-foreground">
                                {item.stores?.name || "Loja Parceira"}
                              </span>
                              <Badge variant="secondary" className="text-xs">
                                {item.status === "tracked_pending" && "Rastreada / Em Análise"}
                                {item.status === "awaiting_escrow" && "Garantia / Escrow"}
                                {item.status === "available" && "Disponível para Saque"}
                                {item.status === "paid_out" && "Liquidada"}
                                {item.status === "cancelled_refunded" && "Cancelada / Estornada"}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-3 text-muted-foreground flex-wrap">
                              <span>Pedido: {formatMoney(item.order_gross_cents || 0)}</span>
                              <span>Taxa: {item.commission_rate_pct}%</span>
                              <span>Data: {formatDate(item.created_at)}</span>
                              {item.matures_at && item.status === "awaiting_escrow" && (
                                <span className="text-foreground">
                                  Liberação: {formatDate(item.matures_at)}
                                </span>
                              )}
                              {item.cancellation_reason && (
                                <span className="text-destructive">
                                  Motivo: {item.cancellation_reason}
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="text-right sm:self-center shrink-0">
                            <span className="text-xs text-muted-foreground block">Sua Comissão</span>
                            <span className="text-base font-bold text-foreground">
                              {formatMoney(item.affiliate_share_cents || 0)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </TabsContent>

              {/* ─── TAB: CATÁLOGO PHIA (CAMPANHAS GLOBAIS E 1-CLICK) ───────── */}
              <TabsContent value="phia" className="space-y-4 sm:space-y-6 mt-0">
                <div className="p-4 sm:p-5 rounded-lg border border-border/60 bg-card space-y-4">
                  <div>
                    <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                      <span>Campanhas Recomendadas</span>
                      <Badge variant="secondary" className="text-xs">
                        Parcerias
                      </Badge>
                    </h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      Indique marcas parceiras e receba comissão direta por cada venda ou reserva confirmada.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                    {externalCampaigns.map((camp: any) => (
                      <div
                        key={camp.id}
                        className="p-4 rounded-lg border border-border/60 bg-muted/20 flex flex-col justify-between space-y-3"
                      >
                        <div className="space-y-2">
                          <div className="flex items-center justify-between gap-2">
                            <Badge variant="secondary" className="text-xs font-semibold">
                              {camp.badge_label}
                            </Badge>
                            <span className="text-xs text-muted-foreground font-mono">
                              {camp.default_commission_pct}%
                            </span>
                          </div>
                          <h4 className="text-sm font-bold text-foreground">
                            {camp.partner_name}
                          </h4>
                          <p className="text-xs text-muted-foreground leading-relaxed">
                            {camp.description}
                          </p>
                        </div>

                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => handleAddPhiaCampaign(camp.id, camp.partner_name)}
                          className="h-11 min-h-11 w-full rounded-lg text-xs font-semibold gap-2 mt-2 focus-visible:ring-2 focus-visible:ring-primary"
                        >
                          <Plus className="size-4" />
                          <span>Adicionar à Minha Vitrine</span>
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              </TabsContent>

              {/* ─── TAB 2: MINHA VITRINE (CMS VISUAL ESTILO WIX MOBILE APP) ─ */}
              <TabsContent value="showcase" className="space-y-6 mt-0">
                {/* Header de Gestão da Vitrine */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-muted/20 p-5 rounded-lg border border-border/60">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-foreground">
                        Editor Visual da Vitrine Pública
                      </h3>
                      <Badge variant="outline" className="text-xs font-mono">
                        @{referralHandle}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Personalize o banner, reordene as seções (sobe/desce) e conecte suas lojas locais favoritas.
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button asChild variant="outline" size="sm" className="h-11 min-h-11 px-4 rounded-lg text-xs gap-2">
                      <Link to="/u/$username" params={{ username: referralHandle }} target="_blank">
                        <Globe className="size-4" />
                        <span>Pré-visualizar Vitrine</span>
                      </Link>
                    </Button>

                    <Button
                      type="button"
                      size="sm"
                      disabled={isSavingShowcase}
                      onClick={handleSaveShowcase}
                      className="h-11 min-h-11 px-4 rounded-lg text-xs font-semibold gap-2"
                    >
                      {isSavingShowcase ? (
                        <span>Salvando...</span>
                      ) : (
                        <>
                          <Check className="size-4" />
                          <span>Salvar Vitrine</span>
                        </>
                      )}
                    </Button>
                  </div>
                </div>

                {/* 1. Controle de Camadas da Vitrine (Wix Style Reordering) */}
                <div className="p-4 sm:p-6 rounded-lg border border-border/60 bg-card space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
                        <Layers className="size-4 text-primary" />
                        <span>Ordem das Camadas na Vitrine Pública</span>
                      </h4>
                      <p className="text-xs text-muted-foreground">
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
                          className="flex items-center justify-between p-4 rounded-lg bg-muted/20 border border-border/40"
                        >
                          <div className="flex items-center gap-3">
                            <span className="size-6 rounded-full bg-muted flex items-center justify-center text-xs font-mono font-bold text-muted-foreground">
                              {idx + 1}
                            </span>
                            <div className="size-11 min-size-11 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                              <IconComponent className="size-4" />
                            </div>
                            <div>
                              <p className="text-xs font-bold text-foreground">{item.label}</p>
                              <p className="text-xs text-muted-foreground">{item.desc}</p>
                            </div>
                          </div>

                          <div className="flex items-center gap-1">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              disabled={idx === 0}
                              onClick={() => moveSection(idx, "up")}
                              className="size-11 min-h-11 min-w-11 p-0 rounded-lg text-muted-foreground hover:text-foreground"
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
                              className="size-11 min-h-11 min-w-11 p-0 rounded-lg text-muted-foreground hover:text-foreground"
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
                <div className="p-4 sm:p-6 rounded-lg border border-border/60 bg-card space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
                        <ImageIcon className="size-4 text-primary" />
                        <span>Banner de Destaque da Vitrine (16:9)</span>
                      </h4>
                      <p className="text-xs text-muted-foreground">
                        Apresente uma foto temática, cupom da semana ou parceria em destaque no topo da sua vitrine.
                      </p>
                    </div>
                  </div>

                  {/* Preview Visual em Tempo Real */}
                  <div className="aspect-video sm:aspect-video w-full rounded-lg bg-muted/40 border border-border/60 overflow-hidden relative flex flex-col justify-end p-4 sm:p-6">
                    {bannerUrl ? (
                      <img
                        src={bannerUrl}
                        alt="Banner Preview"
                        className="absolute inset-0 w-full h-full object-cover"
                      />
                    ) : (
                      <div className="absolute inset-0 bg-muted/40 flex items-center justify-center text-xs text-muted-foreground p-4 text-center">
                        URL do banner (proporção 16:9)
                      </div>
                    )}
                    <div className="absolute inset-0 bg-background/80" />

                    <div className="relative z-10 space-y-1">
                      <Badge className="text-xs bg-primary text-primary-foreground border-none">
                        Destaque da Semana
                      </Badge>
                      <h3 className="text-base sm:text-xl font-extrabold text-primary-foreground break-words text-wrap leading-tight">
                        {bannerTitle || "Seu Título Promocional em Destaque Aqui"}
                      </h3>
                      {bannerLink && (
                        <span className="text-xs text-primary-foreground/80 font-mono flex items-center gap-1">
                          <ExternalLink className="size-3" />
                          {bannerLink}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Campos do Banner */}
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 pt-2 items-start">
                    <div className="sm:col-span-4 space-y-2">
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
                      <div className="space-y-2">
                        <Label className="text-xs font-medium">Título de Chamada no Banner</Label>
                        <Input
                          value={bannerTitle}
                          onChange={(e) => setBannerTitle(e.target.value)}
                          placeholder="Ex: Cupons e Indicações da Semana"
                          className="h-11 rounded-lg text-xs bg-background"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label className="text-xs font-medium">Link de Destino ao Clicar (Opcional)</Label>
                        <Input
                          value={bannerLink}
                          onChange={(e) => setBannerLink(e.target.value)}
                          placeholder="Ex: /c/loja-exemplo ou https://..."
                          className="h-11 rounded-lg text-xs bg-background font-mono"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* 3. Lojas Parceiras Conectadas à Vitrine (Seleção 100% In-Page sem Modal) */}
                <div className="p-4 sm:p-6 rounded-lg border border-border/60 bg-card space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <h4 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
                        <Store className="size-4 text-primary" />
                        <span>Lojas Parceiras Conectadas ({connectedStoreIds.length})</span>
                      </h4>
                      <p className="text-xs text-muted-foreground">
                        Lojas exibidas com seus cupons de 10% de desconto na sua vitrine pública.
                      </p>
                    </div>

                    <Button
                      type="button"
                      variant={showInlineStorePicker ? "secondary" : "outline"}
                      size="sm"
                      onClick={() => setShowInlineStorePicker((prev) => !prev)}
                      className="h-11 min-h-11 px-4 rounded-lg text-xs font-semibold gap-2 self-start sm:self-auto"
                    >
                      <Plus className="size-4" />
                      <span>{showInlineStorePicker ? "Fechar Catálogo de Lojas" : "Conectar Lojas na Página"}</span>
                    </Button>
                  </div>

                  {/* Seletor In-Page de Lojas Parceiras (Sem Modal) */}
                  {showInlineStorePicker && (
                    <div className="p-4 rounded-lg border border-primary/30 bg-primary/5 space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-bold text-foreground">
                          Selecione as lojas para conectar ou desconectar da vitrine
                        </span>
                        <Badge variant="outline" className="text-xs font-mono">
                          {partnerStores.length} disponíveis
                        </Badge>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-96 overflow-y-auto pr-1">
                        {partnerStores.map((s: any) => {
                          const isConnected = connectedStoreIds.includes(s.id);
                          return (
                            <div
                              key={s.id}
                              className="p-3 rounded-lg border border-border/60 bg-card flex items-center justify-between gap-3"
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <div className="size-11 rounded-lg bg-muted/60 overflow-hidden shrink-0 border border-border/40 flex items-center justify-center">
                                  {s.logoUrl ? (
                                    <img src={s.logoUrl} alt={s.name} className="size-full object-cover" />
                                  ) : (
                                    <Store className="size-5 text-muted-foreground" />
                                  )}
                                </div>
                                <div className="min-w-0">
                                  <h5 className="text-xs font-bold text-foreground break-words text-wrap leading-tight">{s.name}</h5>
                                  <p className="text-xs text-muted-foreground break-words text-wrap">
                                    {s.segment} • {s.city}
                                  </p>
                                </div>
                              </div>

                              <Button
                                type="button"
                                size="sm"
                                variant={isConnected ? "secondary" : "default"}
                                onClick={() => handleToggleStoreConnection(s.id)}
                                className="h-11 min-h-11 px-4 rounded-lg text-xs font-semibold gap-1 shrink-0"
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
                    </div>
                  )}

                  {connectedStoresList.length === 0 ? (
                    <div className="p-6 text-center rounded-lg bg-muted/20 border border-border/40 space-y-2">
                      <Store className="size-6 text-muted-foreground mx-auto" />
                      <p className="text-xs font-semibold text-foreground">Nenhuma loja conectada ainda</p>
                      <p className="text-xs text-muted-foreground">
                        Conecte lojas parceiras para exibir cupons exclusivos na sua vitrine.
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {connectedStoresList.map((s: any) => (
                        <div
                          key={s.id}
                          className="p-4 rounded-lg border border-border/60 bg-muted/10 flex items-center justify-between gap-3"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="size-11 rounded-lg bg-muted/60 overflow-hidden shrink-0 border border-border/40 flex items-center justify-center">
                              {s.logoUrl ? (
                                <img src={s.logoUrl} alt={s.name} className="size-full object-cover" />
                              ) : (
                                <Store className="size-5 text-muted-foreground" />
                              )}
                            </div>
                            <div className="min-w-0">
                              <h5 className="text-xs font-bold text-foreground break-words text-wrap leading-tight">{s.name}</h5>
                              <p className="text-xs text-muted-foreground break-words text-wrap mt-1">
                                Cupom: <span className="font-mono font-bold text-primary">{s.couponCode}</span> (10% OFF)
                              </p>
                            </div>
                          </div>

                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleToggleStoreConnection(s.id)}
                            className="size-11 min-h-11 min-w-11 p-0 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 shrink-0"
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
                <div className="p-4 sm:p-6 rounded-lg border border-border/60 bg-card space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
                        <ShoppingBag className="size-4 text-primary" />
                        <span>Produtos Comissionados do Catálogo ({showcaseProducts.length})</span>
                      </h4>
                      <p className="text-xs text-muted-foreground">
                        Compartilhe itens com links exclusivos para receber comissões automáticas das lojas.
                      </p>
                    </div>
                  </div>

                  {showcaseProducts.length === 0 ? (
                    <div className="p-6 text-center rounded-lg bg-muted/20 border border-border/40 space-y-2">
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
                            className="p-4 rounded-lg border border-border/60 bg-muted/10 flex flex-col justify-between gap-3"
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
                                <Badge className="absolute top-2 right-2 text-xs bg-background/90 text-foreground backdrop-blur-md">
                                  ~{formatMoney(p.estimatedCommissionCents)} comissão
                                </Badge>
                              </div>

                              <div>
                                <span className="text-xs text-muted-foreground uppercase font-medium">
                                  {p.storeName}
                                </span>
                                <h5 className="text-xs font-bold text-foreground break-words text-wrap leading-tight">{p.name}</h5>
                                <p className="text-xs font-extrabold text-primary mt-1">{formatMoney(p.priceCents)}</p>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 pt-1 border-t border-border/40">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => handleCopy(productAffiliateUrl, "Link do produto")}
                                className="flex-1 h-11 min-h-11 rounded-lg text-xs font-semibold gap-1"
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

                {/* 5. Próximos Eventos & Ativações */}
                <div className="p-4 sm:p-6 rounded-lg border border-border/60 bg-card space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <h4 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
                        <Calendar className="size-4 text-primary" />
                        <span>Eventos & Ativações ({creatorEvents.length})</span>
                      </h4>
                      <p className="text-xs text-muted-foreground">
                        Eventos e workshops vinculados ao seu código de parceiro.
                      </p>
                    </div>

                    <Button asChild variant="outline" size="sm" className="h-11 min-h-11 px-4 rounded-lg text-xs gap-2 self-start sm:self-auto">
                      <Link to="/eventos">
                        <Plus className="size-4" />
                        <span>Cadastrar Evento</span>
                      </Link>
                    </Button>
                  </div>

                  {creatorEvents.length === 0 ? (
                    <div className="p-6 text-center rounded-lg bg-muted/20 border border-border/40 space-y-2">
                      <Calendar className="size-6 text-muted-foreground mx-auto" />
                      <p className="text-xs font-semibold text-foreground">Nenhum evento agendado</p>
                      <p className="text-xs text-muted-foreground">
                        Cadastre eventos com o identificador @{referralHandle} para exibi-los na sua vitrine.
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {creatorEvents.map((evt: any) => (
                        <div
                          key={evt.id}
                          className="p-4 rounded-lg border border-border/60 bg-muted/10 flex items-start gap-3"
                        >
                          <div className="size-12 rounded-lg bg-muted/60 overflow-hidden shrink-0 border border-border/40">
                            {evt.cover_image ? (
                              <img src={evt.cover_image} alt={evt.title} className="size-full object-cover" />
                            ) : (
                              <div className="size-full flex items-center justify-center text-muted-foreground">
                                <Calendar className="size-5" />
                              </div>
                            )}
                          </div>

                          <div className="space-y-1 min-w-0">
                            <h5 className="text-xs font-bold text-foreground break-words text-wrap leading-tight">{evt.title}</h5>
                            <p className="text-xs text-muted-foreground">
                              {evt.event_date ? formatDate(evt.event_date) : "Data a definir"} • {evt.location || evt.city || "Chapecó"}
                            </p>
                            <Badge variant="secondary" className="text-xs">
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
                <div className="bg-muted/20 p-4 sm:p-5 rounded-lg border border-border/60">
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
                        className="p-4 sm:p-5 rounded-lg border border-border/60 bg-card flex flex-col justify-between gap-4"
                      >
                        <div className="flex items-start gap-3">
                          <div className="size-12 rounded-lg bg-muted/60 overflow-hidden shrink-0 border border-border/40 flex items-center justify-center">
                            {s.logoUrl ? (
                              <img src={s.logoUrl} alt={s.name} className="w-full h-full object-cover" />
                            ) : (
                              <Store className="size-5 text-muted-foreground" />
                            )}
                          </div>

                          <div className="space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="text-sm font-bold text-foreground break-words text-wrap leading-tight">{s.name}</h4>
                              <Badge variant="secondary" className="text-xs">
                                {s.segment}
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {s.city} • {s.state}
                            </p>
                          </div>
                        </div>

                        <div className="p-3 rounded-lg bg-primary/5 border border-primary/20 flex items-center justify-between">
                          <div>
                            <span className="text-xs text-muted-foreground uppercase font-medium">
                              Cupom Exclusivo
                            </span>
                            <p className="text-xs font-mono font-bold text-primary">{couponCode}</p>
                          </div>
                          <Badge className="bg-primary text-primary-foreground text-xs font-bold">
                            10% OFF
                          </Badge>
                        </div>

                        <div className="flex items-center gap-2 pt-1">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => handleCopy(couponCode, "Cupom")}
                            className="flex-1 h-11 min-h-11 rounded-lg text-xs font-semibold gap-2"
                          >
                            <Copy className="size-4" />
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
                            className="h-11 min-h-11 px-4 rounded-lg text-xs font-semibold text-emerald-600 hover:text-emerald-700 hover:bg-emerald-500/10 border-emerald-500/30"
                            title="Enviar no WhatsApp"
                          >
                            <Send className="size-4" />
                          </Button>

                          <Button
                            type="button"
                            size="sm"
                            variant={isConnected ? "secondary" : "default"}
                            onClick={() => handleToggleStoreConnection(s.id)}
                            className="h-11 min-h-11 px-4 rounded-lg text-xs font-semibold gap-2"
                          >
                            {isConnected ? (
                              <>
                                <Check className="size-4 text-emerald-600" />
                                <span>Conectada</span>
                              </>
                            ) : (
                              <>
                                <Plus className="size-4" />
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

              {/* ─── TAB 4: INDICAÇÕES, TOKENS & LIQUIDAÇÃO DE REPASSES ────────────────────── */}
              <TabsContent value="referrals" className="space-y-4 sm:space-y-6 mt-0">
                {/* Regras de Liquidação Pix & Conciliação B2B */}
                <div className="p-4 sm:p-6 rounded-lg border border-primary/30 bg-primary/5 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="size-11 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                        <ShieldCheck className="size-5" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-foreground">
                          Liquidação de Comissões e Repasses Pix
                        </h3>
                        <p className="text-xs text-muted-foreground">
                          Ciclo de garantia contra cancelamentos (D+30) e conciliação de faturas com lojas parceiras.
                        </p>
                      </div>
                    </div>
                    <Button asChild variant="outline" size="sm" className="h-11 min-h-11 px-4 rounded-lg text-xs font-semibold gap-2 shrink-0">
                      <Link to="/workspace/afiliados/conciliacao">
                        <Coins className="size-4" />
                        <span>Abrir Conciliação de Faturas</span>
                      </Link>
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                    <div className="p-3 rounded-lg bg-background border border-border/50 space-y-1">
                      <span className="font-bold text-foreground block">1. Pedido Rastreado</span>
                      <p className="text-muted-foreground leading-relaxed">
                        A comissão aparece imediatamente no extrato quando o cliente finaliza o pedido pelo seu link ou cupom.
                      </p>
                    </div>
                    <div className="p-3 rounded-lg bg-background border border-border/50 space-y-1">
                      <span className="font-bold text-foreground block">2. Garantia (Escrow)</span>
                      <p className="text-muted-foreground leading-relaxed">
                        Após a entrega confirmada, o saldo aguarda o prazo legal de devolução. Pedidos cancelados estornam a comissão automaticamente.
                      </p>
                    </div>
                    <div className="p-3 rounded-lg bg-background border border-border/50 space-y-1">
                      <span className="font-bold text-foreground block">3. Saque via Pix</span>
                      <p className="text-muted-foreground leading-relaxed">
                        Com a fatura liquidada, o valor fica livre para resgate via Pix ou uso como saldo na plataforma.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Regras Ativas de Tokens */}
                {rules.length > 0 && (
                  <div className="p-4 sm:p-5 rounded-lg border border-border/60 bg-card space-y-3">
                    <h3 className="text-sm font-bold text-foreground">Regras de Bônus por Indicação</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {rules.map((r: any) => (
                        <div key={r.id} className="p-3 rounded-lg border border-border/60 bg-muted/20 space-y-1">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-semibold text-foreground break-words text-wrap">{r.title}</span>
                            <Badge variant="secondary" className="text-xs shrink-0">
                              {r.vesting_days}d liberação
                            </Badge>
                          </div>
                          <p className="text-sm sm:text-base font-extrabold text-primary">
                            +{Number(r.tokens_amount).toLocaleString("pt-BR")} tokens
                          </p>
                          <p className="text-xs text-muted-foreground leading-tight">{r.description}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Histórico de Indicações */}
                <div className="p-4 sm:p-5 rounded-lg border border-border/60 bg-card space-y-3">
                  <h3 className="text-sm font-bold text-foreground">Histórico de Indicações Recentes</h3>
                  {referrals.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-6">
                      Nenhuma indicação registrada até o momento.
                    </p>
                  ) : (
                    <div className="divide-y divide-border/40">
                      {referrals.map((ref: any) => (
                        <div key={ref.id} className="py-3 flex items-center justify-between gap-2">
                          <div className="space-y-1">
                            <p className="text-xs font-semibold text-foreground">
                              {ref.referral_type === "store" ? "Loja / Empresa" : "Membro"} indicado
                            </p>
                            <span className="text-xs text-muted-foreground">{formatDate(ref.created_at)}</span>
                          </div>

                          <div className="text-right space-y-1">
                            <p className="text-xs font-bold text-primary">
                              +{(ref.tokens_awarded || 0).toLocaleString("pt-BR")} tokens
                            </p>
                            <Badge
                              variant={ref.status === "matured" ? "default" : "outline"}
                              className="text-xs"
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
            </Tabs>
          </div>
        ) : (
          /* ─── ATIVAÇÃO DIRETA DE CONTA DE AFILIADO (1 PASSO SEM VIÉS DE PERFIL SOCIAL) ───── */
          <div className="w-full max-w-2xl mx-auto p-5 sm:p-8 rounded-lg border border-border/60 bg-card space-y-6">
            <div className="space-y-2">
              <Badge variant="outline" className="text-xs font-semibold text-primary border-primary/30 bg-primary/5">
                Programa de Afiliados & Parcerias Comerciais
              </Badge>
              <h2 className="text-lg sm:text-xl font-bold text-foreground tracking-tight">
                Ative sua Central de Afiliados
              </h2>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                Gere links rastreados de ofertas, conecte lojas parceiras à sua vitrine comercial e receba comissões reais via Pix a cada venda confirmada.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-4 rounded-lg border border-border/60 bg-muted/20 space-y-2">
                <div className="size-11 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                  <Percent className="size-5" />
                </div>
                <h3 className="text-xs font-bold text-foreground">Comissões Rastreadas</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Rastreamento automático de pedidos gerados pelos seus links e cupons.
                </p>
              </div>

              <div className="p-4 rounded-lg border border-border/60 bg-muted/20 space-y-2">
                <div className="size-11 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                  <Globe className="size-5" />
                </div>
                <h3 className="text-xs font-bold text-foreground">Campanhas 1-Click</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Adicione marcas globais e lojas locais à sua vitrine comercial sem estoque próprio.
                </p>
              </div>

              <div className="p-4 rounded-lg border border-border/60 bg-muted/20 space-y-2">
                <div className="size-11 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center">
                  <Coins className="size-5" />
                </div>
                <h3 className="text-xs font-bold text-foreground">Liquidação via Pix</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Extrato transparente com saldo em garantia e liberação direta após confirmação.
                </p>
              </div>
            </div>

            <div className="p-4 sm:p-5 rounded-lg border border-primary/30 bg-primary/5 space-y-4">
              <div className="space-y-1">
                <Label className="text-xs font-bold text-foreground">
                  Seu Código de Rastreamento de Afiliado (@handle)
                </Label>
                <p className="text-xs text-muted-foreground">
                  Este código identifica seus links comissionados (`?ref=seu_codigo`) e cupons nas lojas parceiras.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <div className="relative flex-1">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-mono text-muted-foreground">
                    @
                  </span>
                  <Input
                    value={onboardingHandle}
                    onChange={(e) =>
                      setOnboardingHandle(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ""))
                    }
                    placeholder="seu_codigo_afiliado"
                    className="h-11 min-h-11 pl-8 rounded-lg text-xs font-mono bg-background"
                  />
                </div>
                <Button
                  type="button"
                  disabled={isSubmitting || !onboardingHandle}
                  onClick={handleFastAffiliateActivation}
                  className="h-11 min-h-11 px-6 rounded-lg text-xs font-bold gap-2 shrink-0"
                >
                  <span>{isSubmitting ? "Ativando..." : "Ativar Conta de Afiliado"}</span>
                  <ArrowRight className="size-4" />
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
