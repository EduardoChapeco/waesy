import * as React from "react";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Users,
  ShieldCheck,
  CheckCircle2,
  Bell,
  BellOff,
  Sparkles,
  Lock,
} from "lucide-react";
import { toast } from "sonner";

export interface CommunityJoinSheetProps {
  isOpen: boolean;
  onClose: () => void;
  community: {
    id?: string;
    name: string;
    slug?: string;
    avatarUrl?: string | null;
    coverUrl?: string | null;
    memberCount?: number;
    description?: string | null;
    rules?: string[];
  };
  onJoinSuccess?: () => void;
}

const DEFAULT_RULES = [
  "Trate todos os membros com respeito e cordialidade.",
  "Proibido spam, correntes ou anúncios não relacionados à comunidade.",
  "Incentive o comércio, cultura e projetos locais da nossa cidade.",
  "Mantenha publicações claras e fotos reais dos acontecimentos.",
];

export function CommunityJoinSheet({
  isOpen,
  onClose,
  community,
  onJoinSuccess,
}: CommunityJoinSheetProps) {
  const [notificationLevel, setNotificationLevel] = useState<"all" | "highlights" | "mute">("highlights");
  const [isJoining, setIsJoining] = useState(false);

  const rules = community.rules && community.rules.length > 0 ? community.rules : DEFAULT_RULES;

  const handleConfirmJoin = async () => {
    setIsJoining(true);
    await new Promise((r) => setTimeout(r, 600));
    setIsJoining(false);
    toast.success(`Você agora faz parte da comunidade ${community.name}!`);
    if (onJoinSuccess) onJoinSuccess();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="w-[92vw] max-w-sm sm:max-w-md p-0 overflow-hidden rounded-3xl border border-border/60 bg-card text-foreground shadow-2xl z-50 pt-[max(1.25rem,env(safe-area-inset-top))]">
        <DialogHeader className="sr-only">
          <DialogTitle>Participar da Comunidade {community.name}</DialogTitle>
        </DialogHeader>

        {/* ─── Topo Visual com Capa Sutil ─────────────────────────────── */}
        <div className="h-24 bg-linear-to-r from-primary/20 via-primary/10 to-muted/40 relative flex items-end p-4">
          <div className="flex items-center gap-2">
            <div className="size-12 rounded-xl bg-background border-2 border-border/60 shadow-sm flex items-center justify-center font-bold text-lg text-primary overflow-hidden">
              {community.avatarUrl ? (
                <img
                  src={community.avatarUrl}
                  alt={community.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <Users className="size-6 text-primary" />
              )}
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground leading-tight flex items-center gap-2">
                {community.name}
                <ShieldCheck className="size-4 text-primary" />
              </h2>
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Users className="size-3" />
                {community.memberCount || 1} membros participando
              </span>
            </div>
          </div>
        </div>

        {/* ─── Conteúdo do Modal ──────────────────────────────────────── */}
        <div className="p-5 space-y-4">
          {community.description && (
            <p className="text-xs text-foreground/80 leading-relaxed">
              {community.description}
            </p>
          )}

          {/* Regras de Convivência */}
          <div className="space-y-2 p-4 rounded-2xl bg-muted/30 border border-border/40">
            <span className="text-xs font-bold text-foreground flex items-center gap-2">
              <Sparkles className="size-3.5 text-primary" />
              Regras de Convivência
            </span>
            <ul className="space-y-2 text-xs text-muted-foreground">
              {rules.map((rule, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <CheckCircle2 className="size-3.5 text-emerald-500 shrink-0 mt-1" />
                  <span className="leading-snug">{rule}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Preferência de Notificação */}
          <div className="space-y-2">
            <span className="text-xs font-semibold text-foreground">
              Notificações do Grupo:
            </span>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                className={`focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary h-11 min-h-11 px-2 rounded-xl text-xs font-semibold flex flex-col items-center justify-center gap-0.5 border transition-colors duration-200 cursor-pointer select-none ${
                  notificationLevel === "all"
                    ? "bg-primary/10 border-primary text-primary"
                    : "border-border/60 text-muted-foreground hover:bg-muted/40"
                }`}
                onClick={() => setNotificationLevel("all")}
              >
                <Bell className="size-3.5" />
                <span>Todas</span>
              </button>

              <button
                type="button"
                className={`focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary h-11 min-h-11 px-2 rounded-xl text-xs font-semibold flex flex-col items-center justify-center gap-0.5 border transition-colors duration-200 cursor-pointer select-none ${
                  notificationLevel === "highlights"
                    ? "bg-primary/10 border-primary text-primary"
                    : "border-border/60 text-muted-foreground hover:bg-muted/40"
                }`}
                onClick={() => setNotificationLevel("highlights")}
              >
                <Sparkles className="size-3.5" />
                <span>Destaques</span>
              </button>

              <button
                type="button"
                className={`focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary h-11 min-h-11 px-2 rounded-xl text-xs font-semibold flex flex-col items-center justify-center gap-0.5 border transition-colors duration-200 cursor-pointer select-none ${
                  notificationLevel === "mute"
                    ? "bg-primary/10 border-primary text-primary"
                    : "border-border/60 text-muted-foreground hover:bg-muted/40"
                }`}
                onClick={() => setNotificationLevel("mute")}
              >
                <BellOff className="size-3.5" />
                <span>Silenciar</span>
              </button>
            </div>
          </div>

          {/* Botão Primário de Ação (Piso 44px) */}
          <div className="pt-2 space-y-2">
            <Button
              type="button"
              className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 w-full h-11 min-h-11 rounded-xl text-xs font-bold transition-colors duration-200 cursor-pointer select-none"
              disabled={isJoining}
              onClick={handleConfirmJoin}
            >
              {isJoining ? "Ingressando..." : "Confirmar e Participar"}
            </Button>

            <Button
              type="button"
              variant="ghost"
              className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 w-full h-11 min-h-11 rounded-xl text-xs font-medium text-muted-foreground hover:bg-muted/40"
              onClick={onClose}
            >
              Cancelar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
