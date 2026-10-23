import * as React from "react";
import { Send, Bot, User, Sparkles, Paperclip } from "lucide-react";
import { cn } from "@/lib/utils";
import { renderCopilotWidget, type StructuredWidgetPayload } from "./widget-registry";

export interface CopilotMessage {
  id: string;
  sender: "user" | "copilot";
  timestamp: string;
  text?: string;
  widget?: StructuredWidgetPayload;
}

export interface CopilotChatWorkspaceProps {
  messages: CopilotMessage[];
  onSendMessage: (text: string) => void;
  isLoading?: boolean;
  quickPrompts?: string[];
  placeholder?: string;
  headerSlot?: React.ReactNode;
  className?: string;
}

export function CopilotChatWorkspace({
  messages,
  onSendMessage,
  isLoading = false,
  quickPrompts = [
    "Pesquisar voos para Recife",
    "Resumo financeiro de hoje",
    "Consultar pedidos pendentes",
  ],
  placeholder = "Pergunte ao Copilot ou solicite uma ação...",
  headerSlot,
  className,
}: CopilotChatWorkspaceProps) {
  const [inputText, setInputText] = React.useState("");
  const messagesEndRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = inputText.trim();
    if (!trimmed || isLoading) return;
    onSendMessage(trimmed);
    setInputText("");
  };

  return (
    <div
      className={cn(
        "flex flex-col h-full w-full bg-background text-foreground select-none overflow-hidden",
        className
      )}
    >
      {/* Header */}
      {headerSlot ? (
        headerSlot
      ) : (
        <div className="flex items-center justify-between px-6 py-4 border-b border-border/50 bg-card/60 backdrop-blur-xs shrink-0">
          <div className="flex items-center gap-2">
            <div className="size-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <Bot className="size-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-foreground">Waesy Copilot</h3>
              <p className="text-2xs text-muted-foreground">Assistente Operacional Autônomo</p>
            </div>
          </div>
        </div>
      )}

      {/* Message Stream */}
      <div className="flex-1 min-h-0 overflow-y-auto native-scroll p-4 md:p-6 space-y-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center py-12 max-w-md mx-auto space-y-4">
            <div className="size-12 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <Sparkles className="size-6" />
            </div>
            <div className="space-y-1">
              <h4 className="text-base font-semibold text-foreground">Como posso ajudar?</h4>
              <p className="text-xs text-muted-foreground">
                Comande pesquisas de viagens, consulte indicadores financeiros, aprove processos e automatize operações.
              </p>
            </div>

            {quickPrompts.length > 0 && (
              <div className="flex flex-wrap gap-2 justify-center pt-2">
                {quickPrompts.map((prompt, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => onSendMessage(prompt)}
                    className="text-xs px-3 py-2 rounded-full border border-border/70 bg-card hover:bg-muted text-foreground transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {messages.map((msg) => {
          const isCopilot = msg.sender === "copilot";

          return (
            <div
              key={msg.id}
              className={cn("flex gap-3 max-w-3xl", isCopilot ? "mr-auto" : "ml-auto flex-row-reverse")}
            >
              <div
                className={cn(
                  "size-8 rounded-lg flex items-center justify-center shrink-0 text-xs font-semibold select-none",
                  isCopilot ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                )}
              >
                {isCopilot ? <Bot className="size-4" /> : <User className="size-4" />}
              </div>

              <div className={cn("space-y-2 max-w-2xl", !isCopilot && "text-right")}>
                {msg.text && (
                  <div
                    className={cn(
                      "p-4 rounded-lg text-xs leading-relaxed select-text",
                      isCopilot
                        ? "bg-card border border-border/70 text-foreground"
                        : "bg-primary text-primary-foreground font-medium"
                    )}
                  >
                    {msg.text}
                  </div>
                )}

                {msg.widget && (
                  <div className="text-left w-full">{renderCopilotWidget(msg.widget)}</div>
                )}

                <span className="text-3xs text-muted-foreground block px-1">
                  {msg.timestamp}
                </span>
              </div>
            </div>
          );
        })}

        {isLoading && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground py-2">
            <Bot className="size-4 animate-pulse text-primary" />
            <span>Copilot está processando...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Composer Toolbar & Input */}
      <form
        onSubmit={handleSubmit}
        className="p-3 md:p-4 border-t border-border/50 bg-card/80 backdrop-blur-xs shrink-0 sticky bottom-0 z-10"
      >
        <div className="relative flex items-center w-full max-w-4xl mx-auto rounded-lg border border-border/80 bg-background focus-within:border-primary/80 focus-within:ring-2 focus-within:ring-ring transition-all">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder={placeholder}
            disabled={isLoading}
            className="flex-1 min-h-12 px-4 bg-transparent text-base sm:text-sm text-foreground placeholder:text-muted-foreground focus:outline-none select-text"
          />

          <div className="flex items-center gap-1 pr-2 shrink-0">
            <button
              type="submit"
              disabled={isLoading || !inputText.trim()}
              aria-label="Enviar mensagem"
              className="size-9 rounded-lg bg-primary text-primary-foreground flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed hover:bg-primary/90 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Send className="size-4" />
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
