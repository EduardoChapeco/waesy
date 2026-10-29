import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  Search,
  Store,
  User,
  Layers,
  MessageCircle,
  ExternalLink,
  X,
  CheckCircle2,
  Loader2,
} from "lucide-react";
import { getPublicDirectory, type DirectoryListingDTO } from "@/services/directory.functions";
import { searchChatContacts, startCustomerChatThread } from "@/services/chat.functions";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export const WHATSAPP_SEARCH_EVENT_NAME = "waesy:open-whatsapp-search";

export function openWhatsAppUnifiedSearch(initialQuery = "") {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent(WHATSAPP_SEARCH_EVENT_NAME, {
      detail: { query: initialQuery },
    }),
  );
}

export type SearchTabId = "tudo" | "empresas" | "contatos" | "departamentos";

const SEARCH_TABS: { id: SearchTabId; label: string }[] = [
  { id: "tudo", label: "Tudo" },
  { id: "empresas", label: "Empresas" },
  { id: "contatos", label: "Contatos" },
  { id: "departamentos", label: "Departamentos" },
];

const CANONICAL_DEPARTMENTS = [
  { id: "vendas", label: "Vendas", description: "Catálogo, cotações e pedidos rápidos" },
  { id: "suporte", label: "Suporte", description: "Dúvidas, trocas e pós-venda" },
  { id: "financeiro", label: "Financeiro", description: "Pagamentos Pix, boletos e notas" },
  { id: "logistica", label: "Entregas", description: "Rastreamento e status de envio" },
];

export interface WhatsAppUnifiedSearchModalProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function WhatsAppUnifiedSearchModal({
  open: controlledOpen,
  onOpenChange,
}: WhatsAppUnifiedSearchModalProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeTab, setActiveTab] = useState<SearchTabId>("tudo");
  const [isLoading, setIsLoading] = useState(false);
  const [startingId, setStartingId] = useState<string | null>(null);

  const [directoryItems, setDirectoryItems] = useState<DirectoryListingDTO[]>([]);
  const [contacts, setContacts] = useState<
    Array<{ id: string; name: string; avatar_url?: string | null; subtitle?: string }>
  >([]);
  const [chatStores, setChatStores] = useState<
    Array<{
      id: string;
      name: string;
      slug?: string;
      avatar_url?: string | null;
      subtitle?: string;
    }>
  >([]);

  const navigate = useNavigate();
  const isOpen = controlledOpen !== undefined ? controlledOpen : internalOpen;

  const setOpen = (next: boolean) => {
    setInternalOpen(next);
    onOpenChange?.(next);
  };

  useEffect(() => {
    if (typeof window === "undefined") return;
    const handleOpen = (e: Event) => {
      const customEvent = e as CustomEvent<{ query?: string }>;
      if (customEvent.detail?.query !== undefined) {
        setQuery(customEvent.detail.query);
      }
      setOpen(true);
    };
    window.addEventListener(WHATSAPP_SEARCH_EVENT_NAME, handleOpen);
    return () => window.removeEventListener(WHATSAPP_SEARCH_EVENT_NAME, handleOpen);
  }, []);

  useEffect(() => {
    if (!isOpen || typeof window === "undefined") return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    let active = true;
    setIsLoading(true);

    const timer = setTimeout(() => {
      Promise.all([
        getPublicDirectory({ data: { search: query.trim() || undefined, limit: 25 } }).catch(
          () => [],
        ),
        searchChatContacts({ data: { query: query.trim(), limit: 25 } }).catch(() => ({
          contacts: [],
          stores: [],
        })),
      ])
        .then(([dirRes, chatRes]) => {
          if (!active) return;
          setDirectoryItems(Array.isArray(dirRes) ? dirRes : []);
          setContacts(chatRes?.contacts || []);
          setChatStores(chatRes?.stores || []);
        })
        .finally(() => {
          if (active) setIsLoading(false);
        });
    }, 180);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [isOpen, query]);

  const unifiedBusinesses = useMemo(() => {
    const map = new Map<
      string,
      {
        id: string;
        storeId: string | null;
        name: string;
        category: string;
        avatarUrl: string | null;
        slug: string | null;
        isVerified: boolean;
      }
    >();

    for (const st of chatStores) {
      map.set(`store-${st.id}`, {
        id: st.id,
        storeId: st.id,
        name: st.name || "Empresa",
        category: st.subtitle || "Comércio Local",
        avatarUrl: st.avatar_url || null,
        slug: st.slug || null,
        isVerified: true,
      });
    }

    for (const dir of directoryItems) {
      const key = dir.store_id ? `store-${dir.store_id}` : `dir-${dir.id}`;
      if (!map.has(key)) {
        map.set(key, {
          id: dir.id,
          storeId: dir.store_id || null,
          name: dir.business_name || dir.store?.name || "Empresa",
          category: dir.category || "Comércio Local",
          avatarUrl: dir.avatar_url || dir.store?.avatar_url || null,
          slug: dir.store?.slug || null,
          isVerified: Boolean(dir.is_verified),
        });
      }
    }

    const q = query.trim().toLowerCase();
    const list = Array.from(map.values());
    if (!q) return list;
    return list.filter(
      (b) =>
        b.name.toLowerCase().includes(q) ||
        b.category.toLowerCase().includes(q),
    );
  }, [chatStores, directoryItems, query]);

  const filteredContacts = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return contacts;
    return contacts.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.subtitle && c.subtitle.toLowerCase().includes(q)),
    );
  }, [contacts, query]);

  const filteredDepartments = useMemo(() => {
    const q = query.trim().toLowerCase();
    const items: Array<{
      key: string;
      storeId: string;
      storeName: string;
      departmentId: string;
      departmentLabel: string;
      description: string;
    }> = [];

    const targetStores = unifiedBusinesses.filter((b) => Boolean(b.storeId)).slice(0, 6);
    for (const store of targetStores) {
      for (const dept of CANONICAL_DEPARTMENTS) {
        if (
          !q ||
          dept.label.toLowerCase().includes(q) ||
          store.name.toLowerCase().includes(q)
        ) {
          items.push({
            key: `${store.storeId}-${dept.id}`,
            storeId: store.storeId!,
            storeName: store.name,
            departmentId: dept.id,
            departmentLabel: dept.label,
            description: dept.description,
          });
        }
      }
    }
    return items.slice(0, 16);
  }, [unifiedBusinesses, query]);

  if (!isOpen) return null;

  const handleOpenStoreChat = async (
    storeId: string | null,
    name: string,
    department = "geral",
  ) => {
    if (!storeId) {
      setOpen(false);
      navigate({ to: "/conta/conversas" as any });
      return;
    }
    setStartingId(`${storeId}-${department}`);
    try {
      const res = await startCustomerChatThread({
        data: {
          storeId,
          department,
          subject: `Atendimento ${name}`,
          initialMessage: `Olá! Gostaria de falar com ${name} (${department}).`,
        },
      });
      setOpen(false);
      if (res?.threadId) {
        navigate({ to: `/conta/conversas/${res.threadId}` as any });
      } else {
        navigate({ to: "/conta/conversas" as any });
      }
    } catch {
      setOpen(false);
      navigate({ to: "/conta/conversas" as any });
    } finally {
      setStartingId(null);
    }
  };

  const handleOpenPersonChat = async (profileId: string, name: string) => {
    setStartingId(profileId);
    try {
      const res = await startCustomerChatThread({
        data: {
          recipientProfileId: profileId,
          subject: `Conversa com ${name}`,
          initialMessage: `Olá, ${name}!`,
        },
      });
      setOpen(false);
      if (res?.threadId) {
        navigate({ to: `/conta/conversas/${res.threadId}` as any });
      } else {
        navigate({ to: "/conta/conversas" as any });
      }
    } catch (err: any) {
      toast.error(err?.message || "Faça login para iniciar uma conversa.");
      setOpen(false);
      navigate({ to: "/conta/conversas" as any });
    } finally {
      setStartingId(null);
    }
  };

  const handleOpenStoreProfile = (slug: string | null, dirId: string) => {
    setOpen(false);
    if (slug) {
      navigate({ to: "/loja/$slug" as any, params: { slug } as any });
    } else {
      navigate({ to: "/diretorio/$id" as any, params: { id: dirId } as any });
    }
  };

  const showBusinesses = activeTab === "tudo" || activeTab === "empresas";
  const showContacts = activeTab === "tudo" || activeTab === "contatos";
  const showDepartments = activeTab === "tudo" || activeTab === "departamentos";

  return (
    <div
      className="fixed inset-0 z-50 flex items-start sm:items-center justify-center p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Buscar"
      data-testid="whatsapp-unified-search-modal"
    >
      {/* Backdrop */}
      <div
        role="button"
        tabIndex={0}
        aria-label="Fechar busca"
        onClick={() => setOpen(false)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") setOpen(false);
        }}
        className="fixed inset-0 bg-foreground/50 backdrop-blur-xs transition-opacity cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      />

      {/* Surface */}
      <div className="relative z-10 w-full h-full sm:h-auto sm:max-h-144 sm:max-w-lg bg-background text-foreground sm:rounded-2xl border-b sm:border border-border/60 shadow-2xl flex flex-col overflow-hidden pt-safe-modal pb-safe">
        {/* Top Search Bar */}
        <div className="px-4 pt-3 pb-2 border-b border-border/40 space-y-3 shrink-0">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar empresas, contatos ou setores..."
                autoFocus
                className="w-full h-11 min-h-11 pl-9 pr-9 rounded-xl bg-muted/40 border border-border/50 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  aria-label="Limpar busca"
                  className="absolute right-0 top-1/2 -translate-y-1/2 size-11 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  <X className="size-4" />
                </button>
              )}
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Fechar"
              className="h-11 min-h-11 px-3 rounded-xl text-xs font-bold text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors cursor-pointer shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              Fechar
            </button>
          </div>

          {/* 4 Single-Word Tabs: Tudo | Empresas | Contatos | Departamentos */}
          <div
            role="tablist"
            aria-label="Filtros de busca"
            className="grid grid-cols-2 sm:grid-cols-4 gap-1 bg-muted/40 p-1 rounded-xl border border-border/40 motion-reduce:animate-none"
          >
            {SEARCH_TABS.map((tab) => {
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "h-11 min-h-11 px-2 rounded-lg text-2xs sm:text-xs font-bold transition-colors truncate cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                    active
                      ? "bg-background text-foreground shadow-2xs border border-border/50"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Results List */}
        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-4 no-scrollbar">
          {isLoading ? (
            <div className="py-12 flex flex-col items-center justify-center gap-2 text-muted-foreground">
              <Loader2 className="size-6 animate-spin text-primary" />
              <span className="text-xs font-medium">Buscando no diretório e conversas...</span>
            </div>
          ) : (
            <>
              {/* EMPRESAS */}
              {showBusinesses && unifiedBusinesses.length > 0 && (
                <section aria-label="Empresas" className="space-y-1">
                  <div className="px-2 py-1 flex items-center justify-between">
                    <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                      Empresas
                    </h3>
                    <span className="text-2xs font-mono text-muted-foreground">
                      {unifiedBusinesses.length}
                    </span>
                  </div>
                  <div className="divide-y divide-border/30 rounded-xl border border-border/40 bg-card overflow-hidden">
                    {unifiedBusinesses.map((biz) => {
                      const isBusy = startingId === `${biz.storeId}-geral`;
                      return (
                        <div
                          key={`${biz.storeId || biz.id}`}
                          className="p-3 flex items-center justify-between gap-3 hover:bg-muted/30 transition-colors"
                        >
                          <button
                            type="button"
                            onClick={() => handleOpenStoreChat(biz.storeId, biz.name, "geral")}
                            className="flex items-center gap-3 min-w-0 flex-1 text-left cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-lg"
                          >
                            <div className="size-11 min-h-11 min-w-11 rounded-full bg-muted border border-border/50 overflow-hidden flex items-center justify-center shrink-0">
                              {biz.avatarUrl ? (
                                <img
                                  src={biz.avatarUrl}
                                  alt={biz.name}
                                  className="size-full object-cover"
                                  onError={(e) => {
                                    (e.currentTarget as HTMLElement).style.display = "none";
                                  }}
                                />
                              ) : (
                                <Store className="size-5 text-muted-foreground" />
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1">
                                <span className="text-xs sm:text-sm font-bold text-foreground truncate">
                                  {biz.name}
                                </span>
                                {biz.isVerified && (
                                  <CheckCircle2 className="size-4 text-primary shrink-0" />
                                )}
                              </div>
                              <span className="text-xs text-muted-foreground block truncate">
                                {biz.category}
                              </span>
                            </div>
                          </button>

                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() => handleOpenStoreChat(biz.storeId, biz.name, "geral")}
                              aria-label={`Conversar com ${biz.name}`}
                              className="h-11 min-h-11 px-3 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                            >
                              <MessageCircle className="size-4" />
                              <span>Chat</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleOpenStoreProfile(biz.slug, biz.id)}
                              aria-label={`Ver perfil de ${biz.name}`}
                              className="size-11 min-h-11 min-w-11 rounded-xl border border-border/50 bg-background hover:bg-muted/50 text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                            >
                              <ExternalLink className="size-4" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>
              )}

              {/* CONTATOS */}
              {showContacts && filteredContacts.length > 0 && (
                <section aria-label="Contatos" className="space-y-1">
                  <div className="px-2 py-1 flex items-center justify-between">
                    <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                      Contatos
                    </h3>
                    <span className="text-2xs font-mono text-muted-foreground">
                      {filteredContacts.length}
                    </span>
                  </div>
                  <div className="divide-y divide-border/30 rounded-xl border border-border/40 bg-card overflow-hidden">
                    {filteredContacts.map((person) => {
                      const isBusy = startingId === person.id;
                      return (
                        <button
                          key={person.id}
                          type="button"
                          disabled={isBusy}
                          onClick={() => handleOpenPersonChat(person.id, person.name)}
                          className="w-full p-3 min-h-14 flex items-center justify-between gap-3 hover:bg-muted/30 transition-colors text-left cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="size-11 min-h-11 min-w-11 rounded-full bg-muted border border-border/50 overflow-hidden flex items-center justify-center shrink-0">
                              {person.avatar_url ? (
                                <img
                                  src={person.avatar_url}
                                  alt={person.name}
                                  className="size-full object-cover"
                                  onError={(e) => {
                                    (e.currentTarget as HTMLElement).style.display = "none";
                                  }}
                                />
                              ) : (
                                <User className="size-5 text-muted-foreground" />
                              )}
                            </div>
                            <div className="min-w-0">
                              <span className="text-xs sm:text-sm font-bold text-foreground block truncate">
                                {person.name}
                              </span>
                              <span className="text-xs text-muted-foreground block truncate">
                                {person.subtitle || "Membro"}
                              </span>
                            </div>
                          </div>
                          <span className="h-11 min-h-11 px-3 rounded-xl bg-muted/60 text-foreground text-xs font-bold inline-flex items-center gap-1 shrink-0">
                            <MessageCircle className="size-4 text-primary" />
                            <span>Mensagem</span>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </section>
              )}

              {/* DEPARTAMENTOS */}
              {showDepartments && filteredDepartments.length > 0 && (
                <section aria-label="Departamentos" className="space-y-1">
                  <div className="px-2 py-1 flex items-center justify-between">
                    <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                      Departamentos
                    </h3>
                    <span className="text-2xs font-mono text-muted-foreground">
                      {filteredDepartments.length}
                    </span>
                  </div>
                  <div className="divide-y divide-border/30 rounded-xl border border-border/40 bg-card overflow-hidden">
                    {filteredDepartments.map((dept) => (
                      <button
                        key={dept.key}
                        type="button"
                        onClick={() =>
                          handleOpenStoreChat(dept.storeId, dept.storeName, dept.departmentId)
                        }
                        className="w-full p-3 min-h-14 flex items-center justify-between gap-3 hover:bg-muted/30 transition-colors text-left cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="size-11 min-h-11 min-w-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                            <Layers className="size-5" />
                          </div>
                          <div className="min-w-0">
                            <span className="text-xs sm:text-sm font-bold text-foreground block truncate">
                              {dept.storeName} · {dept.departmentLabel}
                            </span>
                            <span className="text-xs text-muted-foreground block truncate">
                              {dept.description}
                            </span>
                          </div>
                        </div>
                        <MessageCircle className="size-4 text-primary shrink-0" />
                      </button>
                    ))}
                  </div>
                </section>
              )}

              {/* Empty state */}
              {(!showBusinesses || unifiedBusinesses.length === 0) &&
                (!showContacts || filteredContacts.length === 0) &&
                (!showDepartments || filteredDepartments.length === 0) && (
                  <div className="py-12 text-center space-y-2">
                    <Search className="size-8 text-muted-foreground/40 mx-auto" />
                    <p className="text-sm font-bold text-foreground">
                      Nenhum resultado encontrado
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Tente buscar por outro nome de empresa, contato ou departamento.
                    </p>
                  </div>
                )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
