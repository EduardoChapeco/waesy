import { Link, useLocation } from "@tanstack/react-router";
import { GLOBAL_DESTINATIONS, type NavigationItem } from "@/lib/navigation-registry";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { User, LayoutDashboard, LogIn, Gift } from "lucide-react";

export interface GlobalRailProps {
 session?: any;
}

export function GlobalRail({ session }: GlobalRailProps) {
 const location = useLocation();
 const isAuthenticated = Boolean(session?.user || session?.id);

 const isCurrentActive = (item: NavigationItem) => {
 if (item.exact) {
 return location.pathname === item.to;
 }
 return location.pathname.startsWith(item.to);
 };

 const isAccountActive = location.pathname.startsWith("/conta");
 const isWorkspaceActive = location.pathname.startsWith("/workspace");

 return (
 <TooltipProvider delayDuration={150}>
 <aside className="hidden md:flex flex-col items-center justify-between w-[68px] shrink-0 h-[100dvh] sticky top-0 py-4 bg-background z-30 select-none">
 {/* 1. Topo: Logo Waesy */}
 <div className="flex flex-col items-center gap-3">
 <Link
 to="/"
 className="size-10 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center font-display font-black text-xl tracking-tighter hover:scale-105 transition-transform"
 aria-label="Waesy — Início"
 >
 W
 </Link>
 </div>

 {/* 2. Centro: Destinos Globais */}
 <nav className="flex flex-col items-center gap-2 my-auto">
 {GLOBAL_DESTINATIONS.map((item) => {
 const Icon = item.icon;
 const active = isCurrentActive(item);

 return (
 <Tooltip key={item.to}>
 <TooltipTrigger asChild>
 <Link
 to={item.to}
 className={`size-11 rounded-2xl flex items-center justify-center transition-all relative ${
 active
 ? "bg-primary/10 text-primary font-bold "
 : "text-muted-foreground hover:text-foreground hover:bg-muted/70"
 }`}
 aria-label={item.label}
 >
 <Icon className="size-5" />
 {active && (
 <span className="absolute -left-1 w-1 h-5 bg-primary rounded-r-full" />
 )}
 </Link>
 </TooltipTrigger>
 <TooltipContent side="right" className="font-semibold text-xs rounded-xl">
 {item.label}
 </TooltipContent>
 </Tooltip>
 );
 })}

 {/* 2.1 Atalho do Módulo Convite / Embaixador */}
 <Tooltip>
   <TooltipTrigger asChild>
     <Link
       to="/convite"
       className={`size-11 rounded-2xl flex items-center justify-center transition-all relative ${
         location.pathname.startsWith("/convite")
           ? "bg-amber-500/15 text-amber-500 font-bold"
           : "text-muted-foreground hover:text-amber-500 hover:bg-amber-500/10"
       }`}
       aria-label="Programa de Convite"
     >
       <Gift className="size-5" />
       {location.pathname.startsWith("/convite") && (
         <span className="absolute -left-1 w-1 h-5 bg-amber-500 rounded-r-full" />
       )}
     </Link>
   </TooltipTrigger>
   <TooltipContent side="right" className="font-semibold text-xs rounded-xl">
     Ganhe Prêmios (Convite)
   </TooltipContent>
 </Tooltip>
 </nav>

 {/* 3. Rodapé: Atalhos de Conta ou Entrar */}
 <div className="flex flex-col items-center gap-2 pt-3 w-full px-2">
 {isAuthenticated ? (
 <>
 {/* Workspace Shortcut */}
 <Tooltip>
 <TooltipTrigger asChild>
 <Link
 to="/workspace"
 className={`size-10 rounded-2xl flex items-center justify-center transition-all ${
 isWorkspaceActive
 ? "bg-primary text-primary-foreground font-bold "
 : "text-muted-foreground hover:text-foreground hover:bg-muted"
 }`}
 aria-label="Workspace Operacional"
 >
 <LayoutDashboard className="size-4" />
 </Link>
 </TooltipTrigger>
 <TooltipContent side="right" className="font-semibold text-xs rounded-xl">
 Workspace da Loja
 </TooltipContent>
 </Tooltip>

 {/* Account Shortcut */}
 <Tooltip>
 <TooltipTrigger asChild>
 <Link
 to="/conta"
 className={`size-10 rounded-2xl flex items-center justify-center transition-all ${
 isAccountActive
 ? "bg-primary/10 text-primary font-bold "
 : "text-muted-foreground hover:text-foreground hover:bg-muted"
 }`}
 aria-label="Minha Conta"
 >
 <User className="size-4" />
 </Link>
 </TooltipTrigger>
 <TooltipContent side="right" className="font-semibold text-xs rounded-xl">
 Minha Conta
 </TooltipContent>
 </Tooltip>
 </>
 ) : (
 <Tooltip>
 <TooltipTrigger asChild>
 <Link
 to="/entrar"
 className="size-10 rounded-2xl flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-primary/10 transition-all"
 aria-label="Entrar / Cadastrar"
 >
 <LogIn className="size-4" />
 </Link>
 </TooltipTrigger>
 <TooltipContent side="right" className="font-semibold text-xs rounded-xl">
 Entrar / Cadastrar
 </TooltipContent>
 </Tooltip>
 )}
 </div>
 </aside>
 </TooltipProvider>
 );
}
