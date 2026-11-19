import { useEffect, useState } from "react";
import {
  Target,
  Plane,
  ShoppingBag,
  Calendar,
  Copy,
  Send,
  ExternalLink,
  CheckCircle2,
  Circle,
  Plus,
  FileText,
  BadgePercent,
  Search,
  Link2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { formatBRL, cn } from "@/lib/utils";
import { formatDate } from "@/lib/datetime";
import { searchStoreCrmLeads } from "@/services/chat-quick-actions.functions";
import type { QuickComposerModalKind } from "@/components/chat/ChatQuickComposerModals";
import { toast } from "sonner";

const FUNNEL_STAGES = [
  { value: "new", label: "Novo Lead" },
  { value: "contacted", label: "Em Contato" },
  { value: "qualified", label: "Qualificado" },
  { value: "proposal", label: "Proposta / Orcamento" },
  { value: "negotiation", label: "Em Negociacao" },
  { value: "won", label: "Fechado (Ganho)" },
  { value: "lost", label: "Perdido" },
] as const;

interface C360LeadAndCommerceViewProps {
  mode: "lead" | "quotes" | "vertical";
  niche?: string;
  storeId?: string;
  threadId?: string;
  data: any;
  onFunnelStageChange: (leadId: string, nextStage: string) => Promise<void>;
  onLinkLead?: (leadId: string | null) => Promise<void>;
  onQuickCreateLead?: () => void;
  onQuickSendMessage?: (text: string) => void;
  onOpenQuickComposerModal?: (modal: QuickComposerModalKind) => void;
}

export function C360LeadAndCommerceView({
  mode,
  niche = "general",
  storeId,
  threadId,
  data,
  onFunnelStageChange,
  onLinkLead,
  onQuickCreateLead,
  onQuickSendMessage,
  onOpenQuickComposerModal,
}: C360LeadAndCommerceViewProps) {
  const [leadTab, setLeadTab] = useState<"geral" | "checklist" | "cotacoes">("geral");
  const [selectedTripId, setSelectedTripId] = useState<string | null>(null);
  const [leadSearchOpen, setLeadSearchOpen] = useState(false);
  const [leadQuery, setLeadQuery] = useState("");
  const [leadSearchResults, setLeadSearchResults] = useState<any[]>([]);
  const [isSearchingLeads, setIsSearchingLeads] = useState(false);

  useEffect(() => {
    if (!leadSearchOpen || !storeId) return;
    let active = true;
    setIsSearchingLeads(true);
    searchStoreCrmLeads({ data: { storeId, query: leadQuery.trim() || undefined, limit: 15 } })
      .then((rows) => {
        if (active) setLeadSearchResults(rows || []);
      })
      .catch(() => {
        if (active) setLeadSearchResults([]);
      })
      .finally(() => {
        if (active) setIsSearchingLeads(false);
      });
    return () => {
      active = false;
    };
  }, [leadSearchOpen, leadQuery, storeId]);

  const linkedLead = data?.linkedLead || null;
  const opportunities: any[] = Array.isArray(data?.opportunities) ? data.opportunities : [];
  const quotes: any[] = Array.isArray(data?.quotes) ? data.quotes : [];
  const trips: any[] = Array.isArray(data?.trips) ? data.trips : [];
  const orders: any[] = Array.isArray(data?.orders) ? data.orders : [];
  const appointments: any[] = Array.isArray(data?.appointments) ? data.appointments : [];
  const travelDossiers: any[] = Array.isArray(data?.travelDossiers) ? data.travelDossiers : [];

  const copyAndToast = async (url: string, label: string) => {
    await navigator.clipboard.writeText(url);
    toast.success(`${label} copiado!`);
  };

  if (mode === "lead") {
    const activeLead = linkedLead || opportunities[0] || null;
    const checklist: any[] = Array.isArray(activeLead?.checklist) ? activeLead.checklist : [];

    return (
      <div className="space-y-3">
        {threadId && onLinkLead && (
          <div className="rounded-xl border border-border/70 bg-card p-3 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold text-foreground inline-flex items-center gap-1">
                <Link2 className="size-3.5 text-primary" />
                <span>Vinculo com Lead do CRM</span>
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setLeadSearchOpen((prev) => !prev)}
                className="h-11 sm:h-8 min-h-11 sm:min-h-8 px-3 rounded-lg text-xs font-semibold gap-1 cursor-pointer"
              >
                <Search className="size-3.5" />
                <span>{leadSearchOpen ? "Fechar Busca" : "Buscar Lead"}</span>
              </Button>
            </div>

            {leadSearchOpen && (
              <div className="space-y-2 pt-1">
                <Input
                  value={leadQuery}
                  onChange={(e) => setLeadQuery(e.target.value)}
                  placeholder="Nome, titulo, telefone ou destino..."
                  className="h-11 sm:h-9 text-xs"
                />
                <div className="max-h-44 overflow-y-auto space-y-1">
                  {isSearchingLeads ? (
                    <p className="text-xs text-muted-foreground py-2 text-center">Buscando leads...</p>
                  ) : leadSearchResults.length === 0 ? (
                    <p className="text-xs text-muted-foreground py-2 text-center">Nenhum lead encontrado.</p>
                  ) : (
                    leadSearchResults.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={async () => {
                          await onLinkLead(item.id);
                          setLeadSearchOpen(false);
                        }}
                        className="w-full min-h-11 px-3 py-2 rounded-lg border border-border/60 bg-background hover:bg-muted/50 text-left flex items-center justify-between gap-2 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                      >
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-foreground truncate">
                            {item.title || item.full_name}
                          </p>
                          <p className="text-2xs text-muted-foreground truncate">
                            {item.full_name}{item.phone ? ` · ${item.phone}` : ""}
                          </p>
                        </div>
                        <Badge variant="outline" className="text-2xs shrink-0">
                          {activeLead?.id === item.id ? "Vinculado" : "Vincular"}
                        </Badge>
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {!activeLead ? (
          <div className="rounded-xl border border-dashed border-border p-4 text-center space-y-2">
            <Target className="size-5 text-muted-foreground mx-auto" />
            <p className="text-xs font-medium text-foreground">Nenhuma oportunidade vinculada</p>
            <div className="flex flex-wrap items-center justify-center gap-2">
              {onQuickCreateLead && (
                <Button
                  type="button"
                  size="sm"
                  variant="default"
                  onClick={onQuickCreateLead}
                  className="min-h-11 sm:min-h-9 h-11 sm:h-9 rounded-lg text-xs font-semibold cursor-pointer"
                >
                  <Plus className="size-3.5 mr-1" />
                  <span>Criar Novo Lead</span>
                </Button>
              )}
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => onOpenQuickComposerModal?.("lead")}
                className="min-h-11 sm:min-h-9 h-11 sm:h-9 rounded-lg text-xs cursor-pointer"
              >
                <Search className="size-3.5 mr-1" />
                <span>Vincular Existente</span>
              </Button>
            </div>
          </div>
        ) : (
          <>
            {/* Cabecalho compacto do Card do Funil dentro do painel */}
            <div className="rounded-xl border border-border bg-card p-3 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <span className="text-xs font-medium text-muted-foreground block">
                    Lead Vinculado no CRM
                  </span>
                  <h4 className="text-sm font-semibold text-foreground truncate">
                    {activeLead.title || activeLead.full_name || activeLead.destination_of_interest || "Oportunidade"}
                  </h4>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {onLinkLead && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => void onLinkLead(null)}
                      className="size-11 p-0 text-muted-foreground hover:text-destructive focus-visible:ring-2 focus-visible:ring-primary"
                      title="Desvincular lead"
                      aria-label="Desvincular lead"
                    >
                      <X className="size-3.5" />
                    </Button>
                  )}
                  <a
                    href={`/workspace/comercial?leadId=${encodeURIComponent(activeLead.id)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs font-medium text-primary hover:underline inline-flex items-center gap-1 shrink-0"
                  >
                    Kanban
                    <ExternalLink className="size-3" />
                  </a>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs text-muted-foreground block">Fase Atual</label>
                <select
                  value={activeLead.status || "new"}
                  onChange={(e) => onFunnelStageChange(activeLead.id, e.target.value)}
                  className="w-full h-11 sm:h-9 rounded-lg border border-border bg-background px-3 text-xs font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  {FUNNEL_STAGES.map((st) => (
                    <option key={st.value} value={st.value}>
                      {st.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Abas do Card dentro do painel */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-1 p-1 rounded-lg bg-muted/50 border border-border/60">
              {(
                [
                  { id: "geral", label: "Geral" },
                  { id: "checklist", label: `Checklist (${checklist.length})` },
                  { id: "cotacoes", label: `CotaÃ§Ãµes (${quotes.length})` },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setLeadTab(tab.id)}
                  className={cn(
                    "min-h-11 sm:min-h-8 rounded-md text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                    leadTab === tab.id
                      ? "bg-background text-foreground  border border-border/60"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {leadTab === "geral" && (
              <div className="rounded-xl border border-border bg-card p-3 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Valor Estimado</span>
                  <span className="font-semibold text-foreground">
                    {formatBRL(activeLead.estimated_budget || activeLead.estimated_value_cents || 0)}
                  </span>
                </div>
                {activeLead.destination_of_interest && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Interesse / Destino</span>
                    <span className="font-medium text-foreground">{activeLead.destination_of_interest}</span>
                  </div>
                )}
                {activeLead.notes && (
                  <div className="pt-2 border-t border-border/60 space-y-1">
                    <span className="text-muted-foreground font-medium block">AnotaÃ§Ãµes do Lead</span>
                    <p className="text-foreground whitespace-pre-line break-words leading-relaxed">
                      {activeLead.notes}
                    </p>
                  </div>
                )}
              </div>
            )}

            {leadTab === "checklist" && (
              <div className="rounded-xl border border-border bg-card p-3 space-y-2">
                {checklist.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-3">
                    Nenhum item de checklist registrado neste lead.
                  </p>
                ) : (
                  checklist.map((item: any, idx: number) => (
                    <div key={item.id || idx} className="flex items-start gap-2 text-xs">
                      {item.done || item.completed ? (
                        <CheckCircle2 className="size-4 text-emerald-600 shrink-0 mt-1" />
                      ) : (
                        <Circle className="size-4 text-muted-foreground shrink-0 mt-1" />
                      )}
                      <span className={cn(item.done || item.completed ? "line-through text-muted-foreground" : "text-foreground")}>
                        {item.label || item.title || String(item)}
                      </span>
                    </div>
                  ))
                )}
              </div>
            )}

            {leadTab === "cotacoes" && (
              <QuotesList
                quotes={quotes}
                onCopy={copyAndToast}
                onQuickSendMessage={onQuickSendMessage}
                onOpenNewQuote={() => onOpenQuickComposerModal?.("quote")}
              />
            )}
          </>
        )}
      </div>
    );
  }

  if (mode === "quotes") {
    return (
      <QuotesList
        quotes={quotes}
        onCopy={copyAndToast}
        onQuickSendMessage={onQuickSendMessage}
        onOpenNewQuote={() => onOpenQuickComposerModal?.("quote")}
      />
    );
  }

  // mode === "vertical" (Multi-nicho: Turismo, Varejo/Pedidos, SaÃºde/Agenda)
  const isTourism = /turis|viag|agenc/i.test(niche) || trips.length > 0 || travelDossiers.length > 0;
  const selectedTrip = trips.find((t) => t.id === selectedTripId) || trips[0] || null;

  return (
    <div className="space-y-3">
      {isTourism && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-foreground flex items-center gap-2">
              <Plane className="size-3.5 text-primary" />
              Viagens & Embarques ({trips.length})
            </span>
            <a
              href="/workspace/turismo/embarques"
              target="_blank"
              rel="noreferrer"
              className="text-xs font-medium text-primary hover:underline inline-flex items-center gap-1"
            >
              Embarques
              <ExternalLink className="size-3" />
            </a>
          </div>

          {trips.length === 0 ? (
            <p className="text-xs text-muted-foreground rounded-xl border border-dashed border-border p-3 text-center">
              Nenhuma viagem fechada vinculada.
            </p>
          ) : (
            <div className="space-y-2">
              {trips.map((tr) => {
                const isSelected = selectedTrip?.id === tr.id;
                const steps = (tr.financial_details as any)?.cs_onboarding_steps || {};
                const completedCount = Object.values(steps).filter(Boolean).length;
                return (
                  <button
                    key={tr.id}
                    type="button"
                    onClick={() => setSelectedTripId(tr.id)}
                    className={cn(
                      "w-full text-left rounded-xl border p-3 space-y-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                      isSelected ? "border-primary bg-primary/5" : "border-border bg-card hover:bg-muted/30",
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-foreground truncate">
                        {tr.title || tr.destination_city || "Viagem"}
                      </span>
                      <Badge variant="outline" className="text-xs shrink-0">
                        {tr.status || "confirmada"}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>
                        Embarque: {tr.travel_start_date ? formatDate(tr.travel_start_date) : "A definir"}
                      </span>
                      <span>Checklist: {completedCount}/7</span>
                    </div>
                  </button>
                );
              })}

              {selectedTrip && (
                <div className="rounded-xl border border-border bg-muted/20 p-3 space-y-2 text-xs">
                  <span className="font-semibold text-foreground block">
                    Detalhes RÃ¡pidos â€” {selectedTrip.destination_city || selectedTrip.title}
                  </span>
                  <div className="text-muted-foreground space-y-1">
                    <div>Localizador / NÂº: {selectedTrip.trip_number || "â€”"}</div>
                    <div>
                      PerÃ­odo: {selectedTrip.travel_start_date ? formatDate(selectedTrip.travel_start_date) : "â€”"} atÃ©{" "}
                      {selectedTrip.travel_end_date ? formatDate(selectedTrip.travel_end_date) : "â€”"}
                    </div>
                    <div>Valor Total: {formatBRL(selectedTrip.total_cents || 0)}</div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Pedidos & Compras (Universal / Varejo / Delivery) */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-foreground flex items-center gap-2">
            <ShoppingBag className="size-3.5 text-primary" />
            Pedidos & Compras ({orders.length})
          </span>
          <a
            href="/workspace/pedidos"
            target="_blank"
            rel="noreferrer"
            className="text-xs font-medium text-primary hover:underline inline-flex items-center gap-1"
          >
            Pedidos
            <ExternalLink className="size-3" />
          </a>
        </div>
        {orders.length === 0 ? (
          <p className="text-xs text-muted-foreground rounded-xl border border-dashed border-border p-3 text-center">
            Nenhum pedido registrado para este cliente.
          </p>
        ) : (
          <div className="space-y-2">
            {orders.slice(0, 6).map((ord) => (
              <div key={ord.id} className="rounded-xl border border-border bg-card p-3 flex items-center justify-between gap-2 text-xs">
                <div className="min-w-0">
                  <span className="font-semibold text-foreground block">
                    Pedido #{String(ord.id).slice(-6).toUpperCase()}
                  </span>
                  <span className="text-muted-foreground">
                    {formatDate(ord.created_at)} {ord.payment_method ? `Â· ${ord.payment_method}` : ""}
                  </span>
                </div>
                <div className="text-right shrink-0">
                  <span className="font-semibold text-foreground block">
                    {formatBRL(ord.total_amount_cents || ord.total_cents || 0)}
                  </span>
                  <Badge variant="outline" className="text-xs">
                    {ord.status}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Agendamentos (SaÃºde / Beleza / ServiÃ§os) */}
      {appointments.length > 0 && (
        <div className="space-y-2">
          <span className="text-xs font-semibold text-foreground flex items-center gap-2">
            <Calendar className="size-3.5 text-primary" />
            Agendamentos ({appointments.length})
          </span>
          <div className="space-y-2">
            {appointments.slice(0, 5).map((apt) => (
              <div key={apt.id} className="rounded-xl border border-border bg-card p-3 flex items-center justify-between gap-2 text-xs">
                <div>
                  <span className="font-medium text-foreground block">
                    {formatDate(apt.start_time)}
                  </span>
                  {apt.notes && <span className="text-muted-foreground line-clamp-1">{apt.notes}</span>}
                </div>
                <Badge variant="outline" className="text-xs">
                  {apt.status}
                </Badge>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function QuotesList({
  quotes,
  onCopy,
  onQuickSendMessage,
  onOpenNewQuote,
}: {
  quotes: any[];
  onCopy: (url: string, label: string) => void;
  onQuickSendMessage?: (text: string) => void;
  onOpenNewQuote: () => void;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-semibold text-foreground flex items-center gap-2">
          <BadgePercent className="size-3.5 text-primary" />
          Cotações & Propostas ({quotes.length})
        </span>
        <Button
          type="button"
          size="sm"
          onClick={onOpenNewQuote}
          className="min-h-11 sm:min-h-8 h-8 rounded-lg text-xs"
        >
          <Plus className="size-3.5 mr-1" />
          Nova CotaÃ§Ã£o
        </Button>
      </div>

      {quotes.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-4 text-center space-y-1">
          <FileText className="size-5 text-muted-foreground mx-auto" />
          <p className="text-xs text-muted-foreground">Nenhuma cotaÃ§Ã£o ou proposta encontrada.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {quotes.map((q) => {
            const url = q.public_token
              ? `${typeof window !== "undefined" ? window.location.origin : "https://waesy.com.br"}/proposta/${q.public_token}`
              : null;
            return (
              <div key={q.id} className="rounded-xl border border-border bg-card p-3 space-y-2 text-xs">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <span className="font-semibold text-foreground block truncate">
                      {q.title || q.destination || "Proposta"}
                    </span>
                    <span className="text-muted-foreground">
                      {q.quote_number ? `#${q.quote_number} Â· ` : ""}
                      {formatBRL(q.total_cents || 0)}
                    </span>
                  </div>
                  <Badge variant="outline" className="text-xs shrink-0">
                    {q.status || "rascunho"}
                  </Badge>
                </div>

                {url && (
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => onCopy(url, "Link da proposta")}
                      className="min-h-11 sm:min-h-8 h-8 rounded-lg text-xs flex-1"
                    >
                      <Copy className="size-3.5 mr-1" />
                      Copiar Link
                    </Button>
                    {onQuickSendMessage && (
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => {
                          onQuickSendMessage(`Segue o link da sua proposta (${q.title || "Proposta"}):\n${url}`);
                          toast.success("Proposta enviada no chat!");
                        }}
                        className="min-h-11 sm:min-h-8 h-8 rounded-lg text-xs"
                      >
                        <Send className="size-3.5 mr-1" />
                        Enviar
                      </Button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
