import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Navigation,
  MapPin,
  CheckCircle2,
  Clock,
  Phone,
  AlertCircle,
  FileText,
  LocateFixed,
  Loader2,
  Map,
  List,
} from "lucide-react";
import { MapLibreCanvas } from "@/components/mobility/maplibre-canvas";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  listTodaySellerRouteWithStopsFn,
  recordFieldVisitCheckInFn,
  RouteStopDTO,
} from "@/services/b2b-portfolio-routes.functions";

export function FieldRoutesView() {
  const queryClient = useQueryClient();
  const [selectedStopForCheckIn, setSelectedStopForCheckIn] = useState<RouteStopDTO | null>(null);
  const [checkInNotes, setCheckInNotes] = useState("");
  const [isLocating, setIsLocating] = useState(false);
  const [viewMode, setViewMode] = useState<"lista" | "mapa">("lista");

  const { data, isLoading } = useQuery({
    queryKey: ["today-seller-route-stops"],
    queryFn: () => listTodaySellerRouteWithStopsFn(),
  });

  const route = data?.route;
  const stops = data?.stops || [];

  const handlePerformCheckIn = () => {
    if (!selectedStopForCheckIn) return;

    if (!navigator.geolocation) {
      toast.error("Geolocalização não suportada neste navegador.");
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const res = await recordFieldVisitCheckInFn({
            data: {
              customerId: selectedStopForCheckIn.customerId,
              routeStopId: selectedStopForCheckIn.stopId,
              lat: pos.coords.latitude,
              lng: pos.coords.longitude,
              accuracyMeters: pos.coords.accuracy,
              notes: checkInNotes.trim() || undefined,
            },
          });

          if (res.geofenceStatus === "within_geofence") {
            toast.success("Check-in GPS registrado com sucesso (Dentro do Raio de 200m)!");
          } else {
            toast.warning("Check-in registrado, mas o GPS indicou posição fora do raio do cliente.");
          }

          setSelectedStopForCheckIn(null);
          setCheckInNotes("");
          queryClient.invalidateQueries({ queryKey: ["today-seller-route-stops"] });
        } catch (err: any) {
          toast.error(err?.message || "Erro ao registrar check-in.");
        } finally {
          setIsLocating(false);
        }
      },
      (err) => {
        setIsLocating(false);
        toast.error(`Falha ao obter coordenadas GPS: ${err.message}`);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  };

  return (
    <div className="space-y-6">
      {/* ── 1. Header da Rota do Dia ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/60 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Badge variant="default" className="gap-2 px-3 py-1 text-xs font-bold uppercase">
              <Navigation className="size-3.5" />
              Roteirização de Campo
            </Badge>
            <Badge variant="outline" className="gap-1 text-xs font-semibold text-primary">
              <MapPin className="size-3.5" />
              Geofence Haversine
            </Badge>
          </div>
          <h2 className="text-lg font-bold tracking-tight text-foreground mt-1">
            {route ? route.name : "Minha Rota de Hoje"}
          </h2>
          <p className="text-xs text-muted-foreground">
            Sequência otimizada de paradas com auditoria presencial por GPS.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant={viewMode === "lista" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("lista")}
            className="h-11 min-h-11 gap-2 text-xs font-semibold px-3"
          >
            <List className="size-4" />
            <span>Lista</span>
          </Button>
          <Button
            type="button"
            variant={viewMode === "mapa" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("mapa")}
            className="h-11 min-h-11 gap-2 text-xs font-semibold px-3"
          >
            <Map className="size-4" />
            <span>Mapa Tático</span>
          </Button>
        </div>
      </div>

      {viewMode === "mapa" && (
        <div className="h-96 w-full rounded-xl overflow-hidden border border-border">
          <MapLibreCanvas
            markers={stops.map((s, idx) => ({
              id: s.stopId,
              lat: s.lat || -27.1004 + idx * 0.005,
              lng: s.lng || -52.6152 + idx * 0.005,
              title: `#${s.stopOrder} ${s.customerName}`,
              category: s.status === "completed" ? "Visitado" : "Pendente",
            }))}
            zoom={13}
            className="h-full w-full"
          />
        </div>
      )}

      {/* ── 2. Lista Sequenciada de Paradas da Rota ── */}
      {stops.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-8 text-center space-y-3">
          <MapPin className="size-8 text-muted-foreground mx-auto" />
          <h3 className="text-sm font-bold text-foreground">Nenhuma rota ativa para hoje</h3>
          <p className="text-xs text-muted-foreground">
            Cadastre clientes na sua carteira rotativa para gerar automaticamente as rotas de atendimento presencial.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {stops.map((stop) => {
            const isCompleted = stop.status === "completed";
            return (
              <div
                key={stop.stopId}
                className="rounded-xl border border-border bg-card p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="flex items-start gap-3 min-w-0">
                  <span
                    className={`flex size-11 min-h-11 min-w-11 items-center justify-center rounded-xl font-mono text-sm font-bold shrink-0 ${
                      isCompleted
                        ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/30"
                        : "bg-primary/10 text-primary border border-primary/20"
                    }`}
                  >
                    #{stop.stopOrder}
                  </span>

                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-bold text-foreground truncate">
                        {stop.customerName}
                      </h4>
                      <Badge
                        variant={isCompleted ? "default" : "secondary"}
                        className="text-xs"
                      >
                        {isCompleted ? "Concluída" : "Pendente"}
                      </Badge>
                    </div>

                    <p className="text-xs text-muted-foreground flex items-center gap-2">
                      <Clock className="size-3.5" />
                      Horário sugerido: {stop.plannedTime || "Em horário comercial"}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {!isCompleted ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedStopForCheckIn(stop)}
                      className="h-11 min-h-11 px-4 text-xs font-bold gap-2 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <LocateFixed className="size-4" />
                      <span>Check-in GPS</span>
                    </Button>
                  ) : (
                    <span className="inline-flex items-center gap-2 text-xs text-emerald-600 font-semibold px-3 py-1 bg-emerald-500/10 rounded-lg">
                      <CheckCircle2 className="size-4" />
                      Visita Confirmada
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── 3. Diálogo de Check-in Presencial ── */}
      <Dialog
        open={!!selectedStopForCheckIn}
        onOpenChange={(open) => !open && setSelectedStopForCheckIn(null)}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-foreground">
              Confirmar Visita Presencial
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              O sistema registrará suas coordenadas GPS e validará a proximidade física com o cliente.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="rounded-lg bg-muted/40 p-3 text-xs space-y-1">
              <span className="font-bold text-foreground block">
                Cliente: {selectedStopForCheckIn?.customerName}
              </span>
              <span className="text-muted-foreground">
                Parada #{selectedStopForCheckIn?.stopOrder} da rota de hoje
              </span>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground">
                Observações da Visita / Pedido Tirado
              </label>
              <Textarea
                value={checkInNotes}
                onChange={(e) => setCheckInNotes(e.target.value)}
                placeholder="Ex: Cliente solicitou 2 caixas extras para entrega na sexta-feira..."
                rows={3}
                className="text-xs"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                disabled={isLocating}
                onClick={() => setSelectedStopForCheckIn(null)}
                className="h-11 min-h-11 px-4 text-xs font-semibold cursor-pointer"
              >
                Cancelar
              </Button>
              <Button
                type="button"
                disabled={isLocating}
                onClick={handlePerformCheckIn}
                className="h-11 min-h-11 px-4 text-xs font-bold gap-2 cursor-pointer"
              >
                {isLocating ? (
                  <>
                    <Loader2 className="size-4 animate-spin motion-reduce:animate-none" />
                    <span>Validando GPS...</span>
                  </>
                ) : (
                  <>
                    <LocateFixed className="size-4" />
                    <span>Confirmar Check-in</span>
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
