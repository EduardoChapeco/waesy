import { useRef, useState } from "react";
import { Archive, BellOff, Check, CheckCheck, Pin, Store, Trash2, User } from "lucide-react";
import { formatRelativeTime } from "@/lib/datetime";
import { cn } from "@/lib/utils";

export type ReadReceiptState = "sent" | "delivered" | "read";

export interface ChatListItemData {
  id: string;
  title: string;
  avatarUrl?: string | null;
  isP2P?: boolean;
  isOnline?: boolean;
  isTyping?: boolean;
  lastMessage?: string | null;
  lastMessageAt?: string | null;
  isOutgoingLastMessage?: boolean;
  readStatus?: ReadReceiptState;
  unreadCount?: number;
  isPinned?: boolean;
  isMuted?: boolean;
  isArchived?: boolean;
}

export interface ChatListItemProps {
  item: ChatListItemData;
  isSelected?: boolean;
  onOpen: (id: string) => void;
  onArchive: (id: string) => void;
  onDelete: (id: string) => void;
  onLongPress: (item: ChatListItemData) => void;
}

/**
 * <ChatListItem> — Componente Canônico de Mensageria Nativa (Padrão WhatsApp / Telegram)
 * - Esquerda: Avatar circular com indicador de status online (bolinha verde sobreposta na borda inferior direita).
 * - Meio-Topo: Nome do contato (font-bold, truncate).
 * - Meio-Baixo: Snippet de 1 linha (text-gray-500, truncate) ou "Digitando..." em tempo real + Ticks de leitura (1 cinza, 2 cinzas, 2 azuis).
 * - Direita: Timestamp (text-xs text-gray-400, alinhado ao topo) + Badge circular de não lidas alinhado abaixo do tempo.
 * - Física de Gestos: Swipe-to-Action para a esquerda revela "Arquivar" (cinza) e "Apagar" (vermelho), e Long-Press aciona Bottom Sheet CRUD.
 */
export function ChatListItem({
  item,
  isSelected,
  onOpen,
  onArchive,
  onDelete,
  onLongPress,
}: ChatListItemProps) {
  const [offsetX, setOffsetX] = useState(0);
  const startXRef = useRef<number | null>(null);
  const startYRef = useRef<number | null>(null);
  const isSwipingRef = useRef(false);
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const unreadCount = Number(item.unreadCount || 0);
  const hasUnread = unreadCount > 0;
  const readState: ReadReceiptState = item.readStatus || "delivered";

  const clearLongPress = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    startXRef.current = touch.clientX;
    startYRef.current = touch.clientY;
    isSwipingRef.current = false;

    clearLongPress();
    longPressTimerRef.current = setTimeout(() => {
      if (!isSwipingRef.current) {
        if (typeof navigator !== "undefined" && navigator.vibrate) {
          navigator.vibrate(15);
        }
        onLongPress(item);
      }
    }, 480);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (startXRef.current === null || startYRef.current === null) return;
    const touch = e.touches[0];
    const deltaX = touch.clientX - startXRef.current;
    const deltaY = Math.abs(touch.clientY - startYRef.current);

    if (deltaY > 12 && !isSwipingRef.current) {
      clearLongPress();
      return;
    }

    if (Math.abs(deltaX) > 10) {
      isSwipingRef.current = true;
      clearLongPress();
      if (deltaX < 0) {
        setOffsetX(Math.max(-148, deltaX));
      } else {
        setOffsetX(Math.min(0, deltaX));
      }
    }
  };

  const handleTouchEnd = () => {
    clearLongPress();
    if (offsetX < -64) {
      setOffsetX(-148);
    } else {
      setOffsetX(0);
    }
    startXRef.current = null;
    startYRef.current = null;
  };

  const handleRowClick = () => {
    if (isSwipingRef.current) {
      isSwipingRef.current = false;
      return;
    }
    if (offsetX !== 0) {
      setOffsetX(0);
      return;
    }
    onOpen(item.id);
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    onLongPress(item);
  };

  return (
    <div className="relative w-full overflow-hidden select-none bg-background">
      {/* Camada Traseira de Swipe-to-Action (Oculta até deslizar para a esquerda) */}
      <div
        className={cn(
          "absolute inset-y-0 right-0 flex items-stretch w-[148px] z-0 transition-opacity duration-150 md:hidden",
          offsetX < 0 ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        )}
      >
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setOffsetX(0);
            onArchive(item.id);
          }}
          className="flex-1 bg-muted-foreground/80 hover:bg-muted-foreground text-primary-foreground flex flex-col items-center justify-center gap-1 text-[11px] font-semibold cursor-pointer transition-colors"
          aria-label="Arquivar conversa"
        >
          <Archive className="size-4" />
          <span>Arquivar</span>
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setOffsetX(0);
            onDelete(item.id);
          }}
          className="flex-1 bg-destructive hover:bg-destructive/90 text-white flex flex-col items-center justify-center gap-1 text-[11px] font-semibold cursor-pointer transition-colors"
          aria-label="Apagar conversa"
        >
          <Trash2 className="size-4" />
          <span>Apagar</span>
        </button>
      </div>

      {/* Superfície Principal Deslizante (Grelha Matemática WhatsApp) */}
      <div
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onClick={handleRowClick}
        onContextMenu={handleContextMenu}
        style={{ transform: `translate3d(${offsetX}px, 0, 0)` }}
        className={cn(
          "relative z-10 flex items-center gap-4 px-4 sm:px-4 py-3 border-l-4 transition-colors duration-150 cursor-pointer",
          isSelected
            ? "bg-muted/70 border-primary"
            : "bg-card border-transparent hover:bg-muted/30 active:bg-muted/50"
        )}
      >
        {/* 1. Esquerda: Avatar Circular + Indicador Online na Borda Inferior Direita */}
        <div className="relative shrink-0">
          <div className="size-12 rounded-full bg-muted border border-border/40 overflow-hidden flex items-center justify-center">
            {item.avatarUrl ? (
              <img
                src={item.avatarUrl}
                alt={item.title}
                className="size-full object-cover"
                loading="lazy"
              />
            ) : item.isP2P ? (
              <User className="size-5 text-muted-foreground" />
            ) : (
              <Store className="size-5 text-muted-foreground" />
            )}
          </div>

          {/* Bolinha Verde de Status Online sobreposta na borda inferior direita */}
          {item.isOnline && (
            <span
              className="absolute bottom-0 right-0 size-3.5 rounded-full bg-emerald-500 border-2 border-background"
              title="Online agora"
            />
          )}
        </div>

        {/* 2. Meio: Topo (Nome Bold Truncate) + Baixo (Ticks de Leitura + Snippet 1 Linha / Digitando...) */}
        <div className="flex-1 min-w-0 flex flex-col justify-center gap-1">
          {/* Meio-Topo: Nome do Contato */}
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-sm font-bold text-foreground truncate">
              {item.title}
            </span>
            {item.isPinned && (
              <Pin className="size-3 text-muted-foreground shrink-0 rotate-45" />
            )}
            {item.isMuted && (
              <BellOff className="size-3 text-muted-foreground shrink-0" />
            )}
          </div>

          {/* Meio-Baixo: Typing Indicator ou Ticks de Leitura + Pré-visualização de 1 Linha */}
          <div className="flex items-center gap-1 min-w-0">
            {item.isTyping ? (
              <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 truncate animate-pulse">
                Digitando...
              </span>
            ) : (
              <>
                {item.isOutgoingLastMessage && (
                  <span className="shrink-0 inline-flex items-center" title={`Status: ${readState}`}>
                    {readState === "sent" && (
                      <Check className="size-3.5 text-gray-400 stroke-[2.2]" />
                    )}
                    {readState === "delivered" && (
                      <CheckCheck className="size-3.5 text-gray-400 stroke-[2.2]" />
                    )}
                    {readState === "read" && (
                      <CheckCheck className="size-3.5 text-sky-500 stroke-[2.4]" />
                    )}
                  </span>
                )}
                <p
                  className={cn(
                    "text-xs truncate",
                    hasUnread
                      ? "text-foreground font-semibold"
                      : "text-gray-500 dark:text-zinc-400"
                  )}
                >
                  {item.lastMessage || "Conversa iniciada"}
                </p>
              </>
            )}
          </div>
        </div>

        {/* 3. Direita: Timestamp no Topo + Badge Circular de Não Lidas Abaixo */}
        <div className="shrink-0 flex flex-col items-end justify-between self-stretch py-1 gap-1">
          <span
            className={cn(
              "text-xs font-mono leading-none",
              hasUnread
                ? "text-emerald-600 dark:text-emerald-400 font-semibold"
                : "text-gray-400 dark:text-zinc-500"
            )}
          >
            {item.lastMessageAt ? formatRelativeTime(item.lastMessageAt) : ""}
          </span>

          {hasUnread ? (
            <span className="min-w-5 h-5 px-2 rounded-full bg-emerald-500 text-white text-[10px] font-bold flex items-center justify-center leading-none">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          ) : (
            <span className="h-5" />
          )}
        </div>
      </div>
    </div>
  );
}
