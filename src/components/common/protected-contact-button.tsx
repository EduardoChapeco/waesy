import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getUserSession } from "@/services/auth.functions";
import { trackAndOpenWhatsApp, sanitizeWhatsAppPhone } from "@/lib/whatsapp";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Lock, MessageCircle, ShieldCheck, ArrowRight, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ProtectedContactButtonProps {
  phone?: string | null;
  entityType:
    | "store"
    | "product"
    | "classified"
    | "job"
    | "tourism"
    | "directory"
    | "event"
    | "quote"
    | "custom";
  entityId?: string | null;
  entityTitle?: string | null;
  customMessage?: string;
  storeId?: string | null;
  niche?: string;
  label?: string;
  variant?: "default" | "outline" | "secondary" | "ghost";
  size?: "sm" | "default" | "lg";
  className?: string;
  showMaskedPhone?: boolean;
}

export function ProtectedContactButton({
  phone,
  entityType,
  entityId,
  entityTitle,
  customMessage,
  storeId,
  niche,
  label = "Conversar no WhatsApp",
  variant = "default",
  size = "default",
  className,
  showMaskedPhone = false,
}: ProtectedContactButtonProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Consulta de sessão em cache via TanStack Query
  const { data: session } = useQuery({
    queryKey: ["user-session"],
    queryFn: () => getUserSession(),
    staleTime: 1000 * 60 * 5, // 5 min
  });

  const isAuthenticated = Boolean(session?.id);

  const cleanPhone = phone ? sanitizeWhatsAppPhone(phone) : "";
  const maskedPhone = cleanPhone
    ? `(${cleanPhone.slice(2, 4) || "**"}) ${cleanPhone.slice(4, 9) || "*****"}-****`
    : "(**) *****-****";

  const handleClick = async () => {
    if (!isAuthenticated) {
      setIsModalOpen(true);
      return;
    }

    if (!cleanPhone) return;

    setIsLoading(true);
    try {
      await trackAndOpenWhatsApp({
        phone: cleanPhone,
        entityType,
        entityId,
        entityTitle,
        customMessage,
        storeId,
        niche,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoginRedirect = () => {
    if (typeof window !== "undefined") {
      const currentPath = window.location.pathname + window.location.search;
      window.location.href = `/entrar?redirect=${encodeURIComponent(currentPath)}`;
    }
  };

  if (!isAuthenticated) {
    return (
      <>
        <Button
          type="button"
          variant={variant === "default" ? "outline" : variant}
          size={size}
          onClick={handleClick}
          className={cn(
            "rounded-xl gap-2 font-medium transition-all group border-border/80 hover:border-emerald-500/50 hover:bg-emerald-500/5 text-foreground cursor-pointer",
            className
          )}
          title="Faça login para contatar pelo WhatsApp"
        >
          <Lock className="size-3.5 text-muted-foreground group-hover:text-emerald-500 transition-colors" />
          <MessageCircle className="size-4 text-emerald-600 opacity-70" />
          <span>{label}</span>
          {showMaskedPhone && (
            <span className="text-[11px] font-mono text-muted-foreground/80 ml-1">
              {maskedPhone}
            </span>
          )}
        </Button>

        {/* Modal de Proteção Anti-Scraping / Login Obrigatório */}
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogContent className="sm:max-w-md rounded-2xl p-6 space-y-4">
            <DialogHeader className="space-y-2 text-left">
              <div className="size-11 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600 mb-1">
                <ShieldCheck className="size-6" />
              </div>
              <DialogTitle className="text-base font-bold text-foreground">
                Contato Protegido por Login
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground leading-relaxed">
                Para blindar nossos anunciantes, lojistas e criadores contra robôs de raspagem de dados,
                ligações automáticas e tentativas de golpe, os dados diretos de WhatsApp estão disponíveis
                exclusivamente para membros cadastrados da Comunidade Waesy.
              </DialogDescription>
            </DialogHeader>

            <div className="p-3.5 rounded-xl bg-muted/40 border border-border/60 text-xs space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-foreground">Anunciante / Loja:</span>
                <span className="text-muted-foreground truncate max-w-[200px]">{entityTitle || "Anúncio Verificado"}</span>
              </div>
              <div className="flex items-center justify-between font-mono">
                <span className="text-muted-foreground">Telefone:</span>
                <span className="text-muted-foreground/80">{maskedPhone}</span>
              </div>
            </div>

            <DialogFooter className="flex-col sm:flex-row gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsModalOpen(false)}
                className="w-full sm:w-auto rounded-xl text-xs"
              >
                Voltar
              </Button>
              <Button
                size="sm"
                onClick={handleLoginRedirect}
                className="w-full sm:w-auto rounded-xl text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
              >
                Entrar ou Criar Conta
                <ArrowRight className="size-3.5" />
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  // Usuário autenticado: botão ativo de WhatsApp
  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      disabled={isLoading || !cleanPhone}
      onClick={handleClick}
      className={cn(
        variant === "default" && "bg-emerald-600 hover:bg-emerald-700 text-white font-semibold",
        "rounded-xl gap-2 transition-all cursor-pointer",
        className
      )}
    >
      {isLoading ? (
        <Loader2 className="size-4 animate-spin" />
      ) : (
        <MessageCircle className="size-4" />
      )}
      <span>{label}</span>
    </Button>
  );
}
