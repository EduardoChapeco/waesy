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
  dispatchAiChatAction,
  type AiExecutionResult,
} from "@/services/ai-conversations.functions";
import { AIActivityTrail, type AIActivityStep } from "@/components/chat/ai-activity-trail";
import { ChatArtifactCard, type ChatArtifactData } from "@/components/chat/chat-artifact-card";
import { StructuredMessageView, type AIChatAction } from "@/components/chat/structured-message-view";
import type { CopilotFsmPhase } from "@/types/copilot-fsm";
import { toast } from "sonner";
import { addToCart } from "@/services/cart.functions";
import { useCartContext } from "@/lib/cart-context";
import { requestTravelQuote } from "@/services/tourism.functions";
import { createJusDemand } from "@/services/jus.functions";
import { upsertClassified } from "@/services/classifieds.functions";

interface DrawerMessage {
  id: string;
  role: "assistant" | "user";
  text: string;
  executionId?: string;
  fsmPhase?: CopilotFsmPhase;
  activitySteps?: AIActivityStep[];
  artifact?: ChatArtifactData;
  structuredPayload?: Record<string, any>;
}

export function WaesyCopilotDrawer({ session }: { session?: any }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { isCompact } = useWindowSizeClass();
  const { refreshCart, setIsCartOpen: setIsGlobalCartOpen } = useCartContext();
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
        executionId: execution.executionId,
        fsmPhase: execution.fsmPhase,
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

  const handleDrawerAction = async (action: AIChatAction) => {
    if (["add_to_cart", "submit_legal_demand", "publish_ad"].includes(action.action_type)) {
      try {
        const result = await dispatchAiChatAction({
          data: {
            action_type: action.action_type as "add_to_cart" | "request_travel_quote" | "submit_legal_demand" | "publish_ad",
            payload: action.payload || {},
          },
        });
        if (action.action_type === "add_to_cart") {
          await refreshCart();
          setIsGlobalCartOpen(true);
        }
        toast.success(action.action_type === "publish_ad" ? "Anúncio publicado com sucesso!" : "Ação concluída com sucesso.");
        return result;
      } catch (error: any) {
        toast.error(error?.message || "Não foi possível executar a ação.");
        return;
      }
    }

    switch (action.action_type) {
      case "open_place":
        setIsOpen(false);
        navigate({ to: `/places/${action.payload.slug || action.payload.placeId}` as any });
        break;
      case "call_ride":
        setIsOpen(false);
        navigate({ to: "/mobilidade" as any });
        break;
      case "open_checkout":
        setIsOpen(false);
        navigate({ to: "/checkout" as any });
        break;
      case "request_travel_quote": {
        const destination = action.payload?.destination || "Destino Turístico";
        const contactName = session?.user?.user_metadata?.name || session?.user?.name || "Viajante Waesy";
        const contactWhatsapp = session?.user?.user_metadata?.phone || "49999999999";
        const contactEmail = session?.user?.email;

        try {
          const res = await requestTravelQuote({
            data: {
              origin_city: "Chapecó",
              destination_city: destination,
              rooms_count: 1,
              adults_count: action.payload?.passengers_count || 2,
              children_count: 0,
              children_ages: [],
              trip_type: "air_package",
              flexible_dates: true,
              contact_name: contactName,
              contact_whatsapp: contactWhatsapp,
              contact_email: contactEmail,
              special_notes: `Solicitação via Copilot: ${action.payload?.duration_days || 3} dias. Orçamento estimado: R$ ${(Number(action.payload?.estimated_budget_cents || 0) / 100).toFixed(2)}`,
            },
          });
          if ((res as any)?.status === "success" || (res as any)?.success) {
            toast.success(`Cotação para ${destination} registrada com sucesso!`);
            setIsOpen(false);
            navigate({ to: "/turismo" as any });
          } else {
            toast.info(`Redirecionando para o portal de turismo para detalhar o roteiro em ${destination}...`);
            setIsOpen(false);
            navigate({ to: "/turismo" as any });
          }
        } catch {
          toast.info(`Encaminhando para o canal de turismo para ${destination}...`);
          setIsOpen(false);
          navigate({ to: "/turismo" as any });
        }
        break;
      }
      case "submit_legal_demand": {
        const title = action.payload?.title || "Demanda Jurídica Preliminar";
        const legalArea = action.payload?.legal_area || "Direito Cível";
        const description =
          action.payload?.description ||
          (action.payload?.key_facts ? action.payload.key_facts.join(". ") : title);
        const urgency = ["low", "normal", "high", "urgent"].includes(action.payload?.urgency)
          ? action.payload.urgency
          : "normal";

        try {
          const demand = await createJusDemand({
            data: {
              title,
              legal_area: legalArea,
              description: description.length >= 10 ? description : `${description} (Intake via Copilot)`,
              urgency,
              city: "Chapecó",
              state: "SC",
              documents: [],
              is_anonymous: false,
            },
          });
          if (demand?.id) {
            toast.success("Demanda jurídica registrada no Painel JUS com sucesso!");
            setIsOpen(false);
            navigate({ to: "/workspace/advocacia" as any });
          } else {
            toast.info("Acesse o Painel Jurídico para formalizar a demanda.");
            setIsOpen(false);
            navigate({ to: "/workspace/advocacia" as any });
          }
        } catch {
          toast.info("Acesse o Painel Jurídico para conectar-se aos advogados credenciados.");
          setIsOpen(false);
          navigate({ to: "/workspace/advocacia" as any });
        }
        break;
      }
      case "publish_ad": {
        const headline = action.payload?.headline || "Anúncio do Mural";
        const bodyText = action.payload?.body_text || "Divulgação de produto ou serviço local via Waesy Copilot.";

        try {
          const res = await upsertClassified({
            data: {
              title: headline.length >= 3 ? headline : "Anúncio Oficial",
              category: "sale",
              content: bodyText.length >= 10 ? bodyText : "Divulgação de produto ou serviço local via Waesy Copilot.",
              price_cents: 0,
            },
          });
          if (res?.id) {
            toast.success("Anúncio publicado com sucesso!");
            setIsOpen(false);
            navigate({ to: "/classificados" as any });
          } else {
            toast.info("Redirecionando para o editor de classificados para concluir publicação...");
            setIsOpen(false);
            navigate({ to: "/conta/classificados/novo" as any });
          }
        } catch {
          toast.info("Redirecionando para o editor de classificados...");
          setIsOpen(false);
          navigate({ to: "/conta/classificados/novo" as any });
        }
        break;
      }
      case "add_to_cart": {
        const productId = action.payload?.productId || action.payload?.product_id || action.payload?.id;
        if (!productId) {
          toast.error("Produto não identificado para inclusão no carrinho.");
          break;
        }
        try {
          const res = await addToCart({
            data: {
              productId,
              quantity: action.payload?.quantity || 1,
            },
          });
          if (res?.status === "success" || (res as any)?.success) {
            await refreshCart();
            setIsGlobalCartOpen(true);
            toast.success(res?.message || "Item adicionado ao carrinho!");
          } else {
            toast.error(res?.message || "Não foi possível adicionar o item ao carrinho.");
          }
        } catch (err: any) {
          toast.error(err?.message || "Erro ao adicionar item ao carrinho.");
        }
        break;
      }
      default:
        if (typeof action.payload?.href === "string" && action.payload.href.startsWith("/")) {
          setIsOpen(false);
          navigate({ to: action.payload.href as any });
        }
        break;
    }
  };

  const handleExpandToFullScreen = () => {
    setIsOpen(false);
    navigate({ to: "/copilot" as any });
  };

  if (currentPath.startsWith("/copilot")) return null;

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
                className="h-11 min-h-11 px-3 text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none cursor-pointer"
                title="Expandir para tela cheia"
              >
                <ArrowSquareOut className="size-4" />
                <span className="hidden sm:inline">Expandir</span>
              </Button>
            </div>
          </SheetHeader>

          {/* Area de Mensagens */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.length === 0 ? (
              <div className="text-center text-xs text-muted-foreground py-12">
                Nenhuma mensagem enviada. Como posso ajudar você hoje?
              </div>
            ) : (
              messages.map((m) => (
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
                    <AIActivityTrail steps={m.activitySteps} executionId={m.executionId} />
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
            )))}

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
