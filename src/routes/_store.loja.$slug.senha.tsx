/**
 * _store.loja.$slug.senha.tsx — Desafio de Acesso por Senha para Vitrines e Cardápios Privados
 * Design Minimalista e Limpo Estilo Apple HIG.
 */

import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useTransition } from "react";
import { LockKey, ArrowRight, ShieldCheck, ArrowLeft } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { verifyStoreAccessPassword } from "@/services/private-store.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/_store/loja/$slug/senha")({
  head: () => ({
    meta: [
      { title: "Acesso Privado | Waesy" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: StorePasswordGatePage,
});

function StorePasswordGatePage() {
  const { slug } = Route.useParams();
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [isPending, startTransition] = useTransition();

  const handleUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) {
      toast.error("Por favor, digite a senha de acesso.");
      return;
    }

    startTransition(async () => {
      try {
        const res = await verifyStoreAccessPassword({
          data: {
            storeSlugOrId: slug,
            password: password.trim(),
          },
        });

        if (res.authorized) {
          // Salva autorização em sessionStorage para a loja
          if (typeof window !== "undefined") {
            window.sessionStorage.setItem(`store_unlocked_${slug}`, res.unlockToken || "unlocked");
          }
          toast.success("Acesso autorizado!");
          navigate({ to: "/loja/$slug", params: { slug } });
        }
      } catch (err: any) {
        toast.error(err.message || "Senha incorreta.");
      }
    });
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-sm mx-auto space-y-6 text-center">
        {/* Ícone Minimalista de Cadeado */}
        <div className="size-16 rounded-3xl bg-muted/60 border border-border/80 flex items-center justify-center mx-auto text-foreground shadow-xs">
          <LockKey size={30} weight="duotone" className="text-primary" />
        </div>

        <div className="space-y-1.5">
          <h1 className="text-xl font-bold tracking-tight text-foreground">
            Catálogo com Acesso Restrito
          </h1>
          <p className="text-xs text-muted-foreground leading-relaxed max-w-xs mx-auto">
            Esta empresa configurou sua vitrine como privada. Digite a senha fornecida pelo lojista para visualizar produtos e cardápio.
          </p>
        </div>

        {/* Formulário de Senha */}
        <form onSubmit={handleUnlock} className="space-y-4 text-left">
          <div className="space-y-1.5">
            <Label htmlFor="storePassword" className="text-xs font-semibold text-foreground">
              Senha de Acesso
            </Label>
            <Input
              id="storePassword"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Digite a senha da loja"
              className="h-11 rounded-xl text-center text-sm font-mono tracking-widest"
              autoFocus
              required
            />
          </div>

          <Button
            type="submit"
            disabled={isPending}
            className="w-full h-11 rounded-xl font-bold text-xs bg-foreground text-background hover:bg-foreground/90 transition-all gap-2 cursor-pointer shadow-xs"
          >
            {isPending ? (
              <span>Validando...</span>
            ) : (
              <>
                <span>Acessar Loja</span>
                <ArrowRight size={14} weight="bold" />
              </>
            )}
          </Button>
        </form>

        <div className="pt-2 flex justify-center">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate({ to: "/" })}
            className="size-11 rounded-xl text-muted-foreground hover:text-foreground cursor-pointer"
            aria-label="Voltar ao início"
          >
            <ArrowLeft className="size-5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
