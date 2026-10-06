import { useState, useRef, useEffect } from "react";
import { Link } from "@tanstack/react-router";
import { ChevronRight, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import type { NavGroup } from "@/lib/workspace-navigation";

interface WorkspaceSidebarFlyoutProps {
 group: NavGroup;
 currentPath: string;
 isExpanded: boolean;
 onToggleExpand: () => void;
 isMobile?: boolean;
}

export function WorkspaceSidebarFlyout({
 group,
 currentPath,
 isExpanded,
 onToggleExpand,
 isMobile = false,
}: WorkspaceSidebarFlyoutProps) {
 const [isFlyoutOpen, setIsFlyoutOpen] = useState(false);
 const flyoutRef = useRef<HTMLDivElement>(null);
 const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

 const isGroupActive = group.items.some((item) =>
 item.path === "/workspace"
 ? currentPath === "/workspace"
 : currentPath.startsWith(item.path)
 );

 const Icon = group.icon;

 // Fechamento com delay suave no mouseLeave
 const handleMouseEnter = () => {
 if (isMobile) return;
 if (timeoutRef.current) clearTimeout(timeoutRef.current);
 setIsFlyoutOpen(true);
 };

 const handleMouseLeave = () => {
 if (isMobile) return;
 timeoutRef.current = setTimeout(() => {
 setIsFlyoutOpen(false);
 }, 200);
 };

 useEffect(() => {
 return () => {
 if (timeoutRef.current) clearTimeout(timeoutRef.current);
 };
 }, []);

 // Grupo com item único (ex: Visão Geral / Tarefas): Navegação direta de 1 clique (Padrão Linear / Apple HIG)
 if (group.items.length === 1) {
 const singleItem = group.items[0];
 const isSingleActive =
 singleItem.path === "/workspace"
 ? currentPath === "/workspace"
 : currentPath.startsWith(singleItem.path);

 return (
 <Link
 to={singleItem.path}
 className={cn(
 "group flex min-h-11 items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
 isSingleActive
 ? "text-primary bg-primary/10 font-bold border border-primary/20"
 : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
 )}
 >
 <div className="flex items-center gap-3 min-w-0">
 <Icon
 className={cn(
 "size-4 shrink-0 transition-colors",
 isSingleActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
 )}
 />
 <span className="truncate">{group.label}</span>
 </div>
 {group.badge !== undefined && (
 <span
 className={cn(
 "px-2 py-1 rounded-md text-xs font-mono font-bold shrink-0",
 isSingleActive
 ? "bg-primary/20 text-primary"
 : "bg-muted text-muted-foreground"
 )}
 >
 {group.badge}
 </span>
 )}
 </Link>
 );
 }

 // No mobile, usamos o accordion nativo simples e direto
 if (isMobile) {
 return (
 <div className="space-y-1">
 <button
 type="button"
 onClick={onToggleExpand}
 className={cn(
 "flex min-h-11 w-full items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
 isGroupActive
 ? "text-primary bg-primary/10 font-bold"
 : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
 )}
 >
 <div className="flex items-center gap-3">
 <Icon className="size-4 shrink-0" />
 <span>{group.label}</span>
 </div>
 {isExpanded ? (
 <ChevronDown className="size-3.5 text-muted-foreground" />
 ) : (
 <ChevronRight className="size-3.5 text-muted-foreground" />
 )}
 </button>

 {isExpanded && (
 <div className="ml-3 pl-3 space-y-1 pt-1 border-l border-border/40">
 {group.items.map((item) => {
 const isItemActive =
 item.path === "/workspace"
 ? currentPath === "/workspace"
 : currentPath.startsWith(item.path);

 return (
 <Link
 key={item.path}
 to={item.path}
 className={cn(
 "flex min-h-11 items-center px-3 py-2 rounded-lg text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
 isItemActive
 ? "bg-primary/10 text-primary font-bold border border-primary/20"
 : "text-muted-foreground hover:text-foreground hover:bg-muted/70"
 )}
 >
 <span className={cn("size-1.5 rounded-full mr-2 shrink-0 transition-transform", isItemActive ? "bg-primary scale-100" : "bg-transparent scale-0")} />
 <span>{item.label}</span>
 </Link>
 );
 })}
 </div>
 )}
 </div>
 );
 }

 // No Desktop: Accordion + Flyout Flutuante à Direita (Padrão Meta Studio)
 return (
 <div
 className="relative space-y-1"
 onMouseEnter={handleMouseEnter}
 onMouseLeave={handleMouseLeave}
 ref={flyoutRef}
 >
 <button
 type="button"
 onClick={onToggleExpand}
 className={cn(
 "group flex min-h-11 w-full items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer relative focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
 isGroupActive
 ? "text-primary bg-primary/10 font-bold"
 : "text-muted-foreground hover:text-foreground hover:bg-muted/60",
 isFlyoutOpen && "bg-muted/80 text-foreground"
 )}
 >
 <div className="flex items-center gap-3 min-w-0">
 <Icon
 className={cn(
 "size-4 shrink-0 transition-colors",
 isGroupActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
 )}
 />
 <span className="truncate">{group.label}</span>
 </div>
 <div className="flex items-center gap-2 shrink-0">
 {group.badge !== undefined && (
 <span
 className={cn(
 "px-2 py-1 rounded-md text-xs font-mono font-bold",
 isGroupActive
 ? "bg-primary/20 text-primary"
 : "bg-muted text-muted-foreground"
 )}
 >
 {group.badge}
 </span>
 )}
 <ChevronRight
 className={cn(
 "size-3 text-muted-foreground transition-transform duration-200",
 isFlyoutOpen && "translate-x-0.5 text-foreground",
 isExpanded && "rotate-90"
 )}
 />
 </div>
 </button>

 {/* Accordion Expandido Inline (Clean, sem efeito pill preto) */}
 {isExpanded && (
 <div className="ml-3 pl-3 space-y-1 pt-1 border-l border-border/50">
 {group.items.map((item) => {
 const isItemActive =
 item.path === "/workspace"
 ? currentPath === "/workspace"
 : currentPath.startsWith(item.path);

 return (
 <Link
 key={item.path}
 to={item.path}
 className={cn(
 "flex min-h-11 items-center px-3 py-2 rounded-lg text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
 isItemActive
 ? "bg-primary/10 text-primary font-bold border border-primary/20"
 : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
 )}
 >
 <span
 className={cn(
 "size-1.5 rounded-full mr-2 shrink-0 transition-transform",
 isItemActive ? "bg-primary scale-100" : "bg-transparent scale-0"
 )}
 />
 <span className="truncate">{item.label}</span>
 </Link>
 );
 })}
 </div>
 )}

 {/* Flyout Flutuante à Direita (Hover / Apenas quando recolhido) */}
 {isFlyoutOpen && !isExpanded && (
 <div
 className="absolute left-full top-0 ml-2 w-56 rounded-lg border border-border/80 bg-background/98 backdrop-blur-xl p-2 z-50 animate-in fade-in-0 zoom-in-95 duration-150"

 >
 <div className="px-3 py-2 pb-2 border-b border-border/40 mb-1">
 <span className="text-xs font-mono font-bold uppercase tracking-wider text-muted-foreground block">
 {group.label}
 </span>
 </div>

 <div className="space-y-1">
 {group.items.map((item) => {
 const isItemActive =
 item.path === "/workspace"
 ? currentPath === "/workspace"
 : currentPath.startsWith(item.path);

 const ItemIcon = item.icon;

 return (
 <Link
 key={item.path}
 to={item.path}
 onClick={() => setIsFlyoutOpen(false)}
 className={cn(
 "flex min-h-11 items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
 isItemActive
 ? "bg-primary/10 text-primary font-bold border border-primary/20"
 : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
 )}
 >
 {ItemIcon ? (
 <ItemIcon className={cn("size-3.5 shrink-0", isItemActive ? "text-primary" : "opacity-70")} />
 ) : (
 <span
 className={cn(
 "size-1.5 rounded-full shrink-0 transition-transform",
 isItemActive ? "bg-primary scale-100" : "bg-muted-foreground/40 scale-75"
 )}
 />
 )}
 <span className="truncate">{item.label}</span>
 </Link>
 );
 })}
 </div>
 </div>
 )}
 </div>
 );
}

export default WorkspaceSidebarFlyout;
