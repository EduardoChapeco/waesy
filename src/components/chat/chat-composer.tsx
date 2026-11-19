import React, { useState, useRef, useEffect, useMemo } from "react";
import {
  ArrowUp,
  Plus,
  Mic,
  MicOff,
  X,
  Loader2,
  CornerDownLeft,
  FileText,
  Globe,
  MapPin,
  Palette,
  Square,
  Paperclip,
  Flame,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import type { CopilotQuickToolMode } from "@/types/chat";

export interface QuotedMessage {
  id: string;
  senderName: string;
  text: string;
}

interface AttachmentChip {
  id: string;
  name: string;
  mime: string;
  dataUrl: string;
}

const MAX_ATTACHMENTS = 4;
const MAX_ATTACHMENT_BYTES = 5 * 1024 * 1024;
const ATTACHMENT_ACCEPT = "image/*,.pdf,.csv,.txt,.json";

export interface ChatComposerProps {
  onSendMessage: (
    text: string,
    attachments?: string[],
    replyToId?: string,
    overrideMode?: import("@/types/chat").CopilotQuickToolMode,
  ) => Promise<void> | void;
  onUploadFile?: (file: File) => Promise<string | null>;
  isSending?: boolean;
  onCancelRun?: () => void;
  disabled?: boolean;
  placeholder?: string;
  replyTo?: QuotedMessage | null;
  onCancelReply?: () => void;
  onAttachFile?: () => void;
  quickToolMode?: import("@/types/chat").CopilotQuickToolMode;
  onQuickToolModeChange?: (mode: import("@/types/chat").CopilotQuickToolMode) => void;
  prefillPrompt?: string | null;
  onPrefillConsumed?: () => void;
  contextSummary?: string;
  showQuickTools?: boolean;
  className?: string;
}

const QUICK_TOOL_LABELS: Record<CopilotQuickToolMode, string> = {
  default: "Padrão",
  website_builder: "Criar site",
  interactive_map: "Mapas",
  document: "Documento",
  creative_post: "Post criativo",
  hot_offer: "@oferta Hot",
};

interface AtToolPluginItem {
  id: string;
  prefix: string;
  title: string;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
  mode: CopilotQuickToolMode;
}

const AT_TOOL_PLUGINS: AtToolPluginItem[] = [
  {
    id: "hot_offer",
    prefix: "@oferta",
    title: "@oferta Hot & Stories",
    subtitle: "Criar Oferta Quente, Story Hot, Grupos WhatsApp & Radar IA",
    icon: Flame,
    mode: "hot_offer",
  },
  {
    id: "website_builder",
    prefix: "@site",
    title: "@site (Criar site)",
    subtitle: "Gerador de páginas e vitrines comerciais",
    icon: Globe,
    mode: "website_builder",
  },
  {
    id: "interactive_map",
    prefix: "@mapa",
    title: "@mapa (Mapas)",
    subtitle: "Mapas interativos e turismo",
    icon: MapPin,
    mode: "interactive_map",
  },
  {
    id: "document",
    prefix: "@documento",
    title: "@documento",
    subtitle: "Proposta comercial ou contrato",
    icon: FileText,
    mode: "document",
  },
  {
    id: "creative_post",
    prefix: "@post",
    title: "@post (Post criativo)",
    subtitle: "Copywriting e arte para redes sociais",
    icon: Palette,
    mode: "creative_post",
  },
];

export function ChatComposer({
  onSendMessage,
  onUploadFile,
  isSending = false,
  onCancelRun,
  disabled = false,
  placeholder = "Trabalhe com o Copilot...",
  replyTo,
  onCancelReply,
  onAttachFile,
  quickToolMode = "default",
  onQuickToolModeChange,
  prefillPrompt,
  onPrefillConsumed,
  contextSummary = "Acesso completo",
  showQuickTools = true,
  className,
}: ChatComposerProps) {
  const [text, setText] = useState("");
  const [attachments, setAttachments] = useState<AttachmentChip[]>([]);
  const [isUploadingAttachment, setIsUploadingAttachment] = useState(false);
  const [attachError, setAttachError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<BlobPart[]>([]);

  useEffect(() => {
    if (typeof prefillPrompt === "string" && prefillPrompt.trim().length > 0) {
      setText(prefillPrompt);
      onPrefillConsumed?.();
      requestAnimationFrame(() => textareaRef.current?.focus());
    }
  }, [prefillPrompt, onPrefillConsumed]);

  useEffect(() => {
    return () => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
        mediaRecorderRef.current.stop();
      }
      mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  // Auto-resize textarea ao digitar
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(
        textareaRef.current.scrollHeight,
        144
      )}px`;
    }
  }, [text]);

  // Controle de tempo de gravação de áudio
  useEffect(() => {
    if (isRecording) {
      setRecordingSeconds(0);
      timerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
      setRecordingSeconds(0);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRecording]);

  const [atQuery, setAtQuery] = useState<string | null>(null);
  const [atIndex, setAtIndex] = useState(0);

  const handleTextChange = (val: string) => {
    setText(val);
    const lastWord = val.split(/\s+/).pop() || "";
    if (lastWord.startsWith("@")) {
      setAtQuery(lastWord.slice(1).toLowerCase());
      setAtIndex(0);
    } else {
      setAtQuery(null);
    }
  };

  const filteredAtTools = useMemo(() => {
    if (atQuery === null) return [];
    if (!atQuery) return AT_TOOL_PLUGINS;
    return AT_TOOL_PLUGINS.filter(
      (item) =>
        item.prefix.toLowerCase().includes(atQuery) ||
        item.title.toLowerCase().includes(atQuery)
    );
  }, [atQuery]);

  const applyAtTool = (item: AtToolPluginItem) => {
    const words = text.split(/\s+/);
    words.pop();
    const prefixStr = words.length > 0 ? `${words.join(" ")} ` : "";
    const newText = `${prefixStr}${item.prefix} `;
    setText(newText);
    selectQuickMode(item.mode);
    setAtQuery(null);
    requestAnimationFrame(() => textareaRef.current?.focus());
  };

  const handleSend = async (e?: React.FormEvent) => {
    if (Boolean(e) === true && e) e.preventDefault();
    const trimmed = text.trim();
    if ((trimmed.length === 0 && attachments.length === 0) || isSending || disabled) return;

    const currentText = trimmed.length > 0 ? trimmed : "Analise o(s) arquivo(s) anexado(s).";
    const currentReplyId = replyTo?.id;
    const currentAttachments = attachments.map((a) => a.dataUrl);
    setText("");
    setAttachments([]);
    setAtQuery(null);
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }

    if (onCancelReply) onCancelReply();

    const effectiveMode =
      quickToolMode !== "default"
        ? quickToolMode
        : trimmed.toLowerCase().includes("@oferta")
          ? "hot_offer"
          : trimmed.toLowerCase().includes("@site")
            ? "website_builder"
            : trimmed.toLowerCase().includes("@mapa")
              ? "interactive_map"
              : trimmed.toLowerCase().includes("@documento")
                ? "document"
                : trimmed.toLowerCase().includes("@post")
                  ? "creative_post"
                  : "default";

    await onSendMessage(currentText, currentAttachments, currentReplyId, effectiveMode);
  };

  const handleFilesPicked = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    event.target.value = "";
    const accepted = files.filter((f) => f.size <= MAX_ATTACHMENT_BYTES).slice(0, MAX_ATTACHMENTS - attachments.length);
    const rejected = files.length - accepted.length;
    if (rejected > 0) setAttachError(`Arquivos acima de 5 MB ou além do limite de ${MAX_ATTACHMENTS} foram ignorados.`);
    else setAttachError(null);

    if (onUploadFile) {
      setIsUploadingAttachment(true);
      try {
        const uploadedChips: AttachmentChip[] = [];
        for (const file of accepted) {
          const remoteUrl = await onUploadFile(file);
          if (remoteUrl) {
            uploadedChips.push({
              id: `${file.name}-${file.size}-${file.lastModified}`,
              name: file.name,
              mime: file.type,
              dataUrl: remoteUrl,
            });
          }
        }
        setAttachments((prev) => [...prev, ...uploadedChips]);
      } finally {
        setIsUploadingAttachment(false);
      }
      return;
    }

    const read = await Promise.all(
      accepted.map(
        (file) =>
          new Promise<AttachmentChip | null>((resolve) => {
            const reader = new FileReader();
            reader.onload = () =>
              resolve({
                id: `${file.name}-${file.size}-${file.lastModified}`,
                name: file.name,
                mime: file.type,
                dataUrl: String(reader.result || ""),
              });
            reader.onerror = () => resolve(null);
            reader.readAsDataURL(file);
          }),
      ),
    );
    setAttachments((prev) => [...prev, ...(read.filter(Boolean) as AttachmentChip[])]);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (filteredAtTools.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setAtIndex((prev) => (prev + 1) % filteredAtTools.length);
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setAtIndex((prev) => (prev - 1 + filteredAtTools.length) % filteredAtTools.length);
        return;
      }
      if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        const selected = filteredAtTools[atIndex] || filteredAtTools[0];
        if (selected) {
          applyAtTool(selected);
        }
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        setAtQuery(null);
        return;
      }
    }

    if (e.key === "Enter" && Boolean(e.shiftKey) === false) {
      e.preventDefault();
      handleSend();
    }
  };

  const toggleRecording = async () => {
    if (isRecording) {
      const recorder = mediaRecorderRef.current;
      if (recorder && recorder.state !== "inactive") {
        recorder.stop();
      } else {
        mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
        mediaStreamRef.current = null;
        setIsRecording(false);
      }
      return;
    }

    if (typeof window === "undefined" || !navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      toast.error("Microfone ou MediaRecorder não suportado neste navegador.");
      return;
    }

    try {
      setAttachError(null);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      audioChunksRef.current = [];
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = async () => {
        setIsRecording(false);
        mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
        mediaStreamRef.current = null;

        const audioBlob = new Blob(audioChunksRef.current, {
          type: recorder.mimeType || "audio/webm",
        });
        audioChunksRef.current = [];
        if (audioBlob.size === 0) return;

        setIsTranscribing(true);
        try {
          const formData = new FormData();
          formData.append("file", audioBlob, "ditado.webm");
          formData.append("language", "pt");
          const res = await fetch("/api/ai/transcribe", {
            method: "POST",
            credentials: "same-origin",
            body: formData,
          });
          const data = (await res.json().catch(() => ({}))) as {
            text?: string;
            error?: string;
          };
          if (!res.ok) {
            const errMsg = data.error || "Falha ao transcrever o áudio.";
            setAttachError(errMsg);
            toast.error(errMsg);
            return;
          }
          if (data.text) {
            setText((prev) => `${prev ? `${prev.trim()} ` : ""}${data.text}`);
            requestAnimationFrame(() => textareaRef.current?.focus());
          } else {
            toast.info("Nenhuma fala detectada no áudio gravado.");
          }
        } catch (err: any) {
          const errMsg = err?.message || "Erro de rede ao transcrever áudio.";
          setAttachError(errMsg);
          toast.error(errMsg);
        } finally {
          setIsTranscribing(false);
        }
      };

      recorder.start();
      setIsRecording(true);
    } catch (err: any) {
      mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
      setIsRecording(false);
      const msg =
        err?.name === "NotAllowedError"
          ? "Permissão de microfone negada no navegador."
          : err?.message || "Não foi possível acessar o microfone.";
      setAttachError(msg);
      toast.error(msg);
    }
  };

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  const triggerAttachPicker = () => {
    if (onAttachFile) onAttachFile();
    fileInputRef.current?.click();
  };

  const selectQuickMode = (mode: CopilotQuickToolMode) => {
    onQuickToolModeChange?.(mode);
    textareaRef.current?.focus();
  };

  return (
    <footer
      aria-label="Área de composição de mensagem"
      className={cn(
        "shrink-0 min-h-0 bg-background px-3 sm:px-6 pb-safe pb-3 pt-2",
        className
      )}
    >
      <div className="max-w-3xl mx-auto">
        {replyTo && (
          <div className="flex items-center justify-between px-3 py-2 mb-2 rounded-xl bg-muted/60 border border-border/50 text-xs">
            <div className="flex items-center gap-2 min-w-0">
              <CornerDownLeft className="size-3.5 text-primary shrink-0" />
              <div className="min-w-0">
                <span className="font-semibold text-foreground block truncate">
                  Respondendo a {replyTo.senderName}
                </span>
                <p className="text-2xs text-muted-foreground truncate">
                  {replyTo.text}
                </p>
              </div>
            </div>

            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={onCancelReply}
              className="size-11 min-h-11 min-w-11 rounded-full text-muted-foreground hover:text-foreground shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label="Cancelar resposta"
            >
              <X className="size-4" />
            </Button>
          </div>
        )}

        {(attachments.length > 0 || attachError) && (
          <div className="flex flex-wrap items-center gap-2 pb-2">
            {attachments.map((att) => (
              <div
                key={att.id}
                className="flex items-center gap-2 min-w-0 max-w-full rounded-xl border border-border/60 bg-card pl-2 text-xs"
              >
                {att.mime.startsWith("image/") ? (
                  <img src={att.dataUrl} alt="" className="size-8 rounded-lg object-cover shrink-0" />
                ) : (
                  <FileText className="size-4 text-muted-foreground shrink-0" />
                )}
                <span className="truncate max-w-40 text-foreground">{att.name}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => setAttachments((prev) => prev.filter((a) => a.id !== att.id))}
                  className="size-11 min-h-11 min-w-11 shrink-0 text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  aria-label={`Remover ${att.name}`}
                >
                  <X className="size-4" />
                </Button>
              </div>
            ))}
            {attachError && <span className="text-2xs text-destructive">{attachError}</span>}
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={ATTACHMENT_ACCEPT}
          onChange={handleFilesPicked}
          className="hidden"
          aria-hidden="true"
          tabIndex={-1}
        />

        {/* Popover flutuante de ferramentas @ */}
        {filteredAtTools.length > 0 && (
          <div
            role="listbox"
            aria-label="Ferramentas e plugins @ do Copilot"
            className="mb-2 rounded-xl border border-border bg-card p-1 space-y-1 z-40 max-h-56 overflow-y-auto"
          >
            <div className="px-3 py-1 text-2xs font-bold uppercase tracking-wider text-muted-foreground border-b border-border/40">
              Ferramentas Copilot (@)
            </div>
            {filteredAtTools.map((tool: any, idx: number) => {
              const Icon = tool.icon;
              const isHighlighted = idx === atIndex;
              return (
                <button
                  key={tool.id}
                  type="button"
                  onClick={() => applyAtTool(tool)}
                  className={cn(
                    "w-full px-3 py-2 rounded-lg text-left flex items-center justify-between gap-3 text-xs transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    isHighlighted
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-muted text-foreground"
                  )}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <Icon className={cn("size-4 shrink-0", isHighlighted ? "text-primary-foreground" : "text-primary")} />
                    <div className="min-w-0">
                      <span className="font-bold block truncate">{tool.title}</span>
                      <span className={cn("text-2xs truncate block", isHighlighted ? "text-primary-foreground/80" : "text-muted-foreground")}>
                        {tool.subtitle}
                      </span>
                    </div>
                  </div>
                  <kbd className={cn("text-2xs font-mono px-2 py-1 rounded border shrink-0", isHighlighted ? "border-primary-foreground/40 bg-primary-foreground/20" : "border-border bg-muted/40")}>
                    Tab
                  </kbd>
                </button>
              );
            })}
          </div>
        )}

        {/* Pílula Matte ChatGPT Desktop */}
        <div className="rounded-2xl bg-card border border-border/60 px-3 pt-3 pb-2 transition-colors focus-within:border-border">
          {isRecording ? (
            <div className="flex items-center justify-between w-full min-h-11 px-1 text-xs">
              <div className="flex items-center gap-2">
                <span className="size-2.5 rounded-full bg-destructive animate-pulse motion-reduce:animate-none" />
                <span className="font-semibold text-foreground">Gravando ditado...</span>
                <span className="font-mono text-muted-foreground">{formatTimer(recordingSeconds)}</span>
              </div>
              <Button
                type="button"
                variant="ghost"
                onClick={() => void toggleRecording()}
                className="min-h-11 px-3 text-xs text-destructive hover:bg-destructive/10 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                Parar e transcrever
              </Button>
            </div>
          ) : isTranscribing ? (
            <div className="flex items-center gap-2 w-full min-h-11 px-1 text-xs text-muted-foreground">
              <Loader2 className="size-4 animate-spin motion-reduce:animate-none text-primary shrink-0" />
              <span>Transcrevendo áudio via Whisper...</span>
            </div>
          ) : (
            <textarea
              ref={textareaRef}
              value={text}
              onChange={(e) => handleTextChange(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={disabled || isSending}
              placeholder={placeholder}
              rows={1}
              className="w-full bg-transparent text-base sm:text-sm text-foreground placeholder:text-muted-foreground resize-none outline-none leading-relaxed min-h-9 max-h-36 px-1"
              aria-label="Mensagem para enviar"
            />
          )}

          <div className="flex items-center justify-between gap-2 pt-1">
            <div className="flex items-center gap-1 min-w-0">
              {showQuickTools ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      disabled={disabled || isSending || isRecording || isUploadingAttachment}
                      className="size-11 min-h-11 min-w-11 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/60 shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      title="Adicionar arquivo ou modo"
                      aria-label="Adicionar arquivo ou ferramenta"
                    >
                      {isUploadingAttachment ? (
                        <Loader2 className="size-4 animate-spin motion-reduce:animate-none" />
                      ) : (
                        <Plus className="size-4" />
                      )}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-52 bg-card border-border">
                    <DropdownMenuItem
                      onClick={triggerAttachPicker}
                      disabled={attachments.length >= MAX_ATTACHMENTS}
                      className="min-h-11 gap-2 cursor-pointer"
                    >
                      <Paperclip className="size-4 text-muted-foreground" />
                      <span>Anexar arquivo</span>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => selectQuickMode("hot_offer")}
                      className="min-h-11 gap-2 cursor-pointer"
                    >
                      <Flame className="size-4 text-warning" />
                      <span>@oferta Hot & Stories</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => selectQuickMode("website_builder")}
                      className="min-h-11 gap-2 cursor-pointer"
                    >
                      <Globe className="size-4 text-muted-foreground" />
                      <span>Criar site</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => selectQuickMode("interactive_map")}
                      className="min-h-11 gap-2 cursor-pointer"
                    >
                      <MapPin className="size-4 text-muted-foreground" />
                      <span>Mapas</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => selectQuickMode("document")}
                      className="min-h-11 gap-2 cursor-pointer"
                    >
                      <FileText className="size-4 text-muted-foreground" />
                      <span>Documento</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => selectQuickMode("creative_post")}
                      className="min-h-11 gap-2 cursor-pointer"
                    >
                      <Palette className="size-4 text-muted-foreground" />
                      <span>Post criativo</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={triggerAttachPicker}
                  disabled={disabled || isSending || isRecording || attachments.length >= MAX_ATTACHMENTS || isUploadingAttachment}
                  className="size-11 min-h-11 min-w-11 rounded-xl text-muted-foreground hover:text-foreground shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  title="Anexar arquivo ou mídia"
                  aria-label="Anexar arquivo"
                >
                  <Paperclip className="size-4" />
                </Button>
              )}

              {showQuickTools && (
                <div className="flex items-center flex-wrap gap-1 min-w-0">
                  <span className="hidden sm:inline-flex items-center gap-2 px-3 py-1 rounded-lg text-xs font-medium text-muted-foreground bg-muted/40 truncate">
                    {contextSummary}
                  </span>

                  {quickToolMode !== "default" ? (
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => selectQuickMode("default")}
                      className="min-h-11 px-3 rounded-xl text-xs font-medium text-primary bg-primary/10 hover:bg-primary/15 gap-2 shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      aria-label={`Desativar modo ${QUICK_TOOL_LABELS[quickToolMode]}`}
                    >
                      <span>{QUICK_TOOL_LABELS[quickToolMode]}</span>
                      <X className="size-3.5" />
                    </Button>
                  ) : (
                    <>
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => selectQuickMode("hot_offer")}
                        className="hidden sm:inline-flex min-h-11 px-3 rounded-xl text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50 gap-2 shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        <Flame className="size-3.5 text-warning" />
                        <span>@oferta</span>
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => selectQuickMode("website_builder")}
                        className="hidden sm:inline-flex min-h-11 px-3 rounded-xl text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50 gap-2 shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        <Globe className="size-3.5" />
                        <span>Criar site</span>
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => selectQuickMode("interactive_map")}
                        className="hidden sm:inline-flex min-h-11 px-3 rounded-xl text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50 gap-2 shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        <MapPin className="size-3.5" />
                        <span>Mapas</span>
                      </Button>
                    </>
                  )}
                </div>
              )}
            </div>

            <div className="flex items-center gap-1 shrink-0">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={toggleRecording}
                disabled={disabled || isSending}
                className={cn(
                  "size-11 min-h-11 min-w-11 rounded-xl shrink-0 cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  isRecording
                    ? "text-destructive bg-destructive/10 hover:bg-destructive/20"
                    : "text-muted-foreground hover:text-foreground"
                )}
                title={isRecording ? "Parar ditado" : "Iniciar ditado por voz"}
                aria-label={isRecording ? "Parar ditado" : "Iniciar ditado por voz"}
              >
                {isRecording ? <MicOff className="size-4" /> : <Mic className="size-4" />}
              </Button>

              {isSending && onCancelRun ? (
                <Button
                  type="button"
                  onClick={onCancelRun}
                  size="icon"
                  className="size-11 min-h-11 min-w-11 rounded-full bg-foreground text-background hover:bg-foreground/90 shrink-0 cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  title="Parar geração"
                  aria-label="Parar geração"
                >
                  <Square className="size-4 fill-current" />
                </Button>
              ) : (
                <Button
                  type="button"
                  onClick={() => handleSend()}
                  disabled={(text.trim().length === 0 && attachments.length === 0) || isSending || disabled || isRecording || isUploadingAttachment}
                  size="icon"
                  className="size-11 min-h-11 min-w-11 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-30 disabled:cursor-not-allowed shrink-0 cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  title="Enviar mensagem"
                  aria-label="Enviar mensagem"
                >
                  {isSending ? (
                    <Loader2 className="size-4 animate-spin motion-reduce:animate-none" />
                  ) : (
                    <ArrowUp className="size-4" />
                  )}
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
