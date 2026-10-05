import { resolveActiveCity } from "@/lib/city-helper";
import { Tag } from "lucide-react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Briefcase, MapPin, Buildings, Laptop, GraduationCap, Heartbeat, Truck, Storefront, WhatsappLogo, ArrowRight, UserCheck, Money, CheckCircle, CalendarDots, Clock, ShareNetwork, ArrowSquareOut, FileText } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BannerHeroCarousel } from "@/components/commerce/banner-hero-carousel";
import { HotpagesRail } from "@/components/commerce/hotpages-rail";
import { ContextualStoriesRail } from "@/components/stories/contextual-stories-rail";
import { HorizontalRail } from "@/components/commerce/horizontal-rail";
import { DiscoveryControlBar, type ViewModeType, type FilterChipOption } from "@/components/commerce/discovery-control-bar";
import { NativeMobileHeader } from "@/components/navigation/native-mobile-header";
import { listActiveBanners } from "@/services/banner.functions";
import { listHotpages } from "@/services/hotpage.functions";
import { listPublicJobs, type JobItemDTO } from "@/services/jobs.functions";
import { EmptyState } from "@/components/state/states";
import { resolveNicheDepartments } from "@/lib/niche-helpers";
import { findProfessionByTitle } from "@/lib/data/professions-catalog";
import { formatMoney } from "@/lib/money";
import { ProfessionSearchDialog } from "@/components/admin/professions/profession-search-dialog";

const JOB_CATEGORY_CHIPS: FilterChipOption[] = [
 { id: "todos", label: "Todas", icon: Tag },
 { id: "clt", label: "Comércio", icon: Storefront },
 { id: "estagio", label: "Estágio", icon: GraduationCap },
 { id: "tech", label: "Tecnologia", icon: Laptop },
 { id: "saude", label: "Saúde", icon: Heartbeat },
 { id: "operacional", label: "Logística", icon: Truck },
];

export const Route = createFileRoute("/_store/empregos/")({
 head: () => ({
 meta: [
 { title: "Vagas de Emprego" },
 {
 name: "description",
 content:
 "Encontre oportunidades de trabalho, vagas CLT, estágios, home office e vagas no comércio e indústria da região com contato direto com as empresas.",
 },
 ],
 }),
 loader: async ({ location }) => {
    const activeCity = resolveActiveCity(location?.search);
   try {
 const [banners, hotpages, jobs] = await Promise.all([
 listActiveBanners({ data: { placement: "empregos", city: activeCity } }).catch(() => []),
 listHotpages({ data: { module: "empregos" } }).catch(() => []),
 listPublicJobs({ data: { city: activeCity } }).catch(() => []),
 ]);

      return { banners: banners || [], hotpages: hotpages || [], jobs: jobs || [], activeCity };
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
  const activeCity = loaderData.activeCity || "";
  const [selectedCategory, setSelectedCategory] = useState("todos");
  const [viewMode, setViewMode] = useState<ViewModeType>("feed");
  const [search, setSearch] = useState("");
  const isDefaultFilter = selectedCategory === "todos" && !search;
  const [isProfessionGuideOpen, setIsProfessionGuideOpen] = useState(false);

 const { data: jobs, isLoading } = useQuery({
 queryKey: ["jobs-list", selectedCategory, search, activeCity],
 queryFn: () =>
 listPublicJobs({
 data: {
 category: selectedCategory !== "todos" ? selectedCategory : undefined,
 search: search || undefined,
 city: activeCity || undefined,
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
 <div className="w-full max-w-5xl mx-auto px-4 sm:px-5 space-y-6 pb-24">
      <div className="-mx-4 sm:-mx-5">
        <NativeMobileHeader
          title="Vagas"
          centerTitle
          fallbackHref="/"
          searchValue={search}
          onSearchChange={setSearch}
          searchPlaceholder="Buscar cargo, empresa ou vaga..."
        />
      </div>
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

      {/* ── 2.5. Barra de Ações do Candidato & Guia Salarial ── */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-1">
        <div className="flex items-center gap-2">
          <Button asChild size="sm" variant="outline" className="rounded-lg text-xs font-bold h-11 min-h-11 gap-2 cursor-pointer">
            <Link to="/conta/curriculo">
              <FileText size={16} weight="bold" className="text-primary" />
              <span>Meu Currículo Digital</span>
            </Link>
          </Button>
          <Button asChild size="sm" variant="ghost" className="rounded-lg text-xs font-semibold h-11 min-h-11 gap-2 cursor-pointer">
            <Link to="/conta/candidaturas">
              <UserCheck size={16} weight="bold" />
              <span className="hidden sm:inline">Minhas Candidaturas</span>
              <span className="sm:hidden">Candidaturas</span>
            </Link>
          </Button>
        </div>

        <button
          type="button"
          onClick={() => setIsProfessionGuideOpen(true)}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-primary/20 bg-primary/5 hover:bg-primary/10 text-primary text-xs font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ml-auto cursor-pointer min-h-11"
        >
          <Briefcase size={15} weight="bold" />
          <span>Guia Salarial</span>
        </button>
      </div>

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

      <ProfessionSearchDialog
        open={isProfessionGuideOpen}
        onOpenChange={setIsProfessionGuideOpen}
        onSelectProfession={(prof) => {
          setSearch(prof.title);
          setIsProfessionGuideOpen(false);
        }}
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
              <div key={job.id} className="w-72 sm:w-80 shrink-0">
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
              <div key={job.id} className="w-72 sm:w-80 shrink-0">
 <JobPostCard job={job} />
 </div>
 ))}
 </HorizontalRail>
 ))}

 {/* Feed Geral de Oportunidades no Fim da Página */}
 <div className="space-y-4 pt-6">
 

 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
 {jobsList.map((job: any) => (
 <JobPostCard key={job.id} job={job} />
 ))}
 </div>
 </div>

 {jobsList.length === 0 && !isLoading && (
 <div className="py-16 text-center space-y-3 bg-card rounded-lg border border-border/60 p-8">
 <EmptyState title="Nenhuma vaga encontrada com os filtros selecionados." />
 <div className="pt-2">
 <Button
 size="sm"
 variant="outline"
 onClick={() => {
 setSelectedCategory("todos");
 setSearch("");
 }}
 className="rounded-lg font-bold text-xs h-11 px-4"
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
 <div className="py-24 text-center space-y-3 bg-card rounded-lg border border-border/60 p-8">
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
 <div className="py-24 text-center space-y-3 bg-card rounded-lg border border-border/60 p-8">
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
 const matchedProfession = useMemo(() => findProfessionByTitle(job.title), [job.title]);

 return (
  <div className="group relative flex flex-col justify-between rounded-lg border border-border/60 bg-card overflow-hidden hover:border-foreground/25 transition-colors duration-200">
 <Link
 to="/empregos/$id"
 params={{ id: job.id }}
 className="focus-visible:outline-none block flex-1 flex flex-col justify-between"
 >
 {/* ── Imagem de Capa Full Bleed (100% largura no topo) ── */}
    <div className="relative aspect-video w-full overflow-hidden bg-muted/30">
 {coverUrl ? (
 <img
 src={coverUrl}
 alt={job.company_name}
 loading="lazy"
              className="size-full object-cover group-hover:scale-105 transition-transform duration-200"
 />
 ) : (
            <div className="size-full bg-muted/30 flex items-center justify-center">
 <Briefcase className="size-8 text-primary/40" />
 </div>
 )}

 {/* Gradiente sutil */}


        {/* Badge de Modalidade e Vaga Externa */}
        <div className="absolute top-2.5 left-2.5 flex items-center gap-2">
          <Badge className="bg-background/90 text-foreground text-xs font-bold px-2 py-1 rounded-lg">
            {job.workplace_type || "Presencial"}
          </Badge>
          {job.is_external && (
            <Badge className="bg-primary/90 text-primary-foreground text-xs font-bold px-2 py-1 rounded-lg">
              Oficial
            </Badge>
          )}
        </div>

 {/* Badge de Regime de Contrato */}
 <div className="absolute top-2.5 right-2.5">
            <Badge className="bg-foreground/90 text-background text-xs font-black px-2 py-1 rounded-lg">
 {job.contract_type || "CLT"}
 </Badge>
 </div>
 </div>

 {/* ── Corpo do Card com Padding Interno ── */}
 <div className="p-4 sm:p-5 space-y-3 flex-1 flex flex-col justify-between">
 <div className="space-y-2">
 <div className="flex items-start gap-3">
 {/* Logo da Empresa Flutuante */}
 <div className="size-12 rounded-lg bg-card border-2 border-background overflow-hidden shrink-0 flex items-center justify-center -mt-8 sm:-mt-9 relative z-10">
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

 <div className="min-w-0 flex-1 pt-1">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider block truncate">
 {job.company_name}
 </span>
 <h3 className="text-sm sm:text-base font-bold text-foreground line-clamp-2 leading-snug group-hover:text-primary transition-colors">
 {job.title}
 </h3>
 </div>
 </div>

              {/* Faixa Salarial em Destaque */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-primary/10 text-primary font-bold text-xs font-mono">
                  <Money size={14} weight="bold" />
                  <span>{job.salary_display || "Salário a combinar"}</span>
                </div>
                {matchedProfession && (
                  <Badge
                    variant="outline"
                    className="text-xs border-primary/20 text-muted-foreground font-medium px-2 py-1"
                    title={`Faixa de mercado: ${formatMoney(matchedProfession.junior_salary_cents)} até ${formatMoney(matchedProfession.senior_salary_cents)}`}
                  >
                    {matchedProfession.sector}
                  </Badge>
                )}
              </div>

 {/* Localização / Cidade */}
 <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium">
 <MapPin size={14} weight="bold" className="text-foreground shrink-0" />
 <span className="truncate">{job.location || "Regional"}</span>
 </div>

 {/* Benefícios em Pílulas */}
 {job.benefits && job.benefits.length > 0 && (
 <div className="flex flex-wrap gap-1 pt-1">
 {job.benefits.slice(0, 3).map((b, i) => (
 <span
 key={i}
                    className="text-xs font-semibold bg-muted text-muted-foreground px-2 py-1 rounded-md truncate max-w-36"
 >
 {b}
 </span>
 ))}
 </div>
 )}

 {/* Resumo da descrição */}
 {job.description && (
 <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed pt-1">
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
                className="size-11 rounded-lg border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 flex items-center justify-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring shrink-0 cursor-pointer"
 title="Falar no WhatsApp"
 >
 <WhatsappLogo size={18} weight="bold" />
 </a>
 ) : (
 <div />
 )}

        {job.is_external && job.external_url ? (
          <Button
            asChild
            size="sm"
            className="rounded-lg font-bold text-xs h-11 px-4 flex-1 bg-primary text-primary-foreground hover:bg-primary/90 transition-colors gap-2"
          >
            <a href={job.external_url} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="focus-visible:outline-none focus-visible:ring-2">
              <span>Site Oficial</span>
              <ArrowSquareOut size={14} weight="bold" />
            </a>
          </Button>
        ) : (
          <Button
            asChild
            size="sm"
            className="rounded-lg font-bold text-xs h-11 px-4 flex-1 bg-foreground text-background hover:bg-foreground/90 transition-colors gap-2"
          >
            <Link to="/empregos/$id" params={{ id: job.id }}>
              <span>Ver Vaga</span>
              <ArrowRight size={14} weight="bold" />
            </Link>
          </Button>
        )}
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
  const matchedProfession = useMemo(() => findProfessionByTitle(job.title), [job.title]);

  return (
    <div className="group relative overflow-hidden rounded-lg border border-border/60 bg-card min-h-32 pl-28 sm:pl-36 p-4 sm:p-4 hover:border-foreground/30 transition-colors flex items-center justify-between gap-4">
      <Link
        to="/empregos/$id"
        params={{ id: job.id }}
        className="absolute inset-y-0 left-0 w-28 sm:w-36 overflow-hidden rounded-l-lg bg-muted/40 border-r border-border/40 flex items-center justify-center focus-visible:outline-none"
      >
        {coverUrl ? (
          <img
            src={coverUrl}
            alt={job.company_name}
            loading="lazy"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <Briefcase size={24} className="text-primary/30" />
        )}
        {job.company_logo_url && coverUrl !== job.company_logo_url && (
          <img
            src={job.company_logo_url}
            alt=""
            className="absolute bottom-1.5 right-1.5 size-6 rounded-md border border-background object-cover bg-card shadow-2xs"
          />
        )}
      </Link>

      <Link
        to="/empregos/$id"
        params={{ id: job.id }}
        className="min-w-0 flex-1 space-y-2 pl-1 focus-visible:outline-none"
      >
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs font-mono font-bold uppercase px-2 py-0 h-4">
            {job.workplace_type || "Presencial"}
          </Badge>
          <span className="text-xs text-muted-foreground font-bold truncate">
            {job.company_name}
          </span>
        </div>

        <h3 className="font-bold text-sm text-foreground line-clamp-2 group-hover:text-primary transition-colors">
          {job.title}
        </h3>

        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span className="font-bold font-mono text-primary">
            {job.salary_display || "A combinar"}
          </span>
          {matchedProfession && (
            <>
              <span>•</span>
              <span
                className="text-xs font-mono px-2 py-1 rounded bg-muted text-foreground font-semibold"
                title={`CBO ${matchedProfession.cbo_code} • Piso ${formatMoney(matchedProfession.junior_salary_cents)}`}
              >
                {matchedProfession.sector}
              </span>
            </>
          )}
          <span>•</span>
          <span className="truncate">{job.location || "Regional"}</span>
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
            className="size-11 rounded-lg border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 flex items-center justify-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring cursor-pointer"
            title="WhatsApp"
          >
            <WhatsappLogo size={18} weight="bold" />
          </a>
        )}

        {job.is_external && job.external_url ? (
          <Button
            asChild
            size="sm"
            className="h-11 px-4 rounded-lg font-bold text-xs bg-primary text-primary-foreground hover:bg-primary/90 gap-1"
          >
            <a href={job.external_url} target="_blank" rel="noopener noreferrer">
              <span>Site</span>
              <ArrowSquareOut size={12} weight="bold" />
            </a>
          </Button>
        ) : (
          <Button
            asChild
            size="sm"
            className="h-11 px-4 rounded-lg font-bold text-xs bg-foreground text-background hover:bg-foreground/90"
          >
            <Link to="/empregos/$id" params={{ id: job.id }}>
              Ver
            </Link>
          </Button>
        )}
      </div>
    </div>
  );
}
