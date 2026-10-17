import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useMemo, useEffect } from "react";
import {
  Archive,
  BellOff,
  CheckCircle2,
  Eraser,
  MailOpen,
  MessageCircle,
  MessageSquarePlus,
  Pin,
  Search,
  Store,
  Trash2,
  User,
  X,
} from "lucide-react";
import {
  listCustomerChatThreads,
  mutateCustomerChatThreadAction,
  searchChatContacts,
  startCustomerChatThread,
} from "@/services/chat.functions";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { CustomerChatRoom } from "./_store.conta.conversas.$id";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  ChatListItem,
  type ChatListItemData,
  type ReadReceiptState,
} from "@/components/chat/chat-list-item";
import { getRealtimeChannel } from "@/services/realtime-channel";
import { toast } from "sonner";

export const Route = createFileRoute("/_store/conta/conversas/")({
  head: () => ({ meta: [{ title: "Mensagens | Waesy" }] }),
  loader: async () => {
    try {
      return (await listCustomerChatThreads().catch(() => [])) || [];
    } catch {
      return [];
    }
  },
  errorComponent: CustomerConversationsErrorComponent,
  component: CustomerConversationsIndexPage,
} as any);

function CustomerConversationsErrorComponent({ error, reset }: { error: any; reset: () => void }) {
  return (
    <div className="mx-auto max-w-2xl px-4 py-20 text-center space-y-4">
      <div className="inline-flex size-16 items-center justify-center rounded-lg bg-destructive/10 text-destructive mb-2">
        <MessageCircle className="size-8" />
      </div>
      <h2 className="text-xl font-bold text-foreground">Instabilidade ao carregar mensagens</h2>
      <p className="text-xs text-muted-foreground max-w-md mx-auto">
        {error?.message || "Não foi possível carregar as conversas no momento."}
      </p>
      <div className="flex items-center justify-center gap-3">
        <Button onClick={reset} className="rounded-lg font-bold">
          Tentar Novamente
        </Button>
        <Button asChild variant="outline" className="rounded-lg font-bold">
          <Link to="/conta">Voltar</Link>
        </Button>
      </div>
    </div>
  );
}

const FILTER_TABS = [
  { id: "all", label: "Todas" },
  { id: "unread", label: "Não lidas" },
  { id: "stores", label: "Lojas" },
  { id: "people", label: "Pessoas" },
  { id: "archived", label: "Arquivadas" },
];

function CustomerConversationsIndexPage() {
  const initialThreads = Route.useLoaderData();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [activeFilter, setActiveFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);

  // Estado local reativo para CRUD via Gestos (Swipe & Long-Press)
  const [pinnedIds, setPinnedIds] = useState<Record<string, boolean>>({});
  const [mutedIds, setMutedIds] = useState<Record<string, boolean>>({});
  const [archivedIds, setArchivedIds] = useState<Record<string, boolean>>({});
  const [deletedIds, setDeletedIds] = useState<Record<string, boolean>>({});
  const [unreadOverrides, setUnreadOverrides] = useState<Record<string, number>>({});
  const [contextMenuTarget, setContextMenuTarget] = useState<ChatListItemData | null>(null);

  // Estado do Motor Realtime E2E (FASE 4: is_typing, read_receipts, presence)
  const [onlinePeers, setOnlinePeers] = useState<Record<string, boolean>>({});
  const [typingThreads, setTypingThreads] = useState<Record<string, boolean>>({});
  const [readReceipts, setReadReceipts] = useState<Record<string, ReadReceiptState>>({});

  // Modal de Nova Conversa (Acionado exclusivamente pelo FAB)
  const [newChatOpen, setNewChatOpen] = useState(false);
  const [contactSearch, setContactSearch] = useState("");
  const [selectedTarget, setSelectedTarget] = useState<any | null>(null);
  const [initialMsg, setInitialMsg] = useState("");
  const [isStartingChat, setIsStartingChat] = useState(false);

  // Escuta evento global do MobileNav
  useEffect(() => {
    const handleOpenNewChat = () => setNewChatOpen(true);
    window.addEventListener("open-new-chat-dialog", handleOpenNewChat);
    return () => window.removeEventListener("open-new-chat-dialog", handleOpenNewChat);
  }, []);

  // FASE 4: Motor Realtime E2E (Supabase Presence + Broadcast Typing + Read Receipts)
  useEffect(() => {
    const { channel, unsubscribe } = getRealtimeChannel("messenger-protocol-v115", {
      config: { presence: { key: "active-peers" } },
    });

    if (!channel) return;

    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState();
        const nextOnline: Record<string, boolean> = {};
        Object.values(state).forEach((presences: any) => {
          for (const p of presences) {
            if (p?.user_id) nextOnline[p.user_id] = true;
            if (p?.store_id) nextOnline[p.store_id] = true;
          }
        });
        setOnlinePeers(nextOnline);
      })
      .on("broadcast", { event: "is_typing" }, ({ payload }: any) => {
        if (!payload?.threadId) return;
        setTypingThreads((prev) => ({ ...prev, [payload.threadId]: Boolean(payload.isTyping) }));
        if (payload.isTyping) {
          setTimeout(() => {
            setTypingThreads((prev) => ({ ...prev, [payload.threadId]: false }));
          }, 4000);
        }
      })
      .on("broadcast", { event: "read_receipts" }, ({ payload }: any) => {
        if (!payload?.threadId || !payload?.status) return;
        setReadReceipts((prev) => ({
          ...prev,
          [payload.threadId]: payload.status as ReadReceiptState,
        }));
      })
      .subscribe();

    return () => {
      unsubscribe();
    };
  }, []);

  const { data: threads } = useQuery({
    queryKey: ["customer-chat-threads"],
    queryFn: () => listCustomerChatThreads(),
    initialData: initialThreads,
    refetchInterval: 12000,
  });

  const { data: contactsData } = useQuery({
    queryKey: ["chat-contacts", contactSearch],
    queryFn: () => searchChatContacts({ data: { query: contactSearch } }),
    enabled: newChatOpen,
    staleTime: 10000,
  });

  const mappedItems = useMemo<ChatListItemData[]>(() => {
    if (!threads || !Array.isArray(threads)) return [];

    return (threads as any[])
      .filter((t) => !deletedIds[t.id])
      .map((thread: any) => {
        const isP2P = Boolean(thread.is_p2p);
        const title = isP2P
          ? thread.peer_profile?.full_name || "Membro da Comunidade"
          : thread.store?.name || "Loja Parceira";
        const avatarUrl = isP2P ? thread.peer_profile?.avatar_url : thread.store?.logo_url;
        const peerKey = isP2P ? thread.peer_profile?.id : thread.store?.id;
        const isOnline = Boolean(
          (peerKey && onlinePeers[peerKey]) || thread.status === "open"
        );

        const unreadCount =
          unreadOverrides[thread.id] !== undefined
            ? unreadOverrides[thread.id]
            : Number(thread.unread_count || 0);

        const defaultReadState: ReadReceiptState =
          unreadCount === 0 ? "read" : "delivered";

        return {
          id: thread.id,
          title,
          avatarUrl,
          isP2P,
          isOnline,
          isTyping: Boolean(typingThreads[thread.id]),
          lastMessage: thread.last_message || thread.subject || "Conversa iniciada",
          lastMessageAt: thread.last_message_at || thread.updated_at,
          isOutgoingLastMessage: !thread.is_last_reply_staff,
          readStatus: readReceipts[thread.id] || defaultReadState,
          unreadCount,
          isPinned: Boolean(pinnedIds[thread.id]),
          isMuted: Boolean(mutedIds[thread.id]),
          isArchived: Boolean(
            archivedIds[thread.id] ?? thread.status === "archived"
          ),
        };
      })
      .sort((a, b) => {
        if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
        const tA = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0;
        const tB = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0;
        return tB - tA;
      });
  }, [
    threads,
    deletedIds,
    onlinePeers,
    unreadOverrides,
    typingThreads,
    readReceipts,
    pinnedIds,
    mutedIds,
    archivedIds,
  ]);

  const filtered = useMemo(() => {
    let list = mappedItems;

    if (activeFilter === "archived") {
      list = list.filter((i) => i.isArchived);
    } else {
      list = list.filter((i) => !i.isArchived);
      if (activeFilter === "unread") {
        list = list.filter((i) => (i.unreadCount || 0) > 0);
      } else if (activeFilter === "stores") {
        list = list.filter((i) => !i.isP2P);
      } else if (activeFilter === "people") {
        list = list.filter((i) => i.isP2P);
      }
    }

    if (searchQuery.trim().length > 0) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (i) =>
          i.title.toLowerCase().includes(q) ||
          (i.lastMessage || "").toLowerCase().includes(q)
      );
    }

    return list;
  }, [mappedItems, activeFilter, searchQuery]);

  // Handlers CRUD (Swipe & Long-Press Context Menu)
  const handleArchiveThread = async (threadId: string) => {
    const nextArchived = !archivedIds[threadId];
    setArchivedIds((prev) => ({ ...prev, [threadId]: nextArchived }));
    toast.success(nextArchived ? "Conversa arquivada" : "Conversa desarquivada");
    await mutateCustomerChatThreadAction({
      data: { threadId, action: nextArchived ? "archive" : "unarchive" },
    }).catch(() => null);
  };

  const handleDeleteThread = async (threadId: string) => {
    setDeletedIds((prev) => ({ ...prev, [threadId]: true }));
    setContextMenuTarget(null);
    toast.success("Conversa apagada");
    await mutateCustomerChatThreadAction({
      data: { threadId, action: "delete" },
    }).catch(() => null);
  };

  const handleTogglePin = (threadId: string) => {
    setPinnedIds((prev) => {
      const next = !prev[threadId];
      toast.success(next ? "Conversa fixada no topo" : "Conversa desafixada");
      return { ...prev, [threadId]: next };
    });
    setContextMenuTarget(null);
  };

  const handleToggleMute = (threadId: string) => {
    setMutedIds((prev) => {
      const next = !prev[threadId];
      toast.success(next ? "Notificações silenciadas" : "Notificações reativadas");
      return { ...prev, [threadId]: next };
    });
    setContextMenuTarget(null);
  };

  const handleToggleUnread = (threadId: string, currentUnread: number) => {
    const nextCount = currentUnread > 0 ? 0 : 1;
    setUnreadOverrides((prev) => ({ ...prev, [threadId]: nextCount }));
    toast.success(nextCount > 0 ? "Marcada como não lida" : "Marcada como lida");
    setContextMenuTarget(null);
  };

  const handleClearHistory = async (threadId: string) => {
    setContextMenuTarget(null);
    await mutateCustomerChatThreadAction({
      data: { threadId, action: "clear_history" },
    }).catch(() => null);
    toast.success("Histórico da conversa limpo");
    queryClient.invalidateQueries({ queryKey: ["customer-chat-threads"] });
  };

  const handleStartConversation = async () => {
    if (!selectedTarget) return;
    if (!initialMsg.trim()) {
      toast.error("Digite uma mensagem inicial.");
      return;
    }

    try {
      setIsStartingChat(true);
      const isStore = selectedTarget.type === "store";
      const res = await startCustomerChatThread({
        data: {
          storeId: isStore ? selectedTarget.id : undefined,
          recipientProfileId: !isStore ? selectedTarget.id : undefined,
          subject: isStore ? `Conversa com ${selectedTarget.name}` : `Conversa direta`,
          initialMessage: initialMsg.trim(),
        },
      });

      toast.success("Conversa iniciada!");
      setNewChatOpen(false);
      setSelectedTarget(null);
      setInitialMsg("");
      await queryClient.invalidateQueries({ queryKey: ["customer-chat-threads"] });

      if (res?.threadId) {
        navigate({
          to: "/conta/conversas/$id",
          params: { id: res.threadId },
        });
      }
    } catch (err: unknown) {
      toast.error(
        (err instanceof Error ? err.message : String(err)) || "Erro ao iniciar conversa."
      );
    } finally {
      setIsStartingChat(false);
    }
  };

  return (
    <div className="relative w-full max-w-5xl mx-auto min-h-[calc(100dvh-7rem)] flex flex-col space-y-3 pb-28 px-0 sm:px-4 md:px-0">
      {/* ── FASE 1: Header Nativo Silencioso (Apenas "Mensagens" + Ícone de Lupa 🔍 à Direita) ── */}
      <header className="flex items-center justify-between gap-4 border-b border-border/40 px-4 sm:px-0 pb-3 pt-2">
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
          Mensagens
        </h1>

        <button
          type="button"
          onClick={() => setShowSearch((s) => !s)}
          className="size-10 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors cursor-pointer"
          aria-label="Buscar conversa"
        >
          <Search className="size-5" />
        </button>
      </header>

      {/* Barra de busca expansível sob demanda */}
      {showSearch && (
        <div className="px-4 sm:px-0 animate-in fade-in slide-in-from-top-1 duration-150">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <input
              autoFocus
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Pesquisar conversas..."
              className="w-full h-10 pl-9 pr-8 rounded-lg text-sm bg-muted/60 border border-border/50 outline-none focus:ring-1 focus:ring-primary text-foreground placeholder:text-muted-foreground"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground hover:text-foreground"
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Chips de Filtro Rápido estilo WhatsApp */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar px-4 sm:px-0 py-1">
        {FILTER_TABS.map((tab) => {
          const isSelected = activeFilter === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveFilter(tab.id)}
              className={`shrink-0 h-8 px-4 rounded-full text-xs font-semibold transition-all cursor-pointer select-none ${
                isSelected
                  ? "bg-primary/15 text-primary font-bold"
                  : "bg-muted/40 hover:bg-muted/70 text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* ── FASE 1 & 2: Empty State Silencioso (Marca d'Água) ou Lista Nativa <ChatListItem> ── */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center flex-1 py-24 px-4 text-center select-none">
          <MessageCircle className="size-14 stroke-[1.15] text-muted-foreground/25 mb-3" />
          <p className="text-xs text-gray-400 dark:text-zinc-500 max-w-[220px] leading-relaxed">
            {activeFilter !== "all" || searchQuery
              ? "Nenhuma conversa encontrada para este filtro."
              : "Nenhuma mensagem por aqui ainda."}
          </p>
        </div>
      ) : (
        <div className="w-full divide-y divide-border/30 rounded-none sm:rounded-lg border-y sm:border border-border/50 bg-card overflow-hidden">
          {filtered.map((item) => (
            <ChatListItem
              key={item.id}
              item={item}
              onOpen={(id) =>
                navigate({
                  to: "/conta/conversas/$id",
                  params: { id },
                })
              }
              onArchive={handleArchiveThread}
              onDelete={handleDeleteThread}
              onLongPress={(target) => setContextMenuTarget(target)}
            />
          ))}
        </div>
      )}

      {/* ── FASE 1: Floating Action Button (FAB) — w-14 h-14 Redondo Acima da Bottom Navigation Bar ── */}
      <button
        type="button"
        onClick={() => setNewChatOpen(true)}
        aria-label="Nova Conversa"
        className="fixed bottom-20 md:bottom-8 right-4 md:right-8 z-40 w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-lg hover:opacity-95 active:scale-95 transition-all flex items-center justify-center cursor-pointer"
      >
        <MessageSquarePlus className="size-6 stroke-[2.2]" />
      </button>

      {/* ── FASE 3: Bottom Sheet / Haptic Context Menu (Long-Press CRUD Controls) ── */}
      <Sheet
        open={Boolean(contextMenuTarget)}
        onOpenChange={(open) => !open && setContextMenuTarget(null)}
      >
        <SheetContent side="bottom" className="rounded-t-lg p-4 sm:p-6 max-w-lg mx-auto">
          <SheetHeader className="pb-3 border-b border-border/40 text-left">
            <SheetTitle className="text-sm font-bold text-foreground truncate">
              {contextMenuTarget?.title || "Opções da conversa"}
            </SheetTitle>
          </SheetHeader>

          {contextMenuTarget && (
            <div className="divide-y divide-border/30 pt-1">
              <button
                type="button"
                onClick={() => handleTogglePin(contextMenuTarget.id)}
                className="w-full h-11 flex items-center gap-3 px-2 text-xs font-semibold text-foreground hover:bg-muted/40 rounded-lg transition-colors cursor-pointer"
              >
                <Pin className="size-4 text-muted-foreground" />
                <span>
                  {contextMenuTarget.isPinned ? "Desafixar conversa" : "Fixar conversa"}
                </span>
              </button>

              <button
                type="button"
                onClick={() => handleToggleMute(contextMenuTarget.id)}
                className="w-full h-11 flex items-center gap-3 px-2 text-xs font-semibold text-foreground hover:bg-muted/40 rounded-lg transition-colors cursor-pointer"
              >
                <BellOff className="size-4 text-muted-foreground" />
                <span>
                  {contextMenuTarget.isMuted
                    ? "Ativar notificações"
                    : "Silenciar notificações"}
                </span>
              </button>

              <button
                type="button"
                onClick={() =>
                  handleToggleUnread(
                    contextMenuTarget.id,
                    contextMenuTarget.unreadCount || 0
                  )
                }
                className="w-full h-11 flex items-center gap-3 px-2 text-xs font-semibold text-foreground hover:bg-muted/40 rounded-lg transition-colors cursor-pointer"
              >
                <MailOpen className="size-4 text-muted-foreground" />
                <span>
                  {(contextMenuTarget.unreadCount || 0) > 0
                    ? "Marcar como lida"
                    : "Marcar como não lida"}
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  handleArchiveThread(contextMenuTarget.id);
                  setContextMenuTarget(null);
                }}
                className="w-full h-11 flex items-center gap-3 px-2 text-xs font-semibold text-foreground hover:bg-muted/40 rounded-lg transition-colors cursor-pointer"
              >
                <Archive className="size-4 text-muted-foreground" />
                <span>
                  {contextMenuTarget.isArchived
                    ? "Desarquivar conversa"
                    : "Arquivar conversa"}
                </span>
              </button>

              <button
                type="button"
                onClick={() => handleClearHistory(contextMenuTarget.id)}
                className="w-full h-11 flex items-center gap-3 px-2 text-xs font-semibold text-foreground hover:bg-muted/40 rounded-lg transition-colors cursor-pointer"
              >
                <Eraser className="size-4 text-muted-foreground" />
                <span>Limpar histórico</span>
              </button>

              <button
                type="button"
                onClick={() => handleDeleteThread(contextMenuTarget.id)}
                className="w-full h-11 flex items-center gap-3 px-2 text-xs font-bold text-destructive hover:bg-destructive/10 rounded-lg transition-colors cursor-pointer"
              >
                <Trash2 className="size-4 text-destructive" />
                <span>Apagar conversa</span>
              </button>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* ── Modal "Nova Conversa" (Acionado pelo FAB) ── */}
      <Dialog open={newChatOpen} onOpenChange={setNewChatOpen}>
        <DialogContent className="sm:max-w-md p-0 overflow-hidden border-border/80 rounded-lg">
          <DialogHeader className="p-4 sm:p-5 pb-3 border-b border-border/40">
            <DialogTitle className="text-base font-bold tracking-tight text-foreground">
              {selectedTarget ? `Mensagem para ${selectedTarget.name}` : "Nova Conversa"}
            </DialogTitle>
          </DialogHeader>

          {!selectedTarget ? (
            <div className="p-4 sm:p-5 space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <input
                  type="text"
                  value={contactSearch}
                  onChange={(e) => setContactSearch(e.target.value)}
                  placeholder="Buscar membros ou lojas..."
                  className="w-full h-10 pl-9 pr-3 rounded-lg text-xs bg-muted/60 border border-border/60 outline-none focus:ring-1 focus:ring-primary text-foreground placeholder:text-muted-foreground"
                />
              </div>

              <div className="max-h-72 overflow-y-auto space-y-4 no-scrollbar">
                <div className="space-y-2">
                  <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block px-1">
                    Membros
                  </span>
                  {!contactsData?.contacts || contactsData.contacts.length === 0 ? (
                    <p className="text-xs text-muted-foreground py-2 px-1">
                      Nenhum membro encontrado
                    </p>
                  ) : (
                    <div className="space-y-1">
                      {contactsData.contacts.map((c: any) => (
                        <div
                          key={c.id}
                          onClick={() => setSelectedTarget(c)}
                          className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/60 transition-colors cursor-pointer select-none"
                        >
                          <div className="size-9 rounded-full bg-muted border border-border/40 flex items-center justify-center overflow-hidden shrink-0">
                            {c.avatar_url ? (
                              <img src={c.avatar_url} alt={c.name} className="size-full object-cover" />
                            ) : (
                              <User className="size-4 text-muted-foreground" />
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-bold text-foreground truncate">{c.name}</p>
                            <p className="text-[10px] text-muted-foreground truncate">{c.subtitle}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="space-y-2 border-t border-border/40 pt-3">
                  <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block px-1">
                    Lojas
                  </span>
                  {!contactsData?.stores || contactsData.stores.length === 0 ? (
                    <p className="text-xs text-muted-foreground py-2 px-1">
                      Nenhuma loja encontrada
                    </p>
                  ) : (
                    <div className="space-y-1">
                      {contactsData.stores.map((s: any) => (
                        <div
                          key={s.id}
                          onClick={() => setSelectedTarget(s)}
                          className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/60 transition-colors cursor-pointer select-none"
                        >
                          <div className="size-9 rounded-full bg-muted border border-border/40 flex items-center justify-center overflow-hidden shrink-0">
                            {s.avatar_url ? (
                              <img src={s.avatar_url} alt={s.name} className="size-full object-cover" />
                            ) : (
                              <Store className="size-4 text-muted-foreground" />
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-bold text-foreground truncate">{s.name}</p>
                            <p className="text-[10px] text-muted-foreground truncate">{s.subtitle}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="p-4 sm:p-5 space-y-4">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/40 border border-border/50">
                <div className="size-10 rounded-full bg-muted border border-border/40 flex items-center justify-center overflow-hidden shrink-0">
                  {selectedTarget.avatar_url ? (
                    <img
                      src={selectedTarget.avatar_url}
                      alt={selectedTarget.name}
                      className="size-full object-cover"
                    />
                  ) : selectedTarget.type === "person" ? (
                    <User className="size-5 text-muted-foreground" />
                  ) : (
                    <Store className="size-5 text-muted-foreground" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-foreground truncate">{selectedTarget.name}</p>
                  <p className="text-[10px] text-muted-foreground truncate">{selectedTarget.subtitle}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedTarget(null)}
                  className="text-xs text-primary font-bold hover:underline cursor-pointer"
                >
                  Alterar
                </button>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-foreground block">
                  Mensagem
                </label>
                <textarea
                  autoFocus
                  rows={3}
                  value={initialMsg}
                  onChange={(e) => setInitialMsg(e.target.value)}
                  placeholder="Digite sua mensagem..."
                  className="w-full p-3 rounded-lg text-xs bg-muted/40 border border-border/60 outline-none focus:ring-1 focus:ring-primary text-foreground placeholder:text-muted-foreground resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedTarget(null)}
                  className="rounded-lg text-xs font-semibold h-10 px-4 cursor-pointer"
                >
                  Voltar
                </Button>
                <Button
                  size="sm"
                  disabled={isStartingChat}
                  onClick={handleStartConversation}
                  className="rounded-lg text-xs font-bold h-10 px-5 cursor-pointer"
                >
                  {isStartingChat ? "Enviando..." : "Enviar"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
