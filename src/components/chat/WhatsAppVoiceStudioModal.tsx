import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Mic, Volume2, Loader2, Send } from "lucide-react";
import { toast } from "sonner";
import {
  generateAiVoiceAudio,
  sendAiVoiceNoteToWhatsApp,
  type VoicePersona,
} from "@/services/whatsapp-voice-ai.functions";

interface WhatsAppVoiceStudioModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  threadId: string;
  storeId?: string;
  initialText?: string;
  onVoiceSent?: () => void;
}

export function WhatsAppVoiceStudioModal({
  open,
  onOpenChange,
  threadId,
  storeId,
  initialText = "",
  onVoiceSent,
}: WhatsAppVoiceStudioModalProps) {
  const [text, setText] = useState(initialText);

  useEffect(() => {
    if (open && initialText) {
      setText(initialText);
    }
  }, [open, initialText]);
  const [gender, setGender] = useState<"female" | "male">("female");
  const [age, setAge] = useState<"young" | "adult" | "senior">("adult");
  const [accent, setAccent] = useState<
    "paulista" | "carioca" | "mineiro" | "gaucho" | "nordestino" | "neutro"
  >("neutro");
  const [environment, setEnvironment] = useState<"studio" | "office" | "phone_call">("office");

  const [isGenerating, setIsGenerating] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [generatedAudio, setGeneratedAudio] = useState<string | null>(null);

  const handleGenerateAudio = async () => {
    if (!text.trim()) {
      toast.error("Digite o texto da mensagem para sintetizar a voz.");
      return;
    }
    setIsGenerating(true);
    setGeneratedAudio(null);
    try {
      const persona: VoicePersona = { gender, age, accent, environment };
      const res = await generateAiVoiceAudio({
        data: { text: text.trim(), persona },
      });
      if (res?.audioDataUri) {
        setGeneratedAudio(res.audioDataUri);
        toast.success("Áudio sintetizado com sucesso!");
      }
    } catch (err: any) {
      toast.error(err?.message || "Erro ao gerar voz sintética.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSendVoiceNote = async () => {
    if (!generatedAudio) {
      toast.error("Gere o áudio antes de enviar.");
      return;
    }
    setIsSending(true);
    try {
      const persona: VoicePersona = { gender, age, accent, environment };
      await sendAiVoiceNoteToWhatsApp({
        data: {
          threadId,
          storeId,
          text: text.trim(),
          audioDataUri: generatedAudio,
          persona,
        },
      });
      toast.success("Nota de voz enviada com sucesso no WhatsApp!");
      onOpenChange(false);
      if (onVoiceSent) onVoiceSent();
    } catch (err: any) {
      toast.error(err?.message || "Erro ao enviar nota de voz.");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl p-6 space-y-4 border-border/80 rounded-xl">
        <DialogHeader className="space-y-1">
          <DialogTitle className="text-base font-bold text-foreground flex items-center gap-2">
            <Mic className="size-5 text-primary" />
            <span>Estúdio de Voz e Personas de Atendimento</span>
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground leading-relaxed">
            Sintetize respostas de atendimento em notas de voz realistas no WhatsApp com controle de gênero, idade, sotaque regional e ambiente acústico.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Campo de Texto */}
          <div className="space-y-2">
            <Label htmlFor="voice-text" className="text-xs font-semibold">
              Texto da Mensagem a Falar
            </Label>
            <Textarea
              id="voice-text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Digite o que a persona deve falar para o cliente..."
              rows={3}
              className="text-xs leading-relaxed resize-none rounded-lg border-border/80"
            />
          </div>

          {/* Grid de Configurações da Persona */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="space-y-1">
              <Label className="text-2xs font-bold uppercase tracking-wider text-muted-foreground">
                Gênero
              </Label>
              <Select value={gender} onValueChange={(val: any) => setGender(val)}>
                <SelectTrigger className="h-11 min-h-11 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="female">Mulher</SelectItem>
                  <SelectItem value="male">Homem</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-2xs font-bold uppercase tracking-wider text-muted-foreground">
                Idade
              </Label>
              <Select value={age} onValueChange={(val: any) => setAge(val)}>
                <SelectTrigger className="h-11 min-h-11 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="young">Jovem</SelectItem>
                  <SelectItem value="adult">Adulto</SelectItem>
                  <SelectItem value="senior">Sênior</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-2xs font-bold uppercase tracking-wider text-muted-foreground">
                Sotaque
              </Label>
              <Select value={accent} onValueChange={(val: any) => setAccent(val)}>
                <SelectTrigger className="h-11 min-h-11 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="neutro">Neutro (Nacional)</SelectItem>
                  <SelectItem value="paulista">Paulista</SelectItem>
                  <SelectItem value="carioca">Carioca</SelectItem>
                  <SelectItem value="mineiro">Mineiro</SelectItem>
                  <SelectItem value="gaucho">Gaúcho</SelectItem>
                  <SelectItem value="nordestino">Nordestino</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-2xs font-bold uppercase tracking-wider text-muted-foreground">
                Ambiente
              </Label>
              <Select value={environment} onValueChange={(val: any) => setEnvironment(val)}>
                <SelectTrigger className="h-11 min-h-11 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="office">Escritório</SelectItem>
                  <SelectItem value="phone_call">Ligação</SelectItem>
                  <SelectItem value="studio">Estúdio</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Player de Pré-Escuta */}
          {generatedAudio && (
            <div className="p-3 rounded-lg bg-muted/60 border border-border/60 space-y-2 animate-in fade-in motion-reduce:transition-none motion-reduce:animate-none">
              <span className="text-xs font-bold text-foreground flex items-center gap-2">
                <Volume2 className="size-4 text-primary" />
                <span>Pré-escuta da Nota de Voz Gerada</span>
              </span>
              <audio src={generatedAudio} controls className="w-full h-11" />
            </div>
          )}
        </div>

        <DialogFooter className="flex flex-row justify-end gap-2 pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="h-11 min-h-11 px-4 text-xs font-semibold cursor-pointer"
          >
            Cancelar
          </Button>

          {!generatedAudio ? (
            <Button
              type="button"
              variant="secondary"
              onClick={handleGenerateAudio}
              disabled={isGenerating || !text.trim()}
              className="h-11 min-h-11 px-4 text-xs font-bold gap-2 cursor-pointer"
            >
              {isGenerating ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Mic className="size-4" />
              )}
              Sintetizar Áudio
            </Button>
          ) : (
            <Button
              type="button"
              variant="default"
              onClick={handleSendVoiceNote}
              disabled={isSending}
              className="h-11 min-h-11 px-4 text-xs font-bold gap-2 cursor-pointer"
            >
              {isSending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Send className="size-4" />
              )}
              Enviar como Nota de Voz (WhatsApp)
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
