import { createFileRoute, Link } from "@tanstack/react-router";
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
  Download,
  Search,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { NativeMobileHeader } from "@/components/navigation";
import { Input } from "@/components/ui/input";
import { formatMoney } from "@/lib/money";
import { formatDate } from "@/lib/datetime";
import {
  listCustomerEventTickets,
  type CustomerEventTicketDTO,
} from "@/services/events.functions";

// ─── Constants ────────────────────────────────────────────────────────────────

const FILTER_CHIPS = [
  { id: "todos", label: "Todos" },
  { id: "valid", label: "Válidos", statuses: ["paid", "processing", "completed"] },
  { id: "used", label: "Utilizados", isUsed: true },
  { id: "cancelled", label: "Cancelados", statuses: ["cancelled", "returned"] },
];

// ─── Route ────────────────────────────────────────────────────────────────────

export const Route = createFileRoute("/_store/conta/ingressos")({
  head: () => ({ meta: [{ title: "Meus Ingressos & Eventos | Waesy" }] }),
  loader: async () => {
    try {
      return (await listCustomerEventTickets().catch(() => [])) || [];
    } catch (err) {
      console.error("[loader:_store.conta.ingressos] Unhandled error:", err);
      return [] as CustomerEventTicketDTO[];
    }
  },
  component: CustomerTicketsPage,
});

// ─── QR Display Component ─────────────────────────────────────────────────────

function QrDisplay({ code }: { code: string }) {
  // Gera uma representação visual simples do QR como grid de blocos
  // Em produção, usar qrcode.react ou similar
  const size = 8;
  const hash = code.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);

  return (
    <div className="inline-block p-2 bg-white border border-border/40 rounded-xl">
      <div
        className="grid gap-[2px]"
        style={{ gridTemplateColumns: `repeat(${size}, 1fr)` }}
        aria-label={`QR Code: ${code}`}
      >
        {Array.from({ length: size * size }).map((_, i) => {
          // Padrão de QR simplificado com bordas canônicas
          const row = Math.floor(i / size);
          const col = i % size;
          const isBorder =
            (row < 2 && col < 2) ||
            (row < 2 && col >= size - 2) ||
            (row >= size - 2 && col < 2);
          const isPattern = isBorder || ((hash + i * 7) % 3 === 0);
          return (
            <div
              key={i}
              className={`size-2.5 rounded-[1px] ${isPattern ? "bg-foreground" : "bg-transparent"}`}
            />
          );
        })}
      </div>
      <p className="text-center text-[9px] font-mono font-bold text-foreground mt-1.5 tracking-widest">
        {code}
      </p>
    </div>
  );
}

// ─── Ticket Card ──────────────────────────────────────────────────────────────

function TicketCard({ ticket }: { ticket: CustomerEventTicketDTO }) {
  const [showQr, setShowQr] = useState(false);
  const isValid = !ticket.isUsed && ["paid", "processing", "completed"].includes(ticket.status);
  const isCancelled = ["cancelled", "returned"].includes(ticket.status);

  const handleShare = async () => {
    try {
      await navigator.share({
        title: ticket.eventTitle,
        text: `Meu ingresso: ${ticket.eventTitle} — Código: ${ticket.accessCode}`,
        url: window.location.href,
      });
    } catch {
      navigator.clipboard.writeText(ticket.accessCode);
    }
  };

  return (
    <div
      className={`bg-card border rounded-2xl overflow-hidden transition-all ${
        ticket.isUsed
          ? "border-border/30 opacity-70"
          : isCancelled
          ? "border-destructive/20"
          : "border-border/50"
      }`}
    >
      {/* Capa do evento se houver */}
      {ticket.coverUrl && (
        <div className="aspect-[3/1] overflow-hidden">
          <img
            src={ticket.coverUrl}
            alt={ticket.eventTitle}
            className="w-full h-full object-cover"
          />
        </div>
      )}

      {/* Header */}
      <div className="px-4 py-3.5 border-b border-border/30 flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0 flex-1">
          <div
            className={`size-10 rounded-xl flex items-center justify-center shrink-0 ${
              ticket.isUsed
                ? "bg-muted/50 text-muted-foreground/50"
                : isValid
                ? "bg-primary/5 text-primary border border-primary/20"
                : "bg-muted/40 text-muted-foreground/60"
            }`}
          >
            <Ticket className="size-4.5" strokeWidth={1.75} />
          </div>
          <div className="min-w-0 flex-1">
            <h4 className="text-[13px] font-bold text-foreground leading-snug line-clamp-2">
              {ticket.eventTitle}
            </h4>
            {ticket.lotName && (
              <p className="text-[10px] text-muted-foreground mt-0.5">{ticket.lotName}</p>
            )}
          </div>
        </div>

        {/* Status badge */}
        {ticket.isUsed ? (
          <Badge variant="secondary" className="text-[10px] shrink-0 rounded-md px-2 h-5">
            <CheckCircle2 className="size-2.5 mr-1" />
            Utilizado
          </Badge>
        ) : isCancelled ? (
          <Badge variant="destructive" className="text-[10px] shrink-0 rounded-md px-2 h-5">
            <XCircle className="size-2.5 mr-1" />
            Cancelado
          </Badge>
        ) : isValid ? (
          <Badge variant="success" className="text-[10px] shrink-0 rounded-md px-2 h-5">
            <CheckCircle2 className="size-2.5 mr-1" />
            Válido
          </Badge>
        ) : (
          <Badge variant="warning" className="text-[10px] shrink-0 rounded-md px-2 h-5">
            <Clock className="size-2.5 mr-1" />
            Pendente
          </Badge>
        )}
      </div>

      {/* Dados do evento */}
      <div className="px-4 py-3 border-b border-border/30 space-y-2">
        {ticket.eventDate && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Calendar className="size-3.5 shrink-0" strokeWidth={1.75} />
            <span>{formatDate(ticket.eventDate)}</span>
          </div>
        )}
        {ticket.eventLocation && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <MapPin className="size-3.5 shrink-0" strokeWidth={1.75} />
            <span className="truncate">{ticket.eventLocation}</span>
          </div>
        )}
        <div className="flex items-center justify-between">
          <span className="text-[11px] text-muted-foreground">
            {ticket.quantity > 1 ? `${ticket.quantity}× ingressos` : "1 ingresso"}
          </span>
          <span className="text-[13px] font-bold text-foreground font-mono">
            {formatMoney(ticket.priceCents)}
          </span>
        </div>
      </div>

      {/* QR Section expandível */}
      {isValid && (
        <div className="px-4 py-3 border-b border-border/30">
          <button
            type="button"
            id={`qr-toggle-${ticket.id}`}
            onClick={() => setShowQr(!showQr)}
            className="w-full flex items-center justify-between text-xs font-semibold text-foreground cursor-pointer py-0.5"
          >
            <div className="flex items-center gap-2">
              <QrCode className="size-3.5 text-muted-foreground" strokeWidth={1.75} />
              <span>Código de Acesso</span>
            </div>
            <span className="text-muted-foreground text-[10px]">{showQr ? "Ocultar" : "Exibir QR"}</span>
          </button>

          {showQr && (
            <div className="flex flex-col items-center gap-2 pt-3 animate-in fade-in duration-200">
              <QrDisplay code={ticket.qrHash} />
              <p className="text-[10px] text-muted-foreground text-center max-w-[200px]">
                Mostre este QR Code na entrada do evento
              </p>
            </div>
          )}
        </div>
      )}

      {/* Ações */}
      <div className="px-4 py-3 flex items-center gap-2">
        <Button
          asChild
          size="sm"
          variant="outline"
          className="flex-1 rounded-xl text-xs font-semibold h-9 cursor-pointer"
        >
          <Link to="/conta/pedidos/$id" params={{ id: ticket.orderId }}>
            <ChevronRight className="size-3.5 mr-1" strokeWidth={2} />
            Ver Comprovante
          </Link>
        </Button>
        {isValid && (
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={handleShare}
            className="h-9 w-9 rounded-xl cursor-pointer p-0 shrink-0"
            aria-label="Compartilhar ingresso"
          >
            <Share2 className="size-3.5" strokeWidth={1.75} />
          </Button>
        )}
      </div>
    </div>
  );
}

// ─── Página Principal ─────────────────────────────────────────────────────────

function CustomerTicketsPage() {
  const tickets = (Route.useLoaderData() as CustomerEventTicketDTO[]) || [];
  const [activeFilter, setActiveFilter] = useState("todos");
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    let result = tickets;
    if (activeFilter === "used") {
      result = result.filter((t) => t.isUsed);
    } else if (activeFilter === "valid") {
      result = result.filter(
        (t) => !t.isUsed && ["paid", "processing", "completed"].includes(t.status)
      );
    } else if (activeFilter === "cancelled") {
      result = result.filter((t) => ["cancelled", "returned"].includes(t.status));
    }
    if (search.trim()) {
      const term = search.trim().toLowerCase();
      result = result.filter(
        (t) =>
          t.eventTitle?.toLowerCase().includes(term) ||
          t.eventLocation?.toLowerCase().includes(term) ||
          t.accessCode?.toLowerCase().includes(term)
      );
    }
    return result;
  }, [tickets, activeFilter, search]);

  const counts = useMemo(
    () => ({
      todos: tickets.length,
      valid: tickets.filter(
        (t) => !t.isUsed && ["paid", "processing", "completed"].includes(t.status)
      ).length,
      used: tickets.filter((t) => t.isUsed).length,
      cancelled: tickets.filter((t) => ["cancelled", "returned"].includes(t.status)).length,
    }),
    [tickets]
  );

  return (
    <div className="w-full max-w-2xl mx-auto pb-24 px-0 sm:px-0 animate-in fade-in duration-200">
      {/* ── 1. Canonical Navigation Header ── */}
      <NativeMobileHeader
        title="Ingressos"
        fallbackHref="/conta"
        badge={
          tickets.length > 0 ? (
            <Badge variant="secondary" className="text-xs font-mono font-bold px-2 py-0.5 rounded-md">
              {tickets.length}
            </Badge>
          ) : null
        }
        rightActions={
          <Button asChild size="sm" variant="outline" className="rounded-xl text-xs font-semibold h-8.5 px-3 cursor-pointer">
            <Link to="/agenda">Ver Agenda Cultural</Link>
          </Button>
        }
      />

      {tickets.length === 0 ? (
        /* ── Empty State ── */
        <div className="flex flex-col items-center justify-center py-20 px-6 text-center gap-3">
          <Ticket className="size-10 stroke-[1.5] text-muted-foreground/40 mb-1" />
          <div>
            <h2 className="text-base font-bold text-foreground">Nenhum ingresso encontrado</h2>
            <p className="text-xs text-muted-foreground mt-1 max-w-xs mx-auto leading-relaxed">
              Seus ingressos para shows, festivais e eventos culturais aparecerão aqui com QR Code de acesso digital.
            </p>
          </div>
          <Button asChild className="rounded-xl h-10 px-6 text-xs font-bold mt-2">
            <Link to="/agenda">Explorar Próximos Eventos</Link>
          </Button>
        </div>
      ) : (
        <>
          {/* ── 2. Busca ── */}
          <div className="px-4 sm:px-0 pt-3 pb-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" strokeWidth={2} />
              <Input
                id="tickets-search"
                type="text"
                placeholder="Buscar por evento ou local..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8.5 h-10 text-xs rounded-xl border-border/60 bg-muted/30 focus:bg-background transition-colors"
              />
            </div>
          </div>

          {/* ── 3. Chips de filtro ── */}
          <div className="overflow-x-auto scrollbar-none px-4 sm:px-0 py-2">
            <div className="flex items-center gap-2 min-w-max">
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
                    className={`flex items-center gap-1.5 h-8 px-3 rounded-xl text-xs font-semibold whitespace-nowrap transition-all border cursor-pointer ${
                      isActive
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-background text-muted-foreground border-border/60 hover:border-border hover:text-foreground"
                    }`}
                  >
                    {chip.label}
                    <span className={`text-[10px] font-mono ${isActive ? "opacity-80" : "text-muted-foreground"}`}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── 4. Grid de Ingressos ── */}
          <div className="px-4 sm:px-0 grid grid-cols-1 sm:grid-cols-2 gap-3 mt-1">
            {filtered.length === 0 ? (
              <div className="col-span-full flex flex-col items-center justify-center py-12 text-center gap-2">
                <p className="text-sm font-semibold text-foreground">Nenhum ingresso encontrado</p>
                <p className="text-xs text-muted-foreground">Tente outro filtro.</p>
              </div>
            ) : (
              filtered.map((ticket) => <TicketCard key={ticket.id} ticket={ticket} />)
            )}
          </div>
        </>
      )}
    </div>
  );
}

export default CustomerTicketsPage;
