import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import {
  Car,
  MapPin,
  CalendarBlank,
  Users,
  SuitcaseRolling,
  Gear,
  Snowflake,
  ShieldCheck,
  CreditCard,
  ArrowLeft,
  CheckCircle,
  Building2,
  Phone,
  Clock,
} from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatMoney } from "@/lib/money";
import { toast } from "sonner";
import { publicTourismAutoServiceSearchFn } from "@/services/infotravel";
import { createCarRentalBooking } from "@/services/tourism.functions";
import { type CarRentalOfferItem } from "@/components/tourism/CarRentalOfferCard";

export const Route = createFileRoute("/_store/turismo/aluguel-carros/$id")({
  head: () => ({
    meta: [
      { title: "Locação de Veículo (3 Diárias) — Turismo Waesy" },
      { name: "description", content: "Reserve seu carro de locadora com km livre e proteção inclusa." },
    ],
  }),
  loader: async ({ params }) => {
    try {
      const res = await publicTourismAutoServiceSearchFn({
        data: {
          service: "cars",
          destination: "Aeroporto",
        },
      });
      const car = res?.results?.find((r) => r.id === params.id) || null;
      return { car, carId: params.id };
    } catch {
      return { car: null, carId: params.id };
    }
  },
  component: CarRentalDetailPage,
});

function CarRentalDetailPage() {
  const { car, carId } = Route.useLoaderData();
  const navigate = useNavigate();

  const [days, setDays] = useState(3);
  const [driverName, setDriverName] = useState("");
  const [driverCpf, setDriverCpf] = useState("");
  const [driverPhone, setDriverPhone] = useState("");
  const [paymentPreference, setPaymentPreference] = useState<"pay_at_pickup" | "pay_now">("pay_at_pickup");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const dailyRateBrl = car ? Math.round((car.priceCents || 13900) / 100 / 3) : 139;
  const totalBrl = dailyRateBrl * days;

  const handleBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!driverName.trim() || !driverCpf.trim()) {
      toast.error("Informe o nome do condutor e CPF.");
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await createCarRentalBooking({
        data: {
          carId,
          carTitle: car?.title || "Veículo de Locadora com Proteção",
          days,
          totalPriceCents: totalBrl * 100,
          driverName: driverName.trim(),
          driverCpf: driverCpf.trim(),
          driverPhone: driverPhone.trim(),
          paymentPreference,
        },
      });
      toast.success(res.message || `Reserva de ${days} diárias confirmada com sucesso!`);
      navigate({ to: "/conta/pedidos" });
    } catch (err: any) {
      toast.error(err?.message || "Erro ao processar a reserva de veículo.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full min-h-screen bg-background pb-20">
      <div className="mx-auto max-w-4xl px-4 py-6 space-y-6">
        {/* Top Breadcrumb & Voltar */}
        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => navigate({ to: "/turismo" })}
            className="h-11 min-h-11 px-4 rounded-xl text-xs font-semibold gap-2 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <ArrowLeft className="size-4" />
            <span>Voltar para Turismo</span>
          </Button>
          <span className="text-xs text-muted-foreground font-medium">/ Locação de Veículos / {car?.title || "Detalhes do Veículo"}</span>
        </div>

        {/* Hero Card do Veículo */}
        <div className="rounded-2xl border border-border/70 bg-card p-6 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Badge variant="outline" className="text-3xs uppercase font-mono tracking-wider text-primary border-primary/30 bg-primary/10">
                  {car?.badge || "Locadora Parceira"}
                </Badge>
                <span className="text-xs text-muted-foreground font-semibold">Km Livre • Seguro Incluso</span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-foreground tracking-tight">
                {car?.title || "Veículo Econômico 1.0 (Com Ar)"}
              </h1>
              <p className="text-xs text-muted-foreground">
                {car?.subtitle || "Chevrolet Onix, Hyundai HB20 ou similar"}
              </p>
            </div>

            <div className="text-right">
              <span className="text-3xs text-muted-foreground block uppercase font-bold tracking-wider">Valor da diária</span>
              <span className="text-2xl font-black text-foreground font-mono">{formatMoney(dailyRateBrl * 100)}</span>
              <span className="text-xs text-muted-foreground block">/ dia</span>
            </div>
          </div>

          {/* Atributos do Carro */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 py-4 border-y border-border/60">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Users className="size-4 text-primary" />
              <span>5 Passageiros</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <SuitcaseRolling className="size-4 text-primary" />
              <span>2 Malas grandes</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Gear className="size-4 text-primary" />
              <span>Câmbio Manual</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Snowflake className="size-4 text-primary" />
              <span>Ar-condicionado</span>
            </div>
          </div>

          {/* Seletor de Período & Reserva */}
          <form onSubmit={handleBooking} className="space-y-4 pt-2">
            <h2 className="text-sm font-bold text-foreground">Configurar Período da Locação</h2>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <Label className="text-xs font-bold text-muted-foreground block mb-1">Duração da Reserva</Label>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {[1, 3, 5, 7].map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setDays(d)}
                      className={`h-11 min-h-11 px-3 rounded-lg border text-xs font-bold transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                        days === d
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-muted text-muted-foreground border-transparent hover:bg-muted/80"
                      }`}
                    >
                      {d} {d === 1 ? "dia" : "dias"}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <Label className="text-xs font-bold text-muted-foreground block mb-1">Forma de Liquidação</Label>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setPaymentPreference("pay_at_pickup")}
                    className={`h-11 min-h-11 px-3 rounded-lg border text-xs font-bold transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                      paymentPreference === "pay_at_pickup"
                        ? "bg-foreground text-background border-foreground font-bold"
                        : "bg-muted text-muted-foreground border-transparent hover:bg-muted/80"
                    }`}
                  >
                    Pagar na Retirada
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentPreference("pay_now")}
                    className={`h-11 min-h-11 px-3 rounded-lg border text-xs font-bold transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                      paymentPreference === "pay_now"
                        ? "bg-foreground text-background border-foreground font-bold"
                        : "bg-muted text-muted-foreground border-transparent hover:bg-muted/80"
                    }`}
                  >
                    Pagar Agora (-5%)
                  </button>
                </div>
              </div>

              <div>
                <Label className="text-xs font-bold text-muted-foreground block mb-1">Total para {days} {days === 1 ? "diária" : "diárias"}</Label>
                <div className="h-11 min-h-11 px-3 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-between">
                  <span className="text-xs text-primary font-bold">Total Final:</span>
                  <span className="text-lg font-black text-primary font-mono">{formatMoney(totalBrl * 100)}</span>
                </div>
              </div>
            </div>

            {/* Dados do Condutor */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
              <div>
                <Label className="text-xs font-bold text-muted-foreground block mb-1">Nome Completo do Condutor *</Label>
                <Input
                  value={driverName}
                  onChange={(e) => setDriverName(e.target.value)}
                  placeholder="Ex: João da Silva"
                  required
                  className="h-11 min-h-11 text-xs rounded-lg"
                />
              </div>

              <div>
                <Label className="text-xs font-bold text-muted-foreground block mb-1">CPF do Condutor *</Label>
                <Input
                  value={driverCpf}
                  onChange={(e) => setDriverCpf(e.target.value)}
                  placeholder="000.000.000-00"
                  required
                  className="h-11 min-h-11 text-xs rounded-lg"
                />
              </div>

              <div>
                <Label className="text-xs font-bold text-muted-foreground block mb-1">WhatsApp de Contato</Label>
                <Input
                  value={driverPhone}
                  onChange={(e) => setDriverPhone(e.target.value)}
                  placeholder="(00) 00000-0000"
                  className="h-11 min-h-11 text-xs rounded-lg"
                />
              </div>
            </div>

            {/* Vantagens Inclusas */}
            <div className="p-3 rounded-lg bg-muted/40 border border-border/60 flex items-center justify-between flex-wrap gap-2 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5 text-foreground font-semibold">
                <CheckCircle className="size-4 text-emerald-500" />
                Cancelamento gratuito até 24h antes da retirada
              </span>
              <span className="flex items-center gap-1.5 text-foreground font-semibold">
                <ShieldCheck className="size-4 text-primary" />
                Proteção básica contra colisão e roubo
              </span>
            </div>

            {/* CTA Final */}
            <div className="pt-2 flex justify-end">
              <Button
                type="submit"
                disabled={isSubmitting}
                className="h-11 min-h-11 px-8 rounded-lg text-xs font-bold gap-2 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <CreditCard className="size-4" />
                <span>{isSubmitting ? "Processando..." : `Confirmar Reserva • ${formatMoney(totalBrl * 100)}`}</span>
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
