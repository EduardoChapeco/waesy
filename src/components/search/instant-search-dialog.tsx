import { useState, useEffect, useRef } from "react";
import { useNavigate, Link } from "@tanstack/react-router";
import { Search, Loader2, Store, ShoppingBag, ArrowRight, Clock, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatMoney } from "@/lib/money";
import { instantTypeaheadSearch } from "@/services/search.functions";

interface InstantSearchDialogProps {
 open: boolean;
 onOpenChange: (open: boolean) => void;
}

export function InstantSearchDialog({ open, onOpenChange }: InstantSearchDialogProps) {
 const [query, setQuery] = useState("");
 const [isLoading, setIsLoading] = useState(false);
 const [results, setResults] = useState<{
 suggestions: string[];
 stores: any[];
 products: any[];
 }>({
 suggestions: [],
 stores: [],
 products: [],
 });
 const [recentSearches, setRecentSearches] = useState<string[]>([]);
 const navigate = useNavigate();
 const inputRef = useRef<HTMLInputElement>(null);

 // Carregar histórico local
 useEffect(() => {
 try {
 const stored = localStorage.getItem("waesy_recent_searches");
 if (stored) {
 setRecentSearches(JSON.parse(stored).slice(0, 5));
 }
 } catch {}
 }, [open]);

 // Foco automático ao abrir
 useEffect(() => {
 if (open) {
 setTimeout(() => inputRef.current?.focus(), 50);
 } else {
 setQuery("");
 setResults({ suggestions: [], stores: [], products: [] });
 }
 }, [open]);

 // Debounce de digitação
 useEffect(() => {
 if (query.trim().length < 2) {
 setResults({ suggestions: [], stores: [], products: [] });
 setIsLoading(false);
 return;
 }

 setIsLoading(true);
 const timer = setTimeout(async () => {
 try {
 const res = await instantTypeaheadSearch({ data: { query: query.trim() } });
 setResults(res as any);
 } catch (e) {
 console.error("Search error:", e);
 } finally {
 setIsLoading(false);
 }
 }, 150);

 return () => clearTimeout(timer);
 }, [query]);

 const saveRecentSearch = (term: string) => {
 try {
 const updated = [term, ...recentSearches.filter((s) => s !== term)].slice(0, 5);
 setRecentSearches(updated);
 localStorage.setItem("waesy_recent_searches", JSON.stringify(updated));
 } catch {}
 };

 const handleSelectTerm = (term: string) => {
 saveRecentSearch(term);
 onOpenChange(false);
 navigate({ to: "/buscar", search: { q: term } as any });
 };

 const handleClearHistory = () => {
 setRecentSearches([]);
 try {
 localStorage.removeItem("waesy_recent_searches");
 } catch {}
 };

 const hasResults =
 results.suggestions.length > 0 ||
 results.stores.length > 0 ||
 results.products.length > 0;

 return (
 <Dialog open={open} onOpenChange={onOpenChange}>
 <DialogContent className="sm:max-w-2xl p-0 overflow-hidden sm:rounded-2xl border-border/80 bg-card">
 <DialogHeader className="sr-only">
 <DialogTitle>Buscar</DialogTitle>
 </DialogHeader>

 {/* Input Bar Silencioso */}
 <div className="p-4 border-b border-border/40 flex items-center gap-3">
 <Search className="size-5 text-muted-foreground shrink-0" />
 <Input
 ref={inputRef}
 value={query}
 onChange={(e) => setQuery(e.target.value)}
 onKeyDown={(e) => {
 if (e.key === "Enter" && query.trim()) {
 handleSelectTerm(query.trim());
 }
 }}
 placeholder="O que você está procurando hoje na sua cidade?..."
 className="border-0 shadow-none focus-visible:ring-0 text-sm md:text-base h-10 px-0 placeholder:text-muted-foreground/70"
 />
 {isLoading && <Loader2 className="size-4 animate-spin text-muted-foreground shrink-0" />}
 {query && !isLoading && (
 <button
 type="button"
 onClick={() => setQuery("")}
 className="p-1 rounded-full text-muted-foreground hover:bg-muted"
 >
 <X className="size-4" />
 </button>
 )}
 </div>

 {/* Corpo de Resultados ou Histórico */}
 <div className="max-h-[65vh] overflow-y-auto no-scrollbar p-4 space-y-5">
 {/* Se query vazia: Exibe Histórico e Tags em Alta */}
 {!query && (
 <div className="space-y-4">
 {recentSearches.length > 0 && (
 <div className="space-y-2">
 <div className="flex items-center justify-between">
 <span className="text-xs font-bold text-foreground">Buscas Recentes</span>
 <button
 type="button"
 onClick={handleClearHistory}
 className="text-[11px] text-muted-foreground hover:text-foreground"
 >
 Limpar
 </button>
 </div>
 <div className="flex flex-wrap gap-2">
 {recentSearches.map((term) => (
 <button
 key={term}
 type="button"
 onClick={() => handleSelectTerm(term)}
 className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border/60 bg-muted/30 text-xs text-foreground hover:bg-muted/70 transition-colors"
 >
 <Clock className="size-3 text-muted-foreground" />
 <span>{term}</span>
 </button>
 ))}
 </div>
 </div>
 )}

 <div className="space-y-2">
 <span className="text-xs font-bold text-foreground">Categorias em Destaque</span>
 <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
 {[
 { label: "Gastronomia", to: "/gastronomia" },
 { label: "Mercado Local", to: "/mercado" },
 { label: "Serviços", to: "/servicos" },
 { label: "Eventos", to: "/eventos" },
 ].map((cat) => (
 <Link
 key={cat.label}
 to={cat.to as any}
 onClick={() => onOpenChange(false)}
 className="p-3 rounded-xl border border-border/60 bg-muted/20 hover:bg-muted/60 transition-all text-xs font-semibold text-foreground text-center"
 >
 {cat.label}
 </Link>
 ))}
 </div>
 </div>
 </div>
 )}

 {/* Se houver query e resultados */}
 {query.trim().length >= 2 && hasResults && (
 <div className="space-y-4">
 {/* Lojas & Negócios */}
 {results.stores.length > 0 && (
 <div className="space-y-2">
 <span className="text-xs font-bold text-foreground">Lojas e Negócios</span>
 <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
 {results.stores.map((store: any) => (
 <Link
 key={store.id}
 to="/bio/$slug"
 params={{ slug: store.slug }}
 onClick={() => {
 saveRecentSearch(store.name);
 onOpenChange(false);
 }}
 className="p-2.5 rounded-xl border border-border/60 hover:bg-muted/40 transition-colors flex items-center gap-3"
 >
 <div className="size-10 rounded-lg overflow-hidden bg-muted shrink-0 flex items-center justify-center">
 {store.logo_url ? (
 <img src={store.logo_url} alt={store.name} className="size-full object-cover" />
 ) : (
 <Store className="size-5 text-muted-foreground" />
 )}
 </div>
 <div className="flex-1 min-w-0">
 <span className="text-xs font-bold text-foreground truncate block">
 {store.name}
 </span>
 <div className="flex items-center gap-1.5 mt-0.5">
 {store.is_open !== false ? (
 <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">
 • Aberto agora
 </span>
 ) : (
 <span className="text-[10px] text-muted-foreground">
 • Fechado
 </span>
 )}
 <span className="text-[10px] text-muted-foreground">
 {store.city || "Chapecó"}
 </span>
 </div>
 </div>
 </Link>
 ))}
 </div>
 </div>
 )}

 {/* Produtos */}
 {results.products.length > 0 && (
 <div className="space-y-2">
 <span className="text-xs font-bold text-foreground">Produtos e Ofertas</span>
 <div className="space-y-1.5">
 {results.products.map((prod: any) => (
 <Link
 key={prod.id}
 to="/produto/$slug"
 params={{ slug: prod.slug }}
 onClick={() => {
 saveRecentSearch(prod.title);
 onOpenChange(false);
 }}
 className="p-2 rounded-xl hover:bg-muted/40 transition-colors flex items-center justify-between gap-3"
 >
 <div className="flex items-center gap-3 min-w-0">
 <div className="size-10 rounded-lg overflow-hidden bg-muted shrink-0 flex items-center justify-center">
 {prod.cover_url ? (
 <img src={prod.cover_url} alt={prod.title} className="size-full object-cover" />
 ) : (
 <ShoppingBag className="size-4 text-muted-foreground" />
 )}
 </div>
 <div className="min-w-0">
 <span className="text-xs font-semibold text-foreground truncate block">
 {prod.title}
 </span>
 <span className="text-[11px] text-muted-foreground truncate block">
 {prod.store_name}
 </span>
 </div>
 </div>

 <span className="text-xs font-bold font-mono text-foreground shrink-0">
 {formatMoney(prod.price_cents || 0)}
 </span>
 </Link>
 ))}
 </div>
 </div>
 )}
 </div>
 )}

 {/* Se query digitada mas nada encontrado */}
 {query.trim().length >= 2 && !isLoading && !hasResults && (
 <div className="py-8 text-center space-y-1.5">
 <p className="text-xs font-bold text-foreground">Nenhum resultado direto para "{query}"</p>
 <p className="text-[11px] text-muted-foreground">Tente buscar por termos mais genéricos ou outras categorias.</p>
 </div>
 )}
 </div>

 {/* Footer com Ação Direta */}
 {query.trim().length >= 2 && (
 <div className="p-3 bg-muted/20 border-t border-border/40 flex items-center justify-between">
 <span className="text-xs text-muted-foreground">
 Pressione <kbd className="px-1.5 py-0.5 rounded bg-muted border border-border text-[10px] font-mono">Enter</kbd> para busca completa
 </span>
 <Button
 size="sm"
 onClick={() => handleSelectTerm(query.trim())}
 className="gap-1.5 text-xs h-8 font-semibold"
 >
 <span>Ver todos os resultados</span>
 <ArrowRight className="size-3" />
 </Button>
 </div>
 )}
 </DialogContent>
 </Dialog>
 );
}
