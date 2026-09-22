import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { Store, Plus, ArrowRight, ExternalLink, CheckCircle2, Package, Building2, MapPin, ShieldCheck, Search, Settings2, Phone, Sliders, Layers, ChevronRight, Filter } from 'lucide-react';
import { PageHeader } from "@/components/commerce/page-header";
import { getMyStoresList } from "@/services/store.functions";
import { setTenantContext } from "@/services/identity.functions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
 QuickStoreEditorDialog,
 type QuickStoreData,
} from "@/components/workspace/quick-store-editor-dialog";

export const Route = createFileRoute("/workspace/lojas/")({
 head: () => ({ meta: [{ title: "Minhas Lojas & Negócios | Workspace Waesy" }] }),
  loader: async () => {
    try {
      const stores = await getMyStoresList();
      return { stores: stores || [] };
    } catch (err) {
      console.error("[loader:workspace.lojas.index] Unhandled loader error:", err);
      return { stores: [] };
    }
  },
 component: WorkspaceLojasPage,
});

export default function WorkspaceLojasPage() {
  const { stores = [] } = (Route.useLoaderData() as any) || {};
  const [switchingId, setSwitchingId] = useState<string | null>(null);
 const [searchQuery, setSearchQuery] = useState("");
 const [selectedType, setSelectedType] = useState<string>("all");

 // Estado do Editor Rápido
 const [editingStore, setEditingStore] = useState<QuickStoreData | null>(null);
 const [isEditorOpen, setIsEditorOpen] = useState(false);

 const handleSelectStore = async (storeId: string, storeName: string) => {
 setSwitchingId(storeId);
 try {
 if (typeof window !== "undefined") {
 window.document.cookie = `waesy_active_tenant=${storeId}; path=/; max-age=31536000; SameSite=Lax`;
 }
 const res = await setTenantContext({ data: { store_id: storeId } }).catch(() => null);
 toast.success(`Contexto alterado para ${res?.storeName || storeName}`);
 window.location.href = "/workspace";
 } catch {
 toast.error("Erro ao alternar loja.");
 setSwitchingId(null);
 }
 };

 const handleOpenEditor = (st: any) => {
 setEditingStore(st);
 setIsEditorOpen(true);
 };

 // Filtros
 const filteredStores = useMemo(() => {
 return stores.filter((st: any) => {
 const matchSearch =
 st.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
 st.slug.toLowerCase().includes(searchQuery.toLowerCase()) ||
 (st.city && st.city.toLowerCase().includes(searchQuery.toLowerCase()));

 const matchType = selectedType === "all" || st.type === selectedType;
 return matchSearch && matchType;
 });
 }, [stores, searchQuery, selectedType]);

 const activeStore = stores.find((s: any) => s.is_active_context) || stores[0];
 const totalProducts = stores.reduce((acc: number, s: any) => acc + (s.product_count || 0), 0);

 return (
 <div className="w-full max-w-7xl mx-auto space-y-6 animate-in fade-in duration-200">
 {/* ── 1. Top Header com Ações Globais ── */}
 <PageHeader
 eyebrow="Gestão de Negócios"
 title="Minhas Lojas"
 actions={
 <Button asChild className="gap-2 rounded-xl text-xs font-bold bg-primary text-primary-foreground">
 <Link to="/criar-negocio">
 <Plus className="size-4" />
 Novo Negócio
 </Link>
 </Button>
 }
 />

 {/* ── 2. KPI Summary Cards ── */}
 <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
 <Card className="p-4 bg-card border-border rounded-2xl">
 <div className="flex items-center justify-between">
 <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
 Loja Ativa no Painel
 </span>
 <div className="size-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
 <CheckCircle2 className="size-4" />
 </div>
 </div>
 <div className="mt-2">
 <div className="text-lg font-bold text-foreground truncate">
 {activeStore?.name || "Nenhuma Selecionada"}
 </div>
 <p className="text-xs text-muted-foreground mt-0.5">
 /{activeStore?.slug || "loja"} • {activeStore?.city || "Brasil"}
 </p>
 </div>
 </Card>

 <Card className="p-4 bg-card border-border rounded-2xl">
 <div className="flex items-center justify-between">
 <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
 Total de Espaços
 </span>
 <div className="size-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
 <Building2 className="size-4" />
 </div>
 </div>
 <div className="mt-2">
 <div className="text-2xl font-bold text-foreground">
 {stores.length}
 </div>
 <p className="text-xs text-muted-foreground mt-0.5">
 Marcas sob sua governança
 </p>
 </div>
 </Card>

 <Card className="p-4 bg-card border-border rounded-2xl">
 <div className="flex items-center justify-between">
 <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
 Catálogo Integrado
 </span>
 <div className="size-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
 <Package className="size-4" />
 </div>
 </div>
 <div className="mt-2">
 <div className="text-2xl font-bold text-foreground">
 {totalProducts}
 </div>
 <p className="text-xs text-muted-foreground mt-0.5">
 Itens ativos cadastrados
 </p>
 </div>
 </Card>
 </div>

 {/* ── 3. Barra de Busca & Filtros ── */}
 <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 bg-muted/40 rounded-2xl ">
 <div className="relative w-full sm:w-80">
 <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
 <Input
 value={searchQuery}
 onChange={(e) => setSearchQuery(e.target.value)}
 placeholder="Buscar por nome, slug ou cidade..."
 className="pl-9 rounded-xl text-xs h-9 bg-background"
 />
 </div>

 <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto no-scrollbar">
 <Button
 variant={selectedType === "all" ? "default" : "outline"}
 size="sm"
 onClick={() => setSelectedType("all")}
 className="rounded-xl text-xs font-semibold h-8"
 >
 Todas
 </Button>
 <Button
 variant={selectedType === "ecommerce" ? "default" : "outline"}
 size="sm"
 onClick={() => setSelectedType("ecommerce")}
 className="rounded-xl text-xs font-semibold h-8"
 >
 Lojas & E-commerce
 </Button>
 <Button
 variant={selectedType === "food_service" ? "default" : "outline"}
 size="sm"
 onClick={() => setSelectedType("food_service")}
 className="rounded-xl text-xs font-semibold h-8"
 >
 Alimentação
 </Button>
 </div>
 </div>

 {/* ── 4. Grid de Cards Ricos de Lojas (Padrão Shopify/Stripe) ── */}
 <div className="space-y-4">
 <div className="flex items-center justify-between">
 <h2 className="text-base font-bold text-foreground flex items-center gap-2">
 <Store className="size-4 text-primary" />
 <span>Espaços Comerciais ({filteredStores.length})</span>
 </h2>
 </div>

 {filteredStores.length === 0 ? (
 <div className="p-12 text-center bg-card rounded-2xl shadow-xs border-0 space-y-3">
 <Store className="size-10 text-muted-foreground mx-auto opacity-40" />
 <p className="text-sm font-semibold text-foreground">Nenhuma loja encontrada</p>
 <p className="text-xs text-muted-foreground">Tente ajustar seus termos de busca ou crie uma nova loja.</p>
 </div>
 ) : (
 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
 {filteredStores.map((st: any) => {
 const isCurrentActive = st.is_active_context;
 const isCurrentSwitching = switchingId === st.id;

 return (
 <Card
 key={st.id}
 className={`rounded-2xl shadow-xs border transition-all flex flex-col justify-between overflow-hidden bg-card group ${
 isCurrentActive
 ? "border-primary/60 ring-2 ring-primary/20"
 : "border-border hover:border-foreground/20 hover:shadow-xs"
 }`}
 >
 {/* Capa / Banner Panorâmico no Topo do Card */}
 <div className="relative h-28 w-full bg-linear-to-r from-zinc-800 via-zinc-700 to-zinc-900 overflow-hidden">
 {st.banner_url ? (
 <img
 src={st.banner_url}
 alt={`Capa ${st.name}`}
 className="size-full object-cover group-hover:scale-105 transition-transform duration-500"
 />
 ) : (
 <div className="size-full flex items-center justify-center bg-linear-to-br from-primary/20 via-primary/5 to-muted opacity-80" />
 )}

 {/* Gradient Overlay */}
 <div className="absolute inset-0 bg-linear-to-t from-black/60 via-transparent to-black/20" />

 {/* Badges Flutuantes no Banner */}
 <div className="absolute top-3 right-3 flex items-center gap-1.5">
 {isCurrentActive ? (
 <Badge className="bg-emerald-500 text-white border-0 text-[10px] font-bold px-2 py-0.5 ">
 ● Ativa no Painel
 </Badge>
 ) : (
 <Badge variant="secondary" className="bg-black/50 text-white backdrop-blur-md border-0 text-[10px]">
 {st.status === "maintenance" ? "Em Manutenção" : "Disponível"}
 </Badge>
 )}
 </div>
 </div>

 {/* Corpo do Card com Avatar Sobreposto */}
 <div className="p-5 pt-0 space-y-4 flex-1 flex flex-col justify-between">
 <div className="space-y-3">
 {/* Avatar em Squircle */}
 <div className="flex items-end justify-between -mt-8 mb-2 relative z-10">
 <div className="size-16 rounded-2xl bg-card flex items-center justify-center overflow-hidden shrink-0">
 {st.logo_url ? (
 <img
 src={st.logo_url}
 alt={st.name}
 className="size-full object-cover"
 />
 ) : (
 <div className="size-full bg-primary/10 text-primary flex items-center justify-center font-bold text-lg">
 {st.name.charAt(0).toUpperCase()}
 </div>
 )}
 </div>

 {/* Botão de Edição Rápida */}
 <Button
 variant="outline"
 size="sm"
 onClick={() => handleOpenEditor(st)}
 className="rounded-xl text-xs font-bold h-8 gap-1.5 bg-card/80 backdrop-blur-md hover:border-primary/40 hover:text-primary transition-colors"
 >
 <Settings2 className="size-3.5" />
 <span>Configurar</span>
 </Button>
 </div>

 {/* Título, Slug e Descrição */}
 <div>
 <div className="flex items-center gap-2">
 <h3 className="font-bold text-base text-foreground line-clamp-1">
 {st.name}
 </h3>
 </div>
 <p className="text-xs text-muted-foreground font-mono">
 usewaesy.com/{st.slug}
 </p>

 {st.description && (
 <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2 leading-relaxed">
 {st.description}
 </p>
 )}
 </div>

 {/* Metadados Chave em Grid */}
 <div className="grid grid-cols-2 gap-2 py-3 border-y border-border/60 text-xs">
 <div className="space-y-0.5">
 <span className="text-[10px] uppercase font-bold text-muted-foreground block">
 Localização
 </span>
 <span className="font-semibold text-foreground flex items-center gap-1 truncate">
 <MapPin className="size-3 text-muted-foreground shrink-0" />
 {st.city ? `${st.city} - ${st.state}` : "Brasil"}
 </span>
 </div>

 <div className="space-y-0.5">
 <span className="text-[10px] uppercase font-bold text-muted-foreground block">
 Produtos
 </span>
 <span className="font-semibold text-foreground flex items-center gap-1">
 <Package className="size-3 text-primary shrink-0" />
 {st.product_count} ativos
 </span>
 </div>
 </div>
 </div>

 {/* Ações Inferiores */}
 <div className="pt-2 space-y-2">
 <div className="flex items-center gap-2">
 <Button
 onClick={() => handleSelectStore(st.id, st.name)}
 disabled={isCurrentSwitching}
 variant={isCurrentActive ? "default" : "secondary"}
 className={`flex-1 rounded-xl text-xs font-bold h-11 min-h-[44px] gap-1.5 ${
 isCurrentActive
 ? "bg-primary text-primary-foreground "
 : "hover:bg-primary/10 hover:text-primary"
 }`}
 >
 {isCurrentSwitching ? (
 "Carregando..."
 ) : isCurrentActive ? (
 <>
 <span>Gerenciar no Painel</span>
 <ArrowRight className="size-3.5" />
 </>
 ) : (
 <>
 <span>Alternar para esta Loja</span>
 <ArrowRight className="size-3.5" />
 </>
 )}
 </Button>

 <Button
 asChild
 variant="outline"
 size="icon"
 className="size-11 min-w-[44px] min-h-[44px] rounded-xl shrink-0"
 title="Abrir Vitrine Pública da Loja"
 >
 <Link to={`/destaques/${st.slug}` as any} target="_blank">
 <ExternalLink className="size-4 text-muted-foreground" />
 </Link>
 </Button>
 </div>
 </div>
 </div>
 </Card>
 );
 })}
 </div>
 )}
 </div>

 {/* ── 5. Modal de Edição Rápida da Loja (Quick Store Editor) ── */}
 <QuickStoreEditorDialog
 open={isEditorOpen}
 onOpenChange={setIsEditorOpen}
 store={editingStore}
 />
 </div>
 );
}
