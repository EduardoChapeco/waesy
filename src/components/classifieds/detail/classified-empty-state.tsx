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
    <div className="mx-auto max-w-5xl px-4 py-12 space-y-8 animate-in fade-in duration-200">
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
