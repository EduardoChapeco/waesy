import * as React from "react";
import { useState } from "react";
import {
  Ticket,
  Plane,
  Hotel,
  Calendar,
  Users,
  Download,
  MessageCircle,
  FileText,
  Clock,
  CheckCircle2,
  AlertCircle,
  QrCode,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export interface TravelVoucherItem {
  id: string;
  locatorCode: string; // ex: "WAE-78945"
  destination: string;
  hotelName: string;
  checkInDate: string;
  checkOutDate: string;
  flightRouteText?: string; // ex: "GRU ➔ MCZ (GOL G3 1542)"
  travelersText: string;
  status: "confirmed" | "pending" | "completed" | "cancelled";
  statusText: string;
  voucherPdfUrl?: string;
}

export interface CustomerTravelPortalProps {
  headline?: string;
  subheadline?: string;
  vouchers?: TravelVoucherItem[];
  clientName?: string;
  whatsappPhone?: string;
  onExploreMore?: () => void;
}

const DEFAULT_VOUCHERS: TravelVoucherItem[] = [
  {
    id: "vouch_1",
    locatorCode: "WAE-89214",
    destination: "Maceió, Alagoas",
    hotelName: "Rede Andrade Porto Mar (Quarto Standard Casal)",
    checkInDate: "28/11/2026",
    checkOutDate: "05/12/2026",
    flightRouteText: "GRU ➔ MCZ (Direto • Voo GOL 1542)",
    travelersText: "2 Adultos (Eduardo Ramos, Convidado)",
    status: "confirmed",
    statusText: "Confirmado & Emitido",
  },
  {
    id: "vouch_2",
    locatorCode: "WAE-67102",
    destination: "Rio de Janeiro, RJ",
    hotelName: "Windsor Leme Hotel (Suíte Vista Mar)",
    checkInDate: "11/11/2026",
    checkOutDate: "15/11/2026",
    flightRouteText: "XAP ➔ SDU (Conexão VCP • Azul 4210)",
    travelersText: "1 Adulto (Eduardo Ramos)",
    status: "completed",
    statusText: "Viagem Concluída",
  },
];

export const CustomerTravelPortal: React.FC<CustomerTravelPortalProps> = ({
  headline = "Minhas Viagens & Vouchers",
  subheadline = "Acesse seus comprovantes, passagens aéreas e detalhes da sua reserva",
  vouchers = DEFAULT_VOUCHERS,
  clientName = "Viajante",
  whatsappPhone = "",
  onExploreMore,
}) => {
  const [activeFilter, setActiveFilter] = useState<"all" | "confirmed" | "completed">("all");

  const filteredVouchers = vouchers.filter((v) => {
    if (activeFilter === "all") return true;
    return v.status === activeFilter;
  });

  const handleDownload = (voucher: TravelVoucherItem) => {
    toast.success(`Baixando voucher ${voucher.locatorCode}...`);
    if (voucher.voucherPdfUrl) {
      window.open(voucher.voucherPdfUrl, "_blank");
    } else {
      setTimeout(() => {
        toast.info("Voucher gerado com sucesso em formato digital.");
      }, 800);
    }
  };

  const handleSupport = (voucher: TravelVoucherItem) => {
    const cleanPhone = (whatsappPhone || "").replace(/\D/g, "");
    if (cleanPhone) {
      const msg = encodeURIComponent(
        `Olá! Preciso de suporte com a minha viagem *${voucher.destination}* (Localizador: *${voucher.locatorCode}*).`
      );
      window.open(`https://wa.me/${cleanPhone}?text=${msg}`, "_blank");
    } else {
      toast.info("Conectando ao suporte da agência...");
    }
  };

  return (
    <section className="w-full py-8 sm:py-12 bg-background">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 space-y-6">
        {/* Cabeçalho */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/60 pb-6">
          <div className="space-y-1">
            <h2 className="text-xl sm:text-2xl font-black text-foreground tracking-tight">
              {headline}
            </h2>
            <p className="text-xs text-muted-foreground">{subheadline}</p>
          </div>

          {/* Filtros por Status */}
          <div className="flex items-center gap-1.5 bg-muted/40 p-1 rounded-xl border border-border/60 self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setActiveFilter("all")}
              className={cn(
                "h-8 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer",
                activeFilter === "all"
                  ? "bg-background text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Todas
            </button>
            <button
              type="button"
              onClick={() => setActiveFilter("confirmed")}
              className={cn(
                "h-8 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer",
                activeFilter === "confirmed"
                  ? "bg-background text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Próximas
            </button>
            <button
              type="button"
              onClick={() => setActiveFilter("completed")}
              className={cn(
                "h-8 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer",
                activeFilter === "completed"
                  ? "bg-background text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Concluídas
            </button>
          </div>
        </div>

        {/* Lista de Vouchers */}
        {filteredVouchers.length > 0 ? (
          <div className="space-y-4">
            {filteredVouchers.map((voucher) => {
              const isConfirmed = voucher.status === "confirmed";

              return (
                <div
                  key={voucher.id}
                  className="rounded-2xl border border-border/80 bg-card overflow-hidden shadow-xs hover:shadow-md transition-all flex flex-col md:flex-row"
                >
                  {/* Bloco Esquerdo: Detalhes do Bilhete / Voucher */}
                  <div className="p-5 flex-1 space-y-4">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2">
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-xs font-bold px-2.5 py-0.5 rounded-full border",
                            isConfirmed
                              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                              : "bg-muted text-muted-foreground border-border"
                          )}
                        >
                          <CheckCircle2 className="size-3 mr-1" />
                          <span>{voucher.statusText}</span>
                        </Badge>
                        <span className="text-xs font-mono font-bold text-muted-foreground">
                          Localizador: <strong className="text-foreground">{voucher.locatorCode}</strong>
                        </span>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <h3 className="text-base sm:text-lg font-black text-foreground">
                        {voucher.destination}
                      </h3>
                      <p className="text-xs font-medium text-muted-foreground">
                        {voucher.hotelName}
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 text-xs">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Calendar className="size-4 text-primary shrink-0" />
                        <span>
                          Check-in: <strong>{voucher.checkInDate}</strong> • Check-out: <strong>{voucher.checkOutDate}</strong>
                        </span>
                      </div>

                      {voucher.flightRouteText && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Plane className="size-4 text-primary shrink-0" />
                          <span className="truncate">{voucher.flightRouteText}</span>
                        </div>
                      )}

                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Users className="size-4 text-primary shrink-0" />
                        <span className="truncate">{voucher.travelersText}</span>
                      </div>
                    </div>
                  </div>

                  {/* Bloco Direito: Ações & Voucher Download (Card Lateral com Linha Pontilhada) */}
                  <div className="md:w-64 bg-muted/20 border-t md:border-t-0 md:border-l border-dashed border-border/80 p-5 flex flex-col justify-between gap-3">
                    <div className="space-y-1 text-center md:text-left">
                      <span className="text-[10px] font-mono uppercase text-muted-foreground block">
                        Acesso ao Bilhete
                      </span>
                      <span className="text-xs font-bold text-foreground block">
                        Voucher Digital
                      </span>
                    </div>

                    <div className="space-y-2">
                      <Button
                        type="button"
                        onClick={() => handleDownload(voucher)}
                        className="w-full h-11 min-h-11 rounded-xl text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/90 transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary gap-1.5 shadow-xs"
                      >
                        <Download className="size-4" />
                        <span>Baixar Voucher</span>
                      </Button>

                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => handleSupport(voucher)}
                        className="w-full h-11 min-h-11 rounded-xl text-xs font-bold border-border/80 hover:bg-muted/60 transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary gap-1.5"
                      >
                        <MessageCircle className="size-4 text-emerald-500" />
                        <span>Falar com Agente</span>
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-8 sm:p-12 text-center rounded-2xl border border-dashed border-border/80 bg-card space-y-4">
            <div className="size-14 rounded-2xl bg-muted/60 text-muted-foreground flex items-center justify-center mx-auto border border-border/60">
              <Ticket className="size-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-foreground">Nenhuma viagem nesta categoria</h3>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                Você não possui viagens com este status no momento. Explore nossos pacotes e agende seu próximo destino!
              </p>
            </div>
            <div className="pt-2">
              <Button
                type="button"
                onClick={onExploreMore}
                className="h-11 min-h-11 px-5 rounded-xl text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer shadow-xs"
              >
                Explorar Pacotes Disponíveis
              </Button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
};
