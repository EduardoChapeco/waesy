import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  ChatCircleDots,
  Sparkle,
  User,
  PaperPlaneRight,
  ArrowSquareOut,
  CheckCircle,
  CircleNotch,
  Storefront,
} from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { chatWithSDR, escalateSdrToHuman } from "@/services/ai-sdr.functions";
import { toast } from "sonner";

export interface ProductAiSdrChatProps {
  productId?: string;
  classifiedId?: string;
  storeId?: string;
  storeName?: string;
  itemTitle?: string;
  niche?: string;
  triggerVariant?: "floating" | "button" | "compact";
  className?: string;
}

interface ChatMessage {
  id: string;
  role: "assistant" | "user";
  content: string;
}

export function ProductAiSdrChat({
  productId,
  classifiedId,
  storeId,
  storeName = "Empresa",
  itemTitle = "Produto",
  niche = "geral",
  triggerVariant = "button",
  className = "",
}: ProductAiSdrChatProps) {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [inputMessage, setInputMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isEscalating, setIsEscalating] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const isTourism =
    niche === "tourism" ||
    niche === "turismo" ||
    niche === "viagem" ||
    itemTitle.toLowerCase().includes("resort") ||
    itemTitle.toLowerCase().includes("viagem");

  const initialAssistantGreeting = isTourism
    ? `Ola! Sou o especialista virtual da ${storeName}. Posso esclarecer duvidas sobre o pacote ${itemTitle}, incluindo datas, manifesto de passageiros, politicas de cancelamento e formas de pagamento. Como posso ajudar voce?`
    : `Ola! Sou o assistente virtual da ${storeName}. Posso esclarecer qualquer duvida sobre ${itemTitle}, disponibilidade e formas de pagamento. Como posso ajudar?`;

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "initial-msg",
      role: "assistant",
      content: initialAssistantGreeting,
    },
  ]);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isOpen]);

  const quickChips = isTourism
    ? [
        "Como funciona a reserva?",
        "Quais as formas de pagamento?",
        "Tem desconto via Pix?",
        "Como emitir o voucher?",
      ]
    : [
        "Tem pronta entrega?",
        "Quais as formas de pagamento?",
        "Qual o prazo de envio?",
      ];

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputMessage).trim();
    if (!text || isSending) return;

    const userMsg: ChatMessage = {
      id: `usr-${Date.now()}`,
      role: "user",
      content: text,
    };

    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);
    setInputMessage("");
    setIsSending(true);

    try {
      const payloadMessages = nextMessages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const res = await chatWithSDR({
        data: {
          productId,
          classifiedId,
          storeId,
          messages: payloadMessages,
        },
      });

      if (res?.reply) {
        setMessages((prev) => [
          ...prev,
          {
            id: `ast-${Date.now()}`,
            role: "assistant",
            content: res.reply,
          },
        ]);
      }
    } catch (err: any) {
      console.warn("[ProductAiSdrChat] Erro ao conversar com SDR:", err);
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: "assistant",
          content:
            "No momento nosso assistente esta com alta demanda. Voce pode clicar no botao abaixo para falar diretamente com um atendente da loja.",
        },
      ]);
    } finally {
      setIsSending(false);
    }
  };

  const handleEscalateToHuman = async () => {
    if (!storeId) {
      toast.error("Identificacao da loja nao encontrada para transferencia.");
      return;
    }

    setIsEscalating(true);
    try {
      const lastUserQuestion = messages
        .filter((m) => m.role === "user")
        .slice(-1)[0]?.content;

      const summaryText = `Cliente solicitou transferencia humana apos duvidas sobre ${itemTitle}. Total de mensagens: ${messages.length}.`;

      const res = await escalateSdrToHuman({
        data: {
          storeId,
          subject: `Atendimento: ${itemTitle}`,
          itemTitle,
          summary: summaryText,
          lastQuestion: lastUserQuestion,
        },
      });

      if (res?.threadId) {
        toast.success("Transferindo para a conversa com o atendente...");
        setIsOpen(false);
        navigate({
          to: "/conta/conversas/$id",
          params: { id: res.threadId },
        });
      }
    } catch (err: any) {
      toast.error(err?.message || "Erro ao conectar com atendente humano.");
    } finally {
      setIsEscalating(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {triggerVariant === "floating" ? (
          <Button
            type="button"
            className="fixed bottom-20 right-4 sm:bottom-8 sm:right-8 z-40 h-12 px-4 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center gap-2 text-xs font-semibold focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none cursor-pointer"
          >
            <Sparkle className="size-4" weight="fill" />
            <span>Tirar Duvidas com IA</span>
          </Button>
        ) : triggerVariant === "compact" ? (
          <Button
            type="button"
            variant="outline"
            className={`h-11 px-3 rounded-lg text-xs font-medium border-border flex items-center gap-2 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none cursor-pointer ${className}`}
          >
            <Sparkle className="size-3.5 text-primary" weight="fill" />
            <span>Duvidas com SDR</span>
          </Button>
        ) : (
          <Button
            type="button"
            variant="outline"
            className={`h-11 px-4 rounded-lg text-xs font-semibold border-border hover:bg-muted text-foreground flex items-center justify-center gap-2 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none cursor-pointer ${className}`}
          >
            <ChatCircleDots className="size-4 text-primary" weight="bold" />
            <span>Tirar Duvidas com Atendente IA</span>
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="sm:max-w-md w-full h-[85vh] max-h-[620px] p-0 flex flex-col bg-card border-border rounded-lg overflow-hidden">
        {/* Cabecalho da Conversa */}
        <DialogHeader className="p-4 border-b border-border bg-muted/30 flex flex-row items-center justify-between space-y-0">
          <div className="flex items-center gap-3">
            <div className="size-9 rounded-full bg-primary/10 text-primary flex items-center justify-center border border-primary/20 shrink-0">
              <Storefront className="size-5" />
            </div>
            <div className="flex flex-col text-left">
              <DialogTitle className="text-sm font-bold text-foreground line-clamp-1">
                {storeName}
              </DialogTitle>
              <span className="text-xs text-muted-foreground flex items-center gap-2">
                <CheckCircle className="size-3 text-emerald-500" weight="fill" />
                Assistente Especialista Online
              </span>
            </div>
          </div>
        </DialogHeader>

        {/* Notificacao de Nicho / Contexto */}
        <div className="px-4 py-2 bg-muted/20 border-b border-border text-xs text-muted-foreground flex items-center justify-between">
          <span className="line-clamp-1 font-medium text-foreground">
            Item: {itemTitle}
          </span>
          {storeId && (
            <button
              type="button"
              onClick={handleEscalateToHuman}
              disabled={isEscalating}
              className="text-primary hover:underline font-semibold flex items-center gap-1 text-xs shrink-0 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none cursor-pointer"
            >
              {isEscalating ? (
                <CircleNotch className="size-3 animate-spin" />
              ) : (
                <ArrowSquareOut className="size-3" />
              )}
              Falar com Atendente
            </button>
          )}
        </div>

        {/* Trilha de Mensagens */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.map((m) => (
            <div
              key={m.id}
              className={`flex gap-3 ${
                m.role === "user" ? "justify-end" : "justify-start"
              }`}
            >
              {m.role === "assistant" && (
                <div className="size-7 rounded-full bg-primary/10 text-primary flex items-center justify-center border border-border shrink-0 mt-1">
                  <Sparkle className="size-3.5" weight="fill" />
                </div>
              )}

              <div
                className={`max-w-[80%] rounded-lg px-4 py-3 text-xs leading-relaxed ${
                  m.role === "user"
                    ? "bg-primary text-primary-foreground font-medium"
                    : "bg-muted text-foreground border border-border/60"
                }`}
              >
                {m.content}
              </div>

              {m.role === "user" && (
                <div className="size-7 rounded-full bg-muted text-muted-foreground flex items-center justify-center border border-border shrink-0 mt-1">
                  <User className="size-3.5" />
                </div>
              )}
            </div>
          ))}

          {isSending && (
            <div className="flex gap-3 justify-start">
              <div className="size-7 rounded-full bg-primary/10 text-primary flex items-center justify-center border border-border shrink-0 mt-1">
                <CircleNotch className="size-3.5 animate-spin" />
              </div>
              <div className="bg-muted text-muted-foreground border border-border/60 rounded-lg px-4 py-2 text-xs flex items-center gap-2">
                <span>Digitando resposta...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Sugestoes Rapidas */}
        {messages.length <= 2 && (
          <div className="px-4 py-2 border-t border-border flex flex-wrap gap-2 bg-background">
            {quickChips.map((chip) => (
              <button
                key={chip}
                type="button"
                onClick={() => handleSendMessage(chip)}
                className="px-3 py-1 rounded-md text-xs bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground border border-border transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none cursor-pointer"
              >
                {chip}
              </button>
            ))}
          </div>
        )}

        {/* Compositor de Mensagem */}
        <div className="p-3 border-t border-border bg-card flex items-center gap-2">
          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
              }
            }}
            placeholder="Digite sua duvida..."
            className="flex-1 h-11 px-3 rounded-lg border border-border bg-background text-xs text-foreground placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            disabled={isSending}
          />
          <Button
            type="button"
            onClick={() => handleSendMessage()}
            disabled={isSending || !inputMessage.trim()}
            className="h-11 px-4 rounded-lg bg-primary text-primary-foreground text-xs font-semibold flex items-center gap-2 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none cursor-pointer shrink-0"
          >
            <PaperPlaneRight className="size-4" weight="bold" />
            <span className="hidden sm:inline">Enviar</span>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
