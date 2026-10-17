import { useState, useEffect } from "react";
import { Store, Award, ArrowRightLeft, X } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export interface ActiveContextBannerProps {
  session?: any;
}

export function ActiveContextBanner({ session }: ActiveContextBannerProps) {
  const [activeContext, setActiveContext] = useState<"civil" | "store" | "creator">("civil");
  const [creatorHandle, setCreatorHandle] = useState<string | null>(null);
  const [storeName, setStoreName] = useState<string | null>(null);
  const [isDismissed, setIsDismissed] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const parseCookies = () => {
      const matchContext = document.cookie.match(/waesy_active_context=([^;]+)/);
      const ctx = (matchContext ? decodeURIComponent(matchContext[1].trim()) : "civil") as "civil" | "store" | "creator";

      const matchCreator = document.cookie.match(/waesy_active_creator=([^;]+)/);
      let creator = matchCreator ? decodeURIComponent(matchCreator[1].trim()) : null;

      const matchTenant = document.cookie.match(/waesy_active_tenant=([^;]+)/);
      const tenant = matchTenant ? decodeURIComponent(matchTenant[1].trim()) : null;

      // Auto-Heal: Se o criador for um UUID cru, sanitizar para evitar vazamento visual
      const isUuid = creator && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(creator);
      if (isUuid) {
        // Tenta resolver com os dados da sessão do usuário
        const userMeta = session?.user?.user_metadata || {};
        const fallbackHandle = userMeta?.username || session?.profile?.handle || "criador";
        creator = fallbackHandle;
        window.document.cookie = `waesy_active_creator=${encodeURIComponent(fallbackHandle)}; path=/; max-age=31536000; SameSite=Lax`;
      }

      // Se o contexto for store, tenta resolver o nome da loja via memberships
      if (ctx === "store" && session?.memberships && tenant) {
        const found = session.memberships.find((m: any) => m.store_id === tenant);
        if (found?.name) {
          setStoreName(found.name);
        } else {
          setStoreName("Minha Empresa");
        }
      }

      setActiveContext(ctx);
      setCreatorHandle(creator);
    };

    parseCookies();
  }, [session]);

  const handleSwitchToCivil = () => {
    if (typeof window !== "undefined") {
      window.document.cookie = "waesy_active_context=civil; path=/; max-age=31536000; SameSite=Lax";
      window.document.cookie = "waesy_active_tenant=; path=/; max-age=0; SameSite=Lax";
      window.document.cookie = "waesy_active_creator=; path=/; max-age=0; SameSite=Lax";
      window.document.cookie = "waesy_store_id=; path=/; max-age=0; SameSite=Lax";
    }
    toast.success("Alternado para Perfil Pessoal (Conta Civil).");
    window.location.reload();
  };

  // Se o usuário está no contexto civil nativo ou dispensou o banner na sessão, não exibe
  if (activeContext === "civil" || isDismissed) {
    return null;
  }

  const isStore = activeContext === "store";
  const isCreator = activeContext === "creator";

  return (
    <aside
      aria-label="Aviso de Contexto Operacional Ativo"
      className={cn(
        "w-full z-40 transition-colors border-b px-4 py-2 shrink-0 flex items-center justify-between gap-3 text-xs",
        isStore
          ? "bg-primary/10 border-primary/20 text-foreground"
          : "bg-amber-500/10 border-amber-500/20 text-foreground"
      )}
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <div
          className={cn(
            "size-6 rounded-md flex items-center justify-center shrink-0 border",
            isStore
              ? "bg-primary/20 border-primary/30 text-primary"
              : "bg-amber-500/20 border-amber-500/30 text-amber-600 dark:text-amber-400"
          )}
        >
          {isStore ? <Store className="size-3.5" /> : <Award className="size-3.5" />}
        </div>
        <p className="truncate text-xs font-medium">
          <span className="font-bold text-foreground">
            {isStore ? "Modo Empresa Ativo: " : "Modo Criador Ativo: "}
          </span>
          <span className="text-muted-foreground">
            Você está operando como{" "}
            <strong className="text-foreground">
              {isStore ? (storeName || "Empresa") : `@${creatorHandle || "criador"}`}
            </strong>
            . Suas ações públicas refletem esta identidade.
          </span>
        </p>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <button
          type="button"
          onClick={handleSwitchToCivil}
          className="h-8 min-h-8 px-3 rounded-md text-xs font-bold bg-background text-foreground hover:bg-muted/80 border border-border/80 shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <ArrowRightLeft className="size-3" />
          <span>Alternar para Pessoal</span>
        </button>

        <button
          type="button"
          onClick={() => setIsDismissed(true)}
          className="size-8 min-h-8 min-w-8 rounded-md hover:bg-muted/60 text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          title="Fechar aviso temporariamente"
          aria-label="Fechar aviso de contexto"
        >
          <X className="size-3.5" />
        </button>
      </div>
    </aside>
  );
}
