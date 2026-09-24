import { NotificationsPopover } from "@/components/notifications/notifications-popover";
import { cn } from "@/lib/utils";
import React, { useState } from "react";
import { Link, useRouter } from "@tanstack/react-router";
import {
 Search,
 ShoppingBag,
 Bell,
 LogOut,
 User,
 Store,
 Check,
 Plus,
 LayoutDashboard,
 Settings,
 Package,
 Tag,
 Bookmark,
 Edit3,
 ArrowUpRight,
 ShieldAlert,
 Shield,
 MessageSquare,
 Ticket,
 Calendar,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
 DropdownMenu,
 DropdownMenuContent,
 DropdownMenuItem,
 DropdownMenuLabel,
 DropdownMenuSeparator,
 DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
 Dialog,
 DialogContent,
 DialogHeader,
 DialogTitle,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { signOut } from "@/services/auth.functions";
import { setTenantContext } from "@/services/identity.functions";
import { useCartContext } from "@/lib/cart-context";
import { toast } from "sonner";

export interface UtilityClusterProps {
 session?: any;
 embedded?: boolean;
}

export function UtilityCluster({ session, embedded = false }: UtilityClusterProps) {
 const router = useRouter();
 const { setIsCartOpen, globalCarts } = useCartContext();
 const [searchOpen, setSearchOpen] = useState(false);
 const [searchQuery, setSearchQuery] = useState("");
 const [isSwitching, setIsSwitching] = useState(false);

 const memberships = (session?.memberships as any[]) || [];
 const activeStoreId = session?.store_id;
 const totalItemCount = globalCarts.reduce((acc, c) => acc + c.itemCount, 0);

 // ── Identity extraction: SEMPRE identidade pessoal do usuário, NUNCA nome da loja
 const userMeta = session?.user?.user_metadata || {};
 const userName =
 userMeta?.full_name ||
 session?.user?.email?.split("@")[0] ||
 session?.email?.split("@")[0] ||
 "Membro Waesy";
 const userHandle =
 userMeta?.username ||
 session?.user?.email?.split("@")[0] ||
 session?.email?.split("@")[0] ||
 "membro";
 const userAvatar = userMeta?.avatar_url || "";
 const userInitial = userName.charAt(0).toUpperCase();
 const isPlatformAdmin =
 session?.role === "platform_admin" ||
 session?.role === "master" ||
 session?.role === "admin" ||
 session?.user?.role === "platform_admin" ||
 userMeta?.role === "platform_admin" ||
 userMeta?.role === "master" ||
 userMeta?.role === "admin";

 const handleSearchSubmit = (e: React.FormEvent) => {
 e.preventDefault();
 if (!searchQuery.trim()) return;
 setSearchOpen(false);
 router.navigate({
 to: "/buscar",
 search: { q: searchQuery.trim() },
 });
 };

 const handleSwitchStore = async (storeId: string) => {
 if (isSwitching) return;
 setIsSwitching(true);
 try {
 if (typeof window !== "undefined") {
 window.document.cookie = `waesy_active_tenant=${storeId}; path=/; max-age=31536000; SameSite=Lax`;
 }
 await setTenantContext({ data: { store_id: storeId } }).catch(() => null);
 toast.success("Acessando painel da empresa...");
 window.location.href = "/workspace";
 } catch {
 toast.error("Erro ao alternar loja.");
 setIsSwitching(false);
 }
 };

 const handleLogout = async () => {
 try {
 await signOut();
 toast.success("Sessão encerrada.");
 window.location.href = "/";
 } catch {
 toast.error("Erro ao sair.");
 }
 };

 return (
 <>
 <div
 className={`flex items-center gap-1 sm:gap-2 shrink-0 ${
 embedded ? "" : "h-10 px-2 rounded-2xl bg-card"
 }`}
 >
 {/* 1. Conversas / Chat Direto (Desktop >= 768px) */}
 {session && (
 <Button
 asChild
 variant="ghost"
 size="icon"
 className="hidden md:inline-flex size-8 rounded-xl relative text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-all active:scale-95 cursor-pointer"
 title="Atendimento & Suporte"
 >
 <Link to="/conta/suporte">
 <MessageSquare className="size-4" />
 </Link>
 </Button>
 )}

 {/* 2. Sacola de Compras (Desktop >= 768px) */}
 <Button
 variant="ghost"
 size="icon"
 onClick={() => setIsCartOpen(true)}
 className="hidden md:inline-flex size-8 rounded-xl relative text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-all active:scale-95 cursor-pointer"
 title="Sacola de Compras"
 >
 <ShoppingBag className="size-4" />
 {totalItemCount > 0 && (
 <span className="absolute -top-1 -right-1 size-4 bg-primary text-primary-foreground text-[9px] font-bold rounded-lg flex items-center justify-center animate-scale-in">
 {totalItemCount}
 </span>
 )}
 </Button>

 {/* 3. Notificações */}
 <NotificationsPopover session={session} />

 {/* 4. Alternador de Tema Dark/Light (Desktop >= 768px) */}
 <ThemeToggle className="hidden md:inline-flex size-8 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-all active:scale-95 cursor-pointer" />

 <div className="hidden md:block h-4 w-px bg-border/60 mx-0.5" />

 {/* 6. Perfil / Auth Menu (Oculto no mobile pois já existe na MobileNav com suporte a gestos) */}
 {session ? (
 <div className="inline-flex">
 <DropdownMenu>
 <DropdownMenuTrigger asChild>
 <button
 type="button"
 className="size-8 shrink-0 rounded-xl overflow-hidden focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all hover:scale-105 active:scale-95 cursor-pointer"
 aria-label="Menu de Perfil e Conta"
 >
 <Avatar className="size-full rounded-none">
 <AvatarImage src={userAvatar} alt={userName} />
 <AvatarFallback className="text-[11px] font-bold bg-primary text-primary-foreground">
 {userInitial}
 </AvatarFallback>
 </Avatar>
 </button>
 </DropdownMenuTrigger>

 <DropdownMenuContent
 align="end"
 className="w-72 rounded-2xl p-2 bg-card space-y-1"
 >
 {/* Header — Identidade Pessoal do Usuário */}
 <DropdownMenuLabel className="font-normal p-2.5 pb-2">
 <div className="flex items-center gap-3">
 <div className="size-10 rounded-2xl overflow-hidden bg-muted shrink-0 flex items-center justify-center">
 {userAvatar ? (
 <img src={userAvatar} alt={userName} className="size-full object-cover" />
 ) : (
 <span className="text-sm font-black text-primary">{userInitial}</span>
 )}
 </div>
 <div className="min-w-0 flex-1">
 <p className="text-sm font-bold text-foreground truncate leading-tight">{userName}</p>
 <p className="text-xs text-muted-foreground truncate font-mono">@{userHandle}</p>
 {memberships.length > 0 && (
 <span className="text-[10px] text-muted-foreground/70 font-medium">
 {memberships.length} {memberships.length === 1 ? "loja" : "lojas"} ativas
 </span>
 )}
 </div>
 </div>
 </DropdownMenuLabel>

 <DropdownMenuSeparator className="my-1" />

 {/* Ações da Conta Pessoal (1 Palavra / Rótulo Direto) */}
 <div className="space-y-0.5">
 <DropdownMenuItem asChild className="rounded-xl cursor-pointer text-xs font-bold text-foreground px-3 py-2 hover:bg-muted/60">
 <Link to="/conta">Minha Conta</Link>
 </DropdownMenuItem>

 <DropdownMenuItem asChild className="rounded-xl cursor-pointer text-xs font-medium text-foreground/90 px-3 py-2 hover:bg-muted/60">
 <Link to="/conta/perfil">Meu Perfil</Link>
 </DropdownMenuItem>

 <DropdownMenuItem asChild className="rounded-xl cursor-pointer text-xs font-medium text-foreground/90 px-3 py-2 hover:bg-muted/60">
 <Link to="/conta/salvos">Salvos</Link>
 </DropdownMenuItem>

 <DropdownMenuItem asChild className="rounded-xl cursor-pointer text-xs font-medium text-foreground/90 px-3 py-2 hover:bg-muted/60">
 <Link to="/conta/pedidos">Pedidos</Link>
 </DropdownMenuItem>

 <DropdownMenuItem asChild className="rounded-xl cursor-pointer text-xs font-medium text-foreground/90 px-3 py-2 hover:bg-muted/60">
 <Link to="/conta/ingressos">Ingressos</Link>
 </DropdownMenuItem>

 <DropdownMenuItem asChild className="rounded-xl cursor-pointer text-xs font-medium text-foreground/90 px-3 py-2 hover:bg-muted/60">
 <Link to="/conta/agendamentos">Agendamentos</Link>
 </DropdownMenuItem>

 <DropdownMenuItem asChild className="rounded-xl cursor-pointer text-xs font-medium text-foreground/90 px-3 py-2 hover:bg-muted/60">
 <Link to="/conta/classificados">Meus Desapegos</Link>
 </DropdownMenuItem>

 <DropdownMenuItem asChild className="rounded-xl cursor-pointer text-xs font-medium text-foreground/90 px-3 py-2 hover:bg-muted/60">
 <Link to="/conta/concursos">Meus Sorteios & Cupons</Link>
 </DropdownMenuItem>

 <DropdownMenuItem asChild className="rounded-xl cursor-pointer text-xs font-medium text-foreground/90 px-3 py-2 hover:bg-muted/60">
 <Link to="/convite">Convites & Membro Fundador</Link>
 </DropdownMenuItem>

 <DropdownMenuItem asChild className="rounded-xl cursor-pointer text-xs font-medium text-foreground/90 px-3 py-2 hover:bg-muted/60">
 <Link to="/conta/criadores">Criadores & Vitrines</Link>
 </DropdownMenuItem>

 <DropdownMenuItem asChild className="rounded-xl cursor-pointer text-xs font-medium text-foreground/90 px-3 py-2 hover:bg-muted/60">
 <Link to="/conta/seguranca">Configurações</Link>
 </DropdownMenuItem>

 <DropdownMenuItem asChild className="rounded-xl cursor-pointer text-xs font-medium text-foreground/90 px-3 py-2 hover:bg-muted/60">
 <Link to="/conta/suporte">Ajuda & Suporte</Link>
 </DropdownMenuItem>
 </div>

 {/* ── Acesso Direto ao Workspace / Gestão da Loja ── */}
 <DropdownMenuSeparator className="my-1" />
 <div className="p-1 space-y-1">
 {isPlatformAdmin && (
 <DropdownMenuItem asChild className="rounded-xl cursor-pointer text-xs font-bold bg-primary/10 text-primary hover:bg-primary/20 px-3 py-2 flex items-center justify-between border border-primary/20">
 <Link to="/admin-master">
 <div className="flex items-center gap-2">
 <Shield className="size-3.5" />
 <span>Admin Master</span>
 </div>
 <ArrowUpRight className="size-3.5" />
 </Link>
 </DropdownMenuItem>
 )}

 {memberships.length > 0 || isPlatformAdmin ? (
 <DropdownMenuItem asChild className="rounded-xl cursor-pointer text-xs font-bold bg-foreground text-background hover:bg-foreground/90 px-3 py-2 flex items-center justify-between">
 <Link to="/workspace">
 <div className="flex items-center gap-2">
 <LayoutDashboard className="size-3.5" />
 <span>Entrar no Workspace</span>
 </div>
 <ArrowUpRight className="size-3.5" />
 </Link>
 </DropdownMenuItem>
 ) : (
 <DropdownMenuItem asChild className="rounded-xl cursor-pointer text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/90 px-3 py-2 flex items-center justify-between shadow-xs">
 <Link to="/criar-negocio">
 <div className="flex items-center gap-2">
 <Plus className="size-3.5" />
 <span>Cadastrar Meu Negócio</span>
 </div>
 <ArrowUpRight className="size-3.5" />
 </Link>
 </DropdownMenuItem>
 )}
 </div>

 {/* ── Gestão de Negócios & Espaços (Multiloja Transparente) ── */}
 {memberships.length > 0 && (
 <div className="py-1">
 <div className="px-3 py-1.5 flex items-center justify-between">
 <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
 Minhas Lojas ({memberships.length})
 </span>
 <Link
 to="/conta/lojas"
 className="text-[10px] font-bold text-primary hover:underline flex items-center gap-0.5"
 >
 <span>Ver Todas</span>
 <ArrowUpRight className="size-2.5" />
 </Link>
 </div>

 <div className="space-y-0.5 px-1">
 {memberships.slice(0, 3).map((m: any) => {
 const isCurrent = m.store_id === activeStoreId;
 return (
 <button
 key={m.store_id}
 type="button"
 disabled={isSwitching}
 onClick={() => handleSwitchStore(m.store_id)}
 className={cn(
 "w-full px-2.5 py-1.5 rounded-xl text-left flex items-center justify-between transition-colors cursor-pointer",
 isCurrent
 ? "bg-primary/10 text-primary font-bold"
 : "hover:bg-muted/60 text-foreground/90 font-medium"
 )}
 >
 <div className="flex items-center gap-2 min-w-0">
 <div className="size-5 rounded-md bg-muted flex items-center justify-center overflow-hidden shrink-0">
 {m.logo_url ? (
 <img src={m.logo_url} alt={m.name} className="size-full object-cover" />
 ) : (
 <Store className="size-3 text-primary" />
 )}
 </div>
 <div className="min-w-0">
 <p className="text-xs truncate leading-tight">{m.name || "Minha Loja"}</p>
 </div>
 </div>
 {isCurrent ? (
 <span className="text-[9px] font-bold text-primary px-1.5 py-0.5 rounded-md bg-primary/20 shrink-0">
 Ativo
 </span>
 ) : (
 <ArrowUpRight className="size-3 text-muted-foreground/70 shrink-0" />
 )}
 </button>
 );
 })}

 <DropdownMenuItem asChild className="rounded-xl cursor-pointer text-xs font-semibold text-muted-foreground hover:text-foreground px-2.5 py-1.5 flex items-center gap-1.5 mt-1">
 <Link to="/criar-negocio">
 <Plus className="size-3.5" />
 <span>Cadastrar Outro Negócio</span>
 </Link>
 </DropdownMenuItem>
 </div>
 </div>
 )}

 {/* ── Atalho VIP: Painel Global Master (Super Admin) ── */}
 {isPlatformAdmin && (
 <>
 <DropdownMenuSeparator className="my-1" />
 <div className="p-1">
 <DropdownMenuItem asChild className="rounded-xl cursor-pointer text-xs font-black bg-primary/10 hover:bg-primary/20 text-primary border border-primary/30 px-3 py-2 flex items-center justify-between">
 <Link to="/admin-master">
 <div className="flex items-center gap-2">
 <ShieldAlert className="size-3.5" />
 <span>Painel Global Master</span>
 </div>
 <ArrowUpRight className="size-3" />
 </Link>
 </DropdownMenuItem>
 </div>
 </>
 )}

 <DropdownMenuSeparator className="my-1" />

 <DropdownMenuItem
 onClick={handleLogout}
 className="rounded-xl cursor-pointer text-xs font-semibold text-destructive hover:bg-destructive/10 focus:bg-destructive/10 focus:text-destructive px-3 py-2"
 >
 Encerrar Sessão
 </DropdownMenuItem>
 </DropdownMenuContent>
 </DropdownMenu>
 </div>
 ) : (
 <Button
 asChild
 size="sm"
 className="hidden md:inline-flex h-8 rounded-xl px-3 text-xs font-bold bg-primary text-primary-foreground"
 >
 <Link to="/entrar">Entrar</Link>
 </Button>
 )}
 </div>

 {/* Modal de Busca Rápida */}
 <Dialog open={searchOpen} onOpenChange={setSearchOpen}>
 <DialogContent className="sm:max-w-lg sm:rounded-2xl p-4 sm:top-[20%] sm:translate-y-0">
 <DialogHeader className="sr-only">
 <DialogTitle>Buscar no Waesy</DialogTitle>
 </DialogHeader>
 <form onSubmit={handleSearchSubmit} className="relative">
 <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
 <Input
 autoFocus
 value={searchQuery}
 onChange={(e) => setSearchQuery(e.target.value)}
 placeholder="Buscar posts, produtos, classificados, eventos ou membros..."
 className="h-12 pl-10 pr-4 text-sm bg-muted/30 rounded-xl border-border focus-visible:ring-primary"
 />
 </form>
 </DialogContent>
 </Dialog>
 </>
 );
}
