import React from "react";
import { AlertCircle, Clock, PackageX, ShieldAlert, RefreshCw, ArrowLeft, Search, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export type ListingEmptyReason =
  | "not_found"
  | "expired"
  | "out_of_stock"
  | "unauthorized_draft"
  | "server_error";

export interface ListingEmptyStateProps {
  reason: ListingEmptyReason;
  title?: string;
  description?: string;
  onRetry?: () => void;
  onBack?: () => void;
  onExploreSimilar?: () => void;
  onJoinWaitlist?: () => void;
  onRenewListing?: () => void;
  isOwner?: boolean;
  className?: string;
}

export function ListingEmptyState({
  reason,
  title,
  description,
  onRetry,
  onBack,
  onExploreSimilar,
  onJoinWaitlist,
  onRenewListing,
  isOwner = false,
  className,
}: ListingEmptyStateProps) {
  const configs: Record<
    ListingEmptyReason,
    {
      badge: string;
      defaultTitle: string;
      defaultDescription: string;
      icon: React.ElementType;
      colorClass: string;
    }
  > = {
    not_found: {
      badge: "Não Encontrado",
      defaultTitle: "Anúncio não localizado",
      defaultDescription: "Este anúncio pode ter sido removido pelo anunciante ou o link está incorreto.",
      icon: Search,
      colorClass: "text-muted-foreground bg-muted/60",
    },
    expired: {
      badge: "Prazo Expirado",
      defaultTitle: "Este anúncio expirou",
      defaultDescription: isOwner
        ? "O período de veiculação terminou. Você pode renovar a publicação para torná-lo visível novamente."
        : "O período de veiculação deste anúncio chegou ao fim. Explore itens semelhantes disponíveis na sua região.",
      icon: Clock,
      colorClass: "text-amber-500 bg-amber-500/10",
    },
    out_of_stock: {
      badge: "Esgotado",
      defaultTitle: "Vagas ou estoque indisponíveis",
      defaultDescription: "Todas as unidades ou vagas para esta saída já foram preenchidas no momento.",
      icon: PackageX,
      colorClass: "text-rose-500 bg-rose-500/10",
    },
    unauthorized_draft: {
      badge: "Acesso Restrito",
      defaultTitle: "Anúncio em modo rascunho",
      defaultDescription: "Este anúncio ainda não foi publicado pelo responsável e não está disponível publicamente.",
      icon: ShieldAlert,
      colorClass: "text-primary bg-primary/10",
    },
    server_error: {
      badge: "Instabilidade",
      defaultTitle: "Não foi possível carregar o anúncio",
      defaultDescription: "Ocorreu uma falha temporária ao sincronizar as informações com o banco de dados.",
      icon: AlertCircle,
      colorClass: "text-destructive bg-destructive/10",
    },
  };

  const current = configs[reason] || configs.not_found;
  const Icon = current.icon;

  return (
    <div className={cn("flex flex-col items-center justify-center p-6 text-center max-w-md mx-auto space-y-4 min-h-96", className)}>
      <div className={cn("size-12 rounded-lg flex items-center justify-center shadow-xs", current.colorClass)}>
        <Icon className="size-6" />
      </div>

      <div className="space-y-1">
        <Badge variant="outline" className="text-2xs font-semibold uppercase">
          {current.badge}
        </Badge>
        <h2 className="text-lg font-bold text-foreground">
          {title || current.defaultTitle}
        </h2>
        <p className="text-xs text-muted-foreground leading-relaxed">
          {description || current.defaultDescription}
        </p>
      </div>

      {/* Ações Específicas (F30: Nenhuma tela morta, todo vazio com ação) */}
      <div className="flex flex-col sm:flex-row items-center gap-2 pt-2 w-full justify-center">
        {reason === "server_error" && onRetry && (
          <Button
            type="button"
            className="w-full sm:w-auto h-10 rounded-md text-xs font-semibold gap-2 cursor-pointer shadow-xs focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:outline-none"
            onClick={onRetry} /* focus-visible:ring-2 */
          >
            <RefreshCw className="size-3.5" />
            <span>Tentar Novamente</span>
          </Button>
        )}

        {reason === "expired" && isOwner && onRenewListing && (
          <Button
            type="button"
            className="w-full sm:w-auto h-10 rounded-md text-xs font-bold gap-2 cursor-pointer shadow-xs focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:outline-none"
            onClick={onRenewListing} /* focus-visible:ring-2 */
          >
            <RefreshCw className="size-3.5" />
            <span>Renovar Anúncio Agora</span>
          </Button>
        )}

        {reason === "out_of_stock" && onJoinWaitlist && (
          <Button
            type="button"
            className="w-full sm:w-auto h-10 rounded-md text-xs font-semibold gap-2 cursor-pointer shadow-xs focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:outline-none"
            onClick={onJoinWaitlist} /* focus-visible:ring-2 */
          >
            <Bell className="size-3.5" />
            <span>Avisar Quando Disponível</span>
          </Button>
        )}

        {onExploreSimilar && (
          <Button
            type="button"
            variant="outline"
            className="w-full sm:w-auto h-10 rounded-md text-xs font-semibold gap-2 cursor-pointer focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:outline-none"
            onClick={onExploreSimilar} /* focus-visible:ring-2 */
          >
            <Search className="size-3.5" />
            <span>Explorar Similares</span>
          </Button>
        )}

        {onBack && (
          <Button
            type="button"
            variant="ghost"
            className="w-full sm:w-auto h-10 rounded-md text-xs font-medium gap-2 cursor-pointer text-muted-foreground focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:outline-none"
            onClick={onBack} /* focus-visible:ring-2 */
          >
            <ArrowLeft className="size-3.5" />
            <span>Voltar</span>
          </Button>
        )}
      </div>
    </div>
  );
}
