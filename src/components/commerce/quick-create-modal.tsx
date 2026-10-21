import React, { useState } from "react";
import { Link, useNavigate, useLocation } from "@tanstack/react-router";
import { Tag, Camera, Briefcase, Plus, Store, X, Calendar, Compass } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { PostCreationDrawer } from "@/components/community/post-creation-drawer";

interface QuickActionItem {
  id: string;
  title: string;
  subtitle: string;
  icon: React.ElementType;
  badges: string[];
  to?: string;
  onClick?: () => void;
  requiresAuth?: boolean;
}

export function QuickCreateModal({
  isAuthenticated = false,
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

  const handleProtectedNavigate = (
    toUrl: string,
    reason: string,
    searchParams?: Record<string, string>,
  ) => {
    closeSheet();
    if (!isAuthenticated) {
      toast.info(`Acesse sua conta para ${reason}.`);
      const fullReturnUrl = searchParams
        ? `${toUrl}?${new URLSearchParams(searchParams).toString()}`
        : toUrl;
      navigate({ to: "/entrar", search: { returnUrl: fullReturnUrl } });
      return;
    }
    if (searchParams) {
      navigate({ to: toUrl as any, search: searchParams as any });
    } else {
      navigate({ to: toUrl as any });
    }
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
      badges: ["Mural", "Fotos e Texto"],
      onClick: handleOpenPostDrawer,
      requiresAuth: true,
    },
    {
      id: "evento",
      title: "Criar Evento, Show ou Festa",
      subtitle: "Divulgue festas, encontros, shows, lotes de ingressos e lista de presença.",
      icon: Calendar,
      badges: ["Eventos", "Ingressos"],
      onClick: () =>
        handleProtectedNavigate(
          "/conta/classificados/novo",
          "criar e divulgar um evento",
          { tipo: "evento" },
        ),
      requiresAuth: true,
    },
    {
      id: "desapego",
      title: "Novo Desapego ou Classificado",
      subtitle: "Anuncie itens seminovos, usados, eletrônicos, veículos ou imóveis.",
      icon: Tag,
      badges: ["Grátis", "Classificados"],
      onClick: () =>
        handleProtectedNavigate(
          "/conta/classificados/novo",
          "publicar um novo anúncio classificado",
        ),
      requiresAuth: true,
    },
    {
      id: "turismo",
      title: "Excursão, Passeio ou Roteiro",
      subtitle: "Publique roteiros turísticos, viagens em grupo, trilhas e experiências.",
      icon: Compass,
      badges: ["Turismo", "Viagens"],
      onClick: () =>
        handleProtectedNavigate(
          "/conta/classificados/novo",
          "publicar uma excursão ou roteiro",
          { tipo: "viagem" },
        ),
      requiresAuth: true,
    },
    {
      id: "empregos",
      title: "Publicar Vaga ou Oportunidade",
      subtitle: "Anuncie vagas de trabalho, estágios e oportunidades na região.",
      icon: Briefcase,
      badges: ["Empregos", "Carreira"],
      onClick: () =>
        handleProtectedNavigate(
          "/conta/classificados/novo",
          "publicar uma vaga de emprego",
          { tipo: "vaga" },
        ),
      requiresAuth: true,
    },
    {
      id: "loja",
      title: "Cadastrar Loja ou Empresa",
      subtitle: "Abra a sua loja digital para vender produtos, alimentação ou serviços.",
      icon: Store,
      badges: ["Comércio", "Vitrine"],
      onClick: () =>
        handleProtectedNavigate("/criar-negocio", "cadastrar uma nova loja ou empresa"),
      requiresAuth: true,
    },
  ];

  return (
    <>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <button
            type="button"
            onClick={handleTriggerClick}
            aria-label="Publicar"
            className={
              asNavButton
                ? "size-11 rounded-lg bg-primary text-primary-foreground flex items-center justify-center shadow-xs active:scale-95 transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 cursor-pointer"
                : "size-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center -mt-5 hover:scale-105 active:scale-95 transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 cursor-pointer border-2 border-background"
            }
          >
            <Plus className={asNavButton ? "size-5 stroke-2" : "size-6 stroke-2"} />
          </button>
        </SheetTrigger>

        <SheetContent
          side="bottom"
          className="max-h-overlay-max flex flex-col p-0 bg-background rounded-t-3xl border-t border-border overflow-hidden"
        >
          <SheetHeader className="p-4 flex items-center justify-between shrink-0 bg-background/95 backdrop-blur-md">
            <div className="flex items-center gap-3">
              <button
                onClick={closeSheet}
                className="size-11 min-h-11 min-w-11 rounded-lg flex items-center justify-center hover:bg-muted active:scale-95 transition-colors text-muted-foreground hover:text-foreground cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                aria-label="Fechar"
              >
                <X className="size-5" />
              </button>
              <SheetTitle className="text-base font-bold tracking-tight text-foreground">
                Novo Anúncio
              </SheetTitle>
            </div>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto no-scrollbar p-4 sm:p-6 space-y-3">
            {actionItems.map((item) => {
              const Icon = item.icon;
              const CardContent = (
                <div className="w-full p-4 rounded-lg bg-card border border-border/60 hover:border-primary/40 hover:bg-muted/40 transition-colors duration-200 active:scale-95 flex items-center justify-between gap-3 group cursor-pointer shadow-2xs">
                  <div className="flex items-start gap-4 min-w-0">
                    <div className="size-12 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                      <Icon className="size-6 stroke-2" />
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
                            className="text-xs font-semibold uppercase px-2 py-1 rounded-md bg-muted text-muted-foreground"
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
                  <button
                    key={item.id}
                    type="button"
                    onClick={item.onClick}
                    className="w-full text-left rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 cursor-pointer"
                  >
                    {CardContent}
                  </button>
                );
              }

              if (item.to) {
                return (
                  <Link
                    key={item.id}
                    to={item.to}
                    onClick={closeSheet}
                    className="block rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                  >
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
