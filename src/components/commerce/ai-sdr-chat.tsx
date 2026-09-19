/**
 * ai-sdr-chat.tsx — Chat do Agente Vendedor SDR
 *
 * - Usa ServerFn corretamente (não tRPC)
 * - Borda azul sutil (ring-1 ring-blue-500/25)
 * - Sem ícones Sparkles (proibido) — usa Bot
 * - Modal de instruções sobre o agente
 * - Cores neutras dark mode (sem gradientes neon)
 */
import React, { useState, useRef, useEffect } from "react";
import { Bot, X, Send, Loader2, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { chatWithSDR } from "@/services/ai-sdr.functions";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface AiSdrChatProps {
  classifiedId: string;
  storeName?: string;
  sellerName?: string;
}

export function AiSdrChat({ classifiedId, storeName, sellerName }: AiSdrChatProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isInfoOpen, setIsInfoOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Sessão anônima persistida no sessionStorage
  const getSessionId = () => {
    if (typeof window === "undefined") return undefined;
    let sid = sessionStorage.getItem("sdr_session_id");
    if (!sid) {
      sid = crypto.randomUUID();
      sessionStorage.setItem("sdr_session_id", sid);
    }
    return sid;
  };

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userContent = input.trim().slice(0, 1000); // Limite anti-injection no cliente
    const newMsg: ChatMessage = { role: "user", content: userContent };
    const updatedMessages = [...messages, newMsg];

    setMessages(updatedMessages);
    setInput("");
    setIsLoading(true);

    try {
      // [FIX] Usa ServerFn diretamente, não fetch tRPC
      const result = await chatWithSDR({
        data: {
          classifiedId,
          messages: updatedMessages,
          sessionId: getSessionId(),
        },
      });

      if (result?.reply) {
        setMessages((prev) => [...prev, { role: "assistant", content: result.reply }]);
      } else {
        throw new Error("Resposta vazia do assistente");
      }
    } catch (e: any) {
      console.error("[sdr-chat] Erro:", e?.message);
      toast.error("Assistente indisponível no momento. Tente novamente.");
      setMessages((prev) => prev.slice(0, -1));
    } finally {
      setIsLoading(false);
    }
  };

  const displayName = storeName || sellerName || "este anúncio";

  return (
    <>
      {/* Modal de Instruções sobre o Agente */}
      <Dialog open={isInfoOpen} onOpenChange={setIsInfoOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-semibold">
              <Bot className="size-5 text-primary" />
              Vendedor Inteligente (IA)
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground space-y-3 pt-2 text-left">
              <p>
                Este anúncio conta com um <strong>Agente SDR</strong> — um assistente de vendas com Inteligência Artificial treinado para responder suas dúvidas sobre o produto.
              </p>
              <p>
                O agente pode te ajudar com:
              </p>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                <li>Informações detalhadas sobre o produto</li>
                <li>Condições de pagamento</li>
                <li>Estado de conservação e características</li>
                <li>Disponibilidade e formas de contato</li>
              </ul>
              <p className="text-xs text-muted-foreground/70 border-t border-border pt-2 mt-2">
                O agente <strong>não realiza vendas diretas</strong> nem assume compromissos em nome do vendedor. Para fechar negócio, utilize o botão de proposta ou contato oficial do anúncio.
              </p>
            </DialogDescription>
          </DialogHeader>
          <Button
            onClick={() => { setIsInfoOpen(false); setIsOpen(true); }}
            className="w-full mt-2"
            size="sm"
          >
            Iniciar conversa
          </Button>
        </DialogContent>
      </Dialog>

      {/* Botão flutuante */}
      {!isOpen && (
        <div className="fixed bottom-24 right-4 z-50 flex flex-col items-end gap-2">
          {/* Botão "Instruções" */}
          <button
            onClick={() => setIsInfoOpen(true)}
            className="flex items-center gap-1.5 text-xs text-muted-foreground bg-background border border-border/60 rounded-full px-3 py-1.5 shadow-sm hover:bg-muted transition-colors"
            aria-label="Saiba mais sobre o assistente"
          >
            <Info className="size-3.5" />
            Instruções
          </button>

          {/* Botão principal do chat — borda sutil azul */}
          <button
            onClick={() => setIsOpen(true)}
            className={cn(
              "size-14 rounded-full flex items-center justify-center shadow-lg transition-all",
              "bg-primary text-primary-foreground hover:opacity-90 active:scale-95",
              "ring-2 ring-blue-500/20 ring-offset-2 ring-offset-background"
            )}
            aria-label="Falar com o Vendedor IA"
          >
            <Bot className="size-6" />
          </button>
        </div>
      )}

      {/* Janela do Chat */}
      {isOpen && (
        <div className={cn(
          "fixed bottom-0 right-0 sm:bottom-6 sm:right-6 z-50",
          "w-full sm:w-[375px] h-[80vh] sm:h-[560px]",
          "bg-background border border-border sm:rounded-2xl shadow-2xl",
          "flex flex-col overflow-hidden",
          "animate-in slide-in-from-bottom-4 fade-in duration-250",
          // Borda azul sutil no modo aberto
          "ring-1 ring-blue-500/20"
        )}>

          {/* Header limpo — sem gradiente neon */}
          <div className="h-14 bg-card border-b border-border flex items-center justify-between px-4 shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="size-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <Bot className="size-4 text-primary" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground leading-tight">Vendedor IA</p>
                <p className="text-[11px] text-muted-foreground leading-tight truncate max-w-[180px]">
                  {displayName}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setIsInfoOpen(true)}
                className="size-8 flex items-center justify-center rounded-full hover:bg-muted transition-colors text-muted-foreground"
                aria-label="Sobre o assistente"
              >
                <Info className="size-4" />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="size-8 flex items-center justify-center rounded-full hover:bg-muted transition-colors text-muted-foreground"
                aria-label="Fechar chat"
              >
                <X className="size-4" />
              </button>
            </div>
          </div>

          {/* Área de mensagens */}
          <div
            className="flex-1 overflow-y-auto p-4 space-y-3"
            ref={scrollRef}
          >
            {/* Mensagem inicial */}
            <div className="flex items-start gap-2">
              <div className="size-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                <Bot className="size-3.5 text-primary" />
              </div>
              <div className="bg-muted text-foreground text-[13px] rounded-2xl rounded-tl-sm px-3.5 py-2.5 max-w-[85%]">
                Olá! Posso te ajudar com dúvidas sobre este produto. Como posso te ajudar?
              </div>
            </div>

            {messages.map((m, idx) => (
              <div
                key={idx}
                className={cn("flex items-start gap-2", m.role === "user" ? "flex-row-reverse" : "flex-row")}
              >
                {m.role === "assistant" && (
                  <div className="size-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                    <Bot className="size-3.5 text-primary" />
                  </div>
                )}
                <div className={cn(
                  "text-[13px] rounded-2xl px-3.5 py-2.5 max-w-[85%] whitespace-pre-wrap leading-relaxed",
                  m.role === "user"
                    ? "bg-primary text-primary-foreground rounded-tr-sm"
                    : "bg-muted text-foreground rounded-tl-sm"
                )}>
                  {m.content}
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex items-start gap-2">
                <div className="size-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                  <Bot className="size-3.5 text-primary" />
                </div>
                <div className="bg-muted text-foreground text-[13px] rounded-2xl rounded-tl-sm px-3.5 py-2.5 flex items-center gap-1 h-9">
                  <span className="size-1.5 bg-muted-foreground/60 rounded-full animate-bounce [animation-delay:-0.3s]" />
                  <span className="size-1.5 bg-muted-foreground/60 rounded-full animate-bounce [animation-delay:-0.15s]" />
                  <span className="size-1.5 bg-muted-foreground/60 rounded-full animate-bounce" />
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          <div className="p-3 bg-background border-t border-border shrink-0">
            <form
              onSubmit={(e) => { e.preventDefault(); handleSend(); }}
              className="flex items-center gap-2"
            >
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value.slice(0, 1000))}
                placeholder="Escreva sua pergunta..."
                className="rounded-full bg-muted h-10 px-4 border-transparent text-sm focus-visible:ring-1 focus-visible:ring-primary/50"
                disabled={isLoading}
              />
              <Button
                type="submit"
                size="icon"
                disabled={!input.trim() || isLoading}
                className="rounded-full size-10 bg-primary text-primary-foreground shrink-0"
              >
                {isLoading ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
              </Button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
