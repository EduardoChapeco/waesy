import React from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { Shield, Image as ImageIcon, Layers, Sliders, ExternalLink } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface AdminContextualBarProps {
 userRole?: string | null;
}

const ROUTE_NICHE_MAP: Record<string, { id: string; label: string; emoji: string }> = {
 "/": { id: "home", label: "Início (Home)", emoji: "🏠" },
 "/mercado": { id: "mercado", label: "Supermercado & Feira", emoji: "🛒" },
 "/gastronomia": { id: "gastronomia", label: "Gastronomia & Delivery", emoji: "🍽️" },
 "/farmacia": { id: "farmacia", label: "Farmácia & Saúde", emoji: "💊" },
 "/bebidas": { id: "bebidas", label: "Bebidas & Adega", emoji: "🍻" },
 "/acougue": { id: "acougue", label: "Açougue & Carnes", emoji: "🥩" },
 "/moda": { id: "moda", label: "Moda & Vestuário", emoji: "👗" },
 "/eletronicos": { id: "eletronicos", label: "Eletrônicos & Tech", emoji: "📱" },
 "/pet": { id: "pet", label: "Pet Shop", emoji: "🐾" },
 "/servicos": { id: "servicos", label: "Serviços & Profissionais", emoji: "💼" },
 "/imoveis": { id: "imoveis", label: "Imóveis & Locação", emoji: "🏢" },
 "/construcao": { id: "construcao", label: "Construção & Reforma", emoji: "🔨" },
 "/casa": { id: "casa", label: "Casa & Decoração", emoji: "🛋️" },
 "/beleza": { id: "beleza", label: "Beleza & Estética", emoji: "✂️" },
 "/limpeza": { id: "limpeza", label: "Limpeza & Utilidades", emoji: "🧹" },
 "/livros": { id: "livros", label: "Livros & Papelaria", emoji: "📚" },
 "/feed": { id: "feed", label: "Feed", emoji: "📡" },
 "/noticias": { id: "noticias", label: "Notícias", emoji: "📰" },
 "/eventos": { id: "eventos", label: "Eventos", emoji: "🎟️" },
 "/agenda": { id: "agenda", label: "Agenda", emoji: "📅" },
 "/afiliados": { id: "afiliados", label: "Afiliados", emoji: "🎯" },
 "/turismo": { id: "turismo", label: "Turismo & Hospedagem", emoji: "✈️" },
 "/empregos": { id: "empregos", label: "Empregos", emoji: "💼" },
 "/classificados": { id: "classificados", label: "Classificados", emoji: "🏷️" },
 "/diretorio": { id: "diretorio", label: "Places", emoji: "🧭" },
 "/mobilidade": { id: "mobilidade", label: "Mobilidade Urbana", emoji: "🚗" },
 "/ofertas": { id: "ofertas", label: "Ofertas Relâmpago", emoji: "⚡" },
};

export function AdminContextualBar({ userRole }: AdminContextualBarProps) {
 const routerState = useRouterState();
 const pathname = routerState.location.pathname;
 const [isMinimized, setIsMinimized] = React.useState(false);

 // Renderiza apenas se for platform_admin e estiver em uma vitrine pública (não admin ou workspace)
 if (userRole !== "platform_admin" || pathname.startsWith("/admin-master") || pathname.startsWith("/workspace")) {
 return null;
 }

 // Identifica o nicho atual
 const activeNiche = ROUTE_NICHE_MAP[pathname] || {
 id: "all",
 label: "Vitrine Pública",
 emoji: "🌐",
 };

  if (isMinimized) {
    return (
      <button
        onClick={() => setIsMinimized(false)}
        aria-label="Expandir Barra de Governança"
        className="fixed bottom-20 right-3.5 lg:bottom-6 lg:right-6 z-50 size-9 sm:size-10 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center border border-border/40 hover:scale-105 transition-all cursor-pointer shadow-lg"
        title="Admin Master Ativo - Clique para expandir"
      >
        <Shield className="size-4" />
      </button>
    );
  }

  return (
    <aside
      aria-label="Barra de Governança Contextual Master"
      className="fixed bottom-20 right-3.5 lg:bottom-6 lg:right-6 z-50 max-w-[calc(100vw-1.75rem)] sm:max-w-md w-auto bg-card/95 backdrop-blur-2xl border border-border/60 rounded-2xl p-2 px-3 flex items-center justify-between gap-2.5 text-xs animate-in slide-in-from-bottom-3 duration-300 shadow-xl ring-1 ring-black/10 dark:ring-white/10"
    >
 <div className="flex items-center gap-2">
 <div className="size-6 rounded-lg bg-primary text-primary-foreground flex items-center justify-center font-bold text-[10px]">
 <Shield className="size-3.5" />
 </div>
 <div className="hidden sm:block text-left pr-1">
 <div className="flex items-center gap-1 font-bold text-foreground text-[11px]">
 <span>{activeNiche.emoji}</span>
 <span className="truncate max-w-[120px]">{activeNiche.label}</span>
 </div>
 <p className="text-[9px] text-muted-foreground font-mono uppercase tracking-wider">Admin Master</p>
 </div>
 </div>

 <div className="flex items-center gap-1.5">
 <Button
 asChild
 size="sm"
 variant="outline"
 className="h-7 px-2 rounded-xl text-[11px] font-bold gap-1 cursor-pointer bg-background/80 hover:bg-muted/70 border-border/60"
 >
 <Link to="/admin-master/vitrines" search={{ surface: activeNiche.id }}>
 <Sliders className="size-3 text-primary" />
 <span className="hidden sm:inline">Vitrines CMS</span>
 </Link>
 </Button>

 <Button
 asChild
 size="sm"
 variant="outline"
 className="h-7 px-2 rounded-xl text-[11px] font-bold gap-1 cursor-pointer bg-background/80 hover:bg-muted/70 border-border/60"
 >
 <Link to="/admin-master/banners" search={{ placement: activeNiche.id }}>
 <ImageIcon className="size-3 text-primary" />
 <span className="hidden sm:inline">Banners</span>
 </Link>
 </Button>

 <Button
 asChild
 size="sm"
 variant="outline"
 className="h-7 px-2 rounded-xl text-[11px] font-bold gap-1 cursor-pointer bg-background/80 hover:bg-muted/70 border-border/60"
 >
 <Link to="/admin-master/botoes" search={{ module: activeNiche.id }}>
 <Layers className="size-3 text-amber-500" />
 <span className="hidden sm:inline">Botões</span>
 </Link>
 </Button>

 <Button
 asChild
 size="sm"
 className="h-7 px-2.5 rounded-xl text-[11px] font-bold gap-1 cursor-pointer bg-primary text-primary-foreground hover:bg-primary/90"
 >
 <Link to="/admin-master">
 <span>Master</span>
 </Link>
 </Button>

 <button
 onClick={() => setIsMinimized(true)}
 className="size-7 rounded-xl flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors cursor-pointer ml-0.5"
 title="Minimizar barra de atalho"
 >
 ✕
 </button>
 </div>
 </aside>
 );
}
