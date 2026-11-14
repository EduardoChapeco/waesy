import { toast } from "sonner";
import { Copy, MessageCircle, Phone } from "lucide-react";
import { extractPhoneSegments } from "@/lib/phone-links";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { WhatsAppChannelInstanceDTO } from "@/services/whatsapp-channel-instances.functions";

interface SmartPhoneTextProps {
  text: string;
  instances?: WhatsAppChannelInstanceDTO[];
  onStartWhatsAppCall?: (phoneE164: string, instanceId?: string) => void;
}

/**
 * Renderiza texto de mensagem destacando telefones/WhatsApps detectados em azul
 * com menu nativo: Ligar, Copiar ou Chamar no WhatsApp pelo canal da loja.
 */
export function SmartPhoneText({
  text,
  instances = [],
  onStartWhatsAppCall,
}: SmartPhoneTextProps) {
  const segments = extractPhoneSegments(text);
  const connectedInstances = instances.filter((i) => i.is_active && i.status === "connected");
  const candidateInstances = connectedInstances.length > 0 ? connectedInstances : instances;

  if (segments.length === 1 && segments[0]?.type === "text") {
    return <>{text}</>;
  }

  return (
    <>
      {segments.map((seg, idx) => {
        if (seg.type === "text") {
          return <span key={`txt-${idx}`}>{seg.value}</span>;
        }
        return (
          <DropdownMenu key={`ph-${idx}-${seg.digits}`}>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="inline font-semibold text-primary underline underline-offset-2 hover:text-primary/80 cursor-pointer rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                aria-label={`Ações para o telefone ${seg.raw}`}
              >
                {seg.raw}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-60">
              <DropdownMenuLabel className="text-xs font-mono text-muted-foreground">
                {seg.e164}
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {onStartWhatsAppCall && candidateInstances.length > 0 ? (
                candidateInstances.map((inst) => (
                  <DropdownMenuItem
                    key={inst.id}
                    onClick={() => onStartWhatsAppCall(seg.e164, inst.id)}
                    className="gap-2 text-xs font-medium cursor-pointer"
                  >
                    <MessageCircle className="size-4 text-primary shrink-0" />
                    <span className="truncate">
                      Chamar no WhatsApp ({inst.display_name})
                    </span>
                  </DropdownMenuItem>
                ))
              ) : (
                <DropdownMenuItem
                  onClick={() => onStartWhatsAppCall?.(seg.e164)}
                  className="gap-2 text-xs font-medium cursor-pointer"
                >
                  <MessageCircle className="size-4 text-primary shrink-0" />
                  <span>Chamar no WhatsApp pelo Sistema</span>
                </DropdownMenuItem>
              )}
              <DropdownMenuItem asChild className="gap-2 text-xs cursor-pointer">
                <a href={seg.telHref}>
                  <Phone className="size-4 shrink-0" />
                  <span>Ligar ({seg.raw})</span>
                </a>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  if (typeof navigator !== "undefined" && navigator.clipboard) {
                    navigator.clipboard.writeText(seg.e164);
                    toast.success(`Número ${seg.e164} copiado.`);
                  }
                }}
                className="gap-2 text-xs cursor-pointer"
              >
                <Copy className="size-4 shrink-0" />
                <span>Copiar número</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      })}
    </>
  );
}
