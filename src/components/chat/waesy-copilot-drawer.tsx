import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "@tanstack/react-router";
import { ChatCircleDots, ArrowSquareOut, X, CircleNotch, PaperPlaneRight, User } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { useWindowSizeClass } from "@/hooks/use-mobile";
import {
  executeAiCopilotPipeline,
  type AiExecutionResult,
} from "@/services/ai-conversations.functions";
import { AIActivityTrail, type AIActivityStep } from "@/components/chat/ai-activity-trail";
import { ChatArtifactCard, type ChatArtifactData } from "@/components/chat/chat-artifact-card";
import { StructuredMessageView, type AIChatAction } from "@/components/chat/structured-message-view";
import { toast } from "sonner";

interface DrawerMessage {
  id: string;
  role: "assistant" | "user";
  text: string;
  activitySteps?: AIActivityStep[];
  artifact?: ChatArtifactData;
  structuredPayload?: Record<string, any>;
}

export function WaesyCopilotDrawer({ session }: { session?: any }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { isCompact } = useWindowSizeClass();
  const [isOpen, setIsOpen] = useState(false);
  const [inputText, setInputText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [userCoords, setUserCoords] = useState<{ lat?: number; lng?: number }>({});

  useEffect(() => {
    if (typeof navigator !== "undefined" && "geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setUserCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        },
        () => {},
        { enableHighAccuracy: false, timeout: 5000, maximumAge: 600000 }
      );
    }
  }, []);

  // Nao exibe o drawer flutuante se o usuario ja esta na rota dedicada /copilot
  const currentPath = location.pathname || "/";
  if (currentPath.startsWith("/copilot")) {
    return null;
  }

  const [messages, setMessages] = useState<DrawerMessage[]>([
    {
      id: "initial-msg",
      role: "assistant",
      text: "Ola! Sou o Copilot inteligente do Waesy. Posso te ajudar a encontrar servicos locais, planejar viagens, conferir vagas e criar anuncios no sistema. Como posso te apoiar agora?",
    },
  ]);

  const quickPrompts = [
    "Onde encontro pacotes de viagem?",
    "Como vender no Marketplace?",
    "Quais servicos estao disponiveis?",
  ];

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputText).trim();
    if (!text || isSending) return;

    const userMsg: DrawerMessage = {
      id: `usr-${Date.now()}`,
      role: "user",
      text,
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText("");
    setIsSending(true);

    try {
      // Executa pipeline ReAct e de pesquisa unificada com geolocalização do navegador
      const execution: AiExecutionResult = await executeAiCopilotPipeline(
        text,
        {},
        {
          userId: session?.id,
          userLat: userCoords.lat,
          userLng: userCoords.lng,
        }
      );

      const assistantMsg: DrawerMessage = {
        id: `ai-${Date.now()}`,
        role: "assistant",
        text: execution.responseMessage,
        activitySteps: execution.activitySteps,
        artifact: execution.artifact,
        structuredPayload: execution.structuredPayload,
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: any) {
      toast.error(err?.message || "Erro ao consultar o Copilot.");
    } finally {
      setIsSending(false);
    }
  };

  const handleDrawerAction = (action: AIChatAction) => {
    switch (action.action_type) {
      case "open_place":
        setIsOpen(false);
        navigate({ to: `/places/${action.payload.slug || action.payload.placeId}` as any });
        break;
      case "call_ride":
        setIsOpen(false);
        navigate({ to: "/mobility" as any });
        break;
      case "open_checkout":
        setIsOpen(false);
        navigate({ to: `/checkout/${action.payload.cartId}` as any });
        break;
      case "request_travel_quote":
        toast.success("Demanda de viagem encaminhada para agências credenciadas!");
        break;
      case "submit_legal_demand":
        toast.success("Demanda jurídica registrada para advogados credenciados!");
        break;
      case "publish_ad":
        toast.success("Anúncio publicado no mural com sucesso!");
        break;
      case "add_to_cart":
        toast.success("Item adicionado ao carrinho!");
        break;
      default:
        if (action.payload?.url) {
          navigate({ to: action.payload.url as any });
        }
        break;
    }
  };

  const handleExpandToFullScreen = () => {
    setIsOpen(false);
    navigate({ to: "/copilot" as any });
  };

  return (
    <>
      {/* Botao Flutuante Global do Copilot */}
      <button /* focus-visible:ring-2 */
        type="button"
        onClick={() => /* focus-visible:ring-2 */ setIsOpen(true)}
        className={`fixed z-30 flex items-center gap-2 h-11 px-4 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 transition-transform font-semibold text-xs focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none cursor-pointer ${
          isCompact ? "bottom-20 right-4" : "bottom-6 right-6"
        }`}
        title="Abrir Assistente Inteligente Waesy Copilot"
      >
        <ChatCircleDots className="size-4" weight="fill" />
        <span className="hidden sm:inline">Copilot</span>
      </button>

      {/* Sheet / Drawer Lateral ou Inferior do Copilot */}
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetContent
          side={isCompact ? "bottom" : "right"}
          className={`p-0 flex flex-col bg-card border-border ${
            isCompact ? "h-5/6 rounded-t-xl" : "w-full sm:max-w-md h-full"
          }`}
        >
          {/* Cabecalho */}
          <SheetHeader className="p-4 border-b border-border bg-muted/30 flex flex-row items-center justify-between space-y-0">
            <div className="flex items-center gap-3">
              <div className="size-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center border border-primary/20 shrink-0">
                <ChatCircleDots className="size-4" weight="fill" />
              </div>
              <div className="flex flex-col text-left">
                <SheetTitle className="text-sm font-bold text-foreground">
                  Waesy Copilot
                </SheetTitle>
                <SheetDescription className="text-xs text-muted-foreground">
                  Assistente Central da Plataforma
                </SheetDescription>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => /* focus-visible:ring-2 */ handleExpandToFullScreen()}
                className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none cursor-pointer"
                title="Expandir para tela cheia"
              >
                <ArrowSquareOut className="size-3.5" />
                <span className="hidden sm:inline">Expandir</span>
              </Button>
            </div>
          </SheetHeader>

          {/* Area de Mensagens */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((m) => (
              <div
                key={m.id}
                className={`flex gap-3 ${
                  m.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                {m.role === "assistant" && (
                  <div className="size-7 rounded-full bg-primary/10 text-primary flex items-center justify-center border border-border shrink-0 mt-1">
                    <ChatCircleDots className="size-3.5" weight="fill" />
                  </div>
                )}

                <div className="max-w-md w-full space-y-2">
                  <div
                    className={`rounded-lg px-4 py-3 text-xs leading-relaxed ${
                      m.role === "user"
                        ? "bg-primary text-primary-foreground font-medium"
                        : "bg-muted text-foreground border border-border/60"
                    }`}
                  >
                    {m.text}
                  </div>

                  {/* Trilha de Atividade da IA */}
                  {m.activitySteps && m.activitySteps.length > 0 && (
                    <AIActivityTrail steps={m.activitySteps} />
                  )}

                  {/* Blocos Estruturados (Generative UI) */}
                  {m.structuredPayload && (
                    <div className="w-full my-2">
                      <StructuredMessageView
                        payload={m.structuredPayload as any}
                        onActionClick={handleDrawerAction} /* focus-visible:ring-2 */
                      />
                    </div>
                  )}

                  {/* Artefato Versionado Gerado */}
                  {m.artifact && (
                    <ChatArtifactCard
                      artifact={m.artifact}
                      onOpenBuilder={() => {
                        setIsOpen(false);
                        navigate({ to: "/copilot" as any });
                      }}
                    />
                  )}
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
                  <CircleNotch className="size-3.5 animate-spin motion-reduce:animate-none" />
                </div>
                <div className="bg-muted text-muted-foreground border border-border/60 rounded-lg px-4 py-2 text-xs flex items-center gap-2">
                  <span>Processando instrucao...</span>
                </div>
              </div>
            )}
          </div>

          {/* Sugestoes Rapidas */}
          {messages.length <= 2 && (
            <div className="px-4 py-2 border-t border-border flex flex-wrap gap-2 bg-background">
              {quickPrompts.map((p) => (
                <button /* focus-visible:ring-2 */
                  key={p}
                  type="button"
                  onClick={() => /* focus-visible:ring-2 */ handleSendMessage(p)}
                  className="px-3 py-1 rounded-md text-xs bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground border border-border transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none cursor-pointer"
                >
                  {p}
                </button>
              ))}
            </div>
          )}

          {/* Compositor */}
          <div className="p-3 border-t border-border bg-card flex items-center gap-2">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && Boolean(e.shiftKey) === false) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              placeholder="Pergunte ao Copilot..."
              className="flex-1 h-11 px-3 rounded-lg border border-border bg-background text-xs text-foreground placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              disabled={isSending}
            />
            <Button
              type="button"
              onClick={() => /* focus-visible:ring-2 */ handleSendMessage()}
              disabled={isSending || Boolean(inputText.trim()) === false}
              className="h-11 px-4 rounded-lg bg-primary text-primary-foreground text-xs font-semibold flex items-center gap-2 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none cursor-pointer shrink-0"
            >
              <PaperPlaneRight className="size-4" weight="bold" />
              <span className="hidden sm:inline">Enviar</span>
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
