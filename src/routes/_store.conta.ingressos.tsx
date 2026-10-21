import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import {
  Ticket,
  Calendar,
  MapPin,
  QrCode,
  CheckCircle2,
  Clock,
  XCircle,
  ChevronRight,
  Share2,
  Search,
  ArrowRight,
  Sparkles,
  Info,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { NativeMobileHeader } from "@/components/navigation";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/empty-state";
import { formatMoney } from "@/lib/money";
import { formatDate } from "@/lib/datetime";
import { generateQrCodeDataUri } from "@/lib/qr-code";
import { listCustomerEventTickets, type CustomerEventTicketDTO } from "@/services/events.functions";
import { TicketDetailModal } from "@/components/eventos/ticket-detail-modal";

// ─── Constants ────────────────────────────────────────────────────────────────

const FILTER_CHIPS = [
  { id: "todos", label: "Todos" },
  { id: "valid", label: "Válidos", statuses: ["paid", "processing", "completed", "valid"] },
  { id: "used", label: "Utilizados", isUsed: true },
  { id: "cancelled", label: "Cancelados", statuses: ["cancelled", "returned", "revoked"] },
];

// ─── Route ────────────────────────────────────────────────────────────────────

export const Route = createFileRoute("/_store/conta/ingressos")({
  head: () => ({ meta: [{ title: "Meus Ingressos | Waesy" }] }),
  loader: async () => {
    try {
      return (await listCustomerEventTickets().catch(() => [])) || [];
    } catch (err) {
      console.error("[loader:_store.conta.ingressos] Unhandled error:", err);
      return [] as CustomerEventTicketDTO[];
    }
  },
  errorComponent: CustomerTicketsErrorComponent,
  component: CustomerTicketsPage,
});

function CustomerTicketsErrorComponent({ error, reset }: { error: any; reset: () => void }) {
  return (
    <div className="mx-auto max-w-2xl px-4 py-20 text-center space-y-4">
      <div className="inline-flex size-16 items-center justify-center rounded-lg bg-destructive/10 text-destructive mb-2">
        <Ticket className="size-8" />
      </div>
      <h2 className="text-2xl font-bold text-foreground">Instabilidade ao carregar ingressos</h2>
      <p className="text-sm text-muted-foreground max-w-md mx-auto">
        {error?.message || "Não foi possível carregar seus ingressos no momento."}
      </p>
      <div className="flex items-center justify-center gap-3">
        <Button onClick={reset} size="default" className="h-11 min-h-11 px-6 rounded-lg font-bold focus-visible:ring-2 focus-visible:ring-primary">
          Tentar Novamente
        </Button>
        <Button asChild variant="outline" size="default" className="h-11 min-h-11 px-6 rounded-lg font-bold focus-visible:ring-2 focus-visible:ring-primary">
          <Link to="/conta">Voltar para Conta</Link>
        </Button>
      </div>
    </div>
  );
}

// ─── Offline Vector QR Display Component ──────────────────────────────────────

function OfflineQrDisplay({ code }: { code: string }) {
  const qrDataUri = useMemo(() => generateQrCodeDataUri(code), [code]);

  return (
    <div className="inline-flex flex-col items-center p-3 bg-card border border-border/40 rounded-lg shadow-xs">
      <img
        src={qrDataUri}
        alt={`QR Code para validação do ingresso ${code}`}
        className="size-28 sm:size-32 object-contain rounded-lg"
        loading="lazy"
      />
      <p className="text-center text-xs font-mono font-bold text-foreground mt-2 tracking-widest uppercase">
        {code}
      </p>
    </div>
  );
}

// ─── Ticket Card ──────────────────────────────────────────────────────────────

function TicketCard({
  ticket,
  onOpenDetail,
}: {
  ticket: CustomerEventTicketDTO;
  onOpenDetail: (ticket: CustomerEventTicketDTO) => void;
}) {
  const [showQr, setShowQr] = useState(false);
  const isValid = !ticket.isUsed && ["paid", "processing", "completed", "valid"].includes(ticket.status);
  const isCancelled = ["cancelled", "returned", "revoked"].includes(ticket.status);

  const handleShare = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.share({
        title: ticket.eventTitle,
        text: `Meu ingresso: ${ticket.eventTitle} — Código: ${ticket.humanCode || ticket.accessCode}`,
        url: window.location.href,
      });
    } catch {
      navigator.clipboard.writeText(ticket.humanCode || ticket.accessCode);
    }
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onOpenDetail(ticket)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpenDetail(ticket);
        }
      }}
      className={`bg-card border rounded-lg overflow-hidden transition-colors duration-200 cursor-pointer hover:border-primary/40 group select-none focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring ${
        ticket.isUsed
          ? "border-border/30 opacity-75"
          : isCancelled
          ? "border-destructive/20 opacity-70"
          : "border-border/60 hover:shadow-xs"
      }`}
    >
      {/* Capa do evento se houver */}
      {ticket.coverUrl && (
        <div className="aspect-video max-h-36 overflow-hidden relative">
          <img
            src={ticket.coverUrl}
            alt={ticket.eventTitle}
            className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-300"
          />
        </div>
      )}

      {/* Header */}
      <div className="px-4 py-4 border-b border-border/30 flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0 flex-1">
          <div
            className={`size-10 rounded-lg flex items-center justify-center shrink-0 ${
              ticket.isUsed
                ? "bg-muted/50 text-muted-foreground/50"
                : isValid
                ? "bg-primary/10 text-primary border border-primary/20"
                : "bg-muted/40 text-muted-foreground/60"
            }`}
          >
            <Ticket className="size-5" strokeWidth={1.75} />
          </div>
          <div className="min-w-0 flex-1">
            <h4 className="text-sm font-bold text-foreground leading-snug line-clamp-2 group-hover:text-primary transition-colors">
              {ticket.eventTitle}
            </h4>
            {ticket.lotName && (
              <p className="text-xs text-muted-foreground mt-1">{ticket.lotName}</p>
            )}
          </div>
        </div>

        {/* Status badge */}
        {ticket.isUsed ? (
          <Badge variant="secondary" className="text-xs shrink-0 rounded-md px-2 h-6">
            <CheckCircle2 className="size-3 mr-1" />
            Utilizado
          </Badge>
        ) : isCancelled ? (
          <Badge variant="destructive" className="text-xs shrink-0 rounded-md px-2 h-6">
            <XCircle className="size-3 mr-1" />
            Cancelado
          </Badge>
        ) : isValid ? (
          <Badge variant="default" className="text-xs shrink-0 rounded-md px-2 h-6">
            <CheckCircle2 className="size-3 mr-1" />
            Válido
          </Badge>
        ) : (
          <Badge variant="secondary" className="text-xs shrink-0 rounded-md px-2 h-6">
            <Clock className="size-3 mr-1" />
            Pendente
          </Badge>
        )}
      </div>

      {/* Dados do evento */}
      <div className="px-4 py-3 border-b border-border/30 space-y-2">
        {ticket.eventDate && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Calendar className="size-4 shrink-0 text-primary" strokeWidth={1.75} />
            <span>{formatDate(ticket.eventDate)}</span>
          </div>
        )}
        {ticket.eventLocation && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <MapPin className="size-4 shrink-0 text-primary" strokeWidth={1.75} />
            <span className="truncate">{ticket.eventLocation}</span>
          </div>
        )}
        <div className="flex items-center justify-between pt-1">
          <span className="text-xs text-muted-foreground font-mono">
            Código: {ticket.humanCode || ticket.accessCode}
          </span>
          <span className="text-sm font-bold text-foreground font-mono">
            {ticket.priceCents === 0 ? "Grátis" : formatMoney(ticket.priceCents)}
          </span>
        </div>
      </div>

      {/* QR Section expandível */}
      {isValid && (
        <div className="px-4 py-3 border-b border-border/30">
          <button
            type="button"
            id={`qr-toggle-${ticket.id}`}
            onClick={(e) => {
              e.stopPropagation();
              setShowQr(!showQr);
            }}
            className="w-full flex items-center justify-between text-xs font-semibold text-foreground cursor-pointer py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-lg"
          >
            <div className="flex items-center gap-2">
              <QrCode className="size-4 text-primary" strokeWidth={1.75} />
              <span>QR Code de Entrada</span>
            </div>
            <span className="text-muted-foreground text-xs">{showQr ? "Ocultar" : "Exibir QR"}</span>
          </button>

          {showQr && (
            <div className="flex flex-col items-center gap-2 pt-3 animate-in fade-in duration-200">
              <OfflineQrDisplay code={ticket.qrHash || ticket.humanCode} />
              <p className="text-xs text-muted-foreground text-center max-w-56">
                Mostre este QR Code na portaria digital do evento
              </p>
            </div>
          )}
        </div>
      )}

      {/* Ações do Card */}
      <div className="px-4 py-3 flex items-center gap-2 bg-muted/10">
        <Button
          type="button"
          size="default"
          variant="outline"
          onClick={(e) => {
            e.stopPropagation();
            onOpenDetail(ticket);
          }}
          className="flex-1 rounded-lg text-xs font-semibold h-11 min-h-11 cursor-pointer focus-visible:ring-2 focus-visible:ring-primary"
        >
          <ChevronRight className="size-4 mr-1" strokeWidth={2} />
          <span>Ver Detalhes do Ingresso</span>
        </Button>
        {isValid && (
          <Button
            type="button"
            size="default"
            variant="outline"
            onClick={handleShare}
            className="size-11 min-h-11 min-w-11 rounded-lg cursor-pointer p-0 shrink-0 focus-visible:ring-2 focus-visible:ring-primary"
            aria-label="Compartilhar ingresso"
          >
            <Share2 className="size-4" strokeWidth={1.75} />
          </Button>
        )}
      </div>
    </div>
  );
}

// ─── Página Principal ─────────────────────────────────────────────────────────

function CustomerTicketsPage() {
  const router = useRouter();
  const tickets = (Route.useLoaderData() as CustomerEventTicketDTO[]) || [];
  const [activeFilter, setActiveFilter] = useState("todos");
  const [search, setSearch] = useState("");
  const [selectedTicket, setSelectedTicket] = useState<CustomerEventTicketDTO | null>(null);

  const filtered = useMemo(() => {
    let result = tickets;
    if (activeFilter === "used") {
      result = result.filter((t) => t.isUsed || t.status === "used");
    } else if (activeFilter === "valid") {
      result = result.filter(
        (t) => !t.isUsed && ["paid", "processing", "completed", "valid"].includes(t.status)
      );
    } else if (activeFilter === "cancelled") {
      result = result.filter((t) => ["cancelled", "returned", "revoked"].includes(t.status));
    }
    if (search.trim()) {
      const term = search.trim().toLowerCase();
      result = result.filter(
        (t) =>
          t.eventTitle?.toLowerCase().includes(term) ||
          t.eventLocation?.toLowerCase().includes(term) ||
          t.humanCode?.toLowerCase().includes(term) ||
          t.accessCode?.toLowerCase().includes(term)
      );
    }
    return result;
  }, [tickets, activeFilter, search]);

  const counts = useMemo(
    () => ({
      todos: tickets.length,
      valid: tickets.filter(
        (t) => !t.isUsed && ["paid", "processing", "completed", "valid"].includes(t.status)
      ).length,
      used: tickets.filter((t) => t.isUsed || t.status === "used").length,
      cancelled: tickets.filter((t) => ["cancelled", "returned", "revoked"].includes(t.status)).length,
    }),
    [tickets]
  );

  const navActionBtn = (
    <Button asChild size="default" variant="outline" className="rounded-lg text-xs font-semibold h-11 min-h-11 px-4 cursor-pointer focus-visible:ring-2 focus-visible:ring-primary">
      <Link to="/eventos">Eventos</Link>
    </Button>
  );

  const handleRefresh = () => {
    router.invalidate();
  };

  return (
    <div className="w-full max-w-2xl mx-auto pb-24 px-0 sm:px-4 md:px-0">
      {/* ── 1. Native Mobile Header (Apple HIG / PWA Nativo) ── */}
      <NativeMobileHeader
        title="Ingressos"
        fallbackHref="/conta"
        badge={
          tickets.length > 0 ? (
            <Badge variant="secondary" className="text-xs font-mono font-bold px-2 py-1 rounded-md">
              {tickets.length}
            </Badge>
          ) : null
        }
        rightActions={navActionBtn}
      />

      {/* ── 2. Desktop Inpage Header (Bento Grid & Apple HIG) ── */}
      <div className="hidden md:flex items-center justify-between pb-4 pt-2 border-b border-border/40">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">Ingressos</h1>
          <p className="text-xs text-muted-foreground mt-1">Acesse seus ingressos digitais com QR Code e histórico de compras</p>
        </div>
        {navActionBtn}
      </div>

      {tickets.length === 0 ? (
        /* ── Empty State Canônico com Redirecionamento para Eventos ── */
        <EmptyState
          icon={Ticket}
          title="Nenhum ingresso encontrado"
          description="Seus ingressos para shows, festivais, festas e conferências aparecerão aqui com QR Code e segurança nominal WCTS-1."
          action={
            <div className="flex flex-col sm:flex-row items-center gap-2 mt-3">
              <Button asChild size="default" className="rounded-lg h-11 min-h-11 px-6 text-xs font-bold gap-2 focus-visible:ring-2 focus-visible:ring-primary shadow-xs">
                <Link to="/eventos">
                  <Sparkles className="size-4" />
                  <span>Explorar Eventos & Shows</span>
                </Link>
              </Button>
              <Button asChild variant="outline" size="default" className="rounded-lg h-11 min-h-11 px-5 text-xs font-semibold focus-visible:ring-2 focus-visible:ring-primary">
                <Link to="/agenda">Ver Agenda Cultural</Link>
              </Button>
            </div>
          }
          className="my-8"
        />
      ) : (
        <>
          {/* ── 3. Busca ── */}
          <div className="pt-3 pb-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" strokeWidth={2} />
              <Input
                id="tickets-search"
                type="text"
                placeholder="Buscar por evento, local ou código de ingresso..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-11 min-h-11 text-xs rounded-lg border-border/60 bg-muted/30 focus:bg-background transition-colors"
              />
            </div>
          </div>

          {/* ── 4. Chips de filtro ── */}
          <div className="flex flex-wrap items-center gap-2 py-2">
            {FILTER_CHIPS.map((chip) => {
              const count = counts[chip.id as keyof typeof counts] || 0;
              const isActive = activeFilter === chip.id;
              if (count === 0 && chip.id !== "todos") return null;
              return (
                <button
                  key={chip.id}
                  id={`ticket-filter-${chip.id}`}
                  type="button"
                  onClick={() => setActiveFilter(chip.id)}
                  className={`flex items-center gap-2 h-11 min-h-11 px-4 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors border cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                    isActive
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-background text-muted-foreground border-border/60 hover:border-border hover:text-foreground"
                  }`}
                >
                  <span>{chip.label}</span>
                  <span className={`text-xs font-mono ${isActive ? "opacity-80" : "text-muted-foreground"}`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* ── 5. Grid de Ingressos ── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-1">
            {filtered.length === 0 ? (
              <div className="col-span-full flex flex-col items-center justify-center py-12 text-center gap-2 bg-muted/10 border border-dashed border-border/50 rounded-lg p-6">
                <Ticket className="size-8 text-muted-foreground/40 mb-1" />
                <p className="text-sm font-semibold text-foreground">
                  {search ? "Nenhum ingresso encontrado para esta busca" : "Nenhum ingresso nesta categoria"}
                </p>
                <p className="text-xs text-muted-foreground max-w-sm">
                  {search
                    ? `Não localizamos ingressos com o termo "${search}".`
                    : "Você não possui ingressos correspondentes ao filtro selecionado."}
                </p>
                {search ? (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setSearch("")}
                    className="h-11 px-4 text-xs font-semibold rounded-lg mt-2 cursor-pointer focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    Limpar Busca
                  </Button>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setActiveFilter("todos")}
                    className="h-11 px-4 text-xs font-semibold rounded-lg mt-2 cursor-pointer focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    Ver Todos os Ingressos
                  </Button>
                )}
              </div>
            ) : (
              filtered.map((ticket) => (
                <TicketCard
                  key={ticket.id}
                  ticket={ticket}
                  onOpenDetail={(t) => setSelectedTicket(t)}
                />
              ))
            )}
          </div>
        </>
      )}

      {/* Modal de Detalhes do Ingresso */}
      <TicketDetailModal
        open={Boolean(selectedTicket)}
        onOpenChange={(open) => !open && setSelectedTicket(null)}
        ticket={selectedTicket}
        onTicketUpdated={handleRefresh}
      />
    </div>
  );
}

export default CustomerTicketsPage;
