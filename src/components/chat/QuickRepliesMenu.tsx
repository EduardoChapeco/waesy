import * as React from "react";
import { useState, useMemo } from "react";
import { Zap, Search, ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export interface QuickReplyItem {
  id: string;
  shortcut: string;
  title: string;
  content: string;
  category?: string;
  media_url?: string | null;
}

export interface QuickRepliesMenuProps {
  searchTerm: string; // The text typed after '/'
  quickReplies: QuickReplyItem[];
  customerName?: string;
  storeName?: string;
  onSelectReply: (expandedText: string) => void;
  onClose: () => void;
  className?: string;
}

export function QuickRepliesMenu({
  searchTerm,
  quickReplies,
  customerName = "Cliente",
  storeName = "Nossa Loja",
  onSelectReply,
  onClose,
  className,
}: QuickRepliesMenuProps) {
  const cleanFilter = (searchTerm.startsWith("/") ? searchTerm.slice(1) : searchTerm)
    .toLowerCase()
    .trim();

  const filtered = useMemo(() => {
    if (!cleanFilter) return quickReplies;
    return quickReplies.filter(
      (qr) =>
        qr.shortcut.toLowerCase().includes(cleanFilter) ||
        qr.title.toLowerCase().includes(cleanFilter) ||
        qr.content.toLowerCase().includes(cleanFilter)
    );
  }, [quickReplies, cleanFilter]);

  const handleSelect = (qr: QuickReplyItem) => {
    // Variable substitution
    const expanded = qr.content
      .replaceAll("{{nome}}", customerName)
      .replaceAll("{{loja}}", storeName);
    onSelectReply(expanded);
  };

  if (filtered.length === 0) {
    return (
      <div
        className={cn(
          "absolute bottom-full mb-2 left-0 right-0 max-h-48 rounded-lg border border-border/80 bg-card p-3 z-30 text-xs text-muted-foreground text-center",
          className
        )}
      >
        <span>Nenhuma resposta rápida correspondente a "/{cleanFilter}".</span>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "absolute bottom-full mb-2 left-0 right-0 max-h-64 rounded-lg border border-border/80 bg-card z-30 flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-2 motion-reduce:animate-none",
        className
      )}
    >
      <div className="p-2 border-b border-border/40 bg-muted/30 flex items-center justify-between text-2xs text-muted-foreground font-mono">
        <span className="flex items-center gap-2 font-bold text-foreground">
          <Zap className="size-3.5 text-primary" />
          <span>Respostas Rápidas ("/")</span>
        </span>
        <span>{filtered.length} disponíveis</span>
      </div>

      <div className="overflow-y-auto no-scrollbar divide-y divide-border/30 max-h-56">
        {filtered.map((qr) => (
          <button
            key={qr.id}
            type="button"
            onClick={() => handleSelect(qr)}
            className="w-full min-h-11 p-3 flex items-start justify-between gap-3 text-left hover:bg-muted/50 transition-colors cursor-pointer select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <div className="min-w-0 flex-1 space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-xs text-primary">
                  /{qr.shortcut}
                </span>
                <span className="text-xs font-semibold text-foreground truncate">
                  {qr.title}
                </span>
                {qr.category && (
                  <Badge variant="outline" className="text-3xs px-2 py-0 font-normal">
                    {qr.category}
                  </Badge>
                )}
              </div>
              <p className="text-2xs text-muted-foreground line-clamp-1">
                {qr.content}
              </p>
            </div>
            <ArrowRight className="size-4 text-muted-foreground/50 shrink-0 self-center" />
          </button>
        ))}
      </div>
    </div>
  );
}
