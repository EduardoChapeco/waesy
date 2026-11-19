import React, { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AppContextualAuthCard } from "@/components/branded-app/app-contextual-auth-card";
import {
  ShoppingBag,
  CalendarCheck,
  AirplaneTilt,
  Ticket,
  FileText,
  CreditCard,
  Copy,
  CheckCircle,
  Upload,
  LockKey,
  ArrowRight,
  QrCode,
  SignOut,
  WhatsappLogo,
  ChatCircleDots,
  Lifebuoy,
} from "@phosphor-icons/react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ImageUpload } from "@/components/ui/image-upload";
import { EmptyState } from "@/components/state/states";
import { Skeleton } from "@/components/ui/skeleton";
import {
  getClientStorePortalSummaryFn,
  unlockClientStorePortalByCodeFn,
} from "@/services/branded-app.functions";
import { submitInstallmentProof } from "@/services/receivables.functions";
import { formatMoney } from "@/lib/money";
import { formatDate } from "@/lib/datetime";
import { generateQrCodeDataUri } from "@/lib/qr-code";
import {
  AppClientPortalChatView,
  AppClientPortalTicketsView,
} from "@/components/branded-app/app-client-portal-chat-and-tickets";
import { cn } from "@/lib/utils";
import type { BrandedAppTemplateId } from "@/types/branded-app";

export interface AppClientPortalTabProps {
  storeId: string;
  storeSlug: string;
  storeName: string;
  templateId: BrandedAppTemplateId;
  initialAccessToken?: string | null;
  initialClientCode?: string | null;
  storeWhatsapp?: string | null;
  allowSelfSignup?: boolean;
  className?: string;
}

type PortalFilterKey =
  | "all"
  | "orders"
  | "proposals"
  | "trips"
  | "appointments"
  | "tickets"
  | "contracts"
  | "receivables"
  | "chat"
  | "support_tickets";

const STATUS_LABELS: Record<string, string> = {
  pending: "Pendente",
  awaiting_payment: "Aguardando pagamento",
  paid: "Pago",
  confirmed: "Confirmado",
  preparing: "Em preparo",
  shipped: "Enviado",
  delivered: "Entregue",
  completed: "Concluído",
  cancelled: "Cancelado",
  signed: "Assinado",
  active: "Ativo",
  overdue: "Em atraso",
  awaiting_review: "Em análise",
};

export function AppClientPortalTab({
  storeId,
  storeSlug,
  storeName,
  templateId,
  initialAccessToken,
  initialClientCode,
  storeWhatsapp,
  allowSelfSignup = true,
  className,
}: AppClientPortalTabProps) {
  const queryClient = useQueryClient();
  const storageKey = `waesy_app_portal_token:${storeId}`;
  const [accessToken, setAccessToken] = useState<string | null>(() => {
    if (initialAccessToken?.trim()) return initialAccessToken.trim();
    if (typeof window !== "undefined") {
      try {
        return sessionStorage.getItem(storageKey) || null;
      } catch {
        return null;
      }
    }
    return null;
  });
  const [codeInput, setCodeInput] = useState<string>(initialClientCode?.trim() || "");
  const [verificationInput, setVerificationInput] = useState<string>("");
  const [ticketQrState, setTicketQrState] = useState<{ title: string; code: string } | null>(null);
  const [inspectedOrder, setInspectedOrder] = useState<any | null>(null);
  const [inspectedTrip, setInspectedTrip] = useState<any | null>(null);
  const [embeddedViewer, setEmbeddedViewer] = useState<{ title: string; url: string } | null>(null);
  const [filter, setFilter] = useState<PortalFilterKey>("all");
  const [proofModalOpen, setProofModalOpen] = useState(false);
  const [selectedInstallmentId, setSelectedInstallmentId] = useState<string | null>(null);
  const [selectedInstallmentLabel, setSelectedInstallmentLabel] = useState<string>("");
  const [proofUrl, setProofUrl] = useState("");
  const [proofNotes, setProofNotes] = useState("");

  useEffect(() => {
    const cleanInit = initialAccessToken?.trim();
    if (!cleanInit) return;
    setAccessToken(cleanInit);
    if (typeof window !== "undefined") {
      try {
        sessionStorage.setItem(storageKey, cleanInit);
      } catch {
        // Storage indisponível
      }
    }
  }, [initialAccessToken, storageKey]);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["client-store-portal", storeId, accessToken || "session"],
    queryFn: () =>
      getClientStorePortalSummaryFn({
        data: { storeId, accessToken: accessToken || undefined },
      }),
  });

  useEffect(() => {
    if (data?.tokenInvalid && accessToken) {
      setAccessToken(null);
      if (typeof window !== "undefined") {
        try {
          sessionStorage.removeItem(storageKey);
        } catch {
          // Storage indisponível
        }
      }
    }
  }, [data?.tokenInvalid, accessToken, storageKey]);

  const { mutate: unlockByCode, isPending: isUnlocking } = useMutation({
    mutationFn: unlockClientStorePortalByCodeFn,
    onSuccess: (res) => {
      if (res?.magicToken) {
        setAccessToken(res.magicToken);
        if (typeof window !== "undefined") {
          try {
            sessionStorage.setItem(storageKey, res.magicToken);
          } catch {
            // Storage indisponível
          }
        }
        toast.success(`Acesso liberado (${res.clientCode})!`);
        queryClient.invalidateQueries({ queryKey: ["client-store-portal", storeId] });
      }
    },
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : "Não foi possível validar o código.");
    },
  });

  const { mutate: sendProof, isPending: isSubmittingProof } = useMutation({
    mutationFn: submitInstallmentProof,
    onSuccess: () => {
      toast.success("Comprovante enviado! Aguarde a confirmação da empresa.");
      setProofModalOpen(false);
      setProofUrl("");
      setProofNotes("");
      setSelectedInstallmentId(null);
      queryClient.invalidateQueries({ queryKey: ["client-store-portal", storeId] });
    },
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : "Erro ao enviar comprovante.");
    },
  });

  const subTabs = useMemo(() => {
    if (!data) return [];
    const proposalsList = Array.isArray(data.proposals) ? data.proposals : [];
    const tabs: Array<{ key: PortalFilterKey; label: string; count: number; icon: React.ReactNode }> = [
      {
        key: "all",
        label: "Tudo",
        count:
          data.orders.length +
          proposalsList.length +
          data.appointments.length +
          data.trips.length +
          data.tickets.length +
          data.contracts.length +
          data.receivables.length,
        icon: <ShoppingBag className="size-4" />,
      },
      {
        key: "orders",
        label: "Pedidos & Aluguéis",
        count: data.orders.length,
        icon: <ShoppingBag className="size-4" />,
      },
      {
        key: "proposals",
        label: "Propostas",
        count: proposalsList.length,
        icon: <FileText className="size-4" />,
      },
      {
        key: "trips",
        label: "Viagens",
        count: data.trips.length,
        icon: <AirplaneTilt className="size-4" />,
      },
      {
        key: "appointments",
        label: "Agendamentos",
        count: data.appointments.length,
        icon: <CalendarCheck className="size-4" />,
      },
      {
        key: "tickets",
        label: "Ingressos",
        count: data.tickets.length,
        icon: <Ticket className="size-4" />,
      },
      {
        key: "contracts",
        label: "Contratos",
        count: data.contracts.length,
        icon: <FileText className="size-4" />,
      },
      {
        key: "receivables",
        label: "Financeiro",
        count: data.receivables.length,
        icon: <CreditCard className="size-4" />,
      },
      {
        key: "chat",
        label: "Chat Direto",
        count: 0,
        icon: <ChatCircleDots className="size-4" />,
      },
      {
        key: "support_tickets",
        label: "Chamados",
        count: 0,
        icon: <Lifebuoy className="size-4" />,
      },
    ];

    return tabs.filter((t) => {
      if (t.key === "all" || t.key === "chat" || t.key === "support_tickets") return true;
      if (t.count > 0) return true;
      if (templateId === "tourism_cvc" && (t.key === "trips" || t.key === "proposals")) return true;
      if (templateId === "events_sympla" && t.key === "tickets") return true;
      if (templateId === "services_agenda" && t.key === "appointments") return true;
      return t.key === "orders" || t.key === "contracts" || t.key === "receivables";
    });
  }, [data, templateId]);

  const handleCopyPix = async (pixCode: string) => {
    try {
      await navigator.clipboard.writeText(pixCode);
      toast.success("Código PIX copiado!");
    } catch {
      toast.error("Não foi possível copiar o PIX.");
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-24 w-full rounded-2xl" />
        <Skeleton className="h-24 w-full rounded-2xl" />
        <Skeleton className="h-24 w-full rounded-2xl" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="rounded-2xl border border-border bg-card p-6 text-center space-y-3">
        <p className="text-sm font-bold text-foreground">
          Não foi possível carregar sua área de cliente.
        </p>
        <Button type="button" variant="outline" onClick={() => refetch()} className="h-11 min-h-11">
          Tentar novamente
        </Button>
      </div>
    );
  }

  if (!data.authenticated) {
    return (
      <AppContextualAuthCard
        storeId={storeId}
        storeName={storeName}
        storeWhatsapp={storeWhatsapp}
        allowSelfSignup={allowSelfSignup}
        tokenInvalid={Boolean(data.tokenInvalid)}
        initialClientCode={initialClientCode || ""}
        isUnlockingCode={isUnlocking}
        onUnlockByCode={(payload) => unlockByCode({ data: payload })}
        onAuthenticatedSession={async () => {
          await queryClient.invalidateQueries({ queryKey: ["client-store-portal", storeId] });
        }}
        className={className}
      />
    );
  }

  const totalCount =
    data.orders.length +
    data.appointments.length +
    data.trips.length +
    data.tickets.length +
    data.contracts.length +
    data.receivables.length;

  const cleanWaDigits = String(storeWhatsapp || "").replace(/\D/g, "");

  const handleLogoutMagicSession = () => {
    setAccessToken(null);
    if (typeof window !== "undefined") {
      try {
        sessionStorage.removeItem(storageKey);
      } catch {
        // Storage indisponível
      }
    }
    queryClient.invalidateQueries({ queryKey: ["client-store-portal", storeId] });
  };

  return (
    <div className={cn("space-y-5 pb-8", className)}>
      {/* Cabeçalho do Cliente Escopado no App Oficial */}
      <div className="rounded-2xl border border-border bg-card p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-xs font-semibold text-muted-foreground">
              Área do Cliente · {storeName}
            </p>
            {data.clientCode && (
              <Badge variant="outline" className="font-mono text-xs">
                {data.clientCode}
              </Badge>
            )}
          </div>
          <h2 className="text-base font-extrabold text-foreground">
            {data.userName || data.userEmail || "Cliente"}
          </h2>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {cleanWaDigits && (
            <Button
              asChild
              variant="outline"
              className="h-11 min-h-11 px-4 rounded-xl text-xs font-bold gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <a
                href={`https://wa.me/${cleanWaDigits}`}
                target="_blank"
                rel="noreferrer"
              >
                <WhatsappLogo className="size-4 text-emerald-600" />
                <span>Atendimento</span>
              </a>
            </Button>
          )}
          {data.authMode === "magic_link" && (
            <Button
              type="button"
              variant="outline"
              onClick={handleLogoutMagicSession}
              className="h-11 min-h-11 px-4 rounded-xl text-xs font-semibold gap-2 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <SignOut className="size-4" />
              <span>Trocar Acesso</span>
            </Button>
          )}
        </div>
      </div>

      {/* Filtros Horizontais 44px */}
      <div className="flex items-center gap-2 overflow-x-auto scroll-area-carousel no-scrollbar pb-1">
        {subTabs.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setFilter(t.key)}
            className={cn(
              "h-11 min-h-11 px-4 rounded-full text-xs font-bold flex items-center gap-2 shrink-0 border transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              filter === t.key
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-card text-foreground border-border hover:bg-muted",
            )}
          >
            {t.icon}
            <span>{t.label}</span>
            {t.count > 0 && (
              <span className="px-2 py-1 rounded-full bg-muted text-foreground text-xs font-mono">
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {totalCount === 0 && filter !== "chat" && filter !== "support_tickets" && (
        <EmptyState
          title="Nenhum registro nesta empresa ainda"
          description={`Seus pedidos, reservas, viagens, contratos e parcelas em ${storeName} aparecerão aqui automaticamente.`}
        />
      )}

      {/* 1. Pedidos & Aluguéis */}
      {(filter === "all" || filter === "orders") && data.orders.length > 0 && (
        <section aria-label="Meus pedidos e aluguéis" className="space-y-3">
          <h3 className="text-sm font-extrabold text-foreground">Pedidos & Aluguéis</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {data.orders.map((order) => (
              <article
                key={order.id}
                className="rounded-2xl border border-border bg-card p-4 flex flex-col justify-between gap-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-extrabold font-mono text-foreground">
                        #{order.order_number || order.id.slice(0, 8).toUpperCase()}
                      </span>
                      {order.is_rental && <Badge variant="secondary">Aluguel</Badge>}
                    </div>
                    <p className="text-xs font-semibold text-foreground truncate">
                      {order.first_item_title || `${order.items_count} item(ns)`}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(order.created_at)}
                    </p>
                  </div>
                  <Badge variant="outline">
                    {STATUS_LABELS[order.status] || order.status}
                  </Badge>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-border/60">
                  <span className="text-sm font-black font-mono text-foreground">
                    {formatMoney(order.total_cents)}
                  </span>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => setInspectedOrder(order)}
                    className="h-11 min-h-11 px-4 rounded-xl text-xs font-bold cursor-pointer"
                  >
                    Acompanhar Pedido
                  </Button>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      {/* 1b. Propostas & Orçamentos */}
      {(filter === "all" || filter === "proposals") && Array.isArray(data.proposals) && data.proposals.length > 0 && (
        <section aria-label="Minhas propostas" className="space-y-3">
          <h3 className="text-sm font-extrabold text-foreground">Propostas &amp; Orçamentos</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {data.proposals.map((prop) => (
              <article
                key={prop.id}
                className="rounded-2xl border border-border bg-card p-4 flex flex-col justify-between gap-3"
              >
                <div className="space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="text-sm font-bold text-foreground truncate">{prop.title}</h4>
                    <Badge variant="outline">{STATUS_LABELS[prop.status] || prop.status}</Badge>
                  </div>
                  {prop.destination && (
                    <p className="text-xs text-muted-foreground">{prop.destination}</p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    {formatDate(prop.created_at)}
                  </p>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-border/60">
                  {prop.total_cents > 0 ? (
                    <span className="text-sm font-black font-mono text-foreground">
                      {formatMoney(prop.total_cents)}
                    </span>
                  ) : (
                    <span className="text-xs text-muted-foreground">Sob consulta</span>
                  )}
                  {prop.public_token && (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        setEmbeddedViewer({
                          title: prop.title || "Proposta Comercial",
                          url: `/proposta/${prop.public_token}`,
                        })
                      }
                      className="h-11 min-h-11 px-4 rounded-xl text-xs font-bold cursor-pointer"
                    >
                      Abrir Proposta
                    </Button>
                  )}
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      {/* 2. Viagens & Vouchers */}
      {(filter === "all" || filter === "trips") && data.trips.length > 0 && (
        <section aria-label="Minhas viagens" className="space-y-3">
          <h3 className="text-sm font-extrabold text-foreground">Viagens & Vouchers</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {data.trips.map((trip) => (
              <article
                key={trip.id}
                className="rounded-2xl border border-border bg-card p-4 flex flex-col justify-between gap-3"
              >
                <div className="space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="text-sm font-bold text-foreground truncate">{trip.title}</h4>
                    <Badge variant="outline">{STATUS_LABELS[trip.status] || trip.status}</Badge>
                  </div>
                  {trip.destination && (
                    <p className="text-xs text-muted-foreground">{trip.destination}</p>
                  )}
                  <div className="flex items-center gap-3 text-xs text-muted-foreground font-mono">
                    {trip.locator_code && <span>LOC: {trip.locator_code}</span>}
                    {trip.departure_date && <span>Saída: {formatDate(trip.departure_date)}</span>}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-border/60">
                  {typeof trip.total_cents === "number" && trip.total_cents > 0 ? (
                    <span className="text-sm font-black font-mono text-foreground">
                      {formatMoney(trip.total_cents)}
                    </span>
                  ) : (
                    <span className="text-xs text-muted-foreground">Atendimento da agência</span>
                  )}
                  {trip.voucher_url ? (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() =>
                        setEmbeddedViewer({
                          title: trip.title || "Voucher da Viagem",
                          url: trip.voucher_url!,
                        })
                      }
                      className="h-11 min-h-11 px-4 rounded-xl text-xs font-bold cursor-pointer"
                    >
                      Abrir Voucher
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setInspectedTrip(trip)}
                      className="h-11 min-h-11 px-4 rounded-xl text-xs font-bold cursor-pointer"
                    >
                      Ver Detalhes
                    </Button>
                  )}
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      {/* 3. Agendamentos */}
      {(filter === "all" || filter === "appointments") && data.appointments.length > 0 && (
        <section aria-label="Meus agendamentos" className="space-y-3">
          <h3 className="text-sm font-extrabold text-foreground">Agendamentos</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {data.appointments.map((apt) => (
              <article
                key={apt.id}
                className="rounded-2xl border border-border bg-card p-4 space-y-2"
              >
                <div className="flex items-center justify-between gap-2">
                  <h4 className="text-sm font-bold text-foreground truncate">{apt.service_title}</h4>
                  <Badge variant="outline">{STATUS_LABELS[apt.status] || apt.status}</Badge>
                </div>
                <p className="text-xs font-mono text-muted-foreground">
                  {formatDate(apt.scheduled_at)}
                </p>
                {typeof apt.price_cents === "number" && apt.price_cents > 0 && (
                  <p className="text-xs font-bold text-foreground">{formatMoney(apt.price_cents)}</p>
                )}
              </article>
            ))}
          </div>
        </section>
      )}

      {/* 4. Ingressos */}
      {(filter === "all" || filter === "tickets") && data.tickets.length > 0 && (
        <section aria-label="Meus ingressos" className="space-y-3">
          <h3 className="text-sm font-extrabold text-foreground">Ingressos & Eventos</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {data.tickets.map((tk) => (
              <article
                key={tk.id}
                className="rounded-2xl border border-border bg-card p-4 flex flex-col justify-between gap-3"
              >
                <div className="space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="text-sm font-bold text-foreground truncate">{tk.event_title}</h4>
                    <Badge variant="outline">{STATUS_LABELS[tk.status] || tk.status}</Badge>
                  </div>
                  {tk.lot_name && <p className="text-xs text-muted-foreground">Lote: {tk.lot_name}</p>}
                  {tk.location && <p className="text-xs text-muted-foreground">{tk.location}</p>}
                  {tk.qr_code_token && (
                    <p className="text-xs font-mono font-bold text-primary">Código: {tk.qr_code_token}</p>
                  )}
                </div>
                {tk.qr_code_token && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() =>
                      setTicketQrState({
                        title: tk.event_title,
                        code: tk.qr_code_token!,
                      })
                    }
                    className="h-11 min-h-11 rounded-xl text-xs font-bold gap-2 cursor-pointer"
                  >
                    <QrCode className="size-4" />
                    <span>Exibir QR Code</span>
                  </Button>
                )}
              </article>
            ))}
          </div>
        </section>
      )}

      {/* 5. Contratos */}
      {(filter === "all" || filter === "contracts") && data.contracts.length > 0 && (
        <section aria-label="Meus contratos" className="space-y-3">
          <h3 className="text-sm font-extrabold text-foreground">Contratos Digitais</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {data.contracts.map((ct) => (
              <article
                key={ct.id}
                className="rounded-2xl border border-border bg-card p-4 flex flex-col justify-between gap-3"
              >
                <div className="space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="text-sm font-bold text-foreground truncate">{ct.title}</h4>
                    <Badge variant="outline">{STATUS_LABELS[ct.status] || ct.status}</Badge>
                  </div>
                  {ct.verification_code && (
                    <p className="text-xs font-mono text-muted-foreground">
                      Autenticidade: {ct.verification_code}
                    </p>
                  )}
                </div>
                {ct.public_token ? (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() =>
                      setEmbeddedViewer({
                        title: ct.title || "Contrato Digital",
                        url: `/assinar/${ct.public_token}`,
                      })
                    }
                    className="h-11 min-h-11 rounded-xl text-xs font-bold cursor-pointer"
                  >
                    Visualizar / Assinar
                  </Button>
                ) : (
                  <span className="text-xs font-medium text-muted-foreground">
                    {ct.signed_at ? `Assinado em ${formatDate(ct.signed_at)}` : "Em emissão"}
                  </span>
                )}
              </article>
            ))}
          </div>
        </section>
      )}

      {/* 6. Carnês & Financeiro */}
      {(filter === "all" || filter === "receivables") && data.receivables.length > 0 && (
        <section aria-label="Meu financeiro e parcelas" className="space-y-3">
          <h3 className="text-sm font-extrabold text-foreground">Financeiro, Carnês & Parcelas</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {data.receivables.map((rec) => (
              <article key={rec.id} className="rounded-2xl border border-border bg-card p-4 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <h4 className="text-sm font-bold text-foreground">{rec.title}</h4>
                    <p className="text-xs text-muted-foreground font-mono">
                      Em aberto: {formatMoney(rec.remaining_cents)}
                    </p>
                  </div>
                  <Badge variant="outline">{STATUS_LABELS[rec.status] || rec.status}</Badge>
                </div>

                <div className="space-y-2 border-t border-border/60 pt-2">
                  {rec.installments.slice(0, 6).map((inst) => (
                    <div
                      key={inst.id}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-muted/40 p-3 text-xs"
                    >
                      <div>
                        <p className="font-bold text-foreground">
                          Parcela {inst.installment_number} · {formatMoney(inst.amount_cents)}
                        </p>
                        <p className="text-muted-foreground font-mono">
                          Vencimento: {formatDate(inst.due_date)}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        {inst.status === "paid" ? (
                          <span className="inline-flex items-center gap-1 text-emerald-600 font-bold">
                            <CheckCircle className="size-4" weight="fill" />
                            Pago
                          </span>
                        ) : (
                          <>
                            {inst.pix_copy_paste && (
                              <Button
                                type="button"
                                variant="outline"
                                onClick={() => handleCopyPix(inst.pix_copy_paste!)}
                                className="h-11 min-h-11 px-3 rounded-xl text-xs font-bold gap-1 cursor-pointer"
                              >
                                <Copy className="size-3.5" />
                                <span>PIX</span>
                              </Button>
                            )}
                            <Button
                              type="button"
                              variant="secondary"
                              onClick={() => {
                                setSelectedInstallmentId(inst.id);
                                setSelectedInstallmentLabel(
                                  `${rec.title} — Parcela ${inst.installment_number}`,
                                );
                                setProofModalOpen(true);
                              }}
                              className="h-11 min-h-11 px-3 rounded-xl text-xs font-bold gap-1 cursor-pointer"
                            >
                              <Upload className="size-3.5" />
                              <span>Comprovante</span>
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      {/* 7. Chat Direto Isolado (Empresa <-> Cliente) */}
      {(filter === "all" || filter === "chat") && (
        <section aria-label="Chat direto com a empresa" className="space-y-3">
          <AppClientPortalChatView
            storeId={storeId}
            storeName={storeName}
            accessToken={accessToken}
          />
        </section>
      )}

      {/* 8. Chamados de Suporte / SAC Escopados */}
      {(filter === "all" || filter === "support_tickets") && (
        <section aria-label="Meus chamados de suporte" className="space-y-3">
          <AppClientPortalTicketsView
            storeId={storeId}
            storeName={storeName}
            accessToken={accessToken}
            orders={data.orders?.map((o) => ({ id: o.id, order_number: o.order_number ?? undefined }))}
          />
        </section>
      )}

      {/* Modal de Envio de Comprovante de Parcela */}
      <Dialog open={proofModalOpen} onOpenChange={setProofModalOpen}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">Enviar Comprovante</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              {selectedInstallmentLabel}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-xs font-bold">Foto ou PDF do comprovante</Label>
              <ImageUpload
                value={proofUrl}
                onChange={setProofUrl}
                onRemove={() => setProofUrl("")}
                bucket="receipts"
                aspectPreset="free"
                label="Anexar comprovante"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold">Observações (opcional)</Label>
              <Textarea
                value={proofNotes}
                onChange={(e) => setProofNotes(e.target.value)}
                placeholder="Ex: Transferência PIX enviada hoje"
                className="text-xs"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setProofModalOpen(false)}
              className="h-11 min-h-11"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              disabled={!proofUrl || !selectedInstallmentId || isSubmittingProof}
              onClick={() => {
                if (!selectedInstallmentId || !proofUrl) return;
                sendProof({
                  data: {
                    installmentId: selectedInstallmentId,
                    proofUrl,
                    notes: proofNotes || undefined,
                    storeId,
                    accessToken: accessToken || undefined,
                  },
                });
              }}
              className="h-11 min-h-11 font-bold"
            >
              {isSubmittingProof ? "Enviando..." : "Confirmar Envio"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal QR Code do Ingresso dentro do App da Empresa */}
      <Dialog open={Boolean(ticketQrState)} onOpenChange={() => setTicketQrState(null)}>
        <DialogContent className="max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">
              {ticketQrState?.title || "Ingresso"}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground font-mono">
              Código: {ticketQrState?.code}
            </DialogDescription>
          </DialogHeader>
          {ticketQrState?.code && (
            <div className="flex flex-col items-center gap-3 py-2">
              <div className="p-3 rounded-2xl border border-border bg-background">
                <img
                  src={generateQrCodeDataUri(ticketQrState.code)}
                  alt={`QR Code do ingresso ${ticketQrState.code}`}
                  className="size-48"
                />
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={async () => {
                  await navigator.clipboard.writeText(ticketQrState.code);
                  toast.success("Código do ingresso copiado!");
                }}
                className="w-full h-11 min-h-11 rounded-xl text-xs font-bold gap-2 cursor-pointer"
              >
                <Copy className="size-4" />
                <span>Copiar Código</span>
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal Inline Resumo do Pedido dentro do App da Empresa */}
      <Dialog open={Boolean(inspectedOrder)} onOpenChange={() => setInspectedOrder(null)}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">
              Pedido #{inspectedOrder?.order_number || String(inspectedOrder?.id || "").slice(0, 8).toUpperCase()}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              {inspectedOrder?.created_at ? formatDate(inspectedOrder.created_at) : ""} ·{" "}
              {STATUS_LABELS[inspectedOrder?.status || "pending"] || inspectedOrder?.status}
            </DialogDescription>
          </DialogHeader>
          {inspectedOrder && (
            <div className="space-y-3 text-xs">
              {Array.isArray(inspectedOrder.items) && inspectedOrder.items.length > 0 ? (
                <div className="rounded-xl border border-border divide-y divide-border/60">
                  {inspectedOrder.items.map((it: any) => (
                    <div key={it.id} className="p-3 flex items-center justify-between gap-2">
                      <span className="font-semibold text-foreground">{it.product_title}</span>
                      {it.item_type && (
                        <Badge variant="outline" className="text-2xs uppercase">
                          {it.item_type}
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground">
                  {inspectedOrder.first_item_title || `${inspectedOrder.items_count} item(ns) no pedido`}
                </p>
              )}
              <div className="flex items-center justify-between pt-2 border-t border-border/60">
                <span className="font-semibold text-muted-foreground">Total</span>
                <span className="text-base font-black font-mono text-foreground">
                  {formatMoney(Number(inspectedOrder.total_cents || 0))}
                </span>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal Inline Detalhes da Viagem dentro do App da Empresa */}
      <Dialog open={Boolean(inspectedTrip)} onOpenChange={() => setInspectedTrip(null)}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">{inspectedTrip?.title || "Viagem"}</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              {inspectedTrip?.destination || storeName}
            </DialogDescription>
          </DialogHeader>
          {inspectedTrip && (
            <div className="space-y-3 text-xs">
              <div className="rounded-xl border border-border bg-muted/30 p-3 space-y-2">
                {inspectedTrip.locator_code && (
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-muted-foreground">Localizador</span>
                    <span className="font-mono font-bold text-foreground">{inspectedTrip.locator_code}</span>
                  </div>
                )}
                {inspectedTrip.departure_date && (
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-muted-foreground">Embarque</span>
                    <span className="font-mono text-foreground">{formatDate(inspectedTrip.departure_date)}</span>
                  </div>
                )}
                {inspectedTrip.return_date && (
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-muted-foreground">Retorno</span>
                    <span className="font-mono text-foreground">{formatDate(inspectedTrip.return_date)}</span>
                  </div>
                )}
                <div className="flex items-center justify-between gap-2">
                  <span className="text-muted-foreground">Status</span>
                  <Badge variant="outline">{STATUS_LABELS[inspectedTrip.status] || inspectedTrip.status}</Badge>
                </div>
              </div>
              {typeof inspectedTrip.total_cents === "number" && inspectedTrip.total_cents > 0 && (
                <div className="flex items-center justify-between pt-2 border-t border-border/60">
                  <span className="font-semibold text-muted-foreground">Valor</span>
                  <span className="text-base font-black font-mono text-foreground">
                    {formatMoney(inspectedTrip.total_cents)}
                  </span>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal Integrado para Visualização de Propostas, Contratos & Vouchers sem sair do App */}
      <Dialog open={Boolean(embeddedViewer)} onOpenChange={() => setEmbeddedViewer(null)}>
        <DialogContent className="max-w-4xl w-full h-dvh sm:h-160 p-0 overflow-hidden rounded-2xl flex flex-col z-50">
          <DialogHeader className="p-4 border-b border-border bg-card shrink-0">
            <DialogTitle className="text-sm font-bold truncate">
              {embeddedViewer?.title || "Visualizador do Cliente"}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              {storeName} · Visualização segura dentro do aplicativo
            </DialogDescription>
          </DialogHeader>
          {embeddedViewer?.url && (
            <iframe
              src={embeddedViewer.url}
              title={embeddedViewer.title}
              className="flex-1 w-full border-0 bg-background"
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
