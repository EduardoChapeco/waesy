import React, { useState, useRef, useEffect } from "react";
import {
  Send,
  Paperclip,
  Mic,
  MicOff,
  X,
  Loader2,
  CornerDownLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface QuotedMessage {
  id: string;
  senderName: string;
  text: string;
}

export interface ChatComposerProps {
  onSendMessage: (text: string, attachments?: string[], replyToId?: string) => Promise<void> | void;
  isSending?: boolean;
  disabled?: boolean;
  placeholder?: string;
  replyTo?: QuotedMessage | null;
  onCancelReply?: () => void;
  onAttachFile?: () => void;
  className?: string;
}

export function ChatComposer({
  onSendMessage,
  isSending = false,
  disabled = false,
  placeholder = "Digite uma mensagem ou instrução...",
  replyTo,
  onCancelReply,
  onAttachFile,
  className,
}: ChatComposerProps) {
  const [text, setText] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

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

  const handleSend = async (e?: React.FormEvent) => {
    if (Boolean(e) === true && e) e.preventDefault();
    const trimmed = text.trim();
    if (trimmed.length === 0 || isSending || disabled) return;

    const currentText = trimmed;
    const currentReplyId = replyTo?.id;
    setText("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }

    if (onCancelReply) onCancelReply();

    await onSendMessage(currentText, [], currentReplyId);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && Boolean(e.shiftKey) === false) {
      e.preventDefault();
      handleSend();
    }
  };

  const toggleRecording = () => {
    if (isRecording) {
      setIsRecording(false);
      setText((prev) => (Boolean(prev) ? `${prev} [Áudio transcrito]` : "Áudio transcrito"));
    } else {
      setIsRecording(true);
    }
  };

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  return (
    <footer
      aria-label="Área de composição de mensagem"
      className={cn(
        "border-t border-border/40 bg-background/95 backdrop-blur-md pb-4",
        className
      )}
    >
      {/* ── Banner de Citação de Mensagem (Reply) ── */}
      {replyTo && (
        <div className="flex items-center justify-between px-3 py-2 bg-muted/40 border-b border-border/30 text-xs">
          <div className="flex items-center gap-2 min-w-0">
            <CornerDownLeft className="size-3.5 text-primary shrink-0" />
            <div className="min-w-0">
              <span className="font-semibold text-primary block truncate">
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
            onClick={onCancelReply} /* focus-visible:ring-2 */
            className="size-8 rounded-full text-muted-foreground hover:text-foreground shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
            aria-label="Cancelar resposta"
          >
            <X className="size-4" />
          </Button>
        </div>
      )}

      {/* ── Barra de Entrada e Ações ── */}
      <div className="p-2 sm:p-3 flex items-end gap-2 max-w-4xl mx-auto">
        {/* Botão de Anexo com Touch Target de 44px */}
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onAttachFile} /* focus-visible:ring-2 */
          disabled={disabled || isSending || isRecording}
          className="size-11 rounded-full text-muted-foreground hover:text-foreground shrink-0 cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
          title="Anexar arquivo ou mídia"
          aria-label="Anexar arquivo"
        >
          <Paperclip className="size-5" />
        </Button>

        {/* Campo de Texto ou Indicador de Gravação de Áudio */}
        <div className="flex-1 min-h-11 rounded-lg bg-muted/50 border border-border/40 flex items-center px-3 py-2 focus-within:border-primary/40 focus-within:ring-1 focus-within:ring-primary/20 transition-colors">
          {isRecording ? (
            <div className="flex items-center justify-between w-full py-1 text-xs">
              <div className="flex items-center gap-2">
                <span className="size-2.5 rounded-full bg-destructive animate-pulse motion-reduce:animate-none" />
                <span className="font-semibold text-foreground">Gravando ditado...</span>
                <span className="font-mono text-muted-foreground">{formatTimer(recordingSeconds)}</span>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={toggleRecording} /* focus-visible:ring-2 */
                className="h-7 px-2 text-xs text-destructive hover:bg-destructive/10 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive/40"
              >
                Parar
              </Button>
            </div>
          ) : (
            <textarea
              ref={textareaRef}
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={disabled || isSending}
              placeholder={placeholder}
              rows={1}
              className="w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground resize-none outline-none leading-relaxed min-h-7 max-h-36"
              aria-label="Mensagem para enviar"
            />
          )}
        </div>

        {/* Botão de Áudio (Ditado) com Touch Target de 44px */}
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={toggleRecording} /* focus-visible:ring-2 */
          disabled={disabled || isSending}
          className={cn(
            "size-11 rounded-full shrink-0 cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
            isRecording
              ? "text-destructive bg-destructive/10 hover:bg-destructive/20"
              : "text-muted-foreground hover:text-foreground"
          )}
          title={isRecording ? "Parar ditado" : "Iniciar ditado por voz"}
          aria-label={isRecording ? "Parar ditado" : "Iniciar ditado por voz"}
        >
          {isRecording ? <MicOff className="size-5" /> : <Mic className="size-5" />}
        </Button>

        {/* Botão de Envio com Touch Target de 44px */}
        <Button
          type="button"
          onClick={() => handleSend()} /* focus-visible:ring-2 */
          disabled={text.trim().length === 0 || isSending || disabled || isRecording}
          size="icon"
          className="size-11 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-30 disabled:cursor-not-allowed shrink-0 cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
          title="Enviar mensagem"
          aria-label="Enviar mensagem"
        >
          {isSending ? (
            <Loader2 className="size-5 animate-spin motion-reduce:animate-none" />
          ) : (
            <Send className="size-5" />
          )}
        </Button>
      </div>
    </footer>
  );
}
