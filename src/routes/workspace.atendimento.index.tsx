import { cn } from "@/lib/utils";
import { createFileRoute } from "@tanstack/react-router";
import React, { useState, useEffect, useRef, useMemo } from "react";
import {
 listChatThreads,
 getChatMessages,
 sendChatMessage,
 assignChatThread,
 updateTicketStatus,
} from "@/services/chat.functions";
import { getStoreSettings } from "@/services/store.functions";
import { getNicheSemantics } from "@/lib/niche-semantics";
import { getBrowserClient } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
 Select,
 SelectContent,
 SelectItem,
 SelectTrigger,
 SelectValue,
} from "@/components/ui/select";
import {
 Sheet,
 SheetContent,
 SheetHeader,
 SheetTitle,
 SheetFooter,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { MessageSquare, ArrowLeft, Search, Filter, Send, UserCheck, Building2, Clock, CheckCircle2, AlertTriangle, Package, DollarSign, Info, Loader2, RefreshCw, Layers, ShieldCheck, Bot, Sparkles, Flame, Target, HelpCircle, Copy, ExternalLink, MessageCircle } from 'lucide-react';
import { toast } from "sonner";
import { formatDate, formatRelativeTime } from "@/lib/datetime";
import { formatMoney } from "@/lib/money";
import { OrderMessageCard } from "@/components/chat/order-message-card";
import { RmaMessageCard } from "@/components/chat/rma-message-card";
import { Customer360Sidebar } from "@/components/chat/customer-360-sidebar";
import { playMessageChime } from "@/lib/audio-chimes";
import { listSdrChatSessions, type SdrChatSessionDTO } from "@/services/ai-sdr.functions";
import { Link } from "@tanstack/react-router";

export const Route = createFileRoute("/workspace/atendimento/")({
  head: () => ({ meta: [{ title: "Central de Atendimento Omnichannel | Waesy" }] }),
  loader: async () => {
    try {
      const [res, store, sdrData] = await Promise.all([
        listChatThreads().catch(() => null),
        getStoreSettings().catch(() => null),
        listSdrChatSessions().catch(() => ({ sessions: [], metrics: { total: 0, readyToBuy: 0, warm: 0, curious: 0 } })),
      ]);
      return {
        ...(res || { threads: [], metrics: { total: 0, open: 0, closed: 0, avg_rating: 5, sla_first_response_min: 0 } }),
        store,
        sdrSessions: sdrData?.sessions || [],
        sdrMetrics: sdrData?.metrics || { total: 0, readyToBuy: 0, warm: 0, curious: 0 },
      };
    } catch (e) {
      console.warn("[workspace.atendimento] Fallback de segurança no loader:", e);
      return {
        threads: [],
        metrics: { total: 0, open: 0, closed: 0, avg_rating: 5, sla_first_response_min: 0 },
        store: null,
        sdrSessions: [],
        sdrMetrics: { total: 0, readyToBuy: 0, warm: 0, curious: 0 },
      };
    }
  },
  component: WorkspaceAtendimentoPage,
});

const DEPARTMENT_LABELS: Record<string, string> = {
 geral: "Geral",
 vendas: "Vendas / Comercial",
 suporte: "Suporte / SAC",
 financeiro: "Financeiro / Pix",
 cozinha_estoque: "Cozinha / Estoque",
 logistica: "Logística / Motoboy",
};

function WorkspaceAtendimentoPage() {
  const {
    threads: initialThreads,
    metrics,
    isSupervisor,
    store,
    sdrSessions: initialSdrSessions,
    sdrMetrics: initialSdrMetrics,
  } = (Route.useLoaderData?.() as any) || {};
  const semantics = useMemo(() => getNicheSemantics(store), [store]);
  const departmentLabels = semantics.departmentLabels || DEPARTMENT_LABELS;

  // Tabs de Modo: Atendimento Humano vs Conversas SDR
  const [activeHubTab, setActiveHubTab] = useState<"live" | "sdr">("live");

  // Estados SDR
  const [sdrSessions] = useState<SdrChatSessionDTO[]>(initialSdrSessions || []);
  const [sdrMetrics] = useState(initialSdrMetrics || { total: 0, readyToBuy: 0, warm: 0, curious: 0 });
  const [sdrIntentFilter, setSdrIntentFilter] = useState<string>("all");
  const [sdrSearchTerm, setSdrSearchTerm] = useState("");
  const [selectedSdrSession, setSelectedSdrSession] = useState<SdrChatSessionDTO | null>(null);
  const [sdrDrawerOpen, setSdrDrawerOpen] = useState(false);

  const [threads, setThreads] = useState<any[]>(initialThreads);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(
    initialThreads.length > 0 ? initialThreads[0].id : null,
  );
  const [messages, setMessages] = useState<any[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [text, setText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [deptFilter, setDeptFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [showCustomer360, setShowCustomer360] = useState(true);

  // Ticket Resolver Modal state
  const [ticketModalOpen, setTicketModalOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<any>(null);
  const [ticketStatus, setTicketStatus] = useState<any>("resolved");
  const [resolutionNotes, setResolutionNotes] = useState("");
  const [isResolvingTicket, setIsResolvingTicket] = useState(false);

  const activeThread = threads.find((t) => t.id === activeThreadId);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  const filteredSdrSessions = useMemo(() => {
    return sdrSessions.filter((s) => {
      if (sdrIntentFilter !== "all" && s.intent_classification !== sdrIntentFilter) {
        return false;
      }
      if (sdrSearchTerm.trim()) {
        const q = sdrSearchTerm.toLowerCase();
        const title = s.classified?.title?.toLowerCase() || "";
        const summary = s.summary?.toLowerCase() || "";
        return title.includes(q) || summary.includes(q);
      }
      return true;
    });
  }, [sdrSessions, sdrIntentFilter, sdrSearchTerm]);

 // Carrega mensagens da thread ativa
 useEffect(() => {
 if (!activeThreadId) {
 setMessages([]);
 return;
 }

 let mounted = true;
 setLoadingMessages(true);
 getChatMessages({ data: { threadId: activeThreadId } })
 .then((res) => {
 if (mounted) setMessages(res.messages || []);
 })
 .catch((err) => {
 toast.error("Erro ao carregar mensagens da conversa.");
 })
 .finally(() => {
 if (mounted) setLoadingMessages(false);
 });

 return () => {
 mounted = false;
 };
 }, [activeThreadId]);

 // Scroll suave ao receber nova mensagem
 useEffect(() => {
 if (chatContainerRef.current) {
 chatContainerRef.current.scrollTo({
 top: chatContainerRef.current.scrollHeight,
 behavior: "smooth",
 });
 }
 }, [messages]);
 // Realtime Supabase
 useEffect(() => {
 if (!activeThreadId) return;

 const supabase = getBrowserClient();
 const channel = supabase
 .channel(`staff-chat-${activeThreadId}`)
 .on(
 "postgres_changes",
 {
 event: "INSERT",
 schema: "public",
 table: "chat_messages",
 filter: `thread_id=eq.${activeThreadId}`,
 },
 (payload) => {
 const newMsg = {
 id: payload.new.id,
 message: payload.new.message,
 message_type: payload.new.message_type || "text",
 is_staff_reply: payload.new.is_staff_reply,
 created_at: payload.new.created_at,
 attachments: payload.new.attachments || [],
 payload: payload.new.payload || {},
 };

 if (!payload.new.is_staff_reply) {
 playMessageChime();
 }

 setMessages((prev) => {
 if (prev.some((m) => m.id === newMsg.id)) return prev;
 return [...prev, newMsg];
 });
 },
 )
 .subscribe((status) => {
 if (status === "SUBSCRIBED") {
 getChatMessages({ data: { threadId: activeThreadId } })
 .then((res) => {
 setMessages(res.messages || []);
 })
 .catch(console.error);
 }
 });

 return () => {
 supabase.removeChannel(channel);
 };
 }, [activeThreadId]);

 // Enviar Mensagem do Staff
 const handleSend = async (e: React.FormEvent) => {
 e.preventDefault();
 if (!text.trim() || !activeThreadId || isSending) return;

 const sent = text;
 setText("");
 setIsSending(true);

 const optimistic = {
 id: crypto.randomUUID(),
 message: sent,
 message_type: "text",
 is_staff_reply: true,
 created_at: new Date().toISOString(),
 attachments: [],
 payload: {},
 };
 setMessages((prev) => [...prev, optimistic]);

 try {
 await sendChatMessage({
 data: {
 threadId: activeThreadId,
 message: sent,
 message_type: "text",
 },
 });
 } catch (err: any) {
 toast.error(err.message || "Erro ao enviar resposta.");
 setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
 setText(sent);
 } finally {
 setIsSending(false);
 }
 };

 // Alterar Departamento da conversa
 const handleDepartmentChange = async (dept: string) => {
 if (!activeThreadId) return;
 try {
 await assignChatThread({
 data: {
 threadId: activeThreadId,
 department: dept,
 },
 });
 setThreads((prev) =>
 prev.map((t) => (t.id === activeThreadId ? { ...t, department: dept } : t)),
 );
 toast.success(`Conversa transferida para: ${DEPARTMENT_LABELS[dept] || dept}`);
 } catch (err: any) {
 toast.error(err.message || "Erro ao transferir conversa.");
 }
 };

 // Resolver Ticket SAC
 const handleResolveTicket = async () => {
 if (!selectedTicket) return;
 setIsResolvingTicket(true);
 try {
 await updateTicketStatus({
 data: {
 ticketId: selectedTicket.ticket_id || selectedTicket.id,
 status: ticketStatus,
 resolution_notes: resolutionNotes,
 },
 });
 toast.success("Ocorrência atualizada com sucesso!");
 setTicketModalOpen(false);
 // Recarrega mensagens
 if (activeThreadId) {
 const res = await getChatMessages({ data: { threadId: activeThreadId } });
 setMessages(res.messages || []);
 }
 } catch (err: any) {
 toast.error(err.message || "Erro ao atualizar chamado.");
 } finally {
 setIsResolvingTicket(false);
 }
 };

 // Filtragem de threads
 const filteredThreads = threads.filter((t) => {
 if (deptFilter !== "all" && t.department !== deptFilter) return false;
 if (statusFilter !== "all" && t.status !== statusFilter) return false;
 if (searchTerm) {
 const q = searchTerm.toLowerCase();
 const name = t.customer?.full_name?.toLowerCase() || "";
 const subj = t.subject?.toLowerCase() || "";
 const last = t.last_message?.toLowerCase() || "";
 if (!name.includes(q) && !subj.includes(q) && !last.includes(q)) return false;
 }
 return true;
 });

  return (
    <div className="flex flex-col h-[calc(100vh-80px)] font-sans text-foreground">
      {/* Top Header com Seletor de Modo: Atendimento em Tempo Real vs SDR IA */}
      <div className="bg-card border-b border-border/80 px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Building2 className="size-4 text-primary" />
            <span className="text-xs font-bold text-foreground hidden sm:inline">
              Central Omnichannel
            </span>
          </div>

          <div className="flex items-center gap-1.5 bg-muted/60 p-1 rounded-xl border border-border/60">
            <button
              type="button"
              onClick={() => setActiveHubTab("live")}
              className={cn(
                "px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer",
                activeHubTab === "live"
                  ? "bg-background text-foreground shadow-2xs font-bold"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <MessageSquare className="size-3.5" />
              <span>Atendimento Direto</span>
              {(metrics?.open || 0) > 0 && (
                <Badge variant="default" className="text-[10px] h-4 px-1.5 font-mono">
                  {metrics?.open}
                </Badge>
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveHubTab("sdr")}
              className={cn(
                "px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer",
                activeHubTab === "sdr"
                  ? "bg-background text-foreground shadow-2xs font-bold"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Bot className="size-3.5 text-primary" />
              <span>Conversas SDR (IA)</span>
              {sdrMetrics?.total > 0 && (
                <Badge variant="secondary" className="text-[10px] h-4 px-1.5 font-mono bg-primary/10 text-primary border border-primary/20">
                  {sdrMetrics.total}
                </Badge>
              )}
            </button>
          </div>
        </div>

        {activeHubTab === "live" && isSupervisor && (
          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="text-muted-foreground">Em Aberto:</span>
              <Badge variant="default" className="font-bold text-[10px] h-5">
                {metrics?.open || 0}
              </Badge>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-muted-foreground">SLA Médio:</span>
              <span className="font-bold text-foreground">{metrics?.sla_first_response_min} min</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-muted-foreground">CSAT:</span>
              <span className="font-extrabold text-emerald-600">⭐ {metrics?.avg_rating} / 5.0</span>
            </div>
          </div>
        )}

        {activeHubTab === "sdr" && (
          <div className="flex items-center gap-3 text-xs">
            <div className="flex items-center gap-1.5">
              <Target className="size-3.5 text-emerald-600" />
              <span className="text-muted-foreground">Prontos p/ Comprar:</span>
              <Badge variant="default" className="font-bold text-[10px] h-5 bg-emerald-600 hover:bg-emerald-600 text-white font-mono">
                {sdrMetrics?.readyToBuy || 0}
              </Badge>
            </div>
            <div className="flex items-center gap-1.5">
              <Flame className="size-3.5 text-amber-500" />
              <span className="text-muted-foreground">Quentes:</span>
              <span className="font-bold text-amber-600 dark:text-amber-400 font-mono">{sdrMetrics?.warm || 0}</span>
            </div>
          </div>
        )}
      </div>

      {/* RENDERIZAÇÃO CONDICIONAL DO HUB: SDR VS CHAT DIRETO */}
      {activeHubTab === "sdr" ? (
        <div className="flex-1 flex flex-col overflow-hidden bg-muted/15 p-4 sm:p-6 space-y-4">
          {/* Barra de Filtros SDR */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-card p-3 rounded-2xl border border-border/70 shadow-2xs">
            <div className="relative flex-1 max-w-md">
              <Search className="size-3.5 absolute left-3 top-3 text-muted-foreground" />
              <Input
                placeholder="Buscar por anúncio ou resumo da IA..."
                value={sdrSearchTerm}
                onChange={(e) => setSdrSearchTerm(e.target.value)}
                className="pl-8 h-9 rounded-xl text-xs bg-muted/40"
              />
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
              {[
                { id: "all", label: "Todas", count: sdrMetrics.total },
                { id: "ready_to_buy", label: "🎯 Pronto p/ Compra", count: sdrMetrics.readyToBuy },
                { id: "warm", label: "🔥 Interessado", count: sdrMetrics.warm },
                { id: "curious", label: "💡 Curioso", count: sdrMetrics.curious },
              ].map((pill) => (
                <button
                  key={pill.id}
                  type="button"
                  onClick={() => setSdrIntentFilter(pill.id)}
                  className={cn(
                    "px-2.5 py-1 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer flex items-center gap-1",
                    sdrIntentFilter === pill.id
                      ? "bg-primary text-primary-foreground font-bold shadow-2xs"
                      : "bg-muted/60 text-muted-foreground hover:text-foreground border border-border/50"
                  )}
                >
                  <span>{pill.label}</span>
                  <span className="text-[10px] opacity-75 font-mono">({pill.count})</span>
                </button>
              ))}
            </div>
          </div>

          {/* Grid de Conversas SDR */}
          <div className="flex-1 overflow-y-auto">
            {filteredSdrSessions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center space-y-3">
                <div className="size-12 rounded-2xl bg-muted/60 flex items-center justify-center text-muted-foreground">
                  <Bot className="size-6" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-bold text-foreground">Nenhuma conversa com SDR encontrada</p>
                  <p className="text-xs text-muted-foreground max-w-sm">
                    Quando clientes conversarem com a IA nos seus classificados, as mensagens e intenções de compra aparecerão aqui em tempo real.
                  </p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5 pb-12">
                {filteredSdrSessions.map((session) => {
                  const isReady = session.intent_classification === "ready_to_buy";
                  const isWarm = session.intent_classification === "warm";

                  return (
                    <div
                      key={session.id}
                      className={cn(
                        "p-4 rounded-2xl border transition-all flex flex-col justify-between space-y-3 bg-card shadow-2xs hover:shadow-xs",
                        isReady
                          ? "border-emerald-500/40 bg-emerald-500/[0.02]"
                          : isWarm
                          ? "border-amber-500/40 bg-amber-500/[0.02]"
                          : "border-border/70"
                      )}
                    >
                      <div className="space-y-2.5">
                        {/* Topo do Card: Badge de Intenção e Data */}
                        <div className="flex items-center justify-between gap-2">
                          <Badge
                            className={cn(
                              "text-[10px] font-bold uppercase tracking-wider px-2 py-0.5",
                              isReady
                                ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30"
                                : isWarm
                                ? "bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30"
                                : "bg-muted text-muted-foreground border border-border/60"
                            )}
                          >
                            {isReady
                              ? "🎯 Pronto para Comprar"
                              : isWarm
                              ? "🔥 Lead Quente"
                              : session.intent_classification === "curious"
                              ? "💡 Curioso / Dúvida"
                              : "Atendimento Geral"}
                          </Badge>

                          <span className="text-[11px] text-muted-foreground">
                            {formatRelativeTime(session.updated_at)}
                          </span>
                        </div>

                        {/* Anúncio Relacionado */}
                        {session.classified && (
                          <div className="space-y-0.5">
                            <h4 className="text-xs font-bold text-foreground line-clamp-1">
                              {session.classified.title}
                            </h4>
                            {session.classified.price_cents !== null && session.classified.price_cents !== undefined && (
                              <p className="text-[11px] font-semibold text-primary font-mono">
                                {session.classified.price_cents > 0 ? formatMoney(session.classified.price_cents) : "Sob Consulta"}
                              </p>
                            )}
                          </div>
                        )}

                        {/* Resumo da IA */}
                        {session.summary && (
                          <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed bg-muted/40 p-2.5 rounded-xl border border-border/40">
                            {session.summary}
                          </p>
                        )}
                      </div>

                      {/* Rodapé do Card: Contador de Mensagens e Botão de Ação */}
                      <div className="flex items-center justify-between pt-2 border-t border-border/40 text-xs">
                        <span className="text-muted-foreground text-[11px]">
                          💬 {session.message_count} mensagens
                        </span>

                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedSdrSession(session);
                            setSdrDrawerOpen(true);
                          }}
                          className="h-7 px-2.5 text-xs font-semibold rounded-lg gap-1 cursor-pointer"
                        >
                          Ver Diálogo
                          <ArrowLeft className="size-3 rotate-180" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Grid Principal: 3 Colunas (Threads | Chat | Customer 360) */
        <div className="flex-1 flex overflow-hidden">
          {/* COLUNA 1: Lista de Conversas & Filtros */}
          <div className={cn(
            "w-full md:w-80 lg:w-96 border-r border-border/80 bg-background flex flex-col shrink-0",
            activeThreadId ? "hidden md:flex" : "flex"
          )}>
            {/* Busca & Filtros Rápidos */}
            <div className="p-3 border-b border-border/80 space-y-2">
              <div className="relative">
                <Search className="size-3.5 absolute left-3 top-3 text-muted-foreground" />
                <Input
                  placeholder="Buscar por cliente, assunto..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8 h-9 rounded-xl text-xs bg-muted/40"
                />
              </div>

              <div className="grid grid-cols-2 gap-1.5">
                <Select value={deptFilter} onValueChange={setDeptFilter}>
                  <SelectTrigger className="h-8 rounded-xl text-[11px]">
                    <SelectValue placeholder="Departamento" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="all">Todos Setores</SelectItem>
                    {Object.entries(departmentLabels).map(([key, label]) => (
                      <SelectItem key={key} value={key}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="h-8 rounded-xl text-[11px]">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="all">Todos Status</SelectItem>
                    <SelectItem value="open">Abertos</SelectItem>
                    <SelectItem value="closed">Encerrados</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Lista de Threads */}
            <div className="flex-1 overflow-y-auto no-scrollbar divide-y divide-border/40">
              {filteredThreads.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground text-xs">
                  Nenhuma conversa encontrada.
                </div>
              ) : (
                filteredThreads.map((t) => {
                  const isActive = t.id === activeThreadId;
                  return (
                    <button
                      key={t.id}
                      onClick={() => setActiveThreadId(t.id)}
                      className={`w-full p-3.5 text-left flex items-start gap-3 transition-colors cursor-pointer ${
                        isActive ? "bg-muted/60 border-l-4 border-primary" : "hover:bg-muted/30"
                      }`}
                    >
                      <div className="size-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shrink-0">
                        {(t.customer?.full_name || "C")[0].toUpperCase()}
                      </div>

                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex items-center justify-between gap-1">
                          <span className="font-bold text-xs text-foreground truncate">
                            {t.customer?.full_name || "Cliente"}
                          </span>
                          <span className="text-[10px] text-muted-foreground shrink-0">
                            {formatDate(t.updated_at)}
                          </span>
                        </div>

                        <p className="text-[11px] text-muted-foreground line-clamp-1">
                          {t.is_last_reply_staff ? "Você: " : ""}
                          {t.last_message || "Sem mensagens"}
                        </p>

                        <div className="flex items-center gap-1.5 pt-0.5">
                          <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 uppercase">
                            {departmentLabels[t.department] || t.department}
                          </Badge>
                          {t.order_id && (
                            <Badge variant="secondary" className="text-[9px] px-1 py-0 h-4">
                              Pedido #{t.order_id.slice(0, 6)}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* COLUNA 2: Timeline de Mensagens & Envio */}
          {activeThread ? (
            <div className={cn(
              "flex-1 flex flex-col bg-muted/10 w-full min-w-0",
              !activeThreadId ? "hidden md:flex" : "flex"
            )}>
              {/* Header da Conversa Ativa */}
              <div className="p-3.5 bg-card border-b border-border/80 flex items-center justify-between gap-3 shrink-0">
                <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => setActiveThreadId(null)}
                    className="md:hidden size-8 -ml-1 text-muted-foreground hover:text-foreground cursor-pointer shrink-0"
                    title="Voltar para a lista"
                  >
                    <ArrowLeft className="size-4" />
                  </Button>
                  <div className="size-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shrink-0">
                    {(activeThread.customer?.full_name || "C")[0].toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-bold text-sm text-foreground truncate">
                      {activeThread.customer?.full_name || "Cliente"}
                    </h3>
                    <p className="text-[11px] text-muted-foreground truncate">
                      {activeThread.customer?.email || activeThread.customer?.phone || "Atendimento Direto"}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Select
                    value={activeThread.department || "geral"}
                    onValueChange={handleDepartmentChange}
                  >
                    <SelectTrigger className="h-8 rounded-xl text-xs w-36">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      <SelectItem value="vendas">Vendas</SelectItem>
                      <SelectItem value="suporte">Suporte / SAC</SelectItem>
                      <SelectItem value="financeiro">Financeiro</SelectItem>
                      <SelectItem value="logistica">Logística</SelectItem>
                      <SelectItem value="geral">Geral</SelectItem>
                    </SelectContent>
                  </Select>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowCustomer360(!showCustomer360)}
                    className={`h-8 text-xs font-bold rounded-xl ${showCustomer360 ? "bg-muted" : ""}`}
                  >
                    <UserCheck className="size-3.5 mr-1" />
                    Perfil 360º
                  </Button>
                </div>
              </div>

              {/* Timeline */}
              <div
                ref={chatContainerRef}
                className="flex-1 space-y-3.5 overflow-y-auto no-scrollbar p-4"
              >
                {loadingMessages ? (
                  <div className="flex items-center justify-center h-full">
                    <Loader2 className="size-6 animate-spin text-primary" />
                  </div>
                ) : messages.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground text-xs">
                    Nenhuma mensagem nesta conversa ainda.
                  </div>
                ) : (
                  messages.map((msg) => {
                    const isStaff = msg.is_staff_reply;

                    // Card de Pedido
                    if (msg.message_type === "order_card" && msg.payload?.order) {
                      return (
                        <div
                          key={msg.id}
                          className={`flex ${isStaff ? "justify-end" : "justify-start"} w-full`}
                        >
                          <OrderMessageCard order={msg.payload.order} isStaff={true} />
                        </div>
                      );
                    }

                    // Card de Ticket SAC / RMA
                    if (msg.message_type === "rma_ticket" && msg.payload?.ticket_id) {
                      return (
                        <div
                          key={msg.id}
                          className={`flex ${isStaff ? "justify-end" : "justify-start"} w-full`}
                        >
                          <RmaMessageCard
                            payload={msg.payload}
                            isStaff={true}
                            onReviewTicket={() => {
                              setSelectedTicket(msg.payload);
                              setTicketModalOpen(true);
                            }}
                          />
                        </div>
                      );
                    }

                    // Balão Normal
                    return (
                      <div
                        key={msg.id}
                        className={`flex flex-col ${isStaff ? "items-end" : "items-start"}`}
                      >
                        <div
                          className={`max-w-[85%] sm:max-w-md rounded-2xl p-3.5 text-xs leading-relaxed shadow-xs ${
                            isStaff
                              ? "bg-primary text-primary-foreground font-medium rounded-tr-xs"
                              : "bg-card border border-border/80 text-foreground rounded-tl-xs"
                          }`}
                        >
                          <p className="whitespace-pre-wrap break-words">{msg.message}</p>
                        </div>
                        <span className="text-[10px] text-muted-foreground mt-1 px-1">
                          {isStaff ? "Equipe / Você" : (activeThread.customer?.full_name || "Cliente")} •{" "}
                          {formatDate(msg.created_at)}
                        </span>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Input de Envio do Atendente */}
              <form
                onSubmit={handleSend}
                className="p-3 bg-card border-t border-border/80 flex items-center gap-2"
              >
                <Input
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="Escreva uma resposta para o cliente..."
                  className="flex-1 h-10 rounded-xl text-xs bg-muted/30"
                  disabled={isSending}
                />
                <Button
                  type="submit"
                  size="icon"
                  disabled={!text.trim() || isSending}
                  className="size-10 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 shrink-0"
                >
                  {isSending ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Send className="size-4" />
                  )}
                </Button>
              </form>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-muted-foreground gap-2">
              <MessageSquare className="size-12 text-primary/30" />
              <p className="text-sm font-bold text-foreground">Nenhuma conversa selecionada</p>
              <p className="text-xs">Selecione uma conversa ao lado para responder o cliente.</p>
            </div>
          )}

          {/* COLUNA 3: Perfil 360º Lateral do Cliente */}
          {showCustomer360 && activeThread && (
            <div className="w-80 border-l border-border/80 bg-background overflow-y-auto no-scrollbar hidden lg:block shrink-0">
              <div className="p-3 border-b border-border/80 flex items-center justify-between">
                <span className="text-xs font-bold text-foreground">Customer 360º</span>
                <Badge variant="outline" className="text-[10px]">
                  Auditoria & Histórico
                </Badge>
              </div>
              <Customer360Sidebar
                customerId={activeThread.customer?.id}
                storeId={activeThread.store_id || ""}
              />
            </div>
          )}
        </div>
      )}

      {/* Sheet de Gestão de Ticket SAC / RMA */}
      {selectedTicket && (
        <Sheet open={ticketModalOpen} onOpenChange={setTicketModalOpen}>
          <SheetContent side="right" size="wide" className="sm:max-w-3xl md:max-w-4xl lg:max-w-[70vw] xl:max-w-[70vw] w-full max-sm:!h-[100dvh] max-sm:!inset-0 max-sm:!rounded-none border-l p-6 overflow-y-auto no-scrollbar bg-card flex flex-col justify-between">
            <div className="space-y-6">
              <SheetHeader>
                <SheetTitle className="text-base font-bold">
                  Gerenciar Chamado #{selectedTicket.ticket_id?.slice(0, 8)}
                </SheetTitle>
              </SheetHeader>

              <div className="space-y-4 py-2 text-xs">
                <div className="p-3 rounded-xl bg-muted/40 border border-border/80 space-y-1">
                  <span className="font-bold text-foreground block">{selectedTicket.title}</span>
                  <p className="text-muted-foreground">"{selectedTicket.description}"</p>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold">Atualizar Status</Label>
                  <Select value={ticketStatus} onValueChange={setTicketStatus}>
                    <SelectTrigger className="h-10 rounded-xl text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      <SelectItem value="under_review">Em Análise Técnica</SelectItem>
                      <SelectItem value="action_required">Aguardando Resposta do Cliente</SelectItem>
                      <SelectItem value="resolved">Aprovado e Resolvido</SelectItem>
                      <SelectItem value="refunded">Estornado / Reembolsado</SelectItem>
                      <SelectItem value="rejected">Rejeitado / Fora da Garantia</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold">Parecer da Empresa para o Cliente</Label>
                  <Textarea
                    value={resolutionNotes}
                    onChange={(e) => setResolutionNotes(e.target.value)}
                    placeholder="Explique o que foi feito ou as instruções para o cliente..."
                    rows={4}
                    className="rounded-xl text-xs"
                  />
                </div>
              </div>
            </div>

            <SheetFooter className="mt-6 sm:mt-0 flex-row gap-2 justify-end">
              <Button
                variant="ghost"
                onClick={() => setTicketModalOpen(false)}
                className="rounded-xl text-xs flex-1 sm:flex-none"
                disabled={isResolvingTicket}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleResolveTicket}
                disabled={isResolvingTicket}
                className="rounded-xl text-xs font-bold flex-1 sm:flex-none"
              >
                {isResolvingTicket ? (
                  <>
                    <Loader2 className="size-4 animate-spin mr-1.5" />
                    Salvando...
                  </>
                ) : (
                  "Salvar Parecer e Notificar"
                )}
              </Button>
            </SheetFooter>
          </SheetContent>
        </Sheet>
      )}

      {/* ── SHEET: INSPEÇÃO DE CONVERSA DO SDR ── */}
      {selectedSdrSession && (
        <Sheet open={sdrDrawerOpen} onOpenChange={setSdrDrawerOpen}>
          <SheetContent side="right" className="w-full sm:max-w-lg p-0 flex flex-col bg-background">
            <SheetHeader className="p-4 sm:p-5 border-b border-border/70 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-primary/10 text-primary shrink-0">
                    <Bot className="size-4" />
                  </div>
                  <div>
                    <SheetTitle className="text-sm font-bold">
                      Diálogo SDR & Inteligência de Vendas
                    </SheetTitle>
                    <p className="text-[11px] text-muted-foreground">
                      {formatDate(selectedSdrSession.created_at)}
                    </p>
                  </div>
                </div>

                <Badge
                  className={cn(
                    "text-[10px] font-bold uppercase",
                    selectedSdrSession.intent_classification === "ready_to_buy"
                      ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30"
                      : selectedSdrSession.intent_classification === "warm"
                      ? "bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30"
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  {selectedSdrSession.intent_classification === "ready_to_buy"
                    ? "🎯 Pronto p/ Comprar"
                    : selectedSdrSession.intent_classification === "warm"
                    ? "🔥 Quente"
                    : "💡 Curioso"}
                </Badge>
              </div>

              {selectedSdrSession.classified && (
                <div className="p-3 rounded-xl bg-muted/40 border border-border/50 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-foreground truncate">
                      {selectedSdrSession.classified.title}
                    </p>
                    {selectedSdrSession.classified.price_cents !== null && selectedSdrSession.classified.price_cents !== undefined && (
                      <p className="text-[11px] font-semibold text-primary font-mono">
                        {formatMoney(selectedSdrSession.classified.price_cents)}
                      </p>
                    )}
                  </div>

                  <Button asChild size="sm" variant="ghost" className="h-7 text-xs gap-1 rounded-lg">
                    <Link to="/_store/classificados/$id" params={{ id: selectedSdrSession.classified_id }}>
                      Ver Anúncio
                      <ExternalLink className="size-3" />
                    </Link>
                  </Button>
                </div>
              )}

              {selectedSdrSession.summary && (
                <div className="p-3 rounded-xl bg-primary/5 border border-primary/20 text-xs text-foreground space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-primary block">
                    Resumo do Interesse (Gerado por IA)
                  </span>
                  <p className="leading-relaxed text-[11px]">
                    {selectedSdrSession.summary}
                  </p>
                </div>
              )}
            </SheetHeader>

            {/* Histórico das Mensagens */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-muted/20">
              {Array.isArray(selectedSdrSession.messages_log) && selectedSdrSession.messages_log.length > 0 ? (
                selectedSdrSession.messages_log.map((msg, i) => {
                  const isAssistant = msg.role === "assistant";
                  return (
                    <div
                      key={i}
                      className={cn(
                        "flex flex-col max-w-[85%] rounded-2xl p-3 text-xs leading-relaxed",
                        isAssistant
                          ? "ml-auto bg-primary text-primary-foreground rounded-tr-xs"
                          : "mr-auto bg-card border border-border/70 text-foreground rounded-tl-xs shadow-2xs"
                      )}
                    >
                      <div className="flex items-center justify-between gap-2 mb-1 opacity-75 text-[10px] font-semibold">
                        <span>{isAssistant ? "Assistente SDR (IA)" : "Cliente / Comprador"}</span>
                        {msg.at && <span>{new Date(msg.at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</span>}
                      </div>
                      <p className="whitespace-pre-line">{msg.content}</p>
                    </div>
                  );
                })
              ) : (
                <p className="text-center text-xs text-muted-foreground py-10">
                  Nenhuma mensagem registrada nesta sessão.
                </p>
              )}
            </div>

            <SheetFooter className="p-4 border-t border-border/70 flex-row gap-2 justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const logText = (selectedSdrSession.messages_log || [])
                    .map((m) => `[${m.role}]: ${m.content}`)
                    .join("\n\n");
                  navigator.clipboard.writeText(logText);
                  toast.success("Transcrição da conversa copiada!");
                }}
                className="rounded-xl text-xs gap-1.5 cursor-pointer"
              >
                <Copy className="size-3.5" />
                Copiar Histórico
              </Button>

              <Button
                size="sm"
                onClick={() => setSdrDrawerOpen(false)}
                className="rounded-xl text-xs font-semibold cursor-pointer"
              >
                Fechar
              </Button>
            </SheetFooter>
          </SheetContent>
        </Sheet>
      )}
    </div>
  );
}
