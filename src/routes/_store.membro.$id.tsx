import { CreatorAnalyticsCard } from "@/components/social/creator-analytics-card";
import { CommunityFeedCard } from "@/components/social/community-feed-card";
import { CreatorProfileSheetEditor, CreatorProfileSheetData } from "@/components/profile/creator-profile-sheet-editor";
import {
 Sheet,
 SheetContent,
 SheetHeader,
 SheetTitle,
 SheetDescription,
 SheetFooter,
 SheetTrigger,
} from "@/components/ui/sheet";
import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { getAffiliateShowcaseProducts, getAvailablePartnerStores, upsertCreatorProfile } from "@/services/affiliates.functions";
import { Package, Settings, User, MessageSquare, Tag, MapPin, Briefcase, Globe, Instagram, Store, Check, Plus, Edit3, Share2, Layers, ExternalLink, MessageCircle, GraduationCap, Grid, List, ArrowLeft, Building2, Clock, ShieldCheck, Award, Calendar, Send, ShoppingBag, Trash2, FileText, Upload, HeartHandshake, Languages, X, UserPlus, Eye, ChevronRight, Heart, Activity, Camera, Copy, ArrowRight, Star, Sparkles } from 'lucide-react';
import { ImageUpload } from "@/components/ui/image-upload";
import { MediaLightboxModal } from "@/components/community/media-lightbox-modal";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
 Dialog,
 DialogContent,
 DialogDescription,
 DialogFooter,
 DialogHeader,
 DialogTitle,
} from "@/components/ui/dialog";
import {
 Select,
 SelectContent,
 SelectItem,
 SelectTrigger,
 SelectValue,
} from "@/components/ui/select";
import { formatMoney } from "@/lib/money";
import { formatDate } from "@/lib/datetime";
import {
 getPublicMemberProfile,
 toggleUserFollow,
 updateMemberResumeData,
 searchStoresForCompanyAutocomplete,
} from "@/services/social.functions";
import { getPostMediaSignedUrl } from "@/services/storage.functions";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export type MembroSearchParams = {
 modo?: "social" | "profissional" | "comercial";
};

export const Route = createFileRoute("/_store/membro/$id")({
 validateSearch: (search: Record<string, unknown>): MembroSearchParams => ({
 modo:
 search.modo === "profissional" || search.modo === "comercial"
 ? (search.modo as "profissional" | "comercial")
 : "social",
 }),
 head: ({ loaderData, search }: { loaderData?: { data: any }; search?: MembroSearchParams }) => {
 const modo = search?.modo;
 const fullName = loaderData?.data?.profile?.full_name || "Membro";
 const username = loaderData?.data?.profile?.username ? "@" + loaderData.data.profile.username : "";
 let title = fullName + (username ? " (" + username + ")" : "") + " | Waesy";
 if (modo === "profissional") {
 title = fullName + " — Perfil Profissional | Waesy";
 } else if (modo === "comercial") {
 title = fullName + " — Catálogo & Desapegos | Waesy";
 }
 return {
 meta: [
 { title },
 {
 name: "description",
 content: loaderData?.data?.profile?.bio || "Perfil no ecossistema comunitário Waesy.",
 },
 ],
 };
 },
 loader: async ({ params }): Promise<{ data: any }> => {
 const data = await getPublicMemberProfile({ data: { profileId: params.id } }).catch(() => null);
 return { data };
 },
 component: MemberPublicProfilePage,
});

export default function MemberPublicProfilePage() {
 const { data } = ((Route.useLoaderData?.() as any) || {});
 const search = Route.useSearch();
 const defaultMode = data?.isCreator ? "comercial" : "social";
 return <MemberPublicProfileView data={data} activeMode={search.modo || defaultMode} />;
}

// 14 Causas sociais pré-cadastradas
const SOCIAL_CAUSES_LIST = [
 "Proteção animal",
 "Cultura e artes",
 "Crianças",
 "Direitos civis e ações sociais",
 "Empoderamento econômico",
 "Educação",
 "Meio ambiente",
 "Saúde",
 "Direitos humanos",
 "Resposta a desastres e assistência humanitária",
 "Política",
 "Alívio à pobreza",
 "Ciência e tecnologia",
 "Serviço social",
];

export function MemberPublicProfileView({
 data,
 activeMode = "social",
}: {
 data: any;
 activeMode?: "social" | "profissional" | "comercial";
}) {
 const router = useRouter();

 const profile = data?.profile;
 const isOwner = Boolean(data?.isOwner);
 const stores = (data?.stores || []) as any[];
 const classifieds = (data?.classifieds || []) as any[];
 const posts = (data?.posts || []) as any[];
 const stats = data?.stats || { followersCount: 0, followingCount: 0, postsCount: 0 };
 const creatorProfile = data?.creatorProfile || null;
 const isCreator = Boolean(data?.isCreator);
 const creatorPartnerStores = (data?.partnerStores && data.partnerStores.length > 0) ? data.partnerStores : [];
 const creatorShowcaseProducts = (data?.pinnedProducts && data.pinnedProducts.length > 0)
   ? data.pinnedProducts.map((p: any) => p.product || p)
   : [];
 const creatorEvents = (data?.creatorEvents || []) as any[];

  // Banners com scroll interno horizontal contínuo ao lado da foto de perfil
  const bannerList = useMemo(() => {
    const list: { imageUrl: string; title?: string; link?: string }[] = [];
    if (profile?.cover_url || profile?.coverUrl) {
      list.push({ imageUrl: profile.cover_url || profile.coverUrl, title: "Capa do Perfil" });
    }
    if (profile?.featured_banner_url && profile.featured_banner_url !== (profile.cover_url || profile.coverUrl)) {
      list.push({
        imageUrl: profile.featured_banner_url,
        title: "Destaque",
        link: profile.featured_banner_link || undefined,
      });
    }
    if (creatorProfile?.banner_url && !list.some((b) => b.imageUrl === creatorProfile.banner_url)) {
      list.push({ imageUrl: creatorProfile.banner_url, title: "Banner Criador", link: creatorProfile.banner_link });
    }
    if (creatorProfile?.cover_url && !list.some((b) => b.imageUrl === creatorProfile.cover_url)) {
      list.push({ imageUrl: creatorProfile.cover_url, title: "Capa Criador" });
    }
    if (Array.isArray(creatorProfile?.banners)) {
      creatorProfile.banners.forEach((b: any) => {
        if (b.imageUrl && !list.some((x) => x.imageUrl === b.imageUrl)) {
          list.push({ imageUrl: b.imageUrl, title: b.title, link: b.link });
        }
      });
    }
    if (Array.isArray(stores) && stores.length > 0) {
      stores.forEach((st: any) => {
        if (st.banner_url && !list.some((b) => b.imageUrl === st.banner_url)) {
          list.push({ imageUrl: st.banner_url, title: st.name, link: `/loja/${st.slug || st.id}` });
        }
      });
    }
    if (profile?.banner_url && !list.some((b) => b.imageUrl === profile.banner_url)) {
      list.push({ imageUrl: profile.banner_url, title: "Banner" });
    }
    return list;
  }, [profile, creatorProfile, stores]);

  // Identificação e Avaliação Real de Empresas / Marcas (ZERO MOCKS)
  const primaryStore = Array.isArray(stores) && stores.length > 0 ? stores[0] : null;
  const isEnterpriseOrBrand = Boolean(
    primaryStore ||
    profile?.role === "store" ||
    profile?.profile_type === "store" ||
    profile?.profile_type === "business" ||
    profile?.profile_type === "company"
  );
  const realStoreRating = primaryStore?.rating_average != null ? Number(primaryStore.rating_average) : null;
  const realStoreReviewsCount = primaryStore?.reviews_count ? Number(primaryStore.reviews_count) : 0;

  const avatarSrc = profile?.avatar_url || profile?.avatarUrl || profile?.photo_url || profile?.image_url || null;
  const avatarInitials = profile?.full_name
    ? profile.full_name
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map((w: string) => w[0]?.toUpperCase())
        .join("") || "W"
    : profile?.username
    ? profile.username.slice(0, 2).toUpperCase()
    : "WD";

 const [isFollowing, setIsFollowing] = useState(Boolean(data?.isFollowing));
 const [followersCount, setFollowersCount] = useState(stats.followersCount || 0);
 const [isFollowLoading, setIsFollowLoading] = useState(false);

 // Resume data do perfil
 const [resumeData, setResumeData] = useState<any>(profile?.resume_data || {});
 const [isSavingResume, setIsSavingResume] = useState(false);
 const [isSettingsOpen, setIsSettingsOpen] = useState(false);
 const [socialTab, setSocialTab] = useState<"posts" | "media" | "saved" | "liked" | "events">("posts");
 const [postViewMode, setPostViewMode] = useState<"feed" | "grid">("grid");

 // Lightbox Modal para fotos individuais
 const [previewMediaUrl, setPreviewMediaUrl] = useState<string | null>(null);
 const [selectedLightboxPost, setSelectedLightboxPost] = useState<any | null>(null);
 const [selectedLightboxIndex, setSelectedLightboxIndex] = useState<number>(0);

 // Modais de Edição Rápida In-Place
 const [editingSection, setEditingSection] = useState<
 | "availability"
 | "about"
 | "experience"
 | "education"
 | "certification"
 | "project"
 | "volunteering"
 | "causes"
 | "languages"
 | "creator_profile"
 | null
 >(null);

 // Item selecionado para edição (null = criando novo)
 const [activeEditItem, setActiveEditItem] = useState<any>(null);

 // Estado expansível de listas longas
 const [showAllExperiences, setShowAllExperiences] = useState(false);
 const [showAllEducations, setShowAllEducations] = useState(false);
 const [showAllCertifications, setShowAllCertifications] = useState(false);
 const [showAllProjects, setShowAllProjects] = useState(false);
 const [showAllVolunteering, setShowAllVolunteering] = useState(false);
 const [isBioExpanded, setIsBioExpanded] = useState(false);

 // Queries para a Vitrine Comercial de Afiliados/Criador
 const { data: showcaseProducts = [], isLoading: isLoadingProducts } = useQuery({
  queryKey: ["affiliate-showcase-products", profile?.id],
  queryFn: () => getAffiliateShowcaseProducts(),
  enabled: activeMode === "comercial" && !!profile?.id,
 });

 const { data: partnerStores = [] } = useQuery({
  queryKey: ["affiliate-partner-stores"],
  queryFn: () => getAvailablePartnerStores(),
  enabled: activeMode === "comercial",
 });

 const handleAffiliateProductClick = (_storeSlug: string, _productSlug: string) => {
  if (typeof window !== "undefined" && profile?.username) {
    localStorage.setItem("waesy_affiliate_ref", profile.username);
    document.cookie = `waesy_affiliate_ref=${encodeURIComponent(profile.username)}; max-age=${30 * 86400}; path=/; SameSite=Lax`;
  }
 };

 if (!profile) {
 return (
 <div className="min-h-[50vh] flex flex-col items-center justify-center p-8 text-center space-y-4">
 <div className="size-16 rounded-2xl bg-muted/40 flex items-center justify-center text-muted-foreground">
 <User className="size-8" />
 </div>
 <h2 className="text-xl font-bold">Perfil não encontrado</h2>
 <p className="text-sm text-muted-foreground max-w-md">
 O membro solicitado não existe ou foi desativado da rede comunitária Waesy.
 </p>
 <Button asChild variant="outline" className="rounded-xl">
 <Link to="/">Voltar ao Início</Link>
 </Button>
 </div>
 );
 }

 const handleToggleFollow = async () => {
 if (isOwner || isFollowLoading) return;
 setIsFollowLoading(true);
 try {
 const res = await toggleUserFollow({ data: { targetUserId: profile.id } });
 const isNowFollowing = (res as any).following ?? (res as any).isFollowing;
 setIsFollowing(isNowFollowing);
 setFollowersCount((prev: number) => (isNowFollowing ? prev + 1 : Math.max(0, prev - 1)));
 toast.success(isNowFollowing ? `Você está seguindo ${profile.full_name}` : "Deixou de seguir");
 } catch {
 toast.error("Não foi possível atualizar o status de seguidor.");
 } finally {
 setIsFollowLoading(false);
 }
 };

 const handleShare = () => {
 if (typeof navigator !== "undefined" && navigator.share) {
 navigator
 .share({
 title: `${profile.full_name} no Waesy`,
 url: window.location.href,
 })
 .catch(() => {});
 } else {
 navigator.clipboard.writeText(window.location.href);
 toast.success("Link do perfil copiado para a área de transferência!");
 }
 };

 const saveResumeChanges = async (newResumeData: any) => {
 setIsSavingResume(true);
 try {
 await updateMemberResumeData({ data: { resumeData: newResumeData } });
 setResumeData(newResumeData);
 toast.success("Perfil atualizado com sucesso!");
 setEditingSection(null);
 setActiveEditItem(null);
 router.invalidate();
 } catch (err: any) {
 toast.error(err?.message || "Erro ao salvar informações do perfil.");
 } finally {
 setIsSavingResume(false);
 }
 };

 // Seções do currículo
 const availability = resumeData.availability || {};
 const experiences = (resumeData.experiences || []) as any[];
 const educations = (resumeData.educations || []) as any[];
 const certifications = (resumeData.certifications || []) as any[];
 const projects = (resumeData.projects || []) as any[];
 const volunteeringList = (resumeData.volunteering || []) as any[];
 const causes = (resumeData.causes || []) as string[];
 const languagesList = (resumeData.languages || []) as any[];
 const aboutSummary = resumeData.summary || profile.bio || "";

 // Itens visíveis conforme estado de expansão
 const visibleExperiences = showAllExperiences ? experiences : experiences.slice(0, 3);
 const visibleEducations = showAllEducations ? educations : educations.slice(0, 3);
 const visibleCertifications = showAllCertifications ? certifications : certifications.slice(0, 4);
 const visibleProjects = showAllProjects ? projects : projects.slice(0, 3);
 const visibleVolunteering = showAllVolunteering ? volunteeringList : volunteeringList.slice(0, 3);

 return (
 <div className="w-full max-w-5xl mx-auto space-y-6 pb-6 animate-in fade-in duration-200">
 {/* ── Visualizador Lightbox de Mídias ── */}
 {previewMediaUrl && (
 <div
 className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4"
 onClick={() => setPreviewMediaUrl(null)}
 >
 <button
 type="button"
 className="absolute top-6 right-6 p-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
 onClick={() => setPreviewMediaUrl(null)}
 aria-label="Fechar visualizador"
 >
 <X className="size-6" />
 </button>
 <img
 src={previewMediaUrl}
 alt="Mídia ampliada"
 className="max-w-full max-h-[90vh] object-contain rounded-2xl"
 onClick={(e) => e.stopPropagation()}
 />
 </div>
 )}

 {/* ── Media Lightbox Modal com Métricas e Comentários Isolados ── */}
 {selectedLightboxPost && (
 <MediaLightboxModal
 isOpen={Boolean(selectedLightboxPost)}
 onClose={() => setSelectedLightboxPost(null)}
 post={{
 type: "post",
 id: selectedLightboxPost.id,
 author: {
 id: profile.id,
 name: profile.full_name,
 avatar_url: profile.avatar_url,
 is_store: false,
 },
 content_text: selectedLightboxPost.content || selectedLightboxPost.content_text || "",
 media_urls: selectedLightboxPost.media_urls || (selectedLightboxPost.media_url ? [selectedLightboxPost.media_url] : []),
 layout_style: selectedLightboxPost.layout_style || "grid",
 post_type: selectedLightboxPost.post_type || "simple",
 created_at: selectedLightboxPost.created_at || new Date().toISOString(),
 likes_count: selectedLightboxPost.likes_count || 0,
 comments_count: selectedLightboxPost.comments_count || 0,
 user_liked: false,
 reference_type: "none",
 reference_id: null,
 }}
 initialMediaIndex={selectedLightboxIndex}
 />
 )}

 {/* ── 1. Top Bar Canônica: Voltar, @username & Ações (Compartilhar / Configurações) ── */}
      <div className="-mx-4 -mt-4 sm:mx-0 sm:mt-0 px-4 py-2.5 bg-background/95 backdrop-blur-md sticky top-0 z-40 border-b border-border/40 flex items-center justify-between">
        {/* Esquerda: Botão Voltar */}
        <Button
          size="sm"
          variant="ghost"
          className="size-9 p-0 rounded-xl text-muted-foreground hover:text-foreground cursor-pointer"
          onClick={() => window.history.back()}
          aria-label="Voltar"
        >
          <ArrowLeft className="size-5" />
        </Button>

        {/* Centro: Nome de Usuário / Identificador */}
        <div className="flex items-center gap-1.5 font-bold text-sm text-foreground">
          <span className="font-mono">@{profile.username || "perfil"}</span>
          {profile.is_verified && (
            <ShieldCheck className="size-4 text-primary fill-primary/20 shrink-0" />
          )}
        </div>

        {/* Direita: Compartilhar & Configurações */}
        <div className="flex items-center gap-1">
          <Button
            size="sm"
            variant="ghost"
            className="size-9 p-0 rounded-xl text-muted-foreground hover:text-foreground cursor-pointer"
            onClick={handleShare}
            aria-label="Compartilhar Perfil"
          >
            <Share2 className="size-4" />
          </Button>

          {isOwner && (
            <Sheet open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
              <SheetTrigger asChild>
                <Button
                  size="sm"
                  variant="ghost"
                  className="size-9 p-0 rounded-xl text-muted-foreground hover:text-foreground cursor-pointer"
                  aria-label="Configurações e Atividades"
                >
                  <Settings className="size-4" />
                </Button>
              </SheetTrigger>
              <SheetContent side="bottom" className="rounded-t-3xl p-6 space-y-4 max-h-[85vh]">
                <SheetHeader className="text-left pb-2 border-b border-border/40">
                  <SheetTitle className="text-base font-bold">Configurações & Gestão</SheetTitle>
                </SheetHeader>
                <div className="grid gap-2 text-sm font-medium">
                  <Link
                    to="/conta/perfil"
                    className="flex items-center gap-3 p-3 rounded-2xl bg-muted/40 hover:bg-muted transition-colors"
                  >
                    <Edit3 className="size-4 text-primary" />
                    <span>Editar Dados do Perfil</span>
                  </Link>
                  <Link
                    to="/conta/lojas"
                    className="flex items-center gap-3 p-3 rounded-2xl bg-muted/40 hover:bg-muted transition-colors"
                  >
                    <Store className="size-4 text-primary" />
                    <span>Minhas Lojas & Negócios</span>
                  </Link>
                  <Link
                    to="/conta/pedidos"
                    className="flex items-center gap-3 p-3 rounded-2xl bg-muted/40 hover:bg-muted transition-colors"
                  >
                    <Package className="size-4 text-primary" />
                    <span>Meus Pedidos & Compras</span>
                  </Link>
                </div>
              </SheetContent>
            </Sheet>
          )}
        </div>
      </div>

      {/* ── 2. Seletor de Tipo de Perfil & Ação Editar (Abaixo do Top Bar) ── */}
      <div className="flex items-center justify-between gap-2 px-1">
        {/* Switcher de Modos: Social, Profissional, Comercial / Vitrine */}
        <div className="flex items-center gap-1 p-1 rounded-xl bg-muted/40 text-xs font-semibold">
          {isCreator ? (
            <>
              <Link
                to="/membro/$id"
                params={{ id: profile.username || profile.id }}
                search={{ modo: "comercial" }}
                className={cn(
                  "px-3.5 py-1.5 rounded-lg transition-colors cursor-pointer",
                  activeMode === "comercial"
                    ? "bg-background text-foreground font-bold shadow-2xs"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                Vitrine & Parcerias
              </Link>
              <Link
                to="/membro/$id"
                params={{ id: profile.username || profile.id }}
                search={{ modo: "social" }}
                className={cn(
                  "px-3.5 py-1.5 rounded-lg transition-colors cursor-pointer",
                  activeMode === "social"
                    ? "bg-background text-foreground font-bold shadow-2xs"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                Publicações
              </Link>
              <Link
                to="/membro/$id"
                params={{ id: profile.username || profile.id }}
                search={{ modo: "profissional" }}
                className={cn(
                  "px-3.5 py-1.5 rounded-lg transition-colors cursor-pointer",
                  activeMode === "profissional"
                    ? "bg-background text-foreground font-bold shadow-2xs"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                Sobre
              </Link>
            </>
          ) : (
            <>
              <Link
                to="/membro/$id"
                params={{ id: profile.username || profile.id }}
                search={{ modo: "social" }}
                className={cn(
                  "px-3.5 py-1.5 rounded-lg transition-colors cursor-pointer",
                  activeMode === "social"
                    ? "bg-background text-foreground font-bold shadow-2xs"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                Social
              </Link>
              <Link
                to="/membro/$id"
                params={{ id: profile.username || profile.id }}
                search={{ modo: "profissional" }}
                className={cn(
                  "px-3.5 py-1.5 rounded-lg transition-colors cursor-pointer",
                  activeMode === "profissional"
                    ? "bg-background text-foreground font-bold shadow-2xs"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                Profissional
              </Link>
              <Link
                to="/membro/$id"
                params={{ id: profile.username || profile.id }}
                search={{ modo: "comercial" }}
                className={cn(
                  "px-3.5 py-1.5 rounded-lg transition-colors cursor-pointer",
                  activeMode === "comercial"
                    ? "bg-background text-foreground font-bold shadow-2xs"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                Comercial
              </Link>
            </>
          )}
        </div>

        {/* Botão de Edição Rápida */}
        {isOwner && (
          <div className="flex items-center gap-1.5">
            {isCreator ? (
              <Button
                asChild
                size="sm"
                variant="outline"
                className="h-8 rounded-xl text-xs font-semibold gap-1.5 border-border/70 sm:hidden cursor-pointer"
              >
                <Link to="/conta/perfil" search={{ tab: "criador" }}>
                  <Layers className="size-3.5 text-primary" />
                  <span>Editar Vitrine da Marca</span>
                </Link>
              </Button>
            ) : (
              <Button
                asChild
                size="sm"
                variant="outline"
                className="h-8 rounded-xl text-xs font-semibold gap-1.5 border-border/70 sm:hidden cursor-pointer"
              >
                <Link to="/conta/perfil" search={{ tab: "dados" }}>
                  <Edit3 className="size-3.5" />
                  <span>Editar Perfil</span>
                </Link>
              </Button>
            )}
          </div>
        )}
      </div>

      {/* ── Bloco 1: Header do Perfil (Foto de Perfil + Banner ao lado com Scroll Interno + Stats no final) ── */}
      <div className="rounded-2xl bg-card border border-border/40 p-4 sm:p-6 space-y-5 shadow-xs">
        {/* Linha Superior Panorâmica: Foto + Banner ao lado com Scroll Interno + Stats no Final */}
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-3 sm:gap-4">
          
          {/* Lado Esquerdo: Foto de Perfil 1:1 + Banner ao Lado com Scroll Interno */}
          <div className="flex flex-row items-center gap-2.5 sm:gap-4 flex-1 min-w-0">
            {/* Foto de Perfil em Squircle 1:1 */}
            <div className="relative group shrink-0">
              <Avatar className="size-20 sm:size-24 md:size-28 lg:size-32 rounded-2xl ring-2 ring-border/60 bg-muted shrink-0 overflow-hidden shadow-xs flex items-center justify-center">
                {avatarSrc ? (
                  <AvatarImage
                    src={avatarSrc}
                    alt={profile.full_name || "Membro"}
                    className="object-cover size-full"
                  />
                ) : null}
                <AvatarFallback className="text-xl sm:text-2xl md:text-3xl font-black bg-gradient-to-br from-primary/15 via-muted to-muted/80 text-foreground rounded-2xl flex items-center justify-center select-none">
                  {avatarInitials}
                </AvatarFallback>
              </Avatar>
              {isOwner && (
                <Link
                  to="/conta/perfil"
                  search={{ tab: isCreator ? "criador" : "dados" }}
                  className="absolute inset-0 bg-black/40 text-white rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-xs font-semibold gap-1 cursor-pointer"
                  title="Alterar Foto"
                >
                  <Camera className="size-4 sm:size-5" />
                  <span className="text-[10px]">Alterar</span>
                </Link>
              )}
            </div>

            {/* Banner AO LADO da Foto de Perfil com Scroll Interno */}
            <div className="flex-1 min-w-0 h-20 sm:h-24 md:h-28 lg:h-32 rounded-2xl border border-border/40 bg-muted/20 relative overflow-hidden flex items-center">
              <div 
                tabIndex={0}
                aria-label="Galeria de banners do perfil"
                className="size-full overflow-x-auto overflow-y-hidden no-scrollbar scroll-smooth flex items-center gap-2 p-1 snap-x snap-mandatory"
              >
                {bannerList.length > 0 ? (
                  bannerList.map((banner, idx) => (
                    <div
                      key={idx}
                      className="h-full min-w-full sm:min-w-[280px] md:min-w-[360px] lg:min-w-[420px] rounded-xl overflow-hidden relative shrink-0 snap-center bg-muted/40 group"
                    >
                      <img
                        src={banner.imageUrl}
                        alt={banner.title || "Banner do perfil"}
                        className="size-full object-cover select-none rounded-xl"
                      />
                      {banner.link && (
                        <a
                          href={banner.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="absolute inset-0 z-10"
                          aria-label="Abrir link do banner"
                        />
                      )}
                    </div>
                  ))
                ) : (
                  <div className="size-full bg-gradient-to-r from-primary/10 via-muted/40 to-primary/15 flex items-center justify-center rounded-xl text-muted-foreground/60 gap-2 text-xs font-medium">
                    <Layers className="size-5 text-primary/30" />
                    <span>Espaço para banner promocional</span>
                  </div>
                )}
              </div>

              {isOwner && (
                <Link
                  to="/conta/perfil"
                  search={{ tab: isCreator ? "criador" : "dados" }}
                  className="absolute top-2 right-2 bg-background/85 hover:bg-background text-foreground backdrop-blur-md px-2.5 py-1 rounded-xl border border-border/60 text-[10px] sm:text-xs font-semibold flex items-center gap-1 shadow-xs cursor-pointer transition-colors z-20"
                >
                  <Camera className="size-3" />
                  <span>Alterar Capa</span>
                </Link>
              )}
            </div>
          </div>

          {/* Stats no Final (Seguidores, Seguindo, Curtidas) */}
          <div className="h-14 sm:h-20 md:h-28 lg:h-32 lg:min-w-[240px] shrink-0 bg-background/90 backdrop-blur-md rounded-2xl border border-border/50 p-2 sm:p-4 flex flex-col justify-center shadow-xs">
            <div className="grid grid-cols-3 gap-2 text-center w-full">
              <div>
                <p className="text-sm sm:text-base md:text-lg font-black text-foreground">{followersCount}</p>
                <p className="text-[10px] sm:text-[11px] text-muted-foreground font-medium truncate">Seguidores</p>
              </div>
              <div>
                <p className="text-sm sm:text-base md:text-lg font-black text-foreground">{stats.followingCount || 0}</p>
                <p className="text-[10px] sm:text-[11px] text-muted-foreground font-medium truncate">Seguindo</p>
              </div>
              <div>
                <p className="text-sm sm:text-base md:text-lg font-black text-foreground font-mono">{stats.totalLikes || stats.postsCount || 0}</p>
                <p className="text-[10px] sm:text-[11px] text-muted-foreground font-medium truncate">Curtidas</p>
              </div>
            </div>
          </div>
        </div>

  {/* Linha de Identidade e Ações Minimalistas */}
  <div className="pt-2 border-t border-border/30 space-y-3">
  {/* Nome, Username, Avaliação Real de Empresas e Menu */}
  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
  <div className="space-y-0.5">
  <div className="flex items-center gap-2 flex-wrap">
  <h1 className="text-xl sm:text-2xl font-black text-foreground tracking-tight">
  {profile.full_name}
  </h1>
  {profile.is_verified && (
  <ShieldCheck className="size-4 text-primary fill-primary/20 shrink-0" />
  )}
  {profile.username && (
  <span className="text-xs sm:text-sm font-medium text-muted-foreground">
  @{profile.username}
  </span>
  )}

  {/* AVALIAÇÃO REAL AO LADO DO NOME (PARA EMPRESAS / MARCAS / LOJAS — ZERO MOCKS) */}
  {isEnterpriseOrBrand && (
    realStoreReviewsCount > 0 && realStoreRating !== null ? (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold text-xs border border-amber-500/20">
        <Star className="size-3.5 fill-amber-500 text-amber-500" />
        <span>{realStoreRating.toFixed(1)}</span>
        <span className="text-[10px] font-medium text-muted-foreground">({realStoreReviewsCount})</span>
      </span>
    ) : (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-muted text-muted-foreground text-[11px] font-medium border border-border/50">
        Sem avaliações ainda
      </span>
    )
  )}
  </div>

 {profile.occupation && (
 <div className="pt-0.5">
 <span className="px-2.5 py-0.5 rounded-lg text-[11px] font-semibold border border-border/50 bg-transparent text-muted-foreground">
 {profile.occupation}
 </span>
 </div>
 )}
 </div>

 {/* Ações Minimalistas em Pílulas */}
 <div className="flex flex-wrap items-center gap-2">
 {isOwner ? (
 <>
 <Button
 asChild
 size="sm"
 variant="outline"
 className="h-9 px-3.5 rounded-xl font-semibold text-xs gap-1.5 border-border/50 bg-transparent hover:bg-muted/40 text-foreground cursor-pointer"
 >
 <Link to="/conta/metricas">
 <Activity className="size-3.5 text-muted-foreground" />
 <span>Painel de Insights</span>
 </Link>
 </Button>
 <Button
 size="sm"
 variant="outline"
 className="h-9 px-4 rounded-xl font-semibold text-xs gap-1.5 border-border/50 bg-transparent hover:bg-muted/40 text-foreground cursor-pointer"
 onClick={() => setEditingSection("availability")}
 >
 <span>Disponibilidade</span>
 </Button>
 {isCreator ? (
                    <Button
                      asChild
                      size="sm"
                      variant="outline"
                      className="hidden sm:inline-flex h-9 px-4 rounded-xl font-semibold text-xs gap-1.5 cursor-pointer"
                    >
                      <Link to="/conta/perfil" search={{ tab: "criador" }}>
                        <Layers className="size-3.5 text-primary" />
                        <span>Editar Vitrine da Marca</span>
                      </Link>
                    </Button>
                  ) : (
                    <Button
                      asChild
                      size="sm"
                      variant="outline"
                      className="hidden sm:inline-flex h-9 px-4 rounded-xl font-semibold text-xs gap-1.5 cursor-pointer"
                    >
                      <Link to="/conta/perfil" search={{ tab: "dados" }}>
                        <Edit3 className="size-3.5" />
                        <span>Editar Perfil</span>
                      </Link>
                    </Button>
                  )}
 </>
 ) : (
 <>
 <Button
 size="sm"
 className={cn(
 "h-9 px-5 rounded-xl font-bold text-xs gap-1.5 cursor-pointer transition-all",
 isFollowing ? "bg-transparent border border-border/60 text-muted-foreground hover:bg-muted/40 hover:text-foreground" : "bg-primary text-primary-foreground shadow-xs"
 )}
 onClick={handleToggleFollow}
 disabled={isFollowLoading}
 >
 {isFollowing ? (
 <>
 <Check className="size-3.5" />
 <span>Seguindo</span>
 </>
 ) : (
 <>
 <Plus className="size-3.5" />
 <span>Seguir</span>
 </>
 )}
 </Button>
 {profile.phone && (
 <Button
 asChild
 size="sm"
 variant="outline"
 className="h-9 px-4 rounded-xl font-semibold text-xs gap-1.5 border-border/50 bg-transparent hover:bg-muted/40 text-foreground cursor-pointer"
 >
 <a
 href={`https://wa.me/${profile.phone.replace(/\D/g, "")}`}
 target="_blank"
 rel="noopener noreferrer"
 >
 <MessageCircle className="size-3.5 text-emerald-500" />
 <span>Mensagem</span>
 </a>
 </Button>
 )}
 <Button
 size="sm"
 variant="outline"
 className="h-9 size-9 p-0 rounded-xl text-muted-foreground hover:text-foreground border border-border/50 bg-transparent hover:bg-muted/40"
 onClick={handleShare}
 aria-label="Compartilhar Perfil"
 >
 <Share2 className="size-4" />
 </Button>
 </>
 )}
 </div>
 </div>

 {/* Bio / Descrição Formatada com Limite & Expansão */}
 {(profile.bio || profile.headline) && (
 <div className="space-y-1 max-w-xl">
 <p
 className={cn(
 "text-xs sm:text-sm text-foreground/90 font-medium leading-relaxed whitespace-pre-line",
 !isBioExpanded && "line-clamp-3"
 )}
 >
 {profile.bio || profile.headline}
 </p>
 {(profile.bio || profile.headline).length > 160 && (
 <button
 type="button"
 onClick={() => setIsBioExpanded(!isBioExpanded)}
 className="text-[11px] font-bold text-primary hover:underline cursor-pointer inline-flex items-center gap-0.5"
 >
 {isBioExpanded ? "Ver menos" : "...mais"}
 </button>
 )}
 </div>
 )}

 {/* Links e Localização Minimalistas */}
 <div className="flex flex-wrap items-center gap-3 pt-0.5 text-xs">
 {profile.website && (
 <a
 href={profile.website.startsWith("http") ? profile.website : `https://${profile.website}`}
 target="_blank"
 rel="noopener noreferrer"
 className="inline-flex items-center gap-1 text-primary font-semibold hover:underline"
 >
 <Globe className="size-3.5" />
 <span>{profile.website.replace(/^https?:\/\//, "")}</span>
 </a>
 )}

 {profile.instagram && (
 <a
 href={`https://instagram.com/${profile.instagram.replace(/^@/, "")}`}
 target="_blank"
 rel="noopener noreferrer"
 className="inline-flex items-center gap-1 text-foreground/80 font-semibold hover:underline"
 >
 <Instagram className="size-3.5 text-primary" />
 <span>@{profile.instagram.replace(/^@/, "")}</span>
 </a>
 )}

 {(profile.city || profile.state) && (
 <div className="inline-flex items-center gap-1 text-muted-foreground font-medium">
 <MapPin className="size-3.5 text-primary" />
 <span>{[profile.city, profile.state].filter(Boolean).join(", ")}</span>
 </div>
 )}
 </div>

 {/* Botões de Ação Personalizados / Links na Bio Compactos */}
 {/* Botões de Ação & Biolinks (Banners Gráficos ou Botões Limpos) */}
 {Array.isArray(profile.biolinks) && profile.biolinks.length > 0 && (
 <div className="space-y-3 pt-2 max-w-xl">
 {/* Mini-Banners Gráficos com Imagem (16:9 Fiel e Delicado) */}
 {profile.biolinks.some((b: any) => !!b.imageUrl) && (
 <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
 {profile.biolinks.filter((b: any) => !!b.imageUrl).map((link: any, idx: number) => (
 <a
 key={link.id || idx}
 href={link.url}
 target="_blank"
 rel="noopener noreferrer"
 className="block w-full aspect-[16/9] rounded-2xl overflow-hidden border border-border/60 relative group shadow-xs hover:border-border transition-all select-none"
 >
 <img
 src={link.imageUrl}
 alt={link.label || "Banner"}
 className="size-full object-cover group-hover:scale-102 transition-transform duration-300"
 />
 <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/25 to-transparent flex flex-col justify-end p-2.5">
 <span className="text-xs font-bold text-white drop-shadow-sm truncate flex items-center justify-between gap-1">
 <span>{link.label || link.title || "Acessar"}</span>
 <ExternalLink className="size-3 text-white/80 shrink-0" />
 </span>
 </div>
 </a>
 ))}
 </div>
 )}

 {/* Botões Normais Clean (sem imagem de fundo, minimalistas padrão Apple/Clean) */}
 {profile.biolinks.some((b: any) => !b.imageUrl) && (
 <div className="flex flex-wrap gap-2 pt-0.5">
 {profile.biolinks.filter((b: any) => !b.imageUrl).map((link: any, idx: number) => (
 <a
 key={link.id || idx}
 href={link.url}
 target="_blank"
 rel="noopener noreferrer"
 className="inline-flex items-center gap-2 h-9 px-4 rounded-xl text-xs font-semibold bg-transparent hover:bg-muted/40 text-foreground border border-border/50 transition-all hover:border-border cursor-pointer"
 >
 <span>{link.label || link.title || link.url}</span>
 <ExternalLink className="size-3 text-muted-foreground" />
 </a>
 ))}
 </div>
 )}
 </div>
 )}

 {/* Mini-Banner de Destaque Delicado & Proporcional (16:9 Fiel ao Recorte) */}
 {profile.featured_banner_url && (
 <div className="pt-2 max-w-[320px] sm:max-w-[360px]">
 <a
 href={profile.featured_banner_link || "#"}
 target={profile.featured_banner_link ? "_blank" : undefined}
 rel="noopener noreferrer"
 className="block w-full aspect-[16/9] rounded-2xl overflow-hidden border border-border/60 shadow-xs relative group select-none hover:border-border transition-all"
 >
 <img
 src={profile.featured_banner_url}
 alt="Destaque"
 className="size-full object-cover group-hover:scale-102 transition-transform duration-300"
 />
 <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-2.5">
 <span className="text-[11px] font-bold text-white flex items-center gap-1 drop-shadow-sm">
 <span>Acessar</span>
 <ExternalLink className="size-3" />
 </span>
 </div>
 </a>
 </div>
 )}

 {/* Destaques de Stories Reais (Apenas se o perfil possuir story_highlights reais cadastrados) */}
 {Array.isArray(profile.story_highlights) && profile.story_highlights.length > 0 && (
 <div className="pt-3 pb-1 border-t border-border/20 overflow-x-auto no-scrollbar flex items-center gap-4 sm:gap-6">
 {profile.story_highlights.map((hl: any, idx: number) => (
 <div
 key={hl.id || idx}
 onClick={() => hl.cover_url && setPreviewMediaUrl(hl.cover_url)}
 className="flex flex-col items-center gap-1.5 shrink-0 group cursor-pointer"
 >
 <div className="size-14 sm:size-16 rounded-full p-0.5 ring-2 ring-primary/40 group-hover:ring-primary group-hover:scale-105 transition-all bg-background overflow-hidden flex items-center justify-center">
 {hl.cover_url ? (
 <img src={hl.cover_url} alt={hl.title} className="size-full object-cover rounded-full" />
 ) : (
 <Sparkles className="size-6 text-primary" />
 )}
 </div>
 <span className="text-[11px] font-bold text-foreground/90 max-w-[64px] truncate text-center">
 {hl.title}
 </span>
 </div>
 ))}
 </div>
 )}
 </div>
 </div>

 {/* ── Bloco 2: Perfil Profissional Corporativo (Quando modo === "profissional") ── */}
 {activeMode === "profissional" && (
 <div className="rounded-2xl bg-card p-6 sm:p-8 space-y-8 divide-y divide-border/40">
 {/* ── 1. Seção Sobre ── */}
 <div className="space-y-4">
 <div className="flex items-center justify-between">
 <h2 className="text-lg font-bold text-foreground tracking-tight">Sobre</h2>
 {isOwner && (
 <Button
 size="sm"
 variant="ghost"
 className="size-8 p-0 rounded-xl text-muted-foreground hover:text-foreground"
 onClick={() => setEditingSection("about")}
 aria-label="Editar Sobre"
 >
 <Edit3 className="size-4" />
 </Button>
 )}
 </div>
 {aboutSummary ? (
 <p className="text-sm text-foreground/90 leading-relaxed whitespace-pre-line">
 {aboutSummary}
 </p>
 ) : isOwner ? (
 <button
 type="button"
 onClick={() => setEditingSection("about")}
 className="text-xs text-muted-foreground hover:text-foreground font-medium py-1 transition-colors flex items-center gap-1.5"
 >
 <Plus className="size-3.5" />
 <span>Adicionar resumo sobre você</span>
 </button>
 ) : null}
 </div>

 {/* ── 2. Seção Experiência com Vinculação a Lojas Waesy & Mídias ── */}
 <div className="pt-8 space-y-6">
 <div className="flex items-center justify-between">
 <h2 className="text-lg font-bold text-foreground tracking-tight">Experiência</h2>
 {isOwner && (
 <div className="flex items-center gap-1">
 <Button
 size="sm"
 variant="ghost"
 className="size-8 p-0 rounded-xl text-muted-foreground hover:text-foreground"
 onClick={() => {
 setActiveEditItem(null);
 setEditingSection("experience");
 }}
 aria-label="Adicionar Experiência"
 >
 <Plus className="size-4" />
 </Button>
 </div>
 )}
 </div>

 {experiences.length === 0 ? (
 <p className="text-sm text-muted-foreground italic">
 Nenhuma experiência profissional cadastrada até o momento.
 </p>
 ) : (
 <div className="space-y-6 divide-y divide-border/40">
 {visibleExperiences.map((exp: any, index: number) => (
 <div key={exp.id || index} className={cn("space-y-3", index > 0 && "pt-6")}>
 <div className="flex items-start justify-between gap-4">
 <div className="flex items-start gap-3.5">
 {/* Logo da Loja Waesy ou Ícone Squircle */}
 <div className="size-12 rounded-2xl bg-muted/50 flex-shrink-0 overflow-hidden flex items-center justify-center">
 {exp.store_logo ? (
 <img src={exp.store_logo} alt={exp.company} className="size-full object-cover" />
 ) : (
 <Building2 className="size-6 text-muted-foreground" />
 )}
 </div>

 {/* Dados da Experiência */}
 <div className="space-y-1">
 <h3 className="text-base font-bold text-foreground leading-snug">
 {exp.title}
 </h3>
 <div className="flex flex-wrap items-center gap-1.5 text-xs text-foreground/80 font-medium">
 <span>{exp.company}</span>
 {exp.store_id && (
 <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 bg-primary/10 text-primary font-bold">
 Empresa Waesy
 </Badge>
 )}
 {exp.employment_type && (
 <>
 <span>•</span>
 <span>{exp.employment_type}</span>
 </>
 )}
 </div>
 <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
 <span>
 {exp.start_date} – {exp.is_current ? "o momento" : exp.end_date}
 </span>
 {exp.location && (
 <>
 <span>•</span>
 <span>{exp.location}</span>
 </>
 )}
 {exp.location_type && <span>({exp.location_type})</span>}
 </div>
 </div>
 </div>

 {isOwner && (
 <Button
 size="sm"
 variant="ghost"
 className="size-7 p-0 rounded-lg text-muted-foreground hover:text-foreground"
 onClick={() => {
 setActiveEditItem(exp);
 setEditingSection("experience");
 }}
 aria-label="Editar Experiência"
 >
 <Edit3 className="size-3.5" />
 </Button>
 )}
 </div>

 {/* Descrição */}
 {exp.description && (
 <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed pl-15 whitespace-pre-line">
 {exp.description}
 </p>
 )}

 {/* Mídias & Documentos Anexados */}
 {exp.media_urls && exp.media_urls.length > 0 && (
 <div className="flex flex-wrap gap-2 pl-15 pt-1">
 {exp.media_urls.map((url: string, mIdx: number) => (
 <div
 key={mIdx}
 className="size-16 rounded-xl overflow-hidden bg-muted/40 cursor-pointer hover:opacity-90 transition-opacity"
 onClick={() => setPreviewMediaUrl(url)}
 >
 <img src={url} alt="Anexo de experiência" className="size-full object-cover" />
 </div>
 ))}
 </div>
 )}

 {/* Competências Associadas */}
 {exp.skills && exp.skills.length > 0 && (
 <div className="flex flex-wrap items-center gap-1.5 pl-15 pt-1 text-xs text-muted-foreground">
 <Tag className="size-3.5 text-primary" />
 <span className="font-semibold text-foreground">Competências:</span>
 <span>{exp.skills.join(" • ")}</span>
 </div>
 )}
 </div>
 ))}
 </div>
 )}

 {experiences.length > 3 && (
 <Button
 variant="ghost"
 className="w-full h-10 rounded-2xl text-xs font-bold gap-1 text-muted-foreground hover:text-foreground"
 onClick={() => setShowAllExperiences(!showAllExperiences)}
 >
 <span>{showAllExperiences ? "Recolher experiências" : `Exibir todas as ${experiences.length} experiências ➔`}</span>
 </Button>
 )}
 </div>

 {/* ── 3. Seção Formação Acadêmica ── */}
 <div className="pt-8 space-y-6">
 <div className="flex items-center justify-between">
 <h2 className="text-lg font-bold text-foreground tracking-tight">Formação acadêmica</h2>
 {isOwner && (
 <Button
 size="sm"
 variant="ghost"
 className="size-8 p-0 rounded-xl text-muted-foreground hover:text-foreground"
 onClick={() => {
 setActiveEditItem(null);
 setEditingSection("education");
 }}
 aria-label="Adicionar Formação"
 >
 <Plus className="size-4" />
 </Button>
 )}
 </div>

 {educations.length === 0 ? (
 <p className="text-sm text-muted-foreground italic">
 Nenhuma formação acadêmica cadastrada.
 </p>
 ) : (
 <div className="space-y-6 divide-y divide-border/40">
 {visibleEducations.map((edu: any, index: number) => (
 <div key={edu.id || index} className={cn("space-y-2", index > 0 && "pt-6")}>
 <div className="flex items-start justify-between gap-4">
 <div className="flex items-start gap-3.5">
 <div className="size-12 rounded-2xl bg-muted/50 flex-shrink-0 flex items-center justify-center text-muted-foreground">
 <GraduationCap className="size-6 text-primary" />
 </div>
 <div className="space-y-1">
 <h3 className="text-base font-bold text-foreground leading-snug">
 {edu.school}
 </h3>
 <p className="text-xs text-foreground/80 font-medium">
 {[edu.degree, edu.field_of_study].filter(Boolean).join(", ")}
 </p>
 <p className="text-xs text-muted-foreground">
 {edu.start_date} – {edu.end_date || "Presente"}
 </p>
 </div>
 </div>
 {isOwner && (
 <Button
 size="sm"
 variant="ghost"
 className="size-7 p-0 rounded-lg text-muted-foreground hover:text-foreground"
 onClick={() => {
 setActiveEditItem(edu);
 setEditingSection("education");
 }}
 aria-label="Editar Formação"
 >
 <Edit3 className="size-3.5" />
 </Button>
 )}
 </div>

 {edu.description && (
 <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed pl-15 whitespace-pre-line">
 {edu.description}
 </p>
 )}

 {edu.media_urls && edu.media_urls.length > 0 && (
 <div className="flex flex-wrap gap-2 pl-15 pt-1">
 {edu.media_urls.map((url: string, mIdx: number) => (
 <div
 key={mIdx}
 className="size-16 rounded-xl overflow-hidden bg-muted/40 cursor-pointer hover:opacity-90 transition-opacity"
 onClick={() => setPreviewMediaUrl(url)}
 >
 <img src={url} alt="Foto de formatura" className="size-full object-cover" />
 </div>
 ))}
 </div>
 )}
 </div>
 ))}
 </div>
 )}

 {educations.length > 3 && (
 <Button
 variant="ghost"
 className="w-full h-10 rounded-2xl text-xs font-bold gap-1 text-muted-foreground hover:text-foreground"
 onClick={() => setShowAllEducations(!showAllEducations)}
 >
 <span>{showAllEducations ? "Recolher formações" : `Exibir todas as ${educations.length} formações ➔`}</span>
 </Button>
 )}
 </div>

 {/* ── 4. Seção Licenças e Certificados ── */}
 <div className="pt-8 space-y-6">
 <div className="flex items-center justify-between">
 <h2 className="text-lg font-bold text-foreground tracking-tight">Licenças e certificados</h2>
 {isOwner && (
 <Button
 size="sm"
 variant="ghost"
 className="size-8 p-0 rounded-xl text-muted-foreground hover:text-foreground"
 onClick={() => {
 setActiveEditItem(null);
 setEditingSection("certification");
 }}
 aria-label="Adicionar Certificado"
 >
 <Plus className="size-4" />
 </Button>
 )}
 </div>

 {certifications.length === 0 ? (
 <p className="text-sm text-muted-foreground italic">
 Nenhum certificado ou licença cadastrado.
 </p>
 ) : (
 <div className="space-y-6 divide-y divide-border/40">
 {visibleCertifications.map((cert: any, index: number) => (
 <div key={cert.id || index} className={cn("space-y-2", index > 0 && "pt-6")}>
 <div className="flex items-start justify-between gap-4">
 <div className="flex items-start gap-3.5">
 <div className="size-12 rounded-2xl bg-muted/50 flex-shrink-0 flex items-center justify-center">
 <Award className="size-6 text-amber-500" />
 </div>
 <div className="space-y-1">
 <h3 className="text-base font-bold text-foreground leading-snug">
 {cert.name}
 </h3>
 <p className="text-xs text-foreground/80 font-medium">{cert.issuer}</p>
 <p className="text-xs text-muted-foreground">
 Emitido em {cert.issue_date}
 </p>
 </div>
 </div>
 {isOwner && (
 <Button
 size="sm"
 variant="ghost"
 className="size-7 p-0 rounded-lg text-muted-foreground hover:text-foreground"
 onClick={() => {
 setActiveEditItem(cert);
 setEditingSection("certification");
 }}
 aria-label="Editar Certificado"
 >
 <Edit3 className="size-3.5" />
 </Button>
 )}
 </div>

 {cert.credential_url && (
 <div className="pl-15 pt-1">
 <Button
 asChild
 size="sm"
 variant="outline"
 className="h-8 rounded-xl text-xs font-semibold gap-1.5"
 >
 <a href={cert.credential_url} target="_blank" rel="noopener noreferrer">
 <span>Exibir credencial</span>
 <ExternalLink className="size-3.5" />
 </a>
 </Button>
 </div>
 )}
 </div>
 ))}
 </div>
 )}

 {certifications.length > 4 && (
 <Button
 variant="ghost"
 className="w-full h-10 rounded-2xl text-xs font-bold gap-1 text-muted-foreground hover:text-foreground"
 onClick={() => setShowAllCertifications(!showAllCertifications)}
 >
 <span>{showAllCertifications ? "Recolher certificados" : `Exibir todas as ${certifications.length} licenças ➔`}</span>
 </Button>
 )}
 </div>

 {/* ── 5. Seção Projetos ── */}
 <div className="pt-8 space-y-6">
 <div className="flex items-center justify-between">
 <h2 className="text-lg font-bold text-foreground tracking-tight">Projetos</h2>
 {isOwner && (
 <Button
 size="sm"
 variant="ghost"
 className="size-8 p-0 rounded-xl text-muted-foreground hover:text-foreground"
 onClick={() => {
 setActiveEditItem(null);
 setEditingSection("project");
 }}
 aria-label="Adicionar Projeto"
 >
 <Plus className="size-4" />
 </Button>
 )}
 </div>

 {projects.length === 0 ? (
 <p className="text-sm text-muted-foreground italic">
 Nenhum projeto em destaque publicado.
 </p>
 ) : (
 <div className="space-y-6 divide-y divide-border/40">
 {visibleProjects.map((proj: any, index: number) => (
 <div key={proj.id || index} className={cn("space-y-3", index > 0 && "pt-6")}>
 <div className="flex items-start justify-between gap-4">
 <div className="space-y-1">
 <h3 className="text-base font-bold text-foreground leading-snug">
 {proj.title}
 </h3>
 <p className="text-xs text-muted-foreground">
 {proj.start_date} – {proj.is_current ? "o momento" : proj.end_date}
 </p>
 {proj.associated_with && (
 <p className="text-xs text-foreground/80 font-medium">
 Associado a: {proj.associated_with}
 </p>
 )}
 </div>
 {isOwner && (
 <Button
 size="sm"
 variant="ghost"
 className="size-7 p-0 rounded-lg text-muted-foreground hover:text-foreground"
 onClick={() => {
 setActiveEditItem(proj);
 setEditingSection("project");
 }}
 aria-label="Editar Projeto"
 >
 <Edit3 className="size-3.5" />
 </Button>
 )}
 </div>

 {proj.project_url && (
 <div>
 <Button
 asChild
 size="sm"
 variant="outline"
 className="h-8 rounded-xl text-xs font-semibold gap-1.5"
 >
 <a href={proj.project_url} target="_blank" rel="noopener noreferrer">
 <span>Exibir projeto</span>
 <ExternalLink className="size-3.5" />
 </a>
 </Button>
 </div>
 )}

 {proj.description && (
 <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
 {proj.description}
 </p>
 )}
 </div>
 ))}
 </div>
 )}

 {projects.length > 3 && (
 <Button
 variant="ghost"
 className="w-full h-10 rounded-2xl text-xs font-bold gap-1 text-muted-foreground hover:text-foreground"
 onClick={() => setShowAllProjects(!showAllProjects)}
 >
 <span>{showAllProjects ? "Recolher projetos" : `Exibir todos os ${projects.length} projetos ➔`}</span>
 </Button>
 )}
 </div>

 {/* ── 6. Seção Voluntariado ── */}
 <div className="pt-8 space-y-6">
 <div className="flex items-center justify-between">
 <h2 className="text-lg font-bold text-foreground tracking-tight">Voluntariado</h2>
 {isOwner && (
 <Button
 size="sm"
 variant="ghost"
 className="size-8 p-0 rounded-xl text-muted-foreground hover:text-foreground"
 onClick={() => {
 setActiveEditItem(null);
 setEditingSection("volunteering");
 }}
 aria-label="Adicionar Voluntariado"
 >
 <Plus className="size-4" />
 </Button>
 )}
 </div>

 {volunteeringList.length === 0 ? (
 <p className="text-sm text-muted-foreground italic">
 Nenhuma experiência de voluntariado cadastrada.
 </p>
 ) : (
 <div className="space-y-6 divide-y divide-border/40">
 {visibleVolunteering.map((vol: any, index: number) => (
 <div key={vol.id || index} className={cn("space-y-2", index > 0 && "pt-6")}>
 <div className="flex items-start justify-between gap-4">
 <div className="flex items-start gap-3.5">
 <div className="size-12 rounded-2xl bg-muted/50 flex-shrink-0 flex items-center justify-center text-muted-foreground">
 <HeartHandshake className="size-6 text-rose-500" />
 </div>
 <div className="space-y-1">
 <h3 className="text-base font-bold text-foreground leading-snug">
 {vol.role}
 </h3>
 <p className="text-xs text-foreground/80 font-medium">{vol.organization}</p>
 <p className="text-xs text-muted-foreground">
 {vol.start_date} – {vol.is_current ? "o momento" : vol.end_date}
 </p>
 {vol.cause && (
 <Badge variant="secondary" className="text-[10px] px-2 py-0.5 rounded-lg bg-muted/60 font-semibold">
 {vol.cause}
 </Badge>
 )}
 </div>
 </div>
 {isOwner && (
 <Button
 size="sm"
 variant="ghost"
 className="size-7 p-0 rounded-lg text-muted-foreground hover:text-foreground"
 onClick={() => {
 setActiveEditItem(vol);
 setEditingSection("volunteering");
 }}
 aria-label="Editar Voluntariado"
 >
 <Edit3 className="size-3.5" />
 </Button>
 )}
 </div>

 {vol.description && (
 <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed pl-15 whitespace-pre-line">
 {vol.description}
 </p>
 )}
 </div>
 ))}
 </div>
 )}
 </div>

 {/* ── 7. Seção Causas ── */}
 <div className="pt-8 space-y-4">
 <div className="flex items-center justify-between">
 <h2 className="text-lg font-bold text-foreground tracking-tight">Causas</h2>
 {isOwner && (
 <Button
 size="sm"
 variant="ghost"
 className="size-8 p-0 rounded-xl text-muted-foreground hover:text-foreground"
 onClick={() => setEditingSection("causes")}
 aria-label="Editar Causas"
 >
 <Edit3 className="size-4" />
 </Button>
 )}
 </div>

 {causes.length === 0 ? (
 <p className="text-sm text-muted-foreground italic">
 Nenhuma causa social selecionada.
 </p>
 ) : (
 <p className="text-xs sm:text-sm text-foreground/90 font-medium leading-relaxed">
 {causes.join(" • ")}
 </p>
 )}
 </div>

 {/* ── 8. Seção Idiomas ── */}
 <div className="pt-8 space-y-4">
 <div className="flex items-center justify-between">
 <h2 className="text-lg font-bold text-foreground tracking-tight">Idiomas</h2>
 {isOwner && (
 <Button
 size="sm"
 variant="ghost"
 className="size-8 p-0 rounded-xl text-muted-foreground hover:text-foreground"
 onClick={() => setEditingSection("languages")}
 aria-label="Editar Idiomas"
 >
 <Edit3 className="size-4" />
 </Button>
 )}
 </div>

 {languagesList.length === 0 ? (
 <p className="text-sm text-muted-foreground italic">
 Português (Nativo ou Bilíngue)
 </p>
 ) : (
 <div className="space-y-3 divide-y divide-border/40">
 {languagesList.map((lang: any, index: number) => (
 <div key={index} className={cn("flex items-center justify-between", index > 0 && "pt-3")}>
 <div>
 <h4 className="text-sm font-bold text-foreground">{lang.language}</h4>
 <p className="text-xs text-muted-foreground">{lang.proficiency}</p>
 </div>
 </div>
 ))}
 </div>
 )}
 </div>
 </div>
 )}



 {/* ── Bloco 3: Perfil Social & Gestão de Atividades Estilo Instagram ── */}
 {activeMode === "social" && (
 <div className="space-y-6">
 {/* Navegação de Abas do Perfil Social — Tabs Sublinhadas Minimalistas (Apple HIG) */}
 <div className="flex items-center justify-between border-b border-border/60">
 <div className="flex items-center gap-6 sm:gap-8 overflow-x-auto no-scrollbar">
 <button
 type="button"
 onClick={() => setSocialTab("posts")}
 className={cn(
 "pb-3 text-xs sm:text-sm font-bold transition-all relative cursor-pointer whitespace-nowrap",
 socialTab === "posts"
 ? "text-foreground after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-primary"
 : "text-muted-foreground hover:text-foreground"
 )}
 >
 Publicações ({posts.length})
 </button>

 <button
 type="button"
 onClick={() => setSocialTab("media")}
 className={cn(
 "pb-3 text-xs sm:text-sm font-bold transition-all relative cursor-pointer whitespace-nowrap",
 socialTab === "media"
 ? "text-foreground after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-primary"
 : "text-muted-foreground hover:text-foreground"
 )}
 >
 Fotos & Mídias
 </button>

 {isOwner && (
 <>
 <button
 type="button"
 onClick={() => setSocialTab("saved")}
 className={cn(
 "pb-3 text-xs sm:text-sm font-bold transition-all relative cursor-pointer whitespace-nowrap",
 socialTab === "saved"
 ? "text-foreground after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-primary"
 : "text-muted-foreground hover:text-foreground"
 )}
 >
 Salvos
 </button>

 <button
 type="button"
 onClick={() => setSocialTab("liked")}
 className={cn(
 "pb-3 text-xs sm:text-sm font-bold transition-all relative cursor-pointer whitespace-nowrap",
 socialTab === "liked"
 ? "text-foreground after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-primary"
 : "text-muted-foreground hover:text-foreground"
 )}
 >
 Curtidos
 </button>
 </>
 )}
 </div>

 {/* Alternador de Visualização (Grade 3x3 vs Feed Linear) */}
 {socialTab === "posts" && posts.length > 0 && (
 <div className="hidden sm:flex items-center gap-1 bg-muted/40 p-1 rounded-xl mb-1.5 border border-border/40">
 <Button
 size="sm"
 variant="ghost"
 className={cn("size-7 p-0 rounded-lg cursor-pointer", postViewMode === "feed" && "bg-background shadow-xs")}
 onClick={() => setPostViewMode("feed")}
 aria-label="Modo Feed"
 >
 <List className="size-3.5" />
 </Button>
 <Button
 size="sm"
 variant="ghost"
 className={cn("size-7 p-0 rounded-lg cursor-pointer", postViewMode === "grid" && "bg-background shadow-xs")}
 onClick={() => setPostViewMode("grid")}
 aria-label="Modo Grade"
 >
 <Grid className="size-3.5" />
 </Button>
 </div>
 )}
 </div>

 {/* Conteúdo da Aba: Publicações */}
 {socialTab === "posts" && (
 <div className="space-y-6">
 {posts.length === 0 ? (
 <div className="py-16 text-center text-muted-foreground space-y-3 rounded-2xl bg-card border border-border/40">
 <MessageSquare className="size-10 mx-auto text-muted-foreground/30" />
 <p className="text-sm font-medium">Nenhuma publicação compartilhada ainda.</p>
 </div>
 ) : postViewMode === "grid" ? (
 <div className="grid grid-cols-3 gap-2 sm:gap-3">
 {posts.map((p: any) => {
 const media = p.media_urls?.[0] || p.media_url;
 return (
 <div
 key={p.id}
 className="aspect-square rounded-xl sm:rounded-2xl bg-muted/30 overflow-hidden relative cursor-pointer group select-none border border-border/40 hover:border-border transition-colors"
 onClick={() => {
 if (media) {
 setSelectedLightboxPost(p);
 setSelectedLightboxIndex(0);
 }
 }}
 >
 {media ? (
 <img
 src={media}
 alt="Mídia"
 className="size-full object-cover group-hover:scale-105 transition-transform duration-300"
 />
 ) : (
 <div className="size-full p-2.5 sm:p-4 flex flex-col justify-between bg-gradient-to-br from-muted/40 via-muted/20 to-background">
 <p className="line-clamp-3 sm:line-clamp-4 font-medium leading-relaxed text-[10px] sm:text-xs text-foreground/90">
 {p.content || p.content_text}
 </p>
 <div className="flex items-center justify-between text-[9px] text-muted-foreground pt-1 border-t border-border/30">
 <span>{formatDate(p.created_at)}</span>
 <MessageSquare className="size-2.5 text-muted-foreground/50" />
 </div>
 </div>
 )}

 {/* Hover Overlay com Curtidas e Comentários (Instagram Style) */}
 <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3 sm:gap-4 text-white font-bold text-xs pointer-events-none">
 <span className="flex items-center gap-1">
 <Heart className="size-3.5 sm:size-4 fill-white" />
 {p.likes_count || 0}
 </span>
 <span className="flex items-center gap-1">
 <MessageCircle className="size-3.5 sm:size-4 fill-white" />
 {p.comments_count || 0}
 </span>
 </div>
 </div>
 );
 })}
 </div>
 ) : (
 /* Modo Feed Linear Flat — Zero Grid-in-Grid */
 <div className="space-y-4">
 {posts.map((p: any) => (
 <div key={p.id} className="rounded-2xl bg-card border border-border/60 p-4 sm:p-5">
 <CommunityFeedCard
 post={{
 id: p.id,
 author: {
 id: profile.id,
 full_name: profile.full_name,
 username: profile.username,
 avatar_url: avatarSrc,
 is_verified: profile.is_verified,
 },
 content_text: p.content,
 media_urls: p.media_url ? [p.media_url] : [],
 created_at: p.created_at,
 likes_count: p.likes_count || 0,
 replies_count: p.comments_count || 0,
 }}
 onPreviewMedia={(url) => setPreviewMediaUrl(url)}
 />
 </div>
 ))}
 </div>
 )}
 </div>
 )}

 {/* Conteúdo da Aba: Fotos & Mídias */}
 {socialTab === "media" && (
 <div className="space-y-6">
 {posts.filter((p: any) => !!p.media_url).length === 0 ? (
 <div className="py-16 text-center text-muted-foreground space-y-3 rounded-2xl bg-card border border-border/40">
 <Grid className="size-10 mx-auto text-muted-foreground/30" />
 <p className="text-sm font-medium">Nenhuma foto ou vídeo compartilhado ainda.</p>
 </div>
 ) : (
 <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
 {posts.filter((p: any) => !!p.media_url).map((p: any) => (
 <div
 key={p.id}
 className="aspect-square rounded-2xl bg-muted/40 overflow-hidden relative cursor-pointer group"
 onClick={() => setPreviewMediaUrl(p.media_url)}
 >
 <img src={p.media_url} alt="Galeria" className="size-full object-cover group-hover:scale-105 transition-transform" />
 </div>
 ))}
 </div>
 )}
 </div>
 )}

 {/* Conteúdo da Aba: Salvos (Apenas Proprietário) */}
 {isOwner && socialTab === "saved" && (
 <div className="py-16 text-center text-muted-foreground space-y-3 rounded-2xl bg-card border border-border/40">
 <Tag className="size-10 mx-auto text-muted-foreground/30" />
 <p className="text-sm font-medium">Seus itens salvos aparecerão aqui de forma privada.</p>
 </div>
 )}

 {/* Conteúdo da Aba: Curtidos (Apenas Proprietário) */}
 {isOwner && socialTab === "liked" && (
 <div className="py-16 text-center text-muted-foreground space-y-3 rounded-2xl bg-card border border-border/40">
 <Layers className="size-10 mx-auto text-muted-foreground/30" />
 <p className="text-sm font-medium">Publicações que você curtiu na Comunidade Waesy.</p>
 </div>
 )}

 {/* Conteúdo da Aba: Eventos da Marca/Artista */}
 {socialTab === "events" && (
 <div className="space-y-4">
 {creatorEvents.length === 0 ? (
 <div className="py-16 text-center text-muted-foreground space-y-3 rounded-2xl bg-card border border-border/40">
 <Calendar className="size-10 mx-auto text-muted-foreground/30" />
 <p className="text-sm font-medium">Nenhum evento público agendado no momento.</p>
 </div>
 ) : (
 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
 {creatorEvents.map((evt: any) => (
 <div
 key={evt.id}
 className="p-4 rounded-2xl border border-border/60 bg-card flex items-start gap-4 shadow-xs"
 >
 <div className="size-16 rounded-xl bg-muted/60 overflow-hidden shrink-0 border border-border/40">
 {evt.cover_image ? (
 <img src={evt.cover_image} alt={evt.title} className="size-full object-cover" />
 ) : (
 <div className="size-full flex items-center justify-center text-muted-foreground">
 <Calendar className="size-6" />
 </div>
 )}
 </div>
 <div className="space-y-1 min-w-0 flex-1">
 <h4 className="text-sm font-bold text-foreground truncate">{evt.title}</h4>
 <p className="text-xs text-muted-foreground">
 {evt.event_date ? formatDate(evt.event_date) : "Data a definir"} • {evt.location || evt.city || "Chapecó"}
 </p>
 <Badge variant="secondary" className="text-[10px]">
 {evt.is_free ? "Gratuito" : formatMoney(evt.price_cents || 0)}
 </Badge>
 </div>
 </div>
 ))}
 </div>
 )}
 </div>
 )}
 </div>
 )}

 {/* ── Bloco 4: Perfil Comercial / Vitrine da Marca ou Classificados Pessoais ── */}
 {activeMode === "comercial" && (
 <div className="space-y-6">
 {isCreator ? (
 /* Vitrine Pública de Criador / Marca */
 <div className="space-y-8">
 {(creatorProfile?.showcase_order || ["banner", "stores", "products", "events"]).map((sectionKey: string) => {
 if (sectionKey === "banner" && creatorProfile?.banner_url) {
 return (
 <div key="banner" className="space-y-3">
 <div className="aspect-video sm:aspect-[21/9] w-full rounded-2xl overflow-hidden relative border border-border/40 shadow-xs">
 <img
 src={creatorProfile.banner_url}
 alt={creatorProfile.banner_title || "Banner da marca"}
 className="w-full h-full object-cover"
 />
 <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent flex flex-col justify-end p-5 sm:p-6 text-white space-y-1">
 <span className="text-[10px] uppercase tracking-wider font-semibold text-primary-foreground/80">
 Destaque da Marca
 </span>
 <h3 className="text-lg sm:text-2xl font-black">
 {creatorProfile.banner_title || "Novidades & Recomendações"}
 </h3>
 {creatorProfile.banner_link && (
 <div className="pt-2">
 <Button asChild size="sm" className="h-9 px-4 rounded-xl text-xs font-semibold gap-1.5 bg-white text-black hover:bg-white/90">
 <a href={creatorProfile.banner_link} target="_blank" rel="noopener noreferrer">
 <span>Acessar Destaque</span>
 <ExternalLink className="size-3.5" />
 </a>
 </Button>
 </div>
 )}
 </div>
 </div>
 </div>
 );
 }

 if (sectionKey === "stores" && creatorPartnerStores.length > 0) {
 return (
 <div key="stores" className="space-y-4">
 <div>
 <h3 className="text-base font-bold text-foreground tracking-tight flex items-center gap-2">
 <Store className="size-4 text-primary" />
 <span>Lojas Parceiras com Cupons Exclusivos</span>
 </h3>
 <p className="text-xs text-muted-foreground">
 Utilize meus cupons nas compras para garantir 10% de desconto.
 </p>
 </div>

 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
 {creatorPartnerStores.map((s: any) => {
 const couponCode = `${(creatorProfile?.handle || profile.username || "WAESY").toUpperCase().slice(0, 6)}10`;

 return (
 <div
 key={s.id}
 className="p-5 rounded-2xl border border-border/60 bg-card flex flex-col justify-between gap-4 shadow-xs"
 >
 <div className="flex items-start gap-3">
 <div className="size-12 rounded-xl bg-muted/60 overflow-hidden shrink-0 border border-border/40 flex items-center justify-center">
 {s.logoUrl || s.logo_url ? (
 <img src={s.logoUrl || s.logo_url} alt={s.name} className="size-full object-cover" />
 ) : (
 <Store className="size-5 text-muted-foreground" />
 )}
 </div>
 <div className="space-y-0.5 min-w-0">
 <h4 className="text-sm font-bold text-foreground truncate">{s.name}</h4>
 <p className="text-xs text-muted-foreground truncate">{s.city} • {s.segment || "Varejo"}</p>
 </div>
 </div>

 <div className="p-3 rounded-xl bg-primary/5 border border-primary/20 flex items-center justify-between">
 <div>
 <span className="text-[10px] text-muted-foreground uppercase font-medium">Cupom 10% OFF</span>
 <p className="text-xs font-mono font-bold text-primary">{couponCode}</p>
 </div>
 <Button
 type="button"
 variant="outline"
 size="sm"
 onClick={() => {
 navigator.clipboard.writeText(couponCode);
 toast.success(`Cupom ${couponCode} copiado!`);
 }}
 className="h-8 px-3 rounded-lg text-xs font-semibold gap-1"
 >
 <Copy className="size-3" />
 <span>Copiar</span>
 </Button>
 </div>

 <Button asChild size="sm" className="w-full h-10 rounded-xl text-xs font-semibold gap-1.5">
 <Link to="/c/$storeSlug" params={{ storeSlug: s.slug }} search={{ ref: creatorProfile?.handle || profile.username, coupon: couponCode }}>
 <span>Visitar Loja com Cupom</span>
 <ArrowRight className="size-3.5" />
 </Link>
 </Button>
 </div>
 );
 })}
 </div>
 </div>
 );
 }

 if (sectionKey === "products" && creatorShowcaseProducts.length > 0) {
 return (
 <div key="products" className="space-y-4">
 <div>
 <h3 className="text-base font-bold text-foreground tracking-tight flex items-center gap-2">
 <ShoppingBag className="size-4 text-primary" />
 <span>Produtos Selecionados & Recomendados</span>
 </h3>
 <p className="text-xs text-muted-foreground">
 Itens recomendados das melhores lojas locais parceiras.
 </p>
 </div>

 <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
 {creatorShowcaseProducts.map((p: any) => {
 const image = p.imageUrl || (Array.isArray(p.images) ? p.images[0] : null);
 const price = p.priceCents ?? p.price_cents ?? 0;

 return (
 <Link
 key={p.id}
 to="/produto/$slug"
 params={{ slug: p.slug }}
 search={{ ref: creatorProfile?.handle || profile.username } as any}
 className="group rounded-2xl bg-card border border-border/60 hover:border-primary/40 transition-all overflow-hidden flex flex-col justify-between shadow-xs"
 >
 <div className="space-y-3">
 <div className="aspect-video bg-muted/40 relative overflow-hidden">
 {image ? (
 <img
 src={image}
 alt={p.name}
 className="size-full object-cover group-hover:scale-105 transition-transform duration-300"
 />
 ) : (
 <div className="size-full flex items-center justify-center text-muted-foreground">
 <ShoppingBag className="size-8" />
 </div>
 )}
 <div className="absolute top-2 right-2 px-2.5 py-1 rounded-xl bg-background/90 backdrop-blur-md text-xs font-extrabold text-primary">
 {formatMoney(price)}
 </div>
 </div>

 <div className="p-4 space-y-1">
 <span className="text-[10px] text-muted-foreground uppercase font-medium">
 {p.storeName || p.store?.name || "Loja Parceira"}
 </span>
 <h4 className="text-sm font-bold text-foreground line-clamp-1 group-hover:text-primary transition-colors">
 {p.name}
 </h4>
 {p.description && (
 <p className="text-xs text-muted-foreground line-clamp-2">{p.description}</p>
 )}
 </div>
 </div>

 <div className="p-4 pt-0">
 <div className="w-full h-9 rounded-xl bg-muted/40 hover:bg-muted text-xs font-semibold flex items-center justify-center gap-1.5 text-foreground">
 <span>Ver Detalhes do Produto</span>
 <ArrowRight className="size-3.5" />
 </div>
 </div>
 </Link>
 );
 })}
 </div>
 </div>
 );
 }

 if (sectionKey === "events" && creatorEvents.length > 0) {
 return (
 <div key="events" className="space-y-4">
 <div>
 <h3 className="text-base font-bold text-foreground tracking-tight flex items-center gap-2">
 <Calendar className="size-4 text-primary" />
 <span>Agenda & Próximos Eventos da Marca</span>
 </h3>
 <p className="text-xs text-muted-foreground">
 Shows, workshops e apresentações em que participo ou coordeno.
 </p>
 </div>

 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
 {creatorEvents.map((evt: any) => (
 <div
 key={evt.id}
 className="p-4 rounded-2xl border border-border/60 bg-card flex items-start gap-3.5 shadow-xs"
 >
 <div className="size-16 rounded-xl bg-muted/60 overflow-hidden shrink-0 border border-border/40">
 {evt.cover_image ? (
 <img src={evt.cover_image} alt={evt.title} className="size-full object-cover" />
 ) : (
 <div className="size-full flex items-center justify-center text-muted-foreground">
 <Calendar className="size-6" />
 </div>
 )}
 </div>

 <div className="space-y-1 min-w-0 flex-1">
 <h4 className="text-sm font-bold text-foreground truncate">{evt.title}</h4>
 <p className="text-xs text-muted-foreground">
 {evt.event_date ? formatDate(evt.event_date) : "Em breve"} • {evt.location || evt.city || "Chapecó"}
 </p>
 <Badge variant="secondary" className="text-[10px]">
 {evt.is_free ? "Gratuito" : formatMoney(evt.price_cents || 0)}
 </Badge>
 </div>
 </div>
 ))}
 </div>
 </div>
 );
 }

 return null;
 })}
 </div>
 ) : (
 /* Perfil Comum (Pessoa Física): Lojas Oficiais e Classificados Pessoais */
 <>
 {stores.length > 0 && (
 <div className="pt-8 space-y-6">
 <h2 className="text-lg font-bold text-foreground tracking-tight">Lojas & Espaços Oficiais</h2>
 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
 {stores.map((s: any) => (
 <Link
 key={s.id}
 to="/perfil-da-loja"
 search={{ slug: s.slug }}
 className="p-4 rounded-2xl bg-muted/30 hover:bg-muted/50 transition-colors flex items-center gap-4 group"
 >
 <div className="size-14 rounded-2xl bg-background flex items-center justify-center overflow-hidden flex-shrink-0">
 {s.logo_url ? (
 <img src={s.logo_url} alt={s.name} className="size-full object-cover" />
 ) : (
 <Store className="size-6 text-primary" />
 )}
 </div>
 <div className="space-y-1 min-w-0 flex-1">
 <h3 className="text-base font-bold text-foreground truncate group-hover:text-primary transition-colors">
 {s.name}
 </h3>
 <p className="text-xs text-muted-foreground truncate">{s.description || "Loja da Rede Waesy"}</p>
 </div>
 </Link>
 ))}
 </div>
 </div>
 )}

 <div className="pt-8 space-y-6">
 <h2 className="text-lg font-bold text-foreground tracking-tight">Classificados & Desapegos</h2>
 {classifieds.length === 0 ? (
 <div className="py-12 text-center text-muted-foreground space-y-2">
 <ShoppingBag className="size-8 mx-auto text-muted-foreground/40" />
 <p className="text-sm">Nenhum anúncio ativo no momento.</p>
 </div>
 ) : (
 <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
 {classifieds.map((item: any) => (
 <Link
 key={item.id}
 to="/classificados/$id"
 params={{ id: item.id }}
 className="group rounded-2xl bg-muted/20 hover:bg-muted/40 transition-all overflow-hidden flex flex-col"
 >
 <div className="aspect-[4/3] bg-muted/40 relative overflow-hidden">
 {item.images?.[0] ? (
 <img
 src={item.images[0]}
 alt={item.title}
 className="size-full object-cover group-hover:scale-105 transition-transform duration-300"
 />
 ) : (
 <div className="size-full flex items-center justify-center text-muted-foreground/40">
 <ShoppingBag className="size-8" />
 </div>
 )}
 <div className="absolute top-2 right-2 px-2.5 py-1 rounded-xl bg-background/90 backdrop-blur-md text-xs font-extrabold text-foreground">
 {formatMoney(item.price)}
 </div>
 </div>
 <div className="p-4 space-y-1">
 <h4 className="text-sm font-bold text-foreground truncate group-hover:text-primary transition-colors">
 {item.title}
 </h4>
 <p className="text-xs text-muted-foreground truncate">{item.category || "Classificado"}</p>
 </div>
 </Link>
 ))}
 </div>
 )}
 </div>
 </>
 )}
 </div>
 )}

 {/* ── Modais de Edição In-Place ── */}
 {isOwner && (
 <>
 {/* Modal Disponível Para */}
 <AvailabilityEditModal
 open={editingSection === "availability"}
 onOpenChange={(op) => !op && setEditingSection(null)}
 initialData={availability}
 onSave={(newAvail) => {
 saveResumeChanges({ ...resumeData, availability: newAvail });
 }}
 isSaving={isSavingResume}
 />

 {/* Modal Sobre */}
 <AboutEditModal
 open={editingSection === "about"}
 onOpenChange={(op) => !op && setEditingSection(null)}
 initialHeadline={profile.headline || ""}
 initialSummary={aboutSummary}
 onSave={({ headline, summary }) => {
 saveResumeChanges({ ...resumeData, headline, summary });
 }}
 isSaving={isSavingResume}
 />

 {/* Modal Experiência */}
 <ExperienceEditModal
 open={editingSection === "experience"}
 onOpenChange={(op) => {
 if (!op) {
 setEditingSection(null);
 setActiveEditItem(null);
 }
 }}
 item={activeEditItem}
 onSave={(itemToSave, isDelete) => {
 let updatedExps = [...experiences];
 if (isDelete && activeEditItem) {
 updatedExps = updatedExps.filter((e) => e.id !== activeEditItem.id);
 } else if (activeEditItem) {
 updatedExps = updatedExps.map((e) => (e.id === activeEditItem.id ? itemToSave : e));
 } else {
 updatedExps = [itemToSave, ...updatedExps];
 }
 saveResumeChanges({ ...resumeData, experiences: updatedExps });
 }}
 isSaving={isSavingResume}
 />

 {/* Modal Formação Acadêmica */}
 <EducationEditModal
 open={editingSection === "education"}
 onOpenChange={(op) => {
 if (!op) {
 setEditingSection(null);
 setActiveEditItem(null);
 }
 }}
 item={activeEditItem}
 onSave={(itemToSave, isDelete) => {
 let updated = [...educations];
 if (isDelete && activeEditItem) {
 updated = updated.filter((e) => e.id !== activeEditItem.id);
 } else if (activeEditItem) {
 updated = updated.map((e) => (e.id === activeEditItem.id ? itemToSave : e));
 } else {
 updated = [itemToSave, ...updated];
 }
 saveResumeChanges({ ...resumeData, educations: updated });
 }}
 isSaving={isSavingResume}
 />

 {/* Modal Licenças e Certificados */}
 <CertificationEditModal
 open={editingSection === "certification"}
 onOpenChange={(op) => {
 if (!op) {
 setEditingSection(null);
 setActiveEditItem(null);
 }
 }}
 item={activeEditItem}
 onSave={(itemToSave, isDelete) => {
 let updated = [...certifications];
 if (isDelete && activeEditItem) {
 updated = updated.filter((e) => e.id !== activeEditItem.id);
 } else if (activeEditItem) {
 updated = updated.map((e) => (e.id === activeEditItem.id ? itemToSave : e));
 } else {
 updated = [itemToSave, ...updated];
 }
 saveResumeChanges({ ...resumeData, certifications: updated });
 }}
 isSaving={isSavingResume}
 />

 {/* Modal Projetos */}
 <ProjectEditModal
 open={editingSection === "project"}
 onOpenChange={(op) => {
 if (!op) {
 setEditingSection(null);
 setActiveEditItem(null);
 }
 }}
 item={activeEditItem}
 onSave={(itemToSave, isDelete) => {
 let updated = [...projects];
 if (isDelete && activeEditItem) {
 updated = updated.filter((e) => e.id !== activeEditItem.id);
 } else if (activeEditItem) {
 updated = updated.map((e) => (e.id === activeEditItem.id ? itemToSave : e));
 } else {
 updated = [itemToSave, ...updated];
 }
 saveResumeChanges({ ...resumeData, projects: updated });
 }}
 isSaving={isSavingResume}
 />

 {/* Modal Voluntariado */}
 <VolunteeringEditModal
 open={editingSection === "volunteering"}
 onOpenChange={(op) => {
 if (!op) {
 setEditingSection(null);
 setActiveEditItem(null);
 }
 }}
 item={activeEditItem}
 onSave={(itemToSave, isDelete) => {
 let updated = [...volunteeringList];
 if (isDelete && activeEditItem) {
 updated = updated.filter((e) => e.id !== activeEditItem.id);
 } else if (activeEditItem) {
 updated = updated.map((e) => (e.id === activeEditItem.id ? itemToSave : e));
 } else {
 updated = [itemToSave, ...updated];
 }
 saveResumeChanges({ ...resumeData, volunteering: updated });
 }}
 isSaving={isSavingResume}
 />

 {/* Modal Causas Sociais */}
 <CausesEditModal
 open={editingSection === "causes"}
 onOpenChange={(op) => !op && setEditingSection(null)}
 selectedCauses={causes}
 onSave={(newCauses) => {
 saveResumeChanges({ ...resumeData, causes: newCauses });
 }}
 isSaving={isSavingResume}
 />

 {/* Modal Idiomas */}
 <LanguagesEditModal
 open={editingSection === "languages"}
 onOpenChange={(op) => !op && setEditingSection(null)}
 initialLanguages={languagesList}
 onSave={(newLanguages) => {
 saveResumeChanges({ ...resumeData, languages: newLanguages });
 }}
 isSaving={isSavingResume}
 />

 {/* Modal Editar Perfil & Vitrine da Marca */}
 {isCreator && (
 <CreatorProfileEditModal
 open={editingSection === "creator_profile"}
 onOpenChange={(op) => !op && setEditingSection(null)}
 creatorProfile={creatorProfile}
 profile={profile}
 onSaveSuccess={() => {
 router.invalidate();
 }}
 />
 )}
 </>
 )}
 </div>
 );
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENTES MODAIS DE EDIÇÃO RÁPIDA (In-Place Edit SheetPages)
// ─────────────────────────────────────────────────────────────────────────────

function CreatorProfileEditModal({
  open,
  onOpenChange,
  creatorProfile,
  profile,
  onSaveSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  creatorProfile: any;
  profile: any;
  onSaveSuccess: () => void;
}) {
  const initialData: Partial<CreatorProfileSheetData> = {
    handle: (creatorProfile?.handle || profile?.username || "").toLowerCase().trim(),
    stageName: creatorProfile?.stage_name || creatorProfile?.name || profile?.full_name || "",
    bio: creatorProfile?.bio || "",
    category: creatorProfile?.category || creatorProfile?.niche || "moda_estilo",
    avatarUrl: creatorProfile?.avatar_url || "",
    coverUrl: creatorProfile?.cover_url || "",
    socialLinks: creatorProfile?.social_links || {},
    pinnedProducts: creatorProfile?.pinned_products || [],
    privacyMode: creatorProfile?.privacy_mode || "public",
    isAnonymous: creatorProfile?.is_anonymous ?? false,
  };

  return (
    <CreatorProfileSheetEditor
      open={open}
      onOpenChange={onOpenChange}
      initialData={initialData}
      isNew={false}
      onSuccess={() => {
        onSaveSuccess();
      }}
    />
  );
}

function AvailabilityEditModal({
 open,
 onOpenChange,
 initialData,
 onSave,
 isSaving,
}: {
 open: boolean;
 onOpenChange: (op: boolean) => void;
 initialData: any;
 onSave: (data: any) => void;
 isSaving: boolean;
}) {
 const [openToWork, setOpenToWork] = useState(Boolean(initialData?.open_to_work?.active));
 const [rolesStr, setRolesStr] = useState(initialData?.open_to_work?.roles?.join(", ") || "");
 const [hiring, setHiring] = useState(Boolean(initialData?.hiring?.active));
 const [hiringRolesStr, setHiringRolesStr] = useState(initialData?.hiring?.roles?.join(", ") || "");
 const [providingServices, setProvidingServices] = useState(Boolean(initialData?.providing_services?.active));
 const [servicesStr, setServicesStr] = useState(initialData?.providing_services?.services?.join(", ") || "");
 const [volunteering, setVolunteering] = useState(Boolean(initialData?.volunteering?.active));

 const handleSubmit = (e: React.FormEvent) => {
 e.preventDefault();
 onSave({
 open_to_work: {
 active: openToWork,
 roles: rolesStr.split(",").map((s: string) => s.trim()).filter(Boolean),
 },
 hiring: {
 active: hiring,
 roles: hiringRolesStr.split(",").map((s: string) => s.trim()).filter(Boolean),
 },
 providing_services: {
 active: providingServices,
 services: servicesStr.split(",").map((s: string) => s.trim()).filter(Boolean),
 },
 volunteering: {
 active: volunteering,
 },
 });
 };

 return (
 <Sheet open={open} onOpenChange={onOpenChange}>
 <SheetContent side="right" size="wide" className="w-full sm:max-w-3xl md:max-w-4xl lg:max-w-[70vw] xl:max-w-[70vw] md:max-w-2xl p-0 flex flex-col h-full bg-background overflow-hidden border-l border-border">
 <div className="p-6 pb-4 border-b border-border/40 shrink-0 flex items-center justify-between">
 <SheetTitle className="text-xl font-extrabold text-foreground">Disponibilidade de Perfil</SheetTitle>
 </div>

 <form onSubmit={handleSubmit} className="flex-1 flex flex-col justify-between overflow-hidden">
 <div className="flex-1 overflow-y-auto p-6 space-y-4 no-scrollbar">
 {/* Opção 1: Open To Work */}
 <div className="p-4 rounded-2xl bg-muted/30 space-y-3">
 <div className="flex items-center justify-between">
 <div className="flex items-center gap-2.5">
 <Briefcase className="size-4 text-emerald-500" />
 <div>
 <h4 className="text-sm font-bold text-foreground">Encontrar um novo emprego (#OpenToWork)</h4>
 
 </div>
 </div>
 <input
 type="checkbox"
 checked={openToWork}
 onChange={(e) => setOpenToWork(e.target.checked)}
 className="size-5 rounded-lg accent-primary cursor-pointer"
 />
 </div>
 {openToWork && (
 <div className="space-y-1.5 pt-2">
 <Label className="text-xs font-semibold">Cargos de interesse</Label>
 <Input
 value={rolesStr}
 onChange={(e) => setRolesStr(e.target.value)}
 placeholder="Ex: Gerente de Loja, Vendedora, Desenvolvedor"
 className="h-10 rounded-xl"
 />
 </div>
 )}
 </div>

 {/* Opção 2: Hiring */}
 <div className="p-4 rounded-2xl bg-muted/30 space-y-3">
 <div className="flex items-center justify-between">
 <div className="flex items-center gap-2.5">
 <UserPlus className="size-4 text-info" />
 <div>
 <h4 className="text-sm font-bold text-foreground">Contratar talentos (#Hiring)</h4>
 
 </div>
 </div>
 <input
 type="checkbox"
 checked={hiring}
 onChange={(e) => setHiring(e.target.checked)}
 className="size-5 rounded-lg accent-primary cursor-pointer"
 />
 </div>
 {hiring && (
 <div className="space-y-1.5 pt-2">
 <Label className="text-xs font-semibold">Vagas abertas</Label>
 <Input
 value={hiringRolesStr}
 onChange={(e) => setHiringRolesStr(e.target.value)}
 placeholder="Ex: Barista, Atendente, Entregador"
 className="h-10 rounded-xl"
 />
 </div>
 )}
 </div>

 {/* Opção 3: Prestando Serviços */}
 <div className="p-4 rounded-2xl bg-muted/30 space-y-3">
 <div className="flex items-center justify-between">
 <div className="flex items-center gap-2.5">
 <Layers className="size-4 text-violet-500" />
 <div>
 <h4 className="text-sm font-bold text-foreground">Prestar serviços autônomos</h4>
 <p className="text-xs text-muted-foreground">Destaque sua prestação de serviços para novos clientes</p>
 </div>
 </div>
 <input
 type="checkbox"
 checked={providingServices}
 onChange={(e) => setProvidingServices(e.target.checked)}
 className="size-5 rounded-lg accent-primary cursor-pointer"
 />
 </div>
 {providingServices && (
 <div className="space-y-1.5 pt-2">
 <Label className="text-xs font-semibold">Serviços oferecidos</Label>
 <Input
 value={servicesStr}
 onChange={(e) => setServicesStr(e.target.value)}
 placeholder="Ex: Fotografia, Social Media, Reformas"
 className="h-10 rounded-xl"
 />
 </div>
 )}
 </div>

 {/* Opção 4: Voluntariado */}
 <div className="p-4 rounded-2xl bg-muted/30 flex items-center justify-between">
 <div className="flex items-center gap-2.5">
 <HeartHandshake className="size-4 text-rose-500" />
 <div>
 <h4 className="text-sm font-bold text-foreground">Voluntariado ativo</h4>
 
 </div>
 </div>
 <input
 type="checkbox"
 checked={volunteering}
 onChange={(e) => setVolunteering(e.target.checked)}
 className="size-5 rounded-lg accent-primary cursor-pointer"
 />
 </div>
 </div>

 <div className="p-5 border-t border-border/40 shrink-0 bg-background/95 backdrop-blur-sm flex items-center justify-end gap-3">
 <Button type="button" variant="outline" className="rounded-xl" onClick={() => onOpenChange(false)}>
 Cancelar
 </Button>
 <Button type="submit" className="rounded-xl font-bold bg-primary text-primary-foreground" disabled={isSaving}>
 {isSaving ? "Salvando..." : "Salvar Alterações"}
 </Button>
 </div>
 </form>
 </SheetContent>
 </Sheet>
 );
}

function AboutEditModal({
 open,
 onOpenChange,
 initialHeadline,
 initialSummary,
 onSave,
 isSaving,
}: {
 open: boolean;
 onOpenChange: (op: boolean) => void;
 initialHeadline: string;
 initialSummary: string;
 onSave: (data: { headline: string; summary: string }) => void;
 isSaving: boolean;
}) {
 const [headline, setHeadline] = useState(initialHeadline);
 const [summary, setSummary] = useState(initialSummary);

 const handleSubmit = (e: React.FormEvent) => {
 e.preventDefault();
 onSave({ headline, summary });
 };

 return (
 <Sheet open={open} onOpenChange={onOpenChange}>
 <SheetContent side="right" size="wide" className="w-full sm:max-w-3xl md:max-w-4xl lg:max-w-[70vw] xl:max-w-[70vw] md:max-w-2xl p-0 flex flex-col h-full bg-background overflow-hidden border-l border-border">
 <div className="p-6 pb-4 border-b border-border/40 shrink-0 flex items-center justify-between">
 <SheetTitle className="text-xl font-extrabold text-foreground">Sobre & Título</SheetTitle>
 </div>

 <form onSubmit={handleSubmit} className="flex-1 flex flex-col justify-between overflow-hidden">
 <div className="flex-1 overflow-y-auto p-6 space-y-5 no-scrollbar">
 <div className="space-y-1.5">
 <Label className="text-xs font-semibold">Título / Headline</Label>
 <Input
 value={headline}
 onChange={(e) => setHeadline(e.target.value)}
 placeholder="Ex: Gerente Administrativo • Apaixonado por Comunidade"
 className="h-10 rounded-xl"
 />
 </div>

 <div className="space-y-1.5">
 <Label className="text-xs font-semibold">Resumo (Sobre)</Label>
 <Textarea
 value={summary}
 onChange={(e) => setSummary(e.target.value)}
 rows={8}
 placeholder="Descreva suas experiências, realizações e projetos..."
 className="rounded-2xl text-xs sm:text-sm"
 />
 </div>
 </div>

 <div className="p-5 border-t border-border/40 shrink-0 bg-background/95 backdrop-blur-sm flex items-center justify-end gap-3">
 <Button type="button" variant="outline" className="rounded-xl" onClick={() => onOpenChange(false)}>
 Cancelar
 </Button>
 <Button type="submit" className="rounded-xl font-bold bg-primary text-primary-foreground" disabled={isSaving}>
 {isSaving ? "Salvando..." : "Salvar Resumo"}
 </Button>
 </div>
 </form>
 </SheetContent>
 </Sheet>
 );
}

function ExperienceEditModal({
 open,
 onOpenChange,
 item,
 onSave,
 isSaving,
}: {
 open: boolean;
 onOpenChange: (op: boolean) => void;
 item: any;
 onSave: (item: any, isDelete?: boolean) => void;
 isSaving: boolean;
}) {
 const [title, setTitle] = useState(item?.title || "");
 const [company, setCompany] = useState(item?.company || "");
 const [storeId, setStoreId] = useState(item?.store_id || "");
 const [storeLogo, setStoreLogo] = useState(item?.store_logo || "");
 const [employmentType, setEmploymentType] = useState(item?.employment_type || "Tempo integral");
 const [location, setLocation] = useState(item?.location || "");
 const [locationType, setLocationType] = useState(item?.location_type || "No local");
 const [isCurrent, setIsCurrent] = useState(item?.is_current !== false);
 const [startDate, setStartDate] = useState(item?.start_date || "");
 const [endDate, setEndDate] = useState(item?.end_date || "");
 const [description, setDescription] = useState(item?.description || "");
 const [skillsStr, setSkillsStr] = useState(item?.skills?.join(", ") || "");
 const [mediaUrls, setMediaUrls] = useState<string[]>(item?.media_urls || []);
 const [isUploading, setIsUploading] = useState(false);

 // Autocomplete de lojas Waesy
 const [companySuggestions, setCompanySuggestions] = useState<any[]>([]);

 const handleCompanyChange = async (val: string) => {
 setCompany(val);
 if (val.trim().length >= 2) {
 try {
 const list = await searchStoresForCompanyAutocomplete({ data: { query: val } });
 setCompanySuggestions(list || []);
 } catch {
 setCompanySuggestions([]);
 }
 } else {
 setCompanySuggestions([]);
 }
 };

 const handleSelectStore = (s: any) => {
 setCompany(s.name);
 setStoreId(s.id);
 setStoreLogo(s.logo_url || "");
 if (s.city || s.state) {
 setLocation([s.city, s.state].filter(Boolean).join(", "));
 }
 setCompanySuggestions([]);
 };

 const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
 const files = e.target.files;
 if (!files || files.length === 0) return;
 setIsUploading(true);
 try {
 for (let i = 0; i < files.length; i++) {
 const file = files[i];
 const res = await getPostMediaSignedUrl({
 data: { fileName: file.name, contentType: file.type },
 });
 await fetch(res.signedUrl, {
 method: "PUT",
 headers: { "Content-Type": file.type },
 body: file,
 });
 setMediaUrls((prev) => [...prev, res.publicUrl]);
 }
 toast.success("Mídia anexada com sucesso!");
 } catch {
 toast.error("Erro ao enviar anexo.");
 } finally {
 setIsUploading(false);
 }
 };

 const handleSubmit = (e: React.FormEvent) => {
 e.preventDefault();
 if (!title.trim() || !company.trim()) {
 toast.error("Título e Empresa são campos obrigatórios.");
 return;
 }
 onSave({
 id: item?.id || "exp-" + Date.now(),
 title,
 company,
 store_id: storeId || undefined,
 store_logo: storeLogo || undefined,
 employment_type: employmentType,
 location,
 location_type: locationType,
 is_current: isCurrent,
 start_date: startDate,
 end_date: isCurrent ? undefined : endDate,
 description,
 skills: skillsStr.split(",").map((s: string) => s.trim()).filter(Boolean),
 media_urls: mediaUrls,
 });
 };

 return (
 <Sheet open={open} onOpenChange={onOpenChange}>
 <SheetContent side="right" size="wide" className="w-full sm:max-w-3xl md:max-w-4xl lg:max-w-[70vw] xl:max-w-[70vw] md:max-w-2xl p-0 flex flex-col h-full bg-background overflow-hidden border-l border-border">
 <div className="p-6 pb-4 border-b border-border/40 shrink-0 flex items-center justify-between">
 <SheetTitle className="text-xl font-extrabold text-foreground">
 {item ? "Editar Experiência" : "Adicionar Experiência"}
 </SheetTitle>
 </div>

 <form onSubmit={handleSubmit} className="flex-1 flex flex-col justify-between overflow-hidden">
 <div className="flex-1 overflow-y-auto p-6 space-y-4 no-scrollbar">
 <div className="space-y-1.5">
 <Label className="text-xs font-semibold">Título do Cargo *</Label>
 <Input
 value={title}
 onChange={(e) => setTitle(e.target.value)}
 placeholder="Ex: Gerente de Atendimento"
 className="h-10 rounded-xl"
 required
 />
 </div>

 <div className="space-y-1.5 relative">
 <Label className="text-xs font-semibold">Empresa / Loja *</Label>
 <Input
 value={company}
 onChange={(e) => handleCompanyChange(e.target.value)}
 placeholder="Digite para buscar empresas no Waesy..."
 className="h-10 rounded-xl"
 required
 />
 {companySuggestions.length > 0 && (
 <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-card rounded-2xl border border-border/80 p-2 space-y-1 max-h-48 overflow-y-auto no-scrollbar">
 <p className="text-[10px] font-bold text-muted-foreground px-2 py-0.5">
 Lojas do ecossistema Waesy:
 </p>
 {companySuggestions.map((s) => (
 <div
 key={s.id}
 className="flex items-center gap-2 p-2 rounded-xl hover:bg-muted/50 cursor-pointer"
 onClick={() => handleSelectStore(s)}
 >
 <div className="size-6 rounded-lg bg-muted flex items-center justify-center overflow-hidden flex-shrink-0">
 {s.logo_url ? <img src={s.logo_url} className="size-full object-cover" /> : <Store className="size-3 text-primary" />}
 </div>
 <span className="text-xs font-bold text-foreground">{s.name}</span>
 <Badge variant="secondary" className="text-[9px] ml-auto">
 Waesy
 </Badge>
 </div>
 ))}
 </div>
 )}
 </div>

 <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
 <div className="space-y-1.5">
 <Label className="text-xs font-semibold">Tipo de Emprego</Label>
 <Select value={employmentType} onValueChange={setEmploymentType}>
 <SelectTrigger className="h-10 rounded-xl">
 <SelectValue />
 </SelectTrigger>
 <SelectContent className="rounded-2xl">
 <SelectItem value="Tempo integral">Tempo integral</SelectItem>
 <SelectItem value="Meio período">Meio período</SelectItem>
 <SelectItem value="Autônomo">Autônomo</SelectItem>
 <SelectItem value="PJ / Contrato">PJ / Contrato</SelectItem>
 <SelectItem value="Estágio">Estágio</SelectItem>
 <SelectItem value="Trainee">Trainee</SelectItem>
 </SelectContent>
 </Select>
 </div>

 <div className="space-y-1.5">
 <Label className="text-xs font-semibold">Modelo de Trabalho</Label>
 <Select value={locationType} onValueChange={setLocationType}>
 <SelectTrigger className="h-10 rounded-xl">
 <SelectValue />
 </SelectTrigger>
 <SelectContent className="rounded-2xl">
 <SelectItem value="No local">Presencial (No local)</SelectItem>
 <SelectItem value="Híbrido">Híbrido</SelectItem>
 <SelectItem value="Remoto">Remoto</SelectItem>
 </SelectContent>
 </Select>
 </div>
 </div>

 <div className="space-y-1.5">
 <Label className="text-xs font-semibold">Localidade</Label>
 <Input
 value={location}
 onChange={(e) => setLocation(e.target.value)}
 placeholder="Ex: Chapecó, Santa Catarina, Brasil"
 className="h-10 rounded-xl"
 />
 </div>

 <div className="flex items-center gap-2 pt-1">
 <input
 type="checkbox"
 id="is_current_exp"
 checked={isCurrent}
 onChange={(e) => setIsCurrent(e.target.checked)}
 className="size-4 rounded accent-primary cursor-pointer"
 />
 <Label htmlFor="is_current_exp" className="text-xs font-semibold cursor-pointer">
 Trabalho atualmente neste cargo
 </Label>
 </div>

 <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
 <div className="space-y-1.5">
 <Label className="text-xs font-semibold">Data de Início</Label>
 <Input
 value={startDate}
 onChange={(e) => setStartDate(e.target.value)}
 placeholder="Ex: jan de 2024"
 className="h-10 rounded-xl"
 />
 </div>
 {!isCurrent && (
 <div className="space-y-1.5">
 <Label className="text-xs font-semibold">Data de Término</Label>
 <Input
 value={endDate}
 onChange={(e) => setEndDate(e.target.value)}
 placeholder="Ex: mai de 2026"
 className="h-10 rounded-xl"
 />
 </div>
 )}
 </div>

 <div className="space-y-1.5">
 <Label className="text-xs font-semibold">Descrição da Função</Label>
 <Textarea
 value={description}
 onChange={(e) => setDescription(e.target.value)}
 rows={4}
 placeholder="Descreva suas responsabilidades, conquistas e projetos..."
 className="rounded-2xl text-xs sm:text-sm"
 />
 </div>

 <div className="space-y-1.5">
 <Label className="text-xs font-semibold">Competências Utilizadas (separadas por vírgula)</Label>
 <Input
 value={skillsStr}
 onChange={(e) => setSkillsStr(e.target.value)}
 placeholder="Ex: Vendas, Gestão de Equipe, Atendimento"
 className="h-10 rounded-xl"
 />
 </div>

 {/* Mídias & Anexos */}
 <div className="space-y-2 pt-1">
 <Label className="text-xs font-semibold">Mídias & Anexos (Fotos, Certificados, PDFs)</Label>
 <div className="flex flex-wrap gap-2">
 {mediaUrls.map((url, idx) => (
 <div key={idx} className="relative size-16 rounded-xl overflow-hidden bg-muted group">
 <img src={url} className="size-full object-cover" />
 <button
 type="button"
 className="absolute inset-0 bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
 onClick={() => setMediaUrls(mediaUrls.filter((_, i) => i !== idx))}
 >
 <Trash2 className="size-4" />
 </button>
 </div>
 ))}
 <label className="size-16 rounded-xl border border-dashed border-border flex flex-col items-center justify-center text-muted-foreground hover:bg-muted/40 cursor-pointer transition-colors">
 <Upload className="size-4" />
 <span className="text-[9px] font-bold mt-1">Subir Mídia</span>
 <input type="file" multiple accept="image/*,.pdf" className="hidden" onChange={handleFileUpload} disabled={isUploading} />
 </label>
 </div>
 </div>
 </div>

 <div className="p-5 border-t border-border/40 shrink-0 bg-background/95 backdrop-blur-sm flex items-center justify-between gap-3">
 {item ? (
 <Button
 type="button"
 variant="destructive"
 className="rounded-xl"
 onClick={() => onSave(item, true)}
 disabled={isSaving}
 >
 Excluir
 </Button>
 ) : <div />}
 <div className="flex items-center gap-2">
 <Button type="button" variant="outline" className="rounded-xl" onClick={() => onOpenChange(false)}>
 Cancelar
 </Button>
 <Button type="submit" className="rounded-xl font-bold bg-primary text-primary-foreground" disabled={isSaving || isUploading}>
 {isSaving ? "Salvando..." : "Salvar Experiência"}
 </Button>
 </div>
 </div>
 </form>
 </SheetContent>
 </Sheet>
 );
}

function EducationEditModal({
 open,
 onOpenChange,
 item,
 onSave,
 isSaving,
}: {
 open: boolean;
 onOpenChange: (op: boolean) => void;
 item: any;
 onSave: (item: any, isDelete?: boolean) => void;
 isSaving: boolean;
}) {
 const [school, setSchool] = useState(item?.school || "");
 const [degree, setDegree] = useState(item?.degree || "");
 const [fieldOfStudy, setFieldOfStudy] = useState(item?.field_of_study || "");
 const [startDate, setStartDate] = useState(item?.start_date || "");
 const [endDate, setEndDate] = useState(item?.end_date || "");
 const [description, setDescription] = useState(item?.description || "");

 const handleSubmit = (e: React.FormEvent) => {
 e.preventDefault();
 if (!school.trim()) {
 toast.error("Instituição de Ensino é obrigatória.");
 return;
 }
 onSave({
 id: item?.id || "edu-" + Date.now(),
 school,
 degree,
 field_of_study: fieldOfStudy,
 start_date: startDate,
 end_date: endDate,
 description,
 });
 };

 return (
 <Sheet open={open} onOpenChange={onOpenChange}>
 <SheetContent side="right" size="wide" className="w-full sm:max-w-3xl md:max-w-4xl lg:max-w-[70vw] xl:max-w-[70vw] md:max-w-2xl p-0 flex flex-col h-full bg-background overflow-hidden border-l border-border">
 <div className="p-6 pb-4 border-b border-border/40 shrink-0 flex items-center justify-between">
 <SheetTitle className="text-xl font-extrabold text-foreground">
 {item ? "Editar Formação" : "Adicionar Formação Acadêmica"}
 </SheetTitle>
 </div>

 <form onSubmit={handleSubmit} className="flex-1 flex flex-col justify-between overflow-hidden">
 <div className="flex-1 overflow-y-auto p-6 space-y-4 no-scrollbar">
 <div className="space-y-1.5">
 <Label className="text-xs font-semibold">Instituição de Ensino *</Label>
 <Input
 value={school}
 onChange={(e) => setSchool(e.target.value)}
 placeholder="Ex: UFFS - Universidade Federal da Fronteira Sul"
 className="h-10 rounded-xl"
 required
 />
 </div>

 <div className="space-y-1.5">
 <Label className="text-xs font-semibold">Grau / Diploma</Label>
 <Input
 value={degree}
 onChange={(e) => setDegree(e.target.value)}
 placeholder="Ex: Bacharelado, Pós-graduação, Técnico"
 className="h-10 rounded-xl"
 />
 </div>

 <div className="space-y-1.5">
 <Label className="text-xs font-semibold">Área de Estudo</Label>
 <Input
 value={fieldOfStudy}
 onChange={(e) => setFieldOfStudy(e.target.value)}
 placeholder="Ex: Administração, Ciência da Computação"
 className="h-10 rounded-xl"
 />
 </div>

 <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
 <div className="space-y-1.5">
 <Label className="text-xs font-semibold">Início</Label>
 <Input
 value={startDate}
 onChange={(e) => setStartDate(e.target.value)}
 placeholder="Ex: 2018"
 className="h-10 rounded-xl"
 />
 </div>
 <div className="space-y-1.5">
 <Label className="text-xs font-semibold">Término (ou previsto)</Label>
 <Input
 value={endDate}
 onChange={(e) => setEndDate(e.target.value)}
 placeholder="Ex: 2022"
 className="h-10 rounded-xl"
 />
 </div>
 </div>

 <div className="space-y-1.5">
 <Label className="text-xs font-semibold">Atividades e Sociedades</Label>
 <Textarea
 value={description}
 onChange={(e) => setDescription(e.target.value)}
 rows={4}
 placeholder="Projetos de extensão, monitorias..."
 className="rounded-2xl text-xs sm:text-sm"
 />
 </div>
 </div>

 <div className="p-5 border-t border-border/40 shrink-0 bg-background/95 backdrop-blur-sm flex items-center justify-between gap-3">
 {item ? (
 <Button
 type="button"
 variant="destructive"
 className="rounded-xl"
 onClick={() => onSave(item, true)}
 disabled={isSaving}
 >
 Excluir
 </Button>
 ) : <div />}
 <div className="flex items-center gap-2">
 <Button type="button" variant="outline" className="rounded-xl" onClick={() => onOpenChange(false)}>
 Cancelar
 </Button>
 <Button type="submit" className="rounded-xl font-bold bg-primary text-primary-foreground" disabled={isSaving}>
 {isSaving ? "Salvando..." : "Salvar Formação"}
 </Button>
 </div>
 </div>
 </form>
 </SheetContent>
 </Sheet>
 );
}

function CertificationEditModal({
 open,
 onOpenChange,
 item,
 onSave,
 isSaving,
}: {
 open: boolean;
 onOpenChange: (op: boolean) => void;
 item: any;
 onSave: (item: any, isDelete?: boolean) => void;
 isSaving: boolean;
}) {
 const [name, setName] = useState(item?.name || "");
 const [issuer, setIssuer] = useState(item?.issuer || "");
 const [issueDate, setIssueDate] = useState(item?.issue_date || "");
 const [credentialUrl, setCredentialUrl] = useState(item?.credential_url || "");

 const handleSubmit = (e: React.FormEvent) => {
 e.preventDefault();
 if (!name.trim() || !issuer.trim()) {
 toast.error("Nome e Órgão Emissor são obrigatórios.");
 return;
 }
 onSave({
 id: item?.id || "cert-" + Date.now(),
 name,
 issuer,
 issue_date: issueDate,
 credential_url: credentialUrl,
 });
 };

 return (
 <Sheet open={open} onOpenChange={onOpenChange}>
 <SheetContent side="right" size="wide" className="w-full sm:max-w-3xl md:max-w-4xl lg:max-w-[70vw] xl:max-w-[70vw] md:max-w-2xl p-0 flex flex-col h-full bg-background overflow-hidden border-l border-border">
 <div className="p-6 pb-4 border-b border-border/40 shrink-0 flex items-center justify-between">
 <SheetTitle className="text-xl font-extrabold text-foreground">
 {item ? "Editar Certificação" : "Adicionar Certificação"}
 </SheetTitle>
 </div>

 <form onSubmit={handleSubmit} className="flex-1 flex flex-col justify-between overflow-hidden">
 <div className="flex-1 overflow-y-auto p-6 space-y-4 no-scrollbar">
 <div className="space-y-1.5">
 <Label className="text-xs font-semibold">Nome da Certificação *</Label>
 <Input
 value={name}
 onChange={(e) => setName(e.target.value)}
 placeholder="Ex: Gestão de RH, UX Design"
 className="h-10 rounded-xl"
 required
 />
 </div>

 <div className="space-y-1.5">
 <Label className="text-xs font-semibold">Organização Emissora *</Label>
 <Input
 value={issuer}
 onChange={(e) => setIssuer(e.target.value)}
 placeholder="Ex: EBAC, SENAC, Google"
 className="h-10 rounded-xl"
 required
 />
 </div>

 <div className="space-y-1.5">
 <Label className="text-xs font-semibold">Data de Emissão</Label>
 <Input
 value={issueDate}
 onChange={(e) => setIssueDate(e.target.value)}
 placeholder="Ex: fev de 2021"
 className="h-10 rounded-xl"
 />
 </div>

 <div className="space-y-1.5">
 <Label className="text-xs font-semibold">URL da Credencial / Certificado</Label>
 <Input
 value={credentialUrl}
 onChange={(e) => setCredentialUrl(e.target.value)}
 placeholder="https://..."
 className="h-10 rounded-xl"
 />
 </div>
 </div>

 <div className="p-5 border-t border-border/40 shrink-0 bg-background/95 backdrop-blur-sm flex items-center justify-between gap-3">
 {item ? (
 <Button
 type="button"
 variant="destructive"
 className="rounded-xl"
 onClick={() => onSave(item, true)}
 disabled={isSaving}
 >
 Excluir
 </Button>
 ) : <div />}
 <div className="flex items-center gap-2">
 <Button type="button" variant="outline" className="rounded-xl" onClick={() => onOpenChange(false)}>
 Cancelar
 </Button>
 <Button type="submit" className="rounded-xl font-bold bg-primary text-primary-foreground" disabled={isSaving}>
 {isSaving ? "Salvando..." : "Salvar Certificado"}
 </Button>
 </div>
 </div>
 </form>
 </SheetContent>
 </Sheet>
 );
}

function ProjectEditModal({
 open,
 onOpenChange,
 item,
 onSave,
 isSaving,
}: {
 open: boolean;
 onOpenChange: (op: boolean) => void;
 item: any;
 onSave: (item: any, isDelete?: boolean) => void;
 isSaving: boolean;
}) {
 const [title, setTitle] = useState(item?.title || "");
 const [associatedWith, setAssociatedWith] = useState(item?.associated_with || "");
 const [projectUrl, setProjectUrl] = useState(item?.project_url || "");
 const [startDate, setStartDate] = useState(item?.start_date || "");
 const [endDate, setEndDate] = useState(item?.end_date || "");
 const [isCurrent, setIsCurrent] = useState(item?.is_current !== false);
 const [description, setDescription] = useState(item?.description || "");

 const handleSubmit = (e: React.FormEvent) => {
 e.preventDefault();
 if (!title.trim()) {
 toast.error("Nome do projeto é obrigatório.");
 return;
 }
 onSave({
 id: item?.id || "proj-" + Date.now(),
 title,
 associated_with: associatedWith,
 project_url: projectUrl,
 start_date: startDate,
 end_date: isCurrent ? undefined : endDate,
 is_current: isCurrent,
 description,
 });
 };

 return (
 <Sheet open={open} onOpenChange={onOpenChange}>
 <SheetContent side="right" size="wide" className="w-full sm:max-w-3xl md:max-w-4xl lg:max-w-[70vw] xl:max-w-[70vw] md:max-w-2xl p-0 flex flex-col h-full bg-background overflow-hidden border-l border-border">
 <div className="p-6 pb-4 border-b border-border/40 shrink-0 flex items-center justify-between">
 <SheetTitle className="text-xl font-extrabold text-foreground">
 {item ? "Editar Projeto" : "Adicionar Projeto"}
 </SheetTitle>
 </div>

 <form onSubmit={handleSubmit} className="flex-1 flex flex-col justify-between overflow-hidden">
 <div className="flex-1 overflow-y-auto p-6 space-y-4 no-scrollbar">
 <div className="space-y-1.5">
 <Label className="text-xs font-semibold">Nome do Projeto *</Label>
 <Input
 value={title}
 onChange={(e) => setTitle(e.target.value)}
 placeholder="Ex: Case Ebis"
 className="h-10 rounded-xl"
 required
 />
 </div>

 <div className="space-y-1.5">
 <Label className="text-xs font-semibold">Associado à Empresa / Cliente</Label>
 <Input
 value={associatedWith}
 onChange={(e) => setAssociatedWith(e.target.value)}
 placeholder="Ex: Decibal Alimentos"
 className="h-10 rounded-xl"
 />
 </div>

 <div className="space-y-1.5">
 <Label className="text-xs font-semibold">Link do Projeto</Label>
 <Input
 value={projectUrl}
 onChange={(e) => setProjectUrl(e.target.value)}
 placeholder="https://..."
 className="h-10 rounded-xl"
 />
 </div>

 <div className="grid grid-cols-2 gap-3">
 <div className="space-y-1.5">
 <Label className="text-xs font-semibold">Início</Label>
 <Input
 value={startDate}
 onChange={(e) => setStartDate(e.target.value)}
 placeholder="Ex: mai de 2017"
 className="h-10 rounded-xl"
 />
 </div>
 {!isCurrent && (
 <div className="space-y-1.5">
 <Label className="text-xs font-semibold">Término</Label>
 <Input
 value={endDate}
 onChange={(e) => setEndDate(e.target.value)}
 placeholder="Ex: dez de 2022"
 className="h-10 rounded-xl"
 />
 </div>
 )}
 </div>

 <div className="space-y-1.5">
 <Label className="text-xs font-semibold">Descrição</Label>
 <Textarea
 value={description}
 onChange={(e) => setDescription(e.target.value)}
 rows={4}
 placeholder="Descreva o objetivo e resultados do projeto..."
 className="rounded-2xl text-xs sm:text-sm"
 />
 </div>
 </div>

 <div className="p-5 border-t border-border/40 shrink-0 bg-background/95 backdrop-blur-sm flex items-center justify-between gap-3">
 {item ? (
 <Button
 type="button"
 variant="destructive"
 className="rounded-xl"
 onClick={() => onSave(item, true)}
 disabled={isSaving}
 >
 Excluir
 </Button>
 ) : <div />}
 <div className="flex items-center gap-2">
 <Button type="button" variant="outline" className="rounded-xl" onClick={() => onOpenChange(false)}>
 Cancelar
 </Button>
 <Button type="submit" className="rounded-xl font-bold bg-primary text-primary-foreground" disabled={isSaving}>
 {isSaving ? "Salvando..." : "Salvar Projeto"}
 </Button>
 </div>
 </div>
 </form>
 </SheetContent>
 </Sheet>
 );
}

function VolunteeringEditModal({
 open,
 onOpenChange,
 item,
 onSave,
 isSaving,
}: {
 open: boolean;
 onOpenChange: (op: boolean) => void;
 item: any;
 onSave: (item: any, isDelete?: boolean) => void;
 isSaving: boolean;
}) {
 const [role, setRole] = useState(item?.role || "");
 const [organization, setOrganization] = useState(item?.organization || "");
 const [cause, setCause] = useState(item?.cause || "Serviço social");
 const [startDate, setStartDate] = useState(item?.start_date || "");
 const [endDate, setEndDate] = useState(item?.end_date || "");
 const [isCurrent, setIsCurrent] = useState(item?.is_current !== false);
 const [description, setDescription] = useState(item?.description || "");

 const handleSubmit = (e: React.FormEvent) => {
 e.preventDefault();
 if (!role.trim() || !organization.trim()) {
 toast.error("Função e Organização são obrigatórios.");
 return;
 }
 onSave({
 id: item?.id || "vol-" + Date.now(),
 role,
 organization,
 cause,
 start_date: startDate,
 end_date: isCurrent ? undefined : endDate,
 is_current: isCurrent,
 description,
 });
 };

 return (
 <Sheet open={open} onOpenChange={onOpenChange}>
 <SheetContent side="right" size="wide" className="w-full sm:max-w-3xl md:max-w-4xl lg:max-w-[70vw] xl:max-w-[70vw] md:max-w-2xl p-0 flex flex-col h-full bg-background overflow-hidden border-l border-border">
 <div className="p-6 pb-4 border-b border-border/40 shrink-0 flex items-center justify-between">
 <SheetTitle className="text-xl font-extrabold text-foreground">
 {item ? "Editar Voluntariado" : "Adicionar Voluntariado"}
 </SheetTitle>
 </div>

 <form onSubmit={handleSubmit} className="flex-1 flex flex-col justify-between overflow-hidden">
 <div className="flex-1 overflow-y-auto p-6 space-y-4 no-scrollbar">
 <div className="space-y-1.5">
 <Label className="text-xs font-semibold">Função / Papel *</Label>
 <Input
 value={role}
 onChange={(e) => setRole(e.target.value)}
 placeholder="Ex: Voluntário de Apoio"
 className="h-10 rounded-xl"
 required
 />
 </div>

 <div className="space-y-1.5">
 <Label className="text-xs font-semibold">Organização / Entidade *</Label>
 <Input
 value={organization}
 onChange={(e) => setOrganization(e.target.value)}
 placeholder="Ex: ONG Esperança"
 className="h-10 rounded-xl"
 required
 />
 </div>

 <div className="space-y-1.5">
 <Label className="text-xs font-semibold">Causa Social</Label>
 <Select value={cause} onValueChange={setCause}>
 <SelectTrigger className="h-10 rounded-xl">
 <SelectValue />
 </SelectTrigger>
 <SelectContent className="rounded-2xl max-h-48 overflow-y-auto no-scrollbar">
 {SOCIAL_CAUSES_LIST.map((c) => (
 <SelectItem key={c} value={c}>
 {c}
 </SelectItem>
 ))}
 </SelectContent>
 </Select>
 </div>

 <div className="grid grid-cols-2 gap-3">
 <div className="space-y-1.5">
 <Label className="text-xs font-semibold">Início</Label>
 <Input
 value={startDate}
 onChange={(e) => setStartDate(e.target.value)}
 placeholder="Ex: out de 2018"
 className="h-10 rounded-xl"
 />
 </div>
 {!isCurrent && (
 <div className="space-y-1.5">
 <Label className="text-xs font-semibold">Término</Label>
 <Input
 value={endDate}
 onChange={(e) => setEndDate(e.target.value)}
 placeholder="Ex: dez de 2023"
 className="h-10 rounded-xl"
 />
 </div>
 )}
 </div>

 <div className="space-y-1.5">
 <Label className="text-xs font-semibold">Descrição</Label>
 <Textarea
 value={description}
 onChange={(e) => setDescription(e.target.value)}
 rows={4}
 placeholder="Descreva seu impacto e atividades..."
 className="rounded-2xl text-xs sm:text-sm"
 />
 </div>
 </div>

 <div className="p-5 border-t border-border/40 shrink-0 bg-background/95 backdrop-blur-sm flex items-center justify-between gap-3">
 {item ? (
 <Button
 type="button"
 variant="destructive"
 className="rounded-xl"
 onClick={() => onSave(item, true)}
 disabled={isSaving}
 >
 Excluir
 </Button>
 ) : <div />}
 <div className="flex items-center gap-2">
 <Button type="button" variant="outline" className="rounded-xl" onClick={() => onOpenChange(false)}>
 Cancelar
 </Button>
 <Button type="submit" className="rounded-xl font-bold bg-primary text-primary-foreground" disabled={isSaving}>
 {isSaving ? "Salvando..." : "Salvar Voluntariado"}
 </Button>
 </div>
 </div>
 </form>
 </SheetContent>
 </Sheet>
 );
}

function CausesEditModal({
 open,
 onOpenChange,
 selectedCauses,
 onSave,
 isSaving,
}: {
 open: boolean;
 onOpenChange: (op: boolean) => void;
 selectedCauses: string[];
 onSave: (causes: string[]) => void;
 isSaving: boolean;
}) {
 const [causes, setCauses] = useState<string[]>(selectedCauses || []);

 const toggleCause = (cause: string) => {
 if (causes.includes(cause)) {
 setCauses(causes.filter((c) => c !== cause));
 } else {
 setCauses([...causes, cause]);
 }
 };

 const handleSubmit = (e: React.FormEvent) => {
 e.preventDefault();
 onSave(causes);
 };

 return (
 <Sheet open={open} onOpenChange={onOpenChange}>
 <SheetContent side="right" size="wide" className="w-full sm:max-w-3xl md:max-w-4xl lg:max-w-[70vw] xl:max-w-[70vw] md:max-w-2xl p-0 flex flex-col h-full bg-background overflow-hidden border-l border-border">
 <div className="p-6 pb-4 border-b border-border/40 shrink-0 flex items-center justify-between">
 <SheetTitle className="text-xl font-extrabold text-foreground">Causas Sociais</SheetTitle>
 </div>

 <form onSubmit={handleSubmit} className="flex-1 flex flex-col justify-between overflow-hidden">
 <div className="flex-1 overflow-y-auto p-6 no-scrollbar">
 <div className="flex flex-wrap gap-2">
 {SOCIAL_CAUSES_LIST.map((cause) => {
 const isSelected = causes.includes(cause);
 return (
 <button
 type="button"
 key={cause}
 onClick={() => toggleCause(cause)}
 className={cn(
 "px-4 py-2.5 rounded-xl text-xs font-semibold transition-all text-left cursor-pointer",
 isSelected
 ? "bg-primary text-primary-foreground font-bold"
 : "bg-muted/40 text-muted-foreground hover:bg-muted/80 hover:text-foreground"
 )}
 >
 {isSelected ? "✓ " : "+ "}
 {cause}
 </button>
 );
 })}
 </div>
 </div>

 <div className="p-5 border-t border-border/40 shrink-0 bg-background/95 backdrop-blur-sm flex items-center justify-end gap-3">
 <Button type="button" variant="outline" className="rounded-xl" onClick={() => onOpenChange(false)}>
 Cancelar
 </Button>
 <Button type="submit" className="rounded-xl font-bold bg-primary text-primary-foreground" disabled={isSaving}>
 {isSaving ? "Salvando..." : "Salvar Causas"}
 </Button>
 </div>
 </form>
 </SheetContent>
 </Sheet>
 );
}

function LanguagesEditModal({
 open,
 onOpenChange,
 initialLanguages,
 onSave,
 isSaving,
}: {
 open: boolean;
 onOpenChange: (op: boolean) => void;
 initialLanguages: any[];
 onSave: (languages: any[]) => void;
 isSaving: boolean;
}) {
 const [list, setList] = useState<any[]>(
 initialLanguages.length > 0
 ? initialLanguages
 : [{ language: "Português", proficiency: "Nativo ou bilíngue" }]
 );

 const addLanguage = () => {
 setList([...list, { language: "", proficiency: "Básico" }]);
 };

 const removeLanguage = (index: number) => {
 setList(list.filter((_, i) => i !== index));
 };

 const updateItem = (index: number, field: string, val: string) => {
 const updated = [...list];
 updated[index] = { ...updated[index], [field]: val };
 setList(updated);
 };

 const handleSubmit = (e: React.FormEvent) => {
 e.preventDefault();
 onSave(list.filter((item) => item.language.trim().length > 0));
 };

 return (
 <Sheet open={open} onOpenChange={onOpenChange}>
 <SheetContent side="right" size="wide" className="w-full sm:max-w-3xl md:max-w-4xl lg:max-w-[70vw] xl:max-w-[70vw] md:max-w-2xl p-0 flex flex-col h-full bg-background overflow-hidden border-l border-border">
 <div className="p-6 pb-4 border-b border-border/40 shrink-0 flex items-center justify-between">
 <SheetTitle className="text-xl font-extrabold text-foreground">Idiomas</SheetTitle>
 </div>

 <form onSubmit={handleSubmit} className="flex-1 flex flex-col justify-between overflow-hidden">
 <div className="flex-1 overflow-y-auto p-6 space-y-4 no-scrollbar">
 <div className="space-y-3">
 {list.map((item, idx) => (
 <div key={idx} className="p-4 rounded-2xl bg-muted/30 space-y-2 relative">
 <div className="flex items-center justify-between">
 <span className="text-xs font-bold text-muted-foreground">Idioma #{idx + 1}</span>
 {list.length > 1 && (
 <button
 type="button"
 onClick={() => removeLanguage(idx)}
 className="text-muted-foreground hover:text-destructive text-xs cursor-pointer"
 >
 Remover
 </button>
 )}
 </div>
 <div className="grid grid-cols-2 gap-2">
 <Input
 value={item.language}
 onChange={(e) => updateItem(idx, "language", e.target.value)}
 placeholder="Ex: Inglês, Espanhol"
 className="h-10 rounded-xl text-xs"
 />
 <Select
 value={item.proficiency}
 onValueChange={(val) => updateItem(idx, "proficiency", val)}
 >
 <SelectTrigger className="h-10 rounded-xl text-xs">
 <SelectValue />
 </SelectTrigger>
 <SelectContent className="rounded-2xl">
 <SelectItem value="Nativo ou bilíngue">Nativo ou bilíngue</SelectItem>
 <SelectItem value="Fluente / Avançado">Fluente / Avançado</SelectItem>
 <SelectItem value="Intermediário">Intermediário</SelectItem>
 <SelectItem value="Básico">Básico</SelectItem>
 </SelectContent>
 </Select>
 </div>
 </div>
 ))}
 </div>

 <Button
 type="button"
 variant="outline"
 size="sm"
 className="w-full rounded-xl text-xs font-semibold gap-1.5"
 onClick={addLanguage}
 >
 <Plus className="size-3.5" />
 <span>Adicionar outro idioma</span>
 </Button>
 </div>

 <div className="p-5 border-t border-border/40 shrink-0 bg-background/95 backdrop-blur-sm flex items-center justify-end gap-3">
 <Button type="button" variant="outline" className="rounded-xl" onClick={() => onOpenChange(false)}>
 Cancelar
 </Button>
 <Button type="submit" className="rounded-xl font-bold bg-primary text-primary-foreground" disabled={isSaving}>
 {isSaving ? "Salvando..." : "Salvar Idiomas"}
 </Button>
 </div>
 </form>
 </SheetContent>
 </Sheet>
 );
}
