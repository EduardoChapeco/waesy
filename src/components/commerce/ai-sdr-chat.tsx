import React, { useState, useRef, useEffect } from "react";
import { MessageCircle, X, Sparkles, Send, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export function AiSdrChat({ classifiedId, storeName }: { classifiedId: string, storeName?: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  
  // Gere um ID de sessão anônimo caso o usuário não esteja logado, e salve no sessionStorage.
  const getSessionId = () => {
     if (typeof window !== "undefined") {
        let sid = sessionStorage.getItem("sdr_session_id");
        if (!sid) {
           sid = crypto.randomUUID();
           sessionStorage.setItem("sdr_session_id", sid);
        }
        return sid;
     }
     return undefined;
  };

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;
    
    const newMsg: ChatMessage = { role: "user", content: input.trim() };
    const updatedMessages = [...messages, newMsg];
    
    setMessages(updatedMessages);
    setInput("");
    setIsLoading(true);

    try {
      const res = await fetch("/api/trpc/chatWithSDR", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          classifiedId,
          messages: updatedMessages,
          sessionId: getSessionId(),
        }),
      });

      if (!res.ok) throw new Error("Falha na comunicação");
      const data = await res.json();
      
      if (data?.result?.data?.reply) {
         setMessages(prev => [...prev, { role: "assistant", content: data.result.data.reply }]);
      } else {
         throw new Error("Resposta vazia da IA");
      }
    } catch (e: any) {
      toast.error("Assistente indisponível no momento.");
      // Remove last user message on fail
      setMessages(prev => prev.slice(0, -1));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Floating Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-24 right-4 z-50 flex items-center justify-center size-14 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-xl hover:scale-105 active:scale-95 transition-all group"
          aria-label="Falar com Assistente IA"
        >
          <Sparkles className="absolute top-1 right-1 size-3 text-yellow-300 animate-pulse" />
          <MessageCircle className="size-6 group-hover:scale-110 transition-transform" />
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-0 right-0 sm:bottom-6 sm:right-6 z-50 w-full sm:w-[380px] h-[80vh] sm:h-[600px] bg-background border border-border/50 sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-5 fade-in duration-300">
          
          {/* Header */}
          <div className="h-14 bg-gradient-to-r from-blue-600 to-indigo-600 flex items-center justify-between px-4 text-white shrink-0">
            <div className="flex items-center gap-2">
              <div className="size-8 rounded-full bg-white/20 flex items-center justify-center">
                <Sparkles className="size-4" />
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-bold leading-tight">Assistente Virtual</span>
                <span className="text-[10px] text-white/80 leading-tight">
                  {storeName ? `Atendimento: ${storeName}` : "Tire suas dúvidas"}
                </span>
              </div>
            </div>
            <button 
              onClick={() => setIsOpen(false)}
              className="size-8 flex items-center justify-center rounded-full hover:bg-white/20 transition-colors"
            >
              <X className="size-5" />
            </button>
          </div>

          {/* Messages Area */}
          <div 
             className="flex-1 overflow-y-auto p-4 space-y-4 bg-muted/20"
             ref={scrollRef}
          >
            <div className="flex items-start gap-2">
               <div className="size-8 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                  <Sparkles className="size-4 text-blue-600" />
               </div>
               <div className="bg-card border border-border/50 text-foreground text-sm rounded-2xl rounded-tl-sm px-4 py-2.5 max-w-[85%] shadow-sm">
                  Olá! Sou o assistente virtual {storeName ? `da ${storeName}` : 'deste anúncio'}. Como posso te ajudar hoje?
               </div>
            </div>

            {messages.map((m, idx) => (
              <div key={idx} className={cn(
                "flex items-start gap-2",
                m.role === "user" ? "flex-row-reverse" : "flex-row"
              )}>
                {m.role === "assistant" && (
                   <div className="size-8 rounded-full bg-blue-100 flex items-center justify-center shrink-0 mt-1">
                      <Sparkles className="size-4 text-blue-600" />
                   </div>
                )}
                <div className={cn(
                  "text-sm rounded-2xl px-4 py-2.5 max-w-[85%] shadow-sm whitespace-pre-wrap",
                  m.role === "user" 
                    ? "bg-blue-600 text-white rounded-tr-sm" 
                    : "bg-card border border-border/50 text-foreground rounded-tl-sm"
                )}>
                  {m.content}
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex items-start gap-2">
                <div className="size-8 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                   <Sparkles className="size-4 text-blue-600" />
                </div>
                <div className="bg-card border border-border/50 text-foreground text-sm rounded-2xl rounded-tl-sm px-4 py-2.5 shadow-sm flex items-center gap-1.5 h-10">
                   <span className="size-1.5 bg-blue-500 rounded-full animate-bounce [animation-delay:-0.3s]" />
                   <span className="size-1.5 bg-blue-500 rounded-full animate-bounce [animation-delay:-0.15s]" />
                   <span className="size-1.5 bg-blue-500 rounded-full animate-bounce" />
                </div>
              </div>
            )}
          </div>

          {/* Input Area */}
          <div className="p-3 bg-background border-t border-border/50 shrink-0">
             <form 
               onSubmit={(e) => { e.preventDefault(); handleSend(); }}
               className="flex items-center gap-2"
             >
                <Input
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  placeholder="Escreva sua mensagem..."
                  className="rounded-full bg-muted h-11 px-4 border-transparent focus-visible:ring-1 focus-visible:ring-blue-500"
                />
                <Button 
                   type="submit" 
                   size="icon" 
                   disabled={!input.trim() || isLoading}
                   className="rounded-full size-11 bg-blue-600 hover:bg-blue-700 shrink-0 shadow-sm"
                >
                   {isLoading ? <Loader2 className="size-5 animate-spin" /> : <Send className="size-5" />}
                </Button>
             </form>
          </div>
          
        </div>
      )}
    </>
  );
}
