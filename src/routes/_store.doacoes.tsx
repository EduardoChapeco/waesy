import { createFileRoute, Link, useNavigate, useRouter } from "@tanstack/react-router";
import { z } from "zod";
import { useState, useMemo } from "react";
import { toast } from "sonner";
import { Heart, HandHeart, Armchair, TShirt, BookOpen, Users, Plus, MagnifyingGlass, CaretRight, MapPin, X, Check, WhatsappLogo, Camera, SpinnerGap, Package } from "@phosphor-icons/react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FrostedCard, FrostedCardHeader, FrostedCardTitle, FrostedCardDescription, FrostedCardContent } from "@/components/ui/frosted-card";
import { NativeMobileHeader } from "@/components/navigation/native-mobile-header";
import { PageSkeleton } from "@/components/state/loading";
import { getPublicClassifieds, upsertClassified } from "@/services/classifieds.functions";
import { uploadClassifiedMedia } from "@/lib/classifieds/upload-classified-media";
import { cn } from "@/lib/utils";

const SearchSchema = z.object({
  q: z.string().optional(),
  categoria: z.string().optional(),
});

type DoacoesSearch = z.infer<typeof SearchSchema>;

interface DonationCategoryItem {
  id: string;
  label: string;
  shortSubtitle: string;
  icon: typeof Heart;
  bentoSpan: string;
  coverImage?: string;
  accentClass: string;
}

const DOACOES_CATEGORIES: DonationCategoryItem[] = [
  {
    id: "todos",
    label: "Todas as Doações",
    shortSubtitle: "Fluxo comunitário geral",
    icon: Heart,
    bentoSpan: "md:col-span-7",
    accentClass: "text-rose-600 bg-rose-500/10 dark:text-rose-400",
  },
  {
    id: "moveis",
    label: "Móveis e Utensílios",
    shortSubtitle: "Retirada direta local",
    icon: Armchair,
    bentoSpan: "md:col-span-5",
    accentClass: "text-amber-600 bg-amber-500/10 dark:text-amber-400",
  },
  {
    id: "roupas",
    label: "Roupas e Agasalhos",
    shortSubtitle: "Inverno e vestuário infantil",
    icon: TShirt,
    bentoSpan: "md:col-span-4",
    accentClass: "text-sky-600 bg-sky-500/10 dark:text-sky-400",
  },
  {
    id: "livros",
    label: "Livros e Material Escolar",
    shortSubtitle: "Educação e leitura",
    icon: BookOpen,
    bentoSpan: "md:col-span-4",
    accentClass: "text-emerald-600 bg-emerald-500/10 dark:text-emerald-400",
  },
  {
    id: "voluntariado",
    label: "Voluntariado",
    shortSubtitle: "Apoio social e comunitário",
    icon: HandHeart,
    bentoSpan: "md:col-span-4",
    accentClass: "text-purple-600 bg-purple-500/10 dark:text-purple-400",
  },
  {
    id: "ongs",
    label: "Campanhas Locais",
    shortSubtitle: "Instituições verificadas",
    icon: Users,
    bentoSpan: "md:col-span-12",
    accentClass: "text-indigo-600 bg-indigo-500/10 dark:text-indigo-400",
  },
];

export const Route = createFileRoute("/_store/doacoes")({
  head: () => ({
    meta: [
      { title: "Doações | Waesy" },
      {
        name: "description",
        content:
          "Rede comunitária para doação direta de móveis, roupas, livros e ações de voluntariado.",
      },
    ],
  }),
  validateSearch: (search: Record<string, unknown>): DoacoesSearch =>
    SearchSchema.parse(search),
  loaderDeps: ({ search }) => search,
  loader: async ({ deps }) => {
    try {
      const [donationsByCat, donationsByDeal] = await Promise.all([
        getPublicClassifieds({
          data: {
            category: "donation",
            search: deps.q,
            limit: 60,
          },
        }).catch(() => []),
        getPublicClassifieds({
          data: {
            dealType: "doacao",
            search: deps.q,
            limit: 60,
          },
        }).catch(() => []),
      ]);

      const mergedMap = new Map<string, any>();
      for (const item of [...(donationsByCat || []), ...(donationsByDeal || [])]) {
        if (item?.id) mergedMap.set(String(item.id), item);
      }

      return {
        donations: Array.from(mergedMap.values()),
      };
    } catch (err) {
      console.error("[loader:_store.doacoes] Unhandled error:", err);
      return { donations: [] };
    }
  },
  component: DoacoesPage,
  pendingComponent: PageSkeleton,
});

function DoacoesPage() {
  const search = Route.useSearch();
  const loaderData = Route.useLoaderData();
  const navigate = useNavigate({ from: Route.fullPath });
  const router = useRouter();

  const [activeCategory, setActiveCategory] = useState(search.categoria || "todos");
  const [searchInput, setSearchInput] = useState(search.q || "");
  const [isDonationSheetOpen, setIsDonationSheetOpen] = useState(false);

  // Estado do formulário 100dvh Bottom Sheet (Nova Doação)
  const [title, setTitle] = useState("");
  const [subCategory, setSubCategory] = useState("moveis");
  const [condition, setCondition] = useState<"new" | "used">("used");
  const [locationName, setLocationName] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [description, setDescription] = useState("");
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const donations = useMemo(() => {
    const raw = loaderData?.donations ?? [];
    return raw.filter((item: any) => {
      if (activeCategory !== "todos") {
        const itemSub = String(
          item.sub_category || item.attributes?.donation_category || ""
        ).toLowerCase();
        const titleContent = `${item.title || ""} ${item.content || ""}`.toLowerCase();
        if (
          itemSub !== activeCategory &&
          !titleContent.includes(activeCategory)
        ) {
          return false;
        }
      }
      if (searchInput.trim()) {
        const q = searchInput.trim().toLowerCase();
        const hay = `${item.title || ""} ${item.content || ""} ${item.location_name || ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [loaderData?.donations, activeCategory, searchInput]);

  const handleCategoryChange = (catId: string) => {
    setActiveCategory(catId);
    navigate({
      search: (prev: any) => ({
        ...prev,
        categoria: catId === "todos" ? undefined : catId,
      }),
    });
  };

  const handleSearchChange = (value: string) => {
    setSearchInput(value);
    navigate({
      search: (prev: any) => ({
        ...prev,
        q: value.trim() || undefined,
      }),
    });
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingPhoto(true);
    try {
      const uploadedUrl = await uploadClassifiedMedia(file, "donations");
      if (uploadedUrl) {
        setUploadedImages((prev) => [...prev, uploadedUrl]);
        toast.success("Foto adicionada");
      }
    } catch (err: any) {
      toast.error(err?.message || "Não foi possível enviar a foto");
    } finally {
      setIsUploadingPhoto(false);
      e.target.value = "";
    }
  };

  const handleCreateDonation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (title.trim().length < 3) {
      toast.error("Informe o título do item para doação.");
      return;
    }
    if (description.trim().length < 10) {
      toast.error("Descreva brevemente o estado do item e local de retirada.");
      return;
    }

    setIsSubmitting(true);
    try {
      await upsertClassified({
        data: {
          title: title.trim(),
          content: description.trim(),
          category: "donation",
          deal_type: "doacao",
          sub_category: subCategory,
          price_cents: 0,
          condition,
          location_name: locationName.trim() || null,
          contact_whatsapp: whatsapp.replace(/\D/g, "") || null,
          images: uploadedImages,
          delivery_mode: "local_pickup",
          attributes: {
            donation_category: subCategory,
            is_free_donation: true,
          },
        },
      });

      toast.success("Doação publicada na rede solidária!");
      setIsDonationSheetOpen(false);
      setTitle("");
      setDescription("");
      setUploadedImages([]);
      await router.invalidate();
    } catch (err: any) {
      toast.error(
        err?.message || "Faça login para publicar uma doação gratuita."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto px-0 sm:px-4 pb-28 space-y-4 sm:space-y-6">
      {/* ══════════════════════════════════════════════════════════════════════
          FASE 1: HEADER PURGE & FLOATING ACTIONS (ANTI-ESMAGAMENTO)
          Mobile: NativeMobileHeader enxuto com ícone + discreto.
          Desktop: Cabeçalho espacial limpo com botão primário.
         ══════════════════════════════════════════════════════════════════════ */}
      <NativeMobileHeader
        title="Doações"
        mobileOnly
        rightActions={
          <button
            type="button"
            onClick={() => setIsDonationSheetOpen(true)}
            aria-label="Anunciar Doação"
            className="h-11 w-11 inline-flex items-center justify-center rounded-full text-primary hover:bg-primary/10 active:scale-95 transition-all"
          >
            <Plus size={22} weight="bold" />
          </button>
        }
      />

      {/* Desktop Header (hidden on Mobile) */}
      <header className="hidden md:flex items-center justify-between gap-4 pt-2">
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <Heart size={20} weight="fill" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Doações
          </h1>
        </div>

        <Button
          onClick={() => setIsDonationSheetOpen(true)}
          className="h-11 px-5 rounded-lg font-semibold text-sm gap-2 shadow-none"
        >
          <Plus size={18} weight="bold" />
          <span>Anunciar Doação</span>
        </Button>
      </header>

      {/* Barra de Pesquisa Responsiva (Margens calibradas e zero corte de placeholder) */}
      <div className="px-3 sm:px-0">
        <div className="relative flex items-center w-full">
          <MagnifyingGlass
            size={18}
            className="absolute left-3.5 text-muted-foreground pointer-events-none shrink-0"
          />
          <input
            type="search"
            inputMode="search"
            value={searchInput}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Buscar móveis, roupas, livros ou campanhas..."
            className="w-full h-11 pl-10 pr-10 rounded-lg bg-muted/50 dark:bg-muted/30 border border-border/60 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary transition-all truncate"
          />
          {searchInput && (
            <button
              type="button"
              onClick={() => handleSearchChange("")}
              aria-label="Limpar busca"
              className="absolute right-2.5 size-7 rounded-full inline-flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted"
            >
              <X size={14} weight="bold" />
            </button>
          )}
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          FASE 2: HORIZONTAL PHYSICS (SNAP & FADE MASK)
          Base matemática exata: flex overflow-x-auto snap-x snap-mandatory scrollbar-hide gap-2 px-4 py-2
          Com máscara de gradiente transparente na extremidade direita.
         ══════════════════════════════════════════════════════════════════════ */}
      <div className="relative w-full overflow-hidden">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 right-0 w-12 bg-gradient-to-l from-background via-background/70 to-transparent z-10"
        />
        <div
          role="tablist"
          aria-label="Categorias de Doação"
          className="flex overflow-x-auto snap-x snap-mandatory scrollbar-hide no-scrollbar gap-2 px-4 sm:px-0 py-2 pr-12"
        >
          {DOACOES_CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            const isActive = activeCategory === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => handleCategoryChange(cat.id)}
                className={cn(
                  "snap-start shrink-0 h-9 px-4 rounded-full text-xs font-semibold inline-flex items-center gap-2 transition-all whitespace-nowrap select-none",
                  isActive
                    ? "bg-foreground text-background shadow-xs"
                    : "bg-card text-muted-foreground border border-border/60 hover:text-foreground hover:border-border"
                )}
              >
                <Icon size={15} weight={isActive ? "fill" : "regular"} />
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          FASE 3: THE CONTENT LAYOUT BIFURCATION
          - Mobile (block md:hidden): Native iOS Settings List (Ícone à esquerda,
            Título forte ao centro, Seta > à direita, divide-y de 1px, fundo branco ponta a ponta).
          - Desktop (hidden md:grid): Spatial Bento Grid com <FrostedCard>.
         ══════════════════════════════════════════════════════════════════════ */}

      {/* MOBILE NATIVE LIST (Padrão Configurações iOS — Zero Text-Cards Gigantes) */}
      <section aria-label="Categorias Solidárias Mobile" className="block md:hidden">
        <div className="w-full bg-background border-y border-border/60 divide-y divide-border/50">
          {DOACOES_CATEGORIES.filter((c) => c.id !== "todos").map((cat) => {
            const Icon = cat.icon;
            const isSelected = activeCategory === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() =>
                  handleCategoryChange(isSelected ? "todos" : cat.id)
                }
                className={cn(
                  "w-full min-h-[54px] px-4 py-3 flex items-center justify-between gap-3 text-left transition-colors active:bg-muted/60",
                  isSelected && "bg-primary/5"
                )}
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div
                    className={cn(
                      "size-9 rounded-lg flex items-center justify-center shrink-0",
                      cat.accentClass
                    )}
                  >
                    <Icon size={18} weight="fill" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-foreground truncate">
                      {cat.label}
                    </p>
                    <p className="text-[11px] text-muted-foreground truncate">
                      {cat.shortSubtitle}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {isSelected && (
                    <span className="text-[11px] font-semibold text-primary">
                      Ativo
                    </span>
                  )}
                  <CaretRight
                    size={16}
                    weight="bold"
                    className="text-muted-foreground/60"
                  />
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* DESKTOP SPATIAL BENTO GRID (hidden md:grid com <FrostedCard>) */}
      <section
        aria-label="Bento Grid Solidário Desktop"
        className="hidden md:grid md:grid-cols-12 gap-4"
      >
        {DOACOES_CATEGORIES.filter((c) => c.id !== "todos").map((cat) => {
          const Icon = cat.icon;
          const isSelected = activeCategory === cat.id;
          return (
            <FrostedCard
              key={cat.id}
              intensity="standard"
              onClick={() =>
                handleCategoryChange(isSelected ? "todos" : cat.id)
              }
              className={cn(
                cat.bentoSpan,
                "group relative overflow-hidden cursor-pointer hover:-translate-y-0.5 hover:border-primary/40 transition-all duration-200 min-h-[176px] flex flex-col justify-between",
                isSelected && "ring-2 ring-primary border-primary"
              )}
            >
              {cat.coverImage && (
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                  <img
                    src={cat.coverImage}
                    alt={cat.label}
                    loading="lazy"
                    className="w-full h-full object-cover opacity-20 dark:opacity-15 group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-background/95 via-background/70 to-background/30" />
                </div>
              )}

              <FrostedCardHeader className="relative z-10 flex flex-row items-center justify-between space-y-0 pb-2">
                <div
                  className={cn(
                    "size-10 rounded-lg flex items-center justify-center backdrop-blur-md",
                    cat.accentClass
                  )}
                >
                  <Icon size={20} weight="fill" />
                </div>
                <Badge
                  variant={isSelected ? "default" : "secondary"}
                  className="rounded-full text-[11px] font-semibold backdrop-blur-md"
                >
                  {isSelected ? "Filtro Ativo" : "Explorar"}
                </Badge>
              </FrostedCardHeader>

              <FrostedCardContent className="relative z-10 pt-4 flex items-end justify-between gap-3">
                <div>
                  <FrostedCardTitle className="text-base sm:text-lg">
                    {cat.label}
                  </FrostedCardTitle>
                  <FrostedCardDescription className="text-xs mt-1">
                    {cat.shortSubtitle}
                  </FrostedCardDescription>
                </div>
                <div className="size-8 rounded-full bg-background/80 border border-border/60 flex items-center justify-center group-hover:bg-primary group-hover:text-primary-foreground transition-colors shrink-0">
                  <CaretRight size={15} weight="bold" />
                </div>
              </FrostedCardContent>
            </FrostedCard>
          );
        })}
      </section>

      {/* ══════════════════════════════════════════════════════════════════════
          FEED REAL DE DOAÇÕES (BIFURCADO MOBILE LIST / DESKTOP FROSTED CARDS)
         ══════════════════════════════════════════════════════════════════════ */}
      <section aria-label="Itens disponíveis para doação" className="pt-1">
        {donations.length > 0 ? (
          <>
            {/* Mobile Feed: Native Silent List */}
            <div className="block md:hidden bg-background border-y border-border/60 divide-y divide-border/50">
              {donations.map((item: any) => {
                const thumb =
                  Array.isArray(item.images) && item.images.length > 0
                    ? item.images[0]
                    : null;
                return (
                  <Link
                    key={item.id}
                    to="/classificados/$id"
                    params={{ id: String(item.id) }}
                    className="w-full px-4 py-3 flex items-center justify-between gap-3 active:bg-muted/60 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      {thumb ? (
                        <img
                          src={thumb}
                          alt={item.title}
                          loading="lazy"
                          className="size-12 rounded-lg object-cover shrink-0 bg-muted"
                        />
                      ) : (
                        <div className="size-12 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
                          <Package size={20} weight="duotone" />
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-foreground truncate">
                            {item.title}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground truncate mt-1">
                          {item.location_name || "Retirada combinada"} • Doação Gratuita
                        </p>
                      </div>
                    </div>
                    <CaretRight
                      size={16}
                      weight="bold"
                      className="text-muted-foreground/60 shrink-0"
                    />
                  </Link>
                );
              })}
            </div>

            {/* Desktop Feed: Bento Frosted Grid */}
            <div className="hidden md:grid md:grid-cols-3 gap-4">
              {donations.map((item: any) => {
                const thumb =
                  Array.isArray(item.images) && item.images.length > 0
                    ? item.images[0]
                    : null;
                return (
                  <Link
                    key={item.id}
                    to="/classificados/$id"
                    params={{ id: String(item.id) }}
                    className="block group"
                  >
                    <FrostedCard
                      intensity="standard"
                      className="h-full overflow-hidden hover:-translate-y-0.5 hover:border-primary/40 transition-all"
                    >
                      {thumb && (
                        <div className="aspect-[16/10] w-full overflow-hidden bg-muted">
                          <img
                            src={thumb}
                            alt={item.title}
                            loading="lazy"
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        </div>
                      )}
                      <FrostedCardContent className="p-4 space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <Badge
                            variant="secondary"
                            className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-0 text-[10px] font-bold"
                          >
                            100% Gratuito
                          </Badge>
                          {item.location_name && (
                            <span className="text-[11px] text-muted-foreground inline-flex items-center gap-1 truncate">
                              <MapPin size={12} />
                              {item.location_name}
                            </span>
                          )}
                        </div>
                        <h3 className="text-sm font-bold text-foreground line-clamp-1">
                          {item.title}
                        </h3>
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {item.content}
                        </p>
                      </FrostedCardContent>
                    </FrostedCard>
                  </Link>
                );
              })}
            </div>
          </>
        ) : (
          /* Estado Vazio Silencioso (Marca d'água sutil + tipografia discreta, sem botões gigantes) */
          <div className="py-14 px-4 flex flex-col items-center justify-center text-center select-none">
            <div className="size-16 rounded-full bg-muted/40 flex items-center justify-center text-muted-foreground/35 mb-3">
              <HandHeart size={34} weight="thin" />
            </div>
            <p className="text-sm font-medium text-muted-foreground">
              Nenhuma doação ativa neste filtro no momento.
            </p>
            <p className="text-xs text-muted-foreground/70 mt-1 max-w-xs">
              Use o botão flutuante + para disponibilizar um item gratuito para a comunidade.
            </p>
          </div>
        )}
      </section>

      {/* ══════════════════════════════════════════════════════════════════════
          MOBILE FLOATING ACTION BUTTON (FAB) — ZONA DO POLEGAR
          Substitui o antigo botão pesado do topo no Mobile.
         ══════════════════════════════════════════════════════════════════════ */}
      <button
        type="button"
        onClick={() => setIsDonationSheetOpen(true)}
        aria-label="Anunciar Doação"
        className="md:hidden fixed bottom-20 right-4 z-40 size-14 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center active:scale-95 transition-transform"
      >
        <Plus size={24} weight="bold" />
      </button>

      {/* ══════════════════════════════════════════════════════════════════════
          FASE 4: BOTTOM SHEET EXPANSÍVEL 100dvh ("NOVA DOAÇÃO")
          Abre nativamente sem redirecionar para página web cinzenta.
          Inputs grandes (h-12) e inputMode estrito para teclado móvel.
         ══════════════════════════════════════════════════════════════════════ */}
      {isDonationSheetOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Anunciar Doação"
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs animate-in fade-in duration-150"
        >
          <div className="w-full h-[100dvh] sm:h-auto sm:max-h-[90dvh] sm:max-w-lg bg-background sm:rounded-lg flex flex-col overflow-hidden shadow-2xl">
            {/* Sheet Top Bar */}
            <div className="px-4 h-14 border-b border-border/60 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="size-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                  <Heart size={17} weight="fill" />
                </div>
                <span className="text-base font-bold text-foreground">
                  Nova Doação
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsDonationSheetOpen(false)}
                aria-label="Fechar"
                className="size-10 rounded-full inline-flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted"
              >
                <X size={20} weight="bold" />
              </button>
            </div>

            {/* Form Body Scrollable */}
            <form
              onSubmit={handleCreateDonation}
              className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4"
            >
              {/* Categoria Rápida em Chips */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-muted-foreground">
                  Categoria do Item
                </label>
                <div className="flex overflow-x-auto scrollbar-hide no-scrollbar gap-2 py-1">
                  {DOACOES_CATEGORIES.filter((c) => c.id !== "todos").map(
                    (cat) => {
                      const active = subCategory === cat.id;
                      return (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => setSubCategory(cat.id)}
                          className={cn(
                            "shrink-0 h-9 px-4 rounded-full text-xs font-semibold transition-all",
                            active
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted text-muted-foreground"
                          )}
                        >
                          {cat.label}
                        </button>
                      );
                    }
                  )}
                </div>
              </div>

              {/* Título do Item */}
              <div className="space-y-2">
                <label
                  htmlFor="donation-title"
                  className="text-xs font-semibold text-muted-foreground"
                >
                  O que você está doando?
                </label>
                <Input
                  id="donation-title"
                  type="text"
                  inputMode="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ex: Sofá 3 lugares em bom estado"
                  className="h-12 text-base rounded-lg"
                />
              </div>

              {/* Estado de Conservação */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setCondition("used")}
                  className={cn(
                    "h-11 rounded-lg border text-xs font-semibold flex items-center justify-center gap-2 transition-all",
                    condition === "used"
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border/60 text-muted-foreground"
                  )}
                >
                  <Check
                    size={14}
                    weight="bold"
                    className={condition === "used" ? "opacity-100" : "opacity-0"}
                  />
                  Usado em bom estado
                </button>
                <button
                  type="button"
                  onClick={() => setCondition("new")}
                  className={cn(
                    "h-11 rounded-lg border text-xs font-semibold flex items-center justify-center gap-2 transition-all",
                    condition === "new"
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border/60 text-muted-foreground"
                  )}
                >
                  <Check
                    size={14}
                    weight="bold"
                    className={condition === "new" ? "opacity-100" : "opacity-0"}
                  />
                  Novo / Lacrado
                </button>
              </div>

              {/* Bairro / Cidade e WhatsApp */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <label
                    htmlFor="donation-location"
                    className="text-xs font-semibold text-muted-foreground"
                  >
                    Bairro ou Ponto de Retirada
                  </label>
                  <div className="relative">
                    <MapPin
                      size={16}
                      className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground"
                    />
                    <Input
                      id="donation-location"
                      type="text"
                      inputMode="text"
                      value={locationName}
                      onChange={(e) => setLocationName(e.target.value)}
                      placeholder="Ex: Centro"
                      className="h-12 pl-9 text-base rounded-lg"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label
                    htmlFor="donation-whatsapp"
                    className="text-xs font-semibold text-muted-foreground"
                  >
                    WhatsApp de Contato
                  </label>
                  <div className="relative">
                    <WhatsappLogo
                      size={16}
                      className="absolute left-3.5 top-1/2 -translate-y-1/2 text-emerald-600"
                    />
                    <Input
                      id="donation-whatsapp"
                      type="tel"
                      inputMode="tel"
                      value={whatsapp}
                      onChange={(e) => setWhatsapp(e.target.value)}
                      placeholder="(49) 99999-9999"
                      className="h-12 pl-9 text-base rounded-lg"
                    />
                  </div>
                </div>
              </div>

              {/* Fotos do Item */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-muted-foreground">
                  Fotos do Item (Opcional)
                </label>
                <div className="flex items-center gap-3 overflow-x-auto py-1">
                  <label className="size-16 rounded-lg border border-dashed border-border flex flex-col items-center justify-center gap-1 cursor-pointer hover:border-primary text-muted-foreground hover:text-primary shrink-0">
                    {isUploadingPhoto ? (
                      <SpinnerGap size={18} className="animate-spin" />
                    ) : (
                      <Camera size={18} />
                    )}
                    <span className="text-[10px] font-semibold">Foto</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoUpload}
                      className="hidden"
                    />
                  </label>
                  {uploadedImages.map((imgUrl, idx) => (
                    <div
                      key={imgUrl + idx}
                      className="relative size-16 rounded-lg overflow-hidden border border-border shrink-0"
                    >
                      <img
                        src={imgUrl}
                        alt="Preview"
                        className="w-full h-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setUploadedImages((prev) =>
                            prev.filter((_, i) => i !== idx)
                          )
                        }
                        className="absolute top-1 right-1 size-5 rounded-full bg-black/70 text-white flex items-center justify-center"
                      >
                        <X size={11} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Observações de Retirada */}
              <div className="space-y-2">
                <label
                  htmlFor="donation-desc"
                  className="text-xs font-semibold text-muted-foreground"
                >
                  Detalhes e Horário para Retirada
                </label>
                <Textarea
                  id="donation-desc"
                  rows={3}
                  required
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Informe dimensões aproximadas, condições e melhor horário para busca..."
                  className="text-base rounded-lg resize-none"
                />
              </div>

              {/* Sticky Submit Footer */}
              <div className="pt-2 pb-4">
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full h-12 rounded-lg font-bold text-sm gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <SpinnerGap size={18} className="animate-spin" />
                      <span>Publicando...</span>
                    </>
                  ) : (
                    <>
                      <Heart size={18} weight="fill" />
                      <span>Publicar Doação Gratuita</span>
                    </>
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
