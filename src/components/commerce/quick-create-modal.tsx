import React, { useState } from "react";
import { Link, useNavigate, useLocation } from "@tanstack/react-router";
import {
 Tag,
 Camera,
 Briefcase,
 Plus,
 Store,
 X,
 LogIn,
} from "lucide-react";
import {
 Sheet,
 SheetContent,
 SheetHeader,
 SheetTitle,
 SheetTrigger,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { PostCreationDrawer } from "@/components/community/post-creation-drawer";

interface QuickActionItem {
 id: string;
 title: string;
 subtitle: string;
 icon: React.ElementType;
 iconBg: string;
 iconColor: string;
 borderHover: string;
 badges: string[];
 to?: string;
 onClick?: () => void;
 requiresAuth?: boolean;
}

export function QuickCreateModal({
 isAuthenticated = false,
 session,
 asNavButton = false,
}: {
 isAuthenticated?: boolean;
 session?: any;
 /** Quando true, renderiza o trigger como botão quadrado arredondado da bottom nav */
 asNavButton?: boolean;
}) {
 const [open, setOpen] = useState(false);
 const [isPostDrawerOpen, setIsPostDrawerOpen] = useState(false);
 const navigate = useNavigate();
 const location = useLocation();

 const closeSheet = () => setOpen(false);

 const handleOpenPostDrawer = () => {
 closeSheet();
 if (!isAuthenticated) {
 toast.info("Acesse sua conta para publicar no Mural da Comunidade.");
 navigate({ to: "/entrar", search: { returnUrl: "/mural" } });
 return;
 }
 setIsPostDrawerOpen(true);
 };

 const handleProtectedNavigate = (toUrl: string, reason: string) => {
 closeSheet();
 if (!isAuthenticated) {
 toast.info(`Acesse sua conta para ${reason}.`);
 navigate({ to: "/entrar", search: { returnUrl: toUrl } });
 return;
 }
 navigate({ to: toUrl as any });
 };

 const handleTriggerClick = (e: React.MouseEvent) => {
 if (!isAuthenticated) {
 e.preventDefault();
 e.stopPropagation();
 toast.info("Acesse sua conta para publicar e anunciar no Waesy.");
 navigate({
 to: "/entrar",
 search: { returnUrl: location.pathname || "/" },
 });
 return;
 }
 setOpen(true);
 };

 const actionItems: QuickActionItem[] = [
 {
 id: "feed",
 title: "Mural da Comunidade",
 subtitle: "Publique fotos, vídeos curtos ou mensagens no feed público da cidade.",
 icon: Camera,
 iconBg: "bg-sky-500/10",
 iconColor: "text-sky-500",
 borderHover: "hover:border-sky-500/50",
 badges: ["Mural", "Fotos & Texto"],
 onClick: handleOpenPostDrawer,
 requiresAuth: true,
 },
 {
 id: "desapego",
 title: "Novo Desapego / Classificado",
 subtitle: "Anuncie itens seminovos, usados, eletrônicos, veículos ou imóveis.",
 icon: Tag,
 iconBg: "bg-amber-500/10",
 iconColor: "text-amber-500",
 borderHover: "hover:border-amber-500/50",
 badges: ["Grátis", "Classificados"],
 onClick: () =>
 handleProtectedNavigate(
 "/conta/classificados/novo",
 "publicar um novo anúncio classificado",
 ),
 requiresAuth: true,
 },
 {
 id: "loja",
 title: "Cadastrar Loja ou Empresa",
 subtitle: "Abra a sua loja digital para vender produtos, alimentação ou serviços.",
 icon: Store,
 iconBg: "bg-rose-500/10",
 iconColor: "text-rose-500",
 borderHover: "hover:border-rose-500/50",
 badges: ["Comércio", "Vitrine & PWA"],
 onClick: () =>
 handleProtectedNavigate("/criar-negocio", "cadastrar uma nova loja ou empresa"),
 requiresAuth: true,
 },
 {
 id: "empregos",
 title: "Vagas & Oportunidades",
 subtitle: "Consulte vagas de trabalho, estágios e oportunidades na região.",
 icon: Briefcase,
 iconBg: "bg-emerald-500/10",
 iconColor: "text-emerald-500",
 borderHover: "hover:border-emerald-500/50",
 badges: ["Empregos", "Carreira"],
 to: "/empregos",
 },
 ];

 return (
 <>
 <Sheet open={open} onOpenChange={setOpen}>
 <SheetTrigger asChild>
 <button
 type="button"
 onClick={handleTriggerClick}
 aria-label="Criar ou Anunciar"
 className={
 asNavButton
 ? "h-11 w-11 shrink-0 rounded-2xl bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-900 dark:text-neutral-100 flex items-center justify-center border border-border/50 active:scale-95 transition-all focus:outline-none cursor-pointer shadow-xs"
 : "size-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center -mt-5 hover:scale-105 active:scale-95 transition-all focus:outline-none focus:ring-2 focus:ring-primary/40 cursor-pointer border-2 border-background"
 }
 >
 <Plus className={asNavButton ? "size-5.5 stroke-[2.5]" : "size-6 stroke-[2.5]"} />
 </button>
 </SheetTrigger>

 <SheetContent
 side="right" size="wide" className="w-full sm:max-w-3xl md:max-w-4xl lg:max-w-[70vw] xl:max-w-[70vw] md:sm:max-w-3xl md:max-w-4xl lg:max-w-[70vw] xl:max-w-[70vw] flex flex-col p-0 bg-background max-sm:!inset-0 max-sm:!h-[100dvh] max-sm:!w-full max-sm:rounded-none max-sm:border-none overflow-hidden"
 >
 <SheetHeader className="p-4 flex items-center justify-between shrink-0 bg-background/95 backdrop-blur-md">
 <div className="flex items-center gap-3">
 <button
 onClick={closeSheet}
 className="size-9 rounded-xl flex items-center justify-center hover:bg-muted active:scale-95 transition-all text-muted-foreground hover:text-foreground cursor-pointer"
 aria-label="Fechar"
 >
 <X size={18} />
 </button>
 <SheetTitle className="text-base font-bold tracking-tight text-foreground">
 Criar & Anunciar
 </SheetTitle>
 </div>
 </SheetHeader>

 <div className="flex-1 overflow-y-auto no-scrollbar p-4 sm:p-6 space-y-3">
 {actionItems.map((item) => {
 const Icon = item.icon;
 const CardContent = (
 <div
 className={`w-full p-4 rounded-2xl bg-card border border-border/60 hover:bg-muted/40 transition-all duration-200 active:scale-[0.99] flex items-center justify-between gap-3 group cursor-pointer shadow-2xs ${item.borderHover}`}
 >
 <div className="flex items-start gap-3.5 min-w-0">
 <div
 className={`size-12 rounded-xl ${item.iconBg} ${item.iconColor} flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform`}
 >
 <Icon className="size-6 stroke-[2]" />
 </div>

 <div className="min-w-0 flex-1 space-y-1">
 <div className="flex items-center gap-2 flex-wrap">
 <h3 className="text-sm font-bold text-foreground group-hover:text-primary transition-colors truncate">
 {item.title}
 </h3>
 {item.badges.map((b) => (
 <Badge
 key={b}
 variant="secondary"
 className="text-[9px] font-bold uppercase px-2 py-0.5 rounded-md bg-muted text-muted-foreground"
 >
 {b}
 </Badge>
 ))}
 </div>
 <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
 {item.subtitle}
 </p>
 </div>
 </div>
 </div>
 );

 if (item.onClick) {
 return (
 <div key={item.id} onClick={item.onClick}>
 {CardContent}
 </div>
 );
 }

 if (item.to) {
 return (
 <Link key={item.id} to={item.to} onClick={closeSheet} className="block">
 {CardContent}
 </Link>
 );
 }

 return null;
 })}
 </div>
 </SheetContent>
 </Sheet>

 <PostCreationDrawer
 open={isPostDrawerOpen}
 onOpenChange={setIsPostDrawerOpen}
 />
 </>
 );
}