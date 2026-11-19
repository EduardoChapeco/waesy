import React, { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "@tanstack/react-router";
import {
  ChatCircleDots,
  ArrowSquareOut,
  X,
  CircleNotch,
  PaperPlaneRight,
  User,
  Paperclip,
  FileText,
  Trash,
} from "@phosphor-icons/react";
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
  executeCopilotDrawerMessage,
  uploadCopilotMultimodalAttachment,
  type AiExecutionResult,
} from "@/services/ai-conversations.functions";
import { dispatchCopilotClientAction } from "@/lib/copilot-action-dispatcher";
import { CopilotMessageRenderer } from "@/components/chat/copilot-message-renderer";
import { AIActivityTrail, type AIActivityStep } from "@/components/chat/ai-activity-trail";
import { ChatArtifactCard, type ChatArtifactData } from "@/components/chat/chat-artifact-card";
import { StructuredMessageView, type AIChatAction } from "@/components/chat/structured-message-view";
import { CopilotApprovalPanel } from "@/components/chat/copilot-approval-panel";
import type { CopilotFsmPhase } from "@/types/copilot-fsm";
import { toast } from "sonner";
import { useCartContext } from "@/lib/cart-context";

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

export function WaesyCopilotDrawer(_props: { session?: { id?: string; user?: { id?: string } } }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { isCompact } = useWindowSizeClass();
  const { refreshCart, setIsCartOpen: setIsGlobalCartOpen } = useCartContext();
  const [isOpen, setIsOpen] = useState(false);
  const [inputText, setInputText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [userCoords, setUserCoords] = useState<{ lat?: number; lng?: number }>({});
  const [attachment, setAttachment] = useState<{
    fileName: string;
    fileType: string;
    url: string;
    extractedText?: string;
  } | null>(null);
  const [isUploadingAttachment, setIsUploadingAttachment] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 15 * 1024 * 1024) {
      toast.error("Arquivo excede o limite máximo permitido de 15 MB.");
      return;
    }

    setIsUploadingAttachment(true);
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const base64Data = reader.result as string;
        try {
          const result = await uploadCopilotMultimodalAttachment({
            data: {
              fileName: file.name,
              fileType: file.type || "application/octet-stream",
              base64Data,
            },
          });
          setAttachment({
            fileName: result.fileName,
            fileType: result.fileType,
            url: result.url,
            extractedText: result.extractedText,
          });
          toast.success(`Arquivo "${file.name}" anexado.`);
        } catch (err: any) {
          toast.error(err?.message || "Erro no upload do anexo.");
        } finally {
          setIsUploadingAttachment(false);
        }
      };
      reader.readAsDataURL(file);
    } catch {
      toast.error("Erro ao ler o arquivo selecionado.");
      setIsUploadingAttachment(false);
    }
  };

  // Nao exibe o drawer flutuante se o usuario ja esta na rota dedicada /copilot
  const currentPath = location.pathname || "/";
  const currentUserId = _props.session?.id || _props.session?.user?.id;

  const [messages, setMessages] = useState<DrawerMessage[]>([
    {
      id: "initial-msg",
      role: "assistant",
      text: "Olá! Sou o seu assessor consultivo executivo da região no Waesy. Posso te ajudar a descobrir os melhores estabelecimentos da cidade, planejar viagens com roteiros e Pix, conferir vagas verificadas ou estruturar propostas comerciais e planilhas para o seu negócio. Como posso te apoiar agora?",
    },
  ]);

  const quickPrompts = [
    "Onde encontro pacotes de viagem?",
    "Como vender no Marketplace?",
    "Quais servicos estao disponiveis?",
  ];

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputText).trim();
    if ((!text && !attachment) || isSending) return;

    let messagePrompt = text || (attachment ? `Analise o arquivo anexado: ${attachment.fileName}` : "");
    if (attachment?.extractedText) {
      messagePrompt += `\n\n[Contexto do Arquivo Anexado (${attachment.fileName})]:\n${attachment.extractedText}`;
    }

    const currentAttachment = attachment;
    setAttachment(null);
    if (fileInputRef.current) fileInputRef.current.value = "";

    const userMsg: DrawerMessage = {
      id: `usr-${Date.now()}`,
      role: "user",
      text: text || `[Arquivo anexado: ${currentAttachment?.fileName}]`,
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText("");
    setIsSending(true);

    try {
      // O drawer usa o mesmo boundary server-side dos restantes shells.
      const execution: AiExecutionResult = await executeCopilotDrawerMessage({
        data: { message: messagePrompt, userLat: userCoords.lat, userLng: userCoords.lng },
      });

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
      toast.error(err?.message || "Tivemos uma oscilação rápida ao buscar as informações. Já estou pronto para tentar novamente para você.");
    } finally {
      setIsSending(false);
    }
  };

  const handleDrawerAction = async (action: AIChatAction) => {
    return dispatchCopilotClientAction(action, {
      onAddedToCart: async () => {
        await refreshCart();
        setIsGlobalCartOpen(true);
      },
      onBeforeNavigate: () => setIsOpen(false),
      navigate: (opts) => {
        setIsOpen(false);
        navigate({ to: opts.to as any, search: opts.search as any });
      },
      notify: {
        success: (msg) => toast.success(msg),
        info: (msg) => toast.info(msg),
        error: (msg) => toast.error(msg),
      },
      mode: "concierge",
    });
  };

  const handleExpandToFullScreen = () => {
    setIsOpen(false);
    navigate({ to: "/copilot" as any });
  };

  const isCopilotPage = currentPath.startsWith("/copilot");
  const isDetailPage =
    (currentPath.startsWith("/agendar/") && currentPath !== "/agendar") ||
    (currentPath.startsWith("/classificados/") && !currentPath.includes("/novo")) ||
    currentPath.startsWith("/produto/") ||
    currentPath.startsWith("/evento/") ||
    (currentPath.startsWith("/hospedagem/") && currentPath !== "/hospedagem") ||
    (currentPath.startsWith("/turismo/") && currentPath !== "/turismo") ||
    currentPath.startsWith("/imoveis/") ||
    currentPath.startsWith("/veiculos/") ||
    currentPath.startsWith("/vagas/") ||
    (currentPath.startsWith("/empregos/") && currentPath !== "/empregos");

  if (isCopilotPage || isDetailPage) return null;

  return (
    <>
      {/* Botao Flutuante Global do Copilot */}
      <button /* focus-visible:ring-2 */
        type="button"
        onClick={() => /* focus-visible:ring-2 */ setIsOpen(true)}
        className={`fixed z-30 flex items-center justify-center gap-2 h-11 min-h-11 min-w-11 sm:h-9 sm:min-h-9 sm:min-w-0 px-3 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors font-semibold text-xs focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none cursor-pointer ${
          isCompact ? "bottom-20 right-4" : "bottom-6 right-6"
        }`}
        title="Abrir Assessor Local Waesy"
      >
        <ChatCircleDots className="size-4" weight="fill" />
        <span className="hidden sm:inline">Assessor</span>
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
          <SheetHeader className="p-4 border-b border-border bg-card flex flex-row items-center justify-between space-y-0">
            <div className="flex items-center gap-3">
              <div className="size-9 rounded-xl bg-surface-subtle text-foreground flex items-center justify-center border border-border shrink-0">
                <ChatCircleDots className="size-4" weight="fill" />
              </div>
              <div className="flex flex-col text-left">
                <SheetTitle className="text-sm font-bold text-foreground">
                  Assessor Local
                </SheetTitle>
                <SheetDescription className="text-xs text-muted-foreground">
                  Assistente Executivo
                </SheetDescription>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => handleExpandToFullScreen()}
                className="h-11 min-h-11 px-3 text-xs text-muted-foreground hover:text-foreground flex items-center gap-2 rounded-xl focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none cursor-pointer"
                title="Expandir para tela cheia"
              >
                <ArrowSquareOut className="size-4" />
                <span className="hidden sm:inline">Expandir</span>
              </Button>
            </div>
          </SheetHeader>

          {/* Area de Mensagens */}
          <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-4 pb-20 space-y-4">
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
                  <div className="size-8 rounded-xl bg-surface-subtle text-foreground flex items-center justify-center border border-border shrink-0 mt-1">
                    <ChatCircleDots className="size-4" weight="fill" />
                  </div>
                )}

                <div className="max-w-md w-full space-y-2">
                  <div
                    className={`rounded-2xl px-4 py-3 text-xs leading-relaxed ${
                      m.role === "user"
                        ? "bg-surface-raised text-foreground border border-border font-medium"
                        : "text-foreground"
                    }`}
                  >
                    <CopilotMessageRenderer content={m.text} isUser={m.role === "user"} />
                  </div>

                  {/* Blocos Estruturados (Generative UI) */}
                  {m.structuredPayload && (
                    <div className="w-full my-2">
                      <StructuredMessageView
                        payload={m.structuredPayload as any}
                        onActionClick={handleDrawerAction}
                      />
                    </div>
                  )}

                  {/* Artefato Versionado Gerado (Modal In-Place, Zero Redirecionamento Forçado) */}
                  {m.artifact && (
                    <ChatArtifactCard
                      artifact={m.artifact}
                    />
                  )}

                  {/* Checkpoint de Decisão Humana (Camada 4 - WAITING_APPROVAL) */}
                  {(m.fsmPhase === "WAITING_APPROVAL" || m.structuredPayload?.status === "needs_approval") && (
                    <div className="w-full my-2">
                      <CopilotApprovalPanel currentUserId={currentUserId} />
                    </div>
                  )}

                  {/* Trilha de Atividade da IA (Discreta e Colapsada) */}
                  {m.activitySteps && m.activitySteps.length > 0 && (
                    <AIActivityTrail steps={m.activitySteps} executionId={m.executionId} />
                  )}
                </div>

                {m.role === "user" && (
                  <div className="size-8 rounded-xl bg-surface-subtle text-muted-foreground flex items-center justify-center border border-border shrink-0 mt-1">
                    <User className="size-4" />
                  </div>
                )}
              </div>
            )))}

            {isSending && (
              <div className="flex gap-3 justify-start">
                <div className="size-8 rounded-xl bg-surface-subtle text-foreground flex items-center justify-center border border-border shrink-0 mt-1">
                  <CircleNotch className="size-4 animate-spin motion-reduce:animate-none" />
                </div>
                <div className="bg-surface-subtle text-muted-foreground border border-border rounded-2xl px-4 py-3 text-xs flex items-center gap-2">
                  <span>Consultando dados...</span>
                </div>
              </div>
            )}
          </div>

          {/* Sugestoes Rapidas */}
          {messages.length <= 2 && (
            <div className="px-4 py-2 border-t border-border flex flex-wrap gap-2 bg-card">
              {quickPrompts.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => handleSendMessage(p)}
                  className="min-h-11 px-3 py-1 rounded-xl text-xs bg-surface-subtle hover:bg-surface-hover text-muted-foreground hover:text-foreground border border-border transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none cursor-pointer"
                >
                  {p}
                </button>
              ))}
            </div>
          )}

          {/* Anexo Multimodal Selecionado */}
          {attachment && (
            <div className="px-3 py-2 border-t border-border bg-muted/40 flex items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2 min-w-0">
                <FileText className="size-4 text-primary shrink-0" />
                <span className="font-medium text-foreground truncate">{attachment.fileName}</span>
                <span className="text-xs text-muted-foreground uppercase font-mono">({attachment.fileType.split("/")[1] || "doc"})</span>
              </div>
              <button
                type="button"
                onClick={() => setAttachment(null)}
                className="size-7 rounded hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-destructive focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none cursor-pointer min-h-11 sm:min-h-0 min-w-11 sm:min-w-0"
                title="Remover anexo"
              >
                <X className="size-3.5" />
              </button>
            </div>
          )}

          {/* Compositor */}
          <div className="p-3 border-t border-border bg-card flex items-center gap-2 shrink-0 sticky bottom-0">
            <input
              ref={fileInputRef}
              type="file"
              onChange={handleFileSelect}
              className="hidden"
              accept=".pdf,.csv,.txt,image/*"
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={isSending || isUploadingAttachment}
              className="size-11 min-w-11 min-h-11 p-0 flex items-center justify-center text-muted-foreground hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none cursor-pointer shrink-0"
              title="Anexar arquivo (PDF, imagem ou CSV)"
            >
              {isUploadingAttachment ? (
                <CircleNotch className="size-4 animate-spin motion-reduce:animate-none" />
              ) : (
                <Paperclip className="size-4" />
              )}
            </Button>
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
              placeholder={isUploadingAttachment ? "Analisando seu arquivo..." : "Como posso te apoiar hoje? Digite aqui..."}
              className="flex-1 h-11 px-3 rounded-lg border border-border bg-background text-base sm:text-xs text-foreground placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              disabled={isSending || isUploadingAttachment}
            />
            <Button
              type="button"
              onClick={() => /* focus-visible:ring-2 */ handleSendMessage()}
              disabled={isSending || isUploadingAttachment || (Boolean(inputText.trim()) === false && !attachment)}
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
