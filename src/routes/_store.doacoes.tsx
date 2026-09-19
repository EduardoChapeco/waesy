import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { z } from "zod";
import { useState, useMemo } from "react";
import {
 Heart,
 HandHeart,
 Armchair,
 TShirt,
 BookOpen,
 Users,
 PlusCircle,
 MapPin,
 ArrowRight,
} from "@phosphor-icons/react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/state/states";
import { PageSkeleton } from "@/components/state/loading";
import {
 DiscoveryControlBar,
 type ViewModeType,
 type FilterChipOption,
} from "@/components/commerce/discovery-control-bar";

const SearchSchema = z.object({
 q: z.string().optional(),
 categoria: z.string().optional(),
});

type DoacoesSearch = z.infer<typeof SearchSchema>;

const DOACOES_CATEGORIES: FilterChipOption[] = [
 { id: "todos", label: "Todas as Doações & Ações", icon: Heart },
 { id: "moveis", label: "Móveis & Eletrodomésticos", icon: Armchair },
 { id: "roupas", label: "Roupas & Agasalhos", icon: TShirt },
 { id: "livros", label: "Livros & Material Escolar", icon: BookOpen },
 { id: "voluntariado", label: "Oportunidades de Voluntariado", icon: HandHeart },
 { id: "ongs", label: "Campanhas de ONGs Locais", icon: Users },
];

export const Route = createFileRoute("/_store/doacoes")({
 head: () => ({
 meta: [
 { title: "Doações, Solidariedade & Voluntariado | Waesy" },
 {
 name: "description",
 content:
 "Espaço comunitário para doação gratuita de móveis, roupas, livros, campanhas solidárias e voluntariado na sua cidade.",
 },
 ],
 }),
 validateSearch: (search: Record<string, unknown>): DoacoesSearch => SearchSchema.parse(search),
 loaderDeps: ({ search }) => search,
 loader: async () => {
   try {
 return {};
   } catch (err) {
     console.error("[loader:_store.doacoes] Unhandled error:", err);
     return {} as any;
    }
 },
 component: DoacoesPage,
 pendingComponent: PageSkeleton,
});

function DoacoesPage() {
 const search = Route.useSearch();
 const navigate = useNavigate({ from: Route.fullPath });

 const [activeCategory, setActiveCategory] = useState(search.categoria || "todos");

 const handleCategoryChange = (catId: string) => {
 setActiveCategory(catId);
 navigate({
 search: (prev) => ({
 ...prev,
 categoria: catId === "todos" ? undefined : catId,
 }),
 });
 };

 const handleSearchChange = (q: string) => {
 navigate({
 search: (prev) => ({
 ...prev,
 q: q || undefined,
 }),
 });
 };

 return (
 <div className="w-full space-y-6 pb-20">
 {/* ── 1. Ação Rápida de Doação ── */}
 <div className="flex items-center justify-between gap-4 p-4 sm:p-5 rounded-2xl bg-card ">
 <div className="flex items-center gap-3">
 <div className="size-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
 <Heart size={20} weight="fill" />
 </div>
 <div>
 <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-primary">
 Impacto Solidário
 </span>
 <p className="text-xs text-muted-foreground font-medium">
 Doe itens que não usa mais ou apoie campanhas e famílias da região.
 </p>
 </div>
 </div>

 <Link
 to="/conta/classificados/novo"
 search={{ tipo: "desapego" }}
 className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl font-bold text-xs bg-primary text-primary-foreground hover:bg-primary/90 transition-all shrink-0"
 >
 <PlusCircle size={15} weight="bold" />
 <span>Anunciar Doação</span>
 </Link>
 </div>

 {/* ── 2. Barra de Filtros ── */}
 <DiscoveryControlBar
 search={search.q || ""}
 onSearchChange={handleSearchChange}
 searchPlaceholder="Buscar por itens para doação ou campanhas..."
 categories={DOACOES_CATEGORIES}
 activeCategory={activeCategory}
 onSelectCategory={handleCategoryChange}
 viewMode="grid"
 />

 {/* ── 3. Categorias de Ação Social ── */}
 <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
 <div className="p-5 rounded-2xl bg-card space-y-3">
 <div className="size-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
 <Armchair size={20} weight="bold" />
 </div>
 <div>
 <h3 className="text-sm font-bold text-foreground">Móveis & Utensílios</h3>
 <p className="text-xs text-muted-foreground mt-1">
 Sofás, camas, mesas e armários disponíveis para retirada gratuita por quem precisa.
 </p>
 </div>
 <Link
 to="/classificados"
 search={{ category: "doacoes" }}
 className="inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline pt-2"
 >
 Ver Doações Disponíveis <ArrowRight size={12} />
 </Link>
 </div>

 <div className="p-5 rounded-2xl bg-card space-y-3">
 <div className="size-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
 <TShirt size={20} weight="bold" />
 </div>
 <div>
 <h3 className="text-sm font-bold text-foreground">Campanha do Agasalho</h3>
 <p className="text-xs text-muted-foreground mt-1">
 Roupas de inverno, cobertores e calçados infantis e adultos em bom estado.
 </p>
 </div>
 <Link
 to="/classificados"
 search={{ category: "doacoes" }}
 className="inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline pt-2"
 >
 Ver Pontos de Coleta <ArrowRight size={12} />
 </Link>
 </div>

 <div className="p-5 rounded-2xl bg-card space-y-3">
 <div className="size-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
 <HandHeart size={20} weight="bold" />
 </div>
 <div>
 <h3 className="text-sm font-bold text-foreground">Voluntariado em ONGs</h3>
 <p className="text-xs text-muted-foreground mt-1">
 Projetos sociais, apoio escolar comunitário, cuidados com animais resgatados e eventos beneficentes.
 </p>
 </div>
 <Link
 to="/empregos"
 search={{ tipo: "voluntario" }}
 className="inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline pt-2"
 >
 Ver Vagas de Voluntariado <ArrowRight size={12} />
 </Link>
 </div>
 </div>
 </div>
 );
}
