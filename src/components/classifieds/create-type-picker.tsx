import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Link } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight, Loader2, Search, Wand2, Tag } from "lucide-react";
import { cn } from "@/lib/utils";
import { createListingWithAI } from "@/services/ai-sdr.functions";
import type { ClassifiedNicheType, NicheDefinition } from "@/routes/_store.conta.classificados.novo";

type DesapegoTaxonomyItem = { id: string; label: string; desc: string };

export function CreateTypePicker({ onSelect, onAiPrefill, nicheCards, desapegoTaxonomy }: {
  onSelect: (typeId: ClassifiedNicheType, sub?: string) => void;
  onAiPrefill?: (listing: any) => void;
  nicheCards: NicheDefinition[];
  desapegoTaxonomy: DesapegoTaxonomyItem[];
}) {
  const [searchFilter, setSearchFilter] = useState("");
  const [aiPrompt, setAiPrompt] = useState("");
  const [isAiGenerating, setIsAiGenerating] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const handleGenerateWithAi = async () => {
    const trimmed = aiPrompt.trim();
    if (!trimmed) {
      toast.error("Descreva o que você quer anunciar primeiro.");
      return;
    }
    setIsAiGenerating(true);
    toast.loading("A Inteligência Artificial está montando seu anúncio...", { id: "ai-ad" });
    try {
      const res = await createListingWithAI({ data: { prompt: trimmed } });
      if (res?.success && res.listing) {
        toast.success("Anúncio estruturado com IA! Revise os dados.", { id: "ai-ad" });
        if (onAiPrefill) {
          onAiPrefill(res.listing);
        } else {
          onSelect((res.listing.niche as ClassifiedNicheType) || "desapego");
        }
      } else {
        toast.error("Não foi possível gerar os dados. Escolha a categoria abaixo.", { id: "ai-ad" });
      }
    } catch (e: any) {
      console.warn("Erro ao gerar anúncio com IA:", e);
      toast.error(e?.message || "Erro ao conectar com a IA. Escolha a categoria manualmente.", { id: "ai-ad" });
    } finally {
      setIsAiGenerating(false);
    }
  };

  const handleScroll = (direction: "left" | "right") => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({
        left: direction === "left" ? -300 : 300,
        behavior: "smooth",
      });
    }
  };

  const personalNiches = useMemo(() => {
    const ids = ["desapego", "veiculo", "imovel", "servico", "vaga", "digital", "hospedagem", "equipamento", "doacao", "viagem"];
    if (!searchFilter.trim()) return nicheCards.filter(n => ids.includes(n.id));
    const q = searchFilter.toLowerCase();
    return nicheCards.filter(n => ids.includes(n.id) && (n.title.toLowerCase().includes(q) || n.subtitle.toLowerCase().includes(q) || n.description.toLowerCase().includes(q)));
  }, [searchFilter]);

  const businessNiches = useMemo(() => {
    const ids = ["assinatura", "gastronomia", "farmacia", "mercado"];
    if (!searchFilter.trim()) return nicheCards.filter(n => ids.includes(n.id));
    const q = searchFilter.toLowerCase();
    return nicheCards.filter(n => ids.includes(n.id) && (n.title.toLowerCase().includes(q) || n.subtitle.toLowerCase().includes(q) || n.description.toLowerCase().includes(q)));
  }, [searchFilter]);

  const filteredDesapegoItems = useMemo(() => {
    if (!searchFilter.trim()) return [];
    const q = searchFilter.toLowerCase();
    return desapegoTaxonomy.filter(
      (d) =>
        d.label.toLowerCase().includes(q) ||
        d.desc.toLowerCase().includes(q)
    );
  }, [searchFilter]);

  const [scopeTab, setScopeTab] = useState<"all" | "personal" | "business">("all");

  const visibleNiches = useMemo(() => {
    if (scopeTab === "personal") return personalNiches;
    if (scopeTab === "business") return businessNiches;
    return [...personalNiches, ...businessNiches];
  }, [scopeTab, personalNiches, businessNiches]);

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6 pb-20 px-1 sm:px-0">
      {/* ── 1. Clean Minimalist Header ── */}
      <div className="flex items-center justify-between gap-4 border-b border-border/40 pb-4 pt-1">
        <div className="flex items-center gap-2">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
            Criar Anúncio
          </h1>
          <Badge variant="outline" className="text-xs font-semibold text-muted-foreground border-border/60">
            {nicheCards.length} Formatos
          </Badge>
        </div>
        <Button asChild size="sm" variant="outline" className="rounded-lg text-xs font-semibold h-11 min-h-11 px-4 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary border-border/70">
          <Link to="/conta/classificados">Meus Anúncios</Link>
        </Button>
      </div>

      {/* ── Tabs Limpas no Topo (Apple HIG Segmented Control) ── */}
      <div className="flex items-center gap-1 p-1 bg-muted/40 rounded-lg border border-border/50 max-w-md">
        <button
          type="button"
          onClick={() => setScopeTab("all")}
          className={cn(
            "flex-1 py-2 px-3 rounded-lg text-xs font-semibold transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
            scopeTab === "all"
              ? "bg-background text-foreground  border border-border/70"
              : "text-muted-foreground hover:text-foreground border border-transparent"
          )}
        >
          Todos ({personalNiches.length + businessNiches.length})
        </button>
        <button
          type="button"
          onClick={() => setScopeTab("personal")}
          className={cn(
            "flex-1 py-2 px-3 rounded-lg text-xs font-semibold transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
            scopeTab === "personal"
              ? "bg-background text-foreground  border border-border/70"
              : "text-muted-foreground hover:text-foreground border border-transparent"
          )}
        >
          Pessoal ({personalNiches.length})
        </button>
        <button
          type="button"
          onClick={() => setScopeTab("business")}
          className={cn(
            "flex-1 py-2 px-3 rounded-lg text-xs font-semibold transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
            scopeTab === "business"
              ? "bg-background text-foreground  border border-border/70"
              : "text-muted-foreground hover:text-foreground border border-transparent"
          )}
        >
          Negócios ({businessNiches.length})
        </button>
      </div>

      {/* ── Ação Unificada: Busca & Criar com IA Adjacente (Sem Layout Shift) ── */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            value={searchFilter || aiPrompt}
            onChange={(e) => {
              setSearchFilter(e.target.value);
              setAiPrompt(e.target.value);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleGenerateWithAi();
              }
            }}
            placeholder="Busque categorias ou descreva seu anúncio (ex: iPhone 13 Pro 128GB)..."
            className="pl-10 pr-16 h-11 rounded-lg text-xs sm:text-sm bg-card border-border/70 focus-visible:ring-1 focus-visible:ring-foreground/20"
            id="ai-intent-input"
          />
          {(searchFilter || aiPrompt) && (
            <button
              type="button"
              onClick={() => {
                setSearchFilter("");
                setAiPrompt("");
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-foreground cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary px-2 py-1"
            >
              Limpar
            </button>
          )}
        </div>
        <Button
          type="button"
          disabled={isAiGenerating}
          onClick={handleGenerateWithAi}
          variant="outline"
          className="h-11 px-4 rounded-lg font-semibold text-xs border border-border/80 text-foreground hover:bg-muted/40 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary shrink-0"
        >
          {isAiGenerating ? (
            <Loader2 className="size-4 mr-2 animate-spin motion-reduce:animate-none" />
          ) : (
            <Wand2 className="size-4 mr-2 text-primary" />
          )}
          {isAiGenerating ? "Gerando..." : "Criar com IA"}
        </Button>
      </div>

      {/* ── MOBILE: The WhatsApp List Pattern (Listas Verticais Limpas) ── */}
      <div className="block sm:hidden space-y-1">
        <span className="text-xs text-muted-foreground/75 font-bold uppercase tracking-wider text-muted-foreground block px-1 py-1">
          {scopeTab === "personal"
            ? "Formatos para Você"
            : scopeTab === "business"
            ? "Formatos para Negócios"
            : "Todos os Formatos"}
        </span>
        <div className="divide-y divide-border/20 rounded-lg border border-border/50 bg-card overflow-hidden">
          {visibleNiches.map((niche) => {
            const Icon = niche.icon;
            return (
              <button
                key={niche.id}
                onClick={() => onSelect(niche.id)}
                className="w-full flex items-center justify-between p-4 hover:bg-muted/30 active:bg-muted/50 transition-colors text-left cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary min-h-14"
              >
                <div className="flex items-center gap-4 min-w-0">
                  <div className="size-11 rounded-full border border-border/60 flex items-center justify-center shrink-0 text-foreground bg-background">
                    <Icon className="size-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-semibold text-foreground truncate">
                        {niche.title}
                      </h3>
                      <span className="text-xs font-medium text-muted-foreground border border-border/60 px-2 py-0.2 rounded-sm shrink-0">
                        {niche.badge}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground truncate mt-1">
                      {niche.subtitle}
                    </p>
                  </div>
                </div>
                <ChevronRight className="size-4 text-muted-foreground shrink-0 ml-2" />
              </button>
            );
          })}
        </div>
      </div>

      {/* ── DESKTOP: Trilho de Cards Refinado (Apple HIG Clean) ── */}
      <div className="hidden sm:block space-y-6">
        {/* Trilho Pessoal */}
        {(scopeTab === "all" || scopeTab === "personal") && personalNiches.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">
                Para Você (Comunidade)
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleScroll("left")}
                  className="size-11 min-h-11 min-w-11 rounded-lg border border-border/70 bg-card hover:bg-muted flex items-center justify-center text-foreground transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  title="Rolar para a esquerda"
                  aria-label="Rolar para esquerda"
                >
                  <ChevronLeft className="size-4" />
                </button>
                <button
                  type="button"
                  onClick={() => handleScroll("right")}
                  className="size-11 min-h-11 min-w-11 rounded-lg border border-border/70 bg-card hover:bg-muted flex items-center justify-center text-foreground transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  title="Rolar para a direita"
                  aria-label="Rolar para direita"
                >
                  <ChevronRight className="size-4" />
                </button>
              </div>
            </div>

            <div className="relative group/rail">
              <div
                ref={scrollContainerRef}
                className="flex flex-row gap-4 overflow-x-auto carousel snap-x snap-mandatory no-scrollbar py-1 px-1 scroll-smooth"
              >
                {personalNiches.map((niche) => {
                  const Icon = niche.icon;
                  return (
                    <button
                      key={niche.id}
                      onClick={() => onSelect(niche.id)}
                      className="w-68 min-w-68 h-11 min-h-116 shrink-0 snap-start text-left relative rounded-lg border border-border/60 bg-card hover:border-foreground/40 hover: transition-colors duration-200 p-5 flex flex-col justify-between overflow-hidden group cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="size-12 rounded-lg bg-muted/40 border border-border/70 flex items-center justify-center text-foreground group-hover:scale-105 transition-colors">
                          <Icon className="size-6" />
                        </div>
                        <span className="text-xs font-semibold text-muted-foreground border border-border/60 px-2 py-1 rounded-md">
                          {niche.badge}
                        </span>
                      </div>

                      <div className="space-y-2 flex-1 flex flex-col justify-center mt-3">
                        <h3 className="text-base font-bold text-foreground group-hover:text-primary transition-colors line-clamp-2">
                          {niche.title}
                        </h3>
                        <p className="text-xs font-semibold text-foreground/80">
                          {niche.subtitle}
                        </p>
                        <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed">
                          {niche.description}
                        </p>
                      </div>

                      <div className="pt-3 border-t border-border/40 flex items-center justify-between text-xs font-semibold text-foreground group-hover:text-primary transition-colors">
                        <span>Criar Anúncio</span>
                        <ChevronRight className="size-4 group-hover:translate-x-1 transition-transform" />
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Trilho Negócios */}
        {(scopeTab === "all" || scopeTab === "business") && businessNiches.length > 0 && (
          <div className="space-y-3 pt-4 border-t border-border/30">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">
              Para o Seu Negócio (Varejo e Serviços)
            </span>

            <div className="flex flex-row gap-4 overflow-x-auto carousel snap-x snap-mandatory no-scrollbar py-1 px-1 scroll-smooth">
              {businessNiches.map((niche) => {
                const Icon = niche.icon;
                return (
                  <button
                    key={niche.id}
                    onClick={() => onSelect(niche.id)}
                    className="w-68 min-w-68 h-11 min-h-116 shrink-0 snap-start text-left relative rounded-lg border border-border/60 bg-card hover:border-foreground/40 hover: transition-colors duration-200 p-5 flex flex-col justify-between overflow-hidden group cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="size-12 rounded-lg bg-muted/40 border border-border/70 flex items-center justify-center text-foreground group-hover:scale-105 transition-colors">
                        <Icon className="size-6" />
                      </div>
                      <span className="text-xs font-semibold text-muted-foreground border border-border/60 px-2 py-1 rounded-md">
                        {niche.badge}
                      </span>
                    </div>

                    <div className="space-y-2 flex-1 flex flex-col justify-center mt-3">
                      <h3 className="text-base font-bold text-foreground group-hover:text-primary transition-colors line-clamp-2">
                        {niche.title}
                      </h3>
                      <p className="text-xs font-semibold text-foreground/80">
                        {niche.subtitle}
                      </p>
                      <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed">
                        {niche.description}
                      </p>
                    </div>

                    <div className="pt-3 border-t border-border/40 flex items-center justify-between text-xs font-semibold text-foreground group-hover:text-primary transition-colors">
                      <span>Criar Anúncio</span>
                      <ChevronRight className="size-4 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* ── 3. Categorias Rápidas para Desapego ── */}
      <div className="space-y-2 pt-2 border-t border-border/40">
        <span className="text-xs text-muted-foreground/75 font-bold uppercase tracking-wider text-muted-foreground block">
          Categorias Populares para Desapego Rápido
        </span>
        <div className="flex flex-wrap gap-2">
          {desapegoTaxonomy.slice(0, 8).map((cat) => (
            <Badge
              key={cat.id}
              variant="outline"
              onClick={() => onSelect("desapego", cat.id)}
              className="text-xs py-2 px-3 rounded-lg gap-2 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary hover:bg-primary/10 hover:text-primary hover:border-primary/30 transition-colors"
            >
              <span>{cat.label}</span>
            </Badge>
          ))}
        </div>
      </div>

      {filteredDesapegoItems.length > 0 && (
        <div className="space-y-2 pt-2">
          <span className="text-xs text-muted-foreground/75 font-bold uppercase tracking-wider text-primary block">
            Itens Específicos Encontrados ({filteredDesapegoItems.length})
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {filteredDesapegoItems.map((item) => (
              <button
                key={item.id}
                onClick={() => onSelect("desapego", item.id)}
                className="flex items-center gap-3 p-4 rounded-lg border border-border/60 bg-card hover:bg-muted/40 text-left transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <div className="size-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <Tag className="size-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-foreground truncate">{item.label}</p>
                  <p className="text-xs text-muted-foreground/75 text-muted-foreground truncate">{item.desc}</p>
                </div>
                <ChevronRight className="size-4 text-muted-foreground" />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
