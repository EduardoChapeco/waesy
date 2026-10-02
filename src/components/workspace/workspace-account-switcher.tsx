import { useState, useMemo } from "react";
import { Link } from "@tanstack/react-router";
import { Store, ChevronsUpDown, Search, Check, Plus, Settings, Building2, User, Radio, ExternalLink } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface WorkspaceAccountSwitcherProps {
 memberships: any[];
 activeStoreId?: string;
 activeStore?: any;
 userDisplayName: string;
 userEmail?: string;
 isSwitching: boolean;
 onSwitchStore: (storeId: string) => void;
}

export function WorkspaceAccountSwitcher({
 memberships,
 activeStoreId,
 activeStore,
 userDisplayName,
 userEmail,
 isSwitching,
 onSwitchStore,
}: WorkspaceAccountSwitcherProps) {
 const [open, setOpen] = useState(false);
 const [searchQuery, setSearchQuery] = useState("");
 const [selectedPortfolioId, setSelectedPortfolioId] = useState<string>("main_business");

 // Agrupamento de portfólios (Organizações / Grupos de Lojas / Perfil Pessoal)
 const portfolios = useMemo(() => {
 const list = [
 {
 id: "main_business",
 name: activeStore?.name || "Portfólio Empresarial",
 type: "business",
 assetCount: memberships.length,
 initial: (activeStore?.name || "E").charAt(0).toUpperCase(),
 logoUrl: activeStore?.logo_url || null,
 },
 ];

 // Se houver mais lojas ou perfil pessoal
 list.push({
 id: "personal_account",
 name: userDisplayName || "Conta Pessoal",
 type: "personal",
 assetCount: 0,
 initial: (userDisplayName || "U").charAt(0).toUpperCase(),
 logoUrl: null,
 });

 return list;
 }, [memberships, activeStore, userDisplayName]);

 // Filtro de ativos de negócios com base na busca
 const filteredStores = useMemo(() => {
 if (!searchQuery.trim()) return memberships;
 const q = searchQuery.toLowerCase();
 return memberships.filter(
 (m) =>
 m.name?.toLowerCase().includes(q) ||
 (m.slug || m.store_slug)?.toLowerCase().includes(q) ||
 m.city?.toLowerCase().includes(q) ||
 m.segment?.toLowerCase().includes(q)
 );
 }, [memberships, searchQuery]);

 return (
 <Popover open={open} onOpenChange={setOpen}>
 <PopoverTrigger asChild>
 <button
 type="button"
 disabled={isSwitching}
 className="flex w-full items-center justify-between h-10 px-3 rounded-lg border border-border/60 bg-card hover:bg-muted/70 hover:border-foreground/20 transition-all text-left group cursor-pointer shadow-2xs"
 >
 <div className="flex items-center gap-2 min-w-0">
 {activeStore?.logo_url ? (
 <img
 src={activeStore.logo_url}
 alt={activeStore.name}
 className="size-7 rounded-lg object-cover shrink-0 border border-border/60 bg-muted"
 />
 ) : (
 <div className="size-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shrink-0 border border-primary/20">
 <Store className="size-3.5" />
 </div>
 )}
 <div className="min-w-0">
 <h2 className="text-xs font-bold text-foreground truncate leading-tight group-hover:text-primary transition-colors">
 {activeStore?.name || "Meu Negócio"}
 </h2>
 </div>
 </div>
 <ChevronsUpDown className="size-3 text-muted-foreground shrink-0 ml-1 group-hover:text-foreground transition-colors" />
 </button>
 </PopoverTrigger>

 <PopoverContent
 align="start"
 sideOffset={8}
 className="w-[360px] sm:w-[540px] p-0 rounded-lg border border-border/80 bg-background/98 backdrop-blur-xl shadow-2xl overflow-hidden"
 >
 {/* ── 1. Topo: Busca Instantânea de Ativos ── */}
 <div className="p-3 border-b border-border/60 bg-muted/20">
 <div className="relative">
 <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
 <Input
 value={searchQuery}
 onChange={(e) => setSearchQuery(e.target.value)}
 placeholder="Procurar um ativo de negócios..."
 className="h-10 pl-9 pr-3 text-base sm:text-xs rounded-lg bg-card border-border/60 focus-visible:ring-1 focus-visible:ring-primary"
 />
 </div>
 </div>

 {/* ── 2. Grid Split de 2 Colunas: Portfólios vs Ativos (Padrão Meta Studio) ── */}
 <div className="grid grid-cols-1 sm:grid-cols-12 min-h-[300px] max-h-[420px]">
 {/* Coluna da Esquerda (Portfólios Empresariais - 5 cols) */}
 <div className="sm:col-span-5 border-r border-border/60 bg-muted/10 p-3 flex flex-col justify-between overflow-y-auto no-scrollbar">
 <div className="space-y-1">
 <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-muted-foreground px-2 py-1 block">
 Portfólios Empresariais
 </span>

 {portfolios.map((portfolio) => {
 const isSelected = selectedPortfolioId === portfolio.id;
 return (
 <button
 key={portfolio.id}
 type="button"
 onClick={() => setSelectedPortfolioId(portfolio.id)}
 className={cn(
 "w-full flex items-center justify-between p-2 rounded-lg text-left transition-all cursor-pointer",
 isSelected
 ? "bg-primary/10 border border-primary/20 text-foreground"
 : "hover:bg-muted/60 text-muted-foreground hover:text-foreground"
 )}
 >
 <div className="flex items-center gap-2 min-w-0">
 <div
 className={cn(
 "size-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 border",
 isSelected
 ? "bg-primary text-primary-foreground border-primary"
 : "bg-muted text-muted-foreground border-border/60"
 )}
 >
 {portfolio.type === "personal" ? (
 <User className="size-3.5" />
 ) : portfolio.logoUrl ? (
 <img
 src={portfolio.logoUrl}
 alt=""
 className="size-full object-cover rounded-lg"
 />
 ) : (
 portfolio.initial
 )}
 </div>
 <div className="min-w-0">
 <p className="text-xs font-bold truncate leading-tight">{portfolio.name}</p>
 <p className="text-[9px] font-mono text-muted-foreground truncate">
 {portfolio.assetCount > 0
 ? `${portfolio.assetCount} ${portfolio.assetCount === 1 ? "ativo" : "ativos"} de negócios`
 : "Perfil pessoal"}
 </p>
 </div>
 </div>
 </button>
 );
 })}
 </div>

 {/* Ação de Criar Portfólio / Loja */}
 <div className="pt-2 border-t border-border/40 mt-2">
 <Button
 asChild
 variant="outline"
 size="sm"
 className="w-full text-xs font-bold rounded-lg h-8 gap-2 justify-center border-border/60 bg-card hover:bg-muted"
 onClick={() => setOpen(false)}
 >
 <Link to="/criar-negocio">
 <Plus className="size-3.5" />
 <span>Criar Negócio</span>
 </Link>
 </Button>
 </div>
 </div>

 {/* Coluna da Direita (Ativos de Negócios / Lojas / Filiais - 7 cols) */}
 <div className="sm:col-span-7 p-3 flex flex-col justify-between overflow-y-auto no-scrollbar bg-card/40">
 <div className="space-y-2">
 <div className="flex items-center justify-between pb-1 border-b border-border/40">
 <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-muted-foreground">
 Ativos de Negócios ({filteredStores.length})
 </span>
 <Link
 to="/workspace/lojas"
 onClick={() => setOpen(false)}
 className="text-[10px] font-bold text-primary hover:underline flex items-center gap-1"
 >
 <span>Gerenciar</span>
 <ExternalLink className="size-2.5" />
 </Link>
 </div>

 {selectedPortfolioId === "personal_account" ? (
 <div className="py-8 text-center space-y-3">
 <div className="size-10 rounded-lg bg-muted text-muted-foreground flex items-center justify-center mx-auto">
 <User className="size-5" />
 </div>
 <div className="space-y-1">
 <p className="text-xs font-bold text-foreground">Perfil Pessoal do Usuário</p>
 <p className="text-[10px] text-muted-foreground max-w-52 mx-auto">
 Acesse seus pedidos, favoritos e endereços no marketplace.
 </p>
 </div>
 <Button
 asChild
 size="sm"
 className="rounded-lg text-xs font-bold h-8"
 onClick={() => setOpen(false)}
 >
 <Link to="/conta">Acessar Minha Conta</Link>
 </Button>
 </div>
 ) : (
 <div className="space-y-2">
 {filteredStores.length === 0 ? (
 <div className="py-6 text-center text-xs text-muted-foreground">
 Nenhum ativo encontrado para &quot;{searchQuery}&quot;.
 </div>
 ) : (
 filteredStores.map((m) => {
 const isCurrent = m.store_id === activeStoreId;
 return (
 <div
 key={m.store_id}
 className={cn(
 "group flex items-center justify-between p-3 rounded-lg border transition-all cursor-pointer",
 isCurrent
 ? "bg-primary/5 border-primary/40 shadow-xs"
 : "bg-card border-border/60 hover:border-foreground/20 hover:bg-muted/40"
 )}
 onClick={() => {
 if (!isCurrent) {
 onSwitchStore(m.store_id);
 setOpen(false);
 }
 }}
 >
 <div className="flex items-center gap-3 min-w-0">
 {/* Radio indicator */}
 <div
 className={cn(
 "size-4 rounded-full border flex items-center justify-center shrink-0 transition-colors",
 isCurrent
 ? "border-primary bg-primary text-primary-foreground"
 : "border-muted-foreground/40 group-hover:border-foreground"
 )}
 >
 {isCurrent && <div className="size-1.5 rounded-full bg-white" />}
 </div>

 {/* Avatar da Loja */}
 {m.logo_url ? (
 <img
 src={m.logo_url}
 alt=""
 className="size-8 rounded-lg object-cover shrink-0 border border-border/60 bg-muted"
 />
 ) : (
 <div className="size-8 rounded-lg bg-muted flex items-center justify-center font-bold text-xs shrink-0 text-foreground border border-border/60">
 {m.name ? m.name.slice(0, 2).toUpperCase() : "LJ"}
 </div>
 )}

 <div className="min-w-0">
 <div className="flex items-center gap-2">
 <h3
 className={cn(
 "text-xs truncate font-bold",
 isCurrent ? "text-foreground" : "text-foreground/90"
 )}
 >
 {m.name || "Loja"}
 </h3>
 {isCurrent && (
 <Badge
 variant="outline"
 className="text-[8px] font-mono font-bold uppercase px-1 py-0 h-3.5 bg-primary/10 text-primary border-primary/30"
 >
 Ativa
 </Badge>
 )}
 </div>
 <p className="text-[10px] text-muted-foreground truncate">
 {m.city ? `${m.city} • ` : ""}
 {m.segment || "Loja Oficial"}
 </p>
 </div>
 </div>

 {/* Acesso rápido às configurações do ativo */}
 <Link
 to="/workspace/configuracoes"
 onClick={(e) => {
 e.stopPropagation();
 setOpen(false);
 }}
 className="size-7 rounded-lg hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
 title="Configurações da Loja"
 >
 <Settings className="size-3.5" />
 </Link>
 </div>
 );
 })
 )}
 </div>
 )}
 </div>

 {/* Rodapé da Coluna Direita */}
 <div className="pt-2 border-t border-border/40 mt-3 flex items-center justify-between text-[10px] text-muted-foreground">
 <span>{filteredStores.length} ativos no portfólio</span>
 <span className="font-mono">{userEmail}</span>
 </div>
 </div>
 </div>
 </PopoverContent>
 </Popover>
 );
}
