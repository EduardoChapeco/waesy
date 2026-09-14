import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useMemo, useEffect } from "react";
import {
  MessageCircle,
  Search,
  Store,
  ChevronRight,
  Package,
  User,
  Plus,
  X,
  Send,
  Sparkles,
  ShoppingBag,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  listCustomerChatThreads,
  searchChatContacts,
  startCustomerChatThread,
} from "@/services/chat.functions";
import { formatRelativeTime } from "@/lib/datetime";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  component: CustomerConversationsIndexPage,
} as any);

const STATUS_CONFIG: Record<
  string,
  { label: string; dot: string }
> = {
  open: { label: "Em aberto", dot: "bg-emerald-500" },
  pending: { label: "Aguardando", dot: "bg-amber-500" },
  resolved: { label: "Resolvido", dot: "bg-muted-foreground/40" },
  closed: { label: "Encerrado", dot: "bg-muted-foreground/20" },
};

const FILTER_TABS = [
  { id: "all", label: "Todas" },
  { id: "unread", label: "Não lidas" },
  { id: "stores", label: "Lojas" },
  { id: "people", label: "Pessoas" },
];

function CustomerConversationsIndexPage() {
  const initialThreads = Route.useLoaderData();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [activeFilter, setActiveFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);

  // Modal de Nova Conversa
  const [newChatOpen, setNewChatOpen] = useState(false);
  const [contactSearch, setContactSearch] = useState("");
  const [selectedTarget, setSelectedTarget] = useState<any | null>(null);
  const [initialMsg, setInitialMsg] = useState("");
  const [isStartingChat, setIsStartingChat] = useState(false);

  // Escuta o evento global do botão + do MobileNav
  useEffect(() => {
    const handleOpenNewChat = () => setNewChatOpen(true);
    window.addEventListener("open-new-chat-dialog", handleOpenNewChat);
    return () => window.removeEventListener("open-new-chat-dialog", handleOpenNewChat);
  }, []);

  const { data: threads } = useQuery({
    queryKey: ["customer-chat-threads"],
    queryFn: () => listCustomerChatThreads(),
    initialData: initialThreads,
    refetchInterval: 15000,
  });

  // Busca contatos e lojas no modal
  const { data: contactsData, isLoading: isLoadingContacts } = useQuery({
    queryKey: ["chat-contacts", contactSearch],
    queryFn: () => searchChatContacts({ data: { query: contactSearch } }),
    enabled: newChatOpen,
    staleTime: 10000,
  });

  const filtered = useMemo(() => {
    if (!threads) return [];
    let list = threads as any[];

    if (activeFilter === "unread") {
      list = list.filter((t: any) => (t.unread_count || 0) > 0);
    } else if (activeFilter === "stores") {
      list = list.filter((t: any) => !t.is_p2p && t.store);
    } else if (activeFilter === "people") {
      list = list.filter((t: any) => t.is_p2p);
    }

    if (searchQuery.trim().length > 0) {
      const q = searchQuery.toLowerCase();
      list = list.filter((t: any) => {
        const title = t.is_p2p ? t.peer_profile?.full_name : t.store?.name;
        return (
          title?.toLowerCase().includes(q) ||
          t.subject?.toLowerCase().includes(q) ||
          t.last_message?.toLowerCase().includes(q)
        );
      });
    }
    return list;
  }, [threads, activeFilter, searchQuery]);

  const handleStartConversation = async () => {
    if (!selectedTarget) return;
    if (!initialMsg.trim()) {
      toast.error("Digite uma mensagem inicial para iniciar a conversa.");
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
        (err instanceof Error ? err.message : String(err)) || "Erro ao iniciar conversa.",
      );
    } finally {
      setIsStartingChat(false);
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto space-y-4 sm:space-y-6 pb-24 px-0 sm:px-4 md:px-0">
      {/* ── 1. Header Nativo WhatsApp / Direct ── */}
      <div className="flex items-center justify-between gap-4 border-b border-border/40 pb-3 pt-1">
        <div className="flex items-center gap-2.5">
          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-foreground">
            Mensagens
          </h1>
          {threads && (threads as any[]).length > 0 && (
            <Badge
              variant="secondary"
              className="text-xs font-mono font-bold px-2 py-0.5 rounded-full"
            >
              {(threads as any[]).length}
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setShowSearch((s) => !s)}
            className="rounded-xl size-9 p-0 text-muted-foreground hover:text-foreground cursor-pointer"
            aria-label="Buscar conversa"
          >
            <Search className="size-4.5" />
          </Button>

          <Button
            size="sm"
            onClick={() => setNewChatOpen(true)}
            className="rounded-xl text-xs font-bold h-9 px-3.5 gap-1.5 cursor-pointer shadow-xs active:scale-95"
          >
            <Plus className="size-4 stroke-[2.5]" />
            <span>Nova Conversa</span>
          </Button>
        </div>
      </div>

      {/* Campo de busca rápida inline */}
      {showSearch && (
        <div className="animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <input
              autoFocus
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar em mensagens, lojas ou pessoas..."
              className="w-full h-10 pl-9 pr-8 rounded-xl text-xs bg-muted/60 border border-border/60 outline-none focus:ring-1 focus:ring-primary text-foreground placeholder:text-muted-foreground"
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

      {/* Filtros tipo chips rápidos estilo WhatsApp */}
      <div className="flex gap-1.5 overflow-x-auto no-scrollbar py-0.5">
        {FILTER_TABS.map((tab) => {
          const isSelected = activeFilter === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveFilter(tab.id)}
              className={`shrink-0 h-8 px-4 rounded-xl text-xs font-semibold transition-all cursor-pointer select-none active:scale-95 ${
                isSelected
                  ? "bg-foreground text-background shadow-xs font-bold"
                  : "bg-muted/60 hover:bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* ── 2. Lista Fluida de Conversas ── */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center flex-1 py-16 px-4 text-center gap-3">
          <div className="size-16 rounded-3xl bg-muted/60 flex items-center justify-center mb-1 text-muted-foreground">
            <MessageCircle className="size-8 stroke-[1.5]" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-foreground">
              {activeFilter !== "all" || searchQuery
                ? "Nenhuma conversa encontrada"
                : "Sem mensagens recentes"}
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5 max-w-xs mx-auto">
              {activeFilter !== "all" || searchQuery
                ? "Tente outro filtro ou faça uma nova busca."
                : "Inicie uma conversa com lojas locais ou membros da comunidade."}
            </p>
          </div>
          <Button
            size="sm"
            onClick={() => setNewChatOpen(true)}
            className="rounded-2xl h-11 px-6 text-sm font-bold mt-3 shadow-xs cursor-pointer"
          >
            Iniciar Conversa
          </Button>
        </div>
      ) : (
        <div className="divide-y divide-border/30 rounded-2xl bg-card border border-border/40 overflow-hidden shadow-2xs">
          {filtered.map((thread: any) => {
            const statusInfo = STATUS_CONFIG[thread.status] || STATUS_CONFIG.open;
            const isP2P = thread.is_p2p;
            const title = isP2P
              ? thread.peer_profile?.full_name || "Membro da Comunidade"
              : thread.store?.name || "Loja Parceira";
            const avatarUrl = isP2P ? thread.peer_profile?.avatar_url : thread.store?.logo_url;
            const hasUnread = (thread.unread_count || 0) > 0;

            return (
              <Link
                key={thread.id}
                to="/conta/conversas/$id"
                params={{ id: thread.id }}
                className="flex items-center gap-3.5 px-3.5 sm:px-4 py-3.5 hover:bg-muted/40 active:bg-muted/60 transition-colors cursor-pointer group"
              >
                {/* Avatar */}
                <div className="relative size-12 rounded-2xl bg-muted border border-border/40 flex items-center justify-center overflow-hidden shrink-0">
                  {avatarUrl ? (
                    <img src={avatarUrl} alt={title} className="size-full object-cover" />
                  ) : isP2P ? (
                    <User className="size-6 text-muted-foreground" />
                  ) : (
                    <Store className="size-6 text-muted-foreground" />
                  )}
                  {/* Dot de status */}
                  <span
                    className={`absolute bottom-0.5 right-0.5 size-2.5 rounded-full border-2 border-background ${statusInfo.dot}`}
                  />
                </div>

                {/* Conteúdo */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className={`text-sm truncate ${
                          hasUnread
                            ? "font-black text-foreground"
                            : "font-bold text-foreground/90 group-hover:text-primary transition-colors"
                        }`}
                      >
                        {title}
                      </span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded-md font-semibold bg-muted text-muted-foreground uppercase tracking-wider shrink-0">
                        {isP2P ? "Membro" : "Loja"}
                      </span>
                    </div>

                    <span className="text-[11px] text-muted-foreground shrink-0 font-mono">
                      {formatRelativeTime(thread.last_message_at)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-2">
                    <p
                      className={`text-xs truncate ${
                        hasUnread
                          ? "text-foreground font-semibold"
                          : "text-muted-foreground"
                      }`}
                    >
                      {thread.is_last_reply_staff ? "" : "Você: "}
                      {thread.last_message || thread.subject || "Conversa iniciada"}
                    </p>

                    {hasUnread && (
                      <span className="shrink-0 size-5 rounded-full bg-primary flex items-center justify-center text-[10px] font-bold text-primary-foreground">
                        {thread.unread_count > 9 ? "9+" : thread.unread_count}
                      </span>
                    )}

                    {thread.order_id && !hasUnread && (
                      <Package className="size-3.5 text-muted-foreground/50 shrink-0" />
                    )}
                  </div>
                </div>

                <ChevronRight className="size-4 text-muted-foreground/40 group-hover:text-foreground group-hover:translate-x-0.5 transition-all shrink-0" />
              </Link>
            );
          })}
        </div>
      )}

      {/* ── 3. Modal / Sheet "Nova Conversa" (Estilo WhatsApp) ── */}
      <Dialog open={newChatOpen} onOpenChange={setNewChatOpen}>
        <DialogContent className="sm:max-w-md p-0 overflow-hidden border-border/80 rounded-3xl">
          <DialogHeader className="p-4 sm:p-5 pb-3 border-b border-border/40">
            <DialogTitle className="text-base sm:text-lg font-black tracking-tight text-foreground">
              {selectedTarget ? `Mensagem para ${selectedTarget.name}` : "Nova Conversa"}
            </DialogTitle>
          </DialogHeader>

          {!selectedTarget ? (
            <div className="p-4 sm:p-5 space-y-4">
              {/* Barra de Pesquisa de Contatos */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <input
                  type="text"
                  value={contactSearch}
                  onChange={(e) => setContactSearch(e.target.value)}
                  placeholder="Buscar membros ou lojas parceiras..."
                  className="w-full h-10 pl-9 pr-3 rounded-xl text-xs bg-muted/60 border border-border/60 outline-none focus:ring-1 focus:ring-primary text-foreground placeholder:text-muted-foreground"
                />
              </div>

              {/* Lista de Contatos e Lojas */}
              <div className="max-h-72 overflow-y-auto space-y-4 no-scrollbar">
                {/* Membros da Comunidade */}
                <div className="space-y-1.5">
                  <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block px-1">
                    Membros da Rede
                  </span>
                  {!contactsData?.contacts || contactsData.contacts.length === 0 ? (
                    <p className="text-xs text-muted-foreground py-2 px-1">
                      {contactSearch ? "Nenhum membro encontrado" : "Nenhum membro recente"}
                    </p>
                  ) : (
                    <div className="space-y-1">
                      {contactsData.contacts.map((c: any) => (
                        <div
                          key={c.id}
                          onClick={() => setSelectedTarget(c)}
                          className="flex items-center gap-3 p-2 rounded-xl hover:bg-muted/60 transition-colors cursor-pointer select-none"
                        >
                          <div className="size-9 rounded-xl bg-muted border border-border/40 flex items-center justify-center overflow-hidden shrink-0">
                            {c.avatar_url ? (
                              <img src={c.avatar_url} alt={c.name} className="size-full object-cover" />
                            ) : (
                              <User className="size-4.5 text-muted-foreground" />
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-bold text-foreground truncate">{c.name}</p>
                            <p className="text-[10px] text-muted-foreground truncate">{c.subtitle}</p>
                          </div>
                          <Plus className="size-4 text-muted-foreground" />
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Lojas Locais */}
                <div className="space-y-1.5 border-t border-border/40 pt-3">
                  <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block px-1">
                    Lojas & Estabelecimentos
                  </span>
                  {!contactsData?.stores || contactsData.stores.length === 0 ? (
                    <p className="text-xs text-muted-foreground py-2 px-1">
                      {contactSearch ? "Nenhuma loja encontrada" : "Nenhuma loja parceira"}
                    </p>
                  ) : (
                    <div className="space-y-1">
                      {contactsData.stores.map((s: any) => (
                        <div
                          key={s.id}
                          onClick={() => setSelectedTarget(s)}
                          className="flex items-center gap-3 p-2 rounded-xl hover:bg-muted/60 transition-colors cursor-pointer select-none"
                        >
                          <div className="size-9 rounded-xl bg-muted border border-border/40 flex items-center justify-center overflow-hidden shrink-0">
                            {s.avatar_url ? (
                              <img src={s.avatar_url} alt={s.name} className="size-full object-cover" />
                            ) : (
                              <Store className="size-4.5 text-muted-foreground" />
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-bold text-foreground truncate">{s.name}</p>
                            <p className="text-[10px] text-muted-foreground truncate">{s.subtitle}</p>
                          </div>
                          <Plus className="size-4 text-muted-foreground" />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="p-4 sm:p-5 space-y-4">
              <div className="flex items-center gap-3 p-3 rounded-2xl bg-muted/40 border border-border/50">
                <div className="size-10 rounded-xl bg-muted border border-border/40 flex items-center justify-center overflow-hidden shrink-0">
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
                  Mensagem Inicial
                </label>
                <textarea
                  autoFocus
                  rows={3}
                  value={initialMsg}
                  onChange={(e) => setInitialMsg(e.target.value)}
                  placeholder={`Olá! Gostaria de conversar com você...`}
                  className="w-full p-3 rounded-2xl text-xs bg-muted/40 border border-border/60 outline-none focus:ring-1 focus:ring-primary text-foreground placeholder:text-muted-foreground resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedTarget(null)}
                  className="rounded-xl text-xs font-semibold h-10 px-4 cursor-pointer"
                >
                  Voltar
                </Button>
                <Button
                  size="sm"
                  disabled={isStartingChat || !initialMsg.trim()}
                  onClick={handleStartConversation}
                  className="rounded-xl text-xs font-bold h-10 px-5 gap-1.5 cursor-pointer shadow-xs"
                >
                  <Send className="size-3.5" />
                  <span>{isStartingChat ? "Enviando..." : "Enviar Mensagem"}</span>
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default CustomerConversationsIndexPage;
