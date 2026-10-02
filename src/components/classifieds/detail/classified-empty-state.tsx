import { Link } from "@tanstack/react-router";
import { Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NativeBackButton } from "@/components/ui/native-back-button";
import { ClassifiedSimilarAdsGrid } from "./classified-similar-ads-grid";

interface ClassifiedEmptyStateProps {
  status: string;
  similarAds: any[];
}

export function ClassifiedEmptyState({ status, similarAds }: ClassifiedEmptyStateProps) {
  const isInvalidId = status === "invalid_id";

  return (
    <div className="mx-auto max-w-5xl px-4 py-12 space-y-8 animate-in fade-in duration-200 motion-reduce:animate-none motion-reduce:transition-none">
      <div className="max-w-md mx-auto text-center space-y-4 px-4">
        <div className="inline-flex size-16 items-center justify-center rounded-lg bg-muted text-muted-foreground mb-1">
          <Tag className="size-8 text-primary" />
        </div>
        <h1 className="text-xl sm:text-2xl font-bold text-foreground">
          {isInvalidId ? "Identificador Inválido" : "Este anúncio não existe ou foi removido"}
        </h1>
        <p className="text-xs text-muted-foreground leading-relaxed">
          {isInvalidId
            ? "O endereço deste anúncio contém um código inválido ou corrompido."
            : "O anúncio que você procura foi finalizado pelo autor, expirou ou o endereço foi digitado incorretamente."}
        </p>
        <div className="pt-2 flex items-center justify-center gap-3">
          <NativeBackButton fallbackHref="/classificados" />
          <Button asChild variant="default" className="rounded-lg text-xs h-11 px-6 font-bold shadow-xs focus-visible:ring-2 focus-visible:ring-ring">
            <Link to="/classificados">Explorar Todos os Anúncios</Link>
          </Button>
        </div>
      </div>

      {similarAds && similarAds.length > 0 && (
        <div className="pt-8 border-t border-border">
          <ClassifiedSimilarAdsGrid
            similarAds={similarAds}
            title="Anúncios Semelhantes para Você"
            subtitle="Confira outras oportunidades ativas na comunidade"
          />
        </div>
      )}
    </div>
  );
}

export interface ClassifiedDetailErrorStateProps {
  error?: Error | null;
  errorMessage?: string;
}

export function ClassifiedDetailErrorState({ error, errorMessage }: ClassifiedDetailErrorStateProps) {
  const displayMessage = errorMessage || error?.message || "Ocorreu um erro ao carregar o anúncio.";

  return (
    <div className="mx-auto max-w-5xl px-4 py-12 space-y-8 animate-in fade-in duration-200 motion-reduce:animate-none motion-reduce:transition-none">
      <div className="max-w-md mx-auto text-center space-y-4 px-4">
        <div className="inline-flex size-16 items-center justify-center rounded-lg bg-destructive/10 text-destructive mb-1">
          <Tag className="size-8 text-destructive" />
        </div>
        <h1 className="text-xl sm:text-2xl font-bold text-foreground">
          Falha ao Carregar Anúncio
        </h1>
        <p className="text-xs text-muted-foreground leading-relaxed">
          {displayMessage}
        </p>
        <div className="pt-2 flex items-center justify-center gap-3">
          <NativeBackButton fallbackHref="/classificados" />
          <Button asChild variant="secondary" className="rounded-lg text-xs h-11 px-6 font-bold shadow-xs focus-visible:ring-2 focus-visible:ring-ring">
            <Link to="/classificados">Voltar aos Classificados</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
