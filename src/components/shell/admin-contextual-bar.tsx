import React from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { Shield, Layers, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { openOrCreatePageExperienceDocument } from "@/services/surface-cms.functions";
import { toast } from "sonner";

interface AdminContextualBarProps {
  userRole?: string | null;
}

const ROUTE_NICHE_MAP: Record<string, { id: string; label: string }> = {
  "/": { id: "home", label: "Início (Home)" },
  "/explorar": { id: "explorar", label: "Explorar" },
  "/noor": { id: "chat_noor", label: "Chat Noor" },
  "/chat": { id: "chat_noor", label: "Chat e Mensagens" },
  "/comunidades": { id: "comunidades", label: "Comunidades" },
  "/mercado": { id: "mercado", label: "Supermercado e Feira" },
  "/gastronomia": { id: "gastronomia", label: "Gastronomia e Delivery" },
  "/farmacia": { id: "farmacia", label: "Farmácia e Saúde" },
  "/bebidas": { id: "bebidas", label: "Bebidas e Adega" },
  "/acougue": { id: "acougue", label: "Açougue e Carnes" },
  "/moda": { id: "moda", label: "Moda e Vestuário" },
  "/eletronicos": { id: "eletronicos", label: "Eletrônicos e Tech" },
  "/pet": { id: "pet", label: "Pet Shop" },
  "/servicos": { id: "servicos", label: "Serviços e Profissionais" },
  "/imoveis": { id: "imoveis", label: "Imóveis e Locação" },
  "/construcao": { id: "construcao", label: "Construção e Reforma" },
  "/casa": { id: "casa", label: "Casa e Decoração" },
  "/beleza": { id: "beleza", label: "Beleza e Estética" },
  "/limpeza": { id: "limpeza", label: "Limpeza e Utilidades" },
  "/livros": { id: "livros", label: "Livros e Papelaria" },
  "/feed": { id: "feed", label: "Feed Social" },
  "/noticias": { id: "noticias", label: "Notícias" },
  "/eventos": { id: "eventos", label: "Eventos" },
  "/agenda": { id: "agenda", label: "Agenda" },
  "/afiliados": { id: "afiliados", label: "Afiliados" },
  "/turismo": { id: "turismo", label: "Turismo e Hospedagem" },
  "/empregos": { id: "empregos", label: "Empregos" },
  "/classificados": { id: "classificados", label: "Classificados" },
  "/diretorio": { id: "diretorio", label: "Places" },
  "/mobilidade": { id: "mobilidade", label: "Mobilidade Urbana" },
  "/ofertas": { id: "ofertas", label: "Ofertas Relâmpago" },
};

export function AdminContextualBar({ userRole }: AdminContextualBarProps) {
  const routerState = useRouterState();
  const navigate = useNavigate();
  const pathname = routerState.location.pathname;
  const [isMinimized, setIsMinimized] = React.useState(false);
  const [openingOmni, setOpeningOmni] = React.useState(false);

  if (
    userRole !== "platform_admin" ||
    pathname.startsWith("/admin-master") ||
    pathname.startsWith("/workspace")
  ) {
    return null;
  }

  const activeNiche = ROUTE_NICHE_MAP[pathname] || {
    id: "home",
    label: "Vitrine Pública",
  };

  const handleOpenOmniEditor = async () => {
    setOpeningOmni(true);
    try {
      const res = await openOrCreatePageExperienceDocument({
        data: { pageSlug: activeNiche.id, pageTitle: activeNiche.label },
      });
      if (res?.documentId) {
        navigate({
          to: "/workspace/builder/$documentId/editor",
          params: { documentId: res.documentId } as any,
        });
      }
    } catch (err: any) {
      toast.error(err?.message || "Erro ao abrir página no OmniBuilder.");
    } finally {
      setOpeningOmni(false);
    }
  };

  if (isMinimized) {
    return (
      <button
        type="button"
        onClick={() => setIsMinimized(false)}
        aria-label="Expandir Barra de Governança"
        className="fixed bottom-20 right-4 lg:bottom-6 lg:right-6 z-30 size-11 min-h-11 min-w-11 rounded-xl bg-primary text-primary-foreground flex items-center justify-center border border-border hover:scale-105 transition-transform duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        title="Admin Master"
      >
        <Shield className="size-4" />
      </button>
    );
  }

  return (
    <aside
      aria-label="Barra de Governança Contextual Master"
      className="fixed bottom-20 right-4 lg:bottom-6 lg:right-6 z-30 max-w-md w-auto bg-card border border-border rounded-xl p-2 px-3 flex items-center justify-between gap-3 text-xs animate-in slide-in-from-bottom-3 duration-300"
    >
      <div className="flex items-center gap-2">
        <div className="size-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center font-bold text-2xs">
          <Shield className="size-4" />
        </div>
        <div className="hidden sm:block text-left pr-1">
          <div className="flex items-center gap-1 font-bold text-foreground text-2xs">
            <span className="truncate max-w-32">{activeNiche.label}</span>
          </div>
          <p className="text-3xs text-muted-foreground font-mono uppercase tracking-wider">
            Admin Master
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button
          type="button"
          size="sm"
          disabled={openingOmni}
          onClick={handleOpenOmniEditor}
          className="h-11 min-h-11 px-3 rounded-xl text-xs font-bold gap-2 cursor-pointer"
        >
          {openingOmni ? (
            <Loader2 className="size-3.5 animate-spin motion-reduce:transition-none" />
          ) : (
            <Layers className="size-3.5" />
          )}
          <span>Editar no OmniBuilder</span>
        </Button>

        <Button
          asChild
          size="sm"
          variant="outline"
          className="h-11 min-h-11 px-3 rounded-xl text-xs font-bold gap-1 cursor-pointer"
        >
          <Link to="/admin-master/home-editor">
            <span>Páginas</span>
          </Link>
        </Button>

        <button
          type="button"
          onClick={() => setIsMinimized(true)}
          aria-label="Minimizar barra de atalho"
          className="size-11 min-h-11 min-w-11 rounded-xl flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          title="Minimizar barra de atalho"
        >
          <X className="size-4" />
        </button>
      </div>
    </aside>
  );
}
