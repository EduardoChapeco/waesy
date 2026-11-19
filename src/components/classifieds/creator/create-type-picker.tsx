import { useMemo, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight, Loader2, Search, Tag, Wand2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { createListingWithAI } from "@/services/ai-sdr.functions";
import { cn } from "@/lib/utils";
import {
  DESAPEGO_TAXONOMY,
  NICHE_CARDS,
  type ClassifiedNicheType,
  type NicheDefinition,
} from "./niche-cards";

function NicheDesktopCard({
  niche,
  onSelect,
}: {
  niche: NicheDefinition;
  onSelect: (typeId: ClassifiedNicheType) => void;
}) {
  const Icon = niche.icon;
  return (
    <button
      type="button"
      onClick={() => onSelect(niche.id)}
      className="w-68 min-w-68 min-h-72 shrink-0 snap-start text-left relative rounded-lg border border-border/60 bg-card hover:border-foreground/40 transition-colors duration-200 p-5 flex flex-col justify-between overflow-hidden group cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="size-12 rounded-lg bg-muted/40 border border-border/70 flex items-center justify-center text-foreground group-hover:scale-105 transition-transform">
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
        <p className="text-xs font-semibold text-foreground/80">{niche.subtitle}</p>
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
}

export interface CreateTypePickerProps {
  onSelect: (typeId: ClassifiedNicheType, sub?: string) => void;
  onAiPrefill?: (listing: any) => void;
}

export function CreateTypePicker({ onSelect, onAiPrefill }: CreateTypePickerProps) {
  const [searchFilter, setSearchFilter] = useState("");
  const [aiPrompt, setAiPrompt] = useState("");
  const [isAiGenerating, setIsAiGenerating] = useState(false);
  const [highlightInput, setHighlightInput] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const aiInputRef = useRef<HTMLInputElement>(null);
  const [scopeTab, setScopeTab] = useState<"all" | "personal" | "business">("all");

  const handleGenerateWithAi = async () => {
    const trimmed = (searchFilter || aiPrompt).trim();
    if (!trimmed) {
      setHighlightInput(true);
      aiInputRef.current?.focus();
      toast.info("Descreva seu anúncio na barra acima para a IA estruturar.", {
        id: "ai-prompt-guide",
        duration: 4000,
      });
      return;
    }
    setHighlightInput(false);
    setIsAiGenerating(true);
    toast.loading("O Copilot está estruturando seu anúncio...", { id: "ai-ad" });
    try {
      const res = await createListingWithAI({ data: { prompt: trimmed } });
      if (res?.success && res.listing) {
        toast.success("Anúncio estruturado com Copilot! Revise os dados.", { id: "ai-ad" });
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
      toast.error(e?.message || "Erro ao conectar com a IA. Escolha a categoria manualmente.", {
        id: "ai-ad",
      });
    } finally {
      setIsAiGenerating(false);
    }
  };

  const handleScroll = (direction: "left" | "right") => {
    scrollContainerRef.current?.scrollBy({
      left: direction === "left" ? -300 : 300,
      behavior: "smooth",
    });
  };

  const personalNiches = useMemo(() => {
    const ids = [
      "desapego",
      "veiculo",
      "imovel",
      "servico",
      "vaga",
      "digital",
      "hospedagem",
      "equipamento",
      "doacao",
      "viagem",
      "evento",
    ];
    const q = searchFilter.trim().toLowerCase();
    return NICHE_CARDS.filter(
      (n) =>
        ids.includes(n.id) &&
        (!q ||
          n.title.toLowerCase().includes(q) ||
          n.subtitle.toLowerCase().includes(q) ||
          n.description.toLowerCase().includes(q)),
    );
  }, [searchFilter]);

  const businessNiches = useMemo(() => {
    const ids = ["negocio", "assinatura", "gastronomia", "farmacia", "mercado", "agro"];
    const q = searchFilter.trim().toLowerCase();
    return NICHE_CARDS.filter(
      (n) =>
        ids.includes(n.id) &&
        (!q ||
          n.title.toLowerCase().includes(q) ||
          n.subtitle.toLowerCase().includes(q) ||
          n.description.toLowerCase().includes(q)),
    );
  }, [searchFilter]);

  const filteredDesapegoItems = useMemo(() => {
    const q = searchFilter.trim().toLowerCase();
    if (!q) return [];
    return DESAPEGO_TAXONOMY.filter(
      (d) => d.label.toLowerCase().includes(q) || d.desc.toLowerCase().includes(q),
    );
  }, [searchFilter]);

  const visibleNiches = useMemo(() => {
    if (scopeTab === "personal") return personalNiches;
    if (scopeTab === "business") return businessNiches;
    return [...personalNiches, ...businessNiches];
  }, [scopeTab, personalNiches, businessNiches]);

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6 pb-20 px-1 sm:px-0">
      <div className="flex items-center justify-between gap-4 border-b border-border/40 pb-4 pt-1">
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
          Criar Anúncio
        </h1>
        <Button
          asChild
          size="sm"
          variant="outline"
          className="rounded-lg text-xs font-semibold h-11 min-h-11 px-4 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary border-border/70"
        >
          <Link to="/conta/classificados">Meus Anúncios</Link>
        </Button>
      </div>

      <div className="flex items-center gap-1 p-1 bg-muted/40 rounded-lg border border-border/50 max-w-md">
        {(
          [
            { id: "all", label: "Todos" },
            { id: "personal", label: "Pessoal" },
            { id: "business", label: "Negócios" },
          ] as const
        ).map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setScopeTab(tab.id)}
            className={cn(
              "flex-1 h-11 min-h-11 px-3 rounded-lg text-xs font-semibold transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
              scopeTab === tab.id
                ? "bg-background text-foreground border border-border/70"
                : "text-muted-foreground hover:text-foreground border border-transparent",
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="space-y-2">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              ref={aiInputRef}
              value={searchFilter || aiPrompt}
              onChange={(e) => {
                setSearchFilter(e.target.value);
                setAiPrompt(e.target.value);
                if (highlightInput) setHighlightInput(false);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleGenerateWithAi();
                }
              }}
              placeholder="Descreva seu anúncio ou busque categorias (ex: iPhone 13 Pro 128GB)..."
              className={cn(
                "pl-10 pr-16 h-11 rounded-lg text-xs sm:text-sm bg-card border-border/70 transition-colors duration-200",
                highlightInput
                  ? "border-primary ring-2 ring-primary/40 animate-pulse motion-reduce:animate-none focus-visible:ring-primary"
                  : "focus-visible:ring-1 focus-visible:ring-foreground/20",
              )}
              id="ai-intent-input"
            />
            {(searchFilter || aiPrompt) && (
              <button
                type="button"
                onClick={() => {
                  setSearchFilter("");
                  setAiPrompt("");
                  setHighlightInput(false);
                }}
                className="absolute right-2 top-1/2 -translate-y-1/2 h-11 min-h-11 px-2 text-xs text-muted-foreground hover:text-foreground cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
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
            className="h-11 min-h-11 px-4 rounded-lg font-semibold text-xs border border-border/80 text-foreground hover:bg-muted/40 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary shrink-0 flex items-center gap-2"
          >
            {isAiGenerating ? (
              <Loader2 className="size-4 animate-spin motion-reduce:animate-none" />
            ) : (
              <Wand2 className="size-4 text-primary" />
            )}
            <span>{isAiGenerating ? "Gerando..." : "Criar com IA"}</span>
            <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground bg-muted/60 px-2 py-1 rounded border border-border/50">
              Copilot
            </span>
          </Button>
        </div>
        {highlightInput && (
          <p className="text-xs text-primary font-medium animate-in fade-in duration-200 px-1">
            Digite aqui o que você deseja anunciar e clique em &quot;Criar com IA&quot;.
          </p>
        )}
      </div>

      {/* MOBILE: List Pattern */}
      <div className="block sm:hidden space-y-1">
        <span className="text-xs text-muted-foreground font-bold uppercase tracking-wider block px-1 py-1">
          {scopeTab === "personal" ? "Pessoal" : scopeTab === "business" ? "Negócios" : "Categorias"}
        </span>
        <div className="divide-y divide-border/20 rounded-lg border border-border/50 bg-card overflow-hidden">
          {visibleNiches.map((niche) => {
            const Icon = niche.icon;
            return (
              <button
                key={niche.id}
                type="button"
                onClick={() => onSelect(niche.id)}
                className="w-full flex items-center justify-between p-4 hover:bg-muted/30 active:bg-muted/50 transition-colors text-left cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary min-h-14"
              >
                <div className="flex items-center gap-4 min-w-0">
                  <div className="size-11 rounded-full border border-border/60 flex items-center justify-center shrink-0 text-foreground bg-background">
                    <Icon className="size-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-semibold text-foreground line-clamp-2 text-anti-truncate">
                        {niche.title}
                      </h3>
                      <span className="text-xs font-medium text-muted-foreground border border-border px-2 py-1 rounded-sm shrink-0">
                        {niche.badge}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2 text-anti-truncate mt-1">
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

      {/* DESKTOP: Horizontal Rails */}
      <div className="hidden sm:block space-y-6">
        {(scopeTab === "all" || scopeTab === "personal") && personalNiches.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">
                Pessoal
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleScroll("left")}
                  title="Rolar para a esquerda"
                  aria-label="Rolar para esquerda"
                  className="size-11 min-h-11 min-w-11 rounded-lg border border-border/70 bg-card hover:bg-muted flex items-center justify-center text-foreground transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  <ChevronLeft className="size-4" />
                </button>
                <button
                  type="button"
                  onClick={() => handleScroll("right")}
                  title="Rolar para a direita"
                  aria-label="Rolar para direita"
                  className="size-11 min-h-11 min-w-11 rounded-lg border border-border/70 bg-card hover:bg-muted flex items-center justify-center text-foreground transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
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
                {personalNiches.map((niche) => (
                  <NicheDesktopCard key={niche.id} niche={niche} onSelect={onSelect} />
                ))}
              </div>
            </div>
          </div>
        )}

        {(scopeTab === "all" || scopeTab === "business") && businessNiches.length > 0 && (
          <div className="space-y-3 pt-4 border-t border-border/30">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">
              Negócios
            </span>

            <div className="flex flex-row gap-4 overflow-x-auto carousel snap-x snap-mandatory no-scrollbar py-1 px-1 scroll-smooth">
              {businessNiches.map((niche) => (
                <NicheDesktopCard key={niche.id} niche={niche} onSelect={onSelect} />
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="space-y-2 pt-2 border-t border-border/40">
        <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">
          Categorias Populares para Desapego Rápido
        </span>
        <div className="flex flex-wrap gap-2">
          {DESAPEGO_TAXONOMY.slice(0, 8).map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => onSelect("desapego", cat.id)}
              className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-lg"
            >
              <Badge
                variant="outline"
                className="text-xs min-h-11 py-2 px-3 rounded-lg gap-2 cursor-pointer hover:bg-primary/10 hover:text-primary hover:border-primary/30 transition-colors"
              >
                <span>{cat.label}</span>
              </Badge>
            </button>
          ))}
        </div>
      </div>

      {filteredDesapegoItems.length > 0 && (
        <div className="space-y-2 pt-2">
          <span className="text-xs font-bold uppercase tracking-wider text-primary block">
            Itens Específicos Encontrados ({filteredDesapegoItems.length})
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {filteredDesapegoItems.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelect("desapego", item.id)}
                className="flex items-center gap-3 p-4 rounded-lg border border-border/60 bg-card hover:bg-muted/40 text-left transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <div className="size-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <Tag className="size-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-foreground truncate">{item.label}</p>
                  <p className="text-xs text-muted-foreground truncate">{item.desc}</p>
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
