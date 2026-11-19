import React, { useState } from "react";
import {
  Bot,
  ExternalLink,
  MessageCircle,
  MessageSquare,
  Send,
  Sparkles,
  User,
  X,
  Loader2,
  ShieldCheck,
  Plane,
  Hotel,
  Ship,
  HelpCircle,
} from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { askProposalSalesAdvisorAI, type TravelProposalDTO } from "@/services/travel-proposal.functions";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export interface TourismProposalAiDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  proposal?: TravelProposalDTO;
  proposalTitle?: string;
  destinationCity?: string;
  agencyName?: string;
  agencyLogoUrl?: string | null;
  publicToken?: string;
  whatsappHref?: string | null;
  agencyPhone?: string | null;
  customPrompt?: string | null;
  hotelsCount?: number;
  flightsCount?: number;
  transfersCount?: number;
  cruisesCount?: number;
}

export function TourismProposalAiDrawer({
  isOpen,
  onClose,
  proposal,
  proposalTitle: proposalTitleProp,
  destinationCity: destinationCityProp,
  agencyName: agencyNameProp,
  agencyLogoUrl: agencyLogoUrlProp,
  publicToken: publicTokenProp,
  whatsappHref: whatsappHrefProp,
  agencyPhone,
  customPrompt,
  hotelsCount: hotelsCountProp,
  flightsCount: flightsCountProp,
  transfersCount: transfersCountProp,
  cruisesCount: cruisesCountProp,
}: TourismProposalAiDrawerProps) {
  const proposalTitle = proposal?.title || proposalTitleProp || "Proposta de Viagem";
  const destinationCity = proposal?.destination_city || destinationCityProp || "";
  const agencyName = (proposal as any)?.store_name || agencyNameProp || "Agência";
  const agencyLogoUrl = (proposal as any)?.store_logo_url || agencyLogoUrlProp || null;
  const publicToken = proposal?.public_token || publicTokenProp || "";
  const effectiveWhatsappPhone = agencyPhone || (proposal as any)?.agency_whatsapp || (proposal as any)?.client_whatsapp;
  const whatsappHref =
    whatsappHrefProp ||
    (effectiveWhatsappPhone
      ? `https://wa.me/${String(effectiveWhatsappPhone).replace(/\D/g, "")}`
      : null);

  const hotelsCount = hotelsCountProp ?? (proposal?.hotels?.length ?? 0);
  const flightsCount = flightsCountProp ?? (proposal?.flights?.length ?? 0);
  const transfersCount = transfersCountProp ?? (proposal?.transfers?.length ?? 0);
  const cruisesCount = cruisesCountProp ?? ((proposal as any)?.cruises?.length ?? 0);

  const initialGreeting = `Olá! Sou o Consultor Virtual com Inteligência Artificial da ${agencyName || "agência"}. Estou aqui para tirar qualquer dúvida sobre seu roteiro para ${destinationCity || "este destino"}, voos, hospedagem, passeios, bagagem, documentação e formas de pagamento. Como posso te ajudar agora?`;

  const [messages, setMessages] = useState<Array<{ role: "user" | "assistant"; content: string }>>([
    { role: "assistant", content: initialGreeting },
  ]);
  const [inputVal, setInputVal] = useState("");
  const [isPending, setIsPending] = useState(false);

  const QUICK_QUESTIONS = [
    "Preciso de passaporte ou visto?",
    "Qual a franquia de bagagem?",
    "Quais os horários dos voos/escala?",
    "Como funciona o parcelamento?",
    "O que está incluso no pacote?",
  ];

  const handleSend = async (questionText?: string) => {
    const q = (questionText || inputVal).trim();
    if (!q || isPending) return;

    const userMsg = { role: "user" as const, content: q };
    setMessages((prev) => [...prev, userMsg]);
    setInputVal("");
    setIsPending(true);

    try {
      const res = await askProposalSalesAdvisorAI({
        data: {
          token: publicToken,
          question: q,
          conversationHistory: messages.concat(userMsg),
        },
      });
      setMessages((prev) => [...prev, { role: "assistant", content: res.reply }]);
    } catch {
      toast.error("O consultor IA teve uma instabilidade momentânea.");
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            "Tive uma pequena oscilação de conexão com a central de dados. Se preferir resposta imediata, você pode falar diretamente com o consultor humano pelo botão de WhatsApp abaixo!",
        },
      ]);
    } finally {
      setIsPending(false);
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-md p-0 flex flex-col bg-card border-l border-border h-full"
      >
        {/* Header estilo Direct / Instagram */}
        <SheetHeader className="p-4 border-b border-border bg-card/95 backdrop-blur flex-row items-center justify-between space-y-0 shrink-0">
          <div className="flex items-center gap-3">
            <div className="relative">
              {agencyLogoUrl ? (
                <img
                  src={agencyLogoUrl}
                  alt={agencyName}
                  className="size-11 rounded-full object-cover border border-border"
                />
              ) : (
                <div className="size-11 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                  <Bot className="size-5" />
                </div>
              )}
              <span className="absolute bottom-0 right-0 size-3 rounded-full bg-emerald-500 border-2 border-card" />
            </div>
            <div className="min-w-0">
              <SheetTitle className="text-sm font-bold text-foreground flex items-center gap-2 leading-snug">
                <span>Consultor IA</span>
                <Sparkles className="size-3.5 text-warning" />
              </SheetTitle>
              <p className="text-2xs text-muted-foreground truncate">
                {agencyName} · {destinationCity || "Especialista"}
              </p>
            </div>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="size-11 min-h-11 min-w-11 p-0 rounded-full text-muted-foreground hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="Fechar chat"
          >
            <X className="size-5" />
          </Button>
        </SheetHeader>

        {/* Badges de Contexto Rápido da Proposta */}
        <div className="px-4 py-2 border-b border-border/60 bg-muted/30 flex items-center gap-2 flex-wrap text-2xs text-muted-foreground shrink-0">
          <span className="font-semibold text-foreground shrink-0">Roteiro:</span>
          {flightsCount > 0 && (
            <span className="inline-flex items-center gap-1 bg-background px-2 py-1 rounded-md border border-border/50 shrink-0">
              <Plane className="size-3 text-primary" /> {flightsCount} voo(s)
            </span>
          )}
          {hotelsCount > 0 && (
            <span className="inline-flex items-center gap-1 bg-background px-2 py-1 rounded-md border border-border/50 shrink-0">
              <Hotel className="size-3 text-primary" /> {hotelsCount} hotel(is)
            </span>
          )}
          {cruisesCount > 0 && (
            <span className="inline-flex items-center gap-1 bg-background px-2 py-1 rounded-md border border-border/50 shrink-0">
              <Ship className="size-3 text-primary" /> Cruzeiro
            </span>
          )}
          {transfersCount > 0 && (
            <span className="inline-flex items-center gap-1 bg-background px-2 py-1 rounded-md border border-border/50 shrink-0">
              Receptivo
            </span>
          )}
        </div>

        {/* Área de Mensagens / Conversa */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((m, idx) => {
            const isUser = m.role === "user";
            return (
              <div
                key={idx}
                className={cn("flex flex-col max-w-xs sm:max-w-sm", isUser ? "ml-auto items-end" : "mr-auto items-start")}
              >
                <div
                  className={cn(
                    "p-3 rounded-2xl text-xs leading-relaxed whitespace-pre-wrap break-words",
                    isUser
                      ? "bg-primary text-primary-foreground rounded-br-sm"
                      : "bg-muted/70 text-foreground border border-border/60 rounded-bl-sm",
                  )}
                >
                  {m.content}
                </div>
                <span className="text-3xs text-muted-foreground mt-1 px-1">
                  {isUser ? "Você" : "Consultor Virtual"}
                </span>
              </div>
            );
          })}

          {isPending && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground p-3 rounded-xl bg-muted/40 max-w-xs">
              <Loader2 className="size-3.5 animate-spin text-primary shrink-0" />
              <span>Consultor IA digitando...</span>
            </div>
          )}
        </div>

        {/* Sugestões Rápidas de 1 Toque */}
        <div className="p-3 border-t border-border/60 bg-muted/20 space-y-2 shrink-0">
          <p className="text-3xs font-bold uppercase tracking-wider text-muted-foreground">
            Perguntas Rápidas Frequentes:
          </p>
          <div className="flex flex-wrap items-center gap-2 pb-1">
            {QUICK_QUESTIONS.map((q, i) => (
              <button
                key={i}
                type="button"
                disabled={isPending}
                onClick={() => handleSend(q)}
                className="shrink-0 text-2xs px-3 py-1 rounded-full bg-card border border-border text-foreground hover:bg-primary/10 hover:border-primary/40 font-medium transition-colors motion-reduce:transition-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {q}
              </button>
            ))}
          </div>
        </div>

        {/* Input & Ações de Envio */}
        <div className="p-3 border-t border-border bg-card space-y-2 shrink-0">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex items-center gap-2"
          >
            <Input
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
              placeholder="Digite sua dúvida sobre a viagem..."
              disabled={isPending}
              className="h-11 min-h-11 text-xs rounded-xl flex-1 bg-background focus-visible:ring-2 focus-visible:ring-ring"
            />
            <Button
              type="submit"
              disabled={!inputVal.trim() || isPending}
              className="h-11 min-h-11 px-4 rounded-xl gap-2 font-bold cursor-pointer focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Send className="size-4" />
              <span className="sr-only">Enviar</span>
            </Button>
          </form>

          {whatsappHref && (
            <div className="flex items-center justify-between text-2xs pt-1 border-t border-border/40 text-muted-foreground">
              <span>Prefere falar com um atendente humano?</span>
              <a
                href={whatsappHref}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-primary font-bold hover:underline"
              >
                <MessageCircle className="size-3 text-emerald-600" />
                <span>WhatsApp da Agência</span>
              </a>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
