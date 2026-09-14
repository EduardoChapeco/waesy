import { Tag } from "lucide-react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
 Briefcase,
 MapPin,
 Buildings,
 Laptop,
 GraduationCap,
 Heartbeat,
 Truck,
 Storefront,
 WhatsappLogo,
 ArrowRight,
 UserCheck,
 Money,
 CheckCircle,
 CalendarDots,
 Clock,
 ShareNetwork,
} from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BannerHeroCarousel } from "@/components/commerce/banner-hero-carousel";
import { HotpagesRail } from "@/components/commerce/hotpages-rail";
import { ContextualStoriesRail } from "@/components/stories/contextual-stories-rail";
import { HorizontalRail } from "@/components/commerce/horizontal-rail";
import {
 DiscoveryControlBar,
 type ViewModeType,
 type FilterChipOption,
} from "@/components/commerce/discovery-control-bar";
import { listActiveBanners } from "@/services/banner.functions";
import { listHotpages } from "@/services/hotpage.functions";
import { listPublicJobs, type JobItemDTO } from "@/services/jobs.functions";
import { EmptyState } from "@/components/state/states";
import { resolveNicheDepartments } from "@/lib/niche-helpers";

const JOB_CATEGORY_CHIPS: FilterChipOption[] = [
 { id: "todos", label: "Todas as Vagas", emoji: "💼", icon: Tag },
 { id: "clt", label: "CLT & Comércio", emoji: "🏪", icon: Storefront },
 { id: "estagio", label: "Estágios & Trainee", emoji: "🎓", icon: GraduationCap },
 { id: "tech", label: "TI & Home Office", emoji: "💻", icon: Laptop },
 { id: "saude", label: "Saúde & Clínicas", emoji: "🩺", icon: Heartbeat },
 { id: "operacional", label: "Logística & Frota", emoji: "🚚", icon: Truck },
];

export const Route = createFileRoute("/_store/empregos/")({
 head: () => ({
 meta: [
 { title: "Vagas de Emprego, Carreiras & Estágios" },
 {
 name: "description",
 content:
 "Encontre oportunidades de trabalho, vagas CLT, estágios, home office e vagas no comércio e indústria da região com contato direto com as empresas.",
 },
 ],
 }),
 loader: async () => {
   try {
 const [banners, hotpages, jobs] = await Promise.all([
 listActiveBanners({ data: { placement: "empregos" } }).catch(() => []),
 listHotpages({ data: { module: "empregos" } }).catch(() => []),
 listPublicJobs().catch(() => []),
 ]);

      return { banners: banners || [], hotpages: hotpages || [], jobs: jobs || [] };
    } catch (err) {
      console.error("[loader:_store.empregos.index] Unhandled error:", err);
      return { banners: [], hotpages: [], jobs: [] };
    }
  },
 component: JobsMasterPage,
});

function JobsMasterPage() {
  const loaderData = (Route.useLoaderData() as any) || {};
  const banners = loaderData.banners || [];
  const hotpages = loaderData.hotpages || [];
  const initialJobs = loaderData.jobs || [];
  const [selectedCategory, setSelectedCategory] = useState("todos");
 const [viewMode, setViewMode] = useState<ViewModeType>("feed");
 const [search, setSearch] = useState("");
 const isDefaultFilter = selectedCategory === "todos" && !search;

 const { data: jobs, isLoading } = useQuery({
 queryKey: ["jobs-list", selectedCategory, search],
 queryFn: () =>
 listPublicJobs({
 data: {
 category: selectedCategory !== "todos" ? selectedCategory : undefined,
 search: search || undefined,
 },
 }),
 initialData: isDefaultFilter ? initialJobs : undefined,
 placeholderData: (prev) => prev,
 staleTime: 30_000,
 });

  const jobsList: JobItemDTO[] = (jobs || []) as JobItemDTO[];

  // Agrupamento para modo Feed por Área / Empresa
  const jobsByCategory = useMemo(() => {
    const map = new Map<string, JobItemDTO[]>();
    jobsList.forEach((job: JobItemDTO) => {
      const cat = job.category || "clt";
      if (!map.has(cat)) map.set(cat, []);
      map.get(cat)!.push(job);
    });
    return Array.from(map.entries()).map(([categoryKey, items]) => {
      const chip = JOB_CATEGORY_CHIPS.find((c) => c.id === categoryKey);
      return {
        categoryKey,
        categoryName: chip?.label || "Oportunidades em Aberto",
        items,
      };
    });
  }, [jobsList]);

  // Vagas em destaque para trilho no Feed
  const featuredJobs = useMemo(() => {
    return jobsList.filter((j: JobItemDTO) => j.is_featured).slice(0, 6);
  }, [jobsList]);

 return (
 <div className="w-full space-y-6 pb-20">
 {/* ── 1. Banners Contextuais de Empregos ── */}
 {banners && banners.length > 0 && (
 <BannerHeroCarousel banners={banners} className="w-full" />
 )}

 {/* ── 1.5. Stories de Empresas & Bastidores de Carreiras ── */}
 <ContextualStoriesRail niche="empregos" className="py-1" />

 {/* ── 2. Hotpages Contextuais de Empregos ── */}
 {hotpages && hotpages.length > 0 && (
 <section aria-label="Categorias de Vagas">
 <HotpagesRail
 hotpages={hotpages}
 activeSlug={selectedCategory}
 onSelect={(slug) => setSelectedCategory(slug)}
 />
 </section>
 )}

 <DiscoveryControlBar
 search={search}
 onSearchChange={setSearch}
 searchPlaceholder="Buscar cargo, empresa, tecnologia ou tipo de vaga..."
 categories={JOB_CATEGORY_CHIPS}
 activeCategory={selectedCategory}
 onSelectCategory={setSelectedCategory}
 viewMode={viewMode}
 onViewModeChange={setViewMode}
 allowedViewModes={["feed", "grid", "list"]}
 />

 {/* ── 4. Renderização Conforme o Modo de Visualização ── */}

 {/* MODE 1: FEED / TIMELINE DE VAGAS EM ESTILO POST */}
 {viewMode === "feed" && (
 <div className="space-y-10">
 {/* Trilho de Vagas em Destaque */}
 {featuredJobs.length > 0 && (
 <HorizontalRail
 title="Oportunidades em Destaque"
 hideHeader={true}
 badge="Contratação Imediata"
 actionLabel="Ver grade completa"
 onAction={() => setViewMode("grid")}
 >
 {featuredJobs.map((job: any) => (
 <div key={job.id} className="min-w-[290px] sm:min-w-[320px] max-w-[340px] shrink-0">
 <JobPostCard job={job} />
 </div>
 ))}
 </HorizontalRail>
 )}

 {/* Trilhos por Categoria de Trabalho com Carrossel Padronizado */}
 {jobsByCategory.map(({ categoryKey, categoryName, items }) => (
 <HorizontalRail
 key={categoryKey}
 title={categoryName}
 hideHeader={true}
 actionLabel="Ver todas"
 onAction={() => {
 setSelectedCategory(categoryKey);
 setViewMode("grid");
 }}
 >
 {items.map((job: any) => (
 <div key={job.id} className="min-w-[290px] sm:min-w-[320px] max-w-[340px] shrink-0">
 <JobPostCard job={job} />
 </div>
 ))}
 </HorizontalRail>
 ))}

 {/* Feed Geral de Oportunidades no Fim da Página */}
 <div className="space-y-4 pt-6 ">
 <div className="flex items-center justify-between">
 <h2 className="text-base font-bold text-foreground flex items-center gap-2">
 <Briefcase size={18} weight="bold" className="text-primary" />
 <span>Todas as Vagas Recentes da Região</span>
 </h2>
 
 </div>

 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
 {jobsList.map((job: any) => (
 <JobPostCard key={job.id} job={job} />
 ))}
 </div>
 </div>

 {jobsList.length === 0 && !isLoading && (
 <div className="py-16 text-center space-y-3 bg-card rounded-2xl border border-border/60 p-8">
 <EmptyState title="Nenhuma vaga encontrada com os filtros selecionados." />
 <div className="pt-2">
 <Button
 size="sm"
 variant="outline"
 onClick={() => {
 setSelectedCategory("todos");
 setSearch("");
 }}
 className="rounded-xl font-bold text-xs"
 >
 Ver todas as vagas
 </Button>
 </div>
 </div>
 )}
 </div>
 )}

 {/* MODE 2: GRADE PADRONIZADA COM CARDS ESTILO POST/FEED */}
 {viewMode === "grid" && (
 <div>
 {jobsList.length === 0 && !isLoading ? (
 <div className="py-24 text-center space-y-3 bg-card rounded-2xl border border-border/60 p-8">
 <EmptyState title="Nenhuma vaga disponível no momento com estes critérios." />
 </div>
 ) : (
 <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
 {jobsList.map((job: any) => (
 <JobPostCard key={job.id} job={job} />
 ))}
 </div>
 )}
 </div>
 )}

 {/* MODE 3: LISTA COMPACTA CORPORATIVA (LARGURA MÁXIMA) */}
 {viewMode === "list" && (
 <div className="space-y-3 w-full">
 {jobsList.length === 0 && !isLoading ? (
 <div className="py-24 text-center space-y-3 bg-card rounded-2xl border border-border/60 p-8">
 <EmptyState title="Nenhuma vaga encontrada no momento." />
 </div>
 ) : (
 <div className="flex flex-col space-y-3 w-full">
 {jobsList.map((job: any) => (
 <JobListItem key={job.id} job={job} />
 ))}
 </div>
 )}
 </div>
 )}
 </div>
 );
}

// ─── COMPONENTE PADRONIZADO: CARD DE VAGA COM CAPA FULL & LOGO ────────────────
function JobPostCard({ job }: { job: JobItemDTO }) {
 const coverUrl = (job as any).cover_image_url || job.company_logo_url;
 const whatsappNumber = (job.contact_whatsapp || "").replace(/\D/g, "");

 return (
 <div className="group relative flex flex-col justify-between rounded-2xl border border-border/60 bg-card overflow-hidden hover:border-foreground/25 transition-all duration-300">
 <Link
 to="/empregos/$id"
 params={{ id: job.id }}
 className="focus-visible:outline-none block flex-1 flex flex-col justify-between"
 >
 {/* ── Imagem de Capa Full Bleed (100% largura no topo) ── */}
 <div className="relative aspect-[16/9] w-full overflow-hidden bg-muted/30">
 {coverUrl ? (
 <img
 src={coverUrl}
 alt={job.company_name}
 loading="lazy"
 className="size-full object-cover group-hover:scale-105 transition-transform duration-500"
 />
 ) : (
 <div className="size-full bg-gradient-to-br from-primary/15 via-muted/50 to-muted flex items-center justify-center">
 <Briefcase className="size-8 text-primary/40" />
 </div>
 )}

 {/* Gradiente sutil */}
 <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20" />

 {/* Badge de Modalidade (Remoto / Presencial / Híbrido) */}
 <div className="absolute top-2.5 left-2.5">
 <Badge className="bg-background/90 text-foreground backdrop-blur-md text-[10px] font-bold px-2 py-0.5 rounded-lg">
 {job.workplace_type || "Presencial"}
 </Badge>
 </div>

 {/* Badge de Regime de Contrato */}
 <div className="absolute top-2.5 right-2.5">
 <Badge className="bg-foreground/90 text-background backdrop-blur-md text-[10px] font-black px-2 py-0.5 rounded-lg">
 {job.contract_type || "CLT"}
 </Badge>
 </div>
 </div>

 {/* ── Corpo do Card com Padding Interno ── */}
 <div className="p-4 sm:p-5 space-y-3 flex-1 flex flex-col justify-between">
 <div className="space-y-2">
 <div className="flex items-start gap-3">
 {/* Logo da Empresa Flutuante */}
 <div className="size-12 rounded-2xl bg-card border-2 border-background overflow-hidden shrink-0 flex items-center justify-center -mt-8 sm:-mt-9 relative z-10">
 {job.company_logo_url ? (
 <img
 src={job.company_logo_url}
 alt={job.company_name}
 className="size-full object-cover"
 />
 ) : (
 <div className="size-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm">
 {job.company_name.slice(0, 2).toUpperCase()}
 </div>
 )}
 </div>

 <div className="min-w-0 flex-1 pt-0.5">
 <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block truncate">
 {job.company_name}
 </span>
 <h3 className="text-sm sm:text-base font-bold text-foreground line-clamp-2 leading-snug group-hover:text-primary transition-colors">
 {job.title}
 </h3>
 </div>
 </div>

 {/* Faixa Salarial em Destaque */}
 <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-primary/10 text-primary font-bold text-xs font-mono">
 <Money size={14} weight="bold" />
 <span>{job.salary_display || "Salário a combinar"}</span>
 </div>

 {/* Localização / Cidade */}
 <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
 <MapPin size={14} weight="bold" className="text-foreground shrink-0" />
 <span className="truncate">{job.location || "Regional"}</span>
 </div>

 {/* Benefícios em Pílulas */}
 {job.benefits && job.benefits.length > 0 && (
 <div className="flex flex-wrap gap-1 pt-1">
 {job.benefits.slice(0, 3).map((b, i) => (
 <span
 key={i}
 className="text-[10px] font-semibold bg-muted text-muted-foreground px-2 py-0.5 rounded-md truncate max-w-[140px]"
 >
 {b}
 </span>
 ))}
 </div>
 )}

 {/* Resumo da descrição */}
 {job.description && (
 <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed pt-0.5">
 {job.description}
 </p>
 )}
 </div>

 {/* ── Barra de Ações Rápidas (WhatsApp + Ver Vaga & Candidatar) ── */}
 <div className="pt-3 flex items-center justify-between gap-2 mt-auto">
 {whatsappNumber ? (
 <a
 href={`https://wa.me/55${whatsappNumber}?text=${encodeURIComponent(
 `Olá! Vi a vaga de ${job.title} na ${job.company_name} no Waesy e gostaria de me candidatar.`,
 )}`}
 target="_blank"
 rel="noopener noreferrer"
 onClick={(e) => e.stopPropagation()}
 className="size-9 rounded-xl border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 flex items-center justify-center transition-all shrink-0 cursor-pointer"
 title="Falar no WhatsApp"
 >
 <WhatsappLogo size={18} weight="bold" />
 </a>
 ) : (
 <div />
 )}

 <Button
 asChild
 size="sm"
 className="rounded-xl font-bold text-xs h-9 px-4 flex-1 bg-foreground text-background hover:bg-foreground/90 transition-all gap-1.5 "
 >
 <Link to="/empregos/$id" params={{ id: job.id }}>
 <span>Ver Vaga & Candidatar</span>
 <ArrowRight size={14} weight="bold" />
 </Link>
 </Button>
 </div>
 </div>
 </Link>
 </div>
 );
}

// ─── COMPONENTE: ITEM DE VAGA EM MODO LISTA COMPACTA ──────────────────────────
function JobListItem({ job }: { job: JobItemDTO }) {
 const coverUrl = (job as any).cover_image_url || job.company_logo_url;
 const whatsappNumber = (job.contact_whatsapp || "").replace(/\D/g, "");

 return (
 <div className="flex items-center justify-between p-3 sm:p-4 rounded-2xl border border-border/60 bg-card hover:border-foreground/30 transition-all gap-3.5 group">
 <Link
 to="/empregos/$id"
 params={{ id: job.id }}
 className="flex items-center gap-3.5 min-w-0 flex-1 focus-visible:outline-none"
 >
 {/* Thumbnail de Capa */}
 <div className="relative size-16 sm:size-20 rounded-xl overflow-hidden bg-muted/40 shrink-0 flex items-center justify-center">
 {coverUrl ? (
 <img
 src={coverUrl}
 alt={job.company_name}
 loading="lazy"
 className="size-full object-cover group-hover:scale-105 transition-transform duration-300"
 />
 ) : (
 <Briefcase size={20} className="text-primary/30" />
 )}
 {job.company_logo_url && coverUrl !== job.company_logo_url && (
 <img
 src={job.company_logo_url}
 alt=""
 className="absolute bottom-1 right-1 size-6 rounded-md border border-background object-cover bg-card"
 />
 )}
 </div>

 {/* Informações da Vaga */}
 <div className="min-w-0 space-y-1">
 <div className="flex items-center gap-2">
 <Badge variant="outline" className="text-[9px] font-mono font-bold uppercase px-1.5 py-0 h-4">
 {job.workplace_type || "Presencial"}
 </Badge>
 <span className="text-xs text-muted-foreground font-bold truncate">
 {job.company_name}
 </span>
 </div>

 <h3 className="font-bold text-sm text-foreground truncate group-hover:text-primary transition-colors">
 {job.title}
 </h3>

 <div className="flex items-center gap-2 text-xs text-muted-foreground">
 <span className="font-bold font-mono text-primary">
 {job.salary_display || "A combinar"}
 </span>
 <span>•</span>
 <span className="truncate">{job.location || "Regional"}</span>
 </div>
 </div>
 </Link>

 {/* Botões de Ação na Lista */}
 <div className="flex items-center gap-2 shrink-0">
 {whatsappNumber && (
 <a
 href={`https://wa.me/55${whatsappNumber}?text=${encodeURIComponent(
 `Olá! Vi a vaga de ${job.title} no Waesy e gostaria de mais informações.`,
 )}`}
 target="_blank"
 rel="noopener noreferrer"
 className="size-8 rounded-xl border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 flex items-center justify-center transition-all cursor-pointer"
 title="WhatsApp"
 >
 <WhatsappLogo size={16} weight="bold" />
 </a>
 )}

 <Button
 asChild
 size="sm"
 className="h-8 px-3 rounded-xl font-bold text-xs bg-foreground text-background hover:bg-foreground/90 "
 >
 <Link to="/empregos/$id" params={{ id: job.id }}>
 Candidatar
 </Link>
 </Button>
 </div>
 </div>
 );
}
