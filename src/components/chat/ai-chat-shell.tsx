import React, { useState, useMemo, useRef, useEffect } from "react";
import {
  Search,
  Pin,
  FolderKanban,
  MessageSquare,
  Plus,
  Bot,
  Clock,
  ChevronLeft,
  ArrowLeft,
  Download,
  RotateCcw,
  Check,
  CheckCheck,
  FileText,
  Brain,
  Copy,
  CornerDownLeft,
  X,
  ShieldCheck,
  Layers,
  Printer,
  Table as TableIcon,
  Calendar,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { useWindowSizeClass } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { formatDate } from "@/lib/datetime";
import { formatMoney } from "@/lib/money";
import { AIActivityTrail, type AIActivityStep } from "./ai-activity-trail";
import { ChatArtifactCard, type ChatArtifactData } from "./chat-artifact-card";
import { ChatComposer, type QuotedMessage } from "./chat-composer";
import { StructuredMessageView } from "./structured-message-view";
import type { CopilotFsmPhase, CopilotFsmExecutionState } from "@/types/copilot-fsm";

export type ThreadType = "store" | "direct_p2p" | "support" | "project" | "ai_assistant";

export interface ChatThreadItem {
  id: string;
  type: ThreadType;
  title: string;
  subtitle?: string;
  avatarUrl?: string;
  lastMessageSnippet?: string;
  lastMessageAt?: string;
  unreadCount?: number;
  isPinned?: boolean;
  isArchived?: boolean;
  metadata?: Record<string, any>;
  workingMemory?: Record<string, any>;
}

export interface ChatMessageItem {
  id: string;
  threadId: string;
  clientMessageId?: string;
  executionId?: string;
  senderId?: string;
  senderName: string;
  isStaffOrAI: boolean;
  avatarUrl?: string;
  text: string;
  createdAt: string;
  status: "sending" | "sent" | "delivered" | "read" | "failed";
  fsmPhase?: CopilotFsmPhase;
  fsmState?: CopilotFsmExecutionState;
  replyTo?: QuotedMessage;
  activitySteps?: AIActivityStep[];
  artifact?: ChatArtifactData;
  structuredPayload?: Record<string, any>;
  attachments?: string[];
  reactions?: Record<string, number>;
}

export interface AIChatShellProps {
  threads: ChatThreadItem[];
  activeThreadId?: string;
  messages: ChatMessageItem[];
  onSelectThread: (threadId: string) => void;
  onSendMessage: (text: string, attachments?: string[], replyToId?: string) => Promise<void> | void;
  onRetryMessage?: (messageId: string) => void;
  onCancelActiveRun?: () => void;
  onCreateThread?: (type: ThreadType, title: string) => void;
  onDeleteThread?: (threadId: string) => void;
  onTogglePinThread?: (threadId: string) => void;
  onToggleArchiveThread?: (threadId: string) => void;
  isSending?: boolean;
  isStreaming?: boolean;
  currentUserProfileId?: string;
  className?: string;
}

export function AIChatShell({
  threads,
  activeThreadId,
  messages,
  onSelectThread,
  onSendMessage,
  onRetryMessage,
  onCancelActiveRun,
  onCreateThread,
  onDeleteThread,
  onTogglePinThread,
  onToggleArchiveThread,
  isSending = false,
  isStreaming = false,
  currentUserProfileId,
  className,
}: AIChatShellProps) {
  // Estados de navegação e busca
  const [filterTab, setFilterTab] = useState<"all" | "direct" | "projects" | "archived">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [replyTo, setReplyTo] = useState<QuotedMessage | null>(null);
  const [showMobileChat, setShowMobileChat] = useState<boolean>(Boolean(activeThreadId));
  const [showContextPanel, setShowContextPanel] = useState<boolean>(false);
  const [activeArtifact, setActiveArtifact] = useState<ChatArtifactData | null>(null);
  const { isCompact } = useWindowSizeClass();

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Rolagem suave automática ao receber novas mensagens
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isStreaming]);

  // Atualizar visualização mobile ao trocar thread
  useEffect(() => {
    if (activeThreadId) {
      setShowMobileChat(true);
    }
  }, [activeThreadId]);

  const activeThread = useMemo(() => {
    return threads.find((t) => t.id === activeThreadId) || null;
  }, [threads, activeThreadId]);

  // Filtragem e busca de threads
  const filteredThreads = useMemo(() => {
    return threads.filter((t) => {
      if (filterTab === "archived") {
        if (Boolean(t.isArchived) === false) return false;
      } else {
        if (Boolean(t.isArchived) === true) return false;
        if (filterTab === "projects" && t.type !== "project" && t.type !== "ai_assistant") return false;
        if (filterTab === "direct" && (t.type === "project" || t.type === "ai_assistant")) return false;
      }

      if (searchQuery.trim().length > 0) {
        const q = searchQuery.toLowerCase();
        return (
          t.title.toLowerCase().includes(q) ||
          (Boolean(t.lastMessageSnippet) && t.lastMessageSnippet!.toLowerCase().includes(q))
        );
      }

      return true;
    });
  }, [threads, filterTab, searchQuery]);

  // Agrupamento de threads fixadas vs normais
  const pinnedThreads = useMemo(() => filteredThreads.filter((t) => Boolean(t.isPinned)), [filteredThreads]);
  const standardThreads = useMemo(() => filteredThreads.filter((t) => Boolean(t.isPinned) === false), [filteredThreads]);

  // Agrupamento de mensagens por separador de data
  const messagesWithSeparators = useMemo(() => {
    const list: Array<{ type: "separator" | "message"; date?: string; message?: ChatMessageItem }> = [];
    let lastDateStr = "";

    messages.forEach((msg) => {
      const dateStr = new Date(msg.createdAt).toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });

      if (dateStr !== lastDateStr) {
        list.push({ type: "separator", date: dateStr });
        lastDateStr = dateStr;
      }
      list.push({ type: "message", message: msg });
    });

    return list;
  }, [messages]);

  const handleReplyClick = (msg: ChatMessageItem) => {
    setReplyTo({
      id: msg.id,
      senderName: msg.senderName,
      text: msg.text || "Conteúdo interativo",
    });
  };

  const handleCopyText = (text: string) => {
    navigator.clipboard?.writeText(text);
  };

  return (
    <div
      className={cn(
        "flex h-screen w-full overflow-hidden bg-background font-sans text-foreground",
        className
      )}
    >
      {/* ── COLUNA 1: LISTA DE THREADS E CONVERSAS ── */}
      <aside
        className={cn(
          "w-full sm:w-80 md:w-88 border-r border-border/40 bg-card/40 flex-col shrink-0 transition-colors",
          showMobileChat ? "hidden md:flex" : "flex"
        )}
      >
        {/* Cabeçalho da Lista de Conversas */}
        <div className="p-3 border-b border-border/40 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <h1 className="text-base font-bold text-foreground tracking-tight">
              Conversas & Projetos
            </h1>

            {onCreateThread && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onCreateThread("project", "Novo Projeto")} /* focus-visible:ring-2 */
                className="h-11 min-h-11 px-3 text-xs font-semibold rounded-md gap-2 border-border/60 hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                title="Criar novo projeto ou thread"
              >
                <Plus className="size-4" />
                <span>Novo</span>
              </Button>
            )}
          </div>

          {/* Campo de Busca Rápida */}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar conversas..."
              className="h-9 pl-9 pr-3 rounded-md bg-muted/50 border-border/40 text-xs placeholder:text-muted-foreground"
            />
          </div>

          {/* Abas de Filtro: Todas, Diretas, Projetos, Arquivadas */}
          <div className="flex items-center gap-1 flex-wrap py-1">
            {[
              { id: "all", label: "Todas" },
              { id: "direct", label: "Diretas" },
              { id: "projects", label: "Projetos" },
              { id: "archived", label: "Arquivadas" },
            ].map((tab) => (
              <Button
                key={tab.id}
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setFilterTab(tab.id as any)} /* focus-visible:ring-2 */
                className={cn(
                  "h-11 min-h-11 px-3 rounded-md text-xs font-medium whitespace-nowrap transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
                  filterTab === tab.id
                    ? "bg-primary text-primary-foreground font-semibold"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                )}
              >
                {tab.label}
              </Button>
            ))}
          </div>
        </div>

        {/* Lista Rolável de Threads */}
        <div className="flex-1 overflow-y-auto divide-y divide-border/20 no-scrollbar">
          {filteredThreads.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground space-y-2">
              <MessageSquare className="size-8 mx-auto text-muted-foreground/40" />
              <p className="text-xs">Nenhuma conversa encontrada</p>
            </div>
          ) : (
            <>
              {/* Seção Fixada */}
              {pinnedThreads.length > 0 && (
                <div className="bg-muted/10">
                  <div className="px-3 py-1 text-2xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                    <Pin className="size-3" />
                    <span>Fixadas</span>
                  </div>
                  {pinnedThreads.map((thread) => (
                    <ThreadListItem
                      key={thread.id}
                      thread={thread}
                      isActive={thread.id === activeThreadId}
                      onClick={() => { /* focus-visible:ring-2 */
                        onSelectThread(thread.id);
                        setShowMobileChat(true);
                      }}
                      onTogglePin={onTogglePinThread}
                      onToggleArchive={onToggleArchiveThread}
                      onDelete={onDeleteThread}
                    />
                  ))}
                </div>
              )}

              {/* Seção Padrão */}
              {standardThreads.map((thread) => (
                <ThreadListItem
                  key={thread.id}
                  thread={thread}
                  isActive={thread.id === activeThreadId}
                  onClick={() => { /* focus-visible:ring-2 */
                    onSelectThread(thread.id);
                    setShowMobileChat(true);
                  }}
                  onTogglePin={onTogglePinThread}
                  onToggleArchive={onToggleArchiveThread}
                  onDelete={onDeleteThread}
                />
              ))}
            </>
          )}
        </div>
      </aside>

      {/* ── COLUNA 2: STREAM DE CONVERSA PRINCIPAL ── */}
      <main
        className={cn(
          "flex-1 flex flex-col h-full bg-background transition-colors min-w-0",
          showMobileChat === false && "hidden md:flex"
        )}
      >
        {activeThread ? (
          <>
            {/* Cabeçalho da Conversa Ativa */}
            <header className="flex items-center justify-between px-3 py-2 border-b border-border/40 bg-background/80 backdrop-blur-md sticky top-0 z-10 gap-2">
              <div className="flex items-center gap-2 min-w-0">
                {/* Botão Voltar para Mobile */}
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowMobileChat(false)} /* focus-visible:ring-2 */
                  className="size-11 min-h-11 min-w-11 rounded-full md:hidden text-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                  aria-label="Voltar para a lista de conversas"
                >
                  <ChevronLeft className="size-5" />
                </Button>

                {/* Avatar e Informações */}
                <div className="size-9 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shrink-0 border border-primary/20">
                  {activeThread.type === "project" ? (
                    <FolderKanban className="size-4" />
                  ) : activeThread.type === "ai_assistant" ? (
                    <Bot className="size-4" />
                  ) : (
                    activeThread.title[0]?.toUpperCase() || "C"
                  )}
                </div>

                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm font-bold text-foreground truncate">
                      {activeThread.title}
                    </h2>
                    {activeThread.isPinned && (
                      <Pin className="size-3 text-primary shrink-0" />
                    )}
                  </div>
                  <p className="text-2xs text-muted-foreground truncate">
                    {activeThread.type === "project"
                      ? "Projeto com memória de trabalho"
                      : activeThread.subtitle || "Conversa ativa"}
                  </p>
                </div>
              </div>

              {/* Ações do Topo */}
              <div className="flex items-center gap-1 shrink-0">
                {onDeleteThread && activeThread.id !== "00000000-0000-0000-0000-000000000001" && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => onDeleteThread(activeThread.id)}
                    className="h-11 min-h-11 px-3 text-xs text-destructive hover:bg-destructive/10 rounded-md gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive/40 cursor-pointer"
                    title="Excluir esta conversa"
                  >
                    <Trash2 className="size-4" />
                    <span className="hidden sm:inline">Excluir</span>
                  </Button>
                )}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowContextPanel((prev) => !prev)} /* focus-visible:ring-2 */
                  className={cn(
                    "h-11 min-h-11 px-3 text-xs rounded-md gap-2 border border-border/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 cursor-pointer transition-colors",
                    showContextPanel
                      ? "bg-primary text-primary-foreground font-semibold"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  )}
                  title="Alternar painel de contexto e artefatos"
                >
                  <Layers className="size-4" />
                  <span>Painel</span>
                </Button>
              </div>
            </header>

            {/* Linha do Tempo de Mensagens */}
            <div
              role="log"
              aria-live="polite"
              aria-label="Histórico de mensagens da conversa"
              className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3 no-scrollbar"
            >
              {/* Aviso de Privacidade e Segurança */}
              <div className="flex justify-center my-2">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-muted/40 text-2xs text-muted-foreground select-none max-w-sm text-center">
                  <ShieldCheck className="size-3 text-primary shrink-0" />
                  <span>Sessão segura com isolamento multi-tenant</span>
                </div>
              </div>

              {messagesWithSeparators.map((item, idx) => {
                if (item.type === "separator") {
                  return (
                    <div key={`sep-${idx}`} className="flex justify-center my-3">
                      <span className="px-2 py-1 rounded-full bg-muted/60 text-2xs text-muted-foreground font-mono">
                        {item.date}
                      </span>
                    </div>
                  );
                }

                const msg = item.message;
                if (!msg) return null;
                const isUser = Boolean(msg.isStaffOrAI) === false;

                return (
                  <div
                    key={msg.id}
                    className={cn(
                      "flex flex-col group",
                      isUser ? "items-end" : "items-start"
                    )}
                  >
                    {/* Citação da Mensagem (Reply) se houver */}
                    {msg.replyTo && (
                      <div
                        className={cn(
                          "mb-1 px-2 py-1 rounded-md text-2xs bg-muted/50 border-l-2 border-primary max-w-md truncate",
                          isUser ? "mr-1 text-right" : "ml-1 text-left"
                        )}
                      >
                        <span className="font-semibold text-primary block truncate">
                          {msg.replyTo.senderName}
                        </span>
                        <span className="text-muted-foreground truncate block">
                          {msg.replyTo.text}
                        </span>
                      </div>
                    )}

                    {/* Trilha de Atividade da IA em Tempo Real (Phase B) */}
                    {msg.activitySteps && msg.activitySteps.length > 0 && (
                      <div className="w-full max-w-md mb-2">
                        <AIActivityTrail
                          steps={msg.activitySteps}
                          executionId={msg.executionId}
                          isStreaming={isStreaming && idx === messagesWithSeparators.length - 1}
                          onCancel={onCancelActiveRun}
                        />
                      </div>
                    )}

                    {/* Artefato Versionado no Chat (Phase C) */}
                    {msg.artifact && (
                      <div className="w-full max-w-md mb-2">
                        <ChatArtifactCard
                          artifact={msg.artifact}
                          onOpenBuilder={(art) => {
                            setActiveArtifact(art);
                            setShowContextPanel(true);
                          }}
                        />
                      </div>
                    )}

                    {/* Blocos Estruturados se houver */}
                    {msg.structuredPayload && (
                      <div className="w-full max-w-md mb-2">
                        <StructuredMessageView
                          payload={msg.structuredPayload as any}
                          isStaff={msg.isStaffOrAI}
                        />
                      </div>
                    )}

                    {/* Bolha de Texto da Mensagem */}
                    {msg.text && (
                      <div
                        className={cn(
                          "relative max-w-md px-3 py-2 rounded-lg text-xs sm:text-sm leading-relaxed",
                          isUser
                            ? "bg-primary text-primary-foreground rounded-tr-xs"
                            : "bg-muted/70 text-foreground rounded-tl-xs border border-border/40",
                          msg.status === "failed" && "border border-destructive/50 bg-destructive/10 text-destructive"
                        )}
                      >
                        <p className="whitespace-pre-wrap break-words">{msg.text}</p>

                        {/* Rodapé da Bolha: Horário e Status */}
                        <div className="flex items-center justify-end gap-1 mt-1 font-mono text-2xs opacity-80">
                          <span>{formatDate(msg.createdAt)}</span>
                          {isUser && (
                            <span>
                              {msg.status === "sending" && <Clock className="size-3" />}
                              {msg.status === "sent" && <Check className="size-3" />}
                              {(msg.status === "delivered" || msg.status === "read") && (
                                <CheckCheck className="size-3 text-primary-foreground" />
                              )}
                              {msg.status === "failed" && (
                                <button type="button" onClick={() => onRetryMessage && onRetryMessage(msg.id)} /* focus-visible:ring-2 */ className="focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-destructive rounded-xs text-destructive hover:scale-110 transition-transform cursor-pointer" title="Falha no envio. Clique para tentar novamente." aria-label="Tentar reenviar mensagem">
                                  <RotateCcw className="size-3" />
                                </button>
                              )}
                            </span>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Barra de Ações Rápidas (Hover / Menu de Contexto) */}
                    <div
                      className={cn(
                        "opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 mt-1 px-1 text-2xs text-muted-foreground",
                        isUser ? "justify-end" : "justify-start"
                      )}
                    >
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleReplyClick(msg)} /* focus-visible:ring-2 */
                        className="h-11 min-h-11 px-3 text-2xs hover:text-foreground cursor-pointer flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                        title="Responder mensagem"
                      >
                        <CornerDownLeft className="size-4" />
                        <span>Responder</span>
                      </Button>
                      <span>•</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleCopyText(msg.text)} /* focus-visible:ring-2 */
                        className="h-11 min-h-11 px-3 text-2xs hover:text-foreground cursor-pointer flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                        title="Copiar texto"
                      >
                        <Copy className="size-4" />
                        <span>Copiar</span>
                      </Button>
                    </div>
                  </div>
                );
              })}

              <div ref={messagesEndRef} />
            </div>

            {/* Composer Integrado (Phase A & Ergonomia de Toque) */}
            <ChatComposer
              onSendMessage={onSendMessage}
              isSending={isSending}
              replyTo={replyTo}
              onCancelReply={() => setReplyTo(null)}
            />
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-muted-foreground space-y-3">
            <div className="size-12 rounded-lg bg-muted/40 flex items-center justify-center text-muted-foreground">
              <Bot className="size-6" />
            </div>
            <h2 className="text-base font-semibold text-foreground">
              Nenhuma conversa selecionada
            </h2>
            <p className="text-xs max-w-sm">
              Escolha uma conversa na barra lateral ou inicie um novo projeto com a inteligência artificial.
            </p>
          </div>
        )}
      </main>

      {/* ── COLUNA 3: PAINEL DE CONTEXTO E ARTEFATOS (Expanded >= 840px / Opcional) ── */}
      {showContextPanel && activeThread && (
        <aside className="w-72 lg:w-96 border-l border-border/40 bg-card/30 p-3 space-y-4 overflow-y-auto hidden lg:flex flex-col shrink-0 no-scrollbar">
          {activeArtifact ? (
            /* Claude Artifacts Split-Screen Inspector */
            <ArtifactViewerContent
              artifact={activeArtifact}
              onClose={() => setActiveArtifact(null)}
            />
          ) : (
            /* Contexto & Memória Padrão */
            <>
              <div className="flex items-center justify-between border-b border-border/40 pb-2">
                <h3 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
                  <Brain className="size-4 text-primary" />
                  <span>Contexto & Memória</span>
                </h3>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => /* focus-visible:ring-2 */ setShowContextPanel(false)}
                  className="size-11 min-h-11 min-w-11 rounded-md text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 cursor-pointer"
                  aria-label="Fechar painel de contexto"
                >
                  <X className="size-4" />
                </Button>
              </div>

              {/* Dados do Projeto ou Thread */}
              <div className="space-y-2">
                <span className="text-2xs font-semibold text-muted-foreground uppercase">
                  Tipo de Conversa
                </span>
                <Badge variant="outline" className="text-xs font-medium border-border/60">
                  {activeThread.type}
                </Badge>
              </div>

              {/* Memória de Trabalho Ativa (Phase D) */}
              <div className="space-y-2">
                <span className="text-2xs font-semibold text-muted-foreground uppercase flex items-center gap-1">
                  <Brain className="size-3 text-primary" />
                  <span>Memória de Trabalho</span>
                </span>
                {activeThread.workingMemory && Object.keys(activeThread.workingMemory).length > 0 ? (
                  <div className="rounded-lg border border-border/40 bg-muted/20 p-2 space-y-2 text-xs">
                    {Object.entries(activeThread.workingMemory).map(([k, v]) => (
                      <div key={k} className="flex justify-between gap-2">
                        <span className="text-muted-foreground truncate">{k}:</span>
                        <span className="font-medium text-foreground truncate font-mono">
                          {String(v)}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-2xs text-muted-foreground">
                    Nenhum dado retido na memória desta thread.
                  </p>
                )}
              </div>

              {/* Artefatos Gerados nesta Conversa */}
              <div className="space-y-2">
                <span className="text-2xs font-semibold text-muted-foreground uppercase flex items-center gap-1">
                  <FileText className="size-3 text-primary" />
                  <span>Artefatos Produzidos</span>
                </span>
                <div className="space-y-2">
                  {messages
                    .filter((m) => Boolean(m.artifact))
                    .map((m) => (
                      <button /* focus-visible:ring-2 */
                        key={m.id}
                        type="button"
                        onClick={() => /* focus-visible:ring-2 */ setActiveArtifact(m.artifact!)}
                        className="w-full text-left p-2 rounded-lg border border-border/40 bg-card hover:border-border transition-colors text-xs space-y-1 cursor-pointer focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-foreground truncate">
                            {m.artifact!.title}
                          </span>
                          <Badge variant="outline" className="text-2xs font-mono h-4">
                            v{m.artifact!.version}
                          </Badge>
                        </div>
                        <span className="text-2xs text-muted-foreground block">
                          {m.artifact!.type}
                        </span>
                      </button>
                    ))}
                  {messages.filter((m) => Boolean(m.artifact)).length === 0 && (
                    <p className="text-2xs text-muted-foreground">
                      Nenhum documento ou planilha gerada ainda.
                    </p>
                  )}
                </div>
              </div>
            </>
          )}
        </aside>
      )}

      {/* ── PAINEL / SHEET DE ARTEFATO RESPONSIVO EM DISPOSITIVOS MÓVEIS (< 840px / isCompact) ── */}
      <Sheet
        open={Boolean(activeArtifact && isCompact)}
        onOpenChange={(open) => {
          if (!open) setActiveArtifact(null);
        }}
      >
        <SheetContent side="bottom" className="h-5/6 p-4 overflow-y-auto bg-card border-border rounded-t-xl">
          {activeArtifact && (
            <ArtifactViewerContent
              artifact={activeArtifact}
              onClose={() => setActiveArtifact(null)}
            />
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function ArtifactViewerContent({
  artifact,
  onClose,
}: {
  artifact: ChatArtifactData;
  onClose: () => void;
}) {
  const handleDownloadCsv = () => {
    const headers = artifact.data?.headers || ["Categoria", "Qtd", "Valor", "Status"];
    const rows = artifact.data?.dataRows || artifact.data?.rows || [];
    const csvContent =
      "data:text/csv;charset=utf-8," +
      [
        headers.join(";"),
        ...(Array.isArray(rows) && Array.isArray(rows[0])
          ? rows.map((r: string[]) => r.join(";"))
          : []),
      ].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${(artifact.title || "tabela").toLowerCase().replace(/\s+/g, "_")}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-4">
      {/* Header do Artefato */}
      <div className="flex items-center justify-between border-b border-border/40 pb-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          /* focus-visible:ring-2 */ onClick={onClose}
          className="h-11 min-h-11 px-3 text-xs text-muted-foreground hover:text-foreground flex items-center gap-2 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none cursor-pointer"
        >
          <ArrowLeft className="size-4" />
          <span>Voltar</span>
        </Button>

        <div className="flex items-center gap-1">
          <Badge variant="outline" className="text-2xs font-mono h-5">
            v{artifact.version}
          </Badge>
          <Badge variant="secondary" className="text-2xs uppercase tracking-wider font-semibold">
            {artifact.type}
          </Badge>
        </div>
      </div>

      <div>
        <h4 className="text-sm font-bold text-foreground leading-snug">{artifact.title}</h4>
        <p className="text-2xs text-muted-foreground">
          {artifact.authorName || "Waesy Copilot"} • {artifact.authorRole || "Artefato Versionado"}
        </p>
      </div>

      {artifact.previewSummary && (
        <div className="rounded-md border border-border/40 bg-muted/20 p-3 text-xs text-muted-foreground leading-relaxed">
          {artifact.previewSummary}
        </div>
      )}

      {/* 1. Viewer de Proposta Comercial / Documento */}
      {(artifact.type === "proposal" || artifact.type === "document") && (
        <div className="space-y-3 rounded-lg border border-border/50 bg-card p-3 text-xs">
          <div className="flex items-center justify-between border-b border-border/40 pb-2">
            <span className="font-bold text-2xs uppercase tracking-wider text-primary">Proposta Executiva</span>
            {artifact.data?.validity_days && (
              <span className="text-2xs text-muted-foreground font-mono">Validade: {artifact.data.validity_days} dias</span>
            )}
          </div>

          {artifact.data?.total_cents && (
            <div className="flex justify-between items-baseline border-b border-border/40 pb-2">
              <span className="text-muted-foreground text-xs">Investimento Total:</span>
              <span className="font-mono font-bold text-base text-primary">
                {formatMoney(artifact.data.total_cents / 100)}
              </span>
            </div>
          )}

          {artifact.data?.milestones && Array.isArray(artifact.data.milestones) && (
            <div className="space-y-2 pt-1">
              <span className="text-2xs font-semibold text-muted-foreground uppercase">Cronograma & Entregas:</span>
              <ul className="space-y-1 text-2xs text-foreground">
                {artifact.data.milestones.map((m: string, i: number) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="size-2 rounded-full bg-primary shrink-0 mt-1" />
                    <span>{m}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {artifact.data?.terms && (
            <div className="pt-2 border-t border-border/40 text-2xs text-muted-foreground">
              <span className="font-semibold block text-foreground mb-1">Termos de Aceite:</span>
              <p>{artifact.data.terms}</p>
            </div>
          )}

          <div className="pt-2 flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="flex-1 h-11 rounded-md text-xs font-semibold cursor-pointer focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
              /* focus-visible:ring-2 */ onClick={handlePrint}
            >
              <Printer className="size-3.5 mr-2" />
              <span>Exportar PDF / Imprimir</span>
            </Button>
          </div>
        </div>
      )}

      {/* 2. Viewer de Planilha / Dados Tabulares */}
      {(artifact.type === "spreadsheet" || artifact.data?.dataRows || artifact.data?.headers) && (
        <div className="space-y-3 rounded-lg border border-border/50 bg-card p-3 text-xs">
          <div className="flex items-center justify-between border-b border-border/40 pb-2">
            <span className="font-bold text-2xs uppercase tracking-wider text-primary">Tabela de Dados</span>
            <Badge variant="outline" className="text-2xs font-mono">
              {artifact.data?.rows || artifact.data?.dataRows?.length || 0} registros
            </Badge>
          </div>

          <div className="table-scroll overflow-x-auto rounded border border-border/40 max-h-56 no-scrollbar">
            <table className="w-full text-2xs text-left border-collapse">
              <thead className="bg-muted/40 border-b border-border/60">
                <tr>
                  {(artifact.data?.headers || ["Item", "Valor", "Status"]).map((h: string, idx: number) => (
                    <th key={idx} className="p-2 font-semibold text-foreground whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border/30">
                {(artifact.data?.dataRows || [["1", "Item", "Ok"]]).map((row: string[], rIdx: number) => (
                  <tr key={rIdx} className="hover:bg-muted/20">
                    {Array.isArray(row) ? (
                      row.map((cell: string, cIdx: number) => (
                        <td key={cIdx} className="p-2 whitespace-nowrap text-muted-foreground">
                          {cell}
                        </td>
                      ))
                    ) : (
                      <td className="p-2 text-muted-foreground">{String(row)}</td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-full h-11 rounded-md text-xs font-semibold cursor-pointer focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
            /* focus-visible:ring-2 */ onClick={handleDownloadCsv}
          >
            <Download className="size-3.5 mr-2" />
            <span>Baixar CSV</span>
          </Button>
        </div>
      )}

      {/* 3. Viewer de Roteiro / Timeline */}
      {(artifact.type === "itinerary" || artifact.data?.days) && (
        <div className="space-y-3 rounded-lg border border-border/50 bg-card p-3 text-xs">
          <span className="font-bold text-2xs uppercase tracking-wider text-primary block">Linha do Tempo</span>
          <div className="space-y-2 max-h-56 overflow-y-auto no-scrollbar">
            {(artifact.data?.days || []).map((d: any, idx: number) => (
              <div key={idx} className="rounded border border-border/40 bg-muted/20 p-2 space-y-1">
                <span className="font-bold text-primary text-2xs uppercase block">
                  Dia {d.day || idx + 1}: {d.title}
                </span>
                <ul className="space-y-1 text-2xs text-muted-foreground">
                  {d.activities?.map((act: string, aIdx: number) => (
                    <li key={aIdx} className="flex items-start gap-2">
                      <span className="text-primary font-bold">•</span>
                      <span>{act}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4. Ações Globais */}
      <div className="pt-1">
        <Button
          type="button"
          size="sm"
          className="w-full h-11 rounded-md text-xs font-semibold cursor-pointer focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
          /* focus-visible:ring-2 */ onClick={() => {
            const dataStr = JSON.stringify(artifact.data || artifact, null, 2);
            navigator.clipboard.writeText(dataStr);
          }}
        >
          <Copy className="size-3.5 mr-2" />
          <span>Copiar Conteúdo do Artefato</span>
        </Button>
      </div>
    </div>
  );
}

function ThreadListItem({
  thread,
  isActive,
  onClick, /* focus-visible:ring-2 */
  onTogglePin,
  onToggleArchive,
  onDelete,
}: {
  thread: ChatThreadItem;
  isActive: boolean;
  onClick: () => void; /* focus-visible:ring-2 */
  onTogglePin?: (id: string) => void;
  onToggleArchive?: (id: string) => void;
  onDelete?: (id: string) => void;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      onClick={onClick} /* focus-visible:ring-2 */
      className={cn(
        "p-3 flex items-start gap-2 cursor-pointer transition-colors relative group focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/40 h-auto w-full text-left justify-start rounded-none",
        isActive ? "bg-muted/60" : "hover:bg-muted/30"
      )}
    >
      <div className="size-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shrink-0 border border-primary/20">
        {thread.type === "project" ? (
          <FolderKanban className="size-4" />
        ) : thread.type === "ai_assistant" ? (
          <Bot className="size-4" />
        ) : (
          thread.title[0]?.toUpperCase() || "T"
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-1">
          <span className="text-xs font-semibold text-foreground truncate">
            {thread.title}
          </span>
          {thread.lastMessageAt && (
            <span className="text-2xs text-muted-foreground font-mono shrink-0">
              {formatDate(thread.lastMessageAt)}
            </span>
          )}
        </div>

        {thread.lastMessageSnippet && (
          <p className="text-2xs text-muted-foreground truncate mt-1">
            {thread.lastMessageSnippet}
          </p>
        )}
      </div>

      {/* Ícone fixado ou Ações Rápidas no Hover */}
      <div className="shrink-0 flex items-center gap-1">
        {onDelete && thread.id !== "00000000-0000-0000-0000-000000000001" && (
          <span
            role="button"
            tabIndex={0}
            onClick={(e) => {
              e.stopPropagation();
              onDelete(thread.id);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.stopPropagation();
                onDelete(thread.id);
              }
            }}
            className="opacity-0 group-hover:opacity-100 p-2 size-11 min-h-11 min-w-11 flex items-center justify-center text-muted-foreground hover:text-destructive rounded-md transition-opacity cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive/40"
            title="Excluir conversa"
          >
            <Trash2 className="size-3" />
          </span>
        )}
        {thread.isPinned && (
          <Pin className="size-3 text-primary shrink-0" />
        )}
        {thread.unreadCount && thread.unreadCount > 0 ? (
          <Badge variant="secondary" className="size-4 p-0 flex items-center justify-center rounded-full text-2xs font-mono">
            {thread.unreadCount}
          </Badge>
        ) : null}
      </div>
    </Button>
  );
}
