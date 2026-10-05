import { createFileRoute, Link } from "@tanstack/react-router";
import { Car, Star, ShieldCheck, Phone, MapPin, Bike, Truck, Navigation, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getCourierBySlug, listCourierReviews } from "@/services/mobility.functions";
import { formatDate } from "@/lib/datetime";

export const Route = createFileRoute("/_store/motorista/$slug")({
  head: ({ loaderData }: any) => ({
    meta: [
      {
        title: `${loaderData?.courier?.full_name || "Condutor Parceiro"} | Waesy Go`,
      },
    ],
  }),
  loader: async ({ params }) => {
    try {
      const courier = await getCourierBySlug({ data: { slug: params.slug } }).catch(() => null);
      const reviews = courier?.id
        ? await listCourierReviews({ data: { courierProfileId: courier.id } }).catch(() => [])
        : [];
      return { courier, reviews, slug: params.slug };
    } catch (err) {
      console.error("[loader:_store.motorista.$slug] Unhandled error:", err);
      return { courier: null, reviews: [], slug: null };
    }
  },
  component: DriverDirectPage,
});

function DriverDirectPage() {
  const { courier, reviews } = ((Route.useLoaderData?.() as any) || {});

  if (!courier) {
    return (
      <div className="py-24 text-center space-y-4 max-w-md mx-auto px-4">
        <Car className="size-10 text-muted-foreground/50 mx-auto" />
        <h1 className="text-base font-semibold text-foreground">Condutor não encontrado</h1>
        <p className="text-xs text-muted-foreground">O link do motorista é inválido ou foi desativado.</p>
        <Button asChild className="h-11 min-h-11 px-5 rounded-lg bg-foreground text-background focus-visible:ring-2 focus-visible:ring-primary">
          <Link to="/mobilidade">Voltar para Mobilidade</Link>
        </Button>
      </div>
    );
  }

  const phoneDigits = courier.phone ? courier.phone.replace(/\D/g, "") : "";
  const reviewsList = reviews || [];

  return (
    <div className="w-full max-w-xl mx-auto space-y-6 pb-20 px-4">
      {/* Profile Card */}
      <div className="rounded-lg bg-card border border-border/70 p-6 text-center space-y-5 shadow-2xs">
        <div className="size-24 rounded-lg mx-auto overflow-hidden bg-muted flex items-center justify-center font-bold text-2xl text-foreground border border-border/60">
          {courier.avatar_url ? (
            <img
              src={courier.avatar_url}
              alt={courier.full_name}
              className="size-full object-cover"
            />
          ) : (
            courier.full_name.charAt(0)
          )}
        </div>

        <div className="space-y-1">
          <div className="flex items-center justify-center gap-2 text-xs text-emerald-600 font-semibold">
            <ShieldCheck className="size-4" />
            <span>Condutor Verificado Waesy Go</span>
          </div>
          <h1 className="text-xl font-bold text-foreground tracking-tight">
            {courier.full_name}
          </h1>
          <p className="text-xs text-muted-foreground font-mono">
            {courier.vehicle_model || courier.vehicle_type} • Placa {courier.vehicle_plate || "Verificada"}
          </p>
        </div>

        {/* Foto do Veículo (se cadastrada) */}
        {courier.vehicle_photo_url && (
          <div className="rounded-lg overflow-hidden border border-border/60 max-h-48">
            <img
              src={courier.vehicle_photo_url}
              alt={`Veículo de ${courier.full_name}`}
              className="size-full object-cover"
            />
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 p-3 rounded-lg bg-muted/40 text-center">
          <div>
            <div className="flex items-center justify-center gap-1 font-bold text-sm text-foreground font-mono">
              <Star className="size-4 fill-amber-400 text-amber-400" />
              <span>{courier.rating.toFixed(1)}</span>
            </div>
            <span className="text-xs text-muted-foreground">Avaliação</span>
          </div>

          <div>
            <span className="font-bold text-foreground text-sm font-mono">{courier.total_rides}</span>
            <p className="text-xs text-muted-foreground">Viagens</p>
          </div>

          <div>
            <Badge
              variant={courier.is_available ? "default" : "secondary"}
              className="text-xs font-mono"
            >
              {courier.is_available ? "Disponível" : "Pausado"}
            </Badge>
            <p className="text-xs text-muted-foreground mt-1">Status</p>
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-2 pt-2">
          {phoneDigits && (
            <Button
              asChild
              className="w-full h-11 min-h-11 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-primary-foreground font-bold text-xs gap-2 focus-visible:ring-2 focus-visible:ring-primary"
            >
              <a
                href={`https://wa.me/55${phoneDigits}?text=Ol%C3%A1%20${encodeURIComponent(courier.full_name)},%20encontrei%20seu%20perfil%20no%20Waesy%20Go%20e%20gostaria%20de%20solicitar%20uma%20corrida/entrega!`}
                target="_blank"
                rel="noreferrer"
              >
                <Phone className="size-4" />
                <span>Chamar via WhatsApp</span>
              </a>
            </Button>
          )}

          <Button asChild variant="outline" className="w-full h-11 min-h-11 rounded-lg text-xs font-semibold focus-visible:ring-2 focus-visible:ring-primary">
            <Link to="/mobilidade">Solicitar pelo App com Cálculo de Rota</Link>
          </Button>
        </div>
      </div>

      {/* Avaliações Verificadas */}
      <div className="rounded-lg bg-card border border-border/70 p-5 space-y-4 shadow-2xs">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-foreground">Depoimentos de Passageiros</h2>
          <span className="text-xs text-muted-foreground font-mono">
            {reviewsList.length} avaliação{reviewsList.length === 1 ? "" : "ões"}
          </span>
        </div>

        {reviewsList.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-6">
            Nenhuma avaliação registrada ainda.
          </p>
        ) : (
          <div className="space-y-3">
            {reviewsList.map((rev: any) => (
              <div key={rev.id} className="p-4 rounded-lg bg-muted/20 border border-border/40 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        className={`size-4 ${
                          i < rev.rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"
                        }`}
                      />
                    ))}
                  </div>
                  <span className="text-xs text-muted-foreground font-mono">
                    {formatDate(rev.created_at)}
                  </span>
                </div>
                {rev.comment && <p className="text-foreground leading-relaxed">"{rev.comment}"</p>}
                {rev.tags && rev.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 pt-1">
                    {rev.tags.map((tag: string) => (
                      <Badge key={tag} variant="secondary" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
