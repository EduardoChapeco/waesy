import { Link } from "@tanstack/react-router";
import { Clock, Package, PackageCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface ClassifiedStatusBannersProps {
  isOfferExpired: boolean;
  isOfferLimitReached: boolean;
  status: string;
}

export function ClassifiedStatusBanners({
  isOfferExpired,
  isOfferLimitReached,
  status,
}: ClassifiedStatusBannersProps) {
  return (
    <>
      {isOfferExpired && (
        <div className="w-full max-w-7xl mx-auto px-4 pt-4 pb-2">
          <div className="rounded-lg p-4 bg-muted/60 border border-border flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Clock className="size-5 text-muted-foreground shrink-0" />
              <div>
                <span className="text-xs font-bold text-foreground">Oferta Expirada</span>
                <p className="text-xs text-muted-foreground">O prazo de validade deste anúncio encerrou.</p>
              </div>
            </div>
            <Button asChild variant="outline" size="sm" className="rounded-lg text-xs font-bold shrink-0 h-11 focus-visible:ring-2 focus-visible:ring-ring">
              <Link to="/classificados">Explorar Outros</Link>
            </Button>
          </div>
        </div>
      )}

      {isOfferLimitReached && (!isOfferExpired) && (
        <div className="w-full max-w-7xl mx-auto px-4 pt-4 pb-2">
          <div className="rounded-lg p-4 bg-amber-500/10 border border-amber-500/30 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Package className="size-5 text-amber-600 dark:text-amber-400 shrink-0" />
              <div>
                <span className="text-xs font-bold text-foreground">Oferta Esgotada</span>
                <p className="text-xs text-muted-foreground">O limite de pedidos disponibilizado pelo anunciante foi atingido.</p>
              </div>
            </div>
            <Button asChild variant="outline" size="sm" className="rounded-lg text-xs font-bold shrink-0 h-11 focus-visible:ring-2 focus-visible:ring-ring">
              <Link to="/classificados">Ver Similares</Link>
            </Button>
          </div>
        </div>
      )}

      {status === "sold" && (
        <div className="w-full max-w-7xl mx-auto px-4 pt-4 pb-2">
          <div className="rounded-lg p-4 bg-amber-500/10 border-2 border-amber-500/30 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left shadow-2xs">
            <div className="flex items-center gap-3">
              <div className="size-12 rounded-lg bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                <PackageCheck className="size-6" />
              </div>
              <div>
                <div className="flex items-center gap-2 justify-center sm:justify-start">
                  <h2 className="text-base font-bold text-foreground">Item já vendido</h2>
                  <Badge className="bg-amber-600 text-primary-foreground text-xs font-bold uppercase">Esgotado</Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  O anunciante já concluiu a negociação deste item. Veja abaixo outras oportunidades semelhantes.
                </p>
              </div>
            </div>
            <Button asChild variant="outline" size="sm" className="rounded-lg h-11 px-4 text-xs font-bold shrink-0 focus-visible:ring-2 focus-visible:ring-ring">
              <Link to="/classificados">Ver Outros Anúncios</Link>
            </Button>
          </div>
        </div>
      )}

      {status === "reserved" && (
        <div className="w-full max-w-7xl mx-auto px-4 pt-4 pb-2">
          <div className="rounded-lg p-4 bg-blue-500/10 border border-blue-500/30 flex items-center gap-3 text-blue-700 dark:text-blue-300">
            <Clock className="size-5 shrink-0" />
            <div className="text-xs">
              <strong className="font-bold">Item Reservado:</strong> Uma proposta foi aceita e a negociação está em processo de conclusão pelo anunciante.
            </div>
          </div>
        </div>
      )}
    </>
  );
}
